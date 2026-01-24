import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// SEMANTIC RECOVERY - order_items.item_type
// ============================================
// 
// Purpose: Recover item_type classification using the CORRECT source:
// provider_event_log.raw_payload (event-level, not order-level)
//
// Rules (applied per-item using event payload):
// 1. is_order_bump=false → main
// 2. is_order_bump=true + parent_tx exists → bump
// 3. is_order_bump=true + parent_tx=null → main (semantic fallback)
// 4. offer name contains upsell/downsell → upsell/downsell
//
// Safety:
// - Only updates order_items.item_type
// - Does NOT touch: orders, ledger_events, provider_order_map
// - Does NOT touch: created_at, approved_at, updated_at
// - Idempotent: skips items already correctly classified
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function resolveItemTypeFromEventPayload(payload: any): string {
  const purchase = payload?.data?.purchase;
  
  // Upsell/Downsell detection (via offer name) - check first
  const offerName = purchase?.offer?.name?.toLowerCase() || '';
  if (offerName.includes('upsell')) return 'upsell';
  if (offerName.includes('downsell')) return 'downsell';
  
  // Order bump detection with SEMANTIC FALLBACK
  if (purchase?.order_bump?.is_order_bump === true) {
    const parentTx = purchase?.order_bump?.parent_purchase_transaction;
    if (parentTx && parentTx !== '') {
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

    console.log(`[recover-item-type] Starting. dry_run=${dryRun}, project_id=${projectId || 'ALL'}, batch_size=${batchSize}`);

    // Step 1: Find items currently marked as 'main' that should be 'bump'
    // Based on their ACTUAL event payload in provider_event_log
    const recoveryQuery = `
      SELECT DISTINCT ON (oi.id)
        oi.id as item_id,
        oi.item_type as current_type,
        oi.provider_product_id,
        oi.offer_name,
        o.provider_order_id,
        o.project_id,
        pel.raw_payload
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN provider_event_log pel ON pel.project_id = o.project_id
        AND pel.provider = 'hotmart'
        AND (pel.raw_payload->>'event' IN ('PURCHASE_APPROVED', 'PURCHASE_COMPLETE'))
        AND (pel.raw_payload->'data'->'product'->>'id')::text = oi.provider_product_id
      WHERE oi.item_type = 'main'
      ${projectId ? `AND o.project_id = '${projectId}'` : ''}
      ORDER BY oi.id, pel.received_at DESC
      LIMIT ${batchSize}
    `;

    const { data: items, error: fetchError } = await supabase.rpc('exec_sql', { query: recoveryQuery });

    // Fallback: Use direct query if RPC not available
    let itemsToProcess: any[] = [];
    
    if (fetchError) {
      console.log('[recover-item-type] RPC not available, using direct query approach');
      
      // Get all main items
      let itemsQuery = supabase
        .from('order_items')
        .select(`
          id,
          item_type,
          provider_product_id,
          offer_name,
          order_id,
          orders!inner (
            id,
            project_id,
            provider_order_id
          )
        `)
        .eq('item_type', 'main')
        .limit(batchSize);

      if (projectId) {
        itemsQuery = itemsQuery.eq('orders.project_id', projectId);
      }

      const { data: mainItems, error: mainError } = await itemsQuery;

      if (mainError) {
        console.error('[recover-item-type] Error fetching main items:', mainError);
        return new Response(
          JSON.stringify({ success: false, error: mainError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!mainItems || mainItems.length === 0) {
        console.log('[recover-item-type] No main items found to evaluate');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'No main items found to evaluate',
            stats: { evaluated: 0, recovered: 0, skipped: 0, errors: 0 }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[recover-item-type] Found ${mainItems.length} main items to evaluate`);

      // For each main item, find its corresponding event in provider_event_log
      for (const item of mainItems) {
        const order = (item as any).orders;
        const itemProjectId = order?.project_id;
        
        if (!itemProjectId) continue;

        // Find matching event for this product
        const { data: events, error: eventError } = await supabase
          .from('provider_event_log')
          .select('raw_payload')
          .eq('project_id', itemProjectId)
          .eq('provider', 'hotmart')
          .filter('raw_payload->>event', 'in', '("PURCHASE_APPROVED","PURCHASE_COMPLETE")')
          .order('received_at', { ascending: false })
          .limit(100);

        if (eventError || !events) continue;

        // Find the event that matches this product
        for (const event of events) {
          const payload = event.raw_payload;
          const productId = payload?.data?.product?.id?.toString();
          
          if (productId === item.provider_product_id) {
            itemsToProcess.push({
              item_id: item.id,
              current_type: item.item_type,
              provider_product_id: item.provider_product_id,
              offer_name: item.offer_name,
              project_id: itemProjectId,
              raw_payload: payload
            });
            break; // Found matching event, move to next item
          }
        }
      }
    } else {
      itemsToProcess = items || [];
    }

    console.log(`[recover-item-type] Found ${itemsToProcess.length} items with matching events`);

    // Step 2: Evaluate each item and determine correct type based on EVENT payload
    const updates: Array<{ id: string; currentType: string; newType: string }> = [];
    const skipped: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of itemsToProcess) {
      try {
        const payload = item.raw_payload;
        
        if (!payload) {
          console.log(`[recover-item-type] Item ${item.item_id}: No event payload found, skipping`);
          skipped.push(item.item_id);
          continue;
        }

        // Apply heuristic to EVENT payload (not order payload!)
        const correctType = resolveItemTypeFromEventPayload(payload);

        if (correctType !== item.current_type) {
          updates.push({
            id: item.item_id,
            currentType: item.current_type,
            newType: correctType
          });
          console.log(`[recover-item-type] Item ${item.item_id}: ${item.current_type} → ${correctType}`);
        } else {
          skipped.push(item.item_id);
        }
      } catch (err) {
        console.error(`[recover-item-type] Error processing item ${item.item_id}:`, err);
        errors.push({ id: item.item_id, error: String(err) });
      }
    }

    // Step 3: Apply updates (unless dry run)
    let recoveredCount = 0;

    if (!dryRun && updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('order_items')
          .update({ item_type: update.newType })
          .eq('id', update.id);

        if (updateError) {
          console.error(`[recover-item-type] Failed to update ${update.id}:`, updateError);
          errors.push({ id: update.id, error: updateError.message });
        } else {
          recoveredCount++;
        }
      }
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      dry_run: dryRun,
      stats: {
        evaluated: itemsToProcess.length,
        to_recover: updates.length,
        recovered: dryRun ? 0 : recoveredCount,
        skipped: skipped.length,
        errors: errors.length
      },
      updates: updates.map(u => ({ 
        id: u.id, 
        from: u.currentType, 
        to: u.newType 
      })),
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: duration
    };

    console.log(`[recover-item-type] Complete:`, JSON.stringify(result.stats));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[recover-item-type] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
