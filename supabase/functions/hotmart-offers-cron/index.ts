import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * HOTMART OFFERS CRON
 *
 * Sincroniza ofertas Hotmart para todos os projetos configurados.
 * Chamado via cron semanal (segunda-feira 07:00 UTC).
 *
 * Fluxo por projeto:
 *   1. Busca projetos com Hotmart is_configured=true
 *   2. Chama hotmart-products (action=sync-offers) via HTTP
 *   3. Grava offers_synced_at em project_credentials
 *   4. Registra resultado em system_health_log
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const results: Array<{ project_id: string; ok: boolean; message?: string; error?: string }> = []

  try {
    // 1. Busca todos os projetos com Hotmart configurado e validado
    const { data: credentials, error: credError } = await supabase
      .from('project_credentials')
      .select('project_id')
      .eq('provider', 'hotmart')
      .eq('is_configured', true)
      .eq('is_validated', true)

    if (credError) throw credError

    const projectIds = credentials?.map((c) => c.project_id) ?? []
    console.log(`[hotmart-offers-cron] ${projectIds.length} projetos para sincronizar`)

    // 2. Sincroniza cada projeto em sequência (evita rate limit Hotmart)
    for (const projectId of projectIds) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/hotmart-products`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ action: 'sync-offers', projectId }),
          }
        )

        const body = await res.json()

        if (!res.ok) {
          results.push({ project_id: projectId, ok: false, error: body?.error ?? `HTTP ${res.status}` })
          console.error(`[hotmart-offers-cron] ${projectId} → ERRO: ${body?.error}`)
          continue
        }

        // 3. Grava offers_synced_at
        await supabase
          .from('project_credentials')
          .update({ offers_synced_at: new Date().toISOString() })
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')

        results.push({
          project_id: projectId,
          ok: true,
          message: body?.message,
        })
        console.log(`[hotmart-offers-cron] ${projectId} → OK: ${body?.message}`)

        // Pausa 1s entre projetos para respeitar rate limit
        await new Promise((r) => setTimeout(r, 1000))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        results.push({ project_id: projectId, ok: false, error: msg })
        console.error(`[hotmart-offers-cron] ${projectId} → EXCEPTION: ${msg}`)
      }
    }

    const successCount = results.filter((r) => r.ok).length
    const errorCount = results.filter((r) => !r.ok).length
    const severity = errorCount === 0 ? 'ok' : errorCount < projectIds.length ? 'warning' : 'critical'

    // 4. Registra em system_health_log
    await supabase.from('system_health_log').insert({
      check_type: 'hotmart_offers_sync',
      severity,
      affected_count: successCount,
      details: {
        total_projects: projectIds.length,
        success: successCount,
        errors: errorCount,
        results,
        synced_at: new Date().toISOString(),
      },
    })

    return new Response(
      JSON.stringify({ ok: true, severity, total: projectIds.length, success: successCount, errors: errorCount, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('[hotmart-offers-cron] Fatal error:', message)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
