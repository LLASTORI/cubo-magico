# CSV Import Safety — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar proteção em 3 camadas ao sistema de CSV import Hotmart: validação cruzada de produtos, dialog de confirmação obrigatório, e import batch com revert atômico.

**Architecture:** A migration cria a tabela `csv_import_batches` + função SQL de revert atômica. A edge function `provider-csv-import` é atualizada para gerenciar o lifecycle do batch (cria no 1º chunk, fecha no último). Uma nova edge function `provider-csv-import-revert` executa o revert chamando a função SQL. O frontend ganha validação de produtos no preview, dialog de confirmação, e componente de histórico com botão "Desfazer".

**Tech Stack:** Deno (Edge Functions), React 18 + TypeScript strict, Supabase (PostgreSQL + RLS), shadcn-ui, TanStack Query

**Spec:** `docs/superpowers/specs/2026-03-14-csv-import-safety-design.md`

---

## Chunk 1: Decommission do acesso antigo

### Task 1: Remover menu Histórico de Vendas e redirecionar SalesHistory

**Files:**
- Modify: `src/components/AppHeader.tsx`
- Modify: `src/pages/SalesHistory.tsx`

- [ ] **Step 1: Remover menu item em AppHeader.tsx**

Remover o `DropdownMenuItem` que navega para `/vendas/historico` (linhas 181-187) e o import do ícone `History` (linha 23). O ícone só é usado nesse item — nada mais no arquivo o referencia.

```tsx
// src/components/AppHeader.tsx
// REMOVER estas linhas:

// linha 23 — no bloco de imports de lucide-react:
  History,   // ← remover

// linhas 181-187 — no DropdownMenuContent de Vendas:
                    <DropdownMenuItem
                      onClick={() => navigateToProject('/vendas/historico')}
                      className={`gap-2 cursor-pointer ${currentPath.includes('/vendas/historico') ? 'bg-muted' : ''}`}
                    >
                      <History className="w-4 h-4" />
                      Histórico
                    </DropdownMenuItem>
```

Também atualizar a linha 93 que inclui `/vendas/historico` no `isInBuscaRapida`:
```tsx
// ANTES:
const isInBuscaRapida = currentPath.includes('/busca-rapida') || currentPath.includes('/meta-ads') || currentPath.includes('/vendas/historico');

// DEPOIS:
const isInBuscaRapida = currentPath.includes('/busca-rapida') || currentPath.includes('/meta-ads');
```

- [ ] **Step 2: Substituir SalesHistory por redirect com toast**

```tsx
// src/pages/SalesHistory.tsx — substituir TODO o conteúdo por:

import { useEffect } from "react";
import { useTenantNavigation } from "@/navigation";
import { useToast } from "@/hooks/use-toast";

const SalesHistory = () => {
  const { navigateTo } = useTenantNavigation();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "Página movida",
      description: "A importação de histórico foi movida para Configurações → Integrações → Hotmart.",
    });
    navigateTo('/settings');
  }, []);

  return null;
};

export default SalesHistory;
```

- [ ] **Step 3: Verificar lint**

```bash
npm run lint 2>&1 | grep -E "error|AppHeader|SalesHistory"
```

Esperado: 0 erros nos arquivos alterados.

- [ ] **Step 4: Commit**

```bash
git add src/components/AppHeader.tsx src/pages/SalesHistory.tsx
git commit -m "feat: remove Vendas > Histórico menu and redirect SalesHistory to Settings"
```

---

## Chunk 2: Migration — tabela csv_import_batches + função de revert

### Task 2: Criar migration com tabela, índices, RLS e função SQL de revert

