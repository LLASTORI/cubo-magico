import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// HOTMART BACKFILL 14D - Reprocess from provider_event_log
// ============================================
// This function reads raw_payload from provider_event_log
// and rewrites:
//   - hotmart_sales (UTMs + financials)
//   - sales_core_events.attribution
//   - finance_ledger.attribution
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ============================================
// SCK → UTM Parser (100% RAW, no normalization)
// ============================================
interface ParsedUTMs {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  raw_checkout_origin: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
}

function parseSCKtoUTMs(checkoutOrigin: string | null): ParsedUTMs {
  const result: ParsedUTMs = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    raw_checkout_origin: checkoutOrigin,
    meta_campaign_id: null,
    meta_adset_id: null,
    meta_ad_id: null,
  };
  
  if (!checkoutOrigin || checkoutOrigin.trim() === '') {
    return result;
  }
  
  const parts = checkoutOrigin.split('|').map(p => p.trim());
  
  // parts[0] = utm_source (ex: "Meta-Ads") - RAW, never normalize!
  if (parts.length >= 1 && parts[0]) {
    result.utm_source = parts[0];
  }
  
  // parts[1] = utm_medium (ex: "00_ADVANTAGE_6845240173892")
  if (parts.length >= 2 && parts[1]) {
    result.utm_medium = parts[1];
    const adsetIdMatch = parts[1].match(/_(\d{10,})$/);
    if (adsetIdMatch) {
      result.meta_adset_id = adsetIdMatch[1];
    }
  }
  
  // parts[2] = utm_campaign
  if (parts.length >= 3 && parts[2]) {
    result.utm_campaign = parts[2];
    const campaignIdMatch = parts[2].match(/_(\d{10,})$/);
    if (campaignIdMatch) {
      result.meta_campaign_id = campaignIdMatch[1];
    }
  }
  
  // parts[3] = utm_term (placement)
  if (parts.length >= 4 && parts[3]) {
    result.utm_term = parts[3];
  }
  
  // parts[4] = utm_content (creative)
  if (parts.length >= 5 && parts[4]) {
    result.utm_content = parts[4];
    const adIdMatch = parts[4].match(/_(\d{10,})$/);
    if (adIdMatch) {
      result.meta_ad_id = adIdMatch[1];
    }
  }
  
  return result;
}

// Resolve SCK from multiple possible payload locations
function resolveSCK(payload: any): string | null {
  const data = payload?.data;
  const purchase = data?.purchase;
  
  // Priority order for SCK resolution
  return purchase?.origin?.sck 
    || purchase?.checkout_origin 
    || purchase?.tracking?.source_sck 
    || purchase?.tracking?.source 
    || null;
}

