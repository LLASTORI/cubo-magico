import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HotmartTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ProjectCredentials {
  client_id: string | null;
  client_secret: string | null;
  basic_auth: string | null;
}

interface HotmartSale {
  purchase: {
    transaction: string;
    order_date: number;
    approved_date?: number;
    status: string;
    payment?: {
      type?: string;
      method?: string;
      installments_number?: number;
    };
    price?: {
      value?: number;
      currency_code?: string;
    };
    offer?: {
      code?: string;
      payment_mode?: string;
    };
    recurrency_number?: number;
    is_subscription?: boolean;
    original_offer_price?: {
      value?: number;
      currency_code?: string;
    };
    tracking?: {
      source?: string;
      source_sck?: string;
      external_code?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
    };
  };
  product?: {
    id?: number;
    name?: string;
  };
  buyer?: {
    name?: string;
    email?: string;
    document?: string;
    phone?: {
      local_code?: string;
      number?: string;
    };
    address?: {
      country?: string;
      state?: string;
      city?: string;
      neighborhood?: string;
      zip_code?: string;
      address?: string;
      number?: string;
      complement?: string;
    };
  };
  producer?: {
    name?: string;
    document?: string;
  };
  affiliate?: {
    name?: string;
    affiliate_code?: string;
  };
  commissions?: Array<{
    value?: number;
    currency_code?: string;
  }>;
}

// Extract Meta IDs from UTMs
function extractMetaIds(tracking: HotmartSale['purchase']['tracking']) {
  if (!tracking) return { campaignId: null, adsetId: null, adId: null };
  
  // utm_campaign often contains the campaign ID
  // utm_content or source_sck may contain adset/ad info
  // These patterns may vary based on your UTM setup
  
  let campaignId = null;
  let adsetId = null;
  let adId = null;
  
  // Try to extract from utm_campaign (often contains campaign ID)
  if (tracking.utm_campaign) {
    // Pattern: could be just the ID or "campaignname_123456789"
    const campaignMatch = tracking.utm_campaign.match(/(\d{10,})/);
    if (campaignMatch) {
      campaignId = campaignMatch[1];
    }
  }
  
  // Try to extract from utm_content (often contains ad ID or creative ID)
  if (tracking.utm_content) {
    const adMatch = tracking.utm_content.match(/(\d{10,})/);
    if (adMatch) {
      adId = adMatch[1];
    }
  }
  
  // Try to extract from source_sck (Facebook Click ID sometimes has adset info)
  if (tracking.source_sck) {
    // source_sck format varies, try to find numeric IDs
    const sckMatch = tracking.source_sck.match(/(\d{10,})/g);
    if (sckMatch && sckMatch.length > 0) {
      // First long number might be ad or adset ID
      if (!adId && sckMatch[0]) adId = sckMatch[0];
      if (sckMatch[1]) adsetId = sckMatch[1];
    }
  }
  
  // Also check utm_source for source info
  // utm_source === 'fb' or 'facebook' or 'ig' indicates Meta ads
  
  return { campaignId, adsetId, adId };
}

// Determine attribution type based on UTMs and funnel configuration
async function determineAttributionType(
  sale: HotmartSale,
  projectId: string,
  supabase: any,
  funnelsWithAds: Set<string>
): Promise<string> {
  const tracking = sale.purchase.tracking;
  const offerCode = sale.purchase.offer?.code;
  
  // Check if we have valid Meta IDs in UTMs
  const { campaignId, adsetId, adId } = extractMetaIds(tracking);
  const hasMetaIds = !!(campaignId || adsetId || adId);
  
  // Check if utm_source indicates Meta ads
  const utmSource = tracking?.utm_source?.toLowerCase() || '';
  const isFromMeta = ['fb', 'facebook', 'ig', 'instagram', 'meta'].some(s => utmSource.includes(s));
  
  if (hasMetaIds || (isFromMeta && tracking?.utm_campaign)) {
    // Has UTM tracking from Meta
    return 'paid_tracked';
  }
  
  // Check if offer belongs to a funnel with Meta ads
  if (offerCode) {
    // Get the funnel for this offer
    const { data: offerMapping } = await supabase
      .from('offer_mappings')
      .select('id_funil, funnel_id')
      .eq('project_id', projectId)
      .eq('codigo_oferta', offerCode)
      .maybeSingle();
    
    if (offerMapping) {
      const funnelId = offerMapping.funnel_id || offerMapping.id_funil;
      if (funnelsWithAds.has(funnelId)) {
        // Offer is in a funnel that has Meta ads, but no UTM
        // Could be organic within the funnel or UTM failed
        return 'paid_untracked';
      }
    }
  }
  
  // No Meta tracking and not in a funnel with ads
  return 'organic_pure';
}

