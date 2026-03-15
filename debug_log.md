# DEBUG LOG — Cubo Mágico

> Atualizado a cada passo da investigação/correção. Use este arquivo para retomar contexto em qualquer sessão futura.

---

## 📅 Última atualização
- **Data:** 2026-03-15 (sessão 6)
- **Status geral:** Race condition de coprodução corrigida ✅, CRM Transações fix ✅, pipeline filters fix ✅

---

### [2026-03-15] Backfill massivo ledger_events — ✅ CONCLUÍDO (sessão 6)
- **Descoberta:** 674 orders approved em 6 projetos sem ledger_events → ~R$130.000 invisíveis nos relatórios
- **Causas:** race condition coprodução + order_items abortava ledger + webhook legado (pré-sistema) + CO_PRODUCER (underscore) não tratado + USD sem currency_conversion
- **Resultado:** ~1.302 ledger_events criados, ledger_status='complete' em todas as orders afetadas
- **Zero stuck orders** após backfill (query confirma: total_ainda_stuck=0)
- 5 fases: BRL nativo, PRODUCER USD convertido, COPRODUCER USD convertido, CO_PRODUCER BRL, pré-sistema (producer_net)
- Migration: `20260315230000_backfill_ledger_events_approved_orders.sql`

### [2026-03-15] Desacoplamento order_items / ledger_events — ✅ CORRIGIDO (sessão 6)
- **Problema:** falha em `order_items` (constraint, timeout) abortava o webhook antes de criar ledger_events → pedido aprovado sumia dos relatórios silenciosamente.
- **Fix:** erro em `createOrderItemsFromWebhook` agora é non-fatal: logado em `result.itemsError` + warn no caller, execução continua para criação de ledger_events.
- Sem migration necessária — mudança apenas no código do webhook.

### [2026-03-15] Race condition coprodução em ledger_events — ✅ CORRIGIDO (sessão 6)
- **Causa raiz:** `UNIQUE(provider_event_id)` global em `ledger_events`. Produtos com coprodução disparam webhooks para 2 projetos (produtor + coprodutor) simultaneamente. Ambos geram `{txId}_platform_fee_platform`. O segundo a inserir recebia 23505 e abortava sem criar `sale_producer` → order sem ledger → invisível nos relatórios financeiros.
- **Fix 1 — Schema:** Migration `20260315220001` troca `UNIQUE(provider_event_id)` → `UNIQUE(order_id, provider_event_id)`. Cada projeto tem seu order_id, pode ter seus próprios eventos.
- **Fix 2 — Webhook:** Dedup check escopo ao `order_id` (.eq('order_id', orderId)). Evita falso positivo cross-project.
- **Fix 3 — Fallback:** Se `ledgerEventsToCreate` vazio + credit event + sem ledger existente → seta `orders.status = 'approved'` explicitamente (segurança extra).
- **Backfill:** HP3453704060 (projeto a59d30c7) — 2 ledger_events inseridos manualmente + `ledger_status = 'complete'`.
- **Outros 4 stuck orders:** São BILLET_PRINTED (status=pending, pagamento não confirmado) — correto não ter ledger.

### [2026-03-15] CRM aba Transações + pipeline filters — ✅ CORRIGIDO (sessão 6)
- `crm_orders_view` — coluna `currency` faltando → NOTIFY pgrst reload schema
- 5 orders stuck como `pending` → UPDATE manual para `approved` (4 BILLET_PRINTED + 1 PURCHASE_APPROVED)
- `KanbanFilters.tsx` + `CRMKanban.tsx` — `last_transaction_date` (campo fantasma) → `last_purchase_at` (coluna real DB)

### [2026-03-15] Deploy pendente + limpeza de infra — ✅ OK
- `git push origin main` — 7 commits publicados, Vercel auto-deploy triggerado
- `hotmart-webhook` redeploy via CLI — código morto de `writeSalesCoreEvent` removido
- 4 edge functions órfãs deletadas via CLI (`hotmart-backfill`, `hotmart-ledger-brl-backfill`, `hotmart-backfill-14d`, `csv-ledger-v21-import`)

### [2026-03-15] Migração CRM Journey para Orders Core — ✅ OK
- `useCRMJourneyData.ts`: substituiu 2 queries em `crm_transactions` (840 rows) por 1 query em `crm_journey_orders_view` (8.455 pedidos approved)
- Deriva `transactionsData` e `allTransactionsForBreakdown` via `useMemo` a partir de `ordersViewData`
- Funnel resolution corrigida: usa `funnel_id` direto do `order_items` (via view) em vez de resolver via `offer_mappings`
- 3 pontos de resolução atualizados: `entryFunnelId`, `tFunnelId` (targetFilter), `funnelId/funnelName` em purchases
- Interface de saída idêntica — `CustomerJourneyAnalysis.tsx` sem alterações
- TypeScript: sem erros; lint: sem novos warnings

