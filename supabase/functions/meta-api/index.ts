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
const INITIAL_DELAY_MS = 3000 // 3 seconds (reduced from 5)
const MAX_DELAY_MS = 60000 // 1 minute (reduced from 2)

// Max days per request to avoid "reduce data" error from Meta API
const MAX_DAYS_PER_CHUNK = 15

// SMART SYNC: Days threshold for considering data as "immutable"
// Meta's attribution window is 7 days, so after 7 days the data won't change
// We use 8 days to be safe
const IMMUTABLE_DAYS_THRESHOLD = 8

// Days threshold for "very recent" data that might still change significantly
// IMPORTANT: Set to 7 to match Meta's attribution window - data can change up to 7 days
// This ensures we always refetch data within the attribution window for accuracy
const VERY_RECENT_DAYS_THRESHOLD = 7

// Batch size for database inserts - INCREASED for performance
const DB_INSERT_BATCH_SIZE = 250

// DYNAMIC PARALLELISM: More aggressive for old data, conservative for recent
// Old data (30+ days) is immutable, so we can fetch faster
const PARALLEL_CHUNKS_HISTORICAL = 6  // For data 30+ days old
const PARALLEL_CHUNKS_RECENT = 2       // For data 0-30 days (might change, rate limits matter)
const HISTORICAL_DAYS_THRESHOLD = 30   // Days after which data is considered "historical"

// Optimized delays - shorter for historical, longer for recent
const DELAY_BETWEEN_PAGES_MS = 150
const DELAY_BETWEEN_BATCHES_MS = 30
const DELAY_BETWEEN_CHUNKS_HISTORICAL_MS = 300  // Faster for old data
const DELAY_BETWEEN_CHUNKS_RECENT_MS = 800      // Slower for recent data
const DELAY_BETWEEN_ACCOUNTS_MS = 400

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to split date range into fixed-size chunks (MAX_DAYS_PER_CHUNK days each)
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
  
  console.log(`Splitting ${totalDays} days into ${MAX_DAYS_PER_CHUNK}-day chunks...`)
  
  let currentStart = new Date(startDate)
  
  while (currentStart <= endDate) {
    // Calculate chunk end (MAX_DAYS_PER_CHUNK days from start, or end date, whichever is earlier)
    const chunkEnd = new Date(currentStart)
    chunkEnd.setDate(chunkEnd.getDate() + MAX_DAYS_PER_CHUNK - 1)
    
    const actualEnd = chunkEnd > endDate ? endDate : chunkEnd
    
    chunks.push({
      start: currentStart.toISOString().split('T')[0],
      stop: actualEnd.toISOString().split('T')[0]
    })
    
    // Move to next chunk start
    currentStart = new Date(actualEnd)
    currentStart.setDate(currentStart.getDate() + 1)
  }
  
  console.log(`Created ${chunks.length} chunks of max ${MAX_DAYS_PER_CHUNK} days:`, chunks.map(c => `${c.start} to ${c.stop}`))
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

// SMART SYNC: Check which dates we already have COMPLETE data in the database
// Adaptive: checks if project has ads, if not, considers campaign-level data as complete
async function getExistingDatesInCache(
  supabase: any,
  projectId: string,
  accountIds: string[],
  dateStart: string,
  dateStop: string
): Promise<Set<string>> {
  console.log('Checking existing cache...')
  
  const completeDates = new Set<string>()
  
  // First check if this project has any ads synced
  const { count: adsCountNum } = await supabase
    .from('meta_ads')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
  
  const hasAds = (adsCountNum || 0) > 0
  console.log(`Project has ads synced: ${hasAds} (${adsCountNum || 0} ads)`)
  
  // If project has ads, require ad-level data for cache
  // If no ads, accept campaign-level data as valid cache
  let query = supabase
    .from('meta_insights')
    .select('date_start')
    .eq('project_id', projectId)
    .in('ad_account_id', accountIds)
    .gte('date_start', dateStart)
    .lte('date_start', dateStop)
  
  if (hasAds) {
    query = query.not('ad_id', 'is', null) // Only count dates with ad-level data
  }
  // If no ads, accept any insights (campaign-level is fine)
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error checking cache:', error)
    return completeDates
  }
  
  if (data) {
    data.forEach((row: any) => {
      completeDates.add(row.date_start as string)
    })
  }
  
  console.log(`Found ${completeDates.size} cached dates (${hasAds ? 'ad-level' : 'campaign-level'} data)`)
  return completeDates
}

