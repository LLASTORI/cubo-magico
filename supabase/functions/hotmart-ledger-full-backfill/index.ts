import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// HOTMART LEDGER FULL BACKFILL
// ============================================
// This function reads raw_payload from provider_event_log
// and creates ledger_events for EVERY transaction_id.
// 
// Key principle: Each Hotmart transaction generates its own
// commissions[], so we create ledger entries per transaction.
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Events that represent money coming IN (FINANCIALLY EFFECTIVE)
const creditEvents = ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'SUBSCRIPTION_STARTED', 'SWITCH_PLAN'];

// Events that represent money going OUT
const debitEvents = ['PURCHASE_CANCELED', 'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_RECURRENCE_CANCELLATION'];

function isFinanciallyEffectiveEvent(eventName: string): boolean {
  return creditEvents.includes(eventName) || debitEvents.includes(eventName);
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

/**
 * Get the original transaction ID
 */
function getOriginalTransactionId(payload: any): string | null {
  const purchase = payload?.data?.purchase;
  return purchase?.transaction || purchase?.code || null;
}

/**
 * Extract financial breakdown from commissions array
 */
function extractCommissions(commissions: any[]): Array<{
  source: string;
  value: number;
  actorName: string | null;
}> {
  if (!commissions || !Array.isArray(commissions)) return [];
  
  return commissions
    .filter(comm => comm.value && comm.value !== 0)
    .map(comm => ({
      source: (comm.source || '').toUpperCase(),
      value: comm.value,
      actorName: comm.name || null,
    }));
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
    let daysBack = 90; // Default to 90 days

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
      daysBack = body.daysBack || 90;
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project identification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[LedgerBackfill] Starting for project ${projectId}, ${daysBack} days back`);

    // Get events from specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data: events, error: fetchError } = await supabase
      .from('provider_event_log')
      .select('id, provider_event_id, raw_payload, received_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .gte('received_at', startDate.toISOString())
      .order('received_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`[LedgerBackfill] Found ${events?.length || 0} events to process`);

    let eventsProcessed = 0;
    let ledgerCreated = 0;
    let ledgerSkipped = 0;
    let errors = 0;

    for (const event of events || []) {
      try {
        const payload = event.raw_payload;
        if (!payload) continue;

        const hotmartEvent = payload.event || '';
        
        // Only process financially effective events
        if (!isFinanciallyEffectiveEvent(hotmartEvent)) {
          continue;
        }

        const data = payload.data;
        const purchase = data?.purchase;
        const commissions = data?.commissions || [];
        
        const providerOrderId = resolveHotmartOrderId(payload);
        const transactionId = getOriginalTransactionId(payload);
        
        if (!providerOrderId || !transactionId) continue;

        // Strategy 1: Find order by provider_order_id (for main transactions)
        let orderId: string | null = null;
        
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('project_id', projectId)
          .eq('provider', 'hotmart')
          .eq('provider_order_id', providerOrderId)
          .maybeSingle();

        if (order) {
          orderId = order.id;
        } else {
          // Strategy 2: Check provider_order_map for this transaction_id
          const { data: mapping } = await supabase
            .from('provider_order_map')
            .select('order_id')
            .eq('project_id', projectId)
            .eq('provider', 'hotmart')
            .eq('provider_transaction_id', transactionId)
            .maybeSingle();
          
          if (mapping) {
            orderId = mapping.order_id;
          }
        }

        if (!orderId) {
          // Strategy 3: For C1/C2 suffixed transactions, try parent
          const baseTransactionId = transactionId.replace(/C\d+$/, '');
          if (baseTransactionId !== transactionId) {
            const { data: parentOrder } = await supabase
              .from('orders')
              .select('id')
              .eq('project_id', projectId)
              .eq('provider', 'hotmart')
              .eq('provider_order_id', baseTransactionId)
              .maybeSingle();
            
            if (parentOrder) {
              orderId = parentOrder.id;
            }
          }
        }

        if (!orderId) {
          // Final fallback: search in order_items by transaction reference
          continue; // Skip if no order found
        }
        const currency = purchase?.price?.currency_value || 'BRL';
        const occurredAt = purchase?.order_date 
          ? new Date(purchase.order_date).toISOString()
          : event.received_at;
        const isDebit = debitEvents.includes(hotmartEvent);

        // Process each commission entry
        for (const comm of commissions) {
          const source = (comm.source || '').toUpperCase();
          let value = comm.value ?? 0;
          
          if (value === 0) continue;
          
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
          
          const providerEventId = `${transactionId}_${eventType}_${actor}`;
          
          // UPSERT with ON CONFLICT DO NOTHING (idempotent)
          const { error: eventError } = await supabase
            .from('ledger_events')
            .upsert({
              order_id: orderId,
              project_id: projectId,
              provider: 'hotmart',
              event_type: eventType,
              actor,
              actor_name: actorName,
              amount: eventType === 'sale' ? Math.abs(value) : -Math.abs(value),
              currency,
              provider_event_id: providerEventId,
              occurred_at: occurredAt,
              raw_payload: comm,
            }, {
              onConflict: 'provider_event_id',
              ignoreDuplicates: true,
            });
          
          if (!eventError) {
            ledgerCreated++;
          } else {
            ledgerSkipped++;
          }
        }

        // Auto-calculate coproducer if needed
        const hasCoProduction = data?.product?.has_co_production === true;
        const hasCoproducerInCommissions = commissions.some((c: any) => 
          (c.source || '').toUpperCase() === 'CO_PRODUCER'
        );
        
        const totalPriceBrl = purchase?.full_price?.value || purchase?.price?.value || null;
        const ownerNetRevenue = commissions.find((c: any) => 
          (c.source || '').toUpperCase() === 'PRODUCER'
        )?.value || null;

        if (hasCoProduction && !hasCoproducerInCommissions && totalPriceBrl !== null && ownerNetRevenue !== null) {
          const platformFee = commissions.find((c: any) => 
            (c.source || '').toUpperCase() === 'MARKETPLACE'
          )?.value || 0;
          const affiliateAmount = commissions.find((c: any) => 
            (c.source || '').toUpperCase() === 'AFFILIATE'
          )?.value || 0;
          const calculatedCoproducerCost = totalPriceBrl - platformFee - affiliateAmount - ownerNetRevenue;
          
          if (calculatedCoproducerCost > 0) {
            const coproducerEventId = `${transactionId}_coproducer_auto`;
            
            await supabase
              .from('ledger_events')
              .upsert({
                order_id: orderId,
                project_id: projectId,
                provider: 'hotmart',
                event_type: 'coproducer',
                actor: 'coproducer',
                actor_name: null,
                amount: -calculatedCoproducerCost,
                currency,
                provider_event_id: coproducerEventId,
                occurred_at: occurredAt,
                raw_payload: { source: 'auto_calculated', has_co_production: true },
              }, {
                onConflict: 'provider_event_id',
                ignoreDuplicates: true,
              });
            
            ledgerCreated++;
          }
        }

        eventsProcessed++;

      } catch (err) {
        console.error(`[LedgerBackfill] Error processing event:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      projectId,
      daysBack,
      totalEvents: events?.length || 0,
      eventsProcessed,
      ledgerCreated,
      ledgerSkipped,
      errors,
    };

    console.log(`[LedgerBackfill] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[LedgerBackfill] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
