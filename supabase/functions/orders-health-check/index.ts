import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * ORDERS HEALTH CHECK CRON
 *
 * Edge Function chamada via cron para detectar orders approved sem ledger_events.
 * Registra resultado em system_health_log para rastreabilidade.
 *
 * Severidade:
 *   ok       → 0 orders stuck
 *   warning  → 1–9 orders stuck (possível delay de webhook)
 *   critical → 10+ orders stuck (problema sistêmico)
 *
 * Periodicidade recomendada: a cada 6h (ou 1x/dia)
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

  try {
    // Busca orders sem ledger (approved >2h)
    const { data: stuckOrders, error: viewError } = await supabase
      .from('v_orders_without_ledger')
      .select('order_id, project_id, provider_order_id, approved_at, customer_paid, currency, hours_since_approval')

    if (viewError) throw viewError

    const count = stuckOrders?.length ?? 0
    const severity = count === 0 ? 'ok' : count < 10 ? 'warning' : 'critical'

    // Agrupa por projeto para detalhe no log
    const byProject: Record<string, number> = {}
    for (const row of stuckOrders ?? []) {
      byProject[row.project_id] = (byProject[row.project_id] ?? 0) + 1
    }

    const details = {
      affected_orders: stuckOrders?.map((r) => ({
        order_id: r.order_id,
        project_id: r.project_id,
        provider_order_id: r.provider_order_id,
        approved_at: r.approved_at,
        customer_paid: r.customer_paid,
        currency: r.currency,
        hours_since_approval: r.hours_since_approval,
      })) ?? [],
      by_project: byProject,
      checked_at: new Date().toISOString(),
    }

    // Registra em system_health_log
    const { error: logError } = await supabase
      .from('system_health_log')
      .insert({
        check_type: 'orders_without_ledger',
        severity,
        affected_count: count,
        details,
      })

    if (logError) throw logError

    console.log(`[orders-health-check] severity=${severity} count=${count}`, byProject)

    return new Response(
      JSON.stringify({ ok: true, severity, affected_count: count, by_project: byProject }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : (typeof err === 'object' ? JSON.stringify(err) : String(err))
    console.error('[orders-health-check] Error:', message)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
