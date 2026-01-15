import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// HOTMART FINANCIAL SYNC - DEPRECATED
// ============================================
// STATUS: DISABLED (Architectural Decision - 2025-01-15)
//
// REASON: This function fetched financial data from Hotmart's
// GET /payments/api/v1/sales/history endpoint and wrote to finance_ledger.
//
// PROBLEM: The API does NOT return reliable commission breakdowns.
// Many transactions lack the commissions[] array or have incomplete data.
// Using API data for financial calculations led to inaccurate:
//   - Net revenue (net_amount)
//   - Platform fees
//   - Affiliate/coproducer splits
//   - ROAS and profit calculations
//
// NEW ARCHITECTURE:
// Financial data MUST come ONLY from:
//   1. Hotmart WEBHOOKS (real-time, with complete commissions[])
//   2. Future CSV IMPORT (official Hotmart financial reports)
//
// The API sync (hotmart-api) now ONLY handles:
//   - Commercial metadata (hotmart_sales table)
//   - Offer mappings
//   - Historical backfill for CRM contacts
//
// This function is kept for reference but will return an error if called.
// ============================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ProjectCredentials {
  client_id: string | null;
  client_secret: string | null;
  basic_auth: string | null;
  hotmart_access_token: string | null;
  hotmart_refresh_token: string | null;
  hotmart_expires_at: string | null;
}

interface LedgerEntry {
  project_id: string;
  provider: string;
  transaction_id: string;
  hotmart_sale_id: string | null;
  event_type: string;
  actor_type: string | null;
  actor_id: string | null;
  amount: number;
  currency: string;
  occurred_at: string;
  source_api: string;
  raw_payload: any;
}

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
}

// Refresh the access token using refresh_token
async function refreshAccessToken(
  supabase: any,
  projectId: string,
  credentials: ProjectCredentials
): Promise<string> {
  console.log('[FINANCE SYNC] Refreshing access token for project:', projectId)

  const tokenUrl = 'https://developers.hotmart.com/oauth/token'
  
  const tokenBody = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: credentials.client_id!,
    client_secret: credentials.client_secret!,
    refresh_token: credentials.hotmart_refresh_token!,
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
    if (tokenText.includes('<!DOCTYPE') || tokenText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF). Reconecte via OAuth.')
    }
    throw new Error(`Refresh failed: ${tokenText.slice(0, 200)}`)
  }

  const tokenData = JSON.parse(tokenText)
  const { access_token, refresh_token: new_refresh_token, expires_in } = tokenData

  if (!access_token) {
    throw new Error('No access_token in refresh response')
  }

  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

  const updateData: any = {
    hotmart_access_token: access_token,
    hotmart_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }

  if (new_refresh_token) {
    updateData.hotmart_refresh_token = new_refresh_token
  }

  await supabase
    .from('project_credentials')
    .update(updateData)
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')

  console.log('[FINANCE SYNC] ✅ Token refreshed, expires:', expiresAt)
  return access_token
}

// Get a valid access token (refresh if needed)
async function getValidAccessToken(
  supabase: any,
  projectId: string,
  credentials: ProjectCredentials
): Promise<string> {
  if (!credentials.hotmart_refresh_token) {
    throw new Error('Hotmart não conectado via OAuth. Use o botão "Conectar Hotmart (OAuth)" nas configurações.')
  }

  const expiresAt = credentials.hotmart_expires_at ? new Date(credentials.hotmart_expires_at) : null
  const now = new Date()
  const bufferMs = 5 * 60 * 1000

  if (credentials.hotmart_access_token && expiresAt && expiresAt.getTime() > now.getTime() + bufferMs) {
    return credentials.hotmart_access_token
  }

  return await refreshAccessToken(supabase, projectId, credentials)
}

