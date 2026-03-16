# FUNNEL TYPE AUDIT — Mapeamento Completo do Sistema de Tipos de Funil

> Gerado em: 2026-03-16 | Sessão de auditoria — somente leitura, nenhuma alteração feita.

---

## 1. Banco de Dados — Estado Atual

### Coluna principal: `funnels.funnel_type`

**Migration:** `supabase/migrations/20251210123712_967f0d71-7cb5-4df0-9efb-f5613ccbb90d.sql`

```sql
ALTER TABLE public.funnels
  ADD COLUMN funnel_type text NOT NULL DEFAULT 'perpetuo';

ALTER TABLE public.funnels
  ADD CONSTRAINT funnels_type_check
    CHECK (funnel_type IN ('perpetuo', 'lancamento', 'indefinido'));

CREATE INDEX idx_funnels_type ON public.funnels(funnel_type);
```

**Valores aceitos hoje:**

| Valor | Significado |
|---|---|
| `'perpetuo'` | Funil de vendas contínuas (Cubo Mágico) |
| `'lancamento'` | Campanha pontual com janela de vendas |
| `'indefinido'` | A definir — estado temporário |

### Colunas complementares em `funnels`

**Migration:** `20251213141923_06ef5844-...sql`

| Coluna | Tipo | Relevante para |
|---|---|---|
| `launch_start_date` | `date` | `lancamento` |
| `launch_end_date` | `date` | `lancamento` |
| `has_fixed_dates` | `boolean DEFAULT true` | `lancamento` |
| `launch_tag` | `text` | `lancamento` (agrupa leads) |
| `roas_target` | `numeric DEFAULT 2.0` | ambos |
| `campaign_name_pattern` | `text` | ambos |

### Tabelas satélite exclusivas de lançamento

**Migration:** `20251213141923_06ef5844-...sql` e `20251213194634_86a48311-...sql`

| Tabela | FK | Propósito |
|---|---|---|
| `launch_phases` | `funnel_id` | Fases do lançamento (waitlist, presale, launch, peak) |
| `phase_campaigns` | `phase_id` | Campanhas Meta por fase |
| `launch_products` | `funnel_id` | Ofertas (main, bump, upsell, downsell) do lançamento |
| `crm_contact_interactions` | `funnel_id` + `launch_tag` | Interações de leads durante campanhas |

---

## 2. Frontend — Criação de Funil

**Componente:** `src/components/FunnelManager.tsx`

- Exibe `<Select>` com os três valores no form de criação e edição.
- O tipo selecionado é salvo diretamente em `funnels.funnel_type`.
- Se `'lancamento'`, o usuário configura datas e tag em `src/components/launch/LaunchConfigDialog.tsx`.

**Tipo TypeScript local:**

```typescript
type FunnelType = 'perpetuo' | 'lancamento' | 'indefinido';

const FUNNEL_TYPE_LABELS: Record<FunnelType, string> = {
  perpetuo: 'Perpétuo',
  lancamento: 'Lançamento',
  indefinido: 'A Definir',
};

const FUNNEL_TYPE_COLORS: Record<FunnelType, string> = {
  perpetuo: 'bg-emerald-500/20 text-emerald-700',
  lancamento: 'bg-blue-500/20 text-blue-700',
  indefinido: 'bg-amber-500/20 text-amber-700',
};
```

---

## 3. Frontend — Dashboards de Análise

A decisão de qual dashboard exibir é **baseada em rota** — não em lógica condicional dentro do mesmo componente.

| Rota | Página | Hook | Filtro SQL |
|---|---|---|---|
| `/app/:code/funis` | `src/pages/FunnelAnalysis.tsx` | `useFunnelData.ts` | `funnel_type IN ('perpetuo', 'PERPETUO', 'perpétuo', ...)` |
| `/app/:code/lancamentos` | `src/pages/LaunchDashboard.tsx` | `useLaunchData.ts` | `funnel_type = 'lancamento'` (exato) |

**Detalhe importante:** `useFunnelData` usa uma lista de variantes case-insensitive (`PERPETUO_TYPE_VARIANTS`) para tolerar inconsistências históricas de capitalização. `useLaunchData` faz match exato.

---

## 4. Edge Functions

| Função | Relação com funnel_type |
|---|---|
| `funnel-ai-analysis` | Prompt hardcoded para perpétuos. Não recebe `funnel_type` como parâmetro. |
| `crm-webhook` | Processa `launch_tag` de contatos. |
| `export-seed-data` | Inclui `funnel_type` na exportação. |
| `export-operational-data` | Diferencia dados por tipo na exportação. |

Nenhuma edge function recebe `funnel_type` como parâmetro de entrada explícito.

---

## 5. Conclusão — Impacto de Adicionar `funnel_model`

### Contexto

