// supabase/functions/provider-csv-import/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { NormalizedOrderGroup, ImportResult } from './types.ts';
import { validateGroup } from './providers/hotmart.ts';
import { batchCheckOrderStates } from './core/dedup-checker.ts';
import { writeContact } from './core/contact-writer.ts';
import { writeOrder, writeOrderItems } from './core/order-writer.ts';
import { writeLedgerEvents } from './core/ledger-writer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccumulatedTotals {
  created: number;
  complemented: number;
  skipped: number;
  errors: number;
  total_revenue_brl: number;
}

interface RequestBody {
  provider: string;
  project_id: string;
  groups: NormalizedOrderGroup[];
  batch_id?: string;           // ausente no primeiro chunk
  is_last_chunk?: boolean;     // true no último chunk
  file_name?: string;          // apenas no primeiro chunk
  accumulated_totals?: AccumulatedTotals; // apenas quando is_last_chunk=true
}

interface ChunkResult extends ImportResult {
  batch_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Extrair user_id do JWT para rastrear quem importou
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    const userId = user?.id ?? null;

    const body: RequestBody = await req.json();
    const { provider, project_id, groups, file_name, accumulated_totals } = body;
    let { batch_id, is_last_chunk } = body;

    if (!project_id || !groups || !Array.isArray(groups)) {
      return new Response(JSON.stringify({ error: 'project_id e groups são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (provider !== 'hotmart') {
      return new Response(JSON.stringify({ error: `Provider '${provider}' não suportado ainda` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Primeiro chunk: criar batch ──────────────────────────────────────────
    if (!batch_id) {
      const { data: batch, error: batchError } = await supabase
        .from('csv_import_batches')
        .insert({
          project_id,
          created_by: userId,
          file_name: file_name ?? null,
          status: 'importing',
        })
        .select('id')
        .single();

      if (batchError || !batch) {
        console.error('[CSV Import] Falha ao criar batch:', batchError?.message);
        return new Response(JSON.stringify({ error: 'Falha ao inicializar batch de importação' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      batch_id = batch.id;
      console.log(`[CSV Import] Batch criado: ${batch_id}`);
    }

    // ── Processar grupos do chunk ─────────────────────────────────────────────
    const result: ImportResult = {
      created: 0,
      complemented: 0,
      skipped: 0,
      contacts_created: 0,
      contacts_updated: 0,
      no_email: 0,
      errors: [],
      total_revenue_brl: 0,
    };

    // Pré-carregar estado de todos os orders do chunk em 2 queries (batch dedup)
    const orderStates = await batchCheckOrderStates(
      supabase,
      project_id,
      groups.map((g) => g.provider_order_id),
    );

    for (const group of groups) {
      const validationError = validateGroup(group);
      if (validationError) {
        result.errors.push(`${group.provider_order_id}: ${validationError}`);
        continue;
      }

      try {
        const contactResult = await writeContact(supabase, project_id, group);
        if (contactResult.action === 'created') result.contacts_created++;
        else if (contactResult.action === 'updated') result.contacts_updated++;
        else if (contactResult.action === 'skipped_no_email') result.no_email++;

        const { state, orderId: existingId } = orderStates.get(group.provider_order_id)
          ?? { state: 'not_found' as const, orderId: null };

        if (state === 'exists_webhook_ledger' || state === 'exists_csv_ledger') {
          result.skipped++;
          continue;
        }

        const orderId = await writeOrder(
          supabase, project_id, group, contactResult.contact_id, existingId,
        );

        if (!orderId) {
          result.errors.push(`${group.provider_order_id}: falha ao criar order`);
          continue;
        }

        await writeOrderItems(supabase, orderId, project_id, group);

        const eventsCreated = await writeLedgerEvents(
          supabase, orderId, project_id, group, batch_id,
        );

        if (state === 'not_found') result.created++;
        else result.complemented++;

        if (group.status === 'approved' || group.status === 'completed') {
          result.total_revenue_brl += group.items.reduce((s, i) => s + i.producer_net_brl, 0);
        }

        console.log(`[CSV Import] ${group.provider_order_id}: ${state} → ${eventsCreated} ledger events`);

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`${group.provider_order_id}: ${msg}`);
      }
    }

    // ── Último chunk: fechar batch como active ────────────────────────────────
    if (is_last_chunk && batch_id && accumulated_totals) {
      const { error: updateError } = await supabase
        .from('csv_import_batches')
        .update({
          status: 'active',
          total_created: accumulated_totals.created,
          total_complemented: accumulated_totals.complemented,
          total_skipped: accumulated_totals.skipped,
          total_errors: accumulated_totals.errors,
          total_revenue_brl: accumulated_totals.total_revenue_brl,
        })
        .eq('id', batch_id);

      if (updateError) {
        console.error('[CSV Import] Falha ao fechar batch:', updateError.message);
        // Não falha o request — dados foram importados; batch fica como 'importing'
      } else {
        console.log(`[CSV Import] Batch ${batch_id} fechado como active`);
      }
    }

    const response: ChunkResult = { ...result, batch_id };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
