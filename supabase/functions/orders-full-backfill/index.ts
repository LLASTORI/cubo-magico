import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// ORDERS FULL BACKFILL - Complete UTM + Item Linking
// OPTIMIZED: Uses batch processing for speed
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ParsedUTMs {
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_placement: string | null;
  utm_creative: string | null;
  raw_sck: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
}

function parseSCKtoUTMs(checkoutOrigin: string | null): ParsedUTMs {
  const result: ParsedUTMs = {
    utm_source: null,
    utm_campaign: null,
    utm_adset: null,
    utm_placement: null,
    utm_creative: null,
    raw_sck: checkoutOrigin,
    meta_campaign_id: null,
    meta_adset_id: null,
    meta_ad_id: null,
  };
  
  if (!checkoutOrigin || checkoutOrigin.trim() === '') {
    return result;
  }
  
  const parts = checkoutOrigin.split('|').map(p => p.trim());
  
  if (parts.length >= 1 && parts[0]) result.utm_source = parts[0];
  
  if (parts.length >= 2 && parts[1]) {
    result.utm_adset = parts[1];
    const adsetIdMatch = parts[1].match(/_(\d{10,})$/);
    if (adsetIdMatch) result.meta_adset_id = adsetIdMatch[1];
  }
  
  if (parts.length >= 3 && parts[2]) {
    result.utm_campaign = parts[2];
    const campaignIdMatch = parts[2].match(/_(\d{10,})$/);
    if (campaignIdMatch) result.meta_campaign_id = campaignIdMatch[1];
  }
  
  if (parts.length >= 4 && parts[3]) result.utm_placement = parts[3];
  
  if (parts.length >= 5 && parts[4]) {
    result.utm_creative = parts[4];
    const adIdMatch = parts[4].match(/_(\d{10,})$/);
    if (adIdMatch) result.meta_ad_id = adIdMatch[1];
  }
  
  return result;
}

function resolveSCK(payload: any): string | null {
  const data = payload?.data;
  const purchase = data?.purchase;
  return purchase?.origin?.sck 
    || purchase?.checkout_origin 
    || purchase?.tracking?.source_sck 
    || purchase?.tracking?.source 
    || null;
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

    console.log(`[FullBackfill] Starting for project ${projectId}`);

    // PHASE 1: Get ALL events
    const { data: events, error: fetchError } = await supabase
      .from('provider_event_log')
      .select('raw_payload')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart');

    if (fetchError) throw fetchError;

    // PHASE 2: Build transaction→SCK map
    const transactionSCKMap = new Map<string, ParsedUTMs>();
    
    for (const event of events || []) {
      const payload = event.raw_payload;
      if (!payload) continue;
      
      const transactionId = extractTransactionId(payload);
      if (!transactionId || transactionSCKMap.has(transactionId)) continue;
      
      const sck = resolveSCK(payload);
      if (sck) {
        transactionSCKMap.set(transactionId, parseSCKtoUTMs(sck));
      }
    }

    console.log(`[FullBackfill] Extracted SCK for ${transactionSCKMap.size} transactions`);

    // PHASE 3: Get offer_mappings
    const { data: offerMappings } = await supabase
      .from('offer_mappings')
      .select('codigo_oferta, funnel_id')
      .eq('project_id', projectId);

    const offerToFunnelMap = new Map<string, string>();
    offerMappings?.forEach(m => {
      if (m.codigo_oferta && m.funnel_id) {
        offerToFunnelMap.set(m.codigo_oferta, m.funnel_id);
      }
    });

    // PHASE 4: Update orders in PARALLEL batches
    const { data: orders } = await supabase
      .from('orders')
      .select('id, provider_order_id')
      .eq('project_id', projectId)
      .is('utm_source', null); // Only orders missing UTMs

    let ordersUpdated = 0;
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < (orders?.length || 0); i += BATCH_SIZE) {
      const batch = orders!.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (order) => {
        const utms = transactionSCKMap.get(order.provider_order_id);
        if (!utms?.utm_source) return;

        const { error } = await supabase
          .from('orders')
          .update({
            utm_source: utms.utm_source,
            utm_campaign: utms.utm_campaign,
            utm_adset: utms.utm_adset,
            utm_placement: utms.utm_placement,
            utm_creative: utms.utm_creative,
            raw_sck: utms.raw_sck,
            meta_campaign_id: utms.meta_campaign_id,
            meta_adset_id: utms.meta_adset_id,
            meta_ad_id: utms.meta_ad_id,
          })
          .eq('id', order.id);

        if (!error) ordersUpdated++;
      }));
    }

    console.log(`[FullBackfill] Updated ${ordersUpdated} orders`);

    // PHASE 5: Link order_items to funnels
    const { data: itemsWithoutFunnel } = await supabase
      .from('order_items')
      .select('id, provider_offer_id')
      .eq('project_id', projectId)
      .is('funnel_id', null);

    let itemsLinked = 0;

    for (let i = 0; i < (itemsWithoutFunnel?.length || 0); i += BATCH_SIZE) {
      const batch = itemsWithoutFunnel!.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (item) => {
        const funnelId = offerToFunnelMap.get(item.provider_offer_id || '');
        if (!funnelId) return;

        const { error } = await supabase
          .from('order_items')
          .update({ funnel_id: funnelId })
          .eq('id', item.id);

        if (!error) itemsLinked++;
      }));
    }

    const result = {
      success: true,
      totalEvents: events?.length || 0,
      transactionsWithSCK: transactionSCKMap.size,
      ordersUpdated,
      itemsLinkedToFunnels: itemsLinked,
    };

    console.log(`[FullBackfill] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[FullBackfill] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
