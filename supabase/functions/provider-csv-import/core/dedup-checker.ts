// supabase/functions/provider-csv-import/core/dedup-checker.ts

export type OrderState =
  | 'not_found'            // Order não existe → criar tudo
  | 'exists_no_ledger'     // Order existe, sem ledger → complementar com CSV
  | 'exists_webhook_ledger' // Order existe, ledger de webhook → SKIP financeiro
  | 'exists_csv_ledger';   // Order existe, ledger de CSV → SKIP (idempotente)

export async function checkOrderState(
  supabase: any,
  projectId: string,
  providerOrderId: string,
): Promise<{ state: OrderState; orderId: string | null }> {
  // 1. Verificar se o order existe
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle();

  if (!order) return { state: 'not_found', orderId: null };

  // 2. Verificar se tem ledger de webhook
  const { data: webhookLedger } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('order_id', order.id)
    .eq('source_origin', 'webhook')
    .limit(1)
    .maybeSingle();

  if (webhookLedger) return { state: 'exists_webhook_ledger', orderId: order.id };

  // 3. Verificar se tem ledger de CSV
  const { data: csvLedger } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('order_id', order.id)
    .eq('source_origin', 'csv')
    .limit(1)
    .maybeSingle();

  if (csvLedger) return { state: 'exists_csv_ledger', orderId: order.id };

  return { state: 'exists_no_ledger', orderId: order.id };
}

/** Verifica se um ledger_event já existe por provider_event_id (sem constraint no banco) */
export async function ledgerEventExists(
  supabase: any,
  providerEventId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('ledger_events')
    .select('id')
    .eq('provider_event_id', providerEventId)
    .maybeSingle();
  return !!data;
}
