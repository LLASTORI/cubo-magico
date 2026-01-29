import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

// ============================================
// SALES CORE PROVIDER - Hotmart Revenue Ingestion (API Sync)
// ============================================
// MIGRATED TO OAUTH AUTHORIZATION CODE FLOW
// - Uses refresh_token to get fresh access_token
// - Calls Hotmart API directly (no proxy needed)
// - Browser-like headers to avoid WAF blocks
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Map Hotmart API status to canonical event types
const hotmartStatusToCanonicalEventType: Record<string, string> = {
  'APPROVED': 'purchase',
  'COMPLETE': 'purchase',
  'PRINTED_BILLET': 'attempt',
  'WAITING_PAYMENT': 'attempt',
  'CANCELLED': 'refund',
  'REFUNDED': 'refund',
  'PARTIALLY_REFUNDED': 'refund',
  'CHARGEBACK': 'chargeback',
  'EXPIRED': 'refund',
  'PROTESTED': 'refund',
};

// Calculate economic_day from occurred_at in project timezone (default Brazil UTC-3)
function calculateEconomicDay(occurredAt: Date): string {
  // Brazil timezone (UTC-3)
  const offsetHours = -3;
  const adjustedDate = new Date(occurredAt.getTime() + offsetHours * 60 * 60 * 1000);
  return adjustedDate.toISOString().split('T')[0];
}

// Extract attribution data from Hotmart tracking
function extractAttributionFromTracking(tracking: any): Record<string, any> {
  if (!tracking) return { hotmart_checkout_source: null };
  
  return {
    utm_source: tracking.utm_source || null,
    utm_medium: tracking.utm_medium || null,
    utm_campaign: tracking.utm_campaign || null,
    utm_content: tracking.utm_content || null,
    utm_term: null,
    hotmart_checkout_source: tracking.source_sck || tracking.source || null,
    external_code: tracking.external_code || null,
  };
}

// ============================================
// FINANCIAL MAPPING - Hotmart Commissions Structure
// ============================================
// Hotmart's commissions array contains:
// - MARKETPLACE: Platform fee (taxa Hotmart) - goes to Hotmart
// - PRODUCER: Owner's net revenue ("Você recebeu") - goes to project owner
// - CO_PRODUCER: Coproducer commission - goes to coproducer
// - AFFILIATE: Affiliate commission - goes to affiliate
//
// CORRECT MAPPING:
// gross_amount = full_price.value (valor pago pelo comprador)
// platform_fee = MARKETPLACE commission (taxa Hotmart)
// coproducer_amount = CO_PRODUCER commission (comissão coprodutor)
// affiliate_amount = AFFILIATE commission (comissão afiliado)
// net_amount = PRODUCER commission ("Você recebeu" - dinheiro do owner)
// ============================================

interface HotmartCommission {
  value?: number;
  source?: string;
  currency_code?: string;
  currency_value?: string;
}

// Extract financial breakdown from Hotmart commissions
function extractFinancialBreakdown(commissions: HotmartCommission[] | undefined): {
  platformFee: number | null;
  ownerNet: number | null;
  coproducerAmount: number | null;
  affiliateAmount: number | null;
} {
  if (!commissions || !Array.isArray(commissions)) {
    return { platformFee: null, ownerNet: null, coproducerAmount: null, affiliateAmount: null };
  }
  
  let platformFee: number | null = null;
  let ownerNet: number | null = null;
  let coproducerAmount: number | null = null;
  let affiliateAmount: number | null = null;
  
  for (const comm of commissions) {
    const source = comm.source?.toUpperCase();
    const value = comm.value ?? null;
    
    switch (source) {
      case 'MARKETPLACE':
        platformFee = value;
        break;
      case 'PRODUCER':
        ownerNet = value;
        break;
      case 'CO_PRODUCER':
        coproducerAmount = value;
        break;
      case 'AFFILIATE':
        affiliateAmount = value;
        break;
    }
  }
  
  return { platformFee, ownerNet, coproducerAmount, affiliateAmount };
}

