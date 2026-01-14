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
// It calls the following Hotmart endpoints:
// 1. Sales API (with commissions) - for transaction-level financial breakdown
//
// The ledger becomes the SINGLE SOURCE OF TRUTH for all financial data.
// ============================================

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

// Get Hotmart access token
async function getHotmartToken(credentials: ProjectCredentials): Promise<string> {
  const { client_id, client_secret, basic_auth } = credentials;

  if (!client_id || !client_secret) {
    throw new Error('Missing Hotmart credentials');
  }

  const authHeader = basic_auth || btoa(`${client_id}:${client_secret}`);

  // Hotmart OAuth can require client_id/client_secret in the querystring.
  // We mirror the proven implementation used in the hotmart-api function.
  const url = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(
    client_id
  )}&client_secret=${encodeURIComponent(client_secret)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[FinancialSync] Token error:', response.status, errorText);
    throw new Error(`Failed to get Hotmart token: ${response.status}`);
  }

  const data: HotmartTokenResponse = await response.json();
  return data.access_token;
}

// Fetch sales from Hotmart API with commission details
async function fetchHotmartSalesWithCommissions(
  token: string,
  startDate: number,
  endDate: number,
  maxPages: number = 100
): Promise<any[]> {
  const allSales: any[] = [];
  let page = 1;
  let hasMore = true;

  console.log(`[FinancialSync] Fetching sales from ${new Date(startDate).toISOString()} to ${new Date(endDate).toISOString()}`);

  while (hasMore && page <= maxPages) {
    const url = new URL('https://developers.hotmart.com/payments/api/v1/sales/history');
    url.searchParams.set('start_date', startDate.toString());
    url.searchParams.set('end_date', endDate.toString());
    url.searchParams.set('max_results', '100');
    url.searchParams.set('page_token', page.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log('[FinancialSync] Rate limited, waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      console.error(`[FinancialSync] Sales API error: ${response.status}`);
      break;
    }

    const data = await response.json();
    const items = data.items || [];
    allSales.push(...items);

    console.log(`[FinancialSync] Page ${page}: ${items.length} sales`);

    if (items.length < 100) {
      hasMore = false;
    } else {
      page++;
      await new Promise(r => setTimeout(r, 200)); // Rate limit protection
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

  // If no PRODUCER commission found but we have the total price, 
  // we cannot reliably calculate net - skip this transaction
  // The ledger should only contain REAL financial data

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

    // Get Hotmart credentials (secrets are stored encrypted in DB; plaintext columns may be NULL)
    const { data: credentialsRow, error: credError } = await supabase
      .from('project_credentials')
      .select('client_id, client_secret, client_secret_encrypted, basic_auth, basic_auth_encrypted')
      .eq('project_id', projectId)
      .eq('provider', 'hotmart')
      .maybeSingle();

    if (credError || !credentialsRow) {
      return new Response(
        JSON.stringify({
          error:
            'Hotmart não configurado. Vá em Configurações → Hotmart e salve suas credenciais.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Resolve secrets (decrypt when encrypted columns exist)
    let clientSecret: string | null = credentialsRow.client_secret;
    let basicAuth: string | null = credentialsRow.basic_auth;

    if (credentialsRow.client_secret_encrypted) {
      const { data: decrypted, error: decryptError } = await supabase.rpc(
        'decrypt_sensitive',
        {
          p_encrypted_data: credentialsRow.client_secret_encrypted,
        }
      );
      if (decryptError) {
        console.error('[FinancialSync] Failed to decrypt client_secret:', decryptError);
      }
      if (decrypted) clientSecret = decrypted;
    }

    if (credentialsRow.basic_auth_encrypted) {
      const { data: decrypted, error: decryptError } = await supabase.rpc(
        'decrypt_sensitive',
        {
          p_encrypted_data: credentialsRow.basic_auth_encrypted,
        }
      );
      if (decryptError) {
        console.error('[FinancialSync] Failed to decrypt basic_auth:', decryptError);
      }
      if (decrypted) basicAuth = decrypted;
    }

    const credentials: ProjectCredentials = {
      client_id: credentialsRow.client_id,
      client_secret: clientSecret,
      basic_auth: basicAuth,
    };

    if (!credentials.client_id || !credentials.client_secret) {
      console.error(
        '[FinancialSync] Missing credentials (after decrypt) - client_id:',
        !!credentials.client_id,
        'client_secret:',
        !!credentials.client_secret,
        'has_client_secret_encrypted:',
        !!credentialsRow.client_secret_encrypted
      );
      return new Response(
        JSON.stringify({
          error:
            'Credenciais Hotmart incompletas. Client ID e Client Secret são obrigatórios. Vá em Configurações → Hotmart e salve novamente suas credenciais.',
          details: {
            hasClientId: !!credentials.client_id,
            hasClientSecret: !!credentials.client_secret,
            hasClientSecretEncrypted: !!credentialsRow.client_secret_encrypted,
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
      // Get Hotmart token
      console.log('[FinancialSync] Getting Hotmart token...');
      const token = await getHotmartToken(credentials);

      // Fetch all sales with commissions
      console.log('[FinancialSync] Fetching sales...');
      const sales = await fetchHotmartSalesWithCommissions(
        token,
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

      for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
        const batch = allEntries.slice(i, i + BATCH_SIZE);
        
        const { error: insertError, count } = await supabase
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
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
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
    console.error('[FinancialSync] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});