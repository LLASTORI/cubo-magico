import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// SALES CORE PROVIDER - Hotmart Revenue Ingestion
// FINANCE LEDGER - Primary Financial Source (Webhook Only)
// ORDERS CORE SHADOW MODE - Duplicate to new canonical structure
// ============================================

// Map Hotmart events to canonical event types
const hotmartToCanonicalEventType: Record<string, string> = {
  'PURCHASE_APPROVED': 'purchase',
  'PURCHASE_COMPLETE': 'purchase',
  'PURCHASE_BILLET_PRINTED': 'attempt',
  'PURCHASE_CANCELED': 'refund',
  'PURCHASE_REFUNDED': 'refund',
  'PURCHASE_CHARGEBACK': 'chargeback',
  'SUBSCRIPTION_STARTED': 'subscription',
  'PURCHASE_RECURRENCE_CANCELLATION': 'refund',
  'SWITCH_PLAN': 'upgrade',
};

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

// Map Hotmart events to ledger entry types
const hotmartToLedgerEventType: Record<string, string> = {
  'PURCHASE_APPROVED': 'credit',
  'PURCHASE_COMPLETE': 'credit',
  'PURCHASE_CANCELED': 'refund',
  'PURCHASE_REFUNDED': 'refund',
  'PURCHASE_CHARGEBACK': 'chargeback',
  'SUBSCRIPTION_STARTED': 'credit',
  'PURCHASE_RECURRENCE_CANCELLATION': 'refund',
  'SWITCH_PLAN': 'credit',
};

// Events that represent money coming IN
const creditEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_STARTED', 'SWITCH_PLAN'];

// Events that represent money going OUT (inverted amounts)
const debitEvents = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_RECURRENCE_CANCELLATION'];

// ============================================
// ORDERS CORE SHADOW - Utility Functions
// ============================================

/**
 * Resolve Hotmart Order ID from payload
 * Must group order bumps, upsells and downsells under the same parent order.
 * 
 * Rules:
 * 1. If purchase.order_bump.is_order_bump = true → use parent_purchase_transaction
 * 2. If upsell/downsell detected → use parent_purchase_transaction (if available)
 * 3. Otherwise → use purchase.transaction (main product)
 * 
 * This ensures all items from the same checkout session are grouped under 1 order.
 */
