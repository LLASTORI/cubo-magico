# Auditoria: Fases de Lançamento — Estado Atual

> **Data:** 2026-03-21 | **Sessão:** 25 | **Escopo:** Read-only — sem alterações

---

## 1. Banco de Dados — Fases

### `launch_phases` — 0 registros
| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid PK | |
| `funnel_id` | uuid → funnels | |
| `project_id` | uuid → projects | |
| `phase_type` | text | ex: captacao, vendas |
| `name` | text | |
| `start_date` | date | |
| `end_date` | date | |
| `status` | text | default 'planned' |
| `config` | jsonb | campo genérico de metadados |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Colunas ausentes** (existem no TypeScript, não existem no DB):
`primary_metric`, `is_active`, `phase_order`, `notes`, `campaign_name_pattern`

### `phase_campaigns` — 0 registros
| Coluna | Tipo |
|---|---|
| `id` | uuid PK |
| `phase_id` | uuid → launch_phases |
| `campaign_id` | text → meta_campaigns |
| `project_id` | uuid |
| `created_at` | timestamptz |

Estrutura **alinhada** com o TypeScript. Sem divergências.

### `launch_products` — 0 registros
| Coluna DB | Tipo | Coluna TypeScript | Status |
|---|---|---|---|
| `id` | uuid | `id` | ✅ |
| `funnel_id` | uuid | `funnel_id` | ✅ |
| `project_id` | uuid | `project_id` | ✅ |
| `product_name` | text | `offer_mapping_id` | ❌ mismatch |
| `product_code` | text | `product_type` | ❌ mismatch |
| `price` | numeric | — | não existe no TypeScript |
| `currency` | text | — | não existe no TypeScript |
| `position_type` | text | `lot_name` | ❌ mismatch |

### Relacionamentos
- `launch_phases.funnel_id` → `funnels.id` ✅
- `phase_campaigns.phase_id` → `launch_phases.id` ✅
- `launch_products.funnel_id` → `funnels.id` ✅
- `offer_mappings` **não tem** coluna `phase_id` — não há vínculo direto oferta ↔ fase

### Como uma oferta se associa a um funil
`offer_mappings` conecta ao funil por dois campos (legado e atual):
- `id_funil` (text) — campo legado ainda em uso em muitos registros
- `funnel_id` (uuid) — campo moderno
- `tipo_posicao` (text) — valores: FRONT, FE, OB, US, DS (1.046 de 1.207 registros têm null)

**Não existe campo `phase_id` em `offer_mappings`** — impossível hoje dizer "esta oferta pertence à Fase 2 (Pitch)".

---

## 2. Banco de Dados — Offer Mappings

Colunas presentes (1.207 registros):
`id, project_id, funnel_id, id_funil (legacy), nome_oferta, codigo_oferta, tipo_posicao, valor, is_active, is_front, created_at, updated_at`

**Diferenciar "FRONT da fase de ingressos" vs "FRONT da fase de pitch":**
Não é possível hoje. O campo `tipo_posicao` só distingue a posição no funil (FRONT/OB/US/DS), não a fase temporal. Dois FRONTs de fases diferentes seriam indistinguíveis no schema atual.

**Distribuição de `tipo_posicao`:**
- `null`: 1.046 registros (~87%)
- `OB`: 90
- `FRONT`: 51
- `US`: 17
- `DS`: 3

---

## 3. Frontend — Configuração de Lançamento

### Fluxo de configuração
O usuário acessa: `LaunchConfigDialog` → aba "Fases" → `LaunchPhaseEditor`

O editor permite:
- Adicionar fase com: tipo, nome, data início, data fim, observações
- Arrastar para reordenar (dnd-kit)
- Expandir/colapsar cada fase para ver campanhas vinculadas
- Vinculação manual de campanhas Meta por fase (`PhaseCampaignsManager`)

### Problema crítico no `createPhase.mutate()`
O handler de criação (`LaunchPhaseEditor.tsx:106–118`) envia para o banco:
```typescript
{
  funnel_id, project_id, phase_type, name, start_date, end_date,
  primary_metric: phaseType?.metric || 'spend',  // ❌ coluna não existe no DB
  is_active: true,                                 // ❌ coluna não existe no DB
  phase_order: phases.length,                      // ❌ coluna não existe no DB
  notes: ...,                                      // ❌ coluna não existe no DB
  campaign_name_pattern: null,                     // ❌ coluna não existe no DB
}
```

**PostgREST retorna erro 400** para colunas inexistentes. O resultado: toda tentativa de criar fase **falha com erro**. Nenhuma fase pode ser criada pelo UI hoje.

### `launch_products` e vinculação de ofertas
O frontend (`useLaunchPhases.ts:249`) tenta inserir `offer_mapping_id, product_type, lot_name` — colunas que não existem no DB. A tabela real tem `product_name, product_code, price, position_type`. Mesmo problema: qualquer tentativa de salvar um produto falha.

---

## 4. Frontend — Análise de Lançamento

### `useLaunchData.ts`
- Ainda queries **`hotmart_sales`** (tabela descontinuada/depreciada)
- A tabela canônica é `funnel_orders_view` → hook canônico `useFunnelData.ts`
- Métricas calculadas **no nível do funil inteiro** — sem breakdown por fase
- Usa `campaign_name_pattern` do funil (campo `funnels.campaign_name_pattern`) para atribuir investimento Meta a um lançamento — isso funciona mas é uma aproximação

