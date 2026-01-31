import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// BACKFILL producer_net_brl FROM raw_payload
// Extracts: commissions[source=PRODUCER].currency_conversion.converted_value
// Fallback: commissions[source=PRODUCER].value (assumed BRL)
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Commission {
  source?: string;
  value?: number;
  currency_conversion?: {
    converted_value?: number;
    currency?: string;
  };
}

function extractProducerNetBrl(payload: any): number | null {
  try {
    const commissions = payload?.data?.commissions;
    if (!Array.isArray(commissions)) return null;

    // Primeiro, tentar PRODUCER (user é produtor principal)
    const producerComm = commissions.find((c: Commission) => c.source === 'PRODUCER');
    if (producerComm) {
      // Priority: converted_value (BRL) > value (fallback, assumed BRL)
      const convertedValue = producerComm.currency_conversion?.converted_value;
      if (typeof convertedValue === 'number') {
        return convertedValue;
      }
      if (typeof producerComm.value === 'number') {
        return producerComm.value;
      }
    }

    // Se não houver PRODUCER, tentar CO_PRODUCER (user é co-produtor)
    const coproducerComm = commissions.find((c: Commission) => c.source === 'COPRODUCER' || c.source === 'CO_PRODUCER');
    if (coproducerComm) {
      const convertedValue = coproducerComm.currency_conversion?.converted_value;
      if (typeof convertedValue === 'number') {
        return convertedValue;
      }
      if (typeof coproducerComm.value === 'number') {
        return coproducerComm.value;
      }
    }

    return null;
  } catch (e) {
    console.error('[BackfillProducerNetBrl] Error extracting value:', e);
    return null;
  }
}

function extractTransactionId(payload: any): string | null {
  return payload?.data?.purchase?.transaction || null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const projectId = body.projectId;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[BackfillProducerNetBrl] Starting for project ${projectId}`);

    // PHASE 1: Get orders with NULL producer_net_brl
    const { data: ordersToUpdate, error: ordersError } = await supabase
      .from('orders')
      .select('id, provider_order_id')
      .eq('project_id', projectId)
      .is('producer_net_brl', null);

    if (ordersError) throw ordersError;

    if (!ordersToUpdate || ordersToUpdate.length === 0) {
      console.log('[BackfillProducerNetBrl] No orders need backfill');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No orders need backfill',
        ordersUpdated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[BackfillProducerNetBrl] Found ${ordersToUpdate.length} orders to process`);

    // PHASE 2: Get ALL Hotmart events for this project
    const { data: events, error: eventsError } = await supabase
      .from('provider_event_log')
      .select('raw_payload')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    if (eventsError) throw eventsError;

    // PHASE 3: Build transaction → BRL value map
    const transactionBrlMap = new Map<string, number>();
    
    for (const event of events || []) {
      const payload = event.raw_payload;
      if (!payload) continue;
      
      const transactionId = extractTransactionId(payload);
      if (!transactionId) continue;
      
      // Only process if we don't have this transaction yet
      // (first occurrence wins - chronologically first event)
      if (transactionBrlMap.has(transactionId)) continue;
      
      const brlValue = extractProducerNetBrl(payload);
      if (brlValue !== null) {
        transactionBrlMap.set(transactionId, brlValue);
      }
    }

    console.log(`[BackfillProducerNetBrl] Extracted BRL values for ${transactionBrlMap.size} transactions`);

    // PHASE 4: Update orders in batches
    let ordersUpdated = 0;
    let ordersSkipped = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < ordersToUpdate.length; i += BATCH_SIZE) {
      const batch = ordersToUpdate.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (order) => {
        const brlValue = transactionBrlMap.get(order.provider_order_id);
        
        if (brlValue === undefined || brlValue === null) {
          ordersSkipped++;
          return;
        }

        const { error } = await supabase
          .from('orders')
          .update({ producer_net_brl: brlValue })
          .eq('id', order.id);

        if (error) {
          console.error(`[BackfillProducerNetBrl] Error updating order ${order.id}:`, error);
        } else {
          ordersUpdated++;
        }
      }));
    }

    const result = {
      success: true,
      totalOrdersToProcess: ordersToUpdate.length,
      transactionsWithBrlValue: transactionBrlMap.size,
      ordersUpdated,
      ordersSkipped,
    };

    console.log(`[BackfillProducerNetBrl] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[BackfillProducerNetBrl] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
