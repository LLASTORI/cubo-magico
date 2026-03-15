# Levantamento Completo da Arquitetura de Funis - Cubo Mágico

> **Data:** 14 de março de 2026 — sessão 3
> **Contexto:** Pós-migração ledger-first. Mapeamento do que existe no código, não do que deveria funcionar.

---

## 1. BANCO DE DADOS

### 1.1 Tabelas Core de Funis

#### `funnels`
**Função:** Registro master dos funis de venda perpétuos
**Colunas principais:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `project_id` (UUID, REFERENCES projects, ON DELETE CASCADE)
- `created_at`, `updated_at`
- Índice UNIQUE: `(name, project_id)`
- RLS: habilitado, acesso via project_members

#### `offer_mappings`
**Função:** Mapeamento de produtos/ofertas do Hotmart para posições de funis (FRONT, OB, US, DS)
**Colunas principais:**
- `id` (UUID, PK)
- `id_produto`, `nome_produto` (compatibilidade legada)
- `nome_oferta`, `codigo_oferta` ← **chave de join com `order_items.provider_offer_id`**
- `valor` (NUMERIC)
- `status` (TEXT — 'Ativo', 'ativo', 'ATIVO', 'active', 'ACTIVE')
- `data_ativacao`, `data_desativacao` (DATE)
- **`funnel_id`** (UUID, REFERENCES funnels, ON DELETE SET NULL)
- `project_id` (UUID, REFERENCES projects)
- **`tipo_posicao`** (TEXT — 'FRONT', 'FE', 'OB', 'US', 'DS')
- **`ordem_posicao`** (INTEGER, DEFAULT 1)
- `nome_posicao` (TEXT)
- `anotacoes` (TEXT)
- `created_at`, `updated_at`

#### `funnel_changes`
**Função:** Changelog de alterações no funil (preços, ofertas, copy, etc)
**Colunas principais:**
- `id` (UUID, PK)
- `id_funil` (TEXT, NOT NULL)
- `codigo_oferta` (TEXT)
- `tipo_alteracao` (TEXT — 'preco', 'oferta_nova', 'oferta_removida', 'copy', 'outro')
- `descricao`, `anotacoes` (TEXT)
- `valor_anterior`, `valor_novo` (NUMERIC)
- `data_alteracao` (DATE, DEFAULT CURRENT_DATE)
- `project_id` (UUID, REFERENCES projects)

#### `orders` (ledger-first)
**Colunas relevantes para funis:**
- `id`, `project_id`, `provider_order_id`
- `customer_paid`, `customer_paid_brl` — **`customer_paid_brl` sempre NULL para webhook; usar COALESCE**
- `producer_net_brl`
- `status` — 'approved', 'completed', 'cancelled', 'refunded', 'partial_refund'
- `buyer_email`, `buyer_name`
- `ordered_at`, `approved_at`
- `payment_method`, `payment_type`
- `utm_source`, `utm_campaign`, `utm_adset`, `utm_placement`, `utm_creative`
- `meta_campaign_id`, `meta_adset_id`, `meta_ad_id`

#### `order_items` (ledger-first)
**Colunas relevantes para funis:**
- `id`, `order_id`, `project_id`
- `product_name`
- **`provider_product_id`** (TEXT — mapeado de offer_mappings.id_produto)
- **`provider_offer_id`** (TEXT — mapeado de offer_mappings.codigo_oferta) ← **chave de join**
- `funnel_id` (UUID — raramente preenchido pelo webhook; usar via offer_mappings)
- **`item_type`** (TEXT — 'main', 'bump', 'upsell', 'downsell')
- `base_price` (NUMERIC)
- Constraint UNIQUE: `(order_id, provider_product_id, provider_offer_id)`

> ⚠️ **CRÍTICO:** `order_items.offer_code` é sempre NULL. O webhook grava em `provider_offer_id`.
> ⚠️ **CRÍTICO:** `order_items.funnel_id` é sempre NULL. Atribuição vem de `offer_mappings` via join.

---

### 1.2 Views Relacionadas a Funis

#### `funnel_orders_view` ✅ CORRIGIDA (20260314212000)
**Função:** Pedidos com metadados de funis — view principal para análise de funil
```
order_id, transaction_id, project_id,
funnel_id (COALESCE(oi.funnel_id, om.funnel_id)),
funnel_name,
customer_paid (COALESCE(customer_paid_brl, customer_paid)),
producer_net, currency,
order_items_count,
main_product, main_offer_code (MAX(provider_offer_id) WHERE item_type='main'),
has_bump, has_upsell, has_downsell,
buyer_email, buyer_name, status,
created_at, ordered_at, economic_day (timezone SP),
all_offer_codes (ARRAY_AGG(provider_offer_id)),
main_revenue, bump_revenue, upsell_revenue
```
**Joins:** `orders → order_items → offer_mappings (codigo_oferta=provider_offer_id) → funnels`

