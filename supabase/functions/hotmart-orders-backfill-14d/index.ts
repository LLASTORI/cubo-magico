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
 * Must group order bumps, upsells and downsells under the same parent order.
 * 
 * Rules:
 * 1. If purchase.order_bump.is_order_bump = true → use parent_purchase_transaction
 * 2. If upsell/downsell detected → use parent_purchase_transaction (if available)
 * 3. Otherwise → use purchase.transaction (main product)
 */
function resolveHotmartOrderId(payload: any): string | null {
  const data = payload?.data;
  const purchase = data?.purchase;
  
  if (!purchase) return null;
  
  // Rule 1: Order Bump - always use parent
  if (purchase.order_bump?.is_order_bump && purchase.order_bump?.parent_purchase_transaction) {
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  // Rule 2: Upsell/Downsell detection via offer name
  const offerName = purchase.offer?.name?.toLowerCase() || '';
  const isUpsell = offerName.includes('upsell');
  const isDownsell = offerName.includes('downsell');
  
  if ((isUpsell || isDownsell) && purchase.order_bump?.parent_purchase_transaction) {
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  // Rule 3: Check for any parent_purchase_transaction
  if (purchase.parent_purchase_transaction) {
    return purchase.parent_purchase_transaction;
  }
  
  // Rule 4: Main product - use own transaction
  if (purchase.transaction) {
    return purchase.transaction;
  }
  
  // Fallback
  if (data?.order?.id) {
    return String(data.order.id);
  }
  
  if (purchase.code) {
    return purchase.code;
  }
  
  return null;
}

/**
 * Get the original transaction ID (for mapping purposes)
 */
function getOriginalTransactionId(payload: any): string | null {
  const purchase = payload?.data?.purchase;
  return purchase?.transaction || purchase?.code || null;
}

/**
 * Determine item type from Hotmart payload
 * 
 * Rules:
 * 1. is_order_bump=false → main
 * 2. is_order_bump=true + parent_tx=null → main (semantic fallback)
 * 3. is_order_bump=true + parent_tx === transaction (self-ref) → main
 * 4. is_order_bump=true + parent_tx !== transaction → bump
 * 5. offer name contains upsell/downsell → upsell/downsell
 */
function resolveItemType(payload: any): string {
  const purchase = payload?.data?.purchase;
  
  // Upsell/Downsell detection (via offer name) - check first
  const offerName = purchase?.offer?.name?.toLowerCase() || '';
  if (offerName.includes('upsell')) return 'upsell';
  if (offerName.includes('downsell')) return 'downsell';
  
  // Order bump detection with SEMANTIC FALLBACK
  // Hotmart may send is_order_bump=true for ALL items in a checkout.
  // The REAL bump must have parent_purchase_transaction filled AND different from its own transaction.
  if (purchase?.order_bump?.is_order_bump === true) {
    const parentTx = purchase?.order_bump?.parent_purchase_transaction;
    const ownTx = purchase?.transaction;
    
    // Check if it has a parent transaction (potential bump)
    if (parentTx && parentTx !== '') {
      // Self-referencing: parent equals own transaction → this is the main product
      if (parentTx === ownTx) {
        console.log(`[resolveItemType] Self-referencing: parent_tx === transaction (${ownTx}) → classifying as main`);
        return 'main';
      }
      // Real bump: parent is different from own transaction
      return 'bump';
    }
    
    // is_order_bump=true + parent_tx=null → this is the main product
    console.log('[resolveItemType] Semantic fallback: is_order_bump=true but no parent_tx → classifying as main');
    return 'main';
  }
  
  // Default to main product
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

// ============================================
// SCK → UTM PARSER (Same as webhook)
// ============================================
interface ParsedUTMs {
  utm_source: string | null;
  utm_medium: string | null;      // adset in SCK format
  utm_campaign: string | null;
  utm_content: string | null;     // creative in SCK format
  utm_term: string | null;        // placement in SCK format
  raw_sck: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
}

function parseSCKtoUTMs(checkoutOrigin: string | null): ParsedUTMs {
  const result: ParsedUTMs = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    raw_sck: checkoutOrigin,
    meta_campaign_id: null,
    meta_adset_id: null,
    meta_ad_id: null,
  };
  
  if (!checkoutOrigin || checkoutOrigin.trim() === '') {
    return result;
  }
  
  const parts = checkoutOrigin.split('|').map(p => p.trim());
  
  // parts[0] = utm_source
  if (parts.length >= 1 && parts[0]) {
    result.utm_source = parts[0];
  }
  
  // parts[1] = utm_medium (adset)
  if (parts.length >= 2 && parts[1]) {
    result.utm_medium = parts[1];
    const adsetIdMatch = parts[1].match(/_(\d{10,})$/);
    if (adsetIdMatch) {
      result.meta_adset_id = adsetIdMatch[1];
    }
  }
  
  // parts[2] = utm_campaign
  if (parts.length >= 3 && parts[2]) {
    result.utm_campaign = parts[2];
    const campaignIdMatch = parts[2].match(/_(\d{10,})$/);
    if (campaignIdMatch) {
      result.meta_campaign_id = campaignIdMatch[1];
    }
  }
  
  // parts[3] = utm_term (placement)
  if (parts.length >= 4 && parts[3]) {
    result.utm_term = parts[3];
  }
  
  // parts[4] = utm_content (creative)
  if (parts.length >= 5 && parts[4]) {
    result.utm_content = parts[4];
    const adIdMatch = parts[4].match(/_(\d{10,})$/);
    if (adIdMatch) {
      result.meta_ad_id = adIdMatch[1];
    }
  }
  
  return result;
}

// Resolve SCK from multiple possible payload locations
function resolveSCK(payload: any): string | null {
  const purchase = payload?.data?.purchase;
  return purchase?.origin?.sck 
    || purchase?.checkout_origin 
    || purchase?.tracking?.source_sck 
    || purchase?.tracking?.source 
    || null;
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

    const body = await req.json().catch(() => ({}));
    
    if (!projectId) {
      projectId = body.projectId || null;
    }

    // Pagination parameters
    const offset = body.offset || 0;
    const limit = body.limit || 200; // Process 200 events per batch to avoid timeout

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project identification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[OrdersBackfill14d] Starting for project ${projectId}, offset=${offset}, limit=${limit}`);

    // Get events from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: events, error: fetchError } = await supabase
      .from('provider_event_log')
      .select('id, provider_event_id, raw_payload, received_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .gte('received_at', fourteenDaysAgo.toISOString())
      .order('received_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (fetchError) throw fetchError;

    console.log(`[OrdersBackfill14d] Processing ${events?.length || 0} events (offset ${offset})`);

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

        // ============================================
        // EXTRACT UTMs FROM SCK (MATERIALIZED IN ORDERS)
        // ============================================
        const rawSck = resolveSCK(payload);
        const parsedUTMs = parseSCKtoUTMs(rawSck);

        // Parse dates
        const orderedAt = purchase?.order_date 
          ? new Date(purchase.order_date).toISOString()
          : new Date(payload.creation_date).toISOString();
        
        const approvedAt = purchase?.approved_date
          ? new Date(purchase.approved_date).toISOString()
          : null;

        const status = hotmartToOrderStatus[hotmartEvent] || 'pending';

        // ============================================
        // 1. UPSERT ORDER (with ACCUMULATION + UTM BACKFILL)
        // ============================================
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id, customer_paid, gross_base, producer_net, approved_at, utm_source')
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .eq('provider_order_id', providerOrderId)
          .maybeSingle();

        let orderId: string;
        
        // Current event values
        const thisEventCustomerPaid = totalPriceBrl || 0;
        const thisEventGrossBase = grossBase || totalPriceBrl || 0;
        const thisEventProducerNet = financials.ownerNet || 0;

        if (existingOrder) {
          // Check if this item was already added (avoid double counting)
          const productId = orderItems[0]?.provider_product_id || 'unknown';
          const { data: existingItem } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', existingOrder.id)
            .eq('provider_product_id', productId)
            .maybeSingle();

          // ALWAYS update UTMs if missing (backfill existing orders)
          const shouldUpdateUTMs = !existingOrder.utm_source && parsedUTMs.utm_source;

          if (!existingItem || shouldUpdateUTMs) {
            const updateData: Record<string, any> = {
              status,
              approved_at: approvedAt || existingOrder.approved_at,
              updated_at: new Date().toISOString(),
            };
            
            // Accumulate financial values only for new items
            if (!existingItem) {
              updateData.customer_paid = (existingOrder.customer_paid || 0) + thisEventCustomerPaid;
              updateData.gross_base = (existingOrder.gross_base || 0) + thisEventGrossBase;
              updateData.producer_net = (existingOrder.producer_net || 0) + thisEventProducerNet;
              console.log(`[OrdersBackfill14d] Accumulating for ${providerOrderId}: ${existingOrder.customer_paid} + ${thisEventCustomerPaid} = ${updateData.customer_paid}`);
            }
            
            // Backfill UTMs if missing
            if (shouldUpdateUTMs) {
              updateData.utm_source = parsedUTMs.utm_source;
              updateData.utm_campaign = parsedUTMs.utm_campaign;
              updateData.utm_adset = parsedUTMs.utm_medium;
              updateData.utm_placement = parsedUTMs.utm_term;
              updateData.utm_creative = parsedUTMs.utm_content;
              updateData.raw_sck = rawSck;
              updateData.meta_campaign_id = parsedUTMs.meta_campaign_id;
              updateData.meta_adset_id = parsedUTMs.meta_adset_id;
              updateData.meta_ad_id = parsedUTMs.meta_ad_id;
              console.log(`[OrdersBackfill14d] Backfilling UTMs for ${providerOrderId}: source=${parsedUTMs.utm_source}`);
            }

            const { error: updateError } = await supabase
              .from('orders')
              .update(updateData)
              .eq('id', existingOrder.id);

            if (updateError) {
              console.error('[OrdersBackfill14d] Error updating order:', updateError);
              errors++;
              continue;
            }
            ordersUpdated++;
          } else {
            console.log(`[OrdersBackfill14d] Item already exists for ${providerOrderId}, skipping`);
          }
          
          orderId = existingOrder.id;
        } else {
          // Insert new order with MATERIALIZED UTMs
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
              customer_paid: thisEventCustomerPaid,
              gross_base: thisEventGrossBase,
              producer_net: thisEventProducerNet,
              ordered_at: orderedAt,
              approved_at: approvedAt,
              completed_at: status === 'completed' ? new Date().toISOString() : null,
              raw_payload: payload,
              // MATERIALIZED UTMs (PROMPT 9)
              utm_source: parsedUTMs.utm_source,
              utm_campaign: parsedUTMs.utm_campaign,
              utm_adset: parsedUTMs.utm_medium,
              utm_placement: parsedUTMs.utm_term,
              utm_creative: parsedUTMs.utm_content,
              raw_sck: rawSck,
              meta_campaign_id: parsedUTMs.meta_campaign_id,
              meta_adset_id: parsedUTMs.meta_adset_id,
              meta_ad_id: parsedUTMs.meta_ad_id,
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

          // Use provider_event_id to allow multiple ledger entries per item (C1, C2, C3)
          const providerEventId = `${transactionId}_${eventType}_${actor}`;
          const { data: existingEvent } = await supabase
            .from('ledger_events')
            .select('id')
            .eq('order_id', orderId)
            .eq('provider_event_id', providerEventId)
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
          // Use provider_event_id to allow multiple coproducer entries per item
          const coproducerEventId = `${transactionId}_coproducer_auto`;
          const { data: existingCoproducer } = await supabase
            .from('ledger_events')
            .select('id')
            .eq('order_id', orderId)
            .eq('provider_event_id', coproducerEventId)
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
