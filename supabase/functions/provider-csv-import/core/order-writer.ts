// supabase/functions/provider-csv-import/core/order-writer.ts

import type { NormalizedOrderGroup } from '../types.ts';

/** Parse simplificado de SCK para UTMs (mesma lógica do webhook) */
function parseSCKtoUTMs(sck: string | null): Record<string, string | null> {
  if (!sck) return { utm_source: null, utm_campaign: null, utm_adset: null, utm_placement: null, utm_creative: null, meta_campaign_id: null, meta_adset_id: null, meta_ad_id: null };

  const parts = sck.split('|');
  const [utm_source, utm_campaign, , utm_medium, utm_term, utm_content] = parts;

  // Extrair IDs Meta de padrões conhecidos
  const metaCampaignMatch = sck.match(/(\d{15,})/g);
  const [meta_campaign_id = null, meta_adset_id = null, meta_ad_id = null] = metaCampaignMatch ?? [];

  return {
    utm_source: utm_source ?? null,
    utm_campaign: utm_campaign ?? null,
    utm_adset: utm_medium ?? null,
    utm_placement: utm_term ?? null,
    utm_creative: utm_content ?? null,
    meta_campaign_id,
    meta_adset_id,
    meta_ad_id,
  };
}

/** Normaliza método de pagamento (mesma lógica do webhook) */
function normalizePaymentMethod(raw: string | null): string {
  switch ((raw ?? '').toUpperCase()) {
    case 'CARTÃO DE CRÉDITO':
    case 'CREDIT_CARD': return 'credit_card';
    case 'PIX': return 'pix';
    case 'BOLETO':
    case 'BILLET': return 'billet';
    default: return 'unknown';
  }
}

export async function writeOrder(
  supabase: any,
  projectId: string,
  group: NormalizedOrderGroup,
  contactId: string | null,
  existingOrderId: string | null,
): Promise<string | null> {
  const utms = parseSCKtoUTMs(group.raw_sck);
  const paymentMethod = normalizePaymentMethod(group.payment_method);

  if (existingOrderId) {
    // Order já existe: complementar contact_id se estava vazio
    if (contactId) {
      await supabase
        .from('orders')
        .update({ contact_id: contactId, updated_at: new Date().toISOString() })
        .eq('id', existingOrderId)
        .is('contact_id', null);
    }
    return existingOrderId;
  }

  // Criar novo order
  const { data, error } = await supabase
    .from('orders')
    .insert({
      project_id: projectId,
      provider: 'hotmart',
      provider_order_id: group.provider_order_id,
      buyer_email: group.buyer_email,
      buyer_name: group.buyer_name,
      contact_id: contactId,
      status: group.status === 'approved' ? 'approved'
        : group.status === 'completed' ? 'completed'
        : group.status === 'cancelled' ? 'cancelled'
        : group.status === 'refunded' ? 'refunded'
        : 'pending',
      currency: group.currency,
      customer_paid: group.customer_paid,
      gross_base: group.customer_paid,
      producer_net: group.items.reduce((s, i) => s + i.producer_net_brl, 0),
      producer_net_brl: group.items.reduce((s, i) => s + i.producer_net_brl, 0),
      platform_fee_brl: group.items.reduce((s, i) => s + (i.platform_fee_brl ?? 0), 0),
      affiliate_brl: group.items.reduce((s, i) => s + (i.affiliate_brl ?? 0), 0),
      coproducer_brl: group.items.reduce((s, i) => s + (i.coproducer_brl ?? 0), 0),
      ordered_at: group.ordered_at,
      approved_at: group.approved_at,
      raw_sck: group.raw_sck,
      utm_source: utms.utm_source,
      utm_campaign: utms.utm_campaign,
      utm_adset: utms.utm_adset,
      utm_placement: utms.utm_placement,
      utm_creative: utms.utm_creative,
      meta_campaign_id: utms.meta_campaign_id,
      meta_adset_id: utms.meta_adset_id,
      meta_ad_id: utms.meta_ad_id,
      payment_method: paymentMethod,
      payment_type: group.payment_type,
      installments: group.installments,
      ledger_status: group.status === 'pending' ? 'pending' : 'complete',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[OrderWriter] Error inserting order:', error.message);
    return null;
  }

  return data.id;
}

export async function writeOrderItems(
  supabase: any,
  orderId: string,
  projectId: string,
  group: NormalizedOrderGroup,
): Promise<void> {
  const rows = group.items.map((item) => ({
    order_id: orderId,
    project_id: projectId,
    provider_product_id: item.provider_product_id,
    provider_offer_id: item.provider_offer_id,
    product_name: item.product_name,
    offer_name: item.offer_name,
    item_type: item.item_type,
    base_price: item.base_price,
    quantity: item.quantity,
    metadata: { source: 'csv', own_transaction_id: item.own_transaction_id },
  }));

  const { error } = await supabase
    .from('order_items')
    .upsert(rows, {
      onConflict: 'order_id,provider_product_id,provider_offer_id',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[OrderWriter] Error upserting order_items:', error.message);
  }
}
