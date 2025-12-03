import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

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
      .single()

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
        result = await syncInsights(supabase, projectId, accessToken, accountIds, dateStart, dateStop)
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

async function getCampaigns(accessToken: string, accountIds: string[]) {
  console.log('Fetching campaigns for accounts:', accountIds)
  
  const allCampaigns: any[] = []

  for (const accountId of accountIds) {
    const response = await fetch(
      `${GRAPH_API_BASE}/${accountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time,start_time,stop_time&access_token=${accessToken}`
    )
    const data = await response.json()

    if (data.error) {
      console.error(`Campaigns error for ${accountId}:`, data.error)
      continue
    }

    const campaigns = (data.data || []).map((c: any) => ({
      ...c,
      ad_account_id: accountId,
    }))
    allCampaigns.push(...campaigns)
  }

  console.log(`Found ${allCampaigns.length} campaigns total`)
  return { campaigns: allCampaigns }
}

async function getInsights(
  accessToken: string, 
  accountIds: string[], 
  dateStart: string, 
  dateStop: string,
  level: string = 'campaign'
) {
  console.log('Fetching insights:', { accountIds, dateStart, dateStop, level })
  
  const allInsights: any[] = []
  const fields = 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,cpc,cpm,ctr,frequency,actions,cost_per_action_type'

  for (const accountId of accountIds) {
    const params = new URLSearchParams({
      fields,
      time_range: JSON.stringify({ since: dateStart, until: dateStop }),
      level,
      access_token: accessToken,
    })

    const response = await fetch(
      `${GRAPH_API_BASE}/${accountId}/insights?${params}`
    )
    const data = await response.json()

    if (data.error) {
      console.error(`Insights error for ${accountId}:`, data.error)
      continue
    }

    const insights = (data.data || []).map((i: any) => ({
      ...i,
      ad_account_id: accountId,
      date_start: dateStart,
      date_stop: dateStop,
    }))
    allInsights.push(...insights)
  }

  console.log(`Found ${allInsights.length} insight records`)
  return { insights: allInsights }
}

async function syncInsights(
  supabase: any,
  projectId: string,
  accessToken: string,
  accountIds: string[],
  dateStart: string,
  dateStop: string
) {
  console.log('Syncing insights:', { projectId, dateStart, dateStop })

  // Sync campaigns first
  const { campaigns } = await getCampaigns(accessToken, accountIds)
  
  for (const campaign of campaigns) {
    await supabase
      .from('meta_campaigns')
      .upsert({
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
      }, {
        onConflict: 'project_id,campaign_id',
      })
  }

  // Sync insights at campaign level
  const campaignInsights = await getInsights(accessToken, accountIds, dateStart, dateStop, 'campaign')
  
  let insightsSynced = 0
  for (const insight of campaignInsights.insights) {
    const { error } = await supabase
      .from('meta_insights')
      .upsert({
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
      }, {
        onConflict: 'project_id,ad_account_id,campaign_id,adset_id,ad_id,date_start,date_stop',
      })

    if (!error) insightsSynced++
  }

  // Also sync adset level
  const adsetInsights = await getInsights(accessToken, accountIds, dateStart, dateStop, 'adset')
  
  for (const insight of adsetInsights.insights) {
    // First sync the adset
    if (insight.adset_id) {
      await supabase
        .from('meta_adsets')
        .upsert({
          project_id: projectId,
          ad_account_id: insight.ad_account_id,
          campaign_id: insight.campaign_id,
          adset_id: insight.adset_id,
          adset_name: insight.adset_name,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'project_id,adset_id',
        })
    }

    // Then sync the insight
    const { error } = await supabase
      .from('meta_insights')
      .upsert({
        project_id: projectId,
        ad_account_id: insight.ad_account_id,
        campaign_id: insight.campaign_id,
        adset_id: insight.adset_id,
        ad_id: null,
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
      }, {
        onConflict: 'project_id,ad_account_id,campaign_id,adset_id,ad_id,date_start,date_stop',
      })

    if (!error) insightsSynced++
  }

  return { 
    success: true, 
    campaignsSynced: campaigns.length,
    insightsSynced 
  }
}