#### `funnel_orders_by_offer` ✅
**Função:** Breakdown por offer_code para análise de posições
```
project_id, offer_code (provider_offer_id),
product_name, item_type,
funnel_id, funnel_name,
tipo_posicao, nome_posicao, ordem_posicao (de offer_mappings),
base_price, order_id, economic_day
```
**WHERE:** `status IN ('approved', 'completed', 'APPROVED', 'COMPLETE')`

#### `funnel_revenue` ✅ (20260314205647)
**Função:** Receita diária por funil
```
project_id, funnel_id, economic_day,
revenue (SUM de producer_net_brl),
gross_revenue (SUM de COALESCE(customer_paid_brl, customer_paid)),
sales_count
```
**WHERE:** `status IN ('approved', 'completed')`, `funnel_id IS NOT NULL`

#### `funnel_spend` ✅
**Função:** Gasto em Ads vinculado a funis via campaign_name_pattern
```
project_id, funnel_id, economic_day,
spend, record_count
```
**Joins:** `spend_core_events → meta_campaigns → funnels (via campaign_name_pattern ILIKE)`

#### `funnel_financials` ✅
**Função:** Full outer join de `funnel_revenue + funnel_spend` com ROAS/CPA
```
project_id, funnel_id, economic_day,
revenue, gross_revenue, sales_count, spend,
profit (revenue - spend),
roas (revenue/spend), cpa (spend/sales_count)
```

#### `funnel_financials_summary` ✅
**Função:** Agregação por funil, respeita `financial_core_start_date` de project_settings (default: 2026-01-12)
```
project_id, funnel_id, funnel_name,
funnel_type, roas_target,
financial_core_start_date,
total_revenue, total_gross_revenue, total_spend, total_sales,
total_profit, overall_roas, overall_cpa, avg_ticket,
health_status ('excellent'|'good'|'attention'|'danger'|'no-return'|'inactive'),
first_day, last_day, days_with_data
```

#### `finance_tracking_view` ⚠️ LEGADO/BRIDGE (20260314205647)
**Função:** Compatibilidade com AnaliseMensal, useMonthlyAnalysis
```
id, project_id, transaction_id,
gross_amount (COALESCE(customer_paid_brl, customer_paid)),
net_amount (producer_net_brl),
hotmart_status,
purchase_date, economic_day,
product_name, product_code (provider_product_id),
offer_code (provider_offer_id),
payment_method, payment_type,
buyer_name, buyer_email,
funnel_id, funnel_name,
utm_*, meta_campaign_id, meta_adset_id, meta_ad_id
```

#### `finance_ledger_summary` ✅ MIGRADA (20260314213000)
**Função:** Insights financeiros detalhados por transação
**Antes:** JOIN `finance_ledger` + `hotmart_sales` → apenas 693 registros
**Depois:** `orders + ledger_events + order_items + offer_mappings` → 6.255 APPROVED/COMPLETE
```
project_id, transaction_id, provider,
product_name, product_code, offer_code,
buyer_name, buyer_email, payment_method, payment_type,
funnel_id, funnel_name,
first_event_at, last_event_at, economic_day,
producer_gross, affiliate_cost, coproducer_cost, platform_cost, refunds, net_revenue,
event_count,
utm_*, meta_campaign_id, meta_adset_id, meta_ad_id,
hotmart_status (mapeado de orders.status)
```
> `producer_gross` ≠ `customer_paid`. É o que Hotmart repassa ao produtor (após taxas, coprodutor, afiliados).

---

## 2. EDGE FUNCTIONS

| Função | Relevância | O que faz |
|---|---|---|
| `funnel-ai-analysis` | ✅ Funis | Análise descritiva via Claude AI; recebe context JSON e retorna health_status + insights |
| `hotmart-webhook` | ✅ Core | Ingestão de pedidos; popula `orders`, `order_items`, `ledger_events` |
| `hotmart-backfill` | ⚠️ Legado | Sync histórico de pedidos — candidato a decommission |
| `hotmart-ledger-brl-backfill` | ⚠️ Legado | Backfill BRL em ledger — candidato a decommission |
| `meta-insights-cron` | ✅ Meta Ads | Fetch diário de métricas Meta Ads (spend, impressões, clicks) |
| `meta-hierarchy-cron` | ✅ Meta Ads | Sync hierarquia de campanhas Meta (campaigns → adsets → ads) |
| `meta-oauth-*` | ✅ Meta Ads | OAuth flow para conectar conta Meta |
| `provider-csv-import` | ✅ CSV | Import de CSV Hotmart → `orders + order_items + ledger_events` |
| `provider-csv-import-revert` | ✅ CSV | Revert atômico de batch CSV importado |