**Files:**
- Create: `supabase/migrations/20260314120000_csv_import_batches.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260314120000_csv_import_batches.sql

-- Tabela de controle de importações CSV
CREATE TABLE IF NOT EXISTS csv_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'importing'
    CHECK (status IN ('importing', 'active', 'reverted')),
  total_created INT NOT NULL DEFAULT 0,
  total_complemented INT NOT NULL DEFAULT 0,
  total_skipped INT NOT NULL DEFAULT 0,
  total_errors INT NOT NULL DEFAULT 0,
  total_revenue_brl NUMERIC NOT NULL DEFAULT 0,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_csv_import_batches_project
  ON csv_import_batches(project_id, created_at DESC);

-- Índice expressional para queries de revert por batch_id em ledger_events
CREATE INDEX IF NOT EXISTS idx_ledger_events_batch_id
  ON ledger_events ((raw_payload->>'batch_id'))
  WHERE raw_payload ? 'batch_id';

-- RLS
ALTER TABLE csv_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON csv_import_batches
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = csv_import_batches.project_id
        AND user_id = auth.uid()
    )
  );

-- Função atômica de revert (SECURITY DEFINER — bypassa RLS intencionalmente,
-- pois a validação de ownership e role é feita pela edge function antes de chamar)
CREATE OR REPLACE FUNCTION revert_csv_import_batch(
  p_batch_id UUID,
  p_project_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_ids UUID[];
  v_deleted_ledger INT;
  v_deleted_orders INT;
BEGIN
  -- 1. Validar que batch existe, pertence ao projeto e está active
  IF NOT EXISTS (
    SELECT 1 FROM csv_import_batches
    WHERE id = p_batch_id
      AND project_id = p_project_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'batch_not_found_or_not_active';
  END IF;

  -- 2. Coletar order_ids associados ao batch
  SELECT ARRAY_AGG(DISTINCT order_id) INTO v_order_ids
  FROM ledger_events
  WHERE raw_payload->>'batch_id' = p_batch_id::TEXT
    AND project_id = p_project_id;

  -- 3. Deletar ledger_events do batch
  DELETE FROM ledger_events
  WHERE raw_payload->>'batch_id' = p_batch_id::TEXT
    AND project_id = p_project_id;
  GET DIAGNOSTICS v_deleted_ledger = ROW_COUNT;

  -- 4. Deletar order_items de orders que não têm mais ledger não-CSV
  --    (NÃO usa provider_event_log — não tem coluna order_id)
  DELETE FROM order_items
  WHERE order_id = ANY(v_order_ids)
    AND NOT EXISTS (
      SELECT 1 FROM ledger_events le
      WHERE le.order_id = order_items.order_id
        AND le.source_origin != 'csv'
    );

  -- 5. Deletar orders órfãos (sem ledger não-CSV remanescente)
  DELETE FROM orders
  WHERE id = ANY(v_order_ids)
    AND NOT EXISTS (
      SELECT 1 FROM ledger_events le
      WHERE le.order_id = orders.id
        AND le.source_origin != 'csv'
    );
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;

  -- 6. Marcar batch como revertido
  UPDATE csv_import_batches
  SET status = 'reverted', reverted_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'deleted_ledger_events', v_deleted_ledger,
    'deleted_orders', v_deleted_orders
  );
END;
$$;
```

- [ ] **Step 2: Aplicar a migration via MCP Supabase**

Usar `mcp__supabase__apply_migration` com o conteúdo acima.

- [ ] **Step 3: Verificar que a tabela existe**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'csv_import_batches'
ORDER BY ordinal_position;
```

Esperado: 12 colunas listadas.

- [ ] **Step 4: Verificar que a função existe**

```sql
SELECT proname, prosecdef
FROM pg_proc
WHERE proname = 'revert_csv_import_batch';
```

Esperado: 1 linha com `prosecdef = true`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260314120000_csv_import_batches.sql
git commit -m "feat: add csv_import_batches table, RLS, and atomic revert SQL function"
```

---

## Chunk 3: Edge function provider-csv-import — batch lifecycle

### Task 3: Atualizar index.ts para gerenciar batch no 1º e último chunk

**Files:**
- Modify: `supabase/functions/provider-csv-import/index.ts`

- [ ] **Step 1: Substituir o conteúdo de index.ts**

```typescript
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

        const { state, orderId: existingId } = await checkOrderState(
          supabase, project_id, group.provider_order_id,
        );

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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/provider-csv-import/index.ts
git commit -m "feat: add batch lifecycle management to provider-csv-import"
```

---

### Task 4: Atualizar ledger-writer.ts para incluir batch_id no raw_payload

**Files:**
- Modify: `supabase/functions/provider-csv-import/core/ledger-writer.ts`