// Get all funnels that have Meta ad accounts linked
async function getFunnelsWithMetaAds(projectId: string, supabase: any): Promise<Set<string>> {
  const { data: funnelMetaAccounts } = await supabase
    .from('funnel_meta_accounts')
    .select('funnel_id')
    .eq('project_id', projectId);
  
  const funnelIds = new Set<string>();
  
  if (funnelMetaAccounts) {
    for (const fma of funnelMetaAccounts) {
      funnelIds.add(fma.funnel_id);
    }
  }
  
  // Also get funnels from offer_mappings id_funil field
  const { data: funnels } = await supabase
    .from('funnels')
    .select('id, name')
    .eq('project_id', projectId);
  
  if (funnels) {
    for (const funnel of funnels) {
      // Check if this funnel has any meta accounts
      const { data: hasAccounts } = await supabase
        .from('funnel_meta_accounts')
        .select('id')
        .eq('funnel_id', funnel.id)
        .limit(1);
      
      if (hasAccounts && hasAccounts.length > 0) {
        funnelIds.add(funnel.id);
      }
    }
  }
  
  return funnelIds;
}

async function getProjectCredentials(projectId: string): Promise<ProjectCredentials> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from('project_credentials')
    .select('client_id, client_secret, basic_auth')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching project credentials:', error);
    throw new Error('Failed to fetch project credentials');
  }
  
  if (!data) {
    throw new Error('Project credentials not configured. Please configure Hotmart credentials in project settings.');
  }
  
  return data;
}

async function getHotmartToken(credentials: ProjectCredentials): Promise<string> {
  const { client_id, client_secret } = credentials;

  if (!client_id || !client_secret) {
    throw new Error('Hotmart credentials not configured (client_id, client_secret). Configure them in project settings.');
  }

  console.log('Requesting Hotmart token...');

  const basicAuth = btoa(`${client_id}:${client_secret}`);
  const url = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(client_id)}&client_secret=${encodeURIComponent(client_secret)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${basicAuth}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get Hotmart token. Status:', response.status);
    throw new Error(`Failed to authenticate with Hotmart: ${response.status}`);
  }

  const data: HotmartTokenResponse = await response.json();
  console.log('Token obtained successfully');
  return data.access_token;
}