// Batch write canonical events to sales_core_events
async function batchWriteSalesCoreEvents(
  supabase: any,
  projectId: string,
  salesWithFinancials: Array<{ 
    sale: any; 
    contactId: string | null; 
    grossAmount: number | null;
    ownerNet: number | null;
  }>
): Promise<{ synced: number; versioned: number; errors: number }> {
  let synced = 0;
  let versioned = 0;
  let errors = 0;
  
  // Prepare all events
  const eventsToInsert: any[] = [];
  const providerEventsToLog: any[] = [];
  
  for (const { sale, contactId, grossAmount, ownerNet } of salesWithFinancials) {
    const status = sale.purchase.status;
    const canonicalEventType = hotmartStatusToCanonicalEventType[status];
    
    if (!canonicalEventType) {
      continue; // Skip unmapped statuses
    }
    
    const transactionId = sale.purchase.transaction;
    const providerEventId = `hotmart_${transactionId}_${status}`;
    const occurredAt = sale.purchase.order_date 
      ? new Date(sale.purchase.order_date)
      : new Date();
    const economicDay = calculateEconomicDay(occurredAt);
    const attribution = extractAttributionFromTracking(sale.purchase.tracking);
    
    // CRITICAL: net_amount cannot be null - use 0 as fallback for events without PRODUCER commission
    // This happens for refunds, chargebacks, cancelled, and some legacy COMPLETE events
    const safeNetAmount = ownerNet ?? 0;
    
    eventsToInsert.push({
      project_id: projectId,
      provider: 'hotmart',
      provider_event_id: providerEventId,
      event_type: canonicalEventType,
      gross_amount: grossAmount ?? 0,
      net_amount: safeNetAmount, // CORRECT: PRODUCER commission = "Você recebeu", 0 if not available
      currency: 'BRL',
      occurred_at: occurredAt.toISOString(),
      received_at: new Date().toISOString(),
      economic_day: economicDay,
      attribution,
      contact_id: contactId,
      raw_payload: sale,
      version: 1,
      is_active: true,
    });
    
    providerEventsToLog.push({
      project_id: projectId,
      provider: 'hotmart',
      provider_event_id: providerEventId,
      received_at: new Date().toISOString(),
      raw_payload: sale,
      status: 'processed',
    });
  }
  
  if (eventsToInsert.length === 0) {
    return { synced: 0, versioned: 0, errors: 0 };
  }
  
  // Log all provider events first
  const BATCH_SIZE = 100;
  for (let i = 0; i < providerEventsToLog.length; i += BATCH_SIZE) {
    const batch = providerEventsToLog.slice(i, i + BATCH_SIZE);
    await supabase.from('provider_event_log').upsert(batch, {
      onConflict: 'project_id,provider,provider_event_id',
      ignoreDuplicates: true
    });
  }
  
  // For sales_core_events, we need to handle versioning
  // First, get existing events to check for changes
  const providerEventIds = eventsToInsert.map(e => e.provider_event_id);
  
  const { data: existingEvents } = await supabase
    .from('sales_core_events')
    .select('id, provider_event_id, gross_amount, net_amount, version, is_active')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .eq('is_active', true)
    .in('provider_event_id', providerEventIds);
  
  const existingMap = new Map<string, any>();
  if (existingEvents) {
    for (const e of existingEvents) {
      existingMap.set(e.provider_event_id, e);
    }
  }
  
  // Separate into new inserts and version updates
  const newEvents: any[] = [];
  const eventsToVersion: { old: any; new: any }[] = [];
  
  for (const event of eventsToInsert) {
    const existing = existingMap.get(event.provider_event_id);
    
    if (!existing) {
      // New event
      newEvents.push(event);
    } else {
      // Check if values changed
      const hasChanges = 
        existing.gross_amount !== event.gross_amount ||
        existing.net_amount !== event.net_amount;
      
      if (hasChanges) {
        eventsToVersion.push({ old: existing, new: { ...event, version: existing.version + 1 } });
      }
      // If no changes, skip
    }
  }
  
  // Deactivate old versions
  if (eventsToVersion.length > 0) {
    const idsToDeactivate = eventsToVersion.map(e => e.old.id);
    await supabase
      .from('sales_core_events')
      .update({ is_active: false })
      .in('id', idsToDeactivate);
    
    // Insert new versions
    const newVersions = eventsToVersion.map(e => e.new);
    for (let i = 0; i < newVersions.length; i += BATCH_SIZE) {
      const batch = newVersions.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('sales_core_events').insert(batch);
      if (error) {
        console.error('[SalesCore] Error inserting versioned events:', error);
        errors += batch.length;
      } else {
        versioned += batch.length;
      }
    }
  }
  
  // Insert new events (use regular insert since we already filtered duplicates above)
  for (let i = 0; i < newEvents.length; i += BATCH_SIZE) {
    const batch = newEvents.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('sales_core_events')
      .insert(batch);
    
    if (error) {
      // Check if it's a duplicate key error (expected for existing events)
      if (error.code === '23505') {
        console.log('[SalesCore] Some events already exist (this is normal):', batch.length);
        // Count as synced since they already exist
        synced += batch.length;
      } else {
        console.error('[SalesCore] Error inserting new events:', error);
        errors += batch.length;
      }
    } else {
      synced += batch.length;
    }
  }
  
  return { synced, versioned, errors };
}

