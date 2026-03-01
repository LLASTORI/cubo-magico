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

// Events that represent money coming IN (FINANCIALLY EFFECTIVE)
const creditEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_STARTED', 'SWITCH_PLAN'];

// Events that represent money going OUT (inverted amounts, FINANCIALLY EFFECTIVE)
const debitEvents = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_RECURRENCE_CANCELLATION'];

// Events that are INFORMATIONAL ONLY - should NOT impact financial values
// These represent intent/status changes but NO money has been transferred
const informationalEvents = ['PURCHASE_BILLET_PRINTED', 'PURCHASE_EXPIRED', 'PURCHASE_DELAYED', 'PURCHASE_PROTEST', 'PURCHASE_OUT_OF_SHOPPING_CART'];

// Helper: Check if event is financially effective (should impact customer_paid)
function isFinanciallyEffectiveEvent(eventName: string): boolean {
  return creditEvents.includes(eventName) || debitEvents.includes(eventName);
}

// ============================================
// BRL LEDGER EXTRACTION - CANONICAL RULES
// ============================================
// 
// REGRA 1: Ledger financeiro APENAS contém valores BRL REAIS
// REGRA 2: commissions[].value (USD) é dado CONTÁBIL, não caixa
// REGRA 3: currency_conversion.converted_value é a fonte de verdade para BRL
// REGRA 4: Nenhuma conversão manual é permitida
// REGRA 5: Sem conversão no webhook = sem entrada no ledger (bloqueado)
// 
// DECISÃO B: Para internacionais sem currency_conversion em MARKETPLACE,
//            NÃO gerar evento de platform_fee (marcar ledger_status = 'partial')
// ============================================

interface BrlExtraction {
  amount_brl: number | null;         // Valor BRL real (fonte de verdade)
  amount_accounting: number;         // Valor contábil original (USD/MXN)
  currency_accounting: string;       // Moeda do valor contábil
  conversion_rate: number | null;    // Taxa de conversão (se aplicável)
  source_type: 'native_brl' | 'converted' | 'blocked';  // Origem do BRL
  should_create_event: boolean;      // Se deve criar ledger event
  block_reason: string | null;       // Motivo do bloqueio (se houver)
}

/**
 * Extract BRL value from a Hotmart commission entry following canonical rules.
 * 
 * @param commission - Raw commission object from webhook
 * @param orderCurrency - Currency of the order (from purchase.price.currency_value)
 * @returns BRL extraction result with source tracking
 */
function extractBrlFromCommission(
  commission: any,
  orderCurrency: string
): BrlExtraction {
  const accountingValue = commission.value ?? 0;
  const accountingCurrency = commission.currency_code || commission.currency_value || orderCurrency || 'BRL';
  const source = (commission.source || '').toUpperCase();
  
  // Case 1: Native BRL order - value is already in BRL
  if (accountingCurrency === 'BRL') {
    return {
      amount_brl: accountingValue,
      amount_accounting: accountingValue,
      currency_accounting: 'BRL',
      conversion_rate: 1,
      source_type: 'native_brl',
      should_create_event: accountingValue !== 0,
      block_reason: null,
    };
  }
  
  // Case 2: International order - need currency_conversion
  const currencyConversion = commission.currency_conversion;
  
  if (currencyConversion && currencyConversion.converted_value !== undefined) {
    // Has explicit BRL conversion - use it
    return {
      amount_brl: currencyConversion.converted_value,
      amount_accounting: accountingValue,
      currency_accounting: accountingCurrency,
      conversion_rate: currencyConversion.rate || null,
      source_type: 'converted',
      should_create_event: currencyConversion.converted_value !== 0,
      block_reason: null,
    };
  }
  
  // Case 3: International WITHOUT currency_conversion
  // DECISÃO B: NÃO criar evento, marcar como blocked
  return {
    amount_brl: null,
    amount_accounting: accountingValue,
    currency_accounting: accountingCurrency,
    conversion_rate: null,
    source_type: 'blocked',
    should_create_event: false,
    block_reason: `No currency_conversion for ${source} in ${accountingCurrency} order (Decision B)`,
  };
}

/**
 * Determine ledger_status based on BRL coverage of all commissions
 * 
 * @param extractions - Array of BRL extractions from all commissions
 * @returns 'complete' | 'partial' | 'blocked'
 */
function determineLedgerStatus(extractions: BrlExtraction[]): 'complete' | 'partial' | 'blocked' {
  const hasBlocked = extractions.some(e => e.source_type === 'blocked');
  const hasCreated = extractions.some(e => e.should_create_event);
  
  if (hasBlocked && hasCreated) {
    return 'partial'; // Some events created, some blocked
  }
  if (hasBlocked && !hasCreated) {
    return 'blocked'; // All blocked
  }
  return 'complete'; // All events have BRL values
}

// ============================================
// ORDERS CORE SHADOW - Utility Functions
// ============================================

/**
 * Normalize Hotmart payment type to canonical format
 * 
 * REGRAS CANÔNICAS:
 * ✓ Fonte: purchase.payment.type (ÚNICA)
 * ✓ NUNCA inferir pelo valor ou status
 * ✓ Se não souber, retorna 'unknown'
 */
