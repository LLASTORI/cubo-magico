import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-project-code',
};

// ============================================
// HOTMART BACKFILL - Reconstruct sales_core_events from hotmart_sales
// ============================================
// This function populates sales_core_events from historical hotmart_sales data
// that was synced via API but never received webhook events.
//
// IDEMPOTENT: Uses provider_event_id pattern to avoid duplicates
// ============================================

// Map Hotmart status to canonical event types
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

// Calculate economic_day from occurred_at in project timezone (Brazil UTC-3)
function calculateEconomicDay(occurredAt: Date): string {
  const offsetHours = -3;
  const adjustedDate = new Date(occurredAt.getTime() + offsetHours * 60 * 60 * 1000);
  return adjustedDate.toISOString().split('T')[0];
}

interface BackfillResult {
  runId: string;
  totalSalesFound: number;
  eventsCreated: number;
  eventsSkipped: number;
  errors: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { projectId, startDate } = body;

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Backfill] Starting for project ${projectId}, user ${user.id}`);

    // Verify user has access to project
    const { data: projectAccess } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .or(`user_id.eq.${user.id}`)
      .maybeSingle();

    const { data: memberAccess } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!projectAccess && !memberAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied to project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create backfill run record
    const startDateParsed = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000); // Default 24 months
    const endDate = new Date();

    const { data: runData, error: runError } = await supabase
      .from('hotmart_backfill_runs')
      .insert({
        project_id: projectId,
        start_date: startDateParsed.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        executed_by: user.id,
        status: 'running',
      })
      .select('id')
      .single();

    if (runError) {
      console.error('[Backfill] Failed to create run record:', runError);
      return new Response(
        JSON.stringify({ error: 'Failed to create backfill run record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const runId = runData.id;
    console.log(`[Backfill] Created run ${runId}`);

    try {
      const result = await runBackfill(supabase, projectId, runId, startDateParsed, endDate);
      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err: any) {
      // Update run as failed
      await supabase
        .from('hotmart_backfill_runs')
        .update({
          status: 'failed',
          error_message: err.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId);

      return new Response(
        JSON.stringify({ error: err.message, runId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('[Backfill] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function runBackfill(
  supabase: any,
  projectId: string,
  runId: string,
  startDate: Date,
  endDate: Date
): Promise<BackfillResult> {
  console.log(`[Backfill] Processing ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Step 1: Get all hotmart_sales for the project in date range
  // Only process APPROVED and COMPLETE (purchases)
  const { data: hotmartSales, error: salesError } = await supabase
    .from('hotmart_sales')
    .select('*')
    .eq('project_id', projectId)
    .in('status', ['APPROVED', 'COMPLETE'])
    .gte('sale_date', startDate.toISOString())
    .lte('sale_date', endDate.toISOString())
    .order('sale_date', { ascending: true });

  if (salesError) {
    throw new Error(`Failed to fetch hotmart_sales: ${salesError.message}`);
  }

  const totalSalesFound = hotmartSales?.length || 0;
  console.log(`[Backfill] Found ${totalSalesFound} sales to process`);

  if (totalSalesFound === 0) {
    await supabase
      .from('hotmart_backfill_runs')
      .update({
        status: 'completed',
        total_sales_found: 0,
        events_created: 0,
        events_skipped: 0,
        errors: 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return {
      runId,
      totalSalesFound: 0,
      eventsCreated: 0,
      eventsSkipped: 0,
      errors: 0,
      status: 'completed',
    };
  }

  // Step 2: Get existing events to check for duplicates
  const transactionIds = hotmartSales.map((s: any) => s.transaction_id);
  const providerEventPatterns = transactionIds.map((t: string) => `hotmart_${t}_%`);

  // Check which transactions already have events
  const { data: existingEvents } = await supabase
    .from('sales_core_events')
    .select('provider_event_id')
    .eq('project_id', projectId)
    .eq('provider', 'hotmart')
    .eq('is_active', true);

  const existingTransactions = new Set<string>();
  if (existingEvents) {
    for (const event of existingEvents) {
      // Extract transaction from provider_event_id (format: hotmart_HPXXXXXXXXX_STATUS)
      const match = event.provider_event_id.match(/hotmart_([A-Z0-9]+)_/);
      if (match) {
        existingTransactions.add(match[1]);
      }
    }
  }

  console.log(`[Backfill] Found ${existingTransactions.size} existing transactions`);

  // Step 3: Find contacts by email
  const emails = [...new Set(hotmartSales.map((s: any) => s.buyer_email?.toLowerCase()).filter(Boolean))];
  
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

  // Step 4: Prepare events for insertion
  const eventsToInsert: any[] = [];
  let eventsSkipped = 0;

  for (const sale of hotmartSales) {
    // Check if already exists
    if (existingTransactions.has(sale.transaction_id)) {
      eventsSkipped++;
      continue;
    }

    const status = sale.status;
    const canonicalEventType = hotmartStatusToCanonicalEventType[status];
    
    if (!canonicalEventType) {
      eventsSkipped++;
      continue;
    }

    const occurredAt = new Date(sale.sale_date);
    const economicDay = calculateEconomicDay(occurredAt);
    
    // Use BACKFILL suffix to mark synthetic events
    const providerEventId = `hotmart_${sale.transaction_id}_BACKFILL`;
    
    // Calculate amounts - use total_price as gross, net_revenue if available
    const grossAmount = sale.total_price || sale.product_price || 0;
    const netAmount = sale.net_revenue || grossAmount * 0.9; // Fallback: estimate 90% if no net

    // Build attribution from UTM fields
    const attribution: Record<string, any> = {
      source: 'api_backfill',
      utm_source: sale.utm_source || null,
      utm_campaign: sale.utm_campaign_id || null,
      utm_adset: sale.utm_adset_name || null,
      utm_placement: sale.utm_placement || null,
      utm_creative: sale.utm_creative || null,
    };

    // Find contact
    const contactEmail = sale.buyer_email?.toLowerCase();
    const contactId = contactEmail ? emailToContactId.get(contactEmail) || null : null;

    eventsToInsert.push({
      project_id: projectId,
      provider: 'hotmart',
      provider_event_id: providerEventId,
      event_type: canonicalEventType,
      gross_amount: grossAmount,
      net_amount: netAmount,
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
  }

  console.log(`[Backfill] Prepared ${eventsToInsert.length} events, skipped ${eventsSkipped}`);

  // Step 5: Insert in batches
  let eventsCreated = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < eventsToInsert.length; i += BATCH_SIZE) {
    const batch = eventsToInsert.slice(i, i + BATCH_SIZE);
    
    const { error: insertError } = await supabase
      .from('sales_core_events')
      .insert(batch);

    if (insertError) {
      console.error(`[Backfill] Batch insert error:`, insertError);
      // Check if it's a duplicate key error (some events already exist)
      if (insertError.code === '23505') {
        // Try individual inserts for this batch
        for (const event of batch) {
          const { error: singleError } = await supabase
            .from('sales_core_events')
            .insert(event);
          
          if (singleError) {
            if (singleError.code === '23505') {
              eventsSkipped++;
            } else {
              errors++;
            }
          } else {
            eventsCreated++;
          }
        }
      } else {
        errors += batch.length;
      }
    } else {
      eventsCreated += batch.length;
    }
  }

  // Step 6: Update run record
  await supabase
    .from('hotmart_backfill_runs')
    .update({
      status: 'completed',
      total_sales_found: totalSalesFound,
      events_created: eventsCreated,
      events_skipped: eventsSkipped,
      errors,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);

  console.log(`[Backfill] Completed: ${eventsCreated} created, ${eventsSkipped} skipped, ${errors} errors`);

  return {
    runId,
    totalSalesFound,
    eventsCreated,
    eventsSkipped,
    errors,
    status: 'completed',
  };
}