// Extract financial breakdown from commissions array
function extractFinancials(commissions: any[]): {
  platformFee: number | null;
  ownerNet: number | null;
  affiliateAmount: number | null;
  coproducerAmount: number | null;
} {
  const result = { platformFee: null as number | null, ownerNet: null as number | null, affiliateAmount: null as number | null, coproducerAmount: null as number | null };
  
  if (!commissions || !Array.isArray(commissions)) return result;
  
  for (const comm of commissions) {
    const source = (comm.source || '').toUpperCase();
    const value = comm.value ?? null;
    
    switch (source) {
      case 'MARKETPLACE': result.platformFee = value; break;
      case 'PRODUCER': result.ownerNet = value; break;
      case 'AFFILIATE': result.affiliateAmount = value; break;
      case 'CO_PRODUCER': result.coproducerAmount = value; break;
    }
  }
  
  return result;
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
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project identification required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Backfill14d] Starting for project ${projectId}`);

    // Get events from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: events, error: fetchError } = await supabase
      .from('provider_event_log')
      .select('id, provider_event_id, raw_payload, received_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .gte('received_at', fourteenDaysAgo.toISOString())
      .order('received_at', { ascending: true });

    if (fetchError) throw fetchError;

    console.log(`[Backfill14d] Found ${events?.length || 0} events to reprocess`);

    let salesUpdated = 0;
    let coreEventsUpdated = 0;
    let ledgerUpdated = 0;
    let errors = 0;

    for (const event of events || []) {
      try {
        const payload = event.raw_payload;
        if (!payload) continue;

        const data = payload.data;
        const purchase = data?.purchase;
        const transactionId = purchase?.transaction;
        
        if (!transactionId) continue;

        // Resolve SCK from multiple sources
        const sck = resolveSCK(payload);
        const parsedUTMs = parseSCKtoUTMs(sck);
        
        // Extract financials
        const commissions = data?.commissions || [];
        const financials = extractFinancials(commissions);
        
        // Calculate gross in BRL
        const currencyCode = purchase?.price?.currency_value || purchase?.price?.currency_code || 'BRL';
        const totalPrice = purchase?.full_price?.value || purchase?.price?.value || null;
        let totalPriceBrl = totalPrice;
        
        if (currencyCode !== 'BRL' && totalPrice !== null) {
          const exchangeRates: Record<string, number> = {
            'USD': 5.50, 'EUR': 6.00, 'GBP': 7.00, 'PYG': 0.00075,
          };
          totalPriceBrl = totalPrice * (exchangeRates[currencyCode] || 1);
        }

        // Build attribution object (100% RAW)
        const attribution = {
          utm_source: parsedUTMs.utm_source,
          utm_medium: parsedUTMs.utm_medium,
          utm_campaign: parsedUTMs.utm_campaign,
          utm_term: parsedUTMs.utm_term,
          utm_content: parsedUTMs.utm_content,
          raw_checkout_origin: parsedUTMs.raw_checkout_origin,
          meta_campaign_id: parsedUTMs.meta_campaign_id,
          meta_adset_id: parsedUTMs.meta_adset_id,
          meta_ad_id: parsedUTMs.meta_ad_id,
        };

        // ============================================
        // 1. UPDATE hotmart_sales
        // ============================================
        const { error: salesError } = await supabase
          .from('hotmart_sales')
          .update({
            // UTMs - RAW values
            checkout_origin: sck,
            raw_checkout_origin: sck,
            utm_source: parsedUTMs.utm_source,
            utm_medium: parsedUTMs.utm_medium,
            utm_campaign_id: parsedUTMs.utm_campaign,
            utm_term: parsedUTMs.utm_term,
            utm_content: parsedUTMs.utm_content,
            utm_adset_name: parsedUTMs.utm_medium,
            utm_placement: parsedUTMs.utm_term,
            utm_creative: parsedUTMs.utm_content,
            meta_campaign_id_extracted: parsedUTMs.meta_campaign_id,
            meta_adset_id_extracted: parsedUTMs.meta_adset_id,
            meta_ad_id_extracted: parsedUTMs.meta_ad_id,
            // Financials
            gross_amount: totalPriceBrl,
            platform_fee: financials.platformFee,
            affiliate_cost: financials.affiliateAmount,
            coproducer_cost: financials.coproducerAmount,
            net_amount: financials.ownerNet,
            net_revenue: financials.ownerNet,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', projectId)
          .eq('transaction_id', transactionId);

        if (!salesError) salesUpdated++;

        // ============================================
        // 2. UPDATE sales_core_events.attribution
        // ============================================
        const providerEventId = event.provider_event_id;
        
        const { error: coreError } = await supabase
          .from('sales_core_events')
          .update({
            attribution,
            gross_amount: totalPriceBrl,
            net_amount: financials.ownerNet ?? 0,
            platform_fee: financials.platformFee ?? 0,
            affiliate_cost: financials.affiliateAmount ?? 0,
            coproducer_cost: financials.coproducerAmount ?? 0,
          })
          .eq('project_id', projectId)
          .eq('provider_event_id', providerEventId);

        if (!coreError) coreEventsUpdated++;

        // ============================================
        // 3. UPDATE finance_ledger.attribution
        // ============================================
        const { error: ledgerError } = await supabase
          .from('finance_ledger')
          .update({ attribution })
          .eq('project_id', projectId)
          .eq('transaction_id', transactionId);

        if (!ledgerError) ledgerUpdated++;

      } catch (err) {
        console.error(`[Backfill14d] Error processing event:`, err);
        errors++;
      }
    }

    const result = {
      success: true,
      projectId,
      eventsProcessed: events?.length || 0,
      salesUpdated,
      coreEventsUpdated,
      ledgerUpdated,
      errors,
    };

    console.log(`[Backfill14d] Complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[Backfill14d] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