function normalizePaymentMethod(rawPaymentType: string | null): string {
  if (!rawPaymentType) return 'unknown';
  
  switch (rawPaymentType.toUpperCase()) {
    case 'CREDIT_CARD':
      return 'credit_card';
    case 'PIX':
      return 'pix';
    case 'BILLET':
      return 'billet';
    case 'PAYPAL':
      return 'paypal';
    case 'APPLE_PAY':
      return 'apple_pay';
    case 'GOOGLE_PAY':
      return 'google_pay';
    case 'WALLET':
      return 'wallet';
    default:
      return 'unknown';
  }
}

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

  // Regra canônica do Cubo:
  // 1) Se payload tiver items[] → criar um item por item
  // 2) Se NÃO tiver items[] → criar item sintético com purchase.product
  const payloadItems = Array.isArray(data?.items) ? data.items : [];

  if (payloadItems.length > 0) {
    for (const rawItem of payloadItems) {
      const rawProduct = rawItem?.product || rawItem;
      const providerProductId =
        rawProduct?.id?.toString() ||
        rawProduct?.ucode ||
        rawItem?.product_id?.toString() ||
        rawItem?.ucode ||
        'unknown';

      const providerOfferId =
        rawItem?.offer?.code ||
        rawItem?.offer_code ||
        purchase?.offer?.code ||
        null;

      const quantity = Number(rawItem?.quantity ?? rawItem?.qty ?? 1) || 1;
      const basePrice =
        Number(rawItem?.price?.value ?? rawItem?.base_price ?? rawItem?.price_value ?? purchase?.price?.value ?? purchase?.full_price?.value ?? 0) ||
        0;

      items.push({
        provider_product_id: providerProductId,
        provider_offer_id: providerOfferId,
        product_name: rawProduct?.name || rawItem?.name || purchase?.product?.name || data?.product?.name || 'Unknown Product',
        offer_name: rawItem?.offer?.name || rawItem?.offer_name || purchase?.offer?.name || null,
        // NÃO inferir tipo final da venda no webhook.
        // Só marcar main quando vier explícito no payload do item.
        item_type:
          rawItem?.item_type === 'main' ||
          rawItem?.type === 'main' ||
          rawItem?.is_main === true
            ? 'main'
            : 'unknown',
        base_price: basePrice,
        quantity,
      });
    }

    return items;
  }

  const syntheticProduct = purchase?.product || data?.product;
  if (!syntheticProduct) return items;

  const basePrice = Number(purchase?.price?.value ?? purchase?.full_price?.value ?? 0) || 0;
  
  items.push({
    provider_product_id: syntheticProduct.id?.toString() || syntheticProduct.ucode || 'unknown',
    provider_offer_id: purchase?.offer?.code || null,
    product_name: syntheticProduct.name || 'Unknown Product',
    offer_name: purchase?.offer?.name || null,
    // Item sintético do webhook NÃO representa composição final da venda.
    // Não inferir principal/bump aqui para não interferir no reconciliador.
    item_type: purchase?.is_main === true ? 'main' : 'unknown',
    base_price: basePrice,
    quantity: 1,
  });
  
  // TODO: Handle combo products when Hotmart provides array of products
  // Hotmart currently sends one product per webhook for combos
  
  return items;
}

/**
 * Create (or upsert) order_items from Hotmart webhook payload.
 * Canonical dedupe key: (order_id, provider_product_id, provider_offer_id)
 */
