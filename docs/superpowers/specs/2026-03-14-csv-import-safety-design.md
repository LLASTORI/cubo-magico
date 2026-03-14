# CSV Import Safety — Design Spec

**Data:** 2026-03-14
**Status:** Aprovado pelo usuário — v2 pós-review

## Contexto

O sistema possui duas implementações de importação CSV Hotmart:
- **Antiga** (`HotmartUnifiedCSVImport` → edge function `csv-ledger-v21-import`): acessível via Vendas → Histórico
- **Nova** (`ProviderCSVImport` → edge function `provider-csv-import`): acessível via Settings → Integrações → Hotmart

A nova implementação substitui a antiga. Este spec cobre três objetivos:

1. **Decommission do acesso antigo** — remover menu Vendas → Histórico
2. **Proteção em 3 camadas** contra importações acidentais
3. **Import batch com revert atômico e seguro**

---

## Objetivo 1 — Remover menu antigo

**`src/components/AppHeader.tsx`:** remover `DropdownMenuItem` que navega para `/vendas/historico`. Remover import do ícone `History` se não usado em outro lugar.

**`src/pages/SalesHistory.tsx`:** redirecionar via `useTenantNavigation()` para `/settings?tab=integrations`, com toast explicativo: "A importação de histórico foi movida para Configurações → Integrações → Hotmart." A rota `/vendas/historico` permanece no `App.tsx` para não quebrar bookmarks.

---

## Objetivo 2 — Proteção em 3 camadas

### Camada 1 — Validação cruzada de produtos no preview

**Arquivos:** `useProviderCSVImport.ts`, `ProviderCSVImport.tsx`

**Lógica:**
1. Extrair `provider_product_id`s únicos dos grupos parseados
2. Verificar se o projeto tem histórico: `SELECT COUNT(*) FROM orders WHERE project_id = $1 LIMIT 1`
3. Query: `SELECT DISTINCT provider_product_id FROM order_items WHERE project_id = $1 AND provider_product_id = ANY($2)`
4. `match_ratio = ids_reconhecidos / ids_do_csv`

**UX:**
- `match_ratio >= 0.5` → badge verde "X de Y produtos reconhecidos"
- `0 < match_ratio < 0.5` → badge amarelo + aviso suave
- `match_ratio = 0` e projeto tem orders → banner laranja destacado
- `match_ratio = 0` e projeto sem histórico → sem aviso (projeto novo)

Isso nunca bloqueia a importação — apenas informa.

### Camada 2 — Dialog de confirmação obrigatório

**`ProviderCSVImport.tsx`:** o botão "Importar N pedidos" abre um `AlertDialog` antes de executar.

**Conteúdo do dialog:**
- Nome do projeto em destaque (bold, fonte maior)
- Resumo: "N pedidos · N itens · Receita R$ X"
- Se `match_ratio = 0` e projeto tem histórico → aviso vermelho dentro do dialog
- Botões: `Cancelar` e `Confirmar importação em [NOME DO PROJETO]`

### Camada 3 — Import batch com revert

Ver seção detalhada abaixo.

---

## Objetivo 3 — Import batch com revert

### 3a. Migration — tabela `csv_import_batches`

```sql
CREATE TABLE csv_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
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

-- Índice expressional em ledger_events para queries de revert por batch_id
CREATE INDEX idx_ledger_events_batch_id
  ON ledger_events ((raw_payload->>'batch_id'))
  WHERE raw_payload ? 'batch_id';

ALTER TABLE csv_import_batches ENABLE ROW LEVEL SECURITY;

-- Membros do projeto podem ver seus batches
CREATE POLICY "members_select" ON csv_import_batches
  FOR SELECT USING (
    is_super_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = csv_import_batches.project_id
        AND user_id = auth.uid()
    )
  );
```

**Nota sobre revert e RLS:** A edge function `provider-csv-import-revert` usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS). A validação de ownership é responsabilidade da edge function (passo 1 do revert). O revert é permitido para roles `owner` e `manager`; operadores não têm acesso via UI (a edge function verifica `project_role IN ('owner', 'manager')`).

### 3b. Estado `importing` — proteção contra revert concorrente

O batch é criado pela edge function `provider-csv-import` no **primeiro chunk**, com `status = 'importing'`. O revert rejeita qualquer batch que não seja `active`. O frontend marca o batch como `active` apenas ao confirmar todos os chunks com sucesso. Se o import abortar, o batch fica em `importing` permanentemente (orphão visível na UI com badge "Incompleto").

