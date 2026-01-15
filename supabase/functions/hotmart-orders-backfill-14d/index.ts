import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// HOTMART ORDERS BACKFILL 14D
// Populates the new Orders Core from provider_event_log
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Map Hotmart events to canonical order status
const hotmartToOrderStatus: Record<string, string> = {
  'PURCHASE_APPROVED': 'approved',
  'PURCHASE_COMPLETE': 'completed',
  'PURCHASE_BILLET_PRINTED': 'pending',
  'PURCHASE_CANCELED': 'cancelled',
  'PURCHASE_REFUNDED': 'refunded',
  'PURCHASE_CHARGEBACK': 'chargeback',
  'SUBSCRIPTION_STARTED': 'approved',
  'PURCHASE_RECURRENCE_CANCELLATION': 'cancelled',
  'SWITCH_PLAN': 'approved',
};

// Events that represent money going OUT (inverted amounts)
const debitEvents = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_RECURRENCE_CANCELLATION'];

/**
 * Resolve Hotmart Order ID from payload
 */
function resolveHotmartOrderId(payload: any): string | null {
  const data = payload?.data;
  const purchase = data?.purchase;
  
  if (data?.order?.id) {
    return String(data.order.id);
  }
  
  if (purchase?.order_bump?.is_order_bump && purchase?.order_bump?.parent_purchase_transaction) {
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  if (purchase?.transaction) {
    return purchase.transaction;
  }
  
  if (purchase?.code) {
    return purchase.code;
  }
  
  return null;
}

/**
 * Determine item type from Hotmart payload
 */
function resolveItemType(payload: any): string {
  const purchase = payload?.data?.purchase;
  
  if (purchase?.order_bump?.is_order_bump) {
    return 'bump';
  }
  
  const offerName = purchase?.offer?.name?.toLowerCase() || '';
  if (offerName.includes('upsell')) return 'upsell';
  if (offerName.includes('downsell')) return 'downsell';
  
  return 'main';
}

/**
 * Extract order items from payload
 */
function extractOrderItems(payload: any): Array<{
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: string;
  base_price: number | null;
  quantity: number;
}> {
  const data = payload?.data;
  const product = data?.product;
  const purchase = data?.purchase;
  const items: Array<{
    provider_product_id: string;
    provider_offer_id: string | null;
    product_name: string;
    offer_name: string | null;
    item_type: string;
    base_price: number | null;
    quantity: number;
  }> = [];
  
  if (!product) return items;
  
  const itemType = resolveItemType(payload);
  const basePrice = purchase?.price?.value || purchase?.full_price?.value || null;
  
  items.push({
    provider_product_id: product.id?.toString() || product.ucode || 'unknown',
    provider_offer_id: purchase?.offer?.code || null,
    product_name: product.name || 'Unknown Product',
    offer_name: purchase?.offer?.name || null,
    item_type: itemType,
    base_price: basePrice,
    quantity: 1,
  });
  
  return items;
}

/**
 * Extract financial breakdown from commissions
 */
function extractFinancials(commissions: any[]): {
  platformFee: number | null;
  ownerNet: number | null;
  affiliateAmount: number | null;
  coproducerAmount: number | null;
} {
  const result = { 
    platformFee: null as number | null, 
    ownerNet: null as number | null, 
    affiliateAmount: null as number | null, 
    coproducerAmount: null as number | null 
  };
  
  if (!commissions || !Array.isArray(commissions)) return result;
  
  for (const comm of commissions) {
    const source = (comm.source || '').toUpperCase();
    const value = comm.value ?? null;
    
    switch (source) {
      case 'MARKETPLACE': result.platformFee = value; break;
      case 'PRODUCER': result.ownerNet = value; break;
      case 'AFFILIATE': result.affiliateAmount = value; break;
      case 'CO_PRODUCER': result.coproducerAmount = value; break;
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get projectId from header or body
    const projectCode = req.headers.get('X-Project-Code');
    let projectId: string | null = null;

    if (projectCode) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('public_code', projectCode)
        .maybeSingle();
      projectId = project?.id || null;
    }

    if (!projectId) {
      const body = await req.json().catch(() => ({}));
      projectId = body.projectId || null;
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project identification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[OrdersBackfill14d] Starting for project ${projectId}`);

    // Get events from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: events, error: fetchError } = await supabase
      .from('provider_event_log')
      .select('id, provider_event_id, raw_payload, received_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .gte('received_at', fourteenDaysAgo.toISOString())
      .order('received_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`[OrdersBackfill14d] Found ${events?.length || 0} events to process`);

    let ordersCreated = 0;
    let ordersUpdated = 0;
    let itemsCreated = 0;
    let ledgerEventsCreated = 0;
    let mappingsCreated = 0;
    let errors = 0;

    // Exchange rates for currency conversion
    const exchangeRates: Record<string, number> = {
      'BRL': 1, 'USD': 5.50, 'EUR': 6.00, 'GBP': 7.00, 'PYG': 0.00075,
    };

    for (const event of events || []) {
      try {
        const payload = event.raw_payload;
        if (!payload) continue;

        const data = payload.data;
        const purchase = data?.purchase;
        const buyer = data?.buyer;
        const hotmartEvent = payload.event;
        
        const providerOrderId = resolveHotmartOrderId(payload);
        if (!providerOrderId) continue;

        const transactionId = purchase?.transaction;
        if (!transactionId) continue;

        // Extract financials
        const commissions = data?.commissions || [];
        const financials = extractFinancials(commissions);
        
        // Calculate totals in BRL
        const currencyCode = purchase?.price?.currency_value || 'BRL';
        const totalPrice = purchase?.full_price?.value || purchase?.price?.value || null;
        let totalPriceBrl = totalPrice;
        
        if (currencyCode !== 'BRL' && totalPrice !== null) {
          totalPriceBrl = totalPrice * (exchangeRates[currencyCode] || 1);
        }

        // Auto-calculate coproducer if needed
        const hasCoProduction = data?.product?.has_co_production === true;
        const hasCoproducerInCommissions = financials.coproducerAmount !== null && financials.coproducerAmount > 0;
        let finalCoproducerCost = financials.coproducerAmount;
        
        if (hasCoProduction && !hasCoproducerInCommissions && totalPriceBrl !== null && financials.ownerNet !== null) {
          const calculated = totalPriceBrl - (financials.platformFee || 0) - (financials.affiliateAmount || 0) - financials.ownerNet;
          if (calculated > 0) {
            finalCoproducerCost = Math.round(calculated * 100) / 100;
          }
        }

        // Extract order items
        const orderItems = extractOrderItems(payload);
        const grossBase = orderItems.reduce((sum, item) => sum + (item.base_price || 0), 0);

        // Parse dates
        const orderedAt = purchase?.order_date 
          ? new Date(purchase.order_date).toISOString()
          : new Date(payload.creation_date).toISOString();
        
        const approvedAt = purchase?.approved_date
          ? new Date(purchase.approved_date).toISOString()
          : null;

        const status = hotmartToOrderStatus[hotmartEvent] || 'pending';

        // ============================================
        // 1. UPSERT ORDER
        // ============================================
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .eq('provider_order_id', providerOrderId)
          .maybeSingle();

        let orderId: string;

        if (existingOrder) {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status,
              customer_paid: totalPriceBrl,
              gross_base: grossBase || totalPriceBrl,
              producer_net: financials.ownerNet,
              approved_at: approvedAt,
              completed_at: status === 'completed' ? new Date().toISOString() : null,
              raw_payload: payload,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id);

          if (updateError) {
            console.error('[OrdersBackfill14d] Error updating order:', updateError);
            errors++;
            continue;
          }
          
          orderId = existingOrder.id;
          ordersUpdated++;
        } else {
          const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert({
              project_id: projectId,
              provider: 'hotmart',
              provider_order_id: providerOrderId,
              buyer_email: buyer?.email?.toLowerCase() || null,
              buyer_name: buyer?.name || null,
              status,
              currency: currencyCode,
              customer_paid: totalPriceBrl,
              gross_base: grossBase || totalPriceBrl,
              producer_net: financials.ownerNet,
              ordered_at: orderedAt,
              approved_at: approvedAt,
              completed_at: status === 'completed' ? new Date().toISOString() : null,
              raw_payload: payload,
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('[OrdersBackfill14d] Error inserting order:', insertError);
            errors++;
            continue;
          }

          orderId = newOrder.id;
          ordersCreated++;
        }

        // ============================================
        // 2. CREATE ORDER ITEMS (if doesn't exist)
        // ============================================
        for (const item of orderItems) {
          const { data: existingItem } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', orderId)
            .eq('provider_product_id', item.provider_product_id)
            .maybeSingle();

          if (!existingItem) {
            const { error: itemError } = await supabase
              .from('order_items')
              .insert({
                order_id: orderId,
                provider_product_id: item.provider_product_id,
                provider_offer_id: item.provider_offer_id,
                product_name: item.product_name,
                offer_name: item.offer_name,
                item_type: item.item_type,
                base_price: item.base_price,
                quantity: item.quantity,
              });

            if (!itemError) {
              itemsCreated++;
            }
          }
        }

        // ============================================
        // 3. CREATE LEDGER EVENTS
        // ============================================
        const isDebit = debitEvents.includes(hotmartEvent);

        for (const comm of commissions) {
          const source = (comm.source || '').toUpperCase();
          let value = comm.value ?? 0;
          
          if (value === 0) continue;
          if (isDebit) value = -Math.abs(value);

          let eventType: string;
          let actor: string;
          let actorName: string | null = null;

          switch (source) {
            case 'MARKETPLACE':
              eventType = 'platform_fee';
              actor = 'platform';
              actorName = 'hotmart';
              break;
            case 'PRODUCER':
              eventType = isDebit ? 'refund' : 'sale';
              actor = 'producer';
              break;
            case 'CO_PRODUCER':
              eventType = 'coproducer';
              actor = 'coproducer';
              actorName = data?.producer?.name || null;
              break;
            case 'AFFILIATE':
              eventType = 'affiliate';
              actor = 'affiliate';
              actorName = data?.affiliates?.[0]?.name || null;
              break;
            default:
              continue;
          }

          const { data: existingEvent } = await supabase
            .from('ledger_events')
            .select('id')
            .eq('order_id', orderId)
            .eq('event_type', eventType)
            .eq('actor', actor)
            .maybeSingle();

          if (!existingEvent) {
            const { error: eventError } = await supabase
              .from('ledger_events')
              .insert({
                order_id: orderId,
                project_id: projectId,
                provider: 'hotmart',
                event_type: eventType,
                actor,
                actor_name: actorName,
                amount: eventType === 'sale' ? Math.abs(value) : -Math.abs(value),
                currency: currencyCode,
                provider_event_id: `${transactionId}_${eventType}_${actor}`,
                occurred_at: orderedAt,
                raw_payload: comm,
              });

            if (!eventError) {
              ledgerEventsCreated++;
            }
          }
        }

        // Add auto-calculated coproducer if needed
        if (hasCoProduction && !hasCoproducerInCommissions && finalCoproducerCost && finalCoproducerCost > 0) {
          const { data: existingCoproducer } = await supabase
            .from('ledger_events')
            .select('id')
            .eq('order_id', orderId)
            .eq('event_type', 'coproducer')
            .maybeSingle();

          if (!existingCoproducer) {
            const { error: coproducerError } = await supabase
              .from('ledger_events')
              .insert({
                order_id: orderId,
                project_id: projectId,
                provider: 'hotmart',
                event_type: 'coproducer',
                actor: 'coproducer',
                actor_name: null,
                amount: -finalCoproducerCost,
                currency: currencyCode,
                provider_event_id: `${transactionId}_coproducer_auto`,
                occurred_at: orderedAt,
                raw_payload: { source: 'auto_calculated', has_co_production: true },
              });

            if (!coproducerError) {
              ledgerEventsCreated++;
            }
          }
        }

        // ============================================
        // 4. FILL provider_order_map
        // ============================================
        const { data: existingMapping } = await supabase
          .from('provider_order_map')
          .select('id')
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .eq('provider_transaction_id', transactionId)
          .maybeSingle();

        if (!existingMapping) {
          const { error: mapError } = await supabase
            .from('provider_order_map')
            .insert({
              project_id: projectId,
              provider: 'hotmart',
              provider_transaction_id: transactionId,
              order_id: orderId,
            });

          if (!mapError) {
            mappingsCreated++;
          }
        }

      } catch (err) {
        console.error(`[OrdersBackfill14d] Error processing event:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      projectId,
      eventsProcessed: events?.length || 0,
      ordersCreated,
      ordersUpdated,
      itemsCreated,
      ledgerEventsCreated,
      mappingsCreated,
      errors,
    };

    console.log(`[OrdersBackfill14d] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[OrdersBackfill14d] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
