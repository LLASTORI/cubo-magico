import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// HOTMART LEDGER BRL BACKFILL
// ============================================
// 
// Processa provider_event_log histórico e gera ledger_events
// com campos BRL nativos usando as mesmas regras canônicas do webhook.
//
// REGRAS:
// 1. Ledger financeiro APENAS contém valores BRL REAIS
// 2. commissions[].value (USD) é dado CONTÁBIL, não caixa
// 3. currency_conversion.converted_value é a fonte de verdade para BRL
// 4. Nenhuma conversão manual é permitida
// 5. Sem conversão no webhook = sem entrada no ledger
//
// DECISÃO B: Para internacionais sem currency_conversion em MARKETPLACE,
//            NÃO gerar evento de platform_fee (ledger_status = 'partial')
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// BRL EXTRACTION LOGIC (Same as webhook)
// ============================================

interface BrlExtraction {
  amount_brl: number | null;
  amount_accounting: number;
  currency_accounting: string;
  conversion_rate: number | null;
  source_type: 'native_brl' | 'converted' | 'blocked';
  should_create_event: boolean;
  block_reason: string | null;
}

function extractBrlFromCommission(
  commission: any,
  orderCurrency: string
): BrlExtraction {
  const accountingValue = commission.value ?? 0;
  const accountingCurrency = commission.currency_code || commission.currency_value || orderCurrency || 'BRL';
  const source = (commission.source || '').toUpperCase();
  
  // Case 1: Native BRL order
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
  
  // Case 2: International with conversion
  const currencyConversion = commission.currency_conversion;
  
  if (currencyConversion && currencyConversion.converted_value !== undefined) {
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
  
  // Case 3: International WITHOUT conversion - BLOCKED (Decision B)
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

function determineLedgerStatus(extractions: BrlExtraction[]): 'complete' | 'partial' | 'blocked' {
  const hasBlocked = extractions.some(e => e.source_type === 'blocked');
  const hasCreated = extractions.some(e => e.should_create_event);
  
  if (hasBlocked && hasCreated) return 'partial';
  if (hasBlocked && !hasCreated) return 'blocked';
  return 'complete';
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { projectId, daysBack = 30, pageSize = 500, dryRun = false } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[BRL-Backfill] Starting for project ${projectId}, daysBack=${daysBack}, pageSize=${pageSize}, dryRun=${dryRun}`);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const results = {
      totalEvents: 0,
      eventsProcessed: 0,
      ledgerCreated: 0,
      ledgerSkipped: 0,
      ledgerBlocked: 0,
      ordersUpdated: 0,
      errors: 0,
      brlNative: 0,
      brlConverted: 0,
      details: [] as Array<{
        transaction_id: string;
        status: 'created' | 'skipped' | 'blocked' | 'error';
        ledger_status: string;
        message: string;
      }>,
    };

    // Fetch approved events from provider_event_log
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      console.log(`[BRL-Backfill] Fetching page at offset ${offset}...`);
      
      const { data: events, error: fetchError } = await supabase
        .from('provider_event_log')
        .select('*')
        .eq('project_id', projectId)
        .eq('provider', 'hotmart')
        .in('raw_payload->>event', ['PURCHASE_APPROVED', 'PURCHASE_COMPLETE'])
        .gte('received_at', startDate.toISOString())
        .order('received_at', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (fetchError) {
        console.error(`[BRL-Backfill] Error fetching events:`, fetchError);
        throw fetchError;
      }

      if (!events || events.length === 0) {
        hasMore = false;
        break;
      }

      results.totalEvents += events.length;
      console.log(`[BRL-Backfill] Processing ${events.length} events...`);

      // Pre-load existing ledger event IDs to avoid N+1
      const transactionIds = events
        .map((e: any) => e.raw_payload?.data?.purchase?.transaction)
        .filter(Boolean);
      
      const existingLedgerIds = new Set<string>();
      
      if (transactionIds.length > 0) {
        // Chunk to avoid URI too long
        const chunks = [];
        for (let i = 0; i < transactionIds.length; i += 50) {
          chunks.push(transactionIds.slice(i, i + 50));
        }
        
        for (const chunk of chunks) {
          const { data: existing } = await supabase
            .from('ledger_events')
            .select('provider_event_id')
            .eq('project_id', projectId)
            .in('provider_event_id', chunk.map((t: string) => `${t}_sale_producer`));
          
          for (const row of existing || []) {
            if (row.provider_event_id) {
              // Extract transaction_id from provider_event_id
              const txId = row.provider_event_id.split('_sale_')[0];
              existingLedgerIds.add(txId);
            }
          }
        }
      }

      // Process each event
      for (const event of events) {
        try {
          const payload = event.raw_payload;
          const transactionId = payload?.data?.purchase?.transaction;
          
          if (!transactionId) {
            console.log(`[BRL-Backfill] Skipping event without transaction_id`);
            continue;
          }

          results.eventsProcessed++;

          // Skip if ledger already exists for this transaction
          if (existingLedgerIds.has(transactionId)) {
            results.ledgerSkipped++;
            continue;
          }

          // Find order by transaction
          const { data: orderMapping } = await supabase
            .from('provider_order_map')
            .select('order_id')
            .eq('project_id', projectId)
            .eq('provider', 'hotmart')
            .eq('provider_transaction_id', transactionId)
            .maybeSingle();

          let orderId = orderMapping?.order_id;

          if (!orderId) {
            // Try to find by provider_order_id
            const providerOrderId = transactionId;
            const { data: order } = await supabase
              .from('orders')
              .select('id')
              .eq('project_id', projectId)
              .eq('provider', 'hotmart')
              .eq('provider_order_id', providerOrderId)
              .maybeSingle();
            
            orderId = order?.id;
          }

          if (!orderId) {
            console.log(`[BRL-Backfill] No order found for transaction ${transactionId}, skipping`);
            results.errors++;
            results.details.push({
              transaction_id: transactionId,
              status: 'error',
              ledger_status: 'blocked',
              message: 'No order found',
            });
            continue;
          }

          // Extract financial data
          const data = payload?.data;
          const purchase = data?.purchase;
          const commissions = data?.commissions || [];
          const currency = purchase?.price?.currency_value || 'BRL';
          const occurredAt = purchase?.approved_date || purchase?.order_date || event.received_at;

          // Process commissions with BRL extraction
          const ledgerEventsToCreate: any[] = [];
          const brlExtractions: BrlExtraction[] = [];
          
          let materializedPlatformFeeBrl: number | null = null;
          let materializedAffiliateBrl: number | null = null;
          let materializedCoproducerBrl: number | null = null;

          for (const comm of commissions) {
            const source = (comm.source || '').toUpperCase();
            const brlExtraction = extractBrlFromCommission(comm, currency);
            brlExtractions.push(brlExtraction);

            if (!brlExtraction.should_create_event) {
              if (brlExtraction.block_reason) {
                console.log(`[BRL-Backfill] ${transactionId}: ${brlExtraction.block_reason}`);
              }
              continue;
            }

            let eventType: string;
            let actor: string;
            let actorName: string | null = null;

            switch (source) {
              case 'MARKETPLACE':
                eventType = 'platform_fee';
                actor = 'platform';
                actorName = 'hotmart';
                materializedPlatformFeeBrl = brlExtraction.amount_brl !== null ? Math.abs(brlExtraction.amount_brl) : null;
                break;
              case 'PRODUCER':
                eventType = 'sale';
                actor = 'producer';
                if (brlExtraction.source_type === 'native_brl') results.brlNative++;
                if (brlExtraction.source_type === 'converted') results.brlConverted++;
                break;
              case 'CO_PRODUCER':
                eventType = 'coproducer';
                actor = 'coproducer';
                actorName = data?.producer?.name || null;
                materializedCoproducerBrl = brlExtraction.amount_brl !== null ? Math.abs(brlExtraction.amount_brl) : null;
                break;
              case 'AFFILIATE':
                eventType = 'affiliate';
                actor = 'affiliate';
                actorName = data?.affiliates?.[0]?.name || null;
                materializedAffiliateBrl = brlExtraction.amount_brl !== null ? Math.abs(brlExtraction.amount_brl) : null;
                break;
              default:
                continue;
            }

            const providerEventId = `${transactionId}_${eventType}_${actor}`;
            const displayAmount = eventType === 'sale' 
              ? Math.abs(brlExtraction.amount_accounting) 
              : -Math.abs(brlExtraction.amount_accounting);

            ledgerEventsToCreate.push({
              order_id: orderId,
              project_id: projectId,
              provider: 'hotmart',
              event_type: eventType,
              actor,
              actor_name: actorName,
              amount: displayAmount,
              amount_brl: brlExtraction.amount_brl,
              amount_accounting: Math.abs(brlExtraction.amount_accounting),
              currency_accounting: brlExtraction.currency_accounting,
              conversion_rate: brlExtraction.conversion_rate,
              source_type: brlExtraction.source_type,
              currency,
              provider_event_id: providerEventId,
              occurred_at: occurredAt,
              raw_payload: { source: 'brl_backfill', original_commission: comm },
            });
          }

          const ledgerStatus = determineLedgerStatus(brlExtractions);

          if (ledgerEventsToCreate.length === 0) {
            results.ledgerBlocked++;
            results.details.push({
              transaction_id: transactionId,
              status: 'blocked',
              ledger_status: ledgerStatus,
              message: 'No valid BRL commissions to process',
            });
            continue;
          }

          // Insert ledger events (if not dry run)
          if (!dryRun) {
            for (const ledgerEvent of ledgerEventsToCreate) {
              // Check if already exists
              const { data: existing } = await supabase
                .from('ledger_events')
                .select('id')
                .eq('provider_event_id', ledgerEvent.provider_event_id)
                .maybeSingle();

              if (existing) {
                results.ledgerSkipped++;
                continue;
              }

              const { error: insertError } = await supabase
                .from('ledger_events')
                .insert(ledgerEvent);

              if (insertError) {
                console.error(`[BRL-Backfill] Insert error for ${ledgerEvent.provider_event_id}:`, insertError);
                results.errors++;
              } else {
                results.ledgerCreated++;
              }
            }

            // Update order with BRL fields
            const orderUpdate: Record<string, any> = {
              ledger_status: ledgerStatus,
              updated_at: new Date().toISOString(),
            };
            
            if (materializedPlatformFeeBrl !== null) orderUpdate.platform_fee_brl = materializedPlatformFeeBrl;
            if (materializedAffiliateBrl !== null) orderUpdate.affiliate_brl = materializedAffiliateBrl;
            if (materializedCoproducerBrl !== null) orderUpdate.coproducer_brl = materializedCoproducerBrl;

            const { error: updateError } = await supabase
              .from('orders')
              .update(orderUpdate)
              .eq('id', orderId);

            if (!updateError) {
              results.ordersUpdated++;
            }
          }

          results.details.push({
            transaction_id: transactionId,
            status: 'created',
            ledger_status: ledgerStatus,
            message: `Created ${ledgerEventsToCreate.length} ledger events`,
          });

        } catch (eventError) {
          console.error(`[BRL-Backfill] Error processing event:`, eventError);
          results.errors++;
        }
      }

      offset += pageSize;
      
      if (events.length < pageSize) {
        hasMore = false;
      }
    }

    console.log(`[BRL-Backfill] Complete:`, {
      totalEvents: results.totalEvents,
      eventsProcessed: results.eventsProcessed,
      ledgerCreated: results.ledgerCreated,
      ledgerSkipped: results.ledgerSkipped,
      ledgerBlocked: results.ledgerBlocked,
      ordersUpdated: results.ordersUpdated,
      brlNative: results.brlNative,
      brlConverted: results.brlConverted,
      errors: results.errors,
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
        // Limit details in response (first 100)
        details: results.details.slice(0, 100),
        detailsTruncated: results.details.length > 100,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BRL-Backfill] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
