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
      country_code?: string;
      ddi?: string;
    } | string;
    phones?: Array<{
      local_code?: string;
      number?: string;
      phone?: string;
      ddd?: string;
      area_code?: string;
      country_code?: string;
      ddi?: string;
    }>;
    checkout_phone?: string;
    ddd?: string;
    area_code?: string;
    phone_number?: string;
    cellphone?: string;
    mobile?: string;
    country_code?: string;
    ddi?: string;
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
    [key: string]: unknown; // Allow any other properties for debugging
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

// Determine sale_category based on:
// 1. Oferta → Funil (always defines the funnel)
// 2. UTM → Origin (ads vs unidentified vs other)
// Categories: 'funnel_ads', 'funnel_no_ads', 'unidentified_origin', 'other_origin'
function determineSaleCategory(
  sale: HotmartSale,
  offerToFunnel: Map<string, string>,
  funnelsWithAds: Set<string>
): string {
  const tracking = sale.purchase.tracking;
  const offerCode = sale.purchase.offer?.code;
  
  // Check if we have Meta tracking
  const { campaignId, adsetId, adId } = extractMetaIds(tracking);
  const hasMetaIds = !!(campaignId || adsetId || adId);
  const utmSource = tracking?.utm_source?.toLowerCase() || '';
  const isFromMeta = ['fb', 'facebook', 'ig', 'instagram', 'meta'].some(s => utmSource.includes(s));
  const hasMetaTracking = hasMetaIds || (isFromMeta && tracking?.utm_campaign);
  
  // Check if offer belongs to a funnel
  const funnelId = offerCode ? offerToFunnel.get(offerCode) : null;
  const hasFunnel = !!funnelId && funnelId !== 'A Definir';
  const funnelHasAds = funnelId ? funnelsWithAds.has(funnelId) : false;
  
  // Check for affiliate (other origin)
  const hasAffiliate = !!sale.affiliate?.affiliate_code;
  
  // Categorization logic:
  // 1. Funil + Ads: Has funnel AND has Meta tracking
  if (hasFunnel && hasMetaTracking) {
    return 'funnel_ads';
  }
  
  // 2. Funil sem Ads: Has funnel but NO Meta tracking
  if (hasFunnel && !hasMetaTracking) {
    return 'funnel_no_ads';
  }
  
  // 3. Outras Origens: Has affiliate or other known sources (not funnel)
  if (hasAffiliate) {
    return 'other_origin';
  }
  
  // 4. Origem Não Identificada: No funnel, no Meta tracking, no affiliate
  return 'unidentified_origin';
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
  
  // Fetch credentials including encrypted columns
  const { data, error } = await supabase
    .from('project_credentials')
    .select('client_id, client_secret, client_secret_encrypted, basic_auth, basic_auth_encrypted')
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
  
  // If encrypted columns exist, decrypt them using RPC
  let clientSecret = data.client_secret;
  let basicAuth = data.basic_auth;
  
  if (data.client_secret_encrypted) {
    const { data: decrypted } = await supabase.rpc('decrypt_sensitive', { 
      p_encrypted_data: data.client_secret_encrypted 
    });
    if (decrypted) clientSecret = decrypted;
  }
  
  if (data.basic_auth_encrypted) {
    const { data: decrypted } = await supabase.rpc('decrypt_sensitive', { 
      p_encrypted_data: data.basic_auth_encrypted 
    });
    if (decrypted) basicAuth = decrypted;
  }
  
  return {
    client_id: data.client_id,
    client_secret: clientSecret,
    basic_auth: basicAuth
  };
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

// All statuses to fetch from Hotmart API
const ALL_TRANSACTION_STATUSES = [
  'APPROVED',      // Approved
  'COMPLETE',      // Complete  
  'CANCELLED',     // Cancelled
  'REFUNDED',      // Refunded
  'CHARGEBACK',    // Chargeback
  'DISPUTE',       // Dispute
  'EXPIRED',       // Expired (boleto/PIX not paid)
  'OVERDUE',       // Overdue payment
  'BLOCKED',       // Blocked transaction
];

// Sync sales to database - OPTIMIZED with batch upsert
// Now fetches ALL statuses to ensure complete data
async function syncSales(
  projectId: string,
  startDate: number,
  endDate: number,
  status?: string,
  fetchAllStatuses: boolean = true
): Promise<{ synced: number; updated: number; errors: number; categoryStats: Record<string, number> }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get credentials and token
  const credentials = await getProjectCredentials(projectId);
  const token = await getHotmartToken(credentials);
  
  // Fetch sales from Hotmart
  console.log(`Syncing sales from ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`);
  
  let allSales: HotmartSale[] = [];
  
  // If a specific status is requested OR we don't want to fetch all, just fetch that one
  if (status || !fetchAllStatuses) {
    allSales = await fetchAllSales(token, startDate, endDate, status);
    console.log(`Sales fetched for status ${status || 'all'}: ${allSales.length}`);
  } else {
    // Fetch ALL statuses separately to ensure we get cancelled/chargeback/refunded
    console.log('Fetching sales for all statuses...');
    
    for (const txStatus of ALL_TRANSACTION_STATUSES) {
      try {
        console.log(`  Fetching status: ${txStatus}...`);
        const salesForStatus = await fetchAllSales(token, startDate, endDate, txStatus);
        console.log(`    Found ${salesForStatus.length} sales with status ${txStatus}`);
        allSales.push(...salesForStatus);
      } catch (statusError) {
        console.error(`  Error fetching status ${txStatus}:`, statusError);
        // Continue with other statuses
      }
      
      // Small delay between status calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`Total sales fetched across all statuses: ${allSales.length}`);
  }
  
  if (allSales.length === 0) {
    return { synced: 0, updated: 0, errors: 0, categoryStats: {} };
  }
  
  // Use allSales instead of sales
  const sales = allSales;
  
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
  
  // Stats for sale categories
  const categoryStats: Record<string, number> = {
    funnel_ads: 0,
    funnel_no_ads: 0,
    unidentified_origin: 0,
    other_origin: 0,
  };
  
  // Fallback exchange rates (conservative estimates for BRL conversion)
  // These are used when real-time rates cannot be fetched
  const fallbackRates: Record<string, number> = {
    'BRL': 1,
    'USD': 5.50,
    'EUR': 6.00,
    'GBP': 7.00,
    'PYG': 0.00075,    // Guarani Paraguaio ~7500 PYG = 1 BRL
    'UYU': 0.14,       // Peso Uruguaio ~43 UYU = 1 BRL
    'AUD': 3.60,
    'CHF': 6.20,
    'CAD': 4.00,
    'MXN': 0.28,
    'ARS': 0.005,      // Peso Argentino ~1200 ARS = 1 BRL
    'CLP': 0.006,      // Peso Chileno ~950 CLP = 1 BRL
    'COP': 0.0013,     // Peso Colombiano ~4200 COP = 1 BRL
    'PEN': 1.45,
    'JPY': 0.037,      // Iene Japonês ~154 JPY = 1 BRL
    'BOB': 0.79,       // Boliviano
    'VES': 0.15,       // Bolívar Venezuelano
  };
  
  let exchangeRates: Record<string, number> = { ...fallbackRates };
  
  try {
    console.log('Fetching real-time exchange rates from Frankfurter API...');
    
    // Fetch common currencies
    const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'CHF', 'CAD', 'MXN', 'JPY'];
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
        console.log(`Could not fetch rate for ${curr}, using fallback: ${fallbackRates[curr]}`);
      }
    }
    
    console.log('Exchange rates loaded:', exchangeRates);
  } catch (rateError) {
    console.error('Error fetching exchange rates, using fallback rates:', rateError);
    exchangeRates = { ...fallbackRates };
  }

  // Log first sale's full purchase for debugging source_sck and checkout_origin
  if (sales.length > 0) {
    const firstSale = sales[0];
    const purchase = firstSale.purchase as Record<string, unknown>;
    console.log('First sale tracking debug:', {
      transaction: firstSale.purchase.transaction,
      tracking: firstSale.purchase.tracking,
      checkout_source: purchase['checkout_source'],
      sck: purchase['sck'],
      source: purchase['source'],
      origin: purchase['origin'],
      // Log all purchase keys to find the right field
      purchaseKeys: Object.keys(purchase)
    });
  }
  
  // Find a sale with source_sck that looks like Meta UTM pattern
  const saleWithMetaSource = sales.find(s => {
    const purchase = s.purchase as Record<string, unknown>;
    const tracking = s.purchase.tracking as Record<string, unknown> | undefined;
    const sck = (tracking?.['source_sck'] || purchase['sck'] || '') as string;
    return sck.includes('|') && (sck.includes('Meta') || sck.includes('PERPETUO') || sck.includes('ADVANTAGE'));
  });
  if (saleWithMetaSource) {
    const purchase = saleWithMetaSource.purchase as Record<string, unknown>;
    const tracking = saleWithMetaSource.purchase.tracking as Record<string, unknown> | undefined;
    console.log('Found sale with Meta source_sck:', {
      transaction: saleWithMetaSource.purchase.transaction,
      tracking: saleWithMetaSource.purchase.tracking,
      source_sck: tracking?.['source_sck'] || purchase['sck']
    });
  }
  
  // Prepare all sales data
  // Log first sale's buyer structure for debugging (only once per sync)
  if (sales.length > 0) {
    const sampleBuyer = sales[0].buyer;
    console.log('=== BUYER STRUCTURE DEBUG ===');
    console.log('Full buyer object:', JSON.stringify(sampleBuyer, null, 2));
    console.log('buyer.phone:', JSON.stringify(sampleBuyer?.phone, null, 2));
    console.log('buyer.checkout_phone:', sampleBuyer?.checkout_phone);
    console.log('buyer.phones:', JSON.stringify(sampleBuyer?.phones, null, 2));
    console.log('=== END BUYER DEBUG ===');
  }

  const salesData = sales.map(sale => {
    const tracking = sale.purchase.tracking;
    const { campaignId, adsetId, adId } = extractMetaIds(tracking);
    
    // Determine sale category using the new logic
    const saleCategory = determineSaleCategory(sale, offerToFunnel, funnelsWithAds);
    categoryStats[saleCategory] = (categoryStats[saleCategory] || 0) + 1;
    
    // Keep legacy attribution type for backwards compatibility
    const hasMetaIds = !!(campaignId || adsetId || adId);
    const utmSource = tracking?.utm_source?.toLowerCase() || '';
    const isFromMeta = ['fb', 'facebook', 'ig', 'instagram', 'meta'].some(s => utmSource.includes(s));
    const attributionType = (hasMetaIds || (isFromMeta && tracking?.utm_campaign)) 
      ? 'paid_tracked' 
      : 'organic_pure';
    
    // Calculate BRL conversion with exchange rates
    const currencyCode = sale.purchase.price?.currency_code || 'BRL';
    const totalPrice = sale.purchase.price?.value || 0;
    
    // Get exchange rate - warn if unknown currency
    let rate = exchangeRates[currencyCode];
    if (rate === undefined) {
      console.warn(`Unknown currency ${currencyCode} for transaction ${sale.purchase.transaction}, using conservative estimate`);
      // For unknown currencies, assume it's a weak currency (value in hundreds/thousands)
      // This prevents massive overestimation
      rate = totalPrice > 1000 ? 0.001 : 1;
    }
    
    const totalPriceBrl = totalPrice * rate;

    // Extract phone data - try multiple possible structures from Hotmart API
    let phoneCountryCode: string | null = null;
    let phoneDdd: string | null = null;
    let phoneNumber: string | null = null;
    
    const buyer = sale.buyer;
    const phoneObj = buyer?.phone && typeof buyer.phone === 'object' ? buyer.phone : null;
    
    // Try structure 1: buyer.phone object with local_code and number
    if (phoneObj && (phoneObj.local_code || phoneObj.number)) {
      phoneDdd = phoneObj.local_code || null;
      phoneNumber = phoneObj.number || null;
      phoneCountryCode = phoneObj.country_code || phoneObj.ddi || '55';
    }
    // Try structure 2: buyer.checkout_phone as full string (e.g., "5511999999999")
    else if (buyer?.checkout_phone) {
      const fullPhone = String(buyer.checkout_phone).replace(/\D/g, '');
      if (fullPhone.length >= 10) {
        // Check if starts with country code (55 for Brazil)
        if (fullPhone.startsWith('55') && fullPhone.length >= 12) {
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(2, 4);
          phoneNumber = fullPhone.substring(4);
        } else if (fullPhone.length === 11) {
          // Brazilian format without country code: DDD + 9 digits
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(0, 2);
          phoneNumber = fullPhone.substring(2);
        } else if (fullPhone.length === 10) {
          // Brazilian format without country code: DDD + 8 digits (landline)
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(0, 2);
          phoneNumber = fullPhone.substring(2);
        } else {
          // Unknown format, store as is
          phoneNumber = fullPhone;
          phoneCountryCode = '55';
        }
      }
    }
    // Try structure 3: buyer.phones array
    else if (buyer?.phones && Array.isArray(buyer.phones) && buyer.phones.length > 0) {
      const firstPhone = buyer.phones[0];
      phoneDdd = firstPhone.local_code || firstPhone.ddd || firstPhone.area_code || null;
      phoneNumber = firstPhone.number || firstPhone.phone || null;
      phoneCountryCode = firstPhone.country_code || firstPhone.ddi || '55';
    }
    // Try structure 4: buyer.phone as string directly
    else if (buyer?.phone && typeof buyer.phone === 'string') {
      const fullPhone = String(buyer.phone).replace(/\D/g, '');
      if (fullPhone.length >= 10) {
        if (fullPhone.startsWith('55') && fullPhone.length >= 12) {
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(2, 4);
          phoneNumber = fullPhone.substring(4);
        } else if (fullPhone.length === 11 || fullPhone.length === 10) {
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(0, 2);
          phoneNumber = fullPhone.substring(2);
        } else {
          phoneNumber = fullPhone;
          phoneCountryCode = '55';
        }
      }
    }
    // Try structure 5: separate ddd and phone fields at buyer level
    else if (buyer?.ddd || buyer?.phone_number || buyer?.cellphone) {
      phoneDdd = buyer.ddd || buyer.area_code || null;
      phoneNumber = buyer.phone_number || buyer.cellphone || buyer.mobile || null;
      phoneCountryCode = buyer.country_code || buyer.ddi || '55';
    }

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
      buyer_phone_country_code: phoneCountryCode,
      buyer_phone_ddd: phoneDdd,
      buyer_phone: phoneNumber,
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
      checkout_origin: tracking?.source_sck || tracking?.source || null,
      sale_attribution_type: attributionType,
      sale_category: saleCategory,
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
  console.log('Category stats:', categoryStats);
  
  // Auto-create offer mappings for new offer codes
  const existingOfferCodes = new Set(offerMappings?.map(m => m.codigo_oferta).filter(Boolean) || []);
  const newOfferCodes = new Set<string>();
  
  // Collect unique offer codes from sales that don't exist in mappings
  const offerDataMap = new Map<string, { productName: string; bestPrice: number | null }>();
  
  for (const sale of sales) {
    const offerCode = sale.purchase.offer?.code;
    if (!offerCode || existingOfferCodes.has(offerCode) || newOfferCodes.has(offerCode)) continue;
    
    newOfferCodes.add(offerCode);
    
    // Get product info for the new mapping
    const productName = sale.product?.name || 'Produto Desconhecido';
    const currencyCode = sale.purchase.price?.currency_code || 'BRL';
    const totalPrice = sale.purchase.price?.value || null;
    
    // Only store BRL prices, convert others
    const existing = offerDataMap.get(offerCode);
    if (!existing) {
      const priceInBrl = currencyCode === 'BRL' ? totalPrice : 
        (totalPrice && exchangeRates[currencyCode] ? totalPrice * exchangeRates[currencyCode] : null);
      offerDataMap.set(offerCode, { productName, bestPrice: priceInBrl });
    }
  }
  
  // Create mappings for new offer codes
  if (newOfferCodes.size > 0) {
    console.log(`Auto-creating ${newOfferCodes.size} new offer mappings...`);
    
    // Get or create "A Definir" funnel for this project
    let defaultFunnelId: string | null = null;
    const { data: existingFunnel } = await supabase
      .from('funnels')
      .select('id')
      .eq('project_id', projectId)
      .eq('funnel_type', 'indefinido')
      .limit(1)
      .maybeSingle();
    
    if (existingFunnel) {
      defaultFunnelId = existingFunnel.id;
    } else {
      // Create "A Definir" funnel if it doesn't exist
      const { data: newFunnel, error: funnelError } = await supabase
        .from('funnels')
        .insert({
          project_id: projectId,
          name: 'A Definir',
          funnel_type: 'indefinido'
        })
        .select('id')
        .single();
      
      if (!funnelError && newFunnel) {
        defaultFunnelId = newFunnel.id;
        console.log('Created "A Definir" funnel:', defaultFunnelId);
      }
    }
    
    // Prepare offer mappings to insert
    const newMappings = Array.from(newOfferCodes).map(code => {
      const data = offerDataMap.get(code);
      return {
        project_id: projectId,
        codigo_oferta: code,
        nome_produto: data?.productName || 'Produto Desconhecido',
        nome_oferta: 'Auto-importado',
        valor: data?.bestPrice,
        status: 'Ativo',
        id_funil: 'A Definir',
        funnel_id: defaultFunnelId,
        data_ativacao: new Date().toISOString().split('T')[0],
      };
    });
    
    // Insert in batches, ignoring duplicates (constraint will prevent them)
    const MAPPING_BATCH_SIZE = 50;
    let mappingsCreated = 0;
    
    for (let i = 0; i < newMappings.length; i += MAPPING_BATCH_SIZE) {
      const batch = newMappings.slice(i, i + MAPPING_BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('offer_mappings')
        .insert(batch)
        .select();
      
      if (!insertError) {
        mappingsCreated += batch.length;
      } else {
        // Log but don't fail - duplicates are expected if running multiple syncs
        console.log('Some offer mappings already exist (this is normal):', insertError.message);
      }
    }
    
    console.log(`Auto-created ${mappingsCreated} offer mappings`);
  }
  
  return { synced, updated: 0, errors, categoryStats };
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

    // Handle sync_sales action - now with monthly chunking for large periods
    if (action === 'sync_sales') {
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required for sync_sales');
      }
      
      // Calculate period length
      const periodMs = endDate - startDate;
      const periodDays = periodMs / (1000 * 60 * 60 * 24);
      
      // If period > 45 days, split into monthly chunks to avoid 10k limit
      if (periodDays > 45) {
        console.log(`Large period detected (${Math.round(periodDays)} days), splitting into monthly chunks...`);
        
        const chunks: { start: number; end: number }[] = [];
        let chunkStart = new Date(startDate);
        const finalEnd = new Date(endDate);
        
        while (chunkStart < finalEnd) {
          // End of current month or final end date, whichever comes first
          const chunkEnd = new Date(chunkStart);
          chunkEnd.setMonth(chunkEnd.getMonth() + 1);
          chunkEnd.setDate(0); // Last day of current month
          chunkEnd.setHours(23, 59, 59, 999);
          
          const actualEnd = chunkEnd > finalEnd ? finalEnd : chunkEnd;
          
          chunks.push({
            start: chunkStart.getTime(),
            end: actualEnd.getTime()
          });
          
          // Move to next month
          chunkStart = new Date(actualEnd);
          chunkStart.setDate(chunkStart.getDate() + 1);
          chunkStart.setHours(0, 0, 0, 0);
        }
        
        console.log(`Split into ${chunks.length} monthly chunks`);
        
        let totalSynced = 0;
        let totalErrors = 0;
        const combinedStats: Record<string, number> = {
          funnel_ads: 0,
          funnel_no_ads: 0,
          unidentified_origin: 0,
          other_origin: 0,
        };
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`Processing chunk ${i + 1}/${chunks.length}: ${new Date(chunk.start).toISOString()} to ${new Date(chunk.end).toISOString()}`);
          
          const result = await syncSales(projectId, chunk.start, chunk.end, status);
          totalSynced += result.synced;
          totalErrors += result.errors;
          
          // Combine category stats
          Object.keys(result.categoryStats || {}).forEach(key => {
            combinedStats[key] = (combinedStats[key] || 0) + (result.categoryStats?.[key] || 0);
          });
          
          // Small delay between chunks to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`Chunked sync complete: ${totalSynced} total synced, ${totalErrors} errors`);
        
        return new Response(JSON.stringify({
          synced: totalSynced,
          updated: 0,
          errors: totalErrors,
          categoryStats: combinedStats,
          chunks: chunks.length
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Small period - sync directly
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