---

## 3. HOOKS DO FRONTEND

### Hooks Canonical (ledger-first) ✅

| Hook | Fonte de dados | Retorna |
|---|---|---|
| `useFunnelData.ts` | `funnel_orders_view` | `ordersData`, `salesData`, `aggregatedMetrics`, `summaryMetrics`, `metaMetrics` |
| `useFunnelFinancials.ts` | `funnel_financials`, `funnel_revenue`, `funnel_spend`, `funnel_financials_summary` | métricas diárias, ROAS, CPA, health_status |
| `useFunnelAIContext.ts` | constrói payload a partir de outros hooks | `computeFunnelAIContext()` — position_breakdown, top_campaigns/adsets/ads, ltv_metrics |
| `useFunnelAnalysisState.ts` | state local | estado da FunnelAnalysis page |
| `useFunnelHealthMetrics.ts` | `funnel_financials_summary` | health_status baseado em ROAS target |
| `useFinanceLedger.ts` | `finance_ledger_summary` (migrada ✅) | transações financeiras com filtros e paginação |
| `useMetaHierarchy.ts` | `meta_insights` | hierarchia campaigns → adsets → ads |

### Hooks Legados / Em Transição ⚠️

| Hook | Fonte | Problema |
|---|---|---|
| `useMonthlyAnalysis.ts` | `finance_tracking_view` | Deveria usar `funnel_revenue` + `funnel_spend` |
| `useFinanceTracking.ts` | `finance_tracking_view` | Fallback legado |
| `useCRMJourneyData.ts` | `orders` (mas usa `offer_code`) | Usa coluna `offer_code` que é sempre NULL — deveria usar `provider_offer_id` |

---

## 4. COMPONENTES E PÁGINAS

### Rotas da Área de Análise

```
/app/:projectCode/analise-de-funil     → FunnelAnalysis.tsx
/app/:projectCode/analise-mensal       → AnaliseMensal.tsx
/app/:projectCode/busca-rapida         → BuscaRapida.tsx
/app/:projectCode/insights             → Insights.tsx (usa useFinanceLedger)
/app/:projectCode/visao-geral          → (usa useProjectOverview → sales_core_view)
```

### Página Principal: `FunnelAnalysis.tsx` ✅

**Tabs:**
- **Geral** — CuboMagicoDashboard
- **Período** — PeriodComparison
- **Temporal** — TemporalChart
- **Posições** — visualização FRONT/OB/US/DS
- **UTM** — UTMAnalysis
- **Pagamentos** — PaymentMethodAnalysis
- **Retenção** — LTVAnalysis
- **Changelog** — FunnelChangelog
- **Meta** — MetaHierarchyAnalysis
- **IA** — FunnelAIInsights

**Hooks usados:** `useFunnelData()`, `useFunnelAIContext()`, `useFunnelAnalysisState()`, `useProjectModules()`

### `AnaliseMensal.tsx` ⚠️
**Fonte:** `useMonthlyAnalysis()` → `finance_tracking_view`
**Problema:** Não migrada para ledger-first views

### Componentes em `src/components/funnel/`

| Componente | Status | O que faz |
|---|---|---|
| `CuboMagicoDashboard.tsx` | ⚠️ LEGADO | Dashboard agregado; ainda comenta uso de `finance_tracking_view` |
| `TemporalChart.tsx` | ✅ | Linha do tempo revenue/invest/ROAS — recebe `salesData` do parent |
| `PeriodComparison.tsx` | ✅ | Comparativo período atual vs anterior |
| `UTMAnalysis.tsx` | ✅ | Breakdown por UTM (dados vêm de `orders`) |
| `PaymentMethodAnalysis.tsx` | ✅ | Distribuição de pagamentos de `orders.payment_method` |
| `LTVAnalysis.tsx` | ✅ | Taxa de recompra e concentração de receita |
| `FunnelChangelog.tsx` | ✅ | Histórico de alterações de `funnel_changes` |
| `FunnelHealthMetrics.tsx` | ✅ | Health status visual |
| `FunnelAIInsights.tsx` | ✅ | Interface para análise IA |
| `ExecutiveReport.tsx` | ✅ | Relatório executivo consolidado |

---

## 5. O QUE ESTÁ CLARAMENTE QUEBRADO

### ❌ A. `useCRMJourneyData.ts` — usa `offer_code` (sempre NULL)
**Problema:** Busca `offer_code` de `orders`/`order_items`, mas o webhook grava em `provider_offer_id`.
**Impacto:** Não consegue linkar journeys a offer_mappings ou funis. Retorna dados sem atribuição de funil.
**Correção:** Substituir `offer_code` por `provider_offer_id` na query.