- [ ] **Step 1: Adicionar batchId às assinaturas e ao raw_payload**

Alterar a função `buildCreditEvents` para receber e propagar `batchId`:

```typescript
// supabase/functions/provider-csv-import/core/ledger-writer.ts

// ALTERAR assinatura de buildCreditEvents:
function buildCreditEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
  batchId: string,           // ← novo parâmetro
): LedgerEventRow[] {
  const base = {
    order_id: orderId,
    project_id: projectId,
    provider: 'hotmart',
    currency: 'BRL',
    source_type: 'native_brl',
    source_origin: 'csv',
    confidence_level: 'accounting',
    occurred_at: occurredAt,
    raw_payload: { csv_transaction_id: item.own_transaction_id, batch_id: batchId }, // ← batch_id adicionado
    amount_accounting: 0,
    currency_accounting: 'BRL',
    conversion_rate: item.conversion_rate,
  };
  // ... resto igual
```

Alterar `buildDebitEvents` da mesma forma:

```typescript
function buildDebitEvents(
  orderId: string,
  projectId: string,
  item: NormalizedOrderItem,
  occurredAt: string,
  batchId: string,           // ← novo parâmetro
): LedgerEventRow[] {
  const tx = item.own_transaction_id;
  const base = {
    // ...
    raw_payload: { csv_transaction_id: tx, batch_id: batchId }, // ← batch_id adicionado
    // ...
  };
```

Alterar `writeLedgerEvents` para aceitar e propagar `batchId`:

```typescript
export async function writeLedgerEvents(
  supabase: any,
  orderId: string,
  projectId: string,
  group: NormalizedOrderGroup,
  batchId: string,           // ← novo parâmetro
): Promise<number> {
  if (group.status === 'pending' || group.status === 'skip') return 0;

  let created = 0;
  const occurredAt = group.approved_at ?? group.ordered_at;

  for (const item of group.items) {
    const creditEvents = buildCreditEvents(orderId, projectId, item, occurredAt, batchId);
    for (const event of creditEvents) {
      const inserted = await insertIfNotExists(supabase, event);
      if (inserted) created++;
    }

    if (item.is_debit) {
      const debitEvents = buildDebitEvents(orderId, projectId, item, occurredAt, batchId);
      for (const event of debitEvents) {
        const inserted = await insertIfNotExists(supabase, event);
        if (inserted) created++;
      }
    }
  }

  return created;
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/provider-csv-import/core/ledger-writer.ts
git commit -m "feat: propagate batch_id into ledger_events raw_payload"
```

---

### Task 5: Criar edge function provider-csv-import-revert

**Files:**
- Create: `supabase/functions/provider-csv-import-revert/index.ts`

- [ ] **Step 1: Criar a edge function**

```typescript
// supabase/functions/provider-csv-import-revert/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Extrair user_id do JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { batch_id, project_id } = await req.json();

    if (!batch_id || !project_id) {
      return new Response(JSON.stringify({ error: 'batch_id e project_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que o usuário tem role owner ou manager no projeto
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isOwnerOrManager = member?.role === 'owner' || member?.role === 'manager';
    const isSuperAdmin = !member && await checkSuperAdmin(supabase, user.id);

    if (!isOwnerOrManager && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Permissão insuficiente. Apenas owner ou manager podem reverter importações.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Executar revert atômico via função SQL SECURITY DEFINER
    const { data, error: revertError } = await supabase.rpc('revert_csv_import_batch', {
      p_batch_id: batch_id,
      p_project_id: project_id,
    });

    if (revertError) {
      if (revertError.message.includes('batch_not_found_or_not_active')) {
        return new Response(JSON.stringify({ error: 'Batch não encontrado ou não está no estado "active".' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw revertError;
    }

    console.log(`[Revert] Batch ${batch_id} revertido:`, data);

    return new Response(JSON.stringify({ success: true, ...data }), {
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

async function checkSuperAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .maybeSingle();
  return data?.is_super_admin === true;
}
```

- [ ] **Step 2: Deploy das duas edge functions atualizadas**

```bash
# Deploy da função atualizada
supabase functions deploy provider-csv-import

# Deploy da nova função de revert
supabase functions deploy provider-csv-import-revert
```