### 3c. Responsabilidade de escrita do batch

| Ação | Responsável | Momento |
|---|---|---|
| CREATE batch (`status=importing`) | Edge function `provider-csv-import` | Primeiro chunk |
| Propaga `batch_id` em `ledger_events.raw_payload` | Edge function (ledger-writer) | Cada ledger_event |
| UPDATE batch (`status=active` + totais) | Edge function (último chunk) | Quando `is_last_chunk=true` no request |
| UPDATE batch (`status=reverted`) | Edge function `provider-csv-import-revert` | Dentro da transação de revert |

O frontend recebe o `batch_id` criado pela edge function na resposta do primeiro chunk.

**Comportamento em falha de chunk intermediário:** o frontend continua para o próximo chunk (comportamento atual do hook — acumula erros sem interromper). Se qualquer chunk falhar, o frontend **não** envia `is_last_chunk=true` no chunk subsequente — o batch fica em `importing` (visível na UI como "Incompleto"). Não existe rollback parcial: os grupos do chunk com falha são ignorados, os demais foram persistidos. O usuário pode importar novamente apenas os grupos faltantes ou revogar o batch e reimportar tudo.

### 3d. Propagação do `batch_id`

O `RequestBody` de `provider-csv-import` recebe campo opcional `batch_id?: string`. A edge function:

1. Se `batch_id` ausente (primeiro chunk): gera UUID, faz INSERT em `csv_import_batches` com `status = 'importing'`, retorna `batch_id` no response.
2. Se `batch_id` presente e `is_last_chunk = true`: processa o chunk normalmente, depois faz UPDATE em `csv_import_batches SET status='active', total_created=..., ...`. Os totais são enviados pelo **frontend** no body deste último chunk (`accumulated_totals: ImportResult`) — o frontend já acumula os totais de todos os chunks e os envia para a edge function finalizar o batch.
3. Se `batch_id` presente e `is_last_chunk = false`: processa o chunk sem tocar em `csv_import_batches`.

Assinaturas atualizadas:

```typescript
// index.ts
interface RequestBody {
  provider: string;
  project_id: string;
  groups: NormalizedOrderGroup[];
  batch_id?: string;           // ausente no primeiro chunk
  is_last_chunk?: boolean;     // true no último chunk bem-sucedido
  file_name?: string;          // enviado pelo frontend (apenas no primeiro chunk)
  accumulated_totals?: {       // enviado apenas quando is_last_chunk=true
    created: number; complemented: number; skipped: number;
    errors: number; total_revenue_brl: number;
  };
  // user_id extraído do JWT via supabase.auth.getUser()
}

// ledger-writer.ts
export async function writeLedgerEvents(
  supabase,
  orderId,
  projectId,
  group,
  batchId: string,          // novo parâmetro
): Promise<number>

// raw_payload em cada ledger_event:
{ csv_transaction_id: item.own_transaction_id, batch_id: batchId }
```

### 3e. Fluxo de revert — atomicidade via função SQL