### [2026-03-15] Auditoria crm_transactions — ✅ DECISÃO: MANTER
- 2.792 registros, still active (última inserção: 2026-03-15 20:45)
- Webhook Hotmart escreve nela para TODOS os status (ABANDONED, DELAYED, CANCELLED, PRINTED_BILLET, EXPIRED...)
- Trigger `detect_auto_recovery`: detecta clientes que cancelaram e voltaram a comprar → tag "Recuperado (auto)" + crm_activity
- `canonical_sale_events` view: usa crm_transactions para plataformas não-Hotmart
- Conclusão: propósito diferente de `orders` — log de eventos CRM vs registro financeiro

---

## ✅ Problema Original — RESOLVIDO

**Sintoma inicial:** Vendas aprovadas pela Hotmart existiam no banco mas não apareciam no front.
**Projeto:** `a59d30c7-1009-4aa2-b106-6826011466e9`

**Causa raiz confirmada e corrigida:**
- `order_items` falhava por falta de constraint UNIQUE → webhook abortava antes de criar `ledger_events`
- Views do funil fazem JOIN com `ledger_events` → vendas sem ledger sumiam do front

---

## 📊 Números finais (pipeline restaurado)

| Métrica | Valor |
|---|---|
| Total orders | 1.506 |
| Grupo A recuperado (webhook backfill) | 13/13 ✅ |
| Grupo B recuperado (CSV import) | 168/168 ✅ |
| Receita recuperada | R$ 8.178,18 |
| Orders sem ledger restantes | 0 (esperado) |

---

## 🏗️ Pipeline — Status Final

| Etapa | Status |
|---|---|
| Hotmart webhook chega | ✅ |
| `orders` criado | ✅ |
| `order_items` criado | ✅ Constraint UNIQUE adicionada |
| `ledger_events` criado | ✅ |
| Trigger de status | ✅ Recriado + migration commitada |
| Front exibe venda | ✅ |

---

## 📋 Histórico completo de correções

### [13/03] Constraint UNIQUE em order_items ✅
Migration: `20260311223407_add_order_items_order_product_offer_unique.sql` — **commitada** ✅

### [13/03] Fix hotmart-ledger-full-backfill ✅
`provider_transaction_id` → `provider_order_id`. Deploy OK.

### [13/03] Backfill Grupo A ✅
13 vendas (08-12/03). `ledgerCreated=136, errors=0`.

### [13/03] Trigger de status recriado ✅
`trigger_derive_order_status` — migration `20260313000000_derive_order_status_trigger.sql` **commitada** ✅
741 orders corrigidas: 705 approved | 72 pending | 23 cancelled | 1 refunded.

### [13/03] Fix item_type no webhook ✅
88 itens atualizados (82 main + 6 bump). Zero `unknown` restantes.
13 itens reclassificados de `main` → `bump` em ordens com múltiplos itens.

### [13/03] Fix visual modal de pedido ✅
`OrderDetailDialog.tsx` — prefixo "Oferta:" + `provider_offer_id` em pill monospace.

### [13/03] CLAUDE.md reescrito ✅
Arquitetura multi-tenant, ledger-first, edge functions, regras de atualização dos arquivos de log.

### [14/03] Sistema CSV Import v1 completo ✅
Edge function `provider-csv-import` v2 ACTIVE.
Parser browser-side, chunks de 200, deduplicação por `source_origin`.

### [14/03] CSV Import Safety — 3 camadas ✅
1. Validação cruzada de produtos (badge verde/amarelo/laranja)
2. Dialog de confirmação obrigatório
3. Revert atômico: `csv_import_batches` + `revert_csv_import_batch()` + edge function `provider-csv-import-revert` v1 ACTIVE

### [14/03] Fixes de estabilidade do CSV import ✅
- `parseBrNumber`: detecta formato decimal automaticamente (vírgula=BR, ponto=US)
- `invalidateQueries` ao finalizar import (botão "Desfazer" aparece automaticamente)
- Fix batch único (≤200 grupos) que ficava em status `importing`

### [14/03] Grupo B importado via CSV ✅
168 vendas (16/01-07/02) recuperadas. Pipeline 100% íntegro.

### [14/03] Menu Vendas → Histórico removido ✅
Redireciona para `/settings` com toast. Rota mantida no `App.tsx`.

