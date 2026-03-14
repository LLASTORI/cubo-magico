// supabase/functions/provider-csv-import/core/ledger-writer.ts

import type { NormalizedOrderGroup, NormalizedOrderItem } from '../types.ts';

interface LedgerEventRow {
  order_id: string;
  project_id: string;
  provider: string;
  event_type: string;
  actor: string;
  actor_name: string;
  amount: number;
  amount_brl: number;
  amount_accounting: number;
  currency_accounting: string;
  conversion_rate: number;
  source_type: string;
  currency: string;
  provider_event_id: string;
  occurred_at: string;
  source_origin: string;
  confidence_level: string;
  raw_payload: Record<string, unknown>;
}

/**
 * Insere o evento usando ON CONFLICT DO NOTHING (constraint UNIQUE em provider_event_id).
 * Elimina o SELECT prévio — metade das queries do caminho anterior.
 * Retorna true se inseriu, false se já existia (conflito silencioso).
 */
async function insertEvent(
  supabase: any,
  event: LedgerEventRow,
): Promise<boolean> {
  const { error, data } = await supabase
    .from('ledger_events')
    .upsert(event, { onConflict: 'provider_event_id', ignoreDuplicates: true })
    .select('id');

  if (error) {
    console.error('[LedgerWriter] Error inserting event:', event.provider_event_id, error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

function buildCreditEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
  batchId: string,
): LedgerEventRow[] {
  const base = {
    order_id: orderId,
    project_id: projectId,
    provider: 'hotmart',
    currency: 'BRL',
    source_type: 'native_brl',
    source_origin: 'csv',
    confidence_level: 'accounting',
    occurred_at: occurredAt,
    raw_payload: { csv_transaction_id: item.own_transaction_id, batch_id: batchId },
    amount_accounting: 0,
    currency_accounting: 'BRL',
    conversion_rate: item.conversion_rate,
  };

  const events: LedgerEventRow[] = [];
  const tx = item.own_transaction_id;

  events.push({
    ...base,
    event_type: 'sale',
    actor: 'PRODUCER',
    actor_name: 'producer',
    amount: item.producer_net_brl,
    amount_brl: item.producer_net_brl,
    amount_accounting: item.producer_net_brl,
    provider_event_id: `csv_sale_${tx}`,
  });

  if (item.platform_fee_brl > 0) {
    events.push({
      ...base,
      event_type: 'platform_fee',
      actor: 'MARKETPLACE',
      actor_name: 'hotmart',
      amount: item.platform_fee_brl,
      amount_brl: item.platform_fee_brl,
      amount_accounting: item.platform_fee_brl,
      provider_event_id: `csv_platform_fee_${tx}`,
    });
  }

  if (item.affiliate_brl > 0) {
    events.push({
      ...base,
      event_type: 'affiliate',
      actor: 'AFFILIATE',
      actor_name: 'affiliate',
      amount: item.affiliate_brl,
      amount_brl: item.affiliate_brl,
      amount_accounting: item.affiliate_brl,
      provider_event_id: `csv_affiliate_${tx}`,
    });
  }

  if (item.coproducer_brl > 0) {
    events.push({
      ...base,
      event_type: 'coproducer',
      actor: 'CO_PRODUCER',
      actor_name: 'coproducer',
      amount: item.coproducer_brl,
      amount_brl: item.coproducer_brl,
      amount_accounting: item.coproducer_brl,
      provider_event_id: `csv_coproducer_${tx}`,
    });
  }

  return events;
}

function buildDebitEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
  batchId: string,
): LedgerEventRow[] {
  const tx = item.own_transaction_id;
  const base = {
    order_id: orderId,
    project_id: projectId,
    provider: 'hotmart',
    currency: 'BRL',
    source_type: 'native_brl',
    source_origin: 'csv',
    confidence_level: 'accounting',
    occurred_at: occurredAt,
    raw_payload: { csv_transaction_id: tx, batch_id: batchId },
    currency_accounting: 'BRL',
    conversion_rate: item.conversion_rate,
  };

  const events: LedgerEventRow[] = [];

  events.push({
    ...base,
    event_type: 'refund',
    actor: 'PRODUCER',
    actor_name: 'producer',
    amount: -Math.abs(item.producer_net_brl),
    amount_brl: -Math.abs(item.producer_net_brl),
    amount_accounting: -Math.abs(item.producer_net_brl),
    provider_event_id: `csv_refund_${tx}`,
  });

  if (item.platform_fee_brl > 0) {
    events.push({
      ...base,
      event_type: 'platform_fee',
      actor: 'MARKETPLACE',
      actor_name: 'hotmart',
      amount: -Math.abs(item.platform_fee_brl),
      amount_brl: -Math.abs(item.platform_fee_brl),
      amount_accounting: -Math.abs(item.platform_fee_brl),
      provider_event_id: `csv_platform_fee_refund_${tx}`,
    });
  }

  if (item.affiliate_brl > 0) {
    events.push({
      ...base,
      event_type: 'affiliate',
      actor: 'AFFILIATE',
      actor_name: 'affiliate',
      amount: -Math.abs(item.affiliate_brl),
      amount_brl: -Math.abs(item.affiliate_brl),
      amount_accounting: -Math.abs(item.affiliate_brl),
      provider_event_id: `csv_affiliate_refund_${tx}`,
    });
  }

  return events;
}

export async function writeLedgerEvents(
  supabase: any,
  orderId: string,
  projectId: string,
  group: NormalizedOrderGroup,
  batchId: string,
): Promise<number> {
  if (group.status === 'pending' || group.status === 'skip') return 0;

  let created = 0;
  const occurredAt = group.approved_at ?? group.ordered_at;

  for (const item of group.items) {
    const creditEvents = buildCreditEvents(orderId, projectId, item, occurredAt, batchId);
    for (const event of creditEvents) {
      if (await insertEvent(supabase, event)) created++;
    }

    if (item.is_debit) {
      const debitEvents = buildDebitEvents(orderId, projectId, item, occurredAt, batchId);
      for (const event of debitEvents) {
        if (await insertEvent(supabase, event)) created++;
      }
    }
  }

  return created;
}
