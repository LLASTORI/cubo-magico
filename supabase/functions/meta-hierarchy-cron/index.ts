import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * META HIERARCHY CRON
 * 
 * Edge Function chamada via cron job para sincronizar a hierarquia do Meta Ads (campaigns, adsets, ads).
 * 
 * Comportamento:
 * - Busca projetos que possuem meta_ad_accounts ativas
 * - Valida as credenciais do projeto (meta_credentials)
 * - Orquestra a sincronização delegando para a função v1/meta-api
 * - Não faz fetch da API Meta diretamente
 * - Registra a execução no provider_event_log
 * 
 * Periodicidade: Diariamente
 */

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Log de execução no provider_event_log
async function logExecution(
    supabase: any,
    projectId: string,
    status: 'processed' | 'error',
    details: any = {}
) {
    try {
        await supabase
            .from('provider_event_log')
            .insert({
                project_id: projectId,
                provider: 'meta',
                provider_event_id: `hierarchy_sync_${projectId}_${Date.now()}`,
                received_at: new Date().toISOString(),
                raw_payload: {
                    event_type: 'hierarchy_sync',
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
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    const startTime = Date.now()
    console.log('=== META HIERARCHY CRON STARTED ===')
    console.log('Timestamp:', new Date().toISOString())

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // PASSO 1: Buscar APENAS projetos que possuem contas de anúncios ativas
        console.log('Buscando contas de anúncios do Meta ativas...')
        const { data: activeAccounts, error: accountsError } = await supabase
            .from('meta_ad_accounts')
            .select('project_id, account_id')
            .eq('is_active', true)

        if (accountsError) {
            console.error('Erro ao buscar meta_ad_accounts:', accountsError)
            throw new Error(`Failed to fetch ad accounts: ${accountsError.message}`)
        }

        if (!activeAccounts || activeAccounts.length === 0) {
            console.log('Nenhuma conta de anúncios ativa encontrada. Encerrando.')
            return new Response(JSON.stringify({
                success: true,
                message: 'No active meta accounts found',
                total_projects_processed: 0,
                total_projects_skipped: 0,
                total_errors: 0
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Agrupar account_ids por project_id
        const projectsMap = new Map<string, string[]>()
        for (const acc of activeAccounts) {
            if (!projectsMap.has(acc.project_id)) {
                projectsMap.set(acc.project_id, [])
            }
            projectsMap.get(acc.project_id)!.push(acc.account_id)
        }

        console.log(`Encontrados ${projectsMap.size} projetos com o Meta Ads conectado.`)

        const results: any[] = []
        let totalProcessed = 0
        let totalSkipped = 0
        let totalErrors = 0

        // PASSO 2: Processar cada projeto válido
        for (const [projectId, accountIds] of projectsMap.entries()) {
            console.log(`\n📊 Processando projeto: ${projectId}`)
            console.log(`  Contas ativas vinculadas: ${accountIds.join(', ')}`)

            try {
                // Obter credenciais do projeto
                const { data: credentials, error: credError } = await supabase
                    .from('meta_credentials')
                    .select('access_token, expires_at')
                    .eq('project_id', projectId)
                    .maybeSingle()

                if (credError || !credentials?.access_token) {
                    console.log(`  ⏭️ Sem token de acesso (credenciais ausentes). Pulando.`)
                    totalSkipped++
                    continue
                }

                // Verificar se token expirou
                if (credentials.expires_at && new Date(credentials.expires_at) < new Date()) {
                    console.log(`  ⚠️ Token expirado. Pulando.`)
                    await logExecution(supabase, projectId, 'error', {
                        error: 'Token expired'
                    })
                    totalSkipped++
                    continue
                }

                // Delegar sincronização para meta-api
                console.log(`  🔄 Solicitando sincronização (action: sync_hierarchy_full)...`)

                const response = await fetch(`${SUPABASE_URL}/functions/v1/meta-api`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        'x-cron-trigger': 'meta-hierarchy-cron',
                    },
                    body: JSON.stringify({
                        action: 'sync_hierarchy_full',
                        projectId: projectId,
                        accountIds: accountIds
                    }),
                })

                if (response.ok) {
                    const result = await response.json()
                    console.log(`  ✅ Sincronização iniciada com sucesso:`, result)

                    await logExecution(supabase, projectId, 'processed', {
                        accountIds,
                        result
                    })

                    results.push({
                        projectId: projectId,
                        status: 'success',
                        accounts: accountIds.length
                    })
                    totalProcessed++
                } else {
                    const errorText = await response.text()
                    console.error(`  ❌ Sincronização falhou: ${errorText}`)

                    await logExecution(supabase, projectId, 'error', {
                        error: errorText
                    })

                    results.push({
                        projectId: projectId,
                        status: 'error',
                        error: errorText
                    })
                    totalErrors++
                }

            } catch (projectError) {
                console.error(`  ❌ Erro no processamento do projeto:`, projectError)
                await logExecution(supabase, projectId, 'error', {
                    error: projectError instanceof Error ? projectError.message : 'Unknown error'
                })
                totalErrors++
            }

            // Pequeno delay entre requests para projetos
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        const duration = Date.now() - startTime
        console.log(`\n=== META HIERARCHY CRON COMPLETED ===`)
        console.log(`Duração: ${duration}ms`)
        console.log(`Processados: ${totalProcessed}, Skips: ${totalSkipped}, Erros: ${totalErrors}`)

        return new Response(JSON.stringify({
            success: true,
            duration,
            total_projects_processed: totalProcessed,
            total_projects_skipped: totalSkipped,
            total_errors: totalErrors,
            results
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error('❌ Erro principal na Cron:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
