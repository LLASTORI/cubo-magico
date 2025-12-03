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
        // Use service role for background sync
        const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        // Start sync in background (don't await) and return immediately
        syncInsightsOptimized(serviceSupabase, projectId, accessToken, accountIds, dateStart, dateStop)
          .then(() => console.log('Sync completed in background'))
          .catch(err => console.error('Background sync error:', err))
        
        // Return immediately
        result = { 
          success: true, 
          message: 'Sincronização iniciada. Atualize a página em alguns segundos.',
          background: true 
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
  console.log('Fetching ad accounts...')
  
  const response = await fetch(
    `${GRAPH_API_BASE}/me/adaccounts?fields=id,name,currency,timezone_name,account_status&access_token=${accessToken}`
  )
  const data = await response.json()

  if (data.error) {
    console.error('Ad accounts error:', data.error)
    throw new Error(data.error.message)
  }

  console.log(`Found ${data.data?.length || 0} ad accounts`)
  return { accounts: data.data || [] }
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
  const response = await fetch(
    `${GRAPH_API_BASE}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time,start_time,stop_time&access_token=${accessToken}`
  )
  const data = await response.json()

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
  }

  console.log(`Found ${allCampaigns.length} campaigns total`)
  return { campaigns: allCampaigns }
}

// Get insights with DAILY granularity to avoid duplicates
async function getInsightsForAccount(
  accessToken: string, 
  accountId: string,
  dateStart: string, 
  dateStop: string,
  level: string
) {
  const fields = 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type'
  
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: dateStart, until: dateStop }),
    time_increment: '1', // DAILY granularity - one record per day
    level,
    access_token: accessToken,
  })

  const response = await fetch(
    `${GRAPH_API_BASE}/${accountId}/insights?${params}`
  )
  const data = await response.json()

  if (data.error) {
    console.error(`Insights error for ${accountId}:`, data.error)
    return []
  }

  return (data.data || []).map((i: any) => ({
    ...i,
    ad_account_id: accountId,
    // date_start and date_stop come from the API when using time_increment=1
  }))
}

async function getInsights(
  accessToken: string, 
  accountIds: string[], 
  dateStart: string, 
  dateStop: string,
  level: string = 'campaign'
) {
  console.log('Fetching insights:', { accountIds: accountIds.length, dateStart, dateStop, level })
  
  const allInsights: any[] = []

  // Process in parallel batches
  for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
    const batch = accountIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(accountId => getInsightsForAccount(accessToken, accountId, dateStart, dateStop, level))
    )
    allInsights.push(...results.flat())
  }

  console.log(`Found ${allInsights.length} insight records`)
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