O revert é executado atomicamente via uma função PostgreSQL `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION revert_csv_import_batch(
  p_batch_id UUID,
  p_project_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_ids UUID[];
  v_deleted_ledger INT;
  v_deleted_orders INT;
BEGIN
  -- 1. Validar que batch existe, pertence ao projeto e está active
  IF NOT EXISTS (
    SELECT 1 FROM csv_import_batches
    WHERE id = p_batch_id AND project_id = p_project_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'batch_not_found_or_not_active';
  END IF;

  -- 2. Coletar order_ids do batch
  SELECT ARRAY_AGG(DISTINCT order_id) INTO v_order_ids
  FROM ledger_events
  WHERE raw_payload->>'batch_id' = p_batch_id::TEXT
    AND project_id = p_project_id;

  -- 3. Deletar ledger_events do batch
  DELETE FROM ledger_events
  WHERE raw_payload->>'batch_id' = p_batch_id::TEXT
    AND project_id = p_project_id;
  GET DIAGNOSTICS v_deleted_ledger = ROW_COUNT;

  -- 4. Deletar orders órfãos: sem ledger remanescente E sem ledger de webhook
  --    `provider_event_log` não tem coluna order_id — usamos ledger_events
  --    como fonte de verdade (mesmo mecanismo do dedup-checker.ts)
  DELETE FROM order_items
  WHERE order_id = ANY(v_order_ids)
    AND NOT EXISTS (
      SELECT 1 FROM ledger_events le
      WHERE le.order_id = order_items.order_id
        AND le.source_origin != 'csv'
    );

  DELETE FROM orders
  WHERE id = ANY(v_order_ids)
    AND NOT EXISTS (
      SELECT 1 FROM ledger_events le
      WHERE le.order_id = orders.id
        AND le.source_origin != 'csv'
    );
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;

  -- 5. Marcar batch como revertido
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

**Ordem de revert e dependências:** Se dois batches importaram para o mesmo `order_id` (complementação em dois CSVs), revogar o batch A deleta apenas seus ledger_events; o order sobrevive pois o batch B ainda tem ledger. Revogar o batch B depois remove o order. Essa dependência de ordem é esperada e correta — ambos os reverts são seguros de executar independentemente.

**Edge function `provider-csv-import-revert`:**
1. Verifica JWT e extrai `user_id`
2. Verifica que o usuário tem `project_role IN ('owner', 'manager')` no `project_id`
3. Chama `SELECT revert_csv_import_batch(batch_id, project_id)`
4. Retorna resultado

### 3f. UI — Histórico de imports (`CsvImportHistory`)

**Localização:** `HotmartProviderSettings.tsx`, como nova seção acima do CSV import.

**Componente `CsvImportHistory`:**
- Query: últimos 20 batches do projeto, ordem decrescente
- Por batch: data, `file_name`, totais criados/complementados/pulados, status badge
  - `importing` → "Incompleto" (cinza) — sem botão de revert
  - `active` → "Ativo" (verde) + botão "Desfazer" (apenas para owner/manager)
  - `reverted` → "Revertido" (muted) — sem botão
- Botão "Desfazer": abre `AlertDialog` de confirmação antes de chamar a edge function de revert
- Sem paginação (últimos 20 é suficiente; cada projeto raramente terá mais que isso)

---

## Fluxo de dados completo

```
Frontend (useProviderCSVImport)
  ├─ parseHotmartCSV()                    → CSVPreview
  ├─ validateProductMatch()               → match_ratio (2 queries: orders COUNT + order_items)
  ├─ ConfirmDialog                        → usuário confirma projeto + warnings
  └─ runImport()
       ├─ chunk 0: envia { provider, project_id, groups, file_name } SEM batch_id
       │    └─ edge fn: INSERT batch (status=importing), retorna batch_id
       ├─ chunks 1..N-1: envia { batch_id, is_last_chunk:false }
       ├─ chunk N (último): envia { batch_id, is_last_chunk:true }
       │    └─ edge fn: UPDATE batch (status=active, totais)
       └─ acumula ImportResult (erros não interrompem — batch fica 'importing' se último chunk falha)

Edge Function provider-csv-import
  ├─ Se sem batch_id: INSERT csv_import_batches(status=importing), retorna batch_id
  ├─ Propaga batch_id → writeLedgerEvents → raw_payload.batch_id
  └─ Retorna ImportResult + batch_id (no primeiro chunk)

Edge Function provider-csv-import-revert
  ├─ Verifica JWT + role (owner|manager)
  └─ SELECT revert_csv_import_batch(batch_id, project_id)  ← atômico
```

---

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `src/components/AppHeader.tsx` | Remover menu item Histórico |
| `src/pages/SalesHistory.tsx` | Redirecionar para Settings com toast |
| `src/hooks/useProviderCSVImport.ts` | Adicionar validateProductMatch, file_name, batch_id handling |
| `src/components/settings/ProviderCSVImport.tsx` | Adicionar ConfirmDialog |
| `src/components/settings/CsvImportHistory.tsx` | Criar (novo) |
| `src/components/settings/providers/HotmartProviderSettings.tsx` | Adicionar CsvImportHistory |
| `supabase/functions/provider-csv-import/index.ts` | Criar batch no 1º chunk, propagar batch_id |
| `supabase/functions/provider-csv-import/core/ledger-writer.ts` | Aceitar + gravar batch_id no raw_payload |
| `supabase/functions/provider-csv-import-revert/index.ts` | Criar (nova edge function) |
| `supabase/migrations/YYYYMMDD_csv_import_batches.sql` | Tabela + RLS + função SQL de revert |

---

## Fora de escopo

- Reverter contatos CRM criados durante o import
- Validação que o Hotmart seller ID do CSV bate com as credenciais configuradas
- Migração/decommission da edge function antiga `csv-ledger-v21-import`
- Paginação no histórico de imports (últimos 20 é suficiente)