// Find contact IDs for a batch of sales
async function batchFindContactIds(
  supabase: any,
  projectId: string,
  sales: any[]
): Promise<Map<string, string | null>> {
  const emails = sales
    .map(s => s.buyer?.email?.toLowerCase())
    .filter(Boolean);
  
  if (emails.length === 0) {
    return new Map();
  }
  
  const { data: contacts } = await supabase
    .from('crm_contacts')
    .select('id, email')
    .eq('project_id', projectId)
    .in('email', emails);
  
  const emailToContactId = new Map<string, string>();
  if (contacts) {
    for (const c of contacts) {
      emailToContactId.set(c.email.toLowerCase(), c.id);
    }
  }
  
  // Map transaction to contact
  const result = new Map<string, string | null>();
  for (const sale of sales) {
    const email = sale.buyer?.email?.toLowerCase();
    result.set(sale.purchase.transaction, email ? (emailToContactId.get(email) || null) : null);
  }
  
  return result;
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
  
  let campaignId = null;
  let adsetId = null;
  let adId = null;
  
  // Try to extract from utm_campaign (often contains campaign ID)
  if (tracking.utm_campaign) {
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
    const sckMatch = tracking.source_sck.match(/(\d{10,})/g);
    if (sckMatch && sckMatch.length > 0) {
      if (!adId && sckMatch[0]) adId = sckMatch[0];
      if (sckMatch[1]) adsetId = sckMatch[1];
    }
  }
  
  return { campaignId, adsetId, adId };
}

// Determine sale_category based on offer/funnel and UTM tracking
function determineSaleCategory(
  sale: HotmartSale,
  offerToFunnel: Map<string, string>,
  funnelsWithAds: Set<string>
): string {
  const tracking = sale.purchase.tracking;
  const offerCode = sale.purchase.offer?.code;
  
  const { campaignId, adsetId, adId } = extractMetaIds(tracking);
  const hasMetaIds = !!(campaignId || adsetId || adId);
  const utmSource = tracking?.utm_source?.toLowerCase() || '';
  const isFromMeta = ['fb', 'facebook', 'ig', 'instagram', 'meta'].some(s => utmSource.includes(s));
  const hasMetaTracking = hasMetaIds || (isFromMeta && tracking?.utm_campaign);
  
  const funnelId = offerCode ? offerToFunnel.get(offerCode) : null;
  const hasFunnel = !!funnelId && funnelId !== 'A Definir';
  
  const hasAffiliate = !!sale.affiliate?.affiliate_code;
  
  if (hasFunnel && hasMetaTracking) {
    return 'funnel_ads';
  }
  
  if (hasFunnel && !hasMetaTracking) {
    return 'funnel_no_ads';
  }
  
  if (hasAffiliate) {
    return 'other_origin';
  }
  
  return 'unidentified_origin';
}

// ============================================
// AUTHENTICATION FLOWS
// ============================================
// FLOW 1: Client Credentials (for Products/Offers/Plans API)
//   - Uses client_id + client_secret
//   - grant_type: client_credentials
//   - NO user OAuth required
//   - Used by: /product/api/v1/products, /offers, /plans
//
// FLOW 2: OAuth Refresh Token (for Sales/Payments API)
//   - Uses refresh_token from browser OAuth flow
//   - grant_type: refresh_token
//   - Requires user authorization
//   - Used by: /payments/api/v1/sales (historical only)
// ============================================

// Browser-like headers to avoid WAF blocks
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Origin": "https://developers.hotmart.com",
  "Referer": "https://developers.hotmart.com/",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Dest": "empty",
  "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
}

