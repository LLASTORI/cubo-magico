# Onda 2B — Comparativo de Edições + phase_id em offer_mappings

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir comparar métricas de múltiplas edições de um lançamento pago lado a lado, e vincular cada oferta mapeada a uma fase específica da edição.

**Architecture:** Comparativo usa `useQueries` (TanStack Query v5) para buscar KPIs de N edições em paralelo; um componente tabela exibe o resultado inline no `LaunchDashboard`. O `phase_id` em `offer_mappings` é uma migration simples + campo extra na tab "Produtos" do `LaunchConfigDialog`, visível apenas para `lancamento_pago`.

**Tech Stack:** React 18, TypeScript strict, TanStack Query 5 (`useQueries`), Supabase, shadcn-ui, Tailwind, `useTenantNavigation`.

---

## Mapa de Arquivos

| Ação | Arquivo | Responsabilidade |
|------|---------|-----------------|
| Create | `src/hooks/useEditionsComparativo.ts` | Busca KPIs de todas as edições em paralelo |
| Create | `src/components/launch/EditionsComparativoTable.tsx` | Tabela comparativa de edições |
| Modify | `src/pages/LaunchDashboard.tsx` | Toggle "Ver comparativo" em `LaunchPagoEditionsRow` |
| Create | `supabase/migrations/20260322200000_add_phase_id_to_offer_mappings.sql` | Adiciona `phase_id` nullable em `offer_mappings` |
| Modify | `src/hooks/useLaunchPhases.ts` | Adiciona `phase_id` em `LaunchProduct` interface; atualiza `updateLaunchProduct` |
| Modify | `src/components/launch/LaunchConfigDialog.tsx` | Adiciona `funnel_model` na prop + phase selector na aba Produtos |

---

## Task 1: Hook `useEditionsComparativo`

**Files:**
- Create: `src/hooks/useEditionsComparativo.ts`

**Contexto:**
- `useLaunchEditions.ts` exporta `useEditions(projectId, funnelId)` → `{ editions, isLoading }`
- `LaunchEdition` tem: `id`, `name`, `edition_number`, `event_date`, `start_date`, `end_date`, `status`
- `funnel_orders_view` tem: `project_id`, `funnel_id`, `economic_day`, `customer_paid`, `main_offer_code`
- `meta_insights` tem: `project_id`, `date_start`, `spend`
- `useQueries` do TanStack Query v5: `useQueries({ queries: [...] })` — retorna array de resultados

**Dados que o hook retorna por edição:**
- `totalIngressos`: count de rows em `funnel_orders_view` com `main_offer_code` não-nulo, no período `start_date → event_date`
- `faturamentoTotal`: soma `customer_paid` no período `start_date → end_date`
- `totalSpend`: soma `spend` em `meta_insights` no período `start_date → end_date`
- `roas`: `faturamentoTotal / totalSpend` (0 se spend = 0)

- [ ] **Criar `src/hooks/useEditionsComparativo.ts`**

