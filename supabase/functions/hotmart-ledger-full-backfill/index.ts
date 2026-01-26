import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// HOTMART LEDGER FULL BACKFILL (OPTIMIZED)
// ============================================
// This function reads raw_payload from provider_event_log
// and creates ledger_events for EVERY transaction_id.
// 
// OPTIMIZED: Pre-loads orders and mappings in batch to avoid
// N+1 query problems and timeouts.
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get projectId from header or body
    const projectCode = req.headers.get('X-Project-Code');
    let projectId: string | null = null;
    let daysBack = 7; // Default to 7 days (safer)
    let batchSize = 200; // Process max 200 events per run

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
      daysBack = body.daysBack || 7;
      batchSize = body.batchSize || 200;
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project identification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[LedgerBackfill] Starting for project ${projectId}, ${daysBack} days back, batch ${batchSize}`);

    // Get events from specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Step 1: Fetch events (limited to batch size)
    const { data: events, error: fetchError } = await supabase
      .from('provider_event_log')
      .select('id, provider_event_id, raw_payload, received_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .gte('received_at', startDate.toISOString())
      .order('received_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    console.log(`[LedgerBackfill] Found ${events?.length || 0} events to process`);

    // Filter only financially effective events first
    const financialEvents = (events || []).filter(event => {
      const hotmartEvent = event.raw_payload?.event || '';
      return isFinanciallyEffectiveEvent(hotmartEvent);
    });

    console.log(`[LedgerBackfill] ${financialEvents.length} are financially effective`);

    if (financialEvents.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        projectId,
        daysBack,
        totalEvents: events?.length || 0,
        financialEvents: 0,
        eventsProcessed: 0,
        ledgerCreated: 0,
        ledgerSkipped: 0,
        errors: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Pre-load ALL orders for this project (batch query)
    const { data: allOrders } = await supabase
      .from('orders')
      .select('id, provider_order_id')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    const ordersByProviderOrderId = new Map<string, string>();
    for (const order of allOrders || []) {
      if (order.provider_order_id) {
        ordersByProviderOrderId.set(order.provider_order_id, order.id);
      }
    }

    console.log(`[LedgerBackfill] Pre-loaded ${ordersByProviderOrderId.size} orders`);

    // Step 3: Pre-load ALL provider_order_map for this project (batch query)
    const { data: allMappings } = await supabase
      .from('provider_order_map')
      .select('order_id, provider_transaction_id')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    const ordersByTransactionId = new Map<string, string>();
    for (const mapping of allMappings || []) {
      if (mapping.provider_transaction_id) {
        ordersByTransactionId.set(mapping.provider_transaction_id, mapping.order_id);
      }
    }

    console.log(`[LedgerBackfill] Pre-loaded ${ordersByTransactionId.size} transaction mappings`);

    // Step 4: Process events using in-memory lookups
    let eventsProcessed = 0;
    let ledgerCreated = 0;
    let ledgerSkipped = 0;
    let errors = 0;

    // Collect all ledger events to insert in batch
    const ledgerEventsToInsert: any[] = [];

    for (const event of financialEvents) {
      try {
        const payload = event.raw_payload;
        if (!payload) continue;

        const hotmartEvent = payload.event || '';
        const data = payload.data;
        const purchase = data?.purchase;
        const commissions = data?.commissions || [];
        
        const providerOrderId = resolveHotmartOrderId(payload);
        const transactionId = getOriginalTransactionId(payload);
        
        if (!providerOrderId || !transactionId) continue;

        // Find order using pre-loaded maps (no queries!)
        let orderId: string | null = null;
        
        // Strategy 1: By provider_order_id
        orderId = ordersByProviderOrderId.get(providerOrderId) || null;

        // Strategy 2: By transaction_id mapping
        if (!orderId) {
          orderId = ordersByTransactionId.get(transactionId) || null;
        }

        // Strategy 3: For C1/C2 suffixed transactions, try parent
        if (!orderId) {
          const baseTransactionId = transactionId.replace(/C\d+$/, '');
          if (baseTransactionId !== transactionId) {
            orderId = ordersByProviderOrderId.get(baseTransactionId) || null;
          }
        }

        if (!orderId) {
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
          
          ledgerEventsToInsert.push({
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
          });
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
            
            ledgerEventsToInsert.push({
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
            });
          }
        }

        eventsProcessed++;

      } catch (err) {
        console.error(`[LedgerBackfill] Error processing event:`, err);
        errors++;
      }
    }

    // Step 5: Batch insert all ledger events (with upsert to skip duplicates)
    console.log(`[LedgerBackfill] Batch inserting ${ledgerEventsToInsert.length} ledger events`);

    if (ledgerEventsToInsert.length > 0) {
      // Process in chunks of 100 to avoid payload size limits
      const chunkSize = 100;
      for (let i = 0; i < ledgerEventsToInsert.length; i += chunkSize) {
        const chunk = ledgerEventsToInsert.slice(i, i + chunkSize);
        
        const { error: insertError, data: insertedData } = await supabase
          .from('ledger_events')
          .upsert(chunk, {
            onConflict: 'provider_event_id',
            ignoreDuplicates: true,
          })
          .select('id');

        if (insertError) {
          console.error(`[LedgerBackfill] Batch insert error:`, insertError);
          errors += chunk.length;
        } else {
          ledgerCreated += insertedData?.length || 0;
          ledgerSkipped += chunk.length - (insertedData?.length || 0);
        }
      }
    }

    const result = {
      success: true,
      projectId,
      daysBack,
      totalEvents: events?.length || 0,
      financialEvents: financialEvents.length,
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