// ============================================
// CLIENT CREDENTIALS FLOW - For Products/Offers API
// ============================================
// Uses client_id + client_secret + basic (pre-generated auth)
// NO user OAuth required - this is the original working flow
// 
// HOTMART STANDARD: 3 REQUIRED FIELDS
// - client_id: Application client ID
// - client_secret: Application client secret  
// - basic: Pre-generated Base64(client_id:client_secret) header
// ============================================
async function getAccessTokenViaClientCredentials(
  supabase: any,
  projectId: string
): Promise<string> {
  console.log('[CLIENT_CREDENTIALS] Getting access token for project:', projectId)
  
  // Get decrypted credentials using RPC
  const { data: decryptedCreds, error: rpcError } = await supabase
    .rpc('get_project_credentials_internal', { p_project_id: projectId })
  
  if (rpcError) {
    console.error('[CLIENT_CREDENTIALS] RPC error:', rpcError)
    throw new Error('Erro ao obter credenciais: ' + rpcError.message)
  }
  
  const hotmartCred = decryptedCreds?.find((c: any) => c.provider === 'hotmart')
  
  // Validate all 3 required fields
  if (!hotmartCred?.client_id) {
    throw new Error('Client ID não configurado. Acesse Configurações > Integrações > Hotmart.')
  }
  if (!hotmartCred?.client_secret) {
    throw new Error('Client Secret não configurado. Acesse Configurações > Integrações > Hotmart.')
  }
  if (!hotmartCred?.basic_auth) {
    throw new Error('Basic Auth não configurado. Acesse Configurações > Integrações > Hotmart.')
  }
  
  console.log('[CLIENT_CREDENTIALS] All 3 credentials found (client_id, client_secret, basic_auth)')
  
  // ============================================
  // OFFICIAL HOTMART TOKEN ENDPOINT
  // URL: https://api.hotmart.com/security/oauth/token
  // Auth: Basic {basic} (pre-generated from Hotmart dashboard)
  // Body: grant_type=client_credentials
  // ============================================
  const tokenUrl = 'https://api.hotmart.com/security/oauth/token'
  
  // Use the pre-generated basic_auth header from Hotmart dashboard
  // This is the STANDARD way - Hotmart provides this value directly
  const basicAuth = hotmartCred.basic_auth
  
  const tokenBody = new URLSearchParams({
    grant_type: 'client_credentials',
  })
  
  console.log('[CLIENT_CREDENTIALS] Requesting token from:', tokenUrl)
  
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: tokenBody,
  })
  
  const tokenText = await tokenResponse.text()
  
  if (!tokenResponse.ok) {
    console.error('[CLIENT_CREDENTIALS] Token request failed:', tokenResponse.status, tokenText.slice(0, 500))
    
    if (tokenText.includes('<!DOCTYPE') || tokenText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Tente novamente em alguns minutos.')
    }
    
    // Parse error for better messages
    try {
      const errorData = JSON.parse(tokenText)
      if (errorData.error === 'invalid_client') {
        throw new Error('Credenciais inválidas. Verifique client_id, client_secret e basic.')
      }
      throw new Error(`Hotmart auth error: ${errorData.error_description || errorData.error || tokenText.slice(0, 100)}`)
    } catch (e) {
      if (e instanceof Error && e.message.includes('Credenciais')) throw e
      throw new Error(`Client Credentials failed (${tokenResponse.status}): ${tokenText.slice(0, 200)}`)
    }
  }
  
  let tokenData
  try {
    tokenData = JSON.parse(tokenText)
  } catch {
    throw new Error(`Invalid JSON from token endpoint: ${tokenText.slice(0, 200)}`)
  }
  
  const { access_token } = tokenData
  
  if (!access_token) {
    throw new Error('No access_token in response')
  }
  
  console.log('[CLIENT_CREDENTIALS] ✅ Access token obtained successfully')
  return access_token
}

