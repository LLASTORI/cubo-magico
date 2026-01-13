import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// SALES CORE PROVIDER - Hotmart Revenue Ingestion (API Sync)
// ============================================

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

// ============================================
// HOTMART API STATUS HANDLING - CRITICAL FIX
// ============================================
// The Hotmart Sales History API has a special behavior:
// - When NO transaction_status filter is passed, it returns ONLY "APPROVED" and "COMPLETE" sales
// - When a specific status filter IS passed (e.g., transaction_status=APPROVED), 
//   the API may return 0 results even if APPROVED sales exist
//
// SOLUTION:
// 1. First fetch WITHOUT any status filter → gets APPROVED + COMPLETE (the main revenue)
// 2. Then fetch OTHER statuses individually with filters
//
// Source: https://developers.hotmart.com/docs/en/v1/sales/sales-history/
// "if you do not set up the transaction or transaction_status filters for this endpoint, 
//  it'll only return the 'APPROVED' and 'COMPLETE' statuses."
// ============================================

// Statuses that require explicit filtering (NOT returned by default)
// APPROVED and COMPLETE are excluded because they're returned by the default (no filter) call
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

// PRIMARY statuses for quick search (subset of secondary for faster syncs)
const QUICK_SECONDARY_STATUSES = [
  'WAITING_PAYMENT',
  'CANCELLED',
  'REFUNDED',
  'CHARGEBACK',
];

// Sync sales to database - FIXED with proper Hotmart API behavior
// The sync now correctly handles the Hotmart API quirk where APPROVED/COMPLETE
// must be fetched WITHOUT a status filter
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
  
  // Get credentials and token
  const credentials = await getProjectCredentials(projectId);
  const token = await getHotmartToken(credentials);
  
  // Fetch sales from Hotmart
  console.log(`Syncing sales from ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`);
  console.log(`Mode: ${quickMode ? 'QUICK' : 'FULL'}`);
  
  let allSales: HotmartSale[] = [];
  
  // If a specific status is requested, just fetch that one
  if (status) {
    console.log(`Fetching specific status: ${status}`);
    allSales = await fetchAllSales(token, startDate, endDate, status);
    console.log(`Sales fetched for status ${status}: ${allSales.length}`);
  } else if (!fetchAllStatuses) {
    // Legacy behavior: fetch without status filter (returns APPROVED + COMPLETE only)
    console.log('Fetching without status filter (APPROVED + COMPLETE only)...');
    allSales = await fetchAllSales(token, startDate, endDate, undefined);
    console.log(`Sales fetched (default APPROVED+COMPLETE): ${allSales.length}`);
  } else {
    // FULL SYNC with correct Hotmart API behavior
    console.log('=== FULL SYNC MODE ===');
    
    // STEP 1: Fetch APPROVED + COMPLETE without any filter (critical for revenue!)
    console.log('STEP 1: Fetching APPROVED + COMPLETE (no status filter)...');
    try {
      const primarySales = await fetchAllSales(token, startDate, endDate, undefined);
      console.log(`  ✓ APPROVED + COMPLETE: ${primarySales.length} sales`);
      allSales.push(...primarySales);
    } catch (primaryError) {
      console.error('  ✗ Error fetching APPROVED+COMPLETE:', primaryError);
    }
    
    // STEP 2: Fetch secondary statuses with explicit filters
    const statusesToFetch = quickMode ? QUICK_SECONDARY_STATUSES : SECONDARY_TRANSACTION_STATUSES;
    console.log(`STEP 2: Fetching ${statusesToFetch.length} secondary statuses...`);
    
    for (const txStatus of statusesToFetch) {
      try {
        console.log(`  Fetching status: ${txStatus}...`);
        const salesForStatus = await fetchAllSales(token, startDate, endDate, txStatus);
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
  
  // STANDARDIZED exchange rates - MUST match webhook rates exactly
  // Using fixed rates to ensure consistency between webhook and API
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
  
  console.log('Using standardized exchange rates (matching webhook):', exchangeRates);

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
  
  // =====================================================
  // SALES CORE - Write canonical revenue events in batch
  // CORRECT FINANCIAL MAPPING:
  // - gross_amount = full_price (valor pago pelo comprador)
  // - net_amount = PRODUCER commission ("Você recebeu" - owner's money)
  // =====================================================
  let salesCoreStats = { synced: 0, versioned: 0, errors: 0 };
  try {
    console.log('[SalesCore] Writing canonical revenue events in batch...');
    console.log('[SalesCore] Using CORRECT financial mapping: net_amount = PRODUCER commission');
    
    // Find contact IDs for all sales
    const transactionToContactId = await batchFindContactIds(supabase, projectId, sales);
    
    // Prepare sales with CORRECT financial breakdown
    const salesWithFinancials = sales.map((sale) => {
      const contactId = transactionToContactId.get(sale.purchase.transaction) || null;
      const currencyCode = sale.purchase.price?.currency_code || 'BRL';
      const rate = exchangeRates[currencyCode] || 1;
      
      // CORRECT: Use full_price for gross (valor pago pelo comprador)
      // full_price includes taxes, price is after taxes (base)
      const fullPrice = (sale.purchase as any).full_price?.value || sale.purchase.price?.value || 0;
      const grossAmount = fullPrice * rate;
      
      // CORRECT: Extract PRODUCER commission as net_amount ("Você recebeu")
      const financials = extractFinancialBreakdown(sale.commissions);
      const ownerNet = financials.ownerNet; // PRODUCER source = owner's money
      
      // Log for verification on first few sales
      if (sales.indexOf(sale) < 3) {
        console.log(`[SalesCore] Transaction ${sale.purchase.transaction}:`);
        console.log(`  - Gross (full_price * rate): ${grossAmount}`);
        console.log(`  - Platform Fee (MARKETPLACE): ${financials.platformFee}`);
        console.log(`  - Owner Net (PRODUCER): ${ownerNet}`);
        console.log(`  - Coproducer (CO_PRODUCER): ${financials.coproducerAmount}`);
        console.log(`  - Affiliate: ${financials.affiliateAmount}`);
      }
      
      return { sale, contactId, grossAmount, ownerNet };
    });
    
    // Batch write to sales_core_events
    salesCoreStats = await batchWriteSalesCoreEvents(supabase, projectId, salesWithFinancials);
    
    console.log(`[SalesCore] Canonical events: ${salesCoreStats.synced} new, ${salesCoreStats.versioned} versioned, ${salesCoreStats.errors} errors`);
  } catch (salesCoreError) {
    // Don't fail the sync if Sales Core fails
    console.error('[SalesCore] Error writing canonical events:', salesCoreError);
  }
  
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
    const { endpoint, params, apiType, projectId, action, startDate, endDate, status, quickMode } = await req.json();
    console.log('Hotmart API request:', { endpoint, apiType, projectId, action, quickMode });

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
          
          // Pass quickMode to syncSales
          const result = await syncSales(projectId, chunk.start, chunk.end, status, true, quickMode === true);
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
      
      // Small period - sync directly with quickMode
      const result = await syncSales(projectId, startDate, endDate, status, true, quickMode === true);
      
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