```typescript
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEditions } from '@/hooks/useLaunchEditions';
import { LaunchEdition } from '@/types/launch-editions';

export interface EditionComparativoRow {
  edition: LaunchEdition;
  totalIngressos: number;
  faturamentoTotal: number;
  totalSpend: number;
  roas: number;
  isLoading: boolean;
}

async function fetchEditionKPIs(
  projectId: string,
  funnelId: string,
  edition: LaunchEdition,
) {
  const { start_date, end_date, event_date } = edition;

  // Faturamento total no período da edição
  let revQ = supabase
    .from('funnel_orders_view')
    .select('customer_paid')
    .eq('project_id', projectId)
    .eq('funnel_id', funnelId);
  if (start_date) revQ = revQ.gte('economic_day', start_date);
  if (end_date) revQ = revQ.lte('economic_day', end_date);
  const { data: revRows } = await revQ;
  const faturamentoTotal = (revRows || []).reduce(
    (s, r) => s + (Number(r.customer_paid) || 0), 0
  );

  // Ingressos (FRONT) start_date → event_date
  const fase1End = event_date || end_date;
  let ingQ = supabase
    .from('funnel_orders_view')
    .select('order_id')
    .eq('project_id', projectId)
    .eq('funnel_id', funnelId)
    .not('main_offer_code', 'is', null);
  if (start_date) ingQ = ingQ.gte('economic_day', start_date);
  if (fase1End) ingQ = ingQ.lte('economic_day', fase1End);
  const { data: ingRows } = await ingQ;
  const totalIngressos = ingRows?.length || 0;

  // Investimento Meta
  let spendQ = supabase
    .from('meta_insights')
    .select('spend')
    .eq('project_id', projectId);
  if (start_date) spendQ = spendQ.gte('date_start', start_date);
  if (end_date) spendQ = spendQ.lte('date_start', end_date);
  const { data: spendRows } = await spendQ;
  const totalSpend = (spendRows || []).reduce(
    (s, r) => s + (parseFloat(String(r.spend)) || 0), 0
  );

  const roas = totalSpend > 0 ? faturamentoTotal / totalSpend : 0;
  return { totalIngressos, faturamentoTotal, totalSpend, roas };
}

export function useEditionsComparativo(
  projectId: string,
  funnelId: string,
): { rows: EditionComparativoRow[]; isLoading: boolean } {
  const { editions, isLoading: editionsLoading } = useEditions(projectId, funnelId);

  const results = useQueries({
    queries: editions.map((edition) => ({
      queryKey: ['edition-kpis', projectId, funnelId, edition.id],
      queryFn: () => fetchEditionKPIs(projectId, funnelId, edition),
      enabled: !!projectId && !!funnelId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const rows: EditionComparativoRow[] = editions.map((edition, i) => ({
    edition,
    totalIngressos: results[i]?.data?.totalIngressos ?? 0,
    faturamentoTotal: results[i]?.data?.faturamentoTotal ?? 0,
    totalSpend: results[i]?.data?.totalSpend ?? 0,
    roas: results[i]?.data?.roas ?? 0,
    isLoading: results[i]?.isLoading ?? true,
  }));

  const isLoading = editionsLoading || results.some((r) => r.isLoading);

  return { rows, isLoading };
}
```

- [ ] **Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Esperado: zero erros TypeScript.

- [ ] **Commit**

```bash
git add src/hooks/useEditionsComparativo.ts
git commit -m "feat: hook useEditionsComparativo para KPIs paralelos por edição"
```

---

## Task 2: Componente `EditionsComparativoTable`

**Files:**
- Create: `src/components/launch/EditionsComparativoTable.tsx`

**Contexto:**
- Importar `useEditionsComparativo` para dados
- Usar `useTenantNavigation` de `@/navigation` para navegar para a análise individual
- `navigateTo('/lancamentos/:funnelId/edicoes/:editionId')` abre `LaunchEditionAnalysis`
- Melhor ROAS da lista = destaque verde
- Esqueleto de loading: mostrar `—` enquanto isLoading por linha
- `format`, `parseISO` de `date-fns` para formatar datas

- [ ] **Criar `src/components/launch/EditionsComparativoTable.tsx`**

