import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// FIX LEGACY LEDGER BRL
// ============================================
// 
// Corrige ledger_events legacy que têm currency='BRL' mas amount_brl=NULL
// e atualiza os campos *_brl na tabela orders.
//
// Cenário: pedidos criados antes do Ledger BRL v2.0 têm:
// - ledger_events com source_type='legacy'
// - amount preenchido, amount_brl NULL
// - orders.producer_net_brl NULL
// - orders.ledger_status = 'pending'
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { projectId, daysBack = 30, dryRun = false } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Fix-Legacy-BRL] Starting for project ${projectId}, daysBack=${daysBack}, dryRun=${dryRun}`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const results = {
      ordersProcessed: 0,
      ordersFixed: 0,
      ledgerEventsFixed: 0,
      ledgerStatusUpdated: {
        pending_to_complete: 0,
        pending_to_partial: 0,
      },
      totals: {
        producer_net_brl: 0,
        platform_fee_brl: 0,
        coproducer_brl: 0,
        affiliate_brl: 0,
      },
      errors: [] as string[],
    };

    // Buscar pedidos pending com ledger_events legacy
    const { data: pendingOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, provider_order_id, status, ledger_status')
      .eq('project_id', projectId)
      .eq('ledger_status', 'pending')
      .in('status', ['approved', 'complete'])
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    console.log(`[Fix-Legacy-BRL] Found ${pendingOrders?.length || 0} pending orders`);

    for (const order of pendingOrders || []) {
      results.ordersProcessed++;

      try {
        // Buscar ledger_events deste pedido
        const { data: ledgerEvents, error: leError } = await supabase
          .from('ledger_events')
          .select('*')
          .eq('order_id', order.id);

        if (leError || !ledgerEvents?.length) {
          console.log(`[Fix-Legacy-BRL] No ledger events for order ${order.id}`);
          continue;
        }

        // Verificar se são eventos legacy BRL que precisam de correção
        const legacyBrlEvents = ledgerEvents.filter(
          e => e.source_type === 'legacy' && e.currency === 'BRL' && e.amount_brl === null
        );

        if (legacyBrlEvents.length === 0) {
          console.log(`[Fix-Legacy-BRL] Order ${order.id} has no legacy BRL events to fix`);
          continue;
        }

        // Materializar valores BRL
        let producerNetBrl: number | null = null;
        let platformFeeBrl: number | null = null;
        let coproducerBrl: number | null = null;
        let affiliateBrl: number | null = null;
        let hasAllRequiredEvents = true;

        for (const event of ledgerEvents) {
          const amountBrl = event.currency === 'BRL' ? Math.abs(event.amount) : null;

          if (event.currency !== 'BRL') {
            // Evento internacional sem conversão - marcar como partial
            if (event.event_type === 'platform_fee') {
              hasAllRequiredEvents = false;
            }
            continue;
          }

          // Atualizar ledger_event com amount_brl
          if (!dryRun && event.amount_brl === null && amountBrl !== null) {
            const { error: updateLeError } = await supabase
              .from('ledger_events')
              .update({
                amount_brl: amountBrl,
                amount_accounting: Math.abs(event.amount),
                currency_accounting: 'BRL',
                source_type: 'native_brl',
                conversion_rate: 1,
              })
              .eq('id', event.id);

            if (!updateLeError) {
              results.ledgerEventsFixed++;
            }
          }

          // Acumular valores por tipo
          switch (event.event_type) {
            case 'sale':
              producerNetBrl = amountBrl;
              break;
            case 'platform_fee':
              platformFeeBrl = amountBrl;
              break;
            case 'coproducer':
              coproducerBrl = (coproducerBrl || 0) + (amountBrl || 0);
              break;
            case 'affiliate':
              affiliateBrl = (affiliateBrl || 0) + (amountBrl || 0);
              break;
          }
        }

        // Determinar ledger_status
        const newLedgerStatus = hasAllRequiredEvents ? 'complete' : 'partial';

        // Atualizar order
        if (!dryRun) {
          const orderUpdate: Record<string, any> = {
            ledger_status: newLedgerStatus,
            updated_at: new Date().toISOString(),
          };

          if (producerNetBrl !== null) orderUpdate.producer_net_brl = producerNetBrl;
          if (platformFeeBrl !== null) orderUpdate.platform_fee_brl = platformFeeBrl;
          if (coproducerBrl !== null && coproducerBrl > 0) orderUpdate.coproducer_brl = coproducerBrl;
          if (affiliateBrl !== null && affiliateBrl > 0) orderUpdate.affiliate_brl = affiliateBrl;

          const { error: updateError } = await supabase
            .from('orders')
            .update(orderUpdate)
            .eq('id', order.id);

          if (updateError) {
            results.errors.push(`Order ${order.id}: ${updateError.message}`);
          } else {
            results.ordersFixed++;
            if (newLedgerStatus === 'complete') {
              results.ledgerStatusUpdated.pending_to_complete++;
            } else {
              results.ledgerStatusUpdated.pending_to_partial++;
            }

            // Acumular totais
            if (producerNetBrl) results.totals.producer_net_brl += producerNetBrl;
            if (platformFeeBrl) results.totals.platform_fee_brl += platformFeeBrl;
            if (coproducerBrl) results.totals.coproducer_brl += coproducerBrl;
            if (affiliateBrl) results.totals.affiliate_brl += affiliateBrl;
          }
        } else {
          results.ordersFixed++;
          if (newLedgerStatus === 'complete') {
            results.ledgerStatusUpdated.pending_to_complete++;
          } else {
            results.ledgerStatusUpdated.pending_to_partial++;
          }
        }

      } catch (orderError) {
        console.error(`[Fix-Legacy-BRL] Error processing order ${order.id}:`, orderError);
        results.errors.push(`Order ${order.id}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`);
      }
    }

    console.log(`[Fix-Legacy-BRL] Complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Fix-Legacy-BRL] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
