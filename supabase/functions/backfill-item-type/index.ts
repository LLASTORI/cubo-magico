import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// SEMANTIC BACKFILL - order_items.item_type
// ============================================
// 
// Purpose: Re-evaluate and correct item_type for existing order_items
// based on the canonical heuristic that uses parent_purchase_transaction.
//
// Rules:
// 1. is_order_bump=false → main
// 2. is_order_bump=true + parent_tx exists → bump
// 3. is_order_bump=true + parent_tx=null → main (semantic fallback)
// 4. offer name contains upsell/downsell → upsell/downsell
//
// Safety:
// - Only updates order_items.item_type
// - Does NOT touch financial columns (customer_paid, producer_net, ledger_events)
// - Idempotent: skips items already correctly classified
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Determine item type from Hotmart payload
 * 
 * Rules:
 * 1. is_order_bump=false → main
 * 2. is_order_bump=true + parent_tx=null → main (semantic fallback)
 * 3. is_order_bump=true + parent_tx === transaction (self-ref) → main
 * 4. is_order_bump=true + parent_tx !== transaction → bump
 * 5. offer name contains upsell/downsell → upsell/downsell
 */
function resolveItemTypeFromPayload(payload: any): string {
  const purchase = payload?.data?.purchase;
  
  // Upsell/Downsell detection (via offer name) - check first
  const offerName = purchase?.offer?.name?.toLowerCase() || '';
  if (offerName.includes('upsell')) return 'upsell';
  if (offerName.includes('downsell')) return 'downsell';
  
  // Order bump detection with SEMANTIC FALLBACK
  if (purchase?.order_bump?.is_order_bump === true) {
    const parentTx = purchase?.order_bump?.parent_purchase_transaction;
    const ownTx = purchase?.transaction;
    
    if (parentTx && parentTx !== '') {
      // Self-referencing: parent equals own transaction → this is the main product
      if (parentTx === ownTx) {
        return 'main';
      }
      // Real bump: parent is different from own transaction
      return 'bump';
    }
    // is_order_bump=true + parent_tx=null → this is the main product
    return 'main';
  }
  
  return 'main';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional filters
    let projectId: string | null = null;
    let dryRun = false;
    let batchSize = 500;

    try {
      const body = await req.json();
      projectId = body.project_id || null;
      dryRun = body.dry_run === true;
      batchSize = body.batch_size || 500;
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`[backfill-item-type] Starting. dry_run=${dryRun}, project_id=${projectId || 'ALL'}, batch_size=${batchSize}`);

    // Step 1: Fetch order_items that are currently 'bump'
    // These are candidates for potential reclassification
    let query = supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        item_type,
        orders!inner (
          id,
          project_id,
          raw_payload
        )
      `)
      .eq('item_type', 'bump')
      .limit(batchSize);

    if (projectId) {
      query = query.eq('orders.project_id', projectId);
    }

    const { data: items, error: fetchError } = await query;

    if (fetchError) {
      console.error('[backfill-item-type] Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!items || items.length === 0) {
      console.log('[backfill-item-type] No bump items found to evaluate');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No bump items found to evaluate',
          stats: { evaluated: 0, updated: 0, skipped: 0, errors: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[backfill-item-type] Found ${items.length} bump items to evaluate`);

    // Step 2: Evaluate each item and determine correct type
    const updates: Array<{ id: string; newType: string; orderId: string }> = [];
    const skipped: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of items) {
      try {
        const order = (item as any).orders;
        
        if (!order?.raw_payload) {
          console.log(`[backfill-item-type] Item ${item.id}: No raw_payload, skipping`);
          skipped.push(item.id);
          continue;
        }

        const payload = order.raw_payload;
        const newType = resolveItemTypeFromPayload(payload);

        if (newType !== item.item_type) {
          updates.push({
            id: item.id,
            newType,
            orderId: item.order_id
          });
          console.log(`[backfill-item-type] Item ${item.id}: ${item.item_type} → ${newType}`);
        } else {
          skipped.push(item.id);
        }
      } catch (err) {
        console.error(`[backfill-item-type] Error processing item ${item.id}:`, err);
        errors.push({ id: item.id, error: String(err) });
      }
    }

    // Step 3: Apply updates (unless dry run)
    let updatedCount = 0;

    if (!dryRun && updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('order_items')
          .update({ item_type: update.newType })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[backfill-item-type] Failed to update ${update.id}:`, updateError);
          errors.push({ id: update.id, error: updateError.message });
        } else {
          updatedCount++;
        }
      }
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      dry_run: dryRun,
      stats: {
        evaluated: items.length,
        to_update: updates.length,
        updated: dryRun ? 0 : updatedCount,
        skipped: skipped.length,
        errors: errors.length
      },
      updates: updates.map(u => ({ id: u.id, from: 'bump', to: u.newType, order_id: u.orderId })),
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration
    };

    console.log(`[backfill-item-type] Complete:`, JSON.stringify(result.stats));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[backfill-item-type] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