```typescript
import { useTenantNavigation } from '@/navigation';
import { useEditionsComparativo } from '@/hooks/useEditionsComparativo';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  projectId: string;
  funnelId: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);

const STATUS_MAP = {
  planned: { label: 'Planejada', className: 'bg-slate-100 text-slate-700 border-0' },
  active:  { label: 'Ativa',     className: 'bg-green-100 text-green-700 border-0' },
  finished:{ label: 'Encerrada', className: 'bg-amber-100 text-amber-700 border-0' },
} as const;

export function EditionsComparativoTable({ projectId, funnelId }: Props) {
  const { rows, isLoading } = useEditionsComparativo(projectId, funnelId);
  const { navigateTo } = useTenantNavigation();

  if (!isLoading && !rows.length) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma edição cadastrada para comparar.
      </p>
    );
  }

  const bestRoas = Math.max(...rows.map((r) => r.roas));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>Edição</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Evento</TableHead>
            <TableHead className="text-right">Ingressos</TableHead>
            <TableHead className="text-right">Faturamento</TableHead>
            <TableHead className="text-right">Investimento</TableHead>
            <TableHead className="text-right">ROAS</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ edition, totalIngressos, faturamentoTotal, totalSpend, roas, isLoading: rowLoading }) => {
            const status = STATUS_MAP[edition.status as keyof typeof STATUS_MAP] ?? STATUS_MAP.planned;
            const isBest = bestRoas > 0 && roas === bestRoas;
            const dash = rowLoading ? '—' : undefined;

            return (
              <TableRow key={edition.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{edition.name}</TableCell>
                <TableCell className="text-center">
                  <Badge className={status.className}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {edition.event_date
                    ? format(parseISO(edition.event_date), 'dd/MM/yy', { locale: ptBR })
                    : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dash ?? totalIngressos}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dash ?? fmt(faturamentoTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {dash ?? fmt(totalSpend)}
                </TableCell>
                <TableCell className={cn(
                  'text-right font-bold tabular-nums',
                  isBest ? 'text-green-600' : '',
                )}>
                  {dash ?? `${roas.toFixed(2)}x`}
                  {isBest && !rowLoading && (
                    <span className="ml-1 text-xs">↑</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Ver análise"
                    onClick={() =>
                      navigateTo(`/lancamentos/${funnelId}/edicoes/${edition.id}`)
                    }
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Commit**

```bash
git add src/components/launch/EditionsComparativoTable.tsx
git commit -m "feat: componente EditionsComparativoTable com melhor ROAS destacado"
```

---

## Task 3: Integrar Comparativo no LaunchDashboard

**Files:**
- Modify: `src/pages/LaunchDashboard.tsx` — função `LaunchPagoEditionsRow` (final do arquivo)

**Contexto:**
- `LaunchPagoEditionsRow` já existe no arquivo (adicionado na Onda 2A)
- Está no final de `LaunchDashboard.tsx`, antes de `export default LaunchDashboard`
- Adicionar estado `showComparativo` (boolean) — toggle entre lista de edições e tabela comparativa
- Importar `EditionsComparativoTable` e `BarChart2` (lucide-react)

- [ ] **Ler o trecho atual de `LaunchPagoEditionsRow` em `LaunchDashboard.tsx`**

  Confirmar que a função está no final do arquivo (antes de `export default LaunchDashboard`).

- [ ] **Substituir `LaunchPagoEditionsRow` pela versão com toggle**

  Localizar:
  ```typescript
  function LaunchPagoEditionsRow({ funnelId, projectId }: { funnelId: string; projectId: string }) {
    const { editions } = useEditions(projectId, funnelId);
    const { navigateTo } = useTenantNavigation();
  ```

  Substituir toda a função por:

  ```typescript
  function LaunchPagoEditionsRow({ funnelId, projectId }: { funnelId: string; projectId: string }) {
    const [showComparativo, setShowComparativo] = useState(false);
    const { editions } = useEditions(projectId, funnelId);
    const { navigateTo } = useTenantNavigation();

    return (
      <div className="space-y-3">
        {/* Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComparativo(false)}
            className={cn(
              'text-sm px-3 py-1 rounded-md transition-colors',
              !showComparativo
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            Edições
          </button>
          <button
            onClick={() => setShowComparativo(true)}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1 rounded-md transition-colors',
              showComparativo
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Comparativo
          </button>
        </div>

        {showComparativo ? (
          <EditionsComparativoTable projectId={projectId} funnelId={funnelId} />
        ) : (
          <>
            {!editions.length ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Nenhuma edição cadastrada. Configure em{' '}
                <span className="font-medium">Configurar → Edições</span>.
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {editions.map((edition) => (
                  <button
                    key={edition.id}
                    onClick={() => navigateTo(`/lancamentos/${funnelId}/edicoes/${edition.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{edition.name}</span>
                      <EditionStatusBadge status={edition.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {edition.event_date && (
                        <span>Evento: {format(new Date(edition.event_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      )}
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  ```

- [ ] **Adicionar imports necessários no topo do arquivo**

  Localizar o bloco de imports. Adicionar:
  ```typescript
  import { BarChart2 } from "lucide-react";
  import { EditionsComparativoTable } from "@/components/launch/EditionsComparativoTable";
  ```

  `useState` e `cn` já estão importados.

- [ ] **Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Commit**

```bash
git add src/pages/LaunchDashboard.tsx
git commit -m "feat: toggle comparativo de edições no LaunchDashboard"
```

---

## Task 4: Migration — `phase_id` em `offer_mappings`

**Files:**
- Create: `supabase/migrations/20260322200000_add_phase_id_to_offer_mappings.sql`

**Contexto:**
- `offer_mappings` já tem: `id`, `funnel_id`, `project_id`, `codigo_oferta`, `tipo_posicao`, etc.
- `launch_phases` já tem `id`, `edition_id`
- A FK é nullable (`ON DELETE SET NULL`) — se a fase for deletada, a oferta fica sem fase mas não some

- [ ] **Criar a migration**

```sql
-- Adiciona phase_id em offer_mappings para vincular oferta a uma fase específica de uma edição
ALTER TABLE offer_mappings
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES launch_phases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offer_mappings_phase_id
  ON offer_mappings(phase_id)
  WHERE phase_id IS NOT NULL;

COMMENT ON COLUMN offer_mappings.phase_id IS
  'Fase do lançamento pago à qual esta oferta pertence. NULL = sem vínculo de fase.
   Usado em lançamentos pagos recorrentes para vincular ingressos/OBs às fases corretas da edição.';
```

- [ ] **Aplicar a migration no Supabase**

  Via MCP supabase:
  ```
  apply_migration: 20260322200000_add_phase_id_to_offer_mappings.sql
  ```

- [ ] **Verificar que a coluna existe**

  Via MCP supabase execute_sql:
  ```sql
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'offer_mappings' AND column_name = 'phase_id';
  ```

- [ ] **Commit**

```bash
git add supabase/migrations/20260322200000_add_phase_id_to_offer_mappings.sql
git commit -m "feat: adiciona phase_id nullable em offer_mappings"
```

---

## Task 5: UI — Phase selector na aba Produtos

**Files:**
- Modify: `src/hooks/useLaunchPhases.ts` — adicionar `phase_id` em `LaunchProduct`
- Modify: `src/components/launch/LaunchConfigDialog.tsx` — adicionar `funnel_model` na prop + phase selector

**Contexto:**

### `useLaunchPhases.ts`
- Interface `LaunchProduct` (linha ~30) não tem `phase_id` — adicionar campo opcional
- `updateLaunchProduct` já aceita `Partial<LaunchProduct> & { id }` — funciona sem mudança

### `LaunchConfigDialog.tsx`
- Interface da prop `funnel` (linha ~23) não tem `funnel_model` — adicionar campo opcional
- Para exibir o phase selector, precisa das fases do funil — já carregadas via `useLaunchPhases`
  (hook retorna `phases` além de `launchProducts`)
- Phase selector: Select com as fases do funil, agrupadas por `edition_number` se possível
  - Como as fases podem ter `edition_id`, buscar editions e fases separadamente seria complexo
  - **Simplificação MVP:** mostrar todas as fases do funil com `phase_type` e `name`
  - O select usa `updateOfferMappingPhase` — mutation simples que faz UPDATE em `offer_mappings`

**Como atualizar `phase_id` em `offer_mappings`:**
A aba Produtos já faz SELECT em `offer_mappings` (`offerMappings`). A mutation de update deve ser direta via `supabase.from('offer_mappings').update({ phase_id }).eq('id', mappingId)`.

- [ ] **Adicionar `phase_id` em `LaunchProduct` no `useLaunchPhases.ts`**

  Localizar:
  ```typescript
  export interface LaunchProduct {
    id: string;
    funnel_id: string;
    offer_mapping_id: string;
    project_id: string;
    product_type: string;
    lot_name: string | null;
    created_at: string;
  }
  ```

  Substituir por:
  ```typescript
  export interface LaunchProduct {
    id: string;
    funnel_id: string;
    offer_mapping_id: string;
    project_id: string;
    product_type: string;
    lot_name: string | null;
    created_at: string;
  }
  ```

  **Nota:** `LaunchProduct` não precisa de `phase_id` — o `phase_id` fica em `offer_mappings`, não em `launch_products`. Skip este passo.

- [ ] **Adicionar `funnel_model` na prop do `LaunchConfigDialog`**

  Localizar em `LaunchConfigDialog.tsx`:
  ```typescript
  interface LaunchConfigDialogProps {
    funnel: {
      id: string;
      name: string;
      project_id: string | null;
      launch_start_date?: string | null;
      launch_end_date?: string | null;
      has_fixed_dates?: boolean;
      launch_tag?: string | null;
    };
    trigger?: React.ReactNode;
  }
  ```

  Substituir por:
  ```typescript
  interface LaunchConfigDialogProps {
    funnel: {
      id: string;
      name: string;
      project_id: string | null;
      launch_start_date?: string | null;
      launch_end_date?: string | null;
      has_fixed_dates?: boolean;
      launch_tag?: string | null;
      funnel_model?: string | null;
    };
    trigger?: React.ReactNode;
  }
  ```

- [ ] **Adicionar mutation `updateOfferMappingPhase` e query de fases no `LaunchConfigDialog`**

  Logo após a query de `offerMappings` (linha ~64), adicionar:

  ```typescript
  // Fases do funil (para phase selector — só em lancamento_pago)
  const { phases = [] } = useLaunchPhases(projectId, funnel.id);

  // Mutation para vincular phase_id em offer_mappings
  const updateOfferMappingPhase = useMutation({
    mutationFn: async ({ mappingId, phaseId }: { mappingId: string; phaseId: string | null }) => {
      const { error } = await supabase
        .from('offer_mappings')
        .update({ phase_id: phaseId })
        .eq('id', mappingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-mappings', projectId, funnel.id] });
      toast.success('Fase vinculada');
    },
    onError: (err: Error) => toast.error('Erro: ' + err.message),
  });
  ```

  **Atenção:** `useLaunchPhases` já é importado (`useLaunchPhases, PRODUCT_TYPES`). Verificar que o retorno inclui `phases`. Se não incluir, ler `useLaunchPhases.ts` para confirmar o nome correto da variável (pode ser `launchPhases`).

- [ ] **Adicionar o phase selector na aba Produtos**

  Localizar o bloco de `{linkedProduct && (...)}` (campo "Lote") dentro do `.map((mapping) => {...})`. Logo **antes** desse bloco (mas dentro do mesmo `div` da oferta), adicionar condicionalmente para `lancamento_pago`:

  ```typescript
  {/* Phase selector — somente lancamento_pago */}
  {funnel.funnel_model === 'lancamento_pago' && phases.length > 0 && (
    <div className="flex items-center gap-2 pt-2 border-t">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">Fase:</Label>
      <Select
        value={(mapping as any).phase_id || 'none'}
        onValueChange={(value) =>
          updateOfferMappingPhase.mutate({
            mappingId: mapping.id,
            phaseId: value === 'none' ? null : value,
          })
        }
      >
        <SelectTrigger className="h-8 text-sm flex-1">
          <SelectValue placeholder="Nenhuma fase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sem fase</SelectItem>
          {phases.map((phase) => (
            <SelectItem key={phase.id} value={phase.id}>
              {phase.name}
              {phase.edition_id && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({phase.phase_type})
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}
  ```

  **Atenção:** `mapping` é do tipo retornado pelo Supabase sem tipagem explícita de `phase_id`. O `(mapping as any).phase_id` é aceitável para MVP. Se TypeScript reclamar, tipar com `& { phase_id?: string | null }` no `offerMappings`.

- [ ] **Verificar que `useLaunchPhases` retorna `phases`**

  Ler a linha de retorno do hook (`return { phases, launchProducts, ... }`). Ajustar o nome da variável conforme necessário.

- [ ] **Passar `funnel_model` no `LaunchConfigDialog` no `LaunchDashboard.tsx`**

  Localizar em `LaunchDashboard.tsx`:
  ```typescript
  funnel={funnels.find(f => f.id === launch.funnelId) || {
    id: launch.funnelId,
    name: launch.funnelName,
    project_id: currentProject?.id || null
  }}
  ```

  Garantir que o objeto de fallback inclua `funnel_model: null`. O `funnels.find(...)` já inclui `funnel_model` se a query retornar o campo (verificar `useLaunchData`).

- [ ] **Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Esperado: zero erros TypeScript.

- [ ] **Commit**

```bash
git add src/hooks/useLaunchPhases.ts src/components/launch/LaunchConfigDialog.tsx src/pages/LaunchDashboard.tsx
git commit -m "feat: phase selector na aba Produtos para lancamento_pago"
```

---

## Task 6: Verificação Final e Docs

- [ ] **Build limpo completo**

```bash
npm run build 2>&1 | tail -5
```

Esperado: `✓ built in ...s` sem erros.

- [ ] **Atualizar `TASKS.md`**

  Mover "Comparativo entre edições" e "`phase_id` em `offer_mappings`" para ✅ na seção Onda 2B.

- [ ] **Atualizar `debug_log.md`**

  Adicionar entrada:
  ```
  ### [2026-03-22] Onda 2B — Comparativo de edições + phase_id (sessão 30) ✅
  ```

- [ ] **Commit final**

```bash
git add TASKS.md debug_log.md
git commit -m "docs: atualiza TASKS.md e debug_log (sessão 30 — Onda 2B)"
```