Ou via MCP: `mcp__supabase__deploy_edge_function` para cada uma.

- [ ] **Step 3: Smoke test do revert com batch inexistente**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/provider-csv-import-revert \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"batch_id":"00000000-0000-0000-0000-000000000000","project_id":"<PROJECT_ID>"}'
```

Esperado: `{"error":"Batch não encontrado ou não está no estado \"active\"."}`

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/provider-csv-import-revert/
git commit -m "feat: add provider-csv-import-revert edge function"
```

---

## Chunk 4: Frontend — hook + validação cruzada + batch handling

### Task 6: Atualizar useProviderCSVImport.ts

**Files:**
- Modify: `src/hooks/useProviderCSVImport.ts`

O hook precisa:
1. Armazenar `file_name` do arquivo selecionado
2. Fazer as 2 queries de validação cruzada após o parse
3. Gerenciar `batch_id` entre chunks (recebe do 1º chunk, propaga nos demais)
4. Sinalizar `is_last_chunk` e enviar `accumulated_totals` no último chunk
5. Não enviar `is_last_chunk=true` se o chunk anterior teve erro de rede

- [ ] **Step 1: Substituir o conteúdo do hook**

```typescript
// src/hooks/useProviderCSVImport.ts

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseHotmartCSV } from '@/lib/csv-parsers/hotmart';
import type { CSVPreview, ImportResult, NormalizedOrderGroup } from '@/types/csv-import';

const CHUNK_SIZE = 200;

export interface ProductMatchResult {
  matched: number;
  total: number;
  ratio: number;           // 0-1
  projectHasHistory: boolean;
}

export function useProviderCSVImport(projectId: string) {
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [productMatch, setProductMatch] = useState<ProductMatchResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const parsed = parseHotmartCSV(text);
      setPreview(parsed);
      setResult(null);
      setProductMatch(null);

      if (parsed.total_groups > 0) {
        await validateProductMatch(parsed);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function validateProductMatch(parsed: CSVPreview) {
    // 1. Verificar se projeto tem histórico
    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    const projectHasHistory = (orderCount ?? 0) > 0;

    // 2. Extrair product IDs únicos do CSV
    const csvProductIds = [
      ...new Set(
        parsed.groups.flatMap((g) => g.items.map((i) => i.provider_product_id))
      ),
    ];

    if (csvProductIds.length === 0) {
      setProductMatch({ matched: 0, total: 0, ratio: 0, projectHasHistory });
      return;
    }

    // 3. Verificar quais existem no projeto
    const { data: knownItems } = await supabase
      .from('order_items')
      .select('provider_product_id')
      .eq('project_id', projectId)
      .in('provider_product_id', csvProductIds);

    const knownIds = new Set((knownItems ?? []).map((i) => i.provider_product_id));
    const matched = csvProductIds.filter((id) => knownIds.has(id)).length;
    const ratio = csvProductIds.length > 0 ? matched / csvProductIds.length : 0;

    setProductMatch({ matched, total: csvProductIds.length, ratio, projectHasHistory });
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setProgress(0);

    const groups = preview.groups;
    const chunks: NormalizedOrderGroup[][] = [];
    for (let i = 0; i < groups.length; i += CHUNK_SIZE) {
      chunks.push(groups.slice(i, i + CHUNK_SIZE));
    }

    const accumulated: ImportResult = {
      created: 0, complemented: 0, skipped: 0,
      contacts_created: 0, contacts_updated: 0, no_email: 0,
      errors: [], total_revenue_brl: 0,
      period_start: preview.period_start,
      period_end: preview.period_end,
    };

    let batchId: string | null = null;
    let hasNetworkError = false;

    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;

      const body: Record<string, unknown> = {
        provider: 'hotmart',
        project_id: projectId,
        groups: chunks[i],
      };

      // Primeiro chunk: sem batch_id; enviar file_name
      if (i === 0) {
        if (fileName) body.file_name = fileName;
      } else {
        body.batch_id = batchId;
      }

      // Último chunk: fechar batch (só se não houve erro de rede antes)
      if (isLast && !hasNetworkError && batchId) {
        body.is_last_chunk = true;
        body.accumulated_totals = {
          created: accumulated.created,
          complemented: accumulated.complemented,
          skipped: accumulated.skipped,
          errors: accumulated.errors.length,
          total_revenue_brl: accumulated.total_revenue_brl,
        };
      }

      const { data, error } = await supabase.functions.invoke('provider-csv-import', { body });

      if (error) {
        accumulated.errors.push(`Lote ${i + 1}: ${error.message}`);
        hasNetworkError = true;
      } else if (data) {
        // Capturar batch_id da resposta do primeiro chunk
        if (i === 0 && data.batch_id) {
          batchId = data.batch_id;
        }
        accumulated.created += data.created ?? 0;
        accumulated.complemented += data.complemented ?? 0;
        accumulated.skipped += data.skipped ?? 0;
        accumulated.contacts_created += data.contacts_created ?? 0;
        accumulated.contacts_updated += data.contacts_updated ?? 0;
        accumulated.no_email += data.no_email ?? 0;
        accumulated.total_revenue_brl += data.total_revenue_brl ?? 0;
        accumulated.errors.push(...(data.errors ?? []));
      }

      setProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    setResult(accumulated);
    setImporting(false);
  }

  return { preview, fileName, productMatch, importing, progress, result, handleFile, runImport };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useProviderCSVImport.ts
git commit -m "feat: add product validation, file_name tracking and batch_id management to useProviderCSVImport"
```

