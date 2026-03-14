// supabase/functions/provider-csv-import/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { NormalizedOrderGroup, ImportResult } from './types.ts';
import { validateGroup } from './providers/hotmart.ts';
import { checkOrderState } from './core/dedup-checker.ts';
import { writeContact } from './core/contact-writer.ts';
import { writeOrder, writeOrderItems } from './core/order-writer.ts';
import { writeLedgerEvents } from './core/ledger-writer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  provider: string;
  project_id: string;
  groups: NormalizedOrderGroup[];
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

    const { provider, project_id, groups }: RequestBody = await req.json();

    if (!project_id || !groups || !Array.isArray(groups)) {
      return new Response(JSON.stringify({ error: 'project_id e groups são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Por ora, só Hotmart. Futuro: routing por provider
    if (provider !== 'hotmart') {
      return new Response(JSON.stringify({ error: `Provider '${provider}' não suportado ainda` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    for (const group of groups) {
      // Validação server-side
      const validationError = validateGroup(group);
      if (validationError) {
        result.errors.push(`${group.provider_order_id}: ${validationError}`);
        continue;
      }

      try {
        // 1. Contato
        const contactResult = await writeContact(supabase, project_id, group);
        if (contactResult.action === 'created') result.contacts_created++;
        else if (contactResult.action === 'updated') result.contacts_updated++;
        else if (contactResult.action === 'skipped_no_email') result.no_email++;

        // 2. Verificar estado do order
        const { state, orderId: existingId } = await checkOrderState(
          supabase,
          project_id,
          group.provider_order_id,
        );

        if (state === 'exists_webhook_ledger' || state === 'exists_csv_ledger') {
          result.skipped++;
          continue;
        }

        // 3. Criar/atualizar order
        const orderId = await writeOrder(
          supabase,
          project_id,
          group,
          contactResult.contact_id,
          existingId,
        );

        if (!orderId) {
          result.errors.push(`${group.provider_order_id}: falha ao criar order`);
          continue;
        }

        // 4. Order items
        await writeOrderItems(supabase, orderId, project_id, group);

        // 5. Ledger events
        const eventsCreated = await writeLedgerEvents(supabase, orderId, project_id, group);

        // Contabilizar resultado
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

    return new Response(JSON.stringify(result), {
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