### ❌ B. `CuboMagicoDashboard.tsx` — referencia `finance_tracking_view`
**Problema:** Código e comentários indicam que usa `finance_tracking_view` como fonte principal de vendas.
**Impacto:** Dashboard usa ponte legada em vez de `funnel_orders_view` direto.
**Correção:** Migrar para `funnel_orders_view` + `funnel_spend`.

### ❌ C. `useMonthlyAnalysis.ts` — usa `finance_tracking_view`
**Problema:** Query direta em `.from('finance_tracking_view')`.
**Impacto:** AnaliseMensal pode não refletir dados mais recentes.
**Correção:** Migrar para `funnel_revenue` + `funnel_spend` com agrupamento mensal.

### ❌ D. `MonthlyRevenueDetailDialog.tsx` — query direta em `hotmart_sales`
**Problema:** `.from('hotmart_sales')` — tabela legada com apenas 840 registros de 6.180 totais.
**Impacto:** Dialog de detalhe mensal mostra dados incompletos/incorretos.
**Correção:** Usar `finance_tracking_view` ou `funnel_orders_view`.

### ❌ E. `CuboMagicoDashboard.tsx` — interface `UnifiedSale` desalinhada
**Problema:** Interface tem `offer_code: string | null` em vez de `provider_offer_id`.
**Impacto:** Mapeamento confuso entre componente e schema real.
**Correção:** Sincronizar tipos com `funnel_orders_view`.

### ⚠️ F. Componentes com queries diretas em `hotmart_sales`
- `src/components/analise/MonthlyRevenueDetailDialog.tsx`
- `src/components/FullDataSync.tsx`
- `src/components/launch/LaunchProductsSalesBreakdown.tsx`
- `src/components/meta/MetaROIDashboard.tsx`
- `src/components/settings/HotmartCSVImport.tsx`

---

## 6. TABELAS/COLUNAS LEGADAS AINDA EM USO

| Legado | Equivalente Atual | Status | Risco |
|---|---|---|---|
| `sales_core_events` | `orders + order_items + ledger_events` | ✅ Deprecated | CRÍTICO — remover write no webhook |
| `hotmart_sales` (query direta) | `finance_tracking_view` ou views ledger-first | ⚠️ Em uso em componentes | ALTO — dados incompletos |
| `offer_code` em order_items | `provider_offer_id` | ⚠️ Usado em hooks | ALTO — sempre NULL |
| `order_items.funnel_id` (direto) | JOIN via `offer_mappings` | ⚠️ Usado em algumas queries | MÉDIO — sempre NULL |
| `finance_ledger` (tabela) | `ledger_events` | ⚠️ `finance_ledger_summary` migrada | RESOLVIDO |

---

## 7. ROADMAP RECOMENDADO

### Prioridade 1 — Crítico
1. `useCRMJourneyData.ts` → `offer_code` → `provider_offer_id`
2. `MonthlyRevenueDetailDialog.tsx` → remover query em `hotmart_sales`
3. `CuboMagicoDashboard.tsx` → migrar de `finance_tracking_view` para `funnel_orders_view`

### Prioridade 2 — Alto
1. `useMonthlyAnalysis.ts` → migrar para `funnel_revenue` + `funnel_spend`
2. `AnaliseMensal.tsx` → atualizar para novos dados
3. Demais componentes com `hotmart_sales` → usar views

### Prioridade 3 — Decommission
1. Remover `writeSalesCoreEvent()` do webhook (~linha 1539)
2. Drop da tabela `sales_core_events`
3. Remover edge functions `hotmart-backfill`, `hotmart-ledger-brl-backfill`
4. Remover `HotmartBackfillSection.tsx`
5. Remover edge function `csv-ledger-v21-import` (antiga)

---

## 8. REFERÊNCIAS RÁPIDAS

### Views Canonical (usar sempre)
- `funnel_orders_view` — pedidos com contexto de funil
- `funnel_revenue` + `funnel_spend` — métricas agregadas
- `funnel_financials_summary` — health_status e ROAS
- `finance_ledger_summary` — insights financeiros por transação

### Proibido
- ❌ `sales_core_events` (deprecated, não sincronizar)
- ❌ `hotmart_sales` queries diretas (usar views)
- ❌ `order_items.offer_code` (sempre NULL — usar `provider_offer_id`)
- ❌ `order_items.funnel_id` direto (sempre NULL — usar via `offer_mappings`)
- ❌ `customer_paid_brl` sem COALESCE (sempre NULL para webhook)
