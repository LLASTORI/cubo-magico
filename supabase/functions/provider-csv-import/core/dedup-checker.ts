// supabase/functions/provider-csv-import/core/dedup-checker.ts

export type OrderState =
  | 'not_found'             // Order não existe → criar tudo
  | 'exists_no_ledger'      // Order existe, sem ledger → complementar com CSV
  | 'exists_webhook_ledger' // Order existe, ledger de webhook → SKIP financeiro
  | 'exists_csv_ledger';    // Order existe, ledger de CSV → SKIP (idempotente)

/**
 * Versão em lote: verifica o estado de todos os orders do chunk em 2 queries
 * em vez de N*3 queries individuais. Reduz ~400 queries para ~2 por chunk.
 */
export async function batchCheckOrderStates(
  supabase: any,
  projectId: string,
  providerOrderIds: string[],
): Promise<Map<string, { state: OrderState; orderId: string | null }>> {
  const result = new Map<string, { state: OrderState; orderId: string | null }>();

  // 1. Buscar todos os orders do chunk de uma vez
  const { data: orders } = await supabase
    .from('orders')
    .select('id, provider_order_id')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .in('provider_order_id', providerOrderIds);

  const orderMap = new Map<string, string>(); // provider_order_id → order_id
  for (const o of orders ?? []) {
    orderMap.set(o.provider_order_id, o.id);
  }

  // Orders não encontrados → not_found
  for (const pid of providerOrderIds) {
    if (!orderMap.has(pid)) {
      result.set(pid, { state: 'not_found', orderId: null });
    }
  }

  const existingOrderIds = [...orderMap.values()];
  if (existingOrderIds.length === 0) return result;

  // 2. Buscar estados de ledger para todos os orders existentes de uma vez
  const { data: ledgers } = await supabase
    .from('ledger_events')
    .select('order_id, source_origin')
    .in('order_id', existingOrderIds)
    .in('source_origin', ['webhook', 'csv']);

  const webhookOrders = new Set<string>();
  const csvOrders = new Set<string>();
  for (const l of ledgers ?? []) {
    if (l.source_origin === 'webhook') webhookOrders.add(l.order_id);
    else if (l.source_origin === 'csv') csvOrders.add(l.order_id);
  }

  // Mapear estado de volta por provider_order_id
  for (const [pid, oid] of orderMap) {
    if (webhookOrders.has(oid)) {
      result.set(pid, { state: 'exists_webhook_ledger', orderId: oid });
    } else if (csvOrders.has(oid)) {
      result.set(pid, { state: 'exists_csv_ledger', orderId: oid });
    } else {
      result.set(pid, { state: 'exists_no_ledger', orderId: oid });
    }
  }

  return result;
}