---

## 🔄 Migração Analytics → Ledger-First (14/03 — sessão 2)

### Contexto crítico
Dois modelos paralelos existiam:
- **Novo (ledger-first):** `orders` + `order_items` + `ledger_events` — webhook + CSV import
- **Legado:** `sales_core_events` — usado por Funis, Busca Rápida, Análise Mensal, Insights

O webhook escrevia nos dois. O CSV import escrevia **só no novo**.
Vendas importadas via CSV **não apareciam nos Funis e Insights**.

### Views DB migradas ✅

| View | Antes | Depois |
|---|---|---|
| `funnel_revenue` | `sales_core_events` | `orders + order_items + offer_mappings` |
| `sales_daily` | `sales_core_events` | `orders` |
| `refunds_daily` | `sales_core_events` | `orders` |
| `revenue_daily` | `sales_core_events` | `orders` |
| `finance_tracking_view` | `sales_core_events + hotmart_sales` | `orders + order_items + funnels` |
| `sales_core_view` | `sales_core_events + hotmart_sales` | `orders + order_items + offer_mappings` |

### Hooks TS migrados ✅
- `useProjectOverview` — `sales_core_events` → `sales_core_view`
- `useRevenueSplits.useProductsForSplits` — `raw_payload` → `order_items`
- `useFinancialCore.useSalesCoreEvents` — `sales_core_events` → `sales_core_view`

### Fix crítico descoberto: `customer_paid_brl` sempre NULL ✅
O webhook popula `customer_paid` (moeda original, BRL para Hotmart BR) mas NUNCA `customer_paid_brl`.
Corrigido em todas as views com `COALESCE(customer_paid_brl, customer_paid)`.

### Bugs corrigidos em `funnel_orders_view` ✅
1. `customer_paid = customer_paid_brl` → sempre NULL → `COALESCE(customer_paid_brl, customer_paid)`
2. `funnel_id = oi.funnel_id` → sempre NULL → resolvido via JOIN `offer_mappings`
3. `main_offer_code = oi.offer_code` → sempre NULL → `oi.provider_offer_id`
4. `economic_day` sem timezone → `DATE(COALESCE(approved_at, ordered_at) AT TIME ZONE 'America/Sao_Paulo')`
5. Hook `useFunnelData`: status `'complete'` → `'completed'`

### Resultado atual
- Análise de Funil exibindo faturamento ✅
- Validação DB: 6.180 pedidos approved, R$731k gross, 3 funis

---

## 🔄 Migração finance_ledger_summary (14/03 — sessão 3)

### Problema identificado
`finance_ledger_summary` ainda lia de `finance_ledger` (tabela legada, 1.850 registros) com JOIN em `hotmart_sales` (840 registros) → apenas **693 matches**. Insights mostrava ~11% dos dados reais.

### Causa raiz
`hotmart_sales` é tabela legada. Novos webhooks e CSV imports escrevem apenas em `orders + order_items + ledger_events`. O JOIN em `hotmart_sales` excluía todos os pedidos sem registro nessa tabela.

### Fix aplicado
Migration `20260314213000_migrate_finance_ledger_summary_to_ledger_first.sql`:
- Substitui `finance_ledger + hotmart_sales` por `orders + ledger_events + order_items + offer_mappings`
- Mapeamento de `event_type` em `ledger_events`: `sale/credit/producer → producer_gross`, `platform_fee/tax → platform_cost`, `coproducer → coproducer_cost`, `refund/chargeback → refunds`
- Resultado: **693 → 6.255 pedidos APPROVED/COMPLETE**

### Validação de todos os módulos (DB)

| Módulo | View/Hook | Rows | Gross | Net |
|---|---|---|---|---|
| Dashboard | `revenue_daily` / `profit_daily` | 434 dias | R$731k | R$577k |
| Análise de Funil | `funnel_orders_view` | 6.245 pedidos | R$742k | — |
| Busca Rápida | `sales_core_view` (purchase) | 6.180 | R$731k | R$577k |
| Análise Mensal | `finance_tracking_view` (APPROVED) | 6.255 | R$743k | R$586k |
| Insights | `finance_ledger_summary` (APPROVED+COMPLETE) | 6.255 | R$599k¹ | R$515k |
| Visão Geral | `sales_core_view` | 6.180 | R$731k | R$577k |

¹ `producer_gross` = o que o produtor recebe da Hotmart (após taxas/coprodutor), diferente de `customer_paid`.

---

## 🗺️ Levantamento de Arquitetura de Funis (14/03 — sessão 3)