---

## Chunk 5: Frontend — ConfirmDialog + ProductMatchBanner

### Task 7: Atualizar ProviderCSVImport.tsx com validação visual e dialog

**Files:**
- Modify: `src/components/settings/ProviderCSVImport.tsx`

O componente precisa:
1. Exibir o `ProductMatchBanner` no preview (badge verde/amarelo/laranja)
2. Substituir o botão "Importar" direto por um botão que abre `AlertDialog`
3. O `AlertDialog` mostra nome do projeto, resumo e warnings

- [ ] **Step 1: Substituir o conteúdo do componente**

```tsx
// src/components/settings/ProviderCSVImport.tsx

import { useRef, useState } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { useProviderCSVImport } from '@/hooks/useProviderCSVImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Upload, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatMoney } from '@/utils/formatMoney';

interface Props {
  projectId: string;
}

export function ProviderCSVImport({ projectId }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { currentProject } = useProject();
  const { preview, productMatch, importing, progress, result, handleFile, runImport } =
    useProviderCSVImport(projectId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const projectName = currentProject?.name ?? 'este projeto';
  const showZeroMatchWarning =
    productMatch && productMatch.ratio === 0 && productMatch.projectHasHistory;

  function handleImportClick() {
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setConfirmOpen(false);
    await runImport();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Importar Histórico de Vendas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Use o <strong>Modelo Detalhado de Vendas</strong> exportado da Hotmart (arquivo .CSV).
          Vendas já existentes via webhook não serão alteradas.
        </p>
      </div>

      {/* Upload */}
      {!result && (
        <Card>
          <CardContent className="pt-6">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Clique para selecionar o CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Modelo Detalhado de Vendas — Hotmart</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </CardContent>
        </Card>
      )}

      {/* Erros de parse */}
      {preview && preview.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="text-xs space-y-1 mt-1">
              {preview.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {preview.errors.length > 5 && <li>...e mais {preview.errors.length - 5} avisos</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Aviso de projeto errado */}
      {showZeroMatchWarning && (
        <Alert className="border-orange-500/50 bg-orange-500/5">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            <strong>Nenhum produto do CSV foi encontrado no histórico deste projeto.</strong>{' '}
            Verifique se está no projeto correto antes de importar.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && preview.total_groups > 0 && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Preview
              {/* Badge de validação cruzada */}
              {productMatch && (
                <Badge
                  variant="outline"
                  className={
                    productMatch.ratio >= 0.5
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : productMatch.ratio > 0
                      ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
                      : productMatch.projectHasHistory
                      ? 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                      : 'bg-muted/50 text-muted-foreground'
                  }
                >
                  {productMatch.projectHasHistory
                    ? `${productMatch.matched} de ${productMatch.total} produtos reconhecidos`
                    : 'Projeto novo — sem histórico para comparar'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Pedidos detectados</p>
                <p className="font-semibold text-lg">{preview.total_groups}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Itens (com bumps)</p>
                <p className="font-semibold text-lg">{preview.total_items}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Receita líquida</p>
                <p className="font-semibold text-lg">{formatMoney(preview.total_revenue_brl, 'BRL')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Período</p>
                <p className="font-semibold text-sm">
                  {preview.period_start ? new Date(preview.period_start).toLocaleDateString('pt-BR') : '—'}
                  {' → '}
                  {preview.period_end ? new Date(preview.period_end).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
            </div>

            {importing ? (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">{progress}% processado</p>
              </div>
            ) : (
              <Button
                onClick={handleImportClick}
                className="w-full"
                variant={showZeroMatchWarning ? 'outline' : 'default'}
              >
                Importar {preview.total_groups} pedidos
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de confirmação */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está prestes a importar dados no projeto:
                </p>
                <p className="text-xl font-bold text-foreground">{projectName}</p>
                <p className="text-sm text-muted-foreground">
                  {preview?.total_groups} pedidos · {preview?.total_items} itens ·{' '}
                  {formatMoney(preview?.total_revenue_brl ?? 0, 'BRL')} receita líquida
                </p>
                {showZeroMatchWarning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Nenhum produto do CSV foi reconhecido neste projeto. Confirme que está no projeto correto.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  A importação pode ser desfeita posteriormente em "Histórico de importações".
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirmar importação em {projectName}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resultado */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Importação concluída
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">{result.created} criados</Badge>
                <span className="text-muted-foreground">do zero</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{result.complemented} compl.</Badge>
                <span className="text-muted-foreground">complementados</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{result.skipped} ignorados</Badge>
                <span className="text-muted-foreground">(webhook)</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">{result.contacts_created + result.contacts_updated} contatos</Badge>
                <span className="text-muted-foreground">CRM</span>
              </div>
              {result.no_email > 0 && (
                <div className="flex items-center gap-2 col-span-2">
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">{result.no_email} sem email</Badge>
                  <span className="text-muted-foreground">sem vínculo CRM</span>
                </div>
              )}
            </div>

            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">Receita importada</p>
              <p className="font-semibold text-lg">{formatMoney(result.total_revenue_brl, 'BRL')}</p>
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-1">{result.errors.length} erro(s):</p>
                  <ul className="text-xs space-y-1">
                    {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                    {result.errors.length > 10 && <li>...e mais {result.errors.length - 10}</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Nova importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar lint**

```bash
npm run lint 2>&1 | grep -E "error.*ProviderCSVImport|error.*useProviderCSVImport"
```

Esperado: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/settings/ProviderCSVImport.tsx
git commit -m "feat: add ConfirmDialog and product match banner to ProviderCSVImport"
```

