import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { subMonths, format } from 'https://esm.sh/date-fns@3.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface Project {
  id: string
  name: string
}

interface SyncResult {
  projectId: string
  projectName: string
  metaStatus: 'success' | 'skipped' | 'error'
  hotmartStatus: 'success' | 'skipped' | 'error'
  error?: string
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 Auto-sync started at:', new Date().toISOString())

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get body params if any (for manual trigger with specific project)
    let specificProjectId: string | null = null
    try {
      const body = await req.json()
      specificProjectId = body.projectId || null
    } catch {
      // No body, sync all projects
    }

    // Get all active projects (or specific one)
    let projectsQuery = supabase
      .from('projects')
      .select('id, name')
      .eq('is_active', true)

    if (specificProjectId) {
      projectsQuery = projectsQuery.eq('id', specificProjectId)
    }

    const { data: projects, error: projectsError } = await projectsQuery

    if (projectsError) {
      throw new Error(`Failed to fetch projects: ${projectsError.message}`)
    }

    if (!projects || projects.length === 0) {
      console.log('No active projects found')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active projects to sync',
        results: [] 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${projects.length} active project(s) to sync`)

    const results: SyncResult[] = []
    const endDate = new Date()

    for (const project of projects) {
      console.log(`\n📦 Processing project: ${project.name} (${project.id})`)
      
      const result: SyncResult = {
        projectId: project.id,
        projectName: project.name,
        metaStatus: 'skipped',
        hotmartStatus: 'skipped',
      }

      try {
        // Check Meta credentials
        const { data: metaCreds } = await supabase
          .from('meta_credentials')
          .select('access_token, expires_at')
          .eq('project_id', project.id)
          .maybeSingle()

        // Check if Meta is connected and token is valid
        const hasValidMetaToken = metaCreds?.access_token && 
          (!metaCreds.expires_at || new Date(metaCreds.expires_at) > new Date())

        if (hasValidMetaToken) {
          // Get active Meta ad accounts
          const { data: metaAccounts } = await supabase
            .from('meta_ad_accounts')
            .select('account_id')
            .eq('project_id', project.id)
            .eq('is_active', true)

          if (metaAccounts && metaAccounts.length > 0) {
            console.log(`  📊 Syncing Meta Ads (${metaAccounts.length} accounts)...`)
            
            const metaStartDate = subMonths(endDate, 3) // Sync last 3 months for auto-sync
            const accountIds = metaAccounts.map(a => a.account_id)

            try {
              // Call meta-api function directly using service role
              const metaResponse = await fetch(`${SUPABASE_URL}/functions/v1/meta-api`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
                body: JSON.stringify({
                  action: 'sync_insights',
                  projectId: project.id,
                  accountIds,
                  dateStart: format(metaStartDate, 'yyyy-MM-dd'),
                  dateStop: format(endDate, 'yyyy-MM-dd'),
                  forceRefresh: false, // Use smart sync
                }),
              })

              if (metaResponse.ok) {
                result.metaStatus = 'success'
                console.log(`  ✅ Meta sync initiated`)
              } else {
                const errorText = await metaResponse.text()
                console.error(`  ❌ Meta sync failed:`, errorText)
                result.metaStatus = 'error'
              }
            } catch (metaError) {
              console.error(`  ❌ Meta sync error:`, metaError)
              result.metaStatus = 'error'
            }
          } else {
            console.log(`  ⏭️ No active Meta accounts, skipping`)
          }
        } else {
          console.log(`  ⏭️ Meta not connected or token expired`)
        }

        // Small delay between Meta and Hotmart
        await delay(1000)

        // Check Hotmart credentials
        const { data: hotmartCreds } = await supabase
          .from('project_credentials')
          .select('client_id, client_secret')
          .eq('project_id', project.id)
          .eq('provider', 'hotmart')
          .maybeSingle()

        if (hotmartCreds?.client_id && hotmartCreds?.client_secret) {
          console.log(`  🛒 Syncing Hotmart...`)
          
          const hotmartStartDate = subMonths(endDate, 3) // Sync last 3 months

          try {
            const hotmartResponse = await fetch(`${SUPABASE_URL}/functions/v1/hotmart-api`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                action: 'sync_sales',
                projectId: project.id,
                startDate: hotmartStartDate.getTime(),
                endDate: endDate.getTime(),
              }),
            })

            if (hotmartResponse.ok) {
              const hotmartData = await hotmartResponse.json()
              result.hotmartStatus = 'success'
              console.log(`  ✅ Hotmart sync completed: ${hotmartData.synced || 0} synced, ${hotmartData.updated || 0} updated`)
            } else {
              const errorText = await hotmartResponse.text()
              console.error(`  ❌ Hotmart sync failed:`, errorText)
              result.hotmartStatus = 'error'
            }
          } catch (hotmartError) {
            console.error(`  ❌ Hotmart sync error:`, hotmartError)
            result.hotmartStatus = 'error'
          }
        } else {
          console.log(`  ⏭️ Hotmart not connected`)
        }

      } catch (projectError) {
        console.error(`  ❌ Project error:`, projectError)
        result.error = projectError instanceof Error ? projectError.message : 'Unknown error'
      }

      results.push(result)

      // Delay between projects to avoid overwhelming APIs
      if (projects.indexOf(project) < projects.length - 1) {
        console.log(`  ⏳ Waiting before next project...`)
        await delay(5000)
      }
    }

    const successCount = results.filter(r => 
      r.metaStatus === 'success' || r.hotmartStatus === 'success'
    ).length

    console.log(`\n✅ Auto-sync completed: ${successCount}/${results.length} projects synced`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Auto-sync completed for ${results.length} projects`,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Auto-sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