// ============================================
// HOTMART PRODUCTS API (Client Credentials)
// ============================================
// BASE URL: https://developers.hotmart.com
// ENDPOINTS:
//   - /products/api/v1/products
//   - /products/api/v1/products/{ucode}/offers
//   - /products/api/v1/products/{ucode}/plans
// AUTH: Bearer {access_token}
// ============================================
async function callHotmartProductsAPI(
  projectId: string,
  path: string,
  params: Record<string, string> = {}
): Promise<any> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // Get access token via Client Credentials (NOT OAuth)
  const access_token = await getAccessTokenViaClientCredentials(supabase, projectId)
  
  // Build the correct path - endpoints are under /products/api/v1/
  // Input: /products → Output: /products/api/v1/products
  // Input: /products/123/offers → Output: /products/api/v1/products/123/offers
  let apiPath = path
  
  // Remove any existing prefix to avoid duplication
  if (apiPath.startsWith('/products/api/v1')) {
    // Already has full prefix, use as is
  } else if (apiPath.startsWith('/product/api/v1')) {
    // Wrong prefix, convert to correct one
    apiPath = apiPath.replace('/product/api/v1', '/products/api/v1')
  } else if (apiPath.startsWith('/products')) {
    // Has /products but no api/v1 prefix
    apiPath = `/products/api/v1${apiPath}`
  } else if (apiPath.startsWith('/')) {
    // Just starts with /, add full prefix
    apiPath = `/products/api/v1${apiPath}`
  } else {
    // No leading slash
    apiPath = `/products/api/v1/${apiPath}`
  }
  
  // Build URL with query params
  const url = new URL(`https://developers.hotmart.com${apiPath}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }
  
  console.log(`[HOTMART-PRODUCTS-API] GET ${url.toString()}`)
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Accept': 'application/json',
    },
  })
  
  const rawText = await response.text()
  
  if (!response.ok) {
    console.error(`[HOTMART-PRODUCTS-API] Error (${response.status}):`, rawText.slice(0, 500))
    
    if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Tente novamente em alguns minutos.')
    }
    
    throw new Error(`Hotmart Products API error (${response.status}): ${rawText.slice(0, 200)}`)
  }
  
  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`Invalid JSON from Hotmart: ${rawText.slice(0, 200)}`)
  }
}

// ============================================
// OAUTH REFRESH TOKEN FLOW - For Sales/Payments API (legacy)
// ============================================
// Refresh the access token using refresh_token
async function refreshAccessToken(
  supabase: any,
  projectId: string,
  credentials: {
    client_id: string
    client_secret: string
    hotmart_refresh_token: string
  }
): Promise<string> {
  console.log('[OAUTH] Refreshing access token for project:', projectId)

  const tokenUrl = 'https://developers.hotmart.com/oauth/token'
  
  const tokenBody = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    refresh_token: credentials.hotmart_refresh_token,
  })

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenBody,
  })

  const tokenText = await tokenResponse.text()

  if (!tokenResponse.ok) {
    console.error('[OAUTH] Token refresh failed:', tokenText.slice(0, 500))
    
    // Check if it's an HTML response (WAF block)
    if (tokenText.includes('<!DOCTYPE') || tokenText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Reconecte via OAuth nas configurações.')
    }
    
    throw new Error(`Refresh failed: ${tokenText.slice(0, 200)}`)
  }

  let tokenData
  try {
    tokenData = JSON.parse(tokenText)
  } catch {
    throw new Error(`Invalid JSON from refresh: ${tokenText.slice(0, 200)}`)
  }

  const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData

  if (!access_token) {
    throw new Error('No access_token in refresh response')
  }

  // Calculate expiration
  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

  // Update database with new tokens
  const updateData: any = {
    hotmart_access_token: access_token,
    hotmart_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }

  // If a new refresh token was provided, update it too
  if (new_refresh_token) {
    updateData.hotmart_refresh_token = new_refresh_token
  }

  const { error: updateError } = await supabase
    .from('project_credentials')
    .update(updateData)
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')

  if (updateError) {
    console.error('[OAUTH] Failed to save new token:', updateError)
  } else {
    console.log('[OAUTH] ✅ New access token saved, expires:', expiresAt)
  }

  return access_token
}

// Get a valid access token (refresh if needed)
async function getValidAccessToken(
  supabase: any,
  projectId: string
): Promise<string> {
  // Get current credentials using RPC to decrypt secrets
  // First try to get OAuth tokens from the raw table (they're not encrypted)
  const { data: oauthData, error: oauthError } = await supabase
    .from('project_credentials')
    .select('hotmart_access_token, hotmart_refresh_token, hotmart_expires_at')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .maybeSingle()

  if (oauthError || !oauthData) {
    throw new Error('Credenciais Hotmart não encontradas')
  }

  // Check if we have OAuth tokens
  if (!oauthData.hotmart_refresh_token) {
    throw new Error('Hotmart não conectado via OAuth. Use o botão "Conectar Hotmart (OAuth)" nas configurações.')
  }

  // Check if token is still valid (with 5 minute buffer)
  const expiresAt = oauthData.hotmart_expires_at ? new Date(oauthData.hotmart_expires_at) : null
  const now = new Date()
  const bufferMs = 5 * 60 * 1000 // 5 minutes

  if (oauthData.hotmart_access_token && expiresAt && expiresAt.getTime() > now.getTime() + bufferMs) {
    // Token still valid
    console.log('[OAUTH] Token still valid, expires:', expiresAt.toISOString())
    return oauthData.hotmart_access_token
  }

  // Token expired or about to expire - need to refresh
  console.log('[OAUTH] Token expired or expiring soon, refreshing...')

  // Get decrypted credentials using RPC (client_id, client_secret are encrypted)
  const { data: decryptedCreds, error: rpcError } = await supabase
    .rpc('get_project_credentials_internal', { p_project_id: projectId })

  if (rpcError) {
    console.error('[OAUTH] RPC error:', rpcError)
    throw new Error('Erro ao obter credenciais: ' + rpcError.message)
  }

  const hotmartCred = decryptedCreds?.find((c: any) => c.provider === 'hotmart')
  if (!hotmartCred?.client_id || !hotmartCred?.client_secret) {
    throw new Error('Client ID/Secret não configurados. Reconfigure as credenciais.')
  }

  return await refreshAccessToken(supabase, projectId, {
    client_id: hotmartCred.client_id,
    client_secret: hotmartCred.client_secret,
    hotmart_refresh_token: oauthData.hotmart_refresh_token,
  })
}

// Call Hotmart API directly with OAuth token
async function callHotmartAPI(
  projectId: string,
  path: string,
  params: Record<string, string> = {},
  method: string = 'GET'
): Promise<any> {
  // Create admin Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // Get valid access token (auto-refresh if needed)
  const access_token = await getValidAccessToken(supabase, projectId)
  
  // Build URL with query params
  const url = new URL(`https://developers.hotmart.com${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }

  console.log(`[HOTMART-API] ${method} ${url.pathname}`)

  const response = await fetch(url.toString(), {
    method,
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': `Bearer ${access_token}`,
    },
  })

  const rawText = await response.text()

  if (!response.ok) {
    console.error(`[HOTMART-API] Error (${response.status}):`, rawText.slice(0, 500))
    
    // Check for WAF block
    if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Tente novamente em alguns minutos.')
    }
    
    throw new Error(`Hotmart API error (${response.status}): ${rawText.slice(0, 200)}`)
  }

  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`Invalid JSON from Hotmart: ${rawText.slice(0, 200)}`)
  }
}