---

## Chunk 6: Frontend — CsvImportHistory

### Task 8: Criar CsvImportHistory e integrar em HotmartProviderSettings

**Files:**
- Create: `src/components/settings/CsvImportHistory.tsx`
- Modify: `src/components/settings/providers/HotmartProviderSettings.tsx`

- [ ] **Step 1: Criar CsvImportHistory.tsx**

```tsx
// src/components/settings/CsvImportHistory.tsx

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatMoney } from '@/utils/formatMoney';
import { History, Loader2 } from 'lucide-react';

interface CsvBatch {
  id: string;
  file_name: string | null;
  status: 'importing' | 'active' | 'reverted';
  total_created: number;
  total_complemented: number;
  total_skipped: number;
  total_errors: number;
  total_revenue_brl: number;
  created_at: string;
  reverted_at: string | null;
}

interface Props {
  projectId: string;
}

export function CsvImportHistory({ projectId }: Props) {
  const { currentProject } = useProject();
  const { canManageTeam } = useAccessControl();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [revertTarget, setRevertTarget] = useState<CsvBatch | null>(null);
  const [reverting, setReverting] = useState(false);

  const { data: batches, isLoading } = useQuery({
    queryKey: ['csv-import-batches', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('csv_import_batches')
        .select('id, file_name, status, total_created, total_complemented, total_skipped, total_errors, total_revenue_brl, created_at, reverted_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as CsvBatch[];
    },
    enabled: !!projectId,
  });

  async function handleRevert() {
    if (!revertTarget) return;
    setReverting(true);

    try {
      const { error } = await supabase.functions.invoke('provider-csv-import-revert', {
        body: { batch_id: revertTarget.id, project_id: projectId },
      });

      if (error) throw error;

      toast({
        title: 'Importação revertida',
        description: `Os dados do import "${revertTarget.file_name ?? revertTarget.id}" foram removidos.`,
      });

      queryClient.invalidateQueries({ queryKey: ['csv-import-batches', projectId] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Erro ao reverter', description: msg, variant: 'destructive' });
    } finally {
      setReverting(false);
      setRevertTarget(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando histórico...
      </div>
    );
  }

  if (!batches || batches.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
        <History className="h-4 w-4" />
        Nenhuma importação realizada ainda.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {batches.map((batch) => (
          <div key={batch.id} className="flex items-start justify-between gap-4 p-3 rounded-lg border text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{batch.file_name ?? 'Arquivo desconhecido'}</span>
                {batch.status === 'importing' && (
                  <Badge variant="outline" className="text-muted-foreground">Incompleto</Badge>
                )}
                {batch.status === 'active' && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Ativo</Badge>
                )}
                {batch.status === 'reverted' && (
                  <Badge variant="outline" className="text-muted-foreground">Revertido</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(batch.created_at).toLocaleString('pt-BR')}
                {batch.status === 'reverted' && batch.reverted_at && (
                  <> · Revertido em {new Date(batch.reverted_at).toLocaleString('pt-BR')}</>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {batch.total_created} criados · {batch.total_complemented} complementados · {batch.total_skipped} ignorados
                {batch.total_errors > 0 && ` · ${batch.total_errors} erros`}
                {batch.total_revenue_brl > 0 && ` · ${formatMoney(batch.total_revenue_brl, 'BRL')}`}
              </p>
            </div>

            {batch.status === 'active' && canManageTeam && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => setRevertTarget(batch)}
              >
                Desfazer
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Dialog de confirmação de revert */}
      <AlertDialog open={!!revertTarget} onOpenChange={(open) => !open && setRevertTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer importação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Isso irá remover todos os pedidos e dados financeiros importados pelo arquivo:
                </p>
                <p className="font-medium text-foreground">
                  {revertTarget?.file_name ?? revertTarget?.id}
                </p>
                <p className="text-sm">
                  <strong>{revertTarget?.total_created}</strong> pedidos criados e seus ledger_events serão deletados.
                  Pedidos que existiam antes do import (via webhook) não serão afetados.
                </p>
                <p className="text-sm text-muted-foreground">
                  Contatos CRM criados durante o import não são revertidos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevert}
              disabled={reverting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Desfazer importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 2: Integrar CsvImportHistory em HotmartProviderSettings.tsx**

Adicionar import e seção acima do CSV import existente:

```tsx
// src/components/settings/providers/HotmartProviderSettings.tsx

