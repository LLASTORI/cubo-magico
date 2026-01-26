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
    let pageSize = 1000; // Fetch provider logs in pages (Supabase limit is typically 1000)

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
      // Backwards compatibility: accept batchSize or pageSize
      pageSize = body.pageSize || body.batchSize || 1000;
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project identification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[LedgerBackfill] Starting for project ${projectId}, ${daysBack} days back, pageSize ${pageSize}`);

    // Get events from specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Step 1: Pre-load ALL Hotmart orders for this project (batch query)
    type OrderMeta = {
      id: string;
      status: string | null;
      customer_paid: number;
      gross_base: number | null;
      producer_net: number;
      provider_order_id: string | null;
    };

    const { data: allOrders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, provider_order_id, status, customer_paid, gross_base, producer_net')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    if (ordersErr) throw ordersErr;

    const ordersById = new Map<string, OrderMeta>();
    const ordersByProviderOrderId = new Map<string, string>();
    for (const o of allOrders || []) {
      const meta: OrderMeta = {
        id: o.id,
        status: o.status ?? null,
        customer_paid: Number(o.customer_paid) || 0,
        gross_base: o.gross_base === null || o.gross_base === undefined ? null : Number(o.gross_base),
        producer_net: Number(o.producer_net) || 0,
        provider_order_id: o.provider_order_id ?? null,
      };
      ordersById.set(meta.id, meta);
      if (meta.provider_order_id) {
        ordersByProviderOrderId.set(meta.provider_order_id, meta.id);
      }
    }

    console.log(`[LedgerBackfill] Pre-loaded ${ordersByProviderOrderId.size} orders`);

    // Step 2: Pre-load ALL provider_order_map for this project (batch query)
    const { data: allMappings, error: mappingsErr } = await supabase
      .from('provider_order_map')
      .select('order_id, provider_transaction_id')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    if (mappingsErr) throw mappingsErr;

    const ordersByTransactionId = new Map<string, string>();
    for (const mapping of allMappings || []) {
      if (mapping.provider_transaction_id) {
        ordersByTransactionId.set(mapping.provider_transaction_id, mapping.order_id);
      }
    }

    console.log(`[LedgerBackfill] Pre-loaded ${ordersByTransactionId.size} transaction mappings`);

    // Step 3: Process provider events with pagination to bypass 1000 limit
    let eventsProcessed = 0;
    let ledgerCreated = 0;
    let ledgerSkipped = 0;
    let errors = 0;
    let totalEventsFetched = 0;
    let totalFinancialEvents = 0;
    let pages = 0;

    const shouldProcessOrder = (orderId: string): boolean => {
      const meta = ordersById.get(orderId);
      if (!meta) return false;
      const isApproved = meta.status === 'approved' || meta.status === 'complete';
      if (!isApproved) return false;
      const base = meta.gross_base ?? meta.customer_paid;
      return base > 0 && meta.producer_net > 0;
    };

    const getExistingProviderEventIds = async (providerEventIds: string[]): Promise<Set<string>> => {
      const existing = new Set<string>();
      const CHUNK = 800;
      for (let i = 0; i < providerEventIds.length; i += CHUNK) {
        const slice = providerEventIds.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('ledger_events')
          .select('provider_event_id')
          .in('provider_event_id', slice);
        if (error) throw error;
        for (const row of data || []) {
          if (row.provider_event_id) existing.add(row.provider_event_id);
        }
      }
      return existing;
    };

    for (let offset = 0; ; offset += pageSize) {
      pages++;

      const { data: pageEvents, error: fetchError } = await supabase
        .from('provider_event_log')
        .select('id, provider_event_id, raw_payload, received_at')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .gte('received_at', startDate.toISOString())
        // newest first so recent issues are fixed first
        .order('received_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (fetchError) throw fetchError;

      const events = pageEvents || [];
      totalEventsFetched += events.length;

      if (events.length === 0) {
        break;
      }

      // Filter only financially effective events first
      const financialEvents = events.filter(event => {
        const hotmartEvent = event.raw_payload?.event || '';
        return isFinanciallyEffectiveEvent(hotmartEvent);
      });

      totalFinancialEvents += financialEvents.length;

      console.log(`[LedgerBackfill] Page ${pages} fetched ${events.length} events (${financialEvents.length} financial)`);

      // Collect ledger events to insert for THIS page
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

          if (!orderId) continue;
          if (!shouldProcessOrder(orderId)) continue;

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

      // Insert page events
      if (ledgerEventsToInsert.length > 0) {
        const allProviderEventIds = ledgerEventsToInsert.map(e => e.provider_event_id).filter(Boolean);
        const existingIds = await getExistingProviderEventIds(allProviderEventIds);
        const newEvents = ledgerEventsToInsert.filter(e => !existingIds.has(e.provider_event_id));

        ledgerSkipped += ledgerEventsToInsert.length - newEvents.length;
        console.log(`[LedgerBackfill] Page ${pages}: ${ledgerEventsToInsert.length} candidates, ${newEvents.length} new`);

        const chunkSize = 50;
        for (let i = 0; i < newEvents.length; i += chunkSize) {
          const chunk = newEvents.slice(i, i + chunkSize);
          const { error: insertError, data: insertedData } = await supabase
            .from('ledger_events')
            .insert(chunk)
            .select('id');

          if (insertError) {
            console.error(`[LedgerBackfill] Batch insert error:`, insertError);
            errors += chunk.length;
          } else {
            ledgerCreated += insertedData?.length || 0;
          }
        }
      }

      if (events.length < pageSize) {
        break;
      }
    }

    const result = {
      success: true,
      projectId,
      daysBack,
      pageSize,
      pages,
      totalEvents: totalEventsFetched,
      financialEvents: totalFinancialEvents,
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