// SMART SYNC: Determine which dates need to be fetched from Meta
// IMPROVED: Only refetch dates that are NOT in cache, preserving existing data
// FIXED: Properly handle all date ranges to avoid gaps
function determineDatesToFetch(
  dateStart: string,
  dateStop: string,
  cachedDates: Set<string>,
  forceRefresh: boolean = false
): { toFetch: string[], toSkip: string[], fromCache: string[] } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const toFetch: string[] = []
  const toSkip: string[] = []
  const fromCache: string[] = []
  
  const start = new Date(dateStart)
  const end = new Date(dateStop)
  
  // Track reasons for logging
  const reasons = {
    immutableCached: 0,  // 8+ days old, in cache → skip
    recentCached: 0,     // 8-30 days old, in cache → skip (stable data)
    veryRecentRefetch: 0, // 0-7 days, in cache → refetch (within attribution window)
    notInCache: 0,       // not in cache → fetch
    forceRefreshed: 0,   // force refresh → fetch
  }
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const daysAgo = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    
    // Skip future dates
    if (d > today) {
      toSkip.push(dateStr)
      continue
    }
    
    const isInCache = cachedDates.has(dateStr)
    const isImmutable = daysAgo >= IMMUTABLE_DAYS_THRESHOLD // 8+ days old - data won't change (Meta's attribution window)
    const isVeryRecent = daysAgo < VERY_RECENT_DAYS_THRESHOLD // Within attribution window (0-6 days)
    
    if (forceRefresh) {
      // Force refresh: always fetch
      toFetch.push(dateStr)
      reasons.forceRefreshed++
    } else if (isVeryRecent) {
      // Data is within attribution window - ALWAYS refetch for accuracy
      // Meta can adjust spend values retroactively during this period
      toFetch.push(dateStr)
      reasons.veryRecentRefetch++
    } else if (isInCache && isImmutable) {
      // Data is 8+ days old and in cache - use cache (Meta's attribution window passed)
      fromCache.push(dateStr)
      reasons.immutableCached++
    } else if (isInCache) {
      // Data is in cache but not immutable (7 days exactly) - still use cache
      fromCache.push(dateStr)
      reasons.recentCached++
    } else {
      // Data not in cache - need to fetch
      toFetch.push(dateStr)
      reasons.notInCache++
    }
  }
  
  console.log(`\n📊 SMART SYNC ANALYSIS (IMMUTABLE_DAYS=${IMMUTABLE_DAYS_THRESHOLD}, ATTRIBUTION_WINDOW=${VERY_RECENT_DAYS_THRESHOLD}):`)
  console.log(`   ✅ Using cache (8+ days, immutable): ${reasons.immutableCached} dates`)
  console.log(`   ✅ Using cache (7-8 days, stable): ${reasons.recentCached} dates`)
  console.log(`   🔄 Refetching (0-7 days, attribution window): ${reasons.veryRecentRefetch} dates`)
  console.log(`   📥 New data (not in cache): ${reasons.notInCache} dates`)
  console.log(`   ⚡ Force refreshed: ${reasons.forceRefreshed} dates`)
  console.log(`   ⏭️ Skipped (future): ${toSkip.length} dates`)
  console.log(`\n   TOTAL: ${toFetch.length} to fetch, ${fromCache.length} from cache\n`)
  
  return { toFetch, toSkip, fromCache }
}

// Group consecutive dates into ranges for efficient API calls
function groupConsecutiveDates(dates: string[]): Array<{start: string, stop: string}> {
  if (dates.length === 0) return []
  
  const sorted = [...dates].sort()
  const ranges: Array<{start: string, stop: string}> = []
  
  let rangeStart = sorted[0]
  let rangeEnd = sorted[0]
  
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1])
    const currDate = new Date(sorted[i])
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      // Consecutive - extend range
      rangeEnd = sorted[i]
    } else {
      // Gap - save current range and start new one
      ranges.push({ start: rangeStart, stop: rangeEnd })
      rangeStart = sorted[i]
      rangeEnd = sorted[i]
    }
  }
  
  // Add final range
  ranges.push({ start: rangeStart, stop: rangeEnd })
  
  return ranges
}