function resolveHotmartOrderId(payload: any): string | null {
  const data = payload?.data;
  const purchase = data?.purchase;
  
  if (!purchase) return null;
  
  // Rule 1: Order Bump - always use parent
  if (purchase.order_bump?.is_order_bump && purchase.order_bump?.parent_purchase_transaction) {
    console.log(`[OrderId] Order bump detected, using parent: ${purchase.order_bump.parent_purchase_transaction}`);
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  // Rule 2: Upsell/Downsell detection via offer name or tracking
  const offerName = purchase.offer?.name?.toLowerCase() || '';
  const isUpsell = offerName.includes('upsell');
  const isDownsell = offerName.includes('downsell');
  
  if ((isUpsell || isDownsell) && purchase.order_bump?.parent_purchase_transaction) {
    console.log(`[OrderId] ${isUpsell ? 'Upsell' : 'Downsell'} detected, using parent: ${purchase.order_bump.parent_purchase_transaction}`);
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  // Rule 3: Check for any parent_purchase_transaction (generic fallback)
  // Some variations of Hotmart payload may have parent in different places
  if (purchase.parent_purchase_transaction) {
    console.log(`[OrderId] Parent transaction found: ${purchase.parent_purchase_transaction}`);
    return purchase.parent_purchase_transaction;
  }
  
  // Rule 4: Main product - use own transaction
  if (purchase.transaction) {
    console.log(`[OrderId] Main product, using transaction: ${purchase.transaction}`);
    return purchase.transaction;
  }
  
  // Fallback to order.id (Hotmart V3 structure)
  if (data?.order?.id) {
    return String(data.order.id);
  }
  
  // Last fallback
  if (purchase.code) {
    return purchase.code;
  }
  
  return null;
}

/**
 * Get the original transaction ID (for mapping purposes)
 * This is always the individual transaction, not the parent
 */
function getOriginalTransactionId(payload: any): string | null {
  const purchase = payload?.data?.purchase;
  return purchase?.transaction || purchase?.code || null;
}

/**
 * Determine item type from Hotmart payload
 */
function resolveItemType(payload: any): string {
  const purchase = payload?.data?.purchase;
  
  // Order bump detection
  if (purchase?.order_bump?.is_order_bump) {
    return 'bump';
  }
  
  // Upsell/Downsell detection (via tracking or offer metadata)
  const offerName = purchase?.offer?.name?.toLowerCase() || '';
  if (offerName.includes('upsell')) return 'upsell';
  if (offerName.includes('downsell')) return 'downsell';
  
  // Default to main product
  return 'main';
}

/**
 * Extract all products from payload (main + combo items)
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
  
  // TODO: Handle combo products when Hotmart provides array of products
  // Hotmart currently sends one product per webhook for combos
  
  return items;
}

/**
 * Write order to Orders Core (shadow mode)
 * UPSERT with ACCUMULATION: when a bump/upsell arrives, we ADD values, not replace
 */
async function writeOrderShadow(
  supabase: any,
  projectId: string,
  hotmartEvent: string,
  payload: any,
  totalPriceBrl: number | null,
  ownerNetRevenue: number | null,
  contactId: string | null
): Promise<{ orderId: string | null; itemsCreated: number; eventsCreated: number }> {
  const result = { orderId: null as string | null, itemsCreated: 0, eventsCreated: 0 };
  
  try {
    const data = payload?.data;
    const purchase = data?.purchase;
    const buyer = data?.buyer;
    const commissions = data?.commissions || [];
    
    const providerOrderId = resolveHotmartOrderId(payload);
    const originalTransactionId = getOriginalTransactionId(payload);
    
    if (!providerOrderId) {
      console.log('[OrdersShadow] No order ID resolved, skipping');
      return result;
    }
    
    const transactionId = originalTransactionId; // For ledger events and mapping
    const currency = purchase?.price?.currency_value || 'BRL';
    const status = hotmartToOrderStatus[hotmartEvent] || 'pending';
    
    // ============================================
    // EXTRACT UTMs FROM SCK (MATERIALIZED IN ORDERS)
    // ============================================
    const rawSck = purchase?.origin?.sck 
      || purchase?.checkout_origin 
      || purchase?.tracking?.source_sck 
      || purchase?.tracking?.source 
      || null;
    const parsedUTMs = parseSCKtoUTMs(rawSck);
    
    console.log(`[OrdersShadow] UTM extraction: source=${parsedUTMs.utm_source}, campaign=${parsedUTMs.utm_campaign}, adset=${parsedUTMs.utm_medium}`);
    
    // Calculate values from THIS webhook event only
    const orderItems = extractOrderItems(payload);
    const thisEventGrossBase = orderItems.reduce((sum, item) => sum + (item.base_price || 0), 0);
    const thisEventCustomerPaid = totalPriceBrl || 0;
    const thisEventProducerNet = ownerNetRevenue || 0;
    
    // Parse dates
    const orderedAt = purchase?.order_date 
      ? new Date(purchase.order_date).toISOString()
      : new Date(payload.creation_date).toISOString();
    
    const approvedAt = purchase?.approved_date
      ? new Date(purchase.approved_date).toISOString()
      : null;
    
    // ============================================
    // 1. UPSERT ORDER (with accumulation)
    // ============================================
    
    // Check if order exists and get current values
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, customer_paid, gross_base, producer_net')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .eq('provider_order_id', providerOrderId)
      .maybeSingle();
    
    let orderId: string;
    
    if (existingOrder) {
      // Check if this item was already added (avoid double counting on retries)
      const { data: existingItem } = await supabase
        .from('order_items')
        .select('id')
        .eq('order_id', existingOrder.id)
        .eq('provider_product_id', orderItems[0]?.provider_product_id || 'unknown')
        .maybeSingle();
      
      if (!existingItem) {
        // ACCUMULATE values - this is a new item for existing order
        const newCustomerPaid = (existingOrder.customer_paid || 0) + thisEventCustomerPaid;
        const newGrossBase = (existingOrder.gross_base || 0) + thisEventGrossBase;
        const newProducerNet = (existingOrder.producer_net || 0) + thisEventProducerNet;
        
        console.log(`[OrdersShadow] Accumulating: ${existingOrder.customer_paid} + ${thisEventCustomerPaid} = ${newCustomerPaid}`);
        
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status,
            customer_paid: newCustomerPaid,
            gross_base: newGrossBase,
            producer_net: newProducerNet,
            approved_at: approvedAt || existingOrder.approved_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingOrder.id);
        
        if (updateError) {
          console.error('[OrdersShadow] Error updating order:', updateError);
          return result;
        }
      } else {
        console.log(`[OrdersShadow] Item already exists, skipping accumulation`);
      }
      
      orderId = existingOrder.id;
      console.log(`[OrdersShadow] Updated order: ${orderId}`);
    } else {
      // Insert new order with initial values INCLUDING MATERIALIZED UTMs
      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          project_id: projectId,
          provider: 'hotmart',
          provider_order_id: providerOrderId,
          buyer_email: buyer?.email?.toLowerCase() || null,
          buyer_name: buyer?.name || null,
          contact_id: contactId,
          status,
          currency,
          customer_paid: thisEventCustomerPaid,
          gross_base: thisEventGrossBase || thisEventCustomerPaid,
          producer_net: thisEventProducerNet,
          ordered_at: orderedAt,
          approved_at: approvedAt,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          raw_payload: payload,
          // MATERIALIZED UTMs (PROMPT 9) - no runtime parsing allowed
          utm_source: parsedUTMs.utm_source,
          utm_campaign: parsedUTMs.utm_campaign,
          utm_adset: parsedUTMs.utm_medium,       // utm_medium = adset in SCK format
          utm_placement: parsedUTMs.utm_term,     // utm_term = placement in SCK format
          utm_creative: parsedUTMs.utm_content,   // utm_content = creative in SCK format
          raw_sck: rawSck,
          meta_campaign_id: parsedUTMs.meta_campaign_id,
          meta_adset_id: parsedUTMs.meta_adset_id,
          meta_ad_id: parsedUTMs.meta_ad_id,
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('[OrdersShadow] Error inserting order:', insertError);
        return result;
      }
      
      orderId = newOrder.id;
      console.log(`[OrdersShadow] Created order: ${orderId}`);
    }
    
    result.orderId = orderId;
    
    // ============================================
    // 2. CREATE ORDER ITEMS (if new order)
    // ============================================
    if (!existingOrder) {
      for (const item of orderItems) {
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
          result.itemsCreated++;
          console.log(`[OrdersShadow] Created item: ${item.product_name} (${item.item_type})`);
        }
      }
    }
    
    // ============================================
    // 3. CREATE LEDGER EVENTS
    // ============================================
    const occurredAt = orderedAt;
    const isDebit = debitEvents.includes(hotmartEvent);
    
    for (const comm of commissions) {
      const source = (comm.source || '').toUpperCase();
      let value = comm.value ?? 0;
      
      if (value === 0) continue;
      
      // For refunds/chargebacks, amounts should be NEGATIVE
      if (isDebit) {
        value = -Math.abs(value);
      }
      
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
      
      // Check if event already exists
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
            currency,
            provider_event_id: `${transactionId}_${eventType}_${actor}`,
            occurred_at: occurredAt,
            raw_payload: comm,
          });
        
        if (!eventError) {
          result.eventsCreated++;
          console.log(`[OrdersShadow] Created ledger event: ${eventType} (${actor}): ${value}`);
        }
      }
    }
    
    // ============================================
    // 4. AUTO-ADD COPRODUCER if calculated
    // ============================================
    const hasCoProduction = data?.product?.has_co_production === true;
    const hasCoproducerInCommissions = commissions.some((c: any) => (c.source || '').toUpperCase() === 'CO_PRODUCER');
    
    if (hasCoProduction && !hasCoproducerInCommissions && totalPriceBrl !== null && ownerNetRevenue !== null) {
      const platformFee = commissions.find((c: any) => (c.source || '').toUpperCase() === 'MARKETPLACE')?.value || 0;
      const affiliateAmount = commissions.find((c: any) => (c.source || '').toUpperCase() === 'AFFILIATE')?.value || 0;
      const calculatedCoproducerCost = totalPriceBrl - platformFee - affiliateAmount - ownerNetRevenue;
      
      if (calculatedCoproducerCost > 0) {
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
              amount: -calculatedCoproducerCost,
              currency,
              provider_event_id: `${transactionId}_coproducer_auto`,
              occurred_at: occurredAt,
              raw_payload: { source: 'auto_calculated', has_co_production: true },
            });
          
          if (!coproducerError) {
            result.eventsCreated++;
            console.log(`[OrdersShadow] Created auto-calculated coproducer: ${calculatedCoproducerCost}`);
          }
        }
      }
    }
    
    // ============================================
    // 5. FILL provider_order_map
    // ============================================
    if (transactionId) {
      await supabase
        .from('provider_order_map')
        .upsert({
          project_id: projectId,
          provider: 'hotmart',
          provider_transaction_id: transactionId,
          order_id: orderId,
        }, {
          onConflict: 'project_id,provider,provider_transaction_id',
        });
      
      console.log(`[OrdersShadow] Mapped transaction ${transactionId} -> order ${orderId}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('[OrdersShadow] Error:', error);
    return result;
  }
}

// Calculate economic_day from occurred_at in project timezone (default Brazil UTC-3)
function calculateEconomicDay(occurredAt: Date, timezone: string = 'America/Sao_Paulo'): string {
  // For Brazil timezone (UTC-3), we adjust the date
  // If the event occurred at 01:00 UTC, it's 22:00 previous day in Brazil
  const offsetHours = timezone === 'America/Sao_Paulo' ? -3 : 0;
  const adjustedDate = new Date(occurredAt.getTime() + offsetHours * 60 * 60 * 1000);
  return adjustedDate.toISOString().split('T')[0];
}

// ============================================
// SCK → UTM CONVERSION (Hotmart-Only)
// ============================================
// A Hotmart não trabalha com UTMs padrão.
// Ela usa SCK (Serial Checkout Key), que é um pacote de UTMs serializado por posição.
//
// No tráfego (Meta Ads, Google Ads, etc), o padrão Cubo Mágico é:
//   utm_source   = Meta-Ads
//   utm_medium   = {{adset.name}}_{{adset.id}}
//   utm_campaign = {{campaign.name}}_{{campaign.id}}
//   utm_term     = {{placement}}
//   utm_content  = {{ad.name}}_{{ad.id}}
//
// Na página de vendas, um script transforma isso em:
//   sck = utm_source | utm_medium | utm_campaign | utm_term | utm_content
//
// Este parser reverte o SCK de volta para UTMs padrão:
//   parts[0] → utm_source
//   parts[1] → utm_medium (ex: 00_ADVANTAGE_6845240173892)
//   parts[2] → utm_campaign (ex: PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292)
//   parts[3] → utm_term (ex: Instagram_Stories)
//   parts[4] → utm_content (ex: Teste—VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292)
//   parts[5+] → extra_params (ex: page_name)
// ============================================

interface ParsedUTMs {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  raw_checkout_origin: string | null;
  // Meta IDs extracted from names (suffix numbers)
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  // Extra params (page_name, etc.)
  extra_params: string | null;
}

/**
 * Convert Hotmart SCK (Serial Checkout Key) back to standard UTM parameters.
 * This is ONLY for Hotmart provider - other providers send UTMs directly.
 * 
 * @param checkoutOrigin The raw SCK string from Hotmart webhook (purchase.origin.sck)
 * @returns Parsed UTM parameters in Cubo Mágico standard format
 */
function parseSCKtoUTMs(checkoutOrigin: string | null): ParsedUTMs {
  const result: ParsedUTMs = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    raw_checkout_origin: checkoutOrigin, // Always store the raw value
    meta_campaign_id: null,
    meta_adset_id: null,
    meta_ad_id: null,
    extra_params: null,
  };
  
  if (!checkoutOrigin || checkoutOrigin.trim() === '') {
    return result;
  }
  
  const parts = checkoutOrigin.split('|').map(p => p.trim());
  
  // parts[0] = utm_source (ex: "Meta-Ads", "wpp", "google")
  // KEEP AS-IS - não normalizar para manter consistência com o tráfego original
  if (parts.length >= 1 && parts[0]) {
    result.utm_source = parts[0];
  }
  
  // parts[1] = utm_medium (ex: "00_ADVANTAGE_6845240173892")
  // Este é o adset.name_adset.id do Meta
  if (parts.length >= 2 && parts[1]) {
    result.utm_medium = parts[1];
    // Extract Meta adset ID from medium (numbers at end)
    const adsetIdMatch = parts[1].match(/_(\d{10,})$/);
    if (adsetIdMatch) {
      result.meta_adset_id = adsetIdMatch[1];
    }
  }
  
  // parts[2] = utm_campaign (ex: "PERPETUO_MAKEPRATICA13M_VENDA33_CBO_ANDROMEDA_6845240176292")
  // Este é o campaign.name_campaign.id do Meta
  if (parts.length >= 3 && parts[2]) {
    result.utm_campaign = parts[2];
    // Extract Meta campaign ID (numbers at end)
    const campaignIdMatch = parts[2].match(/_(\d{10,})$/);
    if (campaignIdMatch) {
      result.meta_campaign_id = campaignIdMatch[1];
    }
  }
  
  // parts[3] = utm_term (ex: "Instagram_Stories", "Facebook_Mobile_Feed")
  // Este é o placement do Meta
  if (parts.length >= 4 && parts[3]) {
    result.utm_term = parts[3];
  }
  
  // parts[4] = utm_content (ex: "Teste—VENDA_TRAFEGO_102_MAKE_13_MINUTOS_6858871344292")
  // Este é o ad.name_ad.id do Meta
  if (parts.length >= 5 && parts[4]) {
    result.utm_content = parts[4];
    // Extract Meta ad ID (numbers at end)
    const adIdMatch = parts[4].match(/_(\d{10,})$/);
    if (adIdMatch) {
      result.meta_ad_id = adIdMatch[1];
    }
  }
  
  // parts[5+] = extra_params (ex: "page_name=hm-make-pratica-2")
  if (parts.length >= 6) {
    result.extra_params = parts.slice(5).join('|');
  }
  
  return result;
}

// Alias for backwards compatibility
const parseCheckoutOriginToUTMs = parseSCKtoUTMs;

// Extract attribution data from tracking/UTM (for sales_core_events and finance_ledger)
function extractAttribution(purchase: any, checkoutOrigin: string | null): Record<string, any> {
  const tracking = purchase?.origin || {};
  const sck = tracking?.sck || checkoutOrigin || '';
  
  // Parse SCK into standard UTMs
  const parsedUTMs = parseSCKtoUTMs(sck);
  
  return {
    // Standard UTM fields - following Cubo Mágico convention
    utm_source: parsedUTMs.utm_source,     // ex: "Meta-Ads"
    utm_medium: parsedUTMs.utm_medium,     // ex: "00_ADVANTAGE_6845240173892" (adset)
    utm_campaign: parsedUTMs.utm_campaign, // ex: "PERPETUO_MAKEPRATICA13M..." (campaign)
    utm_term: parsedUTMs.utm_term,         // ex: "Instagram_Stories" (placement)
    utm_content: parsedUTMs.utm_content,   // ex: "Teste—VENDA_TRAFEGO..." (creative)
    // Meta IDs extracted from names
    meta_campaign_id: parsedUTMs.meta_campaign_id,
    meta_adset_id: parsedUTMs.meta_adset_id,
    meta_ad_id: parsedUTMs.meta_ad_id,
    // Raw checkout origin for debugging
    raw_checkout_origin: parsedUTMs.raw_checkout_origin,
    extra_params: parsedUTMs.extra_params,
    // Hotmart tracking fields
    src: tracking?.src || null,
    xcod: tracking?.xcod || null,
  };
}

// Write raw event to provider_event_log
async function logProviderEvent(
  supabase: any,
  projectId: string,
  providerEventId: string,
  rawPayload: any,
  status: 'processed' | 'ignored' | 'error' = 'processed'
): Promise<void> {
  try {
    await supabase.from('provider_event_log').insert({
      project_id: projectId,
      provider: 'hotmart',
      provider_event_id: providerEventId,
      received_at: new Date().toISOString(),
      raw_payload: rawPayload,
      status,
    });
  } catch (error) {
    console.error('[SalesCore] Error logging provider event:', error);
  }
}

// ============================================
// FINANCE LEDGER - Primary Financial Entry Point
// ============================================
interface LedgerEntry {
  project_id: string;
  provider: string;
  transaction_id: string;
  hotmart_sale_id: string | null;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  amount: number;
  currency: string;
  occurred_at: string;
  source_api: string;
  raw_payload: any;
  attribution: Record<string, any>; // PROMPT 6: Include UTM attribution in ledger
}

// Parse commissions from webhook to immutable ledger entries
function parseCommissionsToLedgerEntries(
  projectId: string,
  transactionId: string,
  commissions: any[],
  occurredAt: Date,
  hotmartEvent: string,
  affiliateData: any,
  producerData: any,
  rawPayload: any,
  attribution: Record<string, any> = {} // PROMPT 6: Add attribution parameter
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const occurredAtStr = occurredAt.toISOString();
  
  // Determine if this is a debit event (money going out)
  const isDebit = debitEvents.includes(hotmartEvent);

  for (const comm of commissions) {
    const source = (comm.source || '').toUpperCase();
    let value = comm.value ?? 0;
    
    if (value === 0) continue;

    // For refunds/chargebacks, amounts should be NEGATIVE to reverse the ledger
    if (isDebit) {
      value = -Math.abs(value);
    }

    let eventType: string;
    let actorType: string;
    let actorId: string | null = null;

    switch (source) {
      case 'MARKETPLACE':
        eventType = 'platform_fee';
        actorType = 'platform';
        actorId = 'hotmart';
        break;
      case 'PRODUCER':
        eventType = isDebit ? hotmartToLedgerEventType[hotmartEvent] || 'refund' : 'credit';
        actorType = 'producer';
        break;
      case 'CO_PRODUCER':
        eventType = 'coproducer';
        actorType = 'coproducer';
        actorId = producerData?.name || null;
        break;
      case 'AFFILIATE':
        eventType = 'affiliate';
        actorType = 'affiliate';
        actorId = affiliateData?.affiliate_code || affiliateData?.name || null;
        break;
      default:
        console.log(`[FinanceLedger] Unknown commission source: ${source}`);
        continue;
    }

    entries.push({
      project_id: projectId,
      provider: 'hotmart',
      transaction_id: transactionId,
      hotmart_sale_id: transactionId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId,
      amount: value,
      currency: comm.currency_code || comm.currency_value || 'BRL',
      occurred_at: occurredAtStr,
      source_api: 'webhook',
      raw_payload: comm,
      attribution, // PROMPT 6: Include UTM attribution in each ledger entry
    });
  }

  return entries;
}

// Write entries to finance_ledger (immutable, append-only)
async function writeFinanceLedgerEntries(
  supabase: any,
  entries: LedgerEntry[]
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;

  for (const entry of entries) {
    try {
      // Attempt insert - unique constraint will prevent duplicates
      const { error } = await supabase
        .from('finance_ledger')
        .insert(entry);

      if (error) {
        if (error.code === '23505') {
          // Duplicate - already exists, this is expected for webhook retries
          console.log(`[FinanceLedger] Entry already exists for ${entry.transaction_id}/${entry.event_type}/${entry.actor_type}`);
          skipped++;
        } else {
          console.error('[FinanceLedger] Error inserting entry:', error);
        }
      } else {
        written++;
        console.log(`[FinanceLedger] Wrote ${entry.event_type} for ${entry.actor_type}: ${entry.amount}`);
      }
    } catch (err) {
      console.error('[FinanceLedger] Exception inserting entry:', err);
    }
  }

  return { written, skipped };
}

// Lookup previous transaction values for inheritance (refunds without commissions)
async function lookupPreviousTransactionValues(
  supabase: any,
  projectId: string,
  transactionId: string
): Promise<{ producerAmount: number | null; platformFee: number | null; affiliateAmount: number | null; coproducerAmount: number | null }> {
  try {
    const { data } = await supabase
      .from('finance_ledger')
      .select('event_type, actor_type, amount')
      .eq('project_id', projectId)
      .eq('transaction_id', transactionId)
      .eq('provider', 'hotmart');

    if (!data || data.length === 0) {
      return { producerAmount: null, platformFee: null, affiliateAmount: null, coproducerAmount: null };
    }

    let producerAmount: number | null = null;
    let platformFee: number | null = null;
    let affiliateAmount: number | null = null;
    let coproducerAmount: number | null = null;

    for (const entry of data) {
      if (entry.actor_type === 'producer' && entry.event_type === 'credit') {
        producerAmount = Math.abs(entry.amount);
      } else if (entry.actor_type === 'platform') {
        platformFee = Math.abs(entry.amount);
      } else if (entry.actor_type === 'affiliate') {
        affiliateAmount = Math.abs(entry.amount);
      } else if (entry.actor_type === 'coproducer') {
        coproducerAmount = Math.abs(entry.amount);
      }
    }

    return { producerAmount, platformFee, affiliateAmount, coproducerAmount };
  } catch (error) {
    console.error('[FinanceLedger] Error looking up previous values:', error);
    return { producerAmount: null, platformFee: null, affiliateAmount: null, coproducerAmount: null };
  }
}

// Financial breakdown for sales_core_events
interface FinancialBreakdown {
  platform_fee: number | null;
  affiliate_cost: number | null;
  coproducer_cost: number | null;
}

// Write canonical sale event to sales_core_events
async function writeSalesCoreEvent(
  supabase: any,
  projectId: string,
  hotmartEvent: string,
  transactionId: string,
  grossAmount: number | null,
  netAmount: number | null,
  currency: string,
  occurredAt: Date,
  attribution: Record<string, any>,
  contactId: string | null,
  rawPayload: any,
  financialBreakdown?: FinancialBreakdown
): Promise<{ id: string; version: number } | null> {
  const canonicalEventType = hotmartToCanonicalEventType[hotmartEvent];
  
  if (!canonicalEventType) {
    console.log(`[SalesCore] Event ${hotmartEvent} not mapped to canonical type, skipping`);
    return null;
  }
  
  const providerEventId = `hotmart_${transactionId}_${hotmartEvent}`;
  const economicDay = calculateEconomicDay(occurredAt);
  const receivedAt = new Date().toISOString();
  
  try {
    // Check if event already exists (for versioning)
    const { data: existing } = await supabase
      .from('sales_core_events')
      .select('id, version, gross_amount, net_amount, is_active')
      .eq('project_id', projectId)
      .eq('provider_event_id', providerEventId)
      .eq('is_active', true)
      .maybeSingle();
    
    let version = 1;
    
    if (existing) {
      // Check if values changed - if so, create new version
      const hasChanges = 
        existing.gross_amount !== grossAmount ||
        existing.net_amount !== netAmount;
      
      if (hasChanges) {
        // Mark old version as inactive
        await supabase
          .from('sales_core_events')
          .update({ is_active: false })
          .eq('id', existing.id);
        
        version = existing.version + 1;
        console.log(`[SalesCore] Creating version ${version} for ${providerEventId}`);
      } else {
        // No changes, skip insert
        console.log(`[SalesCore] Event ${providerEventId} unchanged, skipping`);
        return { id: existing.id, version: existing.version };
      }
    }
    
    // Insert new canonical event with financial breakdown
    const { data, error } = await supabase
      .from('sales_core_events')
      .insert({
        project_id: projectId,
        provider: 'hotmart',
        provider_event_id: providerEventId,
        event_type: canonicalEventType,
        gross_amount: grossAmount,
        net_amount: netAmount,
        // NEW: Financial breakdown columns
        platform_fee: financialBreakdown?.platform_fee ?? 0,
        affiliate_cost: financialBreakdown?.affiliate_cost ?? 0,
        coproducer_cost: financialBreakdown?.coproducer_cost ?? 0,
        currency,
        occurred_at: occurredAt.toISOString(),
        received_at: receivedAt,
        economic_day: economicDay,
        attribution,
        contact_id: contactId,
        raw_payload: rawPayload,
        version,
        is_active: true,
      })
      .select('id, version')
      .single();
    
    if (error) {
      console.error('[SalesCore] Error inserting canonical event:', error);
      return null;
    }
    
    console.log(`[SalesCore] Created canonical event: ${canonicalEventType} v${version} for ${transactionId} (platform_fee=${financialBreakdown?.platform_fee}, affiliate=${financialBreakdown?.affiliate_cost}, coproducer=${financialBreakdown?.coproducer_cost})`);
    return data;
    
  } catch (error) {
    console.error('[SalesCore] Exception writing canonical event:', error);
    return null;
  }
}

// Find or lookup CRM contact by email/phone
async function findContactId(
  supabase: any,
  projectId: string,
  email: string | null,
  phone: string | null
): Promise<string | null> {
  if (!email && !phone) return null;
  
  try {
    let query = supabase
      .from('crm_contacts')
      .select('id')
      .eq('project_id', projectId);
    
    if (email) {
      query = query.eq('email', email.toLowerCase());
    } else if (phone) {
      query = query.eq('phone', phone);
    }
    
    const { data } = await query.maybeSingle();
    return data?.id || null;
  } catch (error) {
    console.error('[SalesCore] Error finding contact:', error);
    return null;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hotmart-hottok',
};

interface HotmartWebhookPayload {
  id: string;
  creation_date: number;
  event: string;
  version: string;
  data: {
    product?: {
      id?: number;
      ucode?: string;
      name?: string;
      has_co_production?: boolean;
    };
    affiliates?: Array<{
      affiliate_code?: string;
      name?: string;
    }>;
    buyer?: {
      email?: string;
      name?: string;
      first_name?: string;
      last_name?: string;
      checkout_phone?: string;
      checkout_phone_code?: string;
      document?: string;
      document_type?: string;
      address?: {
        country?: string;
        country_iso?: string;
        state?: string;
        city?: string;
        neighborhood?: string;
        zipcode?: string;
        street?: string;
        number?: string;
        complement?: string;
      };
    };
    producer?: {
      name?: string;
      document?: string;
      legal_nature?: string;
    };
    commissions?: Array<{
      value?: number;
      currency_value?: string;
      source?: string;
    }>;
    purchase?: {
      approved_date?: number;
      full_price?: {
        value?: number;
        currency_value?: string;
      };
      original_offer_price?: {
        value?: number;
        currency_value?: string;
      };
      price?: {
        value?: number;
        currency_value?: string;
      };
      offer?: {
        code?: string;
        coupon_code?: string;
        name?: string;
        description?: string;
      };
      origin?: {
        src?: string;
        sck?: string;
        xcod?: string;
      };
      checkout_country?: {
        name?: string;
        iso?: string;
      };
      order_bump?: {
        is_order_bump?: boolean;
        parent_purchase_transaction?: string;
      };
      order_date?: string;
      status?: string;
      transaction?: string;
      payment?: {
        type?: string;
        installments_number?: number;
        refusal_reason?: string;
        billet_barcode?: string;
        billet_url?: string;
        pix_code?: string;
        pix_qrcode?: string;
        pix_expiration_date?: number;
      };
      recurrence_number?: number;
    };
    subscription?: {
      status?: string;
      plan?: {
        id?: number;
        name?: string;
      };
      subscriber?: {
        code?: string;
      };
    };
  };
}

// Map all Hotmart events to internal status
const eventStatusMap: Record<string, string> = {
  'PURCHASE_APPROVED': 'APPROVED',
  'PURCHASE_COMPLETE': 'COMPLETE',
  'PURCHASE_CANCELED': 'CANCELLED',
  'PURCHASE_BILLET_PRINTED': 'PRINTED_BILLET',
  'PURCHASE_PROTEST': 'PROTESTED',
  'PURCHASE_REFUNDED': 'REFUNDED',
  'PURCHASE_CHARGEBACK': 'CHARGEBACK',
  'PURCHASE_EXPIRED': 'EXPIRED',
  'PURCHASE_DELAYED': 'DELAYED',
  'PURCHASE_OUT_OF_SHOPPING_CART': 'ABANDONED',
  'PURCHASE_RECURRENCE_CANCELLATION': 'SUBSCRIPTION_CANCELLED',
  'SWITCH_PLAN': 'PLAN_CHANGED',
  'UPDATE_SUBSCRIPTION_CHARGE_DATE': 'CHARGE_DATE_UPDATED',
  'CLUB_FIRST_ACCESS': 'FIRST_ACCESS',
  'CLUB_MODULE_COMPLETED': 'MODULE_COMPLETED',
};

// Events that should create/update sales records
const saleEvents = [
  'PURCHASE_APPROVED',
  'PURCHASE_COMPLETE',
  'PURCHASE_CANCELED',
  'PURCHASE_BILLET_PRINTED',
  'PURCHASE_PROTEST',
  'PURCHASE_REFUNDED',
  'PURCHASE_CHARGEBACK',
  'PURCHASE_EXPIRED',
  'PURCHASE_DELAYED',
  'PURCHASE_OUT_OF_SHOPPING_CART',
  'PURCHASE_RECURRENCE_CANCELLATION',
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract project_id from URL path: /hotmart-webhook/:project_id
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // The project_id should be the last part of the path
    // URL format: /hotmart-webhook/PROJECT_ID
    let projectId: string | null = null;
    
    if (pathParts.length >= 2) {
      projectId = pathParts[pathParts.length - 1];
    }
    
    // Validate project_id format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!projectId || !uuidRegex.test(projectId)) {
      console.error('Invalid or missing project_id in URL:', url.pathname);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid webhook URL. Project ID is required.',
        hint: 'URL format should be: /hotmart-webhook/YOUR_PROJECT_ID'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get hottok from header for additional validation (optional)
    const hottok = req.headers.get('x-hotmart-hottok');
    
    // Parse the webhook payload
    const payload: HotmartWebhookPayload = await req.json();
    
    console.log('=== HOTMART WEBHOOK RECEIVED ===');
    console.log('Project ID:', projectId);
    console.log('Event:', payload.event);
    console.log('Transaction:', payload.data?.purchase?.transaction);
    console.log('Hottok present:', !!hottok);
    console.log('Webhook version:', payload.version);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Validate project exists and has Hotmart configured
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      console.error('Project not found:', projectId);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Project not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Project validated:', project.name);
    
    // Update last webhook received timestamp in project_credentials
    await supabase
      .from('project_credentials')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');
    
    // Extract data from payload
    const { data, event } = payload;
    const buyer = data?.buyer;
    const purchase = data?.purchase;
    const product = data?.product;
    const affiliates = data?.affiliates;
    const subscription = data?.subscription;
    
    // Log buyer phone data for debugging
    if (buyer) {
      console.log('=== BUYER DATA ===');
      console.log('Email:', buyer.email);
      console.log('Name:', buyer.name);
      console.log('checkout_phone:', buyer.checkout_phone);
      console.log('checkout_phone_code:', buyer.checkout_phone_code);
    }
    
    // Get status from event
    const status = eventStatusMap[event] || purchase?.status || 'UNKNOWN';
    
    // Check if this is a sale event that should be recorded
    if (!saleEvents.includes(event)) {
      console.log(`Event ${event} is not a sale event, skipping sale record creation`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Event ${event} received but not a sale event`,
        project: project.name
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // For abandoned carts, we might not have a transaction ID
    const transactionId = purchase?.transaction || `abandoned_${payload.id}`;
    
    // Parse phone data from webhook
    let buyerPhone: string | null = null;
    let buyerPhoneDDD: string | null = null;
    let buyerPhoneCountryCode: string | null = null;
    
    if (buyer?.checkout_phone) {
      const fullPhone = buyer.checkout_phone;
      const ddd = buyer.checkout_phone_code;
      
      console.log('Processing phone:', { fullPhone, ddd });
      
      if (ddd) {
        // Brazilian buyer: checkout_phone_code has DDD, checkout_phone has the number
        buyerPhoneDDD = ddd;
        buyerPhone = fullPhone;
        buyerPhoneCountryCode = '55'; // Brazil
      } else {
        // International buyer: checkout_phone includes area code
        const cleanPhone = fullPhone.replace(/\D/g, '');
        
        // Check for common country codes
        if (cleanPhone.startsWith('55') && cleanPhone.length >= 12) {
          buyerPhoneCountryCode = '55';
          buyerPhoneDDD = cleanPhone.substring(2, 4);
          buyerPhone = cleanPhone.substring(4);
        } else if (cleanPhone.startsWith('1') && cleanPhone.length >= 11) {
          buyerPhoneCountryCode = '1';
          buyerPhoneDDD = cleanPhone.substring(1, 4);
          buyerPhone = cleanPhone.substring(4);
        } else if (cleanPhone.startsWith('351') && cleanPhone.length >= 12) {
          buyerPhoneCountryCode = '351';
          buyerPhone = cleanPhone.substring(3);
        } else {
          buyerPhone = cleanPhone;
          
          // Try to detect country from checkout_country
          const countryIso = data?.purchase?.checkout_country?.iso;
          if (countryIso === 'BR') {
            buyerPhoneCountryCode = '55';
            if (cleanPhone.length >= 10) {
              buyerPhoneDDD = cleanPhone.substring(0, 2);
              buyerPhone = cleanPhone.substring(2);
            }
          } else if (countryIso === 'PT') {
            buyerPhoneCountryCode = '351';
          } else if (countryIso === 'US' || countryIso === 'CA') {
            buyerPhoneCountryCode = '1';
          } else if (countryIso === 'ES') {
            buyerPhoneCountryCode = '34';
          } else if (countryIso === 'AR') {
            buyerPhoneCountryCode = '54';
          } else if (countryIso === 'MX') {
            buyerPhoneCountryCode = '52';
          }
        }
      }
      
      console.log('Parsed phone:', { buyerPhoneCountryCode, buyerPhoneDDD, buyerPhone });
    }
    
    // ============================================
    // PARSE CHECKOUT ORIGIN INTO UTMs
    // ============================================
    // Using the standardized parseCheckoutOriginToUTMs function
    const sck = purchase?.origin?.sck || null;
    const checkoutOrigin = sck;
    const parsedUTMs = parseCheckoutOriginToUTMs(sck);
    
    console.log('[UTM Parsing] checkout_origin:', sck);
    console.log('[UTM Parsing] Parsed UTMs:', JSON.stringify(parsedUTMs));
    
    // Extract parsed values for hotmart_sales columns
    // Following PROMPT 6 SCK→UTM mapping:
    // parts[0] → utm_source, parts[1] → utm_medium, parts[2] → utm_campaign,
    // parts[3] → utm_term, parts[4] → utm_content
    const utmSource = parsedUTMs.utm_source;
    const utmMedium = parsedUTMs.utm_medium;
    const utmCampaign = parsedUTMs.utm_campaign;
    const utmTerm = parsedUTMs.utm_term;
    const utmContent = parsedUTMs.utm_content;
    const rawCheckoutOrigin = parsedUTMs.raw_checkout_origin;
    const metaCampaignIdExtracted = parsedUTMs.meta_campaign_id;
    const metaAdsetIdExtracted = parsedUTMs.meta_adset_id;
    const metaAdIdExtracted = parsedUTMs.meta_ad_id;
    
    // Prepare sale data
    const saleDate = purchase?.order_date 
      ? new Date(purchase.order_date).toISOString()
      : new Date(payload.creation_date).toISOString();
    
    const confirmationDate = purchase?.approved_date
      ? new Date(purchase.approved_date).toISOString()
      : null;
    
    const affiliate = affiliates?.[0];
    const commissions = data?.commissions;
    
    // Get currency from price object - check both currency_value (webhook) and currency_code (API) for compatibility
    const currencyCode = purchase?.price?.currency_value || (purchase?.price as any)?.currency_code || 
                         purchase?.full_price?.currency_value || (purchase?.full_price as any)?.currency_code || 'BRL';
    const totalPrice = purchase?.price?.value || null;
    console.log(`Currency detected: ${currencyCode}, Total price: ${totalPrice}`);
    
    // STANDARDIZED exchange rates - MUST match API rates exactly
    // Using fixed rates to ensure consistency between webhook and API
    const exchangeRates: Record<string, number> = {
      'BRL': 1,
      'USD': 5.50,
      'EUR': 6.00,
      'GBP': 7.00,
      'PYG': 0.00075,
      'UYU': 0.14,
      'AUD': 3.60,
      'CHF': 6.20,
      'CAD': 4.00,
      'MXN': 0.28,
      'ARS': 0.005,
      'CLP': 0.006,
      'COP': 0.0013,
      'PEN': 1.45,
      'JPY': 0.037,
      'BOB': 0.79,
      'VES': 0.15,
    };
    
    // Calculate total_price_brl with proper conversion (matching API logic)
    let totalPriceBrl: number | null = null;
    let exchangeRateUsed: number | null = null;
    
    if (totalPrice !== null) {
      if (currencyCode === 'BRL') {
        // For BRL, use full_price if available (includes fees), otherwise use price
        totalPriceBrl = purchase?.full_price?.value || totalPrice;
      } else {
        // For other currencies, convert to BRL
        const rate = exchangeRates[currencyCode] || 1;
        totalPriceBrl = totalPrice * rate;
        exchangeRateUsed = rate;
        console.log(`Currency conversion: ${totalPrice} ${currencyCode} -> ${totalPriceBrl} BRL (rate: ${rate})`);
      }
    }
    
    // ============================================
    // CORRECT FINANCIAL MAPPING from commissions:
    // - MARKETPLACE = Platform fee (taxa Hotmart) - NOT the net!
    // - PRODUCER = Owner's net revenue ("Você recebeu")
    // - CO_PRODUCER = Coproducer commission
    // - AFFILIATE = Affiliate commission
    // ============================================
    let platformFee: number | null = null;
    let ownerNetRevenue: number | null = null;
    let coproducerAmount: number | null = null;
    let affiliateAmount: number | null = null;
    
    if (commissions && Array.isArray(commissions)) {
      for (const comm of commissions) {
        const source = (comm.source || '').toUpperCase();
        const value = comm.value ?? null;
        
        switch (source) {
          case 'MARKETPLACE':
            platformFee = value;
            break;
          case 'PRODUCER':
            ownerNetRevenue = value;
            break;
          case 'CO_PRODUCER':
            coproducerAmount = value;
            break;
          case 'AFFILIATE':
            affiliateAmount = value;
            break;
        }
      }
    }
    
    // ============================================
    // AUTO-CALCULATE COPRODUCER COST when:
    // 1. product.has_co_production = true
    // 2. CO_PRODUCER is NOT in commissions array
    // Formula: coproducer_cost = gross - platform_fee - affiliate - net
    // ============================================
    const hasCoProduction = product?.has_co_production === true;
    const hasCoproducerInCommissions = coproducerAmount !== null && coproducerAmount > 0;
    
    if (hasCoProduction && !hasCoproducerInCommissions && totalPriceBrl !== null && ownerNetRevenue !== null) {
      const calculatedCoproducerCost = totalPriceBrl - (platformFee || 0) - (affiliateAmount || 0) - ownerNetRevenue;
      
      if (calculatedCoproducerCost > 0) {
        coproducerAmount = Math.round(calculatedCoproducerCost * 100) / 100; // Round to 2 decimal places
        console.log(`[Financial Mapping] AUTO-CALCULATED coproducer_cost: ${coproducerAmount}`);
        console.log(`  Formula: ${totalPriceBrl} - ${platformFee || 0} - ${affiliateAmount || 0} - ${ownerNetRevenue} = ${coproducerAmount}`);
      }
    }
    
    console.log('[Financial Mapping] Extracted from commissions:');
    console.log(`  - Platform Fee (MARKETPLACE): ${platformFee}`);
    console.log(`  - Owner Net (PRODUCER): ${ownerNetRevenue}`);
    console.log(`  - Coproducer: ${coproducerAmount}${hasCoProduction && !hasCoproducerInCommissions ? ' (auto-calculated)' : ''}`);
    console.log(`  - Affiliate: ${affiliateAmount}`);
    console.log(`  - has_co_production: ${hasCoProduction}`);
    
    // DEPRECATED: Old incorrect logic was using commissions[0] as net
    // const netRevenue = commissions?.[0]?.value || null; // WRONG!
    // CORRECT: Use PRODUCER commission as net_revenue (owner's money)
    
    const saleData = {
      project_id: projectId,
      transaction_id: transactionId,
      product_code: product?.id?.toString() || null,
      product_name: product?.name || 'Unknown Product',
      offer_code: purchase?.offer?.code || null,
      product_price: purchase?.original_offer_price?.value || null,
      offer_price: purchase?.price?.value || null,
      offer_currency: currencyCode,
      total_price: totalPrice,
      total_price_brl: totalPriceBrl,
      exchange_rate_used: exchangeRateUsed,
      net_revenue: ownerNetRevenue, // CORRECT: PRODUCER commission = "Você recebeu"
      // ============================================
      // FINANCIAL BREAKDOWN - persisted at ingestion
      // ============================================
      gross_amount: totalPriceBrl,           // Valor pago pelo comprador (em BRL)
      platform_fee: platformFee,             // Taxa Hotmart (MARKETPLACE)
      affiliate_cost: affiliateAmount,       // Comissão afiliado (AFFILIATE)
      coproducer_cost: coproducerAmount,     // Comissão coprodutor (CO_PRODUCER)
      net_amount: ownerNetRevenue,           // Líquido do owner (PRODUCER)
      status,
      sale_date: saleDate,
      confirmation_date: confirmationDate,
      payment_method: purchase?.payment?.type || null,
      payment_type: purchase?.payment?.type || null,
      installment_number: purchase?.payment?.installments_number || 1,
      coupon: purchase?.offer?.coupon_code || null,
      recurrence: purchase?.recurrence_number || null,
      subscriber_code: subscription?.subscriber?.code || null,
      // Sale category based on event
      sale_category: event === 'PURCHASE_OUT_OF_SHOPPING_CART' ? 'abandoned_cart' : 'purchase',
      // Buyer data
      buyer_name: buyer?.name || null,
      buyer_email: buyer?.email || null,
      buyer_phone: buyerPhone,
      buyer_phone_ddd: buyerPhoneDDD,
      buyer_phone_country_code: buyerPhoneCountryCode,
      buyer_document: buyer?.document || null,
      buyer_address: buyer?.address?.street || null,
      buyer_address_number: buyer?.address?.number || null,
      buyer_address_complement: buyer?.address?.complement || null,
      buyer_neighborhood: buyer?.address?.neighborhood || null,
      buyer_city: buyer?.address?.city || null,
      buyer_state: buyer?.address?.state || null,
      buyer_country: buyer?.address?.country || purchase?.checkout_country?.name || null,
      buyer_cep: buyer?.address?.zipcode || null,
      // Affiliate
      affiliate_code: affiliate?.affiliate_code || null,
      affiliate_name: affiliate?.name || null,
      // UTM/Origin - PROMPT 6: SCK→UTM standard mapping
      // parts[0]=source, [1]=medium, [2]=campaign, [3]=term, [4]=content
      checkout_origin: rawCheckoutOrigin, // Store raw SCK for debugging
      utm_source: utmSource,              // ex: "Meta-Ads"
      utm_medium: utmMedium,              // ex: "00_ADVANTAGE_6845240173892"
      utm_campaign_id: utmCampaign,       // ex: "PERPETUO_MAKEPRATICA13M..."
      utm_adset_name: utmMedium,          // Same as utm_medium (adset name is in medium)
      utm_creative: utmContent,           // ex: "Teste—VENDA_TRAFEGO..."
      utm_placement: utmTerm,             // ex: "Instagram_Stories"
      // PROMPT 6: New standard UTM fields
      utm_term: utmTerm,                  // ex: "Instagram_Stories" (placement)
      utm_content: utmContent,            // ex: "Teste—VENDA_TRAFEGO..." (creative)
      raw_checkout_origin: rawCheckoutOrigin,
      meta_campaign_id_extracted: metaCampaignIdExtracted,
      meta_adset_id_extracted: metaAdsetIdExtracted,
      meta_ad_id_extracted: metaAdIdExtracted,
      // Metadata
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Check if sale already exists and INSERT or UPDATE accordingly
    console.log('=== PROCESSING SALE ===');
    console.log('Transaction ID:', transactionId);
    console.log('Project ID:', projectId);
    console.log('Status:', status);
    console.log('Email:', buyer?.email);
    
    // First check if the sale already exists
    const { data: existingSale, error: checkError } = await supabase
      .from('hotmart_sales')
      .select('id')
      .eq('project_id', projectId)
      .eq('transaction_id', transactionId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error checking existing sale:', checkError);
      throw checkError;
    }
    
    let upsertResult: { id: string } | null = null;
    
    if (existingSale) {
      // Update existing sale
      console.log('Updating existing sale:', existingSale.id);
      const { data: updateData, error: updateError } = await supabase
        .from('hotmart_sales')
        .update(saleData)
        .eq('id', existingSale.id)
        .select('id')
        .single();
      
      if (updateError) {
        console.error('Error updating sale:', updateError);
        console.error('Sale data that failed:', JSON.stringify(saleData, null, 2));
        throw updateError;
      }
      upsertResult = updateData;
    } else {
      // Insert new sale
      console.log('Inserting new sale');
      const { data: insertData, error: insertError } = await supabase
        .from('hotmart_sales')
        .insert(saleData)
        .select('id')
        .single();
      
      if (insertError) {
        // Handle unique constraint violation gracefully (concurrent request)
        if (insertError.code === '23505') {
          console.log(`Duplicate webhook for transaction ${transactionId}, ignoring`);
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Duplicate event, already processed',
            transaction: transactionId,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        console.error('Error inserting sale:', insertError);
        console.error('Sale data that failed:', JSON.stringify(saleData, null, 2));
        throw insertError;
      }
      upsertResult = insertData;
    }
    
    console.log('=== SALE UPSERTED SUCCESSFULLY ===');
    console.log('Sale ID:', upsertResult?.id);
    
    const operation = upsertResult ? 'upserted' : 'processed';
    console.log(`${operation} sale ${transactionId}`);
    
    // =====================================================
    // SALES CORE - Write canonical revenue event
    // =====================================================
    try {
      console.log('[SalesCore] Writing canonical revenue event...');
      
      // Log raw event to provider_event_log
      await logProviderEvent(supabase, projectId, `hotmart_${transactionId}_${event}`, payload);
      
      // Find contact for binding
      const contactId = await findContactId(supabase, projectId, buyer?.email || null, buyerPhone);
      
      // Extract attribution from purchase origin
      const attribution = extractAttribution(purchase, checkoutOrigin);
      
      // Parse occurred_at from Hotmart event
      const occurredAt = purchase?.order_date 
        ? new Date(purchase.order_date)
        : new Date(payload.creation_date);
      
      // Write canonical event with financial breakdown
      const financialBreakdown: FinancialBreakdown = {
        platform_fee: platformFee,
        affiliate_cost: affiliateAmount,
        coproducer_cost: coproducerAmount,
      };
      
      const coreEventResult = await writeSalesCoreEvent(
        supabase,
        projectId,
        event,
        transactionId,
        totalPriceBrl, // gross_amount (valor pago pelo comprador, converted to BRL)
        ownerNetRevenue, // CORRECT: net_amount = PRODUCER commission ("Você recebeu")
        'BRL', // Always store in BRL
        occurredAt,
        attribution,
        contactId,
        payload,
        financialBreakdown // NEW: Pass financial breakdown for fee columns
      );
      
      if (coreEventResult) {
        console.log(`[SalesCore] Canonical event created: id=${coreEventResult.id} version=${coreEventResult.version}`);
      }
    } catch (salesCoreError) {
      // Don't fail the webhook if Sales Core fails
      console.error('[SalesCore] Error writing canonical event:', salesCoreError);
    }
    
    // =====================================================
    // FINANCE LEDGER - Primary Financial Source (IMMUTABLE)
    // =====================================================
    // This is the CANONICAL source for all financial data.
    // The ledger is append-only and immutable.
    // Refunds and chargebacks are recorded as NEGATIVE amounts.
    // =====================================================
    let ledgerWritten = 0;
    let ledgerSkipped = 0;
    
    try {
      console.log('[FinanceLedger] Processing financial entries from webhook...');
      
      // Parse occurred_at from Hotmart event
      const occurredAt = purchase?.order_date 
        ? new Date(purchase.order_date)
        : new Date(payload.creation_date);
      
      // PROMPT 6: Extract attribution for ledger entries
      const ledgerAttribution = extractAttribution(purchase, rawCheckoutOrigin);
      
      // Only process events that have financial implications
      const financialEvents = [...creditEvents, ...debitEvents];
      
      if (financialEvents.includes(event)) {
        let commissionsToProcess = commissions || [];
        
        // For refunds/chargebacks WITHOUT commissions, inherit from original transaction
        if (debitEvents.includes(event) && (!commissionsToProcess || commissionsToProcess.length === 0)) {
          console.log(`[FinanceLedger] ${event} without commissions, looking up original values...`);
          
          const previousValues = await lookupPreviousTransactionValues(supabase, projectId, transactionId);
          
          if (previousValues.producerAmount !== null) {
            console.log(`[FinanceLedger] Found original producer amount: ${previousValues.producerAmount}`);
            
            // Create synthetic commissions array for the refund (use any[] to avoid type conflicts)
            const syntheticCommissions: any[] = [];
            
            if (previousValues.producerAmount) {
              syntheticCommissions.push({
                source: 'PRODUCER',
                value: previousValues.producerAmount,
                currency_value: 'BRL'
              });
            }
            if (previousValues.platformFee) {
              syntheticCommissions.push({
                source: 'MARKETPLACE',
                value: previousValues.platformFee,
                currency_value: 'BRL'
              });
            }
            if (previousValues.affiliateAmount) {
              syntheticCommissions.push({
                source: 'AFFILIATE',
                value: previousValues.affiliateAmount,
                currency_value: 'BRL'
              });
            }
            if (previousValues.coproducerAmount) {
              syntheticCommissions.push({
                source: 'CO_PRODUCER',
                value: previousValues.coproducerAmount,
                currency_value: 'BRL'
              });
            }
            
            commissionsToProcess = syntheticCommissions;
          } else {
            console.warn(`[FinanceLedger] No previous values found for ${transactionId}, refund will have zero amounts`);
          }
        }
        
        // ============================================
        // AUTO-ADD COPRODUCER to commissions when:
        // 1. product.has_co_production = true
        // 2. CO_PRODUCER is NOT in commissions array
        // 3. We calculated coproducerAmount above
        // ============================================
        const hasCoProduction = product?.has_co_production === true;
        const hasCoproducerInCommissions = commissionsToProcess.some((c: any) => (c.source || '').toUpperCase() === 'CO_PRODUCER');
        
        if (hasCoProduction && !hasCoproducerInCommissions && coproducerAmount && coproducerAmount > 0) {
          console.log(`[FinanceLedger] Adding synthetic CO_PRODUCER entry: ${coproducerAmount}`);
          commissionsToProcess.push({
            source: 'CO_PRODUCER',
            value: coproducerAmount,
            currency_value: 'BRL'
          });
        }
        
        if (commissionsToProcess && commissionsToProcess.length > 0) {
          const ledgerEntries = parseCommissionsToLedgerEntries(
            projectId,
            transactionId,
            commissionsToProcess,
            occurredAt,
            event,
            affiliate,
            data?.producer,
            payload,
            ledgerAttribution // PROMPT 6: Pass attribution to ledger entries
          );
          
          console.log(`[FinanceLedger] Generated ${ledgerEntries.length} ledger entries for ${event}`);
          
          if (ledgerEntries.length > 0) {
            const result = await writeFinanceLedgerEntries(supabase, ledgerEntries);
            ledgerWritten = result.written;
            ledgerSkipped = result.skipped;
            
            console.log(`[FinanceLedger] Written: ${ledgerWritten}, Skipped: ${ledgerSkipped}`);
          }
        } else {
          console.log(`[FinanceLedger] No commissions to process for ${event}`);
        }
      } else {
        console.log(`[FinanceLedger] Event ${event} is not a financial event, skipping ledger`);
      }
    } catch (ledgerError) {
      // Don't fail the webhook if ledger fails
      console.error('[FinanceLedger] Error processing ledger entries:', ledgerError);
    }
    
    // =====================================================
    // ORDERS CORE SHADOW MODE (PROMPT 2)
    // Duplicate data to new canonical structure
    // This runs in parallel, doesn't affect existing system
    // =====================================================
    let ordersShadowResult = { orderId: null as string | null, itemsCreated: 0, eventsCreated: 0 };
    
    try {
      console.log('[OrdersShadow] Writing to Orders Core (shadow mode)...');
      
      // Find contact for binding
      const contactId = await findContactId(supabase, projectId, buyer?.email || null, buyerPhone);
      
      ordersShadowResult = await writeOrderShadow(
        supabase,
        projectId,
        event,
        payload,
        totalPriceBrl,
        ownerNetRevenue,
        contactId
      );
      
      if (ordersShadowResult.orderId) {
        console.log(`[OrdersShadow] Success: order=${ordersShadowResult.orderId}, items=${ordersShadowResult.itemsCreated}, events=${ordersShadowResult.eventsCreated}`);
      }
    } catch (ordersShadowError) {
      // Don't fail the webhook if Orders Shadow fails
      console.error('[OrdersShadow] Error (non-blocking):', ordersShadowError);
    }
    
    // =====================================================
    // SUBSCRIPTION MANAGEMENT - Check if product is mapped to a plan
    // This is used for managing Cubo Mágico platform subscriptions
    // =====================================================
    let subscriptionCreated = false;
    let subscriptionAction: string | null = null;
    let newUserCreated = false;
    
    try {
      const productCode = product?.id?.toString();
      const offerCode = purchase?.offer?.code;
      const buyerEmail = buyer?.email;
      
      if (productCode && buyerEmail) {
        console.log('=== CHECKING SUBSCRIPTION MAPPING ===');
        console.log('Product code:', productCode);
        console.log('Offer code:', offerCode);
        console.log('Buyer email:', buyerEmail);
        
        // Check if this product is mapped to a plan
        // First try with offer_code, then without
        let planMapping = null;
        
        if (offerCode) {
          const { data: mappingWithOffer } = await supabase
            .from('hotmart_product_plans')
            .select('id, plan_id, plans(id, name, type, max_projects)')
            .eq('product_id', productCode)
            .eq('offer_code', offerCode)
            .eq('is_active', true)
            .single();
          
          planMapping = mappingWithOffer;
        }
        
        // If no mapping with offer_code, try without
        if (!planMapping) {
          const { data: mappingWithoutOffer } = await supabase
            .from('hotmart_product_plans')
            .select('id, plan_id, plans(id, name, type, max_projects)')
            .eq('product_id', productCode)
            .is('offer_code', null)
            .eq('is_active', true)
            .single();
          
          planMapping = mappingWithoutOffer;
        }
        
        if (planMapping) {
          console.log('=== PRODUCT MAPPED TO PLAN ===');
          const planName = (planMapping as any).plans?.name || 'Cubo Mágico';
          const planType = (planMapping as any).plans?.type || 'monthly';
          console.log('Plan:', planName);
          console.log('Plan ID:', planMapping.plan_id);
          
          // Find user by email
          let { data: userProfile } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', buyerEmail.toLowerCase())
            .single();
          
          // If user doesn't exist and this is an approved purchase, create the user
          if (!userProfile && (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE')) {
            console.log('=== CREATING NEW USER ===');
            console.log('Email:', buyerEmail);
            console.log('Name:', buyer?.name);
            
            try {
              // Generate a random secure password (user will reset it via email)
              const randomPassword = crypto.randomUUID() + crypto.randomUUID();
              
              // Create user in auth.users
              const { data: newUser, error: createUserError } = await supabase.auth.admin.createUser({
                email: buyerEmail.toLowerCase(),
                password: randomPassword,
                email_confirm: true, // Auto-confirm email since they bought
                user_metadata: {
                  full_name: buyer?.name || 'Cliente Hotmart',
                  source: 'hotmart',
                  transaction_id: transactionId
                }
              });
              
              if (createUserError) {
                console.error('Error creating user:', createUserError);
                
                // Check if user already exists in auth but not in profiles
                if (createUserError.message?.includes('already exists') || createUserError.message?.includes('already been registered')) {
                  console.log('User already exists in auth, trying to find profile...');
                  
                  // Try to get user from auth by email
                  const { data: existingUsers } = await supabase.auth.admin.listUsers();
                  const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === buyerEmail.toLowerCase());
                  
                  if (existingUser) {
                    // Check if profile exists
                    const { data: existingProfile } = await supabase
                      .from('profiles')
                      .select('id, email')
                      .eq('id', existingUser.id)
                      .single();
                    
                    if (existingProfile) {
                      userProfile = existingProfile;
                      console.log('Found existing profile:', userProfile.id);
                    } else {
                      // Create profile for existing auth user
                      const { data: createdProfile, error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                          id: existingUser.id,
                          email: buyerEmail.toLowerCase(),
                          full_name: buyer?.name || 'Cliente Hotmart',
                          is_active: true,
                          can_create_projects: true,
                          max_projects: 0
                        })
                        .select('id, email')
                        .single();
                      
                      if (profileError) {
                        console.error('Error creating profile for existing user:', profileError);
                      } else {
                        userProfile = createdProfile;
                        console.log('Created profile for existing auth user:', userProfile?.id);
                      }
                    }
                  }
                }
              } else if (newUser?.user) {
                console.log('User created successfully:', newUser.user.id);
                newUserCreated = true;
                
                // Wait a bit for the trigger to create the profile
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Fetch the profile that should have been created by trigger
                const { data: createdProfile } = await supabase
                  .from('profiles')
                  .select('id, email')
                  .eq('id', newUser.user.id)
                  .single();
                
                if (createdProfile) {
                  userProfile = createdProfile;
                  console.log('Profile found after user creation:', userProfile.id);
                } else {
                  // If trigger didn't create profile, create it manually
                  console.log('Profile not found after trigger, creating manually...');
                  
                  const { data: manualProfile, error: manualProfileError } = await supabase
                    .from('profiles')
                    .insert({
                      id: newUser.user.id,
                      email: buyerEmail.toLowerCase(),
                      full_name: buyer?.name || 'Cliente Hotmart',
                      is_active: true,
                      can_create_projects: true,
                      max_projects: 0,
                      signup_source: 'hotmart',
                      account_activated: false
                    })
                    .select('id, email')
                    .single();
                  
                  if (manualProfileError) {
                    console.error('Error creating profile manually:', manualProfileError);
                  } else {
                    userProfile = manualProfile;
                    console.log('Profile created manually:', userProfile?.id);
                  }
                }
                
                // Send welcome email with password reset link
                try {
                  console.log('Sending welcome email...');
                  const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                    body: {
                      email: buyerEmail.toLowerCase(),
                      name: buyer?.name || 'Cliente',
                      planName: planName,
                      transactionId: transactionId,
                      internalSecret: Deno.env.get('SEND_WELCOME_EMAIL_SECRET')
                    }
                  });
                  
                  if (emailError) {
                    console.error('Error sending welcome email:', emailError);
                  } else {
                    console.log('Welcome email sent successfully');
                  }
                } catch (emailErr) {
                  console.error('Exception sending welcome email:', emailErr);
                }
              }
            } catch (createError) {
              console.error('Exception creating user:', createError);
            }
          }
          
          if (userProfile) {
            console.log('User found/created:', userProfile.id);
            
            // Determine subscription action based on event
            if (event === 'PURCHASE_APPROVED' || event === 'PURCHASE_COMPLETE') {
              // Create or activate subscription
              
              // Calculate expiration based on plan type
              const now = new Date();
              let expiresAt: string | null = null;
              
              if (planType === 'monthly') {
                const expireDate = new Date(now);
                expireDate.setMonth(expireDate.getMonth() + 1);
                expiresAt = expireDate.toISOString();
              } else if (planType === 'yearly') {
                const expireDate = new Date(now);
                expireDate.setFullYear(expireDate.getFullYear() + 1);
                expiresAt = expireDate.toISOString();
              } else if (planType === 'lifetime') {
                expiresAt = null; // Never expires
              } else if (planType === 'trial') {
                const expireDate = new Date(now);
                expireDate.setDate(expireDate.getDate() + 7); // 7 day trial
                expiresAt = expireDate.toISOString();
              }
              
              // Check if user already has a subscription
              const { data: existingSubscription } = await supabase
                .from('subscriptions')
                .select('id, plan_id, status, expires_at, notes')
                .eq('user_id', userProfile.id)
                .in('status', ['active', 'trial', 'pending'])
                .single();
              
              if (existingSubscription) {
                // Update existing subscription
                console.log('Updating existing subscription:', existingSubscription.id);
                
                // If upgrading to a different plan, update plan_id
                // If same plan, extend expiration
                let newExpiresAt = expiresAt;
                if (existingSubscription.plan_id === planMapping.plan_id && existingSubscription.expires_at) {
                  // Same plan - extend from current expiration
                  const currentExpires = new Date(existingSubscription.expires_at);
                  if (currentExpires > now) {
                    if (planType === 'monthly') {
                      currentExpires.setMonth(currentExpires.getMonth() + 1);
                    } else if (planType === 'yearly') {
                      currentExpires.setFullYear(currentExpires.getFullYear() + 1);
                    }
                    newExpiresAt = currentExpires.toISOString();
                  }
                }
                
                const { error: updateSubError } = await supabase
                  .from('subscriptions')
                  .update({
                    plan_id: planMapping.plan_id,
                    status: 'active',
                    is_trial: planType === 'trial',
                    expires_at: newExpiresAt,
                    origin: 'hotmart',
                    external_id: transactionId,
                    notes: `Atualizado via Hotmart webhook - ${event}`,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingSubscription.id);
                
                if (updateSubError) {
                  console.error('Error updating subscription:', updateSubError);
                } else {
                  subscriptionCreated = true;
                  subscriptionAction = 'updated';
                  console.log('Subscription updated successfully');

                  // Send welcome email once (avoid spamming on repeated webhooks)
                  const notesText = (existingSubscription as any)?.notes || '';
                  const welcomeMarker = `[welcome_email_sent:${transactionId}]`;
                  const shouldSendWelcomeEmail = !notesText.includes(welcomeMarker);

                  if (shouldSendWelcomeEmail) {
                    try {
                      console.log('Sending welcome email for existing user (updated subscription)...');
                      const welcomePlanName = (planMapping as any).plans?.name || 'Cubo Mágico';
                      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                        body: {
                          email: buyerEmail.toLowerCase(),
                          name: buyer?.name || 'Cliente',
                          planName: welcomePlanName,
                          transactionId: transactionId,
                          internalSecret: Deno.env.get('SEND_WELCOME_EMAIL_SECRET')
                        }
                      });

                      if (emailError) {
                        console.error('Error sending welcome email:', emailError);
                      } else {
                        console.log('Welcome email sent successfully (updated subscription)');

                        // Mark as sent to avoid duplicate emails
                        const updatedNotes = `Atualizado via Hotmart webhook - ${event}\n${welcomeMarker}`;
                        const { error: markError } = await supabase
                          .from('subscriptions')
                          .update({ notes: updatedNotes, updated_at: new Date().toISOString() })
                          .eq('id', existingSubscription.id);

                        if (markError) {
                          console.error('Error marking welcome email as sent:', markError);
                        }
                      }
                    } catch (emailErr) {
                      console.error('Exception sending welcome email (updated subscription):', emailErr);
                    }
                  }
                }
              } else {
                // Create new subscription
                console.log('Creating new subscription for user:', userProfile.id);
                
                const { error: createSubError } = await supabase
                  .from('subscriptions')
                  .insert({
                    user_id: userProfile.id,
                    plan_id: planMapping.plan_id,
                    status: planType === 'trial' ? 'trial' : 'active',
                    is_trial: planType === 'trial',
                    starts_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    trial_ends_at: planType === 'trial' ? expiresAt : null,
                    origin: 'hotmart',
                    external_id: transactionId,
                    notes: `Criado via Hotmart webhook - ${event}${newUserCreated ? ' (novo usuário)' : ''}`
                  });
                
                if (createSubError) {
                  console.error('Error creating subscription:', createSubError);
                } else {
                  subscriptionCreated = true;
                  subscriptionAction = newUserCreated ? 'created_with_user' : 'created';
                  console.log('Subscription created successfully');
                  
                  // Send welcome email for new subscription (even for existing users)
                  if (!newUserCreated) {
                    try {
                      console.log('Sending welcome email for existing user with new subscription...');
                      const welcomePlanName = (planMapping as any).plans?.name || 'Cubo Mágico';
                      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
                        body: {
                          email: buyerEmail.toLowerCase(),
                          name: buyer?.name || 'Cliente',
                          planName: welcomePlanName,
                          transactionId: transactionId,
                          internalSecret: Deno.env.get('SEND_WELCOME_EMAIL_SECRET')
                        }
                      });
                      
                      if (emailError) {
                        console.error('Error sending welcome email:', emailError);
                      } else {
                        console.log('Welcome email sent successfully to existing user');
                      }
                    } catch (emailErr) {
                      console.error('Exception sending welcome email to existing user:', emailErr);
                    }
                  }
                }
              }
            } else if (event === 'PURCHASE_CANCELED' || event === 'PURCHASE_REFUNDED' || event === 'PURCHASE_CHARGEBACK') {
              // Cancel subscription
              console.log('Cancelling subscription due to:', event);
              
              const { error: cancelError } = await supabase
                .from('subscriptions')
                .update({
                  status: 'cancelled',
                  notes: `Cancelado via Hotmart webhook - ${event}`,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userProfile.id)
                .in('status', ['active', 'trial', 'pending']);
              
              if (cancelError) {
                console.error('Error cancelling subscription:', cancelError);
              } else {
                subscriptionCreated = true;
                subscriptionAction = 'cancelled';
                console.log('Subscription cancelled successfully');
              }
            } else if (event === 'PURCHASE_RECURRENCE_CANCELLATION') {
              // Mark subscription as expiring (don't cancel immediately)
              console.log('Subscription recurrence cancelled, will expire at current period end');
              
              const { error: expireError } = await supabase
                .from('subscriptions')
                .update({
                  notes: `Recorrência cancelada via Hotmart - expira em ${new Date().toISOString()}`,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', userProfile.id)
                .in('status', ['active', 'trial']);
              
              if (!expireError) {
                subscriptionAction = 'recurrence_cancelled';
              }
            }
          } else {
            console.log('Could not find or create user for email:', buyerEmail);
          }
        } else {
          console.log('No plan mapping found for product:', productCode, 'offer:', offerCode);
        }
      }
    } catch (subscriptionError) {
      // Don't fail the webhook if subscription logic fails
      console.error('[Hotmart Webhook] Error processing subscription:', subscriptionError);
    }
    
    // Trigger automation engine for transaction events
    try {
      // We need to get the contact_id that was created by the sync trigger
      const { data: transaction } = await supabase
        .from('crm_transactions')
        .select('id, contact_id, status, product_name, product_code, offer_code, offer_name, total_price, total_price_brl, payment_method, transaction_date')
        .eq('project_id', projectId)
        .eq('external_id', transactionId)
        .eq('platform', 'hotmart')
        .single();
      
      if (transaction && transaction.contact_id) {
        console.log('[Hotmart Webhook] Triggering automation for transaction:', transaction.id);
        
        const { error: automationError } = await supabase.functions.invoke('automation-engine', {
          body: {
            action: 'trigger_transaction',
            projectId,
            contactId: transaction.contact_id,
            transaction: {
              id: transaction.id,
              status: transaction.status,
              product_name: transaction.product_name,
              product_code: transaction.product_code,
              offer_code: transaction.offer_code,
              offer_name: transaction.offer_name,
              total_price: transaction.total_price,
              total_price_brl: transaction.total_price_brl,
              payment_method: transaction.payment_method,
              transaction_date: transaction.transaction_date,
            }
          }
        });
        
        if (automationError) {
          console.error('[Hotmart Webhook] Automation trigger error:', automationError);
        } else {
          console.log('[Hotmart Webhook] Automation triggered successfully');
        }
      }
    } catch (automationError) {
      // Don't fail the webhook if automation fails
      console.error('[Hotmart Webhook] Error triggering automation:', automationError);
    }
    
    console.log('=== WEBHOOK PROCESSED SUCCESSFULLY ===');
    console.log('Project:', project.name);
    console.log('Event:', event);
    console.log('Status:', status);
    console.log('Operation:', operation);
    console.log('Phone captured:', !!buyerPhone);
    console.log('Subscription action:', subscriptionAction || 'none');
    console.log('New user created:', newUserCreated);
    console.log('Ledger written:', ledgerWritten);
    console.log('Ledger skipped:', ledgerSkipped);
    console.log('Orders Shadow:', ordersShadowResult.orderId ? 'success' : 'skipped');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sale ${operation} for project ${project.name}`,
      transaction: transactionId,
      event,
      status,
      phone_captured: !!buyerPhone,
      is_abandoned_cart: event === 'PURCHASE_OUT_OF_SHOPPING_CART',
      new_user_created: newUserCreated,
      subscription: subscriptionAction ? {
        action: subscriptionAction,
        created: subscriptionCreated
      } : null,
      ledger: {
        written: ledgerWritten,
        skipped: ledgerSkipped
      },
      orders_shadow: {
        order_id: ordersShadowResult.orderId,
        items_created: ordersShadowResult.itemsCreated,
        events_created: ordersShadowResult.eventsCreated
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 200, // Return 200 to prevent Hotmart retries
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