async function createOrderItemsFromWebhook(
  supabase: any,
  payload: any,
  order: { id: string; project_id: string }
): Promise<{ items: Array<{
  provider_product_id: string;
  provider_offer_id: string | null;
  product_name: string;
  offer_name: string | null;
  item_type: string;
  base_price: number | null;
  quantity: number;
}>; upsertedCount: number }> {
  const items = extractOrderItems(payload);
  const webhookEventId = payload?.id ? String(payload.id) : null;

  if (items.length === 0) {
    console.log(`[OrdersShadow] No items extracted from webhook for order ${order.id}`);
    return { items, upsertedCount: 0 };
  }

  // Idempotência extra por webhook_event_id (além do upsert por item).
  // Se o mesmo evento já escreveu itens para este pedido, não reprocesse.
  if (webhookEventId) {
    const { data: sameWebhookItems, error: webhookCheckError } = await supabase
      .from('order_items')
      .select('id')
      .eq('order_id', order.id)
      .contains('metadata', { webhook_event_id: webhookEventId })
      .limit(1);

    if (webhookCheckError) {
      throw new Error(`Order items webhook id check failed: ${webhookCheckError.message}`);
    }

    if ((sameWebhookItems || []).length > 0) {
      console.log(`[OrdersShadow] Webhook event ${webhookEventId} already applied to order ${order.id}, skipping item write`);
      return { items, upsertedCount: 0 };
    }
  }

  const rows = items.map((item) => ({
    order_id: order.id,
    project_id: order.project_id,
    product_name: item.product_name,
    provider_product_id: item.provider_product_id,
    provider_offer_id: item.provider_offer_id,
    quantity: item.quantity || 1,
    base_price: item.base_price ?? 0,
    item_type: item.item_type || 'unknown',
    src: 'hotmart_webhook',
    offer_name: item.offer_name,
    metadata: {
      webhook_event_id: webhookEventId,
      source: 'hotmart_webhook',
    },
  }));

  const { error } = await supabase
    .from('order_items')
    .upsert(rows, {
      onConflict: 'order_id,provider_product_id,provider_offer_id',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(`Order items upsert failed: ${error.message}`);
  }

  return { items, upsertedCount: rows.length };
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
  ownerNetRevenueBrl: number | null, // NEW: BRL converted value for producer
  contactId: string | null
): Promise<{ orderId: string | null; itemsCreated: number; eventsCreated: number; ledgerProcessed: boolean; brlUpdated: boolean; errorMessage?: string | null; ignoredReason?: string | null }> {
  const result = { orderId: null as string | null, itemsCreated: 0, eventsCreated: 0, ledgerProcessed: false, brlUpdated: false, errorMessage: null as string | null, ignoredReason: null as string | null };
  
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
    
    // ============================================
    // EXTRACT PAYMENT METHOD (PROMPT 2)
    // Source of Truth: purchase.payment.type (ÚNICA)
    // NUNCA inferir pelo valor, status ou outro campo
    // ============================================
    const rawPaymentType = purchase?.payment?.type || null;
    const paymentMethod = normalizePaymentMethod(rawPaymentType);
    const installments = purchase?.payment?.installments_number || 1;
    
    console.log(`[OrdersShadow] Payment: method=${paymentMethod}, type=${rawPaymentType}, installments=${installments}`);
    
    // Calculate values from THIS webhook event only
    const orderItems = extractOrderItems(payload);
    const thisEventGrossBase = orderItems.reduce((sum, item) => sum + (item.base_price || 0), 0);
    const thisEventCustomerPaid = totalPriceBrl || 0;
    const thisEventProducerNet = ownerNetRevenue || 0;
    const thisEventProducerNetBrl = ownerNetRevenueBrl || 0; // BRL value for cash flow
    
    // Parse dates
    const orderedAt = purchase?.order_date 
      ? new Date(purchase.order_date).toISOString()
      : new Date(payload.creation_date).toISOString();
    
    const approvedAt = purchase?.approved_date
      ? new Date(purchase.approved_date).toISOString()
      : null;
    
    // ============================================
    // FINANCIAL DEDUPLICATION CHECK
    // Verify if this specific transaction_id has already impacted finances
    // ============================================
    const isFinancialEvent = isFinanciallyEffectiveEvent(hotmartEvent);
    let transactionAlreadyProcessedFinancially = false;
    
    if (isFinancialEvent && transactionId) {
      const { data: existingMapping } = await supabase
        .from('provider_order_map')
        .select('id')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .eq('provider_transaction_id', transactionId)
        .maybeSingle();
      
      transactionAlreadyProcessedFinancially = !!existingMapping;
      
      if (transactionAlreadyProcessedFinancially) {
        console.log(`[OrdersShadow] Transaction ${transactionId} already processed financially, skipping value accumulation`);
      }
    }
    
    // Determine financial values for THIS event
    // Only apply if: 1) financially effective event AND 2) not already processed
    const shouldApplyFinancialValues = isFinancialEvent && !transactionAlreadyProcessedFinancially;
    const financialCustomerPaid = shouldApplyFinancialValues ? thisEventCustomerPaid : 0;
    const financialGrossBase = shouldApplyFinancialValues ? thisEventGrossBase : 0;
    const financialProducerNet = shouldApplyFinancialValues ? thisEventProducerNet : 0;
    const financialProducerNetBrl = shouldApplyFinancialValues ? thisEventProducerNetBrl : 0; // BRL value
    
    if (!isFinancialEvent) {
      console.log(`[OrdersShadow] Event ${hotmartEvent} is INFORMATIONAL - no financial impact`);
    }
    
    // ============================================
    // 1. UPSERT ORDER (with conditional accumulation)
    // ============================================
    
    // Check if order exists and get current values
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, customer_paid, gross_base, producer_net, producer_net_brl, approved_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .eq('provider_order_id', providerOrderId)
      .maybeSingle();
    
    let orderId: string;
    
    if (existingOrder) {
      // ============================================
      // REGRA CANÔNICA: STATUS DERIVADO DO LEDGER
      // ============================================
      // NÃO atualizar orders.status diretamente aqui.
      // O status será derivado automaticamente pelo trigger
      // que monitora ledger_events (derive_order_status_from_ledger).
      //
      // Isso garante que:
      // 1. Cancelamento de order bump NUNCA cancela pedido pai
      // 2. Status sempre reflete o estado financeiro REAL do ledger
      // 3. Pedidos com valor líquido positivo NUNCA "desaparecem"
      // ============================================
      
      // Order exists - only update financial values if this is a new financial event
      if (shouldApplyFinancialValues && financialCustomerPaid > 0) {
        // ACCUMULATE values - this is a new financially effective item
        const newCustomerPaid = (existingOrder.customer_paid || 0) + financialCustomerPaid;
        const newGrossBase = (existingOrder.gross_base || 0) + financialGrossBase;
        const newProducerNet = (existingOrder.producer_net || 0) + financialProducerNet;
        const newProducerNetBrl = (existingOrder.producer_net_brl || 0) + financialProducerNetBrl; // BRL accumulation
        
        console.log(`[OrdersShadow] Financial accumulation: ${existingOrder.customer_paid} + ${financialCustomerPaid} = ${newCustomerPaid}`);
        console.log(`[OrdersShadow] Producer BRL accumulation: ${existingOrder.producer_net_brl || 0} + ${financialProducerNetBrl} = ${newProducerNetBrl}`);
        
        // NÃO ATUALIZAR STATUS AQUI - será derivado do ledger via trigger
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            // status, ← REMOVIDO: Derivado do ledger automaticamente
            customer_paid: newCustomerPaid,
            gross_base: newGrossBase,
            producer_net: newProducerNet,
            producer_net_brl: newProducerNetBrl, // NEW: BRL value
            approved_at: approvedAt || existingOrder.approved_at,
            updated_at: new Date().toISOString(),
            // PAYMENT METHOD (PROMPT 2) - backfill on financial event if missing
            payment_method: paymentMethod,
            payment_type: rawPaymentType,
            installments: installments,
          })
          .eq('id', existingOrder.id);
        
        if (updateError) {
          console.error('[OrdersShadow] Error updating order:', updateError);
          result.errorMessage = `Orders update failed: ${updateError.message}`;
          return result;
        }
      } else {
        // Only update approved_at and payment metadata (no financial impact)
        // STATUS NÃO É ATUALIZADO - derivado do ledger
        const backfillPaymentMethod = existingOrder.payment_method ?? paymentMethod;
        const backfillPaymentType = existingOrder.payment_type ?? rawPaymentType;
        const backfillInstallments = existingOrder.installments ?? installments;
        
        const needsPaymentBackfill = !existingOrder.payment_method && paymentMethod && paymentMethod !== 'unknown';
        
        if (needsPaymentBackfill) {
          console.log(`[OrdersShadow] Backfilling payment method: ${backfillPaymentMethod} (was null)`);
        } else {
          console.log(`[OrdersShadow] Non-financial event - status derivado do ledger`);
        }
        
        // NÃO ATUALIZAR STATUS - derivado do ledger automaticamente
        const { error: nonFinancialUpdateError } = await supabase
          .from('orders')
          .update({
            // status, ← REMOVIDO: Derivado do ledger automaticamente
            approved_at: approvedAt || existingOrder.approved_at,
            updated_at: new Date().toISOString(),
            // PAYMENT BACKFILL (idempotent) - only fills if null, never overwrites
            payment_method: backfillPaymentMethod,
            payment_type: backfillPaymentType,
            installments: backfillInstallments,
          })
          .eq('id', existingOrder.id);

        if (nonFinancialUpdateError) {
          console.error('[OrdersShadow] Error updating order (non-financial):', nonFinancialUpdateError);
          result.errorMessage = `Orders update failed: ${nonFinancialUpdateError.message}`;
          return result;
        }
      }
      
      orderId = existingOrder.id;
      console.log(`[OrdersShadow] Updated order: ${orderId}`);
    } else {
      // Insert new order - only include financial values if this is a financial event
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
          customer_paid: financialCustomerPaid,
          gross_base: financialGrossBase || financialCustomerPaid,
          producer_net: financialProducerNet,
          producer_net_brl: financialProducerNetBrl, // NEW: BRL value
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
          // PAYMENT METHOD (PROMPT 2) - only when financial event
          payment_method: shouldApplyFinancialValues ? paymentMethod : null,
          payment_type: shouldApplyFinancialValues ? rawPaymentType : null,
          installments: shouldApplyFinancialValues ? installments : null,
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('[OrdersShadow] Error inserting order:', insertError);
        result.errorMessage = `Orders insert failed: ${insertError.message}`;
        return result;
      }
      
      orderId = newOrder.id;
      console.log(`[OrdersShadow] Created order: ${orderId} (financial values: ${shouldApplyFinancialValues})`);
    }
    
    result.orderId = orderId;
    
    // ============================================
    // 2. CREATE ORDER ITEMS (MANDATORY)
    // Regra canônica:
    // - payload.items[] => 1 row por item
    // - sem items[] => item sintético via purchase.product
    // Idempotência: upsert por (order_id, provider_product_id, provider_offer_id)
    // ============================================
    let orderItemsUpserted: Array<{
      provider_product_id: string;
      provider_offer_id: string | null;
      product_name: string;
      offer_name: string | null;
      item_type: string;
      base_price: number | null;
      quantity: number;
    }> = [];

    try {
      const { items, upsertedCount } = await createOrderItemsFromWebhook(supabase, payload, {
        id: orderId,
        project_id: projectId,
      });
      orderItemsUpserted = items;
      result.itemsCreated = upsertedCount;
      console.log(`[OrdersShadow] Upserted ${upsertedCount} order item(s) for order ${orderId}`);
    } catch (itemsError) {
      console.error('[OrdersShadow] Error creating order items:', itemsError);
      result.errorMessage = itemsError instanceof Error ? itemsError.message : 'Order items creation failed';
      return result;
    }

    for (const item of orderItemsUpserted) {
      // ============================================
      // OFFER MAPPINGS FALLBACK (CATÁLOGO SEMÂNTICO)
      // NÃO É FINANCEIRO - apenas cria mapeamento se não existir
      // REGRA: Se a oferta não existe em offer_mappings, criar entrada mínima
      // ============================================
      if (item.provider_offer_id) {
        const { data: existingMapping } = await supabase
          .from('offer_mappings')
          .select('id')
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .eq('codigo_oferta', item.provider_offer_id)
          .maybeSingle();
        
        if (!existingMapping) {
          // Fetch default "A Definir" funnel for this project
          const { data: defaultFunnel } = await supabase
            .from('funnels')
            .select('id, project_id')
            .eq('project_id', projectId)
            .eq('name', 'A Definir')
            .maybeSingle();

          const defaultFunnelId = defaultFunnel?.project_id === projectId ? defaultFunnel.id : null;
          
          const { error: mappingError } = await supabase
            .from('offer_mappings')
            .insert({
              project_id: projectId,
              provider: 'hotmart',
              codigo_oferta: item.provider_offer_id,
              id_produto: item.provider_product_id,
              nome_produto: item.product_name || 'Produto (via venda)',
              nome_oferta: item.offer_name || 'Oferta (via venda)',
              valor: null, // Não usar valor financeiro - apenas catálogo
              moeda: 'BRL',
              status: 'Ativo',
              funnel_id: defaultFunnelId,
              id_funil: 'A Definir',
              origem: 'sale_fallback',
            });
          
          if (mappingError) {
            // Ignore duplicate key errors (race condition safe)
            if (mappingError.code !== '23505') {
              console.error(`[OfferMappingsFallback] Error creating mapping for ${item.provider_offer_id}:`, mappingError.message);
            }
          } else {
            console.log(`[OfferMappingsFallback] Created mapping for offer ${item.provider_offer_id} (${item.offer_name || 'Unknown'})`);
          }
        }
      }
    }
    
    // ============================================
    // 3. CREATE LEDGER EVENTS (only for NEW financial events - respect deduplication)
    // ============================================
    // 
    // CRITICAL FIX: Using manual SELECT + INSERT instead of upsert
    // PostgreSQL does NOT support ON CONFLICT on partial unique indexes.
    // The ledger_events table has a partial unique index:
    //   UNIQUE(provider_event_id) WHERE provider_event_id IS NOT NULL
    // Using upsert with onConflict: 'provider_event_id' causes silent failures (error 42P10).
    //
    // REGRA CANÔNICA: Refunds/cancelamentos SÓ geram ledger se houver venda prévia
    // para a mesma transação. Cancelamento de bump sem venda NÃO gera ledger.
    // ============================================
    const occurredAt = orderedAt;
    const isDebit = debitEvents.includes(hotmartEvent);
    
    // Track if ANY ledger event was created successfully (for conditional map creation)
    let ledgerCreatedSuccessfully = false;
    
    // ============================================
    // REGRA CANÔNICA: Para eventos de DÉBITO (refund/cancel/chargeback),
    // verificar se existe uma VENDA prévia para esta transação específica.
    // Se não houver, NÃO criar ledger_events (evita órfãos).
    // ============================================
    let skipLedgerCreation = false;
    
    if (isDebit && transactionId) {
      // Verificar se existe ledger_event de 'sale' para esta transação
      const saleEventIdPrefix = `${transactionId}_sale_`;
      const { data: existingSale } = await supabase
        .from('ledger_events')
        .select('id')
        .eq('order_id', orderId)
        .ilike('provider_event_id', `${saleEventIdPrefix}%`)
        .maybeSingle();
      
      if (!existingSale) {
        console.log(`[OrdersShadow] SKIP ledger: Debit event ${hotmartEvent} for transaction ${transactionId} - no prior sale found`);
        skipLedgerCreation = true;
      }
    }
    
    // Only create ledger events when shouldApplyFinancialValues is true AND not skipped
    // This ensures ledger_events are consistent with customer_paid and order_items
    if (shouldApplyFinancialValues && !skipLedgerCreation) {
      // ============================================
      // NEW BRL-NATIVE LEDGER LOGIC
      // Using extractBrlFromCommission for canonical BRL values
      // DECISÃO B: No platform_fee for intl without conversion
      // ============================================
      
      // Collect all ledger events to create for THIS transaction
      const ledgerEventsToCreate: Array<{
        order_id: string;
        project_id: string;
        provider: string;
        event_type: string;
        actor: string;
        actor_name: string | null;
        amount: number;  // Legacy field (accounting value)
        amount_brl: number | null;  // NEW: Real BRL value
        amount_accounting: number;   // NEW: Original accounting value
        currency_accounting: string; // NEW: Original currency
        conversion_rate: number | null; // NEW: Conversion rate
        source_type: string;  // NEW: native_brl | converted | blocked
        currency: string;
        provider_event_id: string;
        occurred_at: string;
        raw_payload: any;
      }> = [];
      
      // Track BRL extractions for ledger_status determination
      const brlExtractions: BrlExtraction[] = [];
      
      // Track materialized BRL values for orders table
      let materializedPlatformFeeBrl: number | null = null;
      let materializedAffiliateBrl: number | null = null;
      let materializedCoproducerBrl: number | null = null;
      
      for (const comm of commissions) {
        const source = (comm.source || '').toUpperCase();
        
        // Extract BRL value using canonical logic
        const brlExtraction = extractBrlFromCommission(comm, currency);
        brlExtractions.push(brlExtraction);
        
        // Skip if no event should be created (blocked or zero value)
        if (!brlExtraction.should_create_event) {
          if (brlExtraction.block_reason) {
            console.log(`[OrdersShadow] BRL BLOCKED: ${brlExtraction.block_reason}`);
          }
          continue;
        }
        
        let accountingValue = brlExtraction.amount_accounting;
        let brlValue = brlExtraction.amount_brl;
        
        // For refunds/chargebacks, amounts should be NEGATIVE
        if (isDebit) {
          accountingValue = -Math.abs(accountingValue);
          brlValue = brlValue !== null ? -Math.abs(brlValue) : null;
        }
        
        let eventType: string;
        let actor: string;
        let actorName: string | null = null;
        
        switch (source) {
          case 'MARKETPLACE':
            eventType = 'platform_fee';
            actor = 'platform';
            actorName = 'hotmart';
            // Materialize for orders table
            materializedPlatformFeeBrl = brlValue !== null ? Math.abs(brlValue) : null;
            break;
          case 'PRODUCER':
            eventType = isDebit ? 'refund' : 'sale';
            actor = 'producer';
            break;
          case 'COPRODUCER':
            eventType = 'coproducer';
            actor = 'coproducer';
            actorName = data?.producer?.name || null;
            // Materialize for orders table
            materializedCoproducerBrl = brlValue !== null ? Math.abs(brlValue) : null;
            break;
          case 'AFFILIATE':
            eventType = 'affiliate';
            actor = 'affiliate';
            actorName = data?.affiliates?.[0]?.name || null;
            // Materialize for orders table
            materializedAffiliateBrl = brlValue !== null ? Math.abs(brlValue) : null;
            break;
          default:
            continue;
        }
        
        // Build provider_event_id for deduplication
        // Key: {transaction_id}_{event_type}_{actor}
        const providerEventId = `${transactionId}_${eventType}_${actor}`;
        
        // Determine display amount (BRL for 'sale', negative for deductions)
        const displayAmount = eventType === 'sale' 
          ? Math.abs(accountingValue) 
          : -Math.abs(accountingValue);
        
        ledgerEventsToCreate.push({
          order_id: orderId,
          project_id: projectId,
          provider: 'hotmart',
          event_type: eventType,
          actor,
          actor_name: actorName,
          amount: displayAmount,  // Legacy: accounting value with sign
          amount_brl: brlValue,   // NEW: Real BRL value
          amount_accounting: Math.abs(brlExtraction.amount_accounting),
          currency_accounting: brlExtraction.currency_accounting,
          conversion_rate: brlExtraction.conversion_rate,
          source_type: brlExtraction.source_type,
          currency,
          provider_event_id: providerEventId,
          occurred_at: occurredAt,
          raw_payload: comm,
        });
        
        console.log(`[OrdersShadow] BRL extraction: ${source} → amount_brl=${brlValue}, source_type=${brlExtraction.source_type}`);
      }
      
      // ============================================
      // 4. COPRODUCER POLICY: EXPLICIT ONLY
      // ============================================
      // coproducer_brl is ONLY set from commissions[source=COPRODUCER]
      // If no explicit commission exists, value remains NULL
      // has_co_production flag is METADATA ONLY - never triggers value creation
      // This ensures 100% data fidelity with provider payload
      // ============================================
      
      // ============================================
      // 5. DETERMINE LEDGER STATUS
      // ============================================
      const ledgerStatus = determineLedgerStatus(brlExtractions);
      console.log(`[OrdersShadow] Ledger status: ${ledgerStatus} (${brlExtractions.length} extractions)`);
      
      // ============================================
      // 6. MANUAL SELECT + INSERT FOR EACH LEDGER EVENT (FIX FOR PARTIAL INDEX)
      // ============================================
      // Step 1: Batch-check which provider_event_ids already exist
      const allProviderEventIds = ledgerEventsToCreate.map(e => e.provider_event_id);
      const existingIds = new Set<string>();
      
      if (allProviderEventIds.length > 0) {
        const { data: existingEvents, error: checkError } = await supabase
          .from('ledger_events')
          .select('provider_event_id')
          .in('provider_event_id', allProviderEventIds);
        
        if (checkError) {
          console.error(`[OrdersShadow] Error checking existing ledger events:`, checkError);
          result.errorMessage = `Ledger existence check failed: ${checkError.message}`;
          return result;
        }
        
        for (const row of existingEvents || []) {
          if (row.provider_event_id) {
            existingIds.add(row.provider_event_id);
          }
        }
      }
      
      // Step 2: Filter to only new events
      const newEvents = ledgerEventsToCreate.filter(e => !existingIds.has(e.provider_event_id));
      
      console.log(`[OrdersShadow] Ledger: ${allProviderEventIds.length} candidates, ${existingIds.size} already exist, ${newEvents.length} to insert`);
      
      // Step 3: Insert new events (one by one to capture individual errors)
      for (const event of newEvents) {
        const { error: insertError } = await supabase
          .from('ledger_events')
          .insert(event);
        
        if (insertError) {
          // Explicit error handling - NEVER silently ignore
          console.error(`[OrdersShadow] LEDGER INSERT FAILED for ${event.provider_event_id}:`, insertError);
          result.errorMessage = `Ledger insert failed for ${event.provider_event_id}: ${insertError.message}`;
          return result;
        }
        
        result.eventsCreated++;
        ledgerCreatedSuccessfully = true;
        console.log(`[OrdersShadow] Created ledger event: ${event.event_type} (${event.actor}): amount_brl=${event.amount_brl}, source=${event.source_type} [${event.provider_event_id}]`);
      }
      
      // If there were existing events, we still consider ledger as "processed"
      if (existingIds.size > 0) {
        ledgerCreatedSuccessfully = true;
        console.log(`[OrdersShadow] Ledger already existed for ${existingIds.size} events - marking as processed`);
      }
      
      result.ledgerProcessed = ledgerCreatedSuccessfully;
      
      // ============================================
      // 7. UPDATE ORDER WITH BRL MATERIALIZED VALUES + LEDGER STATUS
      // ============================================
      const orderBrlUpdate: Record<string, any> = {
        ledger_status: ledgerStatus,
        coproducer_brl: materializedCoproducerBrl,
        updated_at: new Date().toISOString(),
      };
      
      // Only update *_brl fields if we have real values
      if (materializedPlatformFeeBrl !== null) {
        orderBrlUpdate.platform_fee_brl = materializedPlatformFeeBrl;
      }
      if (materializedAffiliateBrl !== null) {
        orderBrlUpdate.affiliate_brl = materializedAffiliateBrl;
      }
      const { error: brlUpdateError } = await supabase
        .from('orders')
        .update(orderBrlUpdate)
        .eq('id', orderId);
      
      if (brlUpdateError) {
        console.error(`[OrdersShadow] Error updating order BRL fields:`, brlUpdateError);
        result.errorMessage = `Orders BRL update failed: ${brlUpdateError.message}`;
        return result;
      } else {
        console.log(`[OrdersShadow] Updated order ${orderId} with BRL fields: ledger_status=${ledgerStatus}, platform_fee_brl=${materializedPlatformFeeBrl}, affiliate_brl=${materializedAffiliateBrl}, coproducer_brl=${materializedCoproducerBrl}`);
        result.brlUpdated = true;
      }
      
      // ============================================
      // 8. FILL provider_order_map ONLY AFTER LEDGER SUCCESS
      // This is the critical fix: never mark transaction as processed without ledger
      // ============================================
      if (transactionId && ledgerCreatedSuccessfully) {
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
        
        console.log(`[OrdersShadow] Mapped transaction ${transactionId} -> order ${orderId} (ledger confirmed)`);
      } else if (transactionId && !ledgerCreatedSuccessfully) {
        console.warn(`[OrdersShadow] NOT mapping transaction ${transactionId} - ledger was not created`);
      }
    } else {
      if (shouldApplyFinancialValues && skipLedgerCreation) {
        const message = `Ledger creation blocked for ${hotmartEvent} on transaction ${transactionId}: no prior sale found.`;
        console.warn(`[OrdersShadow] ${message}`);
        result.ignoredReason = 'debit_without_sale';
      }
      console.log(`[OrdersShadow] Skipping ledger/mapping for ${hotmartEvent}: informational=${!isFinancialEvent}, already_processed=${transactionAlreadyProcessedFinancially}`);
      result.ledgerProcessed = true;
      result.brlUpdated = true;
    }
    
    return result;
    
  } catch (error) {
    console.error('[OrdersShadow] Error:', error);
    result.errorMessage = error instanceof Error ? error.message : 'Unknown OrdersShadow error';
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
  status: 'processed' | 'ignored' | 'error',
  errorMessage?: string | null,
  errorStack?: string | null
): Promise<void> {
  try {
    const payload = {
      project_id: projectId,
      provider: 'hotmart',
      provider_event_id: providerEventId,
      received_at: new Date().toISOString(),
      raw_payload: rawPayload,
      status,
      error_message: errorMessage ?? null,
      error_stack: errorStack ?? null,
    };

    const { error } = await supabase.from('provider_event_log').insert(payload);

    if (error) {
      if (error.code === '23505') {
        const { error: updateError } = await supabase
          .from('provider_event_log')
          .update(payload)
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .eq('provider_event_id', providerEventId);

        if (updateError) {
          throw updateError;
        }
      } else {
        throw error;
      }
    }
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
      case 'COPRODUCER':
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
      const { error: deactivateError } = await supabase
        .from('sales_core_events')
        .update({ is_active: false })
        .eq('id', existing.id);
      
      if (deactivateError) {
        throw new Error(`Sales core deactivate failed: ${deactivateError.message}`);
      }
      
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
    throw new Error(`Sales core insert failed: ${error.message}`);
  }
  
  console.log(`[SalesCore] Created canonical event: ${canonicalEventType} v${version} for ${transactionId} (platform_fee=${financialBreakdown?.platform_fee}, affiliate=${financialBreakdown?.affiliate_cost}, coproducer=${financialBreakdown?.coproducer_cost})`);
  return data;
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
      currency_conversion?: {
        converted_value?: number;
        currency?: string;
      };
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
  let contactId: string | null = null;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any | null = null;
  let payload: HotmartWebhookPayload | null = null;
  let projectId: string | null = null;
  let transactionId: string | null = null;
  let providerEventId: string | null = null;

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
   // Resolve project_id via URL (Hotmart padrão)
const url = new URL(req.url);
const pathParts = url.pathname.split('/').filter(Boolean);

// Esperado: /functions/v1/hotmart-webhook/{project_id}
const projectIdFromUrl = pathParts[pathParts.length - 1];

// Validar se é UUID
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!projectIdFromUrl || !uuidRegex.test(projectIdFromUrl)) {
  console.error('Invalid project_id in URL:', url.pathname);

  return new Response(JSON.stringify({
    success: false,
    error: 'Invalid webhook URL',
    hint: 'Use /hotmart-webhook/{project_id}'
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Preenche a variável principal
projectId = projectIdFromUrl;


    // Get hottok from header for additional validation (optional)
    const hottok = req.headers.get('x-hotmart-hottok');
    
    // Parse the webhook payload
    payload = await req.json();
    
    console.log('=== HOTMART WEBHOOK RECEIVED ===');
    console.log('Project ID:', projectId);
    console.log('Event:', payload.event);
    console.log('Transaction:', payload.data?.purchase?.transaction);
    console.log('Hottok present:', !!hottok);
    console.log('Webhook version:', payload.version);
    
    
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
    transactionId = purchase?.transaction || `abandoned_${payload.id}`;
    providerEventId = `hotmart_${transactionId}_${event}`;

    const { data: existingProviderEvent, error: existingProviderEventError } = await supabase
      .from('provider_event_log')
      .select('status')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .eq('provider_event_id', providerEventId)
      .maybeSingle();
    
    if (existingProviderEventError) {
      throw new Error(`Provider event lookup failed: ${existingProviderEventError.message}`);
    }
    
    if (existingProviderEvent?.status === 'processed') {
      console.log(`[Webhook] Provider event ${providerEventId} already processed, ignoring`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Duplicate event already processed',
        transaction: transactionId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
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
    // - COPRODUCER = Coproducer commission
    // - AFFILIATE = Affiliate commission
    // 
    // PRODUCER_NET_BRL: For international orders, Hotmart provides
    // currency_conversion.converted_value which is the BRL liquidation value.
    // ============================================
    let platformFee: number | null = null;
    let ownerNetRevenue: number | null = null;
    let ownerNetRevenueBrl: number | null = null; // NEW: BRL converted value
    let coproducerAmount: number | null = null;
    let affiliateAmount: number | null = null;
    
    if (commissions && Array.isArray(commissions)) {
      for (const comm of commissions) {
        const source = (comm.source || '').toUpperCase();
        const value = comm.value ?? null;
        
        // Extract currency_conversion.converted_value for PRODUCER (BRL liquidation)
        const convertedValue = comm.currency_conversion?.converted_value ?? null;
        
        switch (source) {
          case 'MARKETPLACE':
            platformFee = value;
            break;
          case 'PRODUCER':
            ownerNetRevenue = value;
            // If currency_conversion exists, use it; otherwise, value is already BRL
            ownerNetRevenueBrl = convertedValue ?? value;
            break;
          case 'COPRODUCER':
            coproducerAmount = value;
            break;
          case 'AFFILIATE':
            affiliateAmount = value;
            break;
        }
      }
    }
    
    console.log(`[Financial Mapping] Producer BRL extraction:`);
    console.log(`  - producer_net (contract): ${ownerNetRevenue}`);
    console.log(`  - producer_net_brl (cash): ${ownerNetRevenueBrl}`);
    
    console.log('[Financial Mapping] Extracted from commissions:');
    console.log(`  - Platform Fee (MARKETPLACE): ${platformFee}`);
    console.log(`  - Owner Net (PRODUCER): ${ownerNetRevenue}`);
    console.log(`  - Coproducer: ${coproducerAmount}`);
    console.log(`  - Affiliate: ${affiliateAmount}`);
    
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
      coproducer_cost: coproducerAmount,     // Comissão coprodutor (COPRODUCER)
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
          console.log(`Duplicate sale insert for transaction ${transactionId}, continuing`);
          const { data: existingAfterInsert } = await supabase
            .from('hotmart_sales')
            .select('id')
            .eq('project_id', projectId)
            .eq('transaction_id', transactionId)
            .maybeSingle();
          
          if (!existingAfterInsert) {
            throw new Error(`Duplicate sale insert without existing record for ${transactionId}`);
          }
          
          upsertResult = existingAfterInsert;
        } else {
          console.error('Error inserting sale:', insertError);
          console.error('Sale data that failed:', JSON.stringify(saleData, null, 2));
          throw insertError;
        }
      } else {
        upsertResult = insertData;
      }
    }
    
    console.log('=== SALE UPSERTED SUCCESSFULLY ===');
    console.log('Sale ID:', upsertResult?.id);
    
    const operation = upsertResult ? 'upserted' : 'processed';
    console.log(`${operation} sale ${transactionId}`);

    let providerEventStatus: 'processed' | 'ignored' | 'error' = 'processed';
    let providerEventErrorMessage: string | null = null;
    
    // =====================================================
    // SALES CORE - Write canonical revenue event
    // =====================================================
    console.log('[SalesCore] Writing canonical revenue event...');
    
    // Find contact for binding
    contactId = await findContactId(supabase, projectId, buyer?.email || null, buyerPhone);
    
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
    
    try {
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
      providerEventStatus = 'error';
      providerEventErrorMessage = `[SalesCore] ${salesCoreError instanceof Error ? salesCoreError.message : 'Unknown error'}`;
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
    
    console.log('[FinanceLedger] Processing financial entries from webhook...');
    
    // Parse occurred_at from Hotmart event
    const occurredAtLedger = purchase?.order_date 
      ? new Date(purchase.order_date)
      : new Date(payload.creation_date);
    
    // PROMPT 6: Extract attribution for ledger entries
    const ledgerAttribution = extractAttribution(purchase, rawCheckoutOrigin);
    
    // Only process events that have financial implications
    const financialEvents = [...creditEvents, ...debitEvents];
    
    if (financialEvents.includes(event)) {
      const commissionsToProcess = commissions || [];
      
      if (commissionsToProcess && commissionsToProcess.length > 0) {
        const ledgerEntries = parseCommissionsToLedgerEntries(
          projectId,
          transactionId,
          commissionsToProcess,
          occurredAtLedger,
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
    
    // =====================================================
    // ORDERS CORE SHADOW MODE (PROMPT 2)
    // Duplicate data to new canonical structure
    // This runs in parallel, doesn't affect existing system
    // =====================================================
    let ordersShadowResult = { orderId: null as string | null, itemsCreated: 0, eventsCreated: 0, ledgerProcessed: false, brlUpdated: false };
    
    console.log('[OrdersShadow] Writing to Orders Core (shadow mode)...');
    
    // Find contact for binding
    contactId = await findContactId(supabase, projectId, buyer?.email || null, buyerPhone);
    
    ordersShadowResult = await writeOrderShadow(
      supabase,
      projectId,
      event,
      payload,
      totalPriceBrl,
      ownerNetRevenue,
      ownerNetRevenueBrl, // NEW: Pass BRL converted value
      contactId
    );
    
    if (ordersShadowResult.orderId) {
      console.log(`[OrdersShadow] Success: order=${ordersShadowResult.orderId}, items=${ordersShadowResult.itemsCreated}, events=${ordersShadowResult.eventsCreated}`);
    }
    
    if (ordersShadowResult.errorMessage) {
      providerEventStatus = 'error';
      providerEventErrorMessage = `[OrdersShadow] ${ordersShadowResult.errorMessage}`;
      console.error('[OrdersShadow] Non-blocking error:', ordersShadowResult.errorMessage);
    }
    
    if (ordersShadowResult.ignoredReason === 'debit_without_sale') {
      const ignoreMessage = 'Debit event without prior sale - ignored.';
      await logProviderEvent(supabase, projectId, providerEventId, payload, 'ignored', ignoreMessage);
      return new Response(JSON.stringify({ 
        success: true, 
        message: ignoreMessage,
        transaction: transactionId,
        event,
        status,
        ignored: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!ordersShadowResult.orderId) {
      providerEventStatus = 'error';
      providerEventErrorMessage = providerEventErrorMessage || '[OrdersShadow] No order ID returned.';
      console.error('[OrdersShadow] No order ID returned.');
    }
    
    if (!ordersShadowResult.ledgerProcessed) {
      providerEventStatus = 'error';
      providerEventErrorMessage = providerEventErrorMessage || '[OrdersShadow] Ledger not confirmed.';
      console.error('[OrdersShadow] Ledger not confirmed.');
    }
    
    if (!ordersShadowResult.brlUpdated) {
      providerEventStatus = 'error';
      providerEventErrorMessage = providerEventErrorMessage || '[OrdersShadow] BRL fields not updated.';
      console.error('[OrdersShadow] BRL fields not updated.');
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
        
        const automationUrl = `${supabaseUrl}/functions/v1/automation-engine`;

const automationResponse = await fetch(automationUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${supabaseServiceKey}`, // backend → backend auth
  },
  body: JSON.stringify({
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
  }),
});

if (!automationResponse.ok) {
  const text = await automationResponse.text();
  console.error('[Hotmart Webhook] Automation trigger error:', text);
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

    await logProviderEvent(supabase, projectId, providerEventId, payload, providerEventStatus, providerEventErrorMessage);
    
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
    try {
      if (payload && !providerEventId) {
        providerEventId = payload.id ? `hotmart_payload_${payload.id}` : null;
      }
      if (supabase && projectId && payload && providerEventId) {
        await logProviderEvent(
          supabase,
          projectId,
          providerEventId,
          payload,
          'error',
          error instanceof Error ? error.message : 'Unknown error',
          error instanceof Error ? error.stack ?? null : null
        );
      }
    } catch (logError) {
      console.error('Failed to log provider event error:', logError);
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500, // Force Hotmart retry on internal error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