// Insert records in batches using UPSERT to avoid duplicate key errors
async function batchUpsert(
  supabase: any,
  tableName: string,
  records: any[],
  conflictColumns: string,
  batchSize: number = DB_INSERT_BATCH_SIZE
): Promise<{ success: number, failed: number }> {
  let success = 0
  let failed = 0
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(records.length / batchSize)
    
    console.log(`Upserting batch ${batchNum}/${totalBatches} (${batch.length} records)...`)
    
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: conflictColumns })
    
    if (error) {
      console.error(`Batch ${batchNum} error:`, error)
      failed += batch.length
    } else {
      success += batch.length
    }
    
    // Minimal delay between batches for max speed
    if (i + batchSize < records.length) {
      await delay(DELAY_BETWEEN_BATCHES_MS)
    }
  }
  
  console.log(`Batch upsert complete: ${success} success, ${failed} failed`)
  return { success, failed }
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
    const { action, projectId, dateStart, dateStop, accountIds, level, forceRefresh } = body

    console.log('Meta API request:', { action, projectId, dateStart, dateStop, forceRefresh })

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

      case 'sync_campaigns':
        // Use service role for sync
        const campaignServiceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        result = await syncCampaigns(campaignServiceSupabase, projectId, accessToken, accountIds)
        break

      case 'get_insights':
        result = await getInsightsIncremental(accessToken, accountIds, dateStart, dateStop, level)
        break

      case 'sync_insights':
        // Use service role for sync
        const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        // Calculate period length for logging
        const startDate = new Date(dateStart)
        const endDate = new Date(dateStop)
        const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        console.log(`Background sync started: {
  projectId: "${projectId}",
  accountIds: ${accountIds.length},
  dateStart: "${dateStart}",
  dateStop: "${dateStop}",
  forceRefresh: ${forceRefresh || false}
}`)
        
        // ALWAYS use background processing to avoid HTTP timeout
        const backgroundTask = async () => {
          try {
            await syncInsightsSmartOptimized(
              serviceSupabase, 
              projectId, 
              accessToken, 
              accountIds, 
              dateStart, 
              dateStop,
              forceRefresh || false
            )
            console.log('Background sync completed successfully!')
          } catch (err) {
            console.error('Background sync error:', err)
          }
        }
        
        // Use EdgeRuntime.waitUntil to keep the function running after response
        // deno-lint-ignore no-explicit-any
        const runtime = (globalThis as any).EdgeRuntime
        if (runtime && typeof runtime.waitUntil === 'function') {
          runtime.waitUntil(backgroundTask())
        } else {
          // Fallback: just start the task without waiting
          backgroundTask()
        }
        
        // Calculate estimated time based on period length
        const estimatedMinutes = Math.max(1, Math.ceil(periodDays / 30))
        
        result = { 
          success: true, 
          message: `Sincronização inteligente iniciada para ${periodDays} dias. Dados antigos (>30 dias) serão usados do cache local.`,
          background: true,
          periodDays
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

async function getCampaigns(accessToken: string, rawAccountIds: any[]) {
  // Normalize account IDs to handle both strings and objects
  const accountIds = rawAccountIds.map((acc: any) => 
    typeof acc === 'string' ? acc : (acc?.account_id || acc)
  ).filter(Boolean)
  
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

// Sync campaigns to database with pagination
async function getCampaignsForAccountWithPagination(accessToken: string, accountId: string) {
  const allCampaigns: any[] = []
  let nextUrl: string | null = `${GRAPH_API_BASE}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time,start_time,stop_time&limit=500&access_token=${accessToken}`
  let pageCount = 0
  const maxPages = 50 // Safety limit
  
  while (nextUrl && pageCount < maxPages) {
    pageCount++
    console.log(`Fetching campaigns page ${pageCount} for ${accountId}...`)
    
    const data = await fetchWithRetry(nextUrl, `Campaigns page ${pageCount} for ${accountId}`)

    if (data.error) {
      console.error(`Campaigns error for ${accountId}:`, data.error)
      break
    }

    if (data.data && data.data.length > 0) {
      const campaigns = data.data.map((c: any) => ({
        ...c,
        ad_account_id: accountId,
      }))
      allCampaigns.push(...campaigns)
      console.log(`Got ${data.data.length} campaigns from page ${pageCount}, total: ${allCampaigns.length}`)
    }

    // Check for next page
    nextUrl = data.paging?.next || null
    
    if (nextUrl) {
      await delay(500)
    }
  }

  console.log(`Account ${accountId}: Total ${allCampaigns.length} campaigns across ${pageCount} pages`)
  return allCampaigns
}

async function syncCampaigns(
  supabase: any,
  projectId: string,
  accessToken: string,
  rawAccountIds: any[]
) {
  // Normalize account IDs to handle both strings and objects
  const accountIds = rawAccountIds.map((acc: any) => 
    typeof acc === 'string' ? acc : (acc?.account_id || acc)
  ).filter(Boolean)
  
  console.log('Syncing campaigns for accounts:', accountIds)
  
  const allCampaigns: any[] = []
  let synced = 0
  let errors = 0
  
  // Fetch campaigns with pagination for each account
  for (let i = 0; i < accountIds.length; i += BATCH_SIZE) {
    const batch = accountIds.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(
      batch.map(accountId => getCampaignsForAccountWithPagination(accessToken, accountId))
    )
    allCampaigns.push(...results.flat())
    
    if (i + BATCH_SIZE < accountIds.length) {
      await delay(1000)
    }
  }
  
  console.log(`Total campaigns fetched: ${allCampaigns.length}`)
  
  // First, delete existing campaigns for this project and these account IDs
  // This ensures we have fresh data with correct status
  // Use delete+insert pattern (same as adsets/ads) for reliable sync
  console.log(`Deleting existing campaigns for project ${projectId} and accounts:`, accountIds)
  
  for (const accountId of accountIds) {
    const { error: deleteError } = await supabase
      .from('meta_campaigns')
      .delete()
      .eq('project_id', projectId)
      .eq('ad_account_id', accountId)
    
    if (deleteError) {
      console.error(`Error deleting campaigns for account ${accountId}:`, deleteError)
    }
  }
  
  console.log(`Deleted existing campaigns, now inserting ${allCampaigns.length} fresh records`)
  
  // Prepare campaign records for insert
  const campaignRecords = allCampaigns.map(campaign => ({
    project_id: projectId,
    ad_account_id: campaign.ad_account_id,
    campaign_id: campaign.id,
    campaign_name: campaign.name || null,
    objective: campaign.objective || null,
    status: campaign.status || null,
    daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
    lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
    created_time: campaign.created_time || null,
    start_time: campaign.start_time || null,
    stop_time: campaign.stop_time || null,
    updated_at: new Date().toISOString(),
  }))
  
  // Batch insert campaigns (fresh insert, not upsert)
  for (let i = 0; i < campaignRecords.length; i += DB_INSERT_BATCH_SIZE) {
    const batch = campaignRecords.slice(i, i + DB_INSERT_BATCH_SIZE)
    const batchNum = Math.floor(i / DB_INSERT_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(campaignRecords.length / DB_INSERT_BATCH_SIZE)
    
    console.log(`Inserting campaigns batch ${batchNum}/${totalBatches}...`)
    
    const { error } = await supabase
      .from('meta_campaigns')
      .insert(batch)
    
    if (error) {
      console.error(`Campaigns batch ${batchNum} error:`, error)
      errors += batch.length
    } else {
      synced += batch.length
    }
    
    if (i + DB_INSERT_BATCH_SIZE < campaignRecords.length) {
      await delay(100)
    }
  }
  
  console.log(`Campaigns sync complete: ${synced} synced, ${errors} errors`)
  
  return { 
    success: true, 
    synced, 
    errors,
    total: allCampaigns.length 
  }
}

// Fetch adsets directly from Meta API with pagination
async function getAdsetsForAccountWithPagination(accessToken: string, accountId: string) {
  const allAdsets: any[] = []
  let nextUrl: string | null = `${GRAPH_API_BASE}/${accountId}/adsets?fields=id,name,campaign_id,status,daily_budget,lifetime_budget,created_time,start_time,end_time,targeting&limit=500&access_token=${accessToken}`
  let pageCount = 0
  const maxPages = 50
  
  while (nextUrl && pageCount < maxPages) {
    pageCount++
    console.log(`Fetching adsets page ${pageCount} for ${accountId}...`)
    
    const data = await fetchWithRetry(nextUrl, `Adsets page ${pageCount} for ${accountId}`)

    if (data.error) {
      console.error(`Adsets error for ${accountId}:`, data.error)
      break
    }

    if (data.data && data.data.length > 0) {
      const adsets = data.data.map((a: any) => ({
        ...a,
        ad_account_id: accountId,
      }))
      allAdsets.push(...adsets)
      console.log(`Got ${data.data.length} adsets from page ${pageCount}, total: ${allAdsets.length}`)
    }

    nextUrl = data.paging?.next || null
    
    if (nextUrl) {
      await delay(500)
    }
  }

  console.log(`Account ${accountId}: Total ${allAdsets.length} adsets across ${pageCount} pages`)
  return allAdsets
}

// Fetch ads directly from Meta API with pagination
async function getAdsForAccountWithPagination(accessToken: string, accountId: string) {
  const allAds: any[] = []
  // Request effective_object_story_id for public post link and thumbnail_url for preview image
  // effective_object_story_id format: {page_id}_{post_id} -> https://www.facebook.com/{page_id}/posts/{post_id}
  let nextUrl: string | null = `${GRAPH_API_BASE}/${accountId}/ads?fields=id,name,campaign_id,adset_id,status,creative{id,effective_object_story_id,thumbnail_url},created_time&limit=500&access_token=${accessToken}`
  let pageCount = 0
  const maxPages = 50
  
  while (nextUrl && pageCount < maxPages) {
    pageCount++
    console.log(`Fetching ads page ${pageCount} for ${accountId}...`)
    
    const data = await fetchWithRetry(nextUrl, `Ads page ${pageCount} for ${accountId}`)

    if (data.error) {
      console.error(`Ads error for ${accountId}:`, data.error)
      break
    }

    if (data.data && data.data.length > 0) {
      const ads = data.data.map((a: any) => {
        // Build public preview URL from effective_object_story_id
        // Format: {page_id}_{post_id} -> https://www.facebook.com/{page_id}/posts/{post_id}
        // This creates a public link to the post (if it's public)
        let previewUrl = null
        const storyId = a.creative?.effective_object_story_id
        if (storyId && storyId.includes('_')) {
          const [pageId, postId] = storyId.split('_')
          previewUrl = `https://www.facebook.com/${pageId}/posts/${postId}`
        }
        
        // Get thumbnail URL for inline preview
        const thumbnailUrl = a.creative?.thumbnail_url || null
        
        return {
          ...a,
          ad_account_id: accountId,
          preview_url: previewUrl,
          thumbnail_url: thumbnailUrl,
        }
      })
      allAds.push(...ads)
      console.log(`Got ${data.data.length} ads from page ${pageCount}, total: ${allAds.length}`)
    }

    nextUrl = data.paging?.next || null
    
    if (nextUrl) {
      await delay(500)
    }
  }

  console.log(`Account ${accountId}: Total ${allAds.length} ads across ${pageCount} pages`)
  return allAds
}

// Sync adsets to database - use adset_id as primary key (globally unique in Meta)
async function syncAdsets(
  supabase: any,
  projectId: string,
  accessToken: string,
  rawAccountIds: any[]
) {
  // Normalize account IDs to handle both strings and objects
  const accountIds = rawAccountIds.map((acc: any) => 
    typeof acc === 'string' ? acc : (acc?.account_id || acc)
  ).filter(Boolean)
  
  console.log('Syncing adsets for accounts:', accountIds)
  
  const allAdsets: any[] = []
  let synced = 0
  let errors = 0
  
  for (const accountId of accountIds) {
    const adsets = await getAdsetsForAccountWithPagination(accessToken, accountId)
    allAdsets.push(...adsets)
    await delay(1000)
  }
  
  console.log(`Total adsets fetched: ${allAdsets.length}`)
  
  // First, delete existing adsets for these account IDs to ensure clean update
  // This handles the case where adsets were synced with different project_ids
  const adsetIds = allAdsets.map(a => a.id)
  
  if (adsetIds.length > 0) {
    // Delete in batches
    for (let i = 0; i < adsetIds.length; i += 500) {
      const batch = adsetIds.slice(i, i + 500)
      await supabase
        .from('meta_adsets')
        .delete()
        .in('adset_id', batch)
    }
    console.log(`Cleaned ${adsetIds.length} existing adsets`)
  }
  
  const adsetRecords = allAdsets.map(adset => ({
    project_id: projectId,
    ad_account_id: adset.ad_account_id,
    campaign_id: adset.campaign_id,
    adset_id: adset.id,
    adset_name: adset.name || null,
    status: adset.status || null,
    daily_budget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null,
    lifetime_budget: adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : null,
    created_time: adset.created_time || null,
    start_time: adset.start_time || null,
    end_time: adset.end_time || null,
    targeting: adset.targeting || null,
    updated_at: new Date().toISOString(),
  }))
  
  for (let i = 0; i < adsetRecords.length; i += DB_INSERT_BATCH_SIZE) {
    const batch = adsetRecords.slice(i, i + DB_INSERT_BATCH_SIZE)
    const batchNum = Math.floor(i / DB_INSERT_BATCH_SIZE) + 1
    
    console.log(`Inserting adsets batch ${batchNum}...`)
    
    const { error } = await supabase
      .from('meta_adsets')
      .insert(batch)
    
    if (error) {
      console.error(`Adsets batch ${batchNum} error:`, error)
      errors += batch.length
    } else {
      synced += batch.length
    }
  }
  
  console.log(`Adsets sync complete: ${synced} synced, ${errors} errors`)
  return { success: true, synced, errors, total: allAdsets.length }
}

// Sync ads to database - use ad_id as primary key (globally unique in Meta)
async function syncAds(
  supabase: any,
  projectId: string,
  accessToken: string,
  rawAccountIds: any[]
) {
  // Normalize account IDs to handle both strings and objects
  const accountIds = rawAccountIds.map((acc: any) => 
    typeof acc === 'string' ? acc : (acc?.account_id || acc)
  ).filter(Boolean)
  
  console.log('Syncing ads for accounts:', accountIds)
  
  const allAds: any[] = []
  let synced = 0
  let errors = 0
  
  for (const accountId of accountIds) {
    const ads = await getAdsForAccountWithPagination(accessToken, accountId)
    allAds.push(...ads)
    await delay(1000)
  }
  
  console.log(`Total ads fetched: ${allAds.length}`)
  
  // First, delete existing ads for these IDs to ensure clean update
  const adIds = allAds.map(a => a.id)
  
  if (adIds.length > 0) {
    // Delete in batches
    for (let i = 0; i < adIds.length; i += 500) {
      const batch = adIds.slice(i, i + 500)
      await supabase
        .from('meta_ads')
        .delete()
        .in('ad_id', batch)
    }
    console.log(`Cleaned ${adIds.length} existing ads`)
  }
  
  const adRecords = allAds.map(ad => ({
    project_id: projectId,
    ad_account_id: ad.ad_account_id,
    campaign_id: ad.campaign_id,
    adset_id: ad.adset_id,
    ad_id: ad.id,
    ad_name: ad.name || null,
    status: ad.status || null,
    creative_id: ad.creative?.id || null,
    created_time: ad.created_time || null,
    preview_url: ad.preview_url || null, // Public Facebook post URL
    thumbnail_url: ad.thumbnail_url || null, // Thumbnail image for inline preview
    updated_at: new Date().toISOString(),
  }))
  
  for (let i = 0; i < adRecords.length; i += DB_INSERT_BATCH_SIZE) {
    const batch = adRecords.slice(i, i + DB_INSERT_BATCH_SIZE)
    const batchNum = Math.floor(i / DB_INSERT_BATCH_SIZE) + 1
    
    console.log(`Inserting ads batch ${batchNum}...`)
    
    const { error } = await supabase
      .from('meta_ads')
      .insert(batch)
    
    if (error) {
      console.error(`Ads batch ${batchNum} error:`, error)
      errors += batch.length
    } else {
      synced += batch.length
    }
  }
  
  console.log(`Ads sync complete: ${synced} synced, ${errors} errors`)
  return { success: true, synced, errors, total: allAds.length }
}

// Get insights with DAILY granularity and PAGINATION support
// IMPORTANT: Meta may return "reduce the amount of data" (error code 1) even for 15-day chunks on accounts with many ads.
// We handle this by adaptively splitting the date range until it succeeds.
async function getInsightsForAccountOnce(
  accessToken: string,
  accountId: string,
  dateStart: string,
  dateStop: string,
  level: string
): Promise<{ insights: any[]; errorCode?: number; errorMessage?: string }> {
  const fields = 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type'

  const allInsights: any[] = []

  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify({ since: dateStart, until: dateStop }),
    time_increment: '1',
    level,
    limit: '500',
    access_token: accessToken,
  })

  let url: string | null = `${GRAPH_API_BASE}/${accountId}/insights?${params}`
  let pageCount = 0
  const maxPages = 50

  while (url && pageCount < maxPages) {
    pageCount++
    console.log(`Fetching insights page ${pageCount} for ${accountId}...`)

    const data = await fetchWithRetry(url, `Insights page ${pageCount} for ${accountId}`)

    if (data?.error) {
      console.error(`Insights error for ${accountId}:`, data.error)
      return {
        insights: [],
        errorCode: data.error.code,
        errorMessage: data.error.message,
      }
    }

    if (data?.data && data.data.length > 0) {
      const pageInsights = data.data.map((i: any) => ({
        ...i,
        ad_account_id: accountId,
      }))
      allInsights.push(...pageInsights)
      console.log(`Got ${data.data.length} insights from page ${pageCount}, total: ${allInsights.length}`)
    }

    url = data?.paging?.next || null

    if (url) {
      await delay(DELAY_BETWEEN_PAGES_MS)
    }
  }

  console.log(`Account ${accountId}: Total ${allInsights.length} insights across ${pageCount} pages`)
  return { insights: allInsights }
}

function formatDateOnly(date: Date) {
  return date.toISOString().split('T')[0]
}

function diffDaysInclusive(dateStart: string, dateStop: string) {
  const start = new Date(dateStart)
  const end = new Date(dateStop)
  const msDay = 1000 * 60 * 60 * 24
  return Math.floor((end.getTime() - start.getTime()) / msDay) + 1
}

async function getInsightsForAccountAdaptive(
  accessToken: string,
  accountId: string,
  dateStart: string,
  dateStop: string,
  level: string,
  depth: number = 0
): Promise<any[]> {
  const res = await getInsightsForAccountOnce(accessToken, accountId, dateStart, dateStop, level)

  // Success
  if (!res.errorCode) return res.insights

  // Meta "reduce data" error → split date range and retry
  if (res.errorCode === 1) {
    const totalDays = diffDaysInclusive(dateStart, dateStop)

    // Can't split further
    if (totalDays <= 1 || depth >= 12) {
      console.warn(
        `Unable to reduce further for ${accountId} (${dateStart}..${dateStop}) at level=${level}. Returning empty.`
      )
      return []
    }

    const start = new Date(dateStart)
    const leftDays = Math.floor(totalDays / 2)
    const leftEnd = new Date(start)
    leftEnd.setDate(leftEnd.getDate() + Math.max(0, leftDays - 1))

    const rightStart = new Date(leftEnd)
    rightStart.setDate(rightStart.getDate() + 1)

    const leftStartStr = formatDateOnly(start)
    const leftEndStr = formatDateOnly(leftEnd)
    const rightStartStr = formatDateOnly(rightStart)
    const rightEndStr = dateStop

    console.log(
      `Splitting chunk due to code 1: ${dateStart}..${dateStop} → [${leftStartStr}..${leftEndStr}] + [${rightStartStr}..${rightEndStr}] (depth=${depth})`
    )

    // Sequential split to reduce pressure on the API
    const left = await getInsightsForAccountAdaptive(
      accessToken,
      accountId,
      leftStartStr,
      leftEndStr,
      level,
      depth + 1
    )

    await delay(250)

    const right = await getInsightsForAccountAdaptive(
      accessToken,
      accountId,
      rightStartStr,
      rightEndStr,
      level,
      depth + 1
    )

    return [...left, ...right]
  }

  // Other errors: log and move on
  console.warn(
    `Skipping insights for ${accountId} ${dateStart}..${dateStop} (code=${res.errorCode}): ${res.errorMessage || 'unknown error'}`
  )
  return []
}

// Helper to process a single chunk (for parallel execution)
async function processChunk(
  accessToken: string,
  accountIds: string[],
  chunk: { start: string, stop: string },
  chunkIndex: number,
  totalChunks: number,
  level: string,
  onChunkComplete?: (insights: any[]) => Promise<number>
): Promise<{ insights: any[], saved: number }> {
  console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}: ${chunk.start} to ${chunk.stop}`)
  
  const chunkInsights: any[] = []
  
  // Process accounts sequentially to avoid rate limiting per account
  for (let i = 0; i < accountIds.length; i++) {
    const accountId = accountIds[i]
    const insights = await getInsightsForAccountAdaptive(accessToken, accountId, chunk.start, chunk.stop, level)
    chunkInsights.push(...insights)
    
    // Reduced delay between accounts
    if (i < accountIds.length - 1) {
      await delay(DELAY_BETWEEN_ACCOUNTS_MS)
    }
  }
  
  // SAVE IMMEDIATELY after each chunk if callback provided
  let saved = 0
  if (onChunkComplete && chunkInsights.length > 0) {
    saved = await onChunkComplete(chunkInsights)
    console.log(`Chunk ${chunkIndex + 1} saved: ${saved} insights`)
  }
  
  return { insights: chunkInsights, saved }
}

// INCREMENTAL getInsights with DYNAMIC PARALLEL chunk processing
// Uses more parallelism for historical data, less for recent data
async function getInsightsIncremental(
  accessToken: string, 
  accountIds: string[], 
  dateStart: string, 
  dateStop: string,
  level: string = 'campaign',
  onChunkComplete?: (insights: any[]) => Promise<number>
): Promise<{ insights: any[], totalSaved: number }> {
  // Split date range into chunks to avoid "reduce data" error
  const dateChunks = splitDateRangeIntoChunks(dateStart, dateStop)
  
  // Determine if this is historical or recent data
  const today = new Date()
  const endDate = new Date(dateStop)
  const daysFromEnd = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))
  const isHistorical = daysFromEnd >= HISTORICAL_DAYS_THRESHOLD
  
  // Use dynamic parallelism based on data age
  const parallelChunks = isHistorical ? PARALLEL_CHUNKS_HISTORICAL : PARALLEL_CHUNKS_RECENT
  const delayBetweenChunks = isHistorical ? DELAY_BETWEEN_CHUNKS_HISTORICAL_MS : DELAY_BETWEEN_CHUNKS_RECENT_MS
  
  console.log(`\n📊 DYNAMIC PARALLELISM: ${isHistorical ? 'HISTORICAL' : 'RECENT'} mode`)
  console.log(`   Data ends ${daysFromEnd} days ago (threshold: ${HISTORICAL_DAYS_THRESHOLD} days)`)
  console.log(`   Using ${parallelChunks} parallel chunks, ${delayBetweenChunks}ms delay`)
  
  console.log('Fetching insights with DYNAMIC PARALLEL processing:', { 
    accountIds: accountIds.length, 
    dateStart, 
    dateStop, 
    level, 
    chunks: dateChunks.length,
    parallelism: parallelChunks,
    mode: isHistorical ? 'historical' : 'recent'
  })
  
  const allInsights: any[] = []
  let totalSaved = 0

  // Process chunks in parallel batches with dynamic size
  for (let batchStart = 0; batchStart < dateChunks.length; batchStart += parallelChunks) {
    const batchEnd = Math.min(batchStart + parallelChunks, dateChunks.length)
    const batchChunks = dateChunks.slice(batchStart, batchEnd)
    
    console.log(`\n🚀 Processing parallel batch ${Math.floor(batchStart / parallelChunks) + 1}/${Math.ceil(dateChunks.length / parallelChunks)} (chunks ${batchStart + 1}-${batchEnd}/${dateChunks.length})`)
    
    // Process this batch of chunks in parallel
    const chunkPromises = batchChunks.map((chunk, idx) => 
      processChunk(
        accessToken,
        accountIds,
        chunk,
        batchStart + idx,
        dateChunks.length,
        level,
        onChunkComplete
      )
    )
    
    // Wait for all chunks in this batch to complete
    const results = await Promise.all(chunkPromises)
    
    // Aggregate results
    for (const result of results) {
      allInsights.push(...result.insights)
      totalSaved += result.saved
    }
    
    console.log(`✅ Parallel batch complete: ${results.reduce((sum, r) => sum + r.saved, 0)} insights saved in this batch`)
    
    // Dynamic delay between parallel batches
    if (batchEnd < dateChunks.length) {
      await delay(delayBetweenChunks)
    }
  }

  console.log(`\n🎉 Completed: ${allInsights.length} total insights, ${totalSaved} saved`)
  return { insights: allInsights, totalSaved }
}

// Helper to normalize account IDs - handles both strings and objects
function normalizeAccountIds(accounts: any[]): string[] {
  return accounts.map(acc => {
    if (typeof acc === 'string') return acc
    // Handle objects with account_id property (from meta_ad_accounts table)
    if (acc && typeof acc === 'object' && acc.account_id) return acc.account_id
    console.error('Invalid account format:', acc)
    return null
  }).filter(Boolean) as string[]
}

// SMART SYNC: Optimized sync function with intelligent caching
async function syncInsightsSmartOptimized(
  supabase: any,
  projectId: string,
  accessToken: string,
  rawAccountIds: any[],
  dateStart: string,
  dateStop: string,
  forceRefresh: boolean = false
) {
  // NORMALIZE: Handle both string arrays and object arrays
  const accountIds = normalizeAccountIds(rawAccountIds)
  
  console.log('=== SMART SYNC STARTED ===')
  console.log({ projectId, accountIds: accountIds.length, dateStart, dateStop, forceRefresh })

  try {
    // STEP 1: Check what we already have in cache
    const cachedDates = await getExistingDatesInCache(supabase, projectId, accountIds, dateStart, dateStop)
    
    // STEP 2: Determine which dates need to be fetched
    const { toFetch, fromCache } = determineDatesToFetch(dateStart, dateStop, cachedDates, forceRefresh)
    
    if (toFetch.length === 0) {
      console.log('All data is already in cache! No need to fetch from Meta.')
      return
    }
    
    // STEP 3: Group consecutive dates into ranges for efficient API calls
    const dateRanges = groupConsecutiveDates(toFetch)
    console.log(`Grouped into ${dateRanges.length} date ranges to fetch`)
    
    // STEP 4: Delete ONLY the dates we're going to refetch (in batches for efficiency)
    console.log(`Cleaning ${toFetch.length} dates from cache before refetch...`)
    
    // Delete in batches of 50 dates to avoid query issues
    const DELETE_BATCH_SIZE = 50
    for (let i = 0; i < toFetch.length; i += DELETE_BATCH_SIZE) {
      const batchDates = toFetch.slice(i, i + DELETE_BATCH_SIZE)
      const { error: deleteError } = await supabase
        .from('meta_insights')
        .delete()
        .eq('project_id', projectId)
        .in('ad_account_id', accountIds)
        .in('date_start', batchDates)
      
      if (deleteError) {
        console.error(`Error deleting batch ${Math.floor(i/DELETE_BATCH_SIZE) + 1}:`, deleteError)
      }
    }
    console.log('Old insights for fetch dates cleaned')

    // STEP 5: Sync campaigns (lightweight, always do)
    const { campaigns } = await getCampaigns(accessToken, accountIds)
    console.log(`Syncing ${campaigns.length} campaigns...`)
    
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
    
    // STEP 5b: ALWAYS sync adsets/ads on every sync to keep hierarchy fresh
    // Status can change at any time, so we need to keep it updated
    // This ensures status is always accurate in the UI
    console.log('Syncing adsets/ads hierarchy to keep status accurate...')
    
    // Sync adsets directly from API
    console.log('Syncing adsets from Meta API...')
    await syncAdsets(supabase, projectId, accessToken, accountIds)
    
    // Sync ads directly from API
    console.log('Syncing ads from Meta API...')
    await syncAds(supabase, projectId, accessToken, accountIds)

    // STEP 6: Fetch and insert insights INCREMENTALLY
    // IMPORTANT: Only fetch AD-LEVEL insights (most granular)
    // Save after EACH chunk to avoid losing data on timeout
    let totalInsightsInserted = 0
    
    // Create callback to save insights immediately after each chunk
    const saveInsightsCallback = async (insights: any[]): Promise<number> => {
      const adInsightRecords = insights.map((insight: any) => ({
        project_id: projectId,
        ad_account_id: insight.ad_account_id,
        campaign_id: insight.campaign_id,
        adset_id: insight.adset_id,
        ad_id: insight.ad_id,
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
      
      const { success } = await batchUpsert(
        supabase, 
        'meta_insights', 
        adInsightRecords,
        'project_id,ad_account_id,campaign_id,adset_id,ad_id,date_start,date_stop'
      )
      return success
    }
    
    for (let rangeIdx = 0; rangeIdx < dateRanges.length; rangeIdx++) {
      const range = dateRanges[rangeIdx]
      console.log(`\n=== Processing range ${rangeIdx + 1}/${dateRanges.length}: ${range.start} to ${range.stop} ===`)
      
      // Fetch and SAVE incrementally (after each API chunk)
      console.log('Fetching ad-level insights with incremental save...')
      const { totalSaved } = await getInsightsIncremental(
        accessToken, 
        accountIds, 
        range.start, 
        range.stop, 
        'ad',
        saveInsightsCallback
      )
      totalInsightsInserted += totalSaved
      console.log(`Range ${rangeIdx + 1} complete: ${totalSaved} insights saved`)
      
      // Dynamic delay between ranges based on data age
      if (rangeIdx < dateRanges.length - 1) {
        console.log('Brief pause before next range...')
        await delay(DELAY_BETWEEN_CHUNKS_RECENT_MS)
      }
    }

    console.log(`\n=== SMART SYNC COMPLETED ===`)
    console.log(`Total insights inserted: ${totalInsightsInserted}`)
    console.log(`Dates from cache (not refetched): ${fromCache.length}`)
    
  } catch (error) {
    console.error('Smart sync error:', error)
    throw error
  }
}