// Call Hotmart API directly with OAuth token
async function callHotmartAPI(
  accessToken: string,
  path: string,
  params: Record<string, string> = {}
): Promise<any> {
  const url = new URL(`https://developers.hotmart.com${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }

  console.log(`[FINANCE SYNC] API call: ${path}`)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...BROWSER_HEADERS,
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  const rawText = await response.text()

  if (!response.ok) {
    if (rawText.includes('<!DOCTYPE') || rawText.includes('<html')) {
      throw new Error('Hotmart bloqueou a requisição (WAF).')
    }
    throw new Error(`Hotmart API error (${response.status}): ${rawText.slice(0, 200)}`)
  }

  return JSON.parse(rawText)
}

// Fetch sales from Hotmart API with commission details
async function fetchHotmartSalesWithCommissions(
  accessToken: string,
  startDate: number,
  endDate: number,
  maxPages: number = 100
): Promise<any[]> {
  const allSales: any[] = [];
  let nextPageToken: string | null = null;

  console.log(
    `[FINANCE SYNC] Fetching sales from ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`
  );

  for (let page = 1; page <= maxPages; page++) {
    const params: Record<string, string> = {
      start_date: startDate.toString(),
      end_date: endDate.toString(),
      max_results: '100',
    };
    
    if (nextPageToken) {
      params.page_token = nextPageToken;
    }

    try {
      const data = await callHotmartAPI(accessToken, '/payments/api/v1/sales/history', params);
      
      const items = data?.items || [];
      allSales.push(...items);

      console.log(`[FINANCE SYNC] Page ${page}: ${items.length} sales`);

      nextPageToken = data?.next_page_token || null;

      // Stop when there is no next page token or no items returned
      if (!nextPageToken || items.length === 0) {
        break;
      }

      await new Promise((r) => setTimeout(r, 200)); // Rate limit protection
    } catch (error: any) {
      if (error.message?.includes('429')) {
        console.log('[FINANCE SYNC] Rate limited (429), waiting 5s...');
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw error;
    }
  }

  return allSales;
}

// Parse commissions from a sale and create ledger entries
function parseCommissionsToLedgerEntries(
  projectId: string,
  sale: any,
  occurredAt: Date
): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const transactionId = sale.purchase?.transaction;
  
  if (!transactionId) {
    return entries;
  }

  const commissions = sale.commissions || [];
  const occurredAtStr = occurredAt.toISOString();

  // Process each commission
  for (const comm of commissions) {
    const source = (comm.source || '').toUpperCase();
    const value = comm.value ?? 0;
    
    if (value === 0) continue;

    let eventType: string;
    let actorType: string;
    let actorId: string | null = null;

    switch (source) {
      case 'MARKETPLACE':
        eventType = 'platform_fee';
        actorType = 'platform';
        break;
      case 'PRODUCER':
        eventType = 'credit';
        actorType = 'producer';
        break;
      case 'CO_PRODUCER':
        eventType = 'coproducer';
        actorType = 'coproducer';
        actorId = sale.producer?.name || null;
        break;
      case 'AFFILIATE':
        eventType = 'affiliate';
        actorType = 'affiliate';
        actorId = sale.affiliate?.affiliate_code || sale.affiliate?.name || null;
        break;
      default:
        console.log(`[FinancialSync] Unknown commission source: ${source}`);
        continue;
    }

    entries.push({
      project_id: projectId,
      provider: 'hotmart',
      transaction_id: transactionId,
      hotmart_sale_id: transactionId,
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId,
      amount: value,
      currency: comm.currency_code || 'BRL',
      occurred_at: occurredAtStr,
      source_api: 'sales_history',
      raw_payload: comm,
    });
  }

  return entries;
}

// Add refund/chargeback entries from sale status
function parseStatusToLedgerEntry(
  projectId: string,
  sale: any,
  occurredAt: Date
): LedgerEntry | null {
  const transactionId = sale.purchase?.transaction;
  const status = sale.purchase?.status;
  
  if (!transactionId || !status) return null;

  // Only create entries for refunds/chargebacks
  if (!['REFUNDED', 'PARTIALLY_REFUNDED', 'CHARGEBACK', 'CANCELLED'].includes(status)) {
    return null;
  }

  // Use the price value for the refund amount
  const refundAmount = sale.purchase?.price?.value || sale.purchase?.full_price?.value || 0;
  if (refundAmount === 0) return null;

  let eventType: string;
  switch (status) {
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
    case 'CANCELLED':
      eventType = 'refund';
      break;
    case 'CHARGEBACK':
      eventType = 'chargeback';
      break;
    default:
      return null;
  }

  return {
    project_id: projectId,
    provider: 'hotmart',
    transaction_id: transactionId,
    hotmart_sale_id: transactionId,
    event_type: eventType,
    actor_type: 'producer',
    actor_id: null,
    amount: -refundAmount, // Negative because it's money going out
    currency: sale.purchase?.price?.currency_code || 'BRL',
    occurred_at: occurredAt.toISOString(),
    source_api: 'sales_history',
    raw_payload: { status, amount: refundAmount },
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // =====================================================
  // FUNCTION DISABLED - Return informative error
  // =====================================================
  // This function has been deprecated as part of the
  // architectural decision to separate API sync from
  // financial data management.
  //
  // Financial data now comes ONLY from:
  //   1. Hotmart webhooks (hotmart-webhook function)
  //   2. Future CSV import functionality
  // =====================================================
  
  console.log('[DEPRECATED] hotmart-financial-sync called but is disabled');
  
  return new Response(
    JSON.stringify({
      error: 'FUNCTION_DEPRECATED',
      message: 'Esta função foi desativada. Dados financeiros agora vêm exclusivamente dos webhooks Hotmart.',
      recommendation: 'Use a sincronização normal via API para metadados comerciais (hotmart_sales). Para dados financeiros precisos, os webhooks Hotmart são a única fonte confiável.',
      migrationDate: '2025-01-15',
      documentation: 'A API da Hotmart não retorna breakdown de comissões confiável. Use webhooks para net_amount correto.',
    }),
    {
      status: 410, // HTTP 410 Gone - indicates resource no longer available
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});

// =====================================================
// LEGACY CODE PRESERVED FOR REFERENCE ONLY
// =====================================================
// The following functions were used when this edge function
// was active. They are kept here for documentation purposes
// but are no longer executed:
//
// - refreshAccessToken(): Refreshed OAuth tokens
// - getValidAccessToken(): Managed token lifecycle
// - callHotmartAPI(): Called Hotmart API with OAuth
// - fetchHotmartSalesWithCommissions(): Fetched sales history
// - parseCommissionsToLedgerEntries(): Parsed commissions to ledger
// - parseStatusToLedgerEntry(): Created refund/chargeback entries
//
// REASON FOR DEPRECATION:
// The GET /payments/api/v1/sales/history endpoint does not
// reliably return the commissions[] array for all transactions.
// This led to incomplete financial data in finance_ledger.
//
// NEW APPROACH:
// - Webhooks (hotmart-webhook) receive events in real-time
//   with complete commission breakdowns
// - Future CSV import will allow manual reconciliation
//   using official Hotmart financial reports
// =====================================================
