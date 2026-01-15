import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// HOTMART FINANCIAL SYNC - Ledger Population
// ============================================
// This function syncs financial data from Hotmart APIs to finance_ledger.
// MIGRATED TO OAUTH AUTHORIZATION CODE FLOW
// - Uses refresh_token to get fresh access_token
// - Calls Hotmart API directly (no proxy needed)
// The ledger becomes the SINGLE SOURCE OF TRUTH for all financial data.
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request
    const body = await req.json();
    const { projectId, monthsBack = 24 } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to project
    const { data: membership, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get credentials and validate OAuth connection
    const { data: credentialsRaw, error: credError } = await supabase
      .from('project_credentials')
      .select('client_id, client_secret, basic_auth, hotmart_access_token, hotmart_refresh_token, hotmart_expires_at')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .maybeSingle();

    if (credError || !credentialsRaw?.hotmart_refresh_token) {
      return new Response(
        JSON.stringify({
          error: 'Hotmart não conectado via OAuth. Use o botão "Conectar Hotmart (OAuth)" nas configurações.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const credentials: ProjectCredentials = {
      client_id: credentialsRaw.client_id,
      client_secret: credentialsRaw.client_secret,
      basic_auth: credentialsRaw.basic_auth,
      hotmart_access_token: credentialsRaw.hotmart_access_token,
      hotmart_refresh_token: credentialsRaw.hotmart_refresh_token,
      hotmart_expires_at: credentialsRaw.hotmart_expires_at,
    };

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, projectId, credentials);

    // Create sync run record
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const { data: syncRun, error: runError } = await supabase
      .from('finance_sync_runs')
      .insert({
        project_id: projectId,
        status: 'running',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        apis_synced: ['sales_history'],
        created_by: user.id,
      })
      .select('id')
      .single();

    if (runError) {
      console.error('[FinancialSync] Failed to create run record:', runError);
    }

    const runId = syncRun?.id;

    try {
      // Fetch all sales with commissions via OAuth
      console.log('[FinancialSync] Fetching sales via OAuth...');
      const sales = await fetchHotmartSalesWithCommissions(
        accessToken,
        startDate.getTime(),
        endDate.getTime()
      );

      console.log(`[FinancialSync] Processing ${sales.length} sales...`);

      // Parse sales into ledger entries
      const allEntries: LedgerEntry[] = [];
      let salesWithCommissions = 0;
      let salesWithoutCommissions = 0;

      for (const sale of sales) {
        const orderDate = sale.purchase?.order_date;
        const occurredAt = orderDate ? new Date(orderDate) : new Date();

        // Get commission entries
        const commissionEntries = parseCommissionsToLedgerEntries(projectId, sale, occurredAt);
        
        if (commissionEntries.length > 0) {
          salesWithCommissions++;
          allEntries.push(...commissionEntries);
        } else {
          salesWithoutCommissions++;
        }

        // Get refund/chargeback entry if applicable
        const statusEntry = parseStatusToLedgerEntry(projectId, sale, occurredAt);
        if (statusEntry) {
          allEntries.push(statusEntry);
        }
      }

      console.log(`[FinancialSync] Found ${salesWithCommissions} sales with commissions, ${salesWithoutCommissions} without`);
      console.log(`[FinancialSync] Total ledger entries to insert: ${allEntries.length}`);

      // Insert entries in batches (upsert to handle duplicates)
      let eventsCreated = 0;
      let eventsSkipped = 0;
      let errors = 0;
      const BATCH_SIZE = 100;
      let firstTransactionId: string | null = null;

      for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
        const batch = allEntries.slice(i, i + BATCH_SIZE);
        
        // Capture first transaction ID
        if (!firstTransactionId && batch.length > 0) {
          firstTransactionId = batch[0].transaction_id;
        }

        const { error: insertError } = await supabase
          .from('finance_ledger')
          .upsert(batch, {
            onConflict: 'provider,transaction_id,event_type,actor_type,actor_id,amount,occurred_at',
            ignoreDuplicates: true,
          });

        if (insertError) {
          // Check if it's a duplicate key error (expected)
          if (insertError.code === '23505') {
            eventsSkipped += batch.length;
          } else {
            console.error('[FinancialSync] Insert error:', insertError);
            errors += batch.length;
          }
        } else {
          // Supabase doesn't return count for upsert with ignoreDuplicates
          // So we count all as potentially created
          eventsCreated += batch.length;
        }
      }

      // Update sync run record
      if (runId) {
        await supabase
          .from('finance_sync_runs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            events_created: eventsCreated,
            events_skipped: eventsSkipped,
            errors: errors,
          })
          .eq('id', runId);
      }

      const result = {
        success: true,
        eventsCreated,
        eventsSkipped,
        errors,
        totalSales: sales.length,
        salesWithCommissions,
        salesWithoutCommissions,
        firstTransactionId,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        method: 'oauth_direct',
      };

      console.log('[FinancialSync] Sync completed:', result);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (syncError: any) {
      console.error('[FinancialSync] Sync error:', syncError);

      // Update sync run with error
      if (runId) {
        await supabase
          .from('finance_sync_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: syncError.message,
          })
          .eq('id', runId);
      }

      throw syncError;
    }

  } catch (error: any) {
    const message = error?.message || 'Erro desconhecido';
    console.error('[FinancialSync] Error:', error);

    const status =
      message.includes('Proxy request failed') ||
      message.includes('HOTMART_PROXY_URL')
        ? 400
        : 500;

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
