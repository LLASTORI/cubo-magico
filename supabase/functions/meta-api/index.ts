import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// Process accounts in batches to avoid rate limiting
const BATCH_SIZE = 5

// Retry configuration for rate limits
const MAX_RETRIES = 5
const INITIAL_DELAY_MS = 5000 // 5 seconds
const MAX_DELAY_MS = 120000 // 2 minutes

// Max days per request to avoid "reduce data" error from Meta API
const MAX_DAYS_PER_CHUNK = 15

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to split date range into monthly chunks
function splitDateRangeIntoChunks(dateStart: string, dateStop: string): Array<{start: string, stop: string}> {
  const chunks: Array<{start: string, stop: string}> = []
  const startDate = new Date(dateStart)
  const endDate = new Date(dateStop)
  
  // Calculate total days
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // If period is short enough, return single chunk
  if (totalDays <= MAX_DAYS_PER_CHUNK) {
    return [{ start: dateStart, stop: dateStop }]
  }
  
  console.log(`Splitting ${totalDays} days into monthly chunks...`)
  
  let currentStart = new Date(startDate)
  
  while (currentStart < endDate) {
    // Calculate chunk end (end of current month or end date, whichever is earlier)
    const chunkEnd = new Date(currentStart)
    chunkEnd.setMonth(chunkEnd.getMonth() + 1)
    chunkEnd.setDate(0) // Last day of current month
    
    const actualEnd = chunkEnd > endDate ? endDate : chunkEnd
    
    chunks.push({
      start: currentStart.toISOString().split('T')[0],
      stop: actualEnd.toISOString().split('T')[0]
    })
    
    // Move to first day of next month
    currentStart = new Date(actualEnd)
    currentStart.setDate(currentStart.getDate() + 1)
  }
  
  console.log(`Created ${chunks.length} chunks:`, chunks.map(c => `${c.start} to ${c.stop}`))
  return chunks
}

