import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { subMonths, format } from 'https://esm.sh/date-fns@3.6.0'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

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

// Send failure notification email to superadmin
async function sendFailureNotification(
  supabase: any,
  failedProjects: SyncResult[],
  totalProjects: number
) {
  if (!RESEND_API_KEY) {
    console.log('⚠️ RESEND_API_KEY not configured, skipping email notification')
    return
  }

  try {
    // Get superadmin emails
    const { data: superAdmins, error: superAdminsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin')

    if (superAdminsError || !superAdmins || superAdmins.length === 0) {
      console.log('⚠️ No superadmins found to notify')
      return
    }

    // Get emails from profiles
    const userIds = (superAdmins as any[]).map(sa => sa.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email')
      .in('id', userIds)
      .not('email', 'is', null)

    if (profilesError || !profiles || profiles.length === 0) {
      console.log('⚠️ No superadmin emails found')
      return
    }

    const emails = (profiles as any[]).map(p => p.email).filter(Boolean) as string[]
    
    if (emails.length === 0) {
      console.log('⚠️ No valid superadmin emails')
      return
    }

    const resend = new Resend(RESEND_API_KEY)

    // Build failure details
    const failureDetails = failedProjects.map(fp => {
      const issues: string[] = []
      if (fp.metaStatus === 'error') issues.push('Meta Ads')
      if (fp.hotmartStatus === 'error') issues.push('Hotmart')
      return `• ${fp.projectName}: ${issues.join(', ')} ${fp.error ? `(${fp.error})` : ''}`
    }).join('\n')

    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .failure-list { background: #fff; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0; }
          .failure-item { color: #dc2626; margin: 8px 0; }
          .stats { display: flex; gap: 20px; margin: 15px 0; }
          .stat { background: #fff; padding: 10px 15px; border-radius: 6px; border: 1px solid #e5e7eb; }
          .stat-value { font-size: 24px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">⚠️ Falha na Sincronização Automática</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${timestamp}</p>
          </div>
          <div class="content">
            <p>A sincronização automática encontrou problemas em alguns projetos:</p>
            
            <div class="stats">
              <div class="stat">
                <div class="stat-value" style="color: #dc2626;">${failedProjects.length}</div>
                <div class="stat-label">Com Falha</div>
              </div>
              <div class="stat">
                <div class="stat-value" style="color: #10b981;">${totalProjects - failedProjects.length}</div>
                <div class="stat-label">Sucesso</div>
              </div>
              <div class="stat">
                <div class="stat-value">${totalProjects}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>

            <div class="failure-list">
              <strong>Projetos com falha:</strong>
              ${failedProjects.map(fp => {
                const issues: string[] = []
                if (fp.metaStatus === 'error') issues.push('Meta Ads')
                if (fp.hotmartStatus === 'error') issues.push('Hotmart')
                return `<div class="failure-item">• <strong>${fp.projectName}</strong>: ${issues.join(', ')}${fp.error ? ` - ${fp.error}` : ''}</div>`
              }).join('')}
            </div>

            <p>Recomendações:</p>
            <ul>
              <li>Verifique as credenciais das integrações nos projetos afetados</li>
              <li>Confira se os tokens de acesso não expiraram</li>
              <li>Revise os logs da função para mais detalhes</li>
            </ul>
          </div>
          <div class="footer">
            <p>Cubo Mágico - Sistema de Monitoramento</p>
          </div>
        </div>
      </body>
      </html>
    `

    const { error: emailError } = await resend.emails.send({
      from: 'Cubo Mágico <onboarding@resend.dev>',
      to: emails,
      subject: `⚠️ Falha na Sincronização - ${failedProjects.length} projeto(s) afetado(s)`,
      html: htmlContent,
    })

    if (emailError) {
      console.error('❌ Failed to send notification email:', emailError)
    } else {
      console.log(`📧 Notification email sent to ${emails.length} superadmin(s)`)
    }
  } catch (error) {
    console.error('❌ Error sending notification:', error)
  }
}

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
    let sendNotification = true // Default to sending notifications for auto-sync
    try {
      const body = await req.json()
      specificProjectId = body.projectId || null
      // Manual syncs can disable notifications
      if (body.skipNotification === true) {
        sendNotification = false
      }
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

    // Check for failures and send notification
    const failedProjects = results.filter(r => 
      r.metaStatus === 'error' || r.hotmartStatus === 'error' || r.error
    )

    if (failedProjects.length > 0 && sendNotification) {
      console.log(`\n📧 Sending failure notification for ${failedProjects.length} project(s)...`)
      await sendFailureNotification(supabase, failedProjects, results.length)
    }

    console.log(`\n✅ Auto-sync completed: ${successCount}/${results.length} projects synced`)

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Auto-sync completed for ${results.length} projects`,
      results,
      failedCount: failedProjects.length,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Auto-sync error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Try to send notification for critical failure
    if (RESEND_API_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        const resend = new Resend(RESEND_API_KEY)
        
        const { data: superAdmins } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin')

        if (superAdmins && superAdmins.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('email')
            .in('id', superAdmins.map(sa => sa.user_id))
            .not('email', 'is', null)

          if (profiles && profiles.length > 0) {
            const emails = profiles.map(p => p.email).filter(Boolean) as string[]
            const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            
            await resend.emails.send({
              from: 'Cubo Mágico <onboarding@resend.dev>',
              to: emails,
              subject: '🚨 Erro Crítico na Sincronização Automática',
              html: `
                <h2>🚨 Erro Crítico</h2>
                <p>A sincronização automática falhou completamente em ${timestamp}:</p>
                <pre style="background: #fee2e2; padding: 15px; border-radius: 6px; color: #dc2626;">${errorMessage}</pre>
                <p>Por favor, verifique os logs da função para mais detalhes.</p>
              `,
            })
            console.log('📧 Critical error notification sent')
          }
        }
      } catch (notifyError) {
        console.error('Failed to send critical error notification:', notifyError)
      }
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
