import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// BACKFILL PAYMENT METHOD
// Updates orders.payment_method from provider_event_log payloads
// Only fills null values, never overwrites existing data
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Normalize Hotmart payment type to canonical format
 */
function normalizePaymentMethod(rawPaymentType: string | null): string {
  if (!rawPaymentType) return 'unknown';
  
  switch (rawPaymentType.toUpperCase()) {
    case 'CREDIT_CARD': return 'credit_card';
    case 'PIX': return 'pix';
    case 'BILLET': return 'billet';
    case 'PAYPAL': return 'paypal';
    case 'APPLE_PAY': return 'apple_pay';
    case 'GOOGLE_PAY': return 'google_pay';
    case 'WALLET': return 'wallet';
    default: return 'unknown';
  }
}

/**
 * Resolve Hotmart Order ID from payload (same logic as webhook)
 */
function resolveHotmartOrderId(payload: any): string | null {
  const data = payload?.data;
  const purchase = data?.purchase;
  
  if (!purchase) return null;
  
  if (purchase.order_bump?.is_order_bump && purchase.order_bump?.parent_purchase_transaction) {
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  const offerName = purchase.offer?.name?.toLowerCase() || '';
  const isUpsell = offerName.includes('upsell');
  const isDownsell = offerName.includes('downsell');
  
  if ((isUpsell || isDownsell) && purchase.order_bump?.parent_purchase_transaction) {
    return purchase.order_bump.parent_purchase_transaction;
  }
  
  if (purchase.parent_purchase_transaction) {
    return purchase.parent_purchase_transaction;
  }
  
  if (purchase.transaction) {
    return purchase.transaction;
  }
  
  if (data?.order?.id) {
    return String(data.order.id);
  }
  
  if (purchase.code) {
    return purchase.code;
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId;
    const days = body.days || 14;
    
    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[BackfillPaymentMethod] Starting for project ${projectId}, days=${days}`);

    // 1. Get orders with null payment_method
    const { data: ordersToFix, error: ordersError } = await supabase
      .from('orders')
      .select('id, provider_order_id')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .is('payment_method', null)
      .limit(500);

    if (ordersError) throw ordersError;

    console.log(`[BackfillPaymentMethod] Found ${ordersToFix?.length || 0} orders with null payment_method`);

    if (!ordersToFix || ordersToFix.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No orders need payment method backfill',
        ordersFixed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. For each order, find the financial event in provider_event_log
    let ordersFixed = 0;
    const errors: string[] = [];

    // Get start date for event search
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (const order of ordersToFix) {
      try {
        // Find events for this order (looking for PURCHASE_APPROVED or PURCHASE_COMPLETE)
        const { data: events } = await supabase
          .from('provider_event_log')
          .select('raw_payload')
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .gte('received_at', startDate.toISOString())
          .order('received_at', { ascending: false })
          .limit(1000);

        if (!events) continue;

        // Find matching event for this order
        let foundPaymentMethod: string | null = null;
        let foundPaymentType: string | null = null;
        let foundInstallments: number | null = null;

        for (const event of events) {
          const payload = event.raw_payload;
          if (!payload) continue;

          const eventType = payload.event;
          
          // Only look at financial events
          if (!['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_STARTED'].includes(eventType)) {
            continue;
          }

          const resolvedOrderId = resolveHotmartOrderId(payload);
          
          if (resolvedOrderId === order.provider_order_id) {
            const purchase = payload.data?.purchase;
            const paymentType = purchase?.payment?.type || null;
            
            if (paymentType) {
              foundPaymentMethod = normalizePaymentMethod(paymentType);
              foundPaymentType = paymentType;
              foundInstallments = purchase?.payment?.installments_number || 1;
              break; // Found it!
            }
          }
        }

        // Update order if we found payment info
        if (foundPaymentMethod && foundPaymentMethod !== 'unknown') {
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              payment_method: foundPaymentMethod,
              payment_type: foundPaymentType,
              installments: foundInstallments,
              updated_at: new Date().toISOString(),
            })
            .eq('id', order.id);

          if (updateError) {
            errors.push(`Order ${order.id}: ${updateError.message}`);
          } else {
            ordersFixed++;
            console.log(`[BackfillPaymentMethod] Fixed order ${order.provider_order_id}: ${foundPaymentMethod}`);
          }
        } else {
          console.log(`[BackfillPaymentMethod] No payment info found for order ${order.provider_order_id}`);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        errors.push(`Order ${order.id}: ${errorMessage}`);
      }
    }

    console.log(`[BackfillPaymentMethod] Completed: ${ordersFixed} orders fixed, ${errors.length} errors`);

    return new Response(JSON.stringify({ 
      success: true,
      ordersToFix: ordersToFix.length,
      ordersFixed,
      errors: errors.slice(0, 10), // Only return first 10 errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BackfillPaymentMethod] Error:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