Documento completo salvo em `docs/FUNNEL_ARCHITECTURE.md`.

**Principais achados:**
- Views DB: `funnel_orders_view`, `funnel_revenue`, `funnel_spend`, `funnel_financials`, `funnel_financials_summary` — todas corretas e ledger-first ✅
- Hooks canonical: `useFunnelData`, `useFunnelFinancials`, `useFunnelAIContext` ✅
- `FunnelAnalysis.tsx` (página principal) — OK ✅

**Quebrado / legado identificado:**
- `useCRMJourneyData.ts` — usa `offer_code` (sempre NULL); deveria usar `provider_offer_id`
- `MonthlyRevenueDetailDialog.tsx` — query direta em `hotmart_sales` (840 de 6.180 pedidos)
- `CuboMagicoDashboard.tsx` — referencia `finance_tracking_view` em vez de `funnel_orders_view`
- `useMonthlyAnalysis.ts` — lê `finance_tracking_view` (não ledger-first direto)
- `FullDataSync`, `LaunchProductsSalesBreakdown`, `MetaROIDashboard`, `HotmartCSVImport` — queries em `hotmart_sales`

---

## ✅ Decommission de `sales_core_events` (14/03 — sessão 3)

**Concluído:**
1. `writeSalesCoreEvent()` removida do `hotmart-webhook/index.ts` — zero writes em `sales_core_events` por novo pedido
2. `hotmartToCanonicalEventType` e `FinancialBreakdown` interface removidos (eram exclusivos do SalesCore)
3. Migration `20260314_decommission_sales_core_events`: `DROP TABLE IF EXISTS sales_core_events CASCADE`
4. Edge functions removidas: `hotmart-backfill`, `hotmart-ledger-brl-backfill`, `hotmart-backfill-14d`, `csv-ledger-v21-import`
5. `HotmartBackfillSection.tsx` removido + imports limpos em `HotmartProviderSettings.tsx` e `index.ts`

**Validação:** zero queries ativas em `sales_core_events` no frontend e edge functions. Tabela não existe mais no DB.

---

---

## 🔄 Fixes de Funis (14/03 — sessão 4)

### Fix 1 — MonthlyRevenueDetailDialog.tsx ✅
- Era: query direta em `hotmart_sales` (840 de 6.180 pedidos)
- Fix: migrado para `finance_tracking_view` com `economic_day`, `gross_amount`, `hotmart_status`
- Agora: exibe todos os 6.255 pedidos APPROVED/COMPLETE

### Fix 2 — useCRMJourneyData.ts ⚠️ Adiado (sessão dedicada ao CRM)
- Spec dizia "offer_code sempre NULL em order_items" → diagnóstico parcialmente incorreto
- Hook lê de `crm_transactions` (840 registros de 6.180) — problema maior que o esperado
- `@deprecated` no hook; substituto `useCRMJourneyOrders` já existe
- `CustomerJourneyAnalysis.tsx` precisa migrar — tratar em sessão separada

### Fix 3 — useMonthlyAnalysis.ts ✅ (já estava correto)
- Spec baseada em análise desatualizada
- Hook já usa `finance_tracking_view` com `economic_day`, `gross_amount`, `hotmart_status` corretamente
- Nenhuma ação necessária

### Fix 4 — CuboMagicoDashboard.tsx ✅
- Spec dizia "usa finance_tracking_view diretamente" → incorreto
- Dashboard já recebe `salesData` via props de `useFunnelData` → `funnel_orders_view` ✅
- `offer_code` em `UnifiedSale` é `main_offer_code` da view = `provider_offer_id` — join correto
- Fix: apenas header comment atualizado (removida referência a `finance_tracking_view`)

---

## 🔎 Observações Técnicas

- `provider_order_map` está vazia — nenhum registro
- Constraints de 2 e 3 colunas em `order_items` coexistem (sem problema)
- `provider_event_log` NÃO tem coluna `order_id` — não usar para revert
- Webhook sempre vence CSV: `exists_webhook_ledger` → skip total
- `basic_auth` e `client_id` em `project_credentials` ainda em texto puro (só `client_secret` criptografado)
- `order_items.offer_code` nunca é populado — webhook usa `provider_offer_id`
- `order_items.funnel_id` nunca é populado — atribuição via `offer_mappings.funnel_id`
- `customer_paid_brl` nunca é populado pelo webhook — usar `COALESCE(customer_paid_brl, customer_paid)`
- `offer_mappings.codigo_oferta` = `order_items.provider_offer_id` (chave de join para funil)