// Fetch all sales with pagination
async function fetchAllSales(
  token: string,
  startDate: number,
  endDate: number,
  status?: string
): Promise<HotmartSale[]> {
  const allSales: HotmartSale[] = [];
  let nextPageToken: string | null = null;
  const pageSize = 100;
  let pageCount = 0;
  
  do {
    const params: Record<string, string> = {
      start_date: startDate.toString(),
      end_date: endDate.toString(),
      max_results: pageSize.toString(),
    };
    
    // Only add page_token if we have one from previous response
    if (nextPageToken) {
      params.page_token = nextPageToken;
    }
    
    if (status) {
      params.transaction_status = status;
    }
    
    const queryString = new URLSearchParams(params).toString();
    const url = `https://developers.hotmart.com/payments/api/v1/sales/history?${queryString}`;
    
    console.log(`Fetching page ${pageCount + 1}...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Hotmart API error:', error);
      throw new Error(`Hotmart API error: ${response.status}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    console.log(`Page ${pageCount + 1}: ${items.length} sales`);
    
    allSales.push(...items);
    pageCount++;
    
    // Get next page token from response
    nextPageToken = data.page_info?.next_page_token || null;
    
    // Safety limit
    if (pageCount >= 100) {
      console.warn('Reached page limit (100), stopping pagination');
      break;
    }
  } while (nextPageToken);
  
  return allSales;
}

// Sync sales to database - OPTIMIZED with batch upsert
async function syncSales(
  projectId: string,
  startDate: number,
  endDate: number,
  status?: string
): Promise<{ synced: number; updated: number; errors: number; attributionStats: Record<string, number> }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get credentials and token
  const credentials = await getProjectCredentials(projectId);
  const token = await getHotmartToken(credentials);
  
  // Fetch all sales from Hotmart
  console.log(`Syncing sales from ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`);
  const sales = await fetchAllSales(token, startDate, endDate, status);
  console.log(`Total sales fetched: ${sales.length}`);
  
  if (sales.length === 0) {
    return { synced: 0, updated: 0, errors: 0, attributionStats: {} };
  }
  
  // Get offer mappings for attribution (one query)
  const { data: offerMappings } = await supabase
    .from('offer_mappings')
    .select('codigo_oferta, id_funil, funnel_id')
    .eq('project_id', projectId);
  
  // Get funnels with Meta ads (one query)
  const { data: funnelMetaAccounts } = await supabase
    .from('funnel_meta_accounts')
    .select('funnel_id')
    .eq('project_id', projectId);
  
  const funnelsWithAds = new Set(funnelMetaAccounts?.map(f => f.funnel_id) || []);
  const offerToFunnel = new Map(offerMappings?.map(o => [o.codigo_oferta, o.funnel_id || o.id_funil]) || []);
  
  console.log(`Offer mappings loaded: ${offerMappings?.length || 0}`);
  console.log(`Funnels with Meta ads: ${funnelsWithAds.size}`);
  
  const attributionStats: Record<string, number> = {
    paid_tracked: 0,
    paid_untracked: 0,
    organic_funnel: 0,
    organic_pure: 0,
    unknown: 0,
  };
  
  // Fetch real-time exchange rates from Frankfurter API
  let exchangeRates: Record<string, number> = {
    'BRL': 1,
    'USD': 6.00,
    'EUR': 6.40,
    'GBP': 7.60,
    'PYG': 0.0008,
    'UYU': 0.14,
    'AUD': 3.90,
    'CHF': 6.80,
    'CAD': 4.40,
    'MXN': 0.30,
    'ARS': 0.006,
    'CLP': 0.006,
    'COP': 0.0014,
    'PEN': 1.60,
  };
  
  try {
    console.log('Fetching real-time exchange rates from Frankfurter API...');
    const ratesResponse = await fetch('https://api.frankfurter.app/latest?to=BRL');
    if (ratesResponse.ok) {
      const ratesData = await ratesResponse.json();
      // Frankfurter returns rates FROM base currency TO BRL
      // So USD -> BRL means 1 USD = X BRL
      if (ratesData.rates?.BRL) {
        const brlRate = ratesData.rates.BRL;
        // We need rates TO BRL, so we need to calculate cross rates
        // Frankfurter base is EUR by default
        exchangeRates = {
          'BRL': 1,
          'EUR': brlRate, // 1 EUR = X BRL
        };
        
        // Fetch USD and other currencies separately
        const usdResponse = await fetch('https://api.frankfurter.app/latest?from=USD&to=BRL');
        if (usdResponse.ok) {
          const usdData = await usdResponse.json();
          if (usdData.rates?.BRL) {
            exchangeRates['USD'] = usdData.rates.BRL;
          }
        }
        
        // Fetch other common currencies
        const currencies = ['GBP', 'AUD', 'CHF', 'CAD', 'MXN'];
        for (const curr of currencies) {
          try {
            const resp = await fetch(`https://api.frankfurter.app/latest?from=${curr}&to=BRL`);
            if (resp.ok) {
              const data = await resp.json();
              if (data.rates?.BRL) {
                exchangeRates[curr] = data.rates.BRL;
              }
            }
          } catch (e) {
            console.log(`Could not fetch rate for ${curr}, using fallback`);
          }
        }
        
        console.log('Real-time exchange rates fetched:', exchangeRates);
      }
    }
  } catch (rateError) {
    console.error('Error fetching exchange rates, using fallback rates:', rateError);
  }

  // Prepare all sales data
  const salesData = sales.map(sale => {
    const tracking = sale.purchase.tracking;
    const { campaignId, adsetId, adId } = extractMetaIds(tracking);
    const offerCode = sale.purchase.offer?.code;
    
    // Determine attribution type (fast, no queries)
    let attributionType = 'unknown';
    const hasMetaIds = !!(campaignId || adsetId || adId);
    const utmSource = tracking?.utm_source?.toLowerCase() || '';
    const isFromMeta = ['fb', 'facebook', 'ig', 'instagram', 'meta'].some(s => utmSource.includes(s));
    
    if (hasMetaIds || (isFromMeta && tracking?.utm_campaign)) {
      attributionType = 'paid_tracked';
    } else if (offerCode) {
      const funnelId = offerToFunnel.get(offerCode);
      if (funnelId && funnelsWithAds.has(funnelId)) {
        attributionType = 'paid_untracked';
      } else {
        attributionType = 'organic_pure';
      }
    } else {
      attributionType = 'organic_pure';
    }
    
    attributionStats[attributionType]++;
    
    // Calculate BRL conversion with real-time rates
    const currencyCode = sale.purchase.price?.currency_code || 'BRL';
    const totalPrice = sale.purchase.price?.value || 0;
    const rate = exchangeRates[currencyCode] || 1;
    const totalPriceBrl = totalPrice * rate;

    return {
      project_id: projectId,
      transaction_id: sale.purchase.transaction,
      status: sale.purchase.status,
      sale_date: sale.purchase.order_date ? new Date(sale.purchase.order_date).toISOString() : null,
      confirmation_date: sale.purchase.approved_date ? new Date(sale.purchase.approved_date).toISOString() : null,
      product_name: sale.product?.name || 'Unknown Product',
      product_code: sale.product?.id?.toString() || null,
      offer_code: sale.purchase.offer?.code || null,
      offer_price: sale.purchase.price?.value || null,
      offer_currency: currencyCode,
      original_price: sale.purchase.original_offer_price?.value || null,
      payment_method: sale.purchase.payment?.method || null,
      payment_type: sale.purchase.payment?.type || null,
      installment_number: sale.purchase.payment?.installments_number || null,
      recurrence: sale.purchase.recurrency_number || null,
      buyer_name: sale.buyer?.name || null,
      buyer_email: sale.buyer?.email || null,
      buyer_document: sale.buyer?.document || null,
      buyer_phone_ddd: sale.buyer?.phone?.local_code || null,
      buyer_phone: sale.buyer?.phone?.number || null,
      buyer_country: sale.buyer?.address?.country || null,
      buyer_state: sale.buyer?.address?.state || null,
      buyer_city: sale.buyer?.address?.city || null,
      buyer_neighborhood: sale.buyer?.address?.neighborhood || null,
      buyer_cep: sale.buyer?.address?.zip_code || null,
      buyer_address: sale.buyer?.address?.address || null,
      buyer_address_number: sale.buyer?.address?.number || null,
      buyer_address_complement: sale.buyer?.address?.complement || null,
      producer_name: sale.producer?.name || null,
      producer_document: sale.producer?.document || null,
      affiliate_name: sale.affiliate?.name || null,
      affiliate_code: sale.affiliate?.affiliate_code || null,
      utm_source: tracking?.utm_source || null,
      utm_campaign_id: tracking?.utm_campaign || null,
      utm_creative: tracking?.utm_content || null,
      checkout_origin: tracking?.source || null,
      sale_attribution_type: attributionType,
      meta_campaign_id_extracted: campaignId,
      meta_adset_id_extracted: adsetId,
      meta_ad_id_extracted: adId,
      last_synced_at: new Date().toISOString(),
      total_price: totalPrice || null,
      total_price_brl: totalPriceBrl || null,
      exchange_rate_used: currencyCode !== 'BRL' ? rate : null,
      net_revenue: sale.commissions?.[0]?.value || null,
    };
  });
  
  console.log(`Prepared ${salesData.length} sales for upsert`);
  
  // Batch upsert in chunks of 100
  const BATCH_SIZE = 100;
  let synced = 0;
  let errors = 0;
  
  for (let i = 0; i < salesData.length; i += BATCH_SIZE) {
    const batch = salesData.slice(i, i + BATCH_SIZE);
    console.log(`Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(salesData.length / BATCH_SIZE)}...`);
    
    const { error } = await supabase
      .from('hotmart_sales')
      .upsert(batch, { 
        onConflict: 'project_id,transaction_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`Batch upsert error:`, error);
      errors += batch.length;
    } else {
      synced += batch.length;
    }
  }
  
  console.log(`Sync complete: ${synced} processed, ${errors} errors`);
  console.log('Attribution stats:', attributionStats);
  
  return { synced, updated: 0, errors, attributionStats };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, params, apiType, projectId, action, startDate, endDate, status } = await req.json();
    console.log('Hotmart API request:', { endpoint, apiType, projectId, action });

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    // Handle sync_sales action
    if (action === 'sync_sales') {
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required for sync_sales');
      }
      
      const result = await syncSales(projectId, startDate, endDate, status);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Original API passthrough logic
    const credentials = await getProjectCredentials(projectId);
    const token = await getHotmartToken(credentials);

    const baseUrl = apiType === 'products' 
      ? 'https://developers.hotmart.com/products/api/v1'
      : 'https://developers.hotmart.com/payments/api/v1';

    const queryString = params ? new URLSearchParams(params).toString() : '';
    const url = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log('Calling Hotmart API:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Hotmart API error:', error);
      throw new Error(`Hotmart API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Hotmart API response received');

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in hotmart-api function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