// Fetch with exponential backoff retry for rate limits
async function fetchWithRetry(
  url: string, 
  context: string,
  retryCount = 0
): Promise<any> {
  const response = await fetch(url)
  const data = await response.json()

  // Check for rate limit error (code 4)
  if (data.error && data.error.code === 4) {
    if (retryCount >= MAX_RETRIES) {
      console.error(`${context}: Max retries (${MAX_RETRIES}) reached for rate limit`)
      throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries. Tente novamente em alguns minutos.`)
    }

    // Calculate exponential backoff delay
    const delayMs = Math.min(INITIAL_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS)
    console.warn(`${context}: Rate limited (code 4). Retry ${retryCount + 1}/${MAX_RETRIES} after ${delayMs}ms`)
    
    await delay(delayMs)
    return fetchWithRetry(url, context, retryCount + 1)
  }
  
  // Check for "reduce data" error (code 1) - this means we need smaller chunks
  if (data.error && data.error.code === 1) {
    console.warn(`${context}: Data volume too large (code 1). Need smaller date chunks.`)
    // Return the error to be handled by the caller
    return data
  }

  return data
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get auth header for user context
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const body = await req.json()
    const { action, projectId, dateStart, dateStop, accountIds, level } = body

    console.log('Meta API request:', { action, projectId, dateStart, dateStop })

    // Get Meta credentials for this project
    const { data: credentials, error: credError } = await supabase
      .from('meta_credentials')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle()

    if (credError || !credentials) {
      console.error('Credentials error:', credError)
      return new Response(JSON.stringify({ 
        error: 'Meta não conectado',
        needsConnection: true 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = credentials.access_token

    // Check if token is expired
    if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
      return new Response(JSON.stringify({ 
        error: 'Token expirado. Reconecte sua conta Meta.',
        needsReconnection: true 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let result: any

    switch (action) {
      case 'get_ad_accounts':
        result = await getAdAccounts(accessToken)
        break

      case 'sync_ad_accounts':
        result = await syncAdAccounts(supabase, projectId, accessToken, accountIds)
        break

      case 'get_campaigns':
        result = await getCampaigns(accessToken, accountIds)
        break

      case 'get_insights':
        result = await getInsights(accessToken, accountIds, dateStart, dateStop, level)
        break

      case 'sync_insights':
        // Use service role for sync
        const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        // Calculate period length
        const startDate = new Date(dateStart)
        const endDate = new Date(dateStop)
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // For longer periods, process synchronously to avoid edge function shutdown
        // For shorter periods, use background processing for better UX
        if (periodDays > MAX_DAYS_PER_CHUNK) {
          console.log(`Long period detected (${periodDays} days). Processing synchronously...`)
          
          try {
            await syncInsightsOptimized(serviceSupabase, projectId, accessToken, accountIds, dateStart, dateStop)
            result = { 
              success: true, 
              message: 'Sincronização concluída com sucesso!',
              background: false 
            }
          } catch (syncError) {
            console.error('Sync error:', syncError)
            result = { 
              success: false, 
              error: syncError instanceof Error ? syncError.message : 'Erro na sincronização',
              background: false 
            }
          }
        } else {
          // Short period - use background processing
          syncInsightsOptimized(serviceSupabase, projectId, accessToken, accountIds, dateStart, dateStop)
            .then(() => console.log('Sync completed in background'))
            .catch(err => console.error('Background sync error:', err))
          
          result = { 
            success: true, 
            message: 'Sincronização iniciada. Atualize a página em alguns segundos.',
            background: true 
          }
        }
        break

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    console.error('Meta API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getAdAccounts(accessToken: string) {
  console.log('Fetching ad accounts with pagination...')
  
  const allAccounts: any[] = []
  let nextUrl: string | null = `${GRAPH_API_BASE}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&limit=100&access_token=${accessToken}`
  let pageCount = 0
  const maxPages = 20 // Safety limit
  
  while (nextUrl && pageCount < maxPages) {
    pageCount++
    console.log(`Fetching ad accounts page ${pageCount}...`)
    
    const json = await fetchWithRetry(nextUrl, `Ad accounts page ${pageCount}`)

    if (json.error) {
      console.error('Ad accounts error:', json.error)
      throw new Error(json.error.message)
    }

    if (json.data && json.data.length > 0) {
      allAccounts.push(...json.data)
      console.log(`Got ${json.data.length} accounts from page ${pageCount}, total: ${allAccounts.length}`)
    }

    // Check for next page
    nextUrl = json.paging?.next || null
  }

  console.log(`Found ${allAccounts.length} ad accounts total across ${pageCount} pages`)
  return { accounts: allAccounts }
}

async function syncAdAccounts(
  supabase: any, 
  projectId: string, 
  accessToken: string,
  selectedAccountIds: string[]
) {
  console.log('Syncing ad accounts:', selectedAccountIds)

  const { accounts } = await getAdAccounts(accessToken)
  
  // Filter to selected accounts
  const selectedAccounts = accounts.filter((acc: any) => 
    selectedAccountIds.includes(acc.id)
  )

  // Upsert selected accounts
  for (const account of selectedAccounts) {
    const { error } = await supabase
      .from('meta_ad_accounts')
      .upsert({
        project_id: projectId,
        account_id: account.id,
        account_name: account.name,
        currency: account.currency,
        timezone_name: account.timezone_name,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,account_id',
      })

    if (error) {
      console.error('Error upserting account:', error)
    }
  }

  // Deactivate non-selected accounts
  const { error: deactivateError } = await supabase
    .from('meta_ad_accounts')
    .update({ is_active: false })
    .eq('project_id', projectId)
    .not('account_id', 'in', `(${selectedAccountIds.join(',')})`)

  if (deactivateError) {
    console.error('Error deactivating accounts:', deactivateError)
  }

  return { success: true, synced: selectedAccounts.length }
}

async function getCampaignsForAccount(accessToken: string, accountId: string) {
  const url = `${GRAPH_API_BASE}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time,start_time,stop_time&access_token=${accessToken}`
  
  const data = await fetchWithRetry(url, `Campaigns for ${accountId}`)

  if (data.error) {
    console.error(`Campaigns error for ${accountId}:`, data.error)
    return []
  }

  return (data.data || []).map((c: any) => ({
    ...c,
    ad_account_id: accountId,
  }))
}

async function getCampaigns(accessToken: string, accountIds: string[]) {
  console.log('Fetching campaigns for accounts:', accountIds)
  
  const allCampaigns: any[] = []
  
  // Process in parallel batches
  for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
    const batch = accountIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(accountId => getCampaignsForAccount(accessToken, accountId))
    )
    allCampaigns.push(...results.flat())
    
    // Add small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < accountIds.length) {
      await delay(1000)
    }
  }

  console.log(`Found ${allCampaigns.length} campaigns total`)
  return { campaigns: allCampaigns }
}

// Get insights with DAILY granularity and PAGINATION support
async function getInsightsForAccount(
  accessToken: string, 
  accountId: string,
  dateStart: string, 
  dateStop: string,
  level: string
) {
  const fields = 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type'
  
  const allInsights: any[] = []
  
  // Initial request
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: dateStart, until: dateStop }),
    time_increment: '1', // DAILY granularity - one record per day
    level,
    limit: '500', // Max limit per page
    access_token: accessToken,
  })

  let url: string | null = `${GRAPH_API_BASE}/${accountId}/insights?${params}`
  let pageCount = 0
  const maxPages = 50 // Safety limit

  while (url && pageCount < maxPages) {
    pageCount++
    console.log(`Fetching insights page ${pageCount} for ${accountId}...`)
    
    const data = await fetchWithRetry(url, `Insights page ${pageCount} for ${accountId}`)

    if (data.error) {
      console.error(`Insights error for ${accountId}:`, data.error)
      break
    }

    if (data.data && data.data.length > 0) {
      const pageInsights = data.data.map((i: any) => ({
        ...i,
        ad_account_id: accountId,
      }))
      allInsights.push(...pageInsights)
      console.log(`Got ${data.data.length} insights from page ${pageCount}, total: ${allInsights.length}`)
    }

    // Check for next page
    url = data.paging?.next || null
    
    // Add small delay between pages to avoid rate limiting
    if (url) {
      await delay(500)
    }
  }

  console.log(`Account ${accountId}: Total ${allInsights.length} insights across ${pageCount} pages`)
  return allInsights
}

async function getInsights(
  accessToken: string, 
  accountIds: string[], 
  dateStart: string, 
  dateStop: string,
  level: string = 'campaign'
) {
  // Split date range into monthly chunks to avoid "reduce data" error
  const dateChunks = splitDateRangeIntoChunks(dateStart, dateStop)
  
  console.log('Fetching insights:', { accountIds: accountIds.length, dateStart, dateStop, level, chunks: dateChunks.length })
  
  const allInsights: any[] = []

  // Process each chunk
  for (let chunkIndex = 0; chunkIndex < dateChunks.length; chunkIndex++) {
    const chunk = dateChunks[chunkIndex]
    console.log(`Processing chunk ${chunkIndex + 1}/${dateChunks.length}: ${chunk.start} to ${chunk.stop}`)
    
    // Process accounts sequentially to avoid rate limiting
    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i]
      const insights = await getInsightsForAccount(accessToken, accountId, chunk.start, chunk.stop, level)
      allInsights.push(...insights)
      
      // Add delay between accounts to avoid rate limiting
      if (i < accountIds.length - 1) {
        await delay(2000)
      }
    }
    
    // Add delay between chunks
    if (chunkIndex < dateChunks.length - 1) {
      console.log('Waiting before next chunk...')
      await delay(3000)
    }
  }

  console.log(`Found ${allInsights.length} total insight records for ${level} level`)
  return { insights: allInsights }
}

// Optimized sync function with parallel processing
async function syncInsightsOptimized(
  supabase: any,
  projectId: string,
  accessToken: string,
  accountIds: string[],
  dateStart: string,
  dateStop: string
) {
  console.log('Background sync started:', { projectId, accountIds: accountIds.length, dateStart, dateStop })

  try {
    // FIRST: Delete existing insights for this date range and accounts to avoid duplicates
    console.log('Cleaning old insights for date range...')
    const { error: deleteError } = await supabase
      .from('meta_insights')
      .delete()
      .eq('project_id', projectId)
      .in('ad_account_id', accountIds)
      .gte('date_start', dateStart)
      .lte('date_stop', dateStop)

    if (deleteError) {
      console.error('Error deleting old insights:', deleteError)
    } else {
      console.log('Old insights cleaned successfully')
    }

    // Sync campaigns first (in parallel batches)
    const { campaigns } = await getCampaigns(accessToken, accountIds)
    console.log(`Syncing ${campaigns.length} campaigns...`)
    
    // Batch upsert campaigns
    const campaignRecords = campaigns.map(campaign => ({
      project_id: projectId,
      ad_account_id: campaign.ad_account_id,
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
      lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
      created_time: campaign.created_time,
      start_time: campaign.start_time,
      stop_time: campaign.stop_time,
      updated_at: new Date().toISOString(),
    }))

    if (campaignRecords.length > 0) {
      const { error: campaignError } = await supabase
        .from('meta_campaigns')
        .upsert(campaignRecords, { onConflict: 'project_id,campaign_id' })
      
      if (campaignError) {
        console.error('Error syncing campaigns:', campaignError)
      }
    }

    // Sync insights at campaign level with DAILY granularity
    const campaignInsights = await getInsights(accessToken, accountIds, dateStart, dateStop, 'campaign')
    console.log(`Syncing ${campaignInsights.insights.length} daily campaign insights...`)
    
    const insightRecords = campaignInsights.insights.map((insight: any) => ({
      project_id: projectId,
      ad_account_id: insight.ad_account_id,
      campaign_id: insight.campaign_id,
      adset_id: insight.adset_id || null,
      ad_id: insight.ad_id || null,
      date_start: insight.date_start,
      date_stop: insight.date_stop,
      spend: parseFloat(insight.spend || 0),
      impressions: parseInt(insight.impressions || 0),
      clicks: parseInt(insight.clicks || 0),
      reach: parseInt(insight.reach || 0),
      cpc: insight.cpc ? parseFloat(insight.cpc) : null,
      cpm: insight.cpm ? parseFloat(insight.cpm) : null,
      ctr: insight.ctr ? parseFloat(insight.ctr) : null,
      frequency: insight.frequency ? parseFloat(insight.frequency) : null,
      actions: insight.actions || null,
      cost_per_action_type: insight.cost_per_action_type || null,
      updated_at: new Date().toISOString(),
    }))

    if (insightRecords.length > 0) {
      // Insert instead of upsert since we deleted first
      const { error: insightError } = await supabase
        .from('meta_insights')
        .insert(insightRecords)
      
      if (insightError) {
        console.error('Error syncing campaign insights:', insightError)
      }
    }

    // Sync adset level insights with DAILY granularity
    const adsetInsights = await getInsights(accessToken, accountIds, dateStart, dateStop, 'adset')
    console.log(`Syncing ${adsetInsights.insights.length} daily adset insights...`)
    
    // DEDUPLICATE adset records using a Map (same adset can appear in multiple days)
    const adsetMap = new Map<string, any>()
    adsetInsights.insights
      .filter((i: any) => i.adset_id)
      .forEach((insight: any) => {
        const key = `${projectId}_${insight.adset_id}`
        if (!adsetMap.has(key)) {
          adsetMap.set(key, {
            project_id: projectId,
            ad_account_id: insight.ad_account_id,
            campaign_id: insight.campaign_id,
            adset_id: insight.adset_id,
            adset_name: insight.adset_name,
            updated_at: new Date().toISOString(),
          })
        }
      })
    
    const uniqueAdsetRecords = Array.from(adsetMap.values())
    console.log(`Upserting ${uniqueAdsetRecords.length} unique adsets...`)

    if (uniqueAdsetRecords.length > 0) {
      const { error: adsetError } = await supabase
        .from('meta_adsets')
        .upsert(uniqueAdsetRecords, { onConflict: 'project_id,adset_id' })
      
      if (adsetError) {
        console.error('Error syncing adsets:', adsetError)
      }
    }

    // NOTE: We only use campaign-level insights to avoid double-counting
    // Adset-level insights would duplicate spend data since campaign totals already include adset data

    console.log('Background sync completed successfully!')
    
  } catch (error) {
    console.error('Background sync error:', error)
  }
}