// Adicionar ao bloco de imports:
import { CsvImportHistory } from '../CsvImportHistory';
import { Separator } from '@/components/ui/separator'; // já importado

// Dentro do bloco `projectId ? (...)`, adicionar ANTES do Card de CSV Import:
          {/* Histórico de Importações CSV */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">Histórico de Importações</CardTitle>
              <CardDescription>
                Importações de CSV realizadas neste projeto. Owners e managers podem desfazer.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CsvImportHistory projectId={projectId} />
            </CardContent>
          </Card>
```

- [ ] **Step 3: Verificar lint**

```bash
npm run lint 2>&1 | grep -E "error.*CsvImportHistory|error.*HotmartProvider"
```

Esperado: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/CsvImportHistory.tsx src/components/settings/providers/HotmartProviderSettings.tsx
git commit -m "feat: add CsvImportHistory component with revert capability"
```

---

## Chunk 7: Deploy final e smoke test

### Task 9: Deploy das edge functions e validação end-to-end

**Files:** nenhum novo — apenas deploy e verificação

- [ ] **Step 1: Deploy provider-csv-import (atualizada)**

```bash
supabase functions deploy provider-csv-import
```

Ou via MCP: `mcp__supabase__deploy_edge_function` com `slug = "provider-csv-import"`.

- [ ] **Step 2: Deploy provider-csv-import-revert (nova)**

```bash
supabase functions deploy provider-csv-import-revert
```

Ou via MCP: `mcp__supabase__deploy_edge_function` com `slug = "provider-csv-import-revert"`.

- [ ] **Step 3: Smoke test — import com batch**

Via `supabase.functions.invoke` no browser console (com usuário logado):

```javascript
const { data } = await supabase.functions.invoke('provider-csv-import', {
  body: {
    provider: 'hotmart',
    project_id: '<PROJECT_ID>',
    groups: [],               // lista vazia — apenas testa criação do batch
    file_name: 'test.csv',
  }
});
console.log(data); // esperado: { batch_id: "uuid...", created: 0, ... }
```

Verificar no banco:
```sql
SELECT id, status, file_name, created_at
FROM csv_import_batches
ORDER BY created_at DESC LIMIT 1;
```

Esperado: 1 linha com `status = 'importing'` (lista vazia → sem `is_last_chunk`).

- [ ] **Step 4: Smoke test — fechar batch**

```javascript
const { data } = await supabase.functions.invoke('provider-csv-import', {
  body: {
    provider: 'hotmart',
    project_id: '<PROJECT_ID>',
    groups: [],
    batch_id: '<BATCH_ID_DO_STEP_ANTERIOR>',
    is_last_chunk: true,
    accumulated_totals: { created: 0, complemented: 0, skipped: 0, errors: 0, total_revenue_brl: 0 },
  }
});
```

Verificar:
```sql
SELECT status FROM csv_import_batches WHERE id = '<BATCH_ID>';
```

Esperado: `status = 'active'`.

- [ ] **Step 5: Smoke test — revert**

```javascript
const { data } = await supabase.functions.invoke('provider-csv-import-revert', {
  body: { batch_id: '<BATCH_ID>', project_id: '<PROJECT_ID>' }
});
console.log(data); // esperado: { success: true, deleted_ledger_events: 0, deleted_orders: 0 }
```

Verificar:
```sql
SELECT status, reverted_at FROM csv_import_batches WHERE id = '<BATCH_ID>';
```

Esperado: `status = 'reverted'`, `reverted_at` preenchido.

- [ ] **Step 6: Smoke test — revert de batch já revertido**

```javascript
const { data, error } = await supabase.functions.invoke('provider-csv-import-revert', {
  body: { batch_id: '<BATCH_ID>', project_id: '<PROJECT_ID>' }
});
console.log(error); // esperado: "Batch não encontrado ou não está no estado "active"."
```

- [ ] **Step 7: Verificar lint final**

```bash
npm run lint 2>&1 | tail -5
```

Esperado: `0 errors`.

- [ ] **Step 8: Commit final**

```bash
git add -A
git commit -m "feat: complete CSV import safety — batch tracking, revert, and 3-layer protection"
```

---

## Resumo de arquivos criados/modificados

| Arquivo | Ação |
|---|---|
| `src/components/AppHeader.tsx` | Remover menu item + ícone History |
| `src/pages/SalesHistory.tsx` | Substituir por redirect com toast |
| `supabase/migrations/20260314120000_csv_import_batches.sql` | Criar (tabela + índices + RLS + função SQL) |
| `src/hooks/useProviderCSVImport.ts` | Reescrever (validação cruzada + batch_id handling) |
| `src/components/settings/ProviderCSVImport.tsx` | Reescrever (ConfirmDialog + ProductMatch badge) |
| `src/components/settings/CsvImportHistory.tsx` | Criar (histórico com revert) |
| `src/components/settings/providers/HotmartProviderSettings.tsx` | Adicionar CsvImportHistory |
| `supabase/functions/provider-csv-import/index.ts` | Reescrever (batch lifecycle) |
| `supabase/functions/provider-csv-import/core/ledger-writer.ts` | Adicionar batchId ao raw_payload |
| `supabase/functions/provider-csv-import-revert/index.ts` | Criar (nova edge function) |