O objetivo é introduzir granularidade além de perpétuo/lançamento, com valores como:
`perpetuo`, `lancamento`, `lancamento_pago`, `meteorico`, `webinar`, `custom`, etc.

### Estratégia recomendada: campo complementar, não substituição

Manter `funnel_type` como está (discriminador de dashboard: perpétuo vs lançamento).
Adicionar `funnel_model` como subcategoria que refina o tipo.

**Razão:** `funnel_type` é referenciado em hooks, filtros SQL, componentes e edge functions. Substituí-lo quebraria tudo. Como campo complementar, `funnel_model` adiciona valor sem risco.

**Mapeamento conceitual:**

```
funnel_type = 'perpetuo'  +  funnel_model = 'perpetuo'       → Cubo Mágico padrão
funnel_type = 'perpetuo'  +  funnel_model = 'meteorico'      → Perpétuo acelerado
funnel_type = 'lancamento' + funnel_model = 'lancamento'      → Lançamento clássico
funnel_type = 'lancamento' + funnel_model = 'lancamento_pago' → Lançamento com tráfego pago
funnel_type = 'lancamento' + funnel_model = 'webinar'         → Lançamento via webinar
```

---

### O que precisaria mudar por camada

#### Banco de dados

```sql
-- Nova migration: YYYYMMDDHHMMSS_add_funnel_model.sql
ALTER TABLE public.funnels
  ADD COLUMN funnel_model text;

ALTER TABLE public.funnels
  ADD CONSTRAINT funnels_model_check
    CHECK (funnel_model IS NULL OR funnel_model IN (
      'perpetuo', 'meteorico',
      'lancamento', 'lancamento_pago', 'webinar', 'custom'
    ));

COMMENT ON COLUMN public.funnels.funnel_model IS
  'Modelo detalhado do funil. Complementa funnel_type com granularidade adicional.';
```

- **Nullable** por padrão — funnels existentes não quebram.
- CHECK constraint flexível para adicionar novos modelos via nova migration.
- Não remover nem alterar `funnel_type`.

#### Frontend — Tipos TypeScript

Arquivo: `src/components/FunnelManager.tsx` (e onde `FunnelType` for reusado)

```typescript
// Adicionar
type FunnelModel =
  | 'perpetuo'
  | 'meteorico'
  | 'lancamento'
  | 'lancamento_pago'
  | 'webinar'
  | 'custom';

const FUNNEL_MODEL_LABELS: Record<FunnelModel, string> = {
  perpetuo: 'Perpétuo Clássico',
  meteorico: 'Meteórico',
  lancamento: 'Lançamento',
  lancamento_pago: 'Lançamento Pago',
  webinar: 'Webinar',
  custom: 'Personalizado',
};
```

Atualizar a interface `Funnel` para incluir `funnel_model?: FunnelModel | null`.

#### Frontend — FunnelManager.tsx

- Adicionar `<Select>` de `funnel_model` no form de criação/edição (opcional ou obrigatório por decisão de produto).
- Salvar via `supabase.from('funnels').upsert({ ..., funnel_model })`.

#### Types Supabase

Regenerar após a migration:

```bash
supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
```

#### Hooks

- `useFunnelData.ts` e `useLaunchData.ts` — **nenhuma mudança obrigatória** se o filtro continua sendo por `funnel_type`.
- Opcional: expor `funnel_model` nos dados retornados para uso em componentes de análise.

#### Edge Functions

- `funnel-ai-analysis` — pode receber `funnel_model` e ajustar o prompt por modelo (ex: análise de webinar vs perpétuo clássico).
- Restante — nenhuma mudança obrigatória.

---

### Resumo do impacto

| Camada | Mudança | Criticidade |
|---|---|---|
| Migration SQL | Adicionar coluna + constraint | Baixa — nullable, sem breaking change |
| `FunnelManager.tsx` | Novo `<Select>` para `funnel_model` | Baixa |
| Tipos TypeScript | Novo type `FunnelModel` + interface `Funnel` | Baixa |
| `supabase/types.ts` | Regenerar | Trivial |
| Hooks (`useFunnelData`, `useLaunchData`) | Nenhuma mudança obrigatória | — |
| Edge Functions | Nenhuma mudança obrigatória | — |
| Dashboards / rotas | Nenhuma mudança obrigatória | — |

**O que já existe e pode ser aproveitado:**
- Estrutura de labels/colors por tipo em `FunnelManager.tsx` — replicar o padrão.
- `FUNNEL_TYPE_LABELS` e `FUNNEL_TYPE_COLORS` — criar análogos para `FUNNEL_MODEL_LABELS` e `FUNNEL_MODEL_COLORS`.
- Constraint pattern já está provado — só adicionar nova constraint.
- `cuboKernel.ts` já antecipa tipos como `'webinar'` e `'custom'` — alinhamento natural.