// Fetch all sales with pagination - THROUGH PROXY
async function fetchAllSales(
  projectId: string,
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
    
    if (nextPageToken) {
      params.page_token = nextPageToken;
    }
    
    if (status) {
      params.transaction_status = status;
    }
    
    console.log(`Fetching page ${pageCount + 1}...`);
    
    // Call Hotmart API directly with OAuth token
    const data = await callHotmartAPI(projectId, '/payments/api/v1/sales/history', params);
    const items = data.items || [];
    
    console.log(`Page ${pageCount + 1}: ${items.length} sales`);
    
    allSales.push(...items);
    pageCount++;
    
    // Get next page token from response
    nextPageToken = data.page_info?.next_page_token || data.next_page_token || null;
    
    // Safety limit
    if (pageCount >= 100) {
      console.warn('Reached page limit (100), stopping pagination');
      break;
    }
    
    // Rate limit protection
    if (nextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } while (nextPageToken);
  
  return allSales;
}

// Statuses that require explicit filtering (NOT returned by default)
const SECONDARY_TRANSACTION_STATUSES = [
  'ABANDONED',
  'BLOCKED',
  'CANCELLED',
  'CHARGEBACK',
  'DELAYED',
  'EXPIRED',
  'NO_FUNDS',
  'OVERDUE',
  'PARTIALLY_REFUNDED',
  'PRE_ORDER',
  'PRINTED_BILLET',
  'PROCESSING_TRANSACTION',
  'PROTESTED',
  'REFUNDED',
  'STARTED',
  'UNDER_ANALISYS',
  'WAITING_PAYMENT',
];

// PRIMARY statuses for quick search
const QUICK_SECONDARY_STATUSES = [
  'WAITING_PAYMENT',
  'CANCELLED',
  'REFUNDED',
  'CHARGEBACK',
];

// STANDARDIZED exchange rates - MUST match webhook rates exactly
const exchangeRates: Record<string, number> = {
  'BRL': 1,
  'USD': 5.50,
  'EUR': 6.00,
  'GBP': 7.00,
  'PYG': 0.00075,
  'UYU': 0.14,
  'AUD': 3.60,
  'CHF': 6.20,
  'CAD': 4.00,
  'MXN': 0.28,
  'ARS': 0.005,
  'CLP': 0.006,
  'COP': 0.0013,
  'PEN': 1.45,
  'JPY': 0.037,
  'BOB': 0.79,
  'VES': 0.15,
};