### `useLaunchPhaseMetrics.ts`
- Corretamente busca `launch_phases` + `phase_campaigns` + `meta_insights`
- Calcula spend, CPL, CPA, frequência por fase usando:
  1. `campaign_name_pattern` (pattern matching no nome da campanha) — lê campo inexistente no DB
  2. Campanhas manuais via `phase_campaigns` — estrutura OK
- **Problema:** lê `phase.phase_order`, `phase.primary_metric`, `phase.is_active`, `phase.campaign_name_pattern` — todos `undefined` com dados reais do DB
- Métricas de **receita por fase são zero** — não existe join com `orders`/`order_items`
- A view `LaunchPhasesOverview` mostra "Nenhuma fase configurada" porque não há dados no DB

---

## 5. Diagnóstico

### Pergunta: É possível ter lançamento pago com Fase 1 (ingressos) + Fase 2 (pitch) com métricas separadas?

**Resposta: Não. Há três camadas de problema:**

**Camada 1 — Schema do banco quebrado (bloqueador imediato):**
A tabela `launch_phases` está desincronizada com o TypeScript. As colunas `primary_metric`, `is_active`, `phase_order`, `notes`, `campaign_name_pattern` não existem. Nenhuma fase pode ser criada pelo UI — o INSERT falha com 400. O banco está vazio (0 registros).

**Camada 2 — Sem vínculo oferta ↔ fase (bloqueador estrutural):**
Mesmo que fases fossem criadas, `offer_mappings` não tem `phase_id`. Não é possível dizer que o "ingresso R$97" pertence à Fase 1 e o "produto principal R$997" pertence à Fase 2. O funil inteiro compartilha um único conjunto de ofertas.

**Camada 3 — Sem receita por fase (lacuna analítica):**
`useLaunchPhaseMetrics` calcula apenas métricas Meta (spend, CPL, CPA via conversões Meta). Não há join com `orders`/`order_items` — receita real por fase não existe.

### O que precisaria ser feito para suportar isso

**Prioridade 1 — Correção imediata (baixo esforço):**
Migration adicionando as colunas ausentes em `launch_phases`:
```sql
ALTER TABLE launch_phases
  ADD COLUMN primary_metric text NOT NULL DEFAULT 'spend',
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN phase_order integer NOT NULL DEFAULT 0,
  ADD COLUMN notes text,
  ADD COLUMN campaign_name_pattern text;
```

**Prioridade 2 — Corrigir `launch_products` (baixo esforço):**
Ou alinhar o TypeScript ao DB existente, ou adicionar as colunas esperadas. Depende da semântica desejada — `offer_mapping_id` (link a oferta existente) é mais útil que `product_name` (duplicação de dados).

**Prioridade 3 — Receita por fase (médio esforço):**
Opção A (mais simples): coluna `phase_id` em `offer_mappings` — filtrar `order_items` pela oferta da fase.
Opção B: usar date range da fase para filtrar `orders` — menos preciso mas sem schema change em `offer_mappings`.

**Prioridade 4 — Migrar `useLaunchData` de `hotmart_sales` para `funnel_orders_view` (médio esforço).**

---

## 6. Conclusão

### Resumo em 5 pontos

1. **Schema do banco desatualizado:** `launch_phases` está com ~5 colunas faltando vs o TypeScript. Toda criação de fase falha silenciosamente (erro 400 do PostgREST). O banco tem 0 fases cadastradas.

2. **`launch_products` também desalinhado:** TypeScript e banco têm estruturas completamente diferentes. Toda operação de produto falha.

3. **Métricas Meta por fase estão implementadas corretamente:** `useLaunchPhaseMetrics` tem lógica sólida (pattern matching + campanhas manuais + agregação de `meta_insights`). Funciona assim que dados existirem no banco.

4. **Receita por fase não existe:** O sistema atual só mede investimento Meta e CPL/CPA por fase. Receita real (R$) por fase exige join com `order_items` — não implementado.

5. **`useLaunchData.ts` usa `hotmart_sales` (depreciado):** Este hook precisa ser migrado para `funnel_orders_view` antes de qualquer expansão do dashboard de lançamento.

### O que já existe e pode ser aproveitado

- ✅ Estrutura de fases (`launch_phases`, `phase_campaigns`) — tabelas existem, só faltam colunas
- ✅ Lógica de métricas Meta por fase (`useLaunchPhaseMetrics`) — completa e funcional, aguarda dados
- ✅ UI de gerenciamento de fases (`LaunchPhaseEditor`, `SortablePhaseItem`) — completa
- ✅ Tipos de fase bem definidos (9 tipos: distribuição, captação, aquecimento, lembrete, remarketing, vendas, última oportunidade, flash open, downsell)
- ✅ `offer_item_revenue_view` — receita por posição já calculada, pode ser filtrada por fase

### O que falta para suportar lançamento pago completo

| Item | Esforço | Impacto |
|---|---|---|
| Migration: adicionar colunas ausentes em `launch_phases` | Baixo | Desbloqueia criação de fases |
| Corrigir `LaunchProduct` interface ou schema `launch_products` | Baixo | Desbloqueia produtos |
| Migrar `useLaunchData.ts` de `hotmart_sales` → `funnel_orders_view` | Médio | Corrige dados de receita |
| Adicionar `phase_id` em `offer_mappings` ou filtro por date range | Médio | Receita por fase |
| Métricas Onda 2 (passing diário, show rate, NPS, ROAS) | Alto | Lançamento pago completo |
