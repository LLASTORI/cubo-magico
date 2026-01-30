import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * META INSIGHTS CRON
 * 
 * Edge Function chamada via cron job para sincronizar Meta Ads Insights automaticamente.
 * 
 * Comportamento:
 * - Sincroniza HOJE e ONTEM (replay de segurança)
 * - Idempotente (meta_insights usa upsert)
 * - Registra execução em provider_event_log
 * 
 * Periodicidade: A cada 1 hora (configurado via cron.schedule)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Get today and yesterday dates
function getSyncDates(): { today: string; yesterday: string } {
  const now = new Date()
  const today = formatDate(now)
  
  const yesterdayDate = new Date(now)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = formatDate(yesterdayDate)
  
  return { today, yesterday }
}

// Log execution to provider_event_log
async function logExecution(
  supabase: any,
  projectId: string,
  syncDates: string[],
  status: 'processed' | 'error',
  details: any = {}
) {
  try {
    await supabase
      .from('provider_event_log')
      .insert({
        project_id: projectId,
        provider: 'meta',
        provider_event_id: `insights_sync_${Date.now()}`,
        received_at: new Date().toISOString(),
        raw_payload: {
          event_type: 'insights_sync',
          sync_dates: syncDates,
          triggered_by: 'cron',
          ...details
        },
        status
      })
  } catch (err) {
    console.error('Error logging execution:', err)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  console.log('=== META INSIGHTS CRON STARTED ===')
  console.log('Timestamp:', new Date().toISOString())

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get sync dates
    const { today, yesterday } = getSyncDates()
    const syncDates = [yesterday, today]
    console.log(`Sync dates: ${yesterday} (yesterday), ${today} (today)`)

    // Get all active projects with Meta credentials
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true)

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
      throw new Error(`Failed to fetch projects: ${projectsError.message}`)
    }

    if (!projects || projects.length === 0) {
      console.log('No active projects found')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active projects',
        synced: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${projects.length} active projects`)

    const results: any[] = []
    let totalSynced = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const project of projects) {
      console.log(`\n📊 Processing project: ${project.name} (${project.id})`)

      try {
        // Check Meta credentials
        const { data: credentials, error: credError } = await supabase
          .from('meta_credentials')
          .select('access_token, expires_at')
          .eq('project_id', project.id)
          .maybeSingle()

        if (credError || !credentials?.access_token) {
          console.log(`  ⏭️ No Meta credentials, skipping`)
          totalSkipped++
          continue
        }

        // Check if token is expired
        if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
          console.log(`  ⚠️ Token expired, skipping`)
          await logExecution(supabase, project.id, syncDates, 'error', {
            error: 'Token expired'
          })
          totalSkipped++
          continue
        }

        // Get active ad accounts
        const { data: accounts, error: accountsError } = await supabase
          .from('meta_ad_accounts')
          .select('account_id')
          .eq('project_id', project.id)
          .eq('is_active', true)

        if (accountsError || !accounts || accounts.length === 0) {
          console.log(`  ⏭️ No active ad accounts, skipping`)
          totalSkipped++
          continue
        }

        const accountIds = accounts.map((a: any) => a.account_id)
        console.log(`  📊 Found ${accountIds.length} active ad accounts`)

        // Call meta-api function to sync insights
        console.log(`  🔄 Calling meta-api for ${yesterday} to ${today}...`)
        
        const response = await fetch(`${SUPABASE_URL}/functions/v1/meta-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            action: 'sync_insights',
            projectId: project.id,
            accountIds,
            dateStart: yesterday,
            dateStop: today,
            forceRefresh: true, // Always force refresh for recent data
          }),
        })

        if (response.ok) {
          const result = await response.json()
          console.log(`  ✅ Sync initiated: ${JSON.stringify(result)}`)
          
          await logExecution(supabase, project.id, syncDates, 'processed', {
            accountIds,
            result
          })
          
          results.push({
            projectId: project.id,
            projectName: project.name,
            status: 'success',
            accounts: accountIds.length
          })
          totalSynced++
        } else {
          const errorText = await response.text()
          console.error(`  ❌ Sync failed: ${errorText}`)
          
          await logExecution(supabase, project.id, syncDates, 'error', {
            error: errorText
          })
          
          results.push({
            projectId: project.id,
            projectName: project.name,
            status: 'error',
            error: errorText
          })
          totalErrors++
        }

      } catch (projectError) {
        console.error(`  ❌ Project error:`, projectError)
        await logExecution(supabase, project.id, syncDates, 'error', {
          error: projectError instanceof Error ? projectError.message : 'Unknown error'
        })
        totalErrors++
      }

      // Small delay between projects
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    const duration = Date.now() - startTime
    console.log(`\n=== META INSIGHTS CRON COMPLETED ===`)
    console.log(`Duration: ${duration}ms`)
    console.log(`Synced: ${totalSynced}, Skipped: ${totalSkipped}, Errors: ${totalErrors}`)

    return new Response(JSON.stringify({
      success: true,
      syncDates,
      duration,
      summary: {
        synced: totalSynced,
        skipped: totalSkipped,
        errors: totalErrors
      },
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Cron error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