// Sync sales to database - MIGRATED to use proxy
async function syncSales(
  projectId: string,
  startDate: number,
  endDate: number,
  status?: string,
  fetchAllStatuses: boolean = true,
  quickMode: boolean = false
): Promise<{ synced: number; updated: number; errors: number; categoryStats: Record<string, number> }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log(`Syncing sales from ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`);
  console.log(`Mode: ${quickMode ? 'QUICK' : 'FULL'} | OAuth: Direct API`);
  
  let allSales: HotmartSale[] = [];
  
  // If a specific status is requested, just fetch that one
  if (status) {
    console.log(`Fetching specific status: ${status}`);
    allSales = await fetchAllSales(projectId, startDate, endDate, status);
    console.log(`Sales fetched for status ${status}: ${allSales.length}`);
  } else if (!fetchAllStatuses) {
    // Legacy behavior: fetch without status filter (returns APPROVED + COMPLETE only)
    console.log('Fetching without status filter (APPROVED + COMPLETE only)...');
    allSales = await fetchAllSales(projectId, startDate, endDate, undefined);
    console.log(`Sales fetched (default APPROVED+COMPLETE): ${allSales.length}`);
  } else {
    // FULL SYNC with correct Hotmart API behavior
    console.log('=== FULL SYNC MODE (via Railway Proxy) ===');
    
    // STEP 1: Fetch APPROVED + COMPLETE without any filter
    console.log('[STEP 1] Fetching APPROVED + COMPLETE (no status filter)...');
    try {
      const primarySales = await fetchAllSales(projectId, startDate, endDate, undefined);
      console.log(`[STEP 1] SUCCESS: ${primarySales.length} sales fetched (APPROVED+COMPLETE)`);
      allSales.push(...primarySales);
    } catch (primaryError) {
      console.error('[STEP 1] FAILED:', primaryError);
    }
    
    // STEP 2: Fetch secondary statuses with explicit filters
    const statusesToFetch = quickMode ? QUICK_SECONDARY_STATUSES : SECONDARY_TRANSACTION_STATUSES;
    console.log(`[STEP 2] Fetching ${statusesToFetch.length} secondary statuses...`);
    
    for (const txStatus of statusesToFetch) {
      try {
        console.log(`  Fetching status: ${txStatus}...`);
        const salesForStatus = await fetchAllSales(projectId, startDate, endDate, txStatus);
        console.log(`    Found ${salesForStatus.length} sales with status ${txStatus}`);
        allSales.push(...salesForStatus);
      } catch (statusError) {
        console.error(`  Error fetching status ${txStatus}:`, statusError);
      }
      
      // Small delay between status calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    console.log(`=== TOTAL SALES FETCHED: ${allSales.length} ===`);
  }
  
  if (allSales.length === 0) {
    return { synced: 0, updated: 0, errors: 0, categoryStats: {} };
  }
  
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

  // Prepare all sales data
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
    // Try structure 2: buyer.checkout_phone as full string
    else if (buyer?.checkout_phone) {
      const fullPhone = String(buyer.checkout_phone).replace(/\D/g, '');
      if (fullPhone.length >= 10) {
        if (fullPhone.startsWith('55') && fullPhone.length >= 12) {
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(2, 4);
          phoneNumber = fullPhone.substring(4);
        } else if (fullPhone.length === 11) {
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(0, 2);
          phoneNumber = fullPhone.substring(2);
        } else if (fullPhone.length === 10) {
          phoneCountryCode = '55';
          phoneDdd = fullPhone.substring(0, 2);
          phoneNumber = fullPhone.substring(2);
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
  
  // =====================================================
  // SALES CORE - DISABLED (ARCHITECTURAL DECISION)
  // =====================================================
  // REASON: API sync should NOT write financial data to sales_core_events.
  // Financial data (net_amount, fees, splits) must ONLY come from:
  //   1. Hotmart webhooks (with commissions[] array)
  //   2. Future CSV import (official ledger from Hotmart)
  // 
  // The API endpoint GET /sales/history does NOT reliably return
  // detailed commission breakdowns for all transactions.
  // 
  // This function now ONLY syncs:
  //   - hotmart_sales table (raw commercial metadata)
  //   - offer_mappings (auto-creation of new offer codes)
  //
  // REMOVED CODE:
  //   - batchFindContactIds() call
  //   - extractFinancialBreakdown() for PRODUCER commission
  //   - batchWriteSalesCoreEvents() call
  //
  // MIGRATION DATE: 2025-01-15
  // =====================================================
  console.log('[SalesCore] SKIPPED: API sync does not write financial data to sales_core_events');
  console.log('[SalesCore] Financial data comes ONLY from webhooks and CSV imports');
  
  // Auto-create offer mappings for new offer codes
  const existingOfferCodes = new Set(offerMappings?.map(m => m.codigo_oferta).filter(Boolean) || []);
  const newOfferCodes = new Set<string>();
  
  const offerDataMap = new Map<string, { productName: string; bestPrice: number | null }>();
  
  for (const sale of sales) {
    const offerCode = sale.purchase.offer?.code;
    if (!offerCode || existingOfferCodes.has(offerCode) || newOfferCodes.has(offerCode)) continue;
    
    newOfferCodes.add(offerCode);
    
    const productName = sale.product?.name || 'Produto Desconhecido';
    const currencyCode = sale.purchase.price?.currency_code || 'BRL';
    const totalPrice = sale.purchase.price?.value || null;
    
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
    const { endpoint, params, apiType, projectId: bodyProjectId, action, startDate, endDate, status, quickMode } = await req.json();
    
    // CANONICAL: Resolve project_id from X-Project-Code header (preferred)
    const projectCode = req.headers.get('X-Project-Code');
    let projectId = bodyProjectId;
    
    if (projectCode) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('public_code', projectCode)
        .maybeSingle();
      
      if (projectError || !project) {
        console.error('[hotmart-api] Invalid project code:', projectCode);
        throw new Error(`Invalid project code: ${projectCode}`);
      }
      
      projectId = project.id;
      console.log(`[hotmart-api] Resolved project code "${projectCode}" to id "${projectId}"`);
    }
    
    console.log('Hotmart API request:', { endpoint, apiType, projectId, action, quickMode });

    if (!projectId) {
      throw new Error('Project ID is required. Pass X-Project-Code header or projectId in body.');
    }

    // Handle sync_sales action
    if (action === 'sync_sales') {
      if (!startDate || !endDate) {
        throw new Error('startDate and endDate are required for sync_sales');
      }
      
      const periodMs = endDate - startDate;
      const periodDays = periodMs / (1000 * 60 * 60 * 24);
      
      // If period > 45 days, split into monthly chunks to avoid 10k limit
      if (periodDays > 45) {
        console.log(`Large period detected (${Math.round(periodDays)} days), splitting into monthly chunks...`);
        
        const chunks: { start: number; end: number }[] = [];
        let chunkStart = new Date(startDate);
        const finalEnd = new Date(endDate);
        
        while (chunkStart < finalEnd) {
          const chunkEnd = new Date(chunkStart);
          chunkEnd.setMonth(chunkEnd.getMonth() + 1);
          chunkEnd.setDate(0);
          chunkEnd.setHours(23, 59, 59, 999);
          
          const actualEnd = chunkEnd > finalEnd ? finalEnd : chunkEnd;
          
          chunks.push({
            start: chunkStart.getTime(),
            end: actualEnd.getTime()
          });
          
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
          
          const result = await syncSales(projectId, chunk.start, chunk.end, status, true, quickMode === true);
          totalSynced += result.synced;
          totalErrors += result.errors;
          
          Object.keys(result.categoryStats || {}).forEach(key => {
            combinedStats[key] = (combinedStats[key] || 0) + (result.categoryStats?.[key] || 0);
          });
          
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
          chunks: chunks.length,
          method: 'oauth_direct'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Small period - sync directly
      const result = await syncSales(projectId, startDate, endDate, status, true, quickMode === true);
      
      return new Response(JSON.stringify({ ...result, method: 'oauth_direct' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // API passthrough logic
    console.log(`[hotmart-api] Passthrough request: ${endpoint}, apiType: ${apiType}`);
    
    // ============================================
    // API ROUTING
    // ============================================
    // Products API → Client Credentials (no OAuth required)
    // Payments API → OAuth (requires user authorization)
    // ============================================
    if (apiType === 'products') {
      // Pass endpoint directly - callHotmartProductsAPI handles path normalization
      // endpoint examples: /products, /products/123/offers, /products/123/plans
      const data = await callHotmartProductsAPI(projectId, endpoint, params || {});
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Default: Payments API via OAuth
    const fullPath = `/payments/api/v1/${endpoint}`;
    const data = await callHotmartAPI(projectId, fullPath, params || {});
    
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
      },
    );
  }
});
