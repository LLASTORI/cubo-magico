# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 15/03/2026 — sessão 6

---

## 🚨 Emergência
> Nenhuma. Pipeline de vendas 100% restaurado. Race condition de coprodução corrigida. ✅

---

## 🟠 CRM — concluído (15/03/2026)

- [x] **Migrar `useCRMJourneyData` internals para Orders Core** (15/03/2026)
  - Substituiu queries em `crm_transactions` (840 rows) por `crm_journey_orders_view` (8.455 pedidos)
  - Interface de saída idêntica — `CustomerJourneyAnalysis.tsx` sem alterações
  - Funnel resolution agora usa `funnel_id` direto de `order_items`

- [x] **Auditoria `crm_transactions`** (15/03/2026) — **MANTER, NÃO DROPAR**
  - Ainda ativa: webhook escreve eventos de TODOS os status (ABANDONED, DELAYED, CANCELLED...)
  - Trigger `detect_auto_recovery` depende dela para detectar recuperação de clientes
  - `canonical_sale_events` view usa crm_transactions para plataformas não-Hotmart
  - Propósito: log de eventos CRM (todos os status) vs orders = registro financeiro (approved only)

---

## 🔵 Migração `hotmart_sales` — concluído (15/03/2026)

- [x] **`src/components/FullDataSync.tsx`** → `orders` (count + date range via ordered_at)
- [x] **`src/components/launch/LaunchProductsSalesBreakdown.tsx`** → `finance_tracking_view`
- [x] **`src/components/meta/MetaROIDashboard.tsx`** → `finance_tracking_view` (paid traffic: meta_campaign_id IS NOT NULL)
- [x] **`src/components/settings/HotmartCSVImport.tsx`** — mantido em hotmart_sales (atualiza campos de contato, não query financeira; tabela não será dropada)
- [x] **`src/pages/AnaliseMensal.tsx`** — já OK (usa useMonthlyAnalysis que não toca hotmart_sales)

---

## 🟡 Importante — Mas não urgente

- [x] **Correção estrutural: desacoplar `order_items` de `ledger_events` no webhook** (15/03/2026)
  - Erro em `createOrderItemsFromWebhook` agora é non-fatal (result.itemsError + warn, sem return)

- [x] **Segurança: criptografar `basic_auth` e `client_id` em `project_credentials`** (15/03/2026)
  - `basic_auth` já estava encriptado (migration anterior)
  - `client_id`: backfill 6 rows → client_id_encrypted, trigger atualizado, RPC atualizado
  - 0 campos sensíveis em plaintext em project_credentials ✅

- [ ] **Sync automático de ofertas Hotmart (cron semanal)**
  - Criar cron no Supabase → `hotmart-products` (action=sync-offers)
  - Exibir data do último sync na UI

- [x] **Criar alerta automático para orders sem ledger** (15/03/2026)
  - Edge function `orders-health-check` + cron diário 08:00 UTC
  - Registra em `system_health_log` com severity ok/warning/critical
  - Teste: severity=ok, affected_count=0 ✅

---

## 🟣 Evolução — Funis (planejamento futuro)

> Não implementar antes de terminar a limpeza do legado

- [ ] **Adicionar campo `funnel_model` na tabela `funnels`**
  - Valores: `perpetuo`, `lancamento`, `lancamento_pago`, `isca_oferta`, `quiz_oferta`, `formulario_oferta`

- [ ] **Wizard de criação de funil guiado**

- [ ] **IA Analista por modelo de funil**
  - Benchmarks por modelo + integração Meta Ads + Hotmart

---

## 🟢 Backlog futuro

- [ ] Fechar batches CSV em status `importing` há mais de 24h como `incomplete`
- [ ] Mover parsing do CSV para Web Worker
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção

---

## ✅ Concluído

### 🔔 Alerta automático orders sem ledger (15/03/2026 — sessão 7)
- [x] Edge function `orders-health-check` ACTIVE (v3)
- [x] `system_health_log` table + `v_orders_without_ledger` view
- [x] Cron `orders-health-check-daily` — 08:00 UTC via pg_cron + pg_net
- [x] Teste: severity=ok, affected_count=0

### 💰 Backfill massivo ledger_events (15/03/2026 — sessão 6)
- [x] 674 orders approved sem ledger em 6 projetos → ~R$130.000 recuperados nos relatórios
- [x] ~1.302 ledger_events criados (BRL nativo, USD convertido, CO_PRODUCER, pré-sistema)
- [x] Zero orders stuck após backfill
- [x] Migration `20260315230000_backfill_ledger_events_approved_orders.sql`

### 🔧 Fixes de pipeline (15/03/2026 — sessão 6)
- [x] Desacoplar order_items de ledger_events no webhook (non-fatal)
- [x] Race condition coprodução: UNIQUE(provider_event_id) global → UNIQUE(order_id, provider_event_id)
- [x] Webhook: dedup check escopo ao order_id
- [x] Webhook: fallback status approved quando ledger vazio + credit event

### 🐛 CRM fixes (15/03/2026 — sessão 6)
- [x] `UNIQUE(provider_event_id)` global → `UNIQUE(order_id, provider_event_id)` — fix para produtos com coprodução
- [x] Webhook: dedup check escopo ao `order_id` (evita falso positivo cross-project)
- [x] Webhook: fallback de status `approved` quando ledger vazio + credit event
- [x] Backfill HP3453704060 — 2 ledger_events + ledger_status=complete
- [x] CRM aba Transações — `crm_orders_view` currency fix + NOTIFY pgrst schema reload
- [x] CRM pipeline filters — `last_transaction_date` → `last_purchase_at` (campo real do DB)

### 🗂️ CRM Journey Migration (15/03/2026 — sessão 5)
- [x] Deploy bloco completo: git push (7 commits), hotmart-webhook redeploy, 4 edge functions órfãs deletadas
- [x] `useCRMJourneyData` internals migrados de `crm_transactions` → `crm_journey_orders_view` (Orders Core)
- [x] Auditoria `crm_transactions` — decisão: MANTER (log CRM + trigger detect_auto_recovery)

### 🔬 Fixes de Funis — FUNNEL_FIXES_SPEC.md (14/03/2026 — sessão 4)
- [x] Fix 1: `MonthlyRevenueDetailDialog.tsx` — migrado `hotmart_sales` → `finance_tracking_view` (6.255 pedidos)
- [x] Fix 2: `useCRMJourneyData.ts` — **adiado** (problema maior, sessão dedicada ao CRM)
- [x] Fix 3: `useMonthlyAnalysis.ts` — já estava correto (spec desatualizada)
- [x] Fix 4: `CuboMagicoDashboard.tsx` — já usava `funnel_orders_view` via props (fix só no header comment)

### 📊 Migração Analytics → Ledger-First (14/03/2026 — sessões 2-3)
- [x] Migration `finance_ledger_summary` → ledger-first (693 → 6.255 rows APPROVED/COMPLETE)
- [x] `finance_tracking_view`, `sales_core_view`, `funnel_revenue`, `funnel_orders_view` — todas corretas
- [x] Validação: Dashboard, Funil, Busca Rápida, Análise Mensal, Insights, Visão Geral — todos com dados completos
- [x] `FUNNEL_ARCHITECTURE.md` criado — mapa completo da arquitetura de funis

### 🗑️ Decommission de `sales_core_events` (14/03/2026 — sessão 3)
- [x] `writeSalesCoreEvent()` removida do `hotmart-webhook/index.ts`
- [x] `DROP TABLE IF EXISTS sales_core_events CASCADE` — migration aplicada
- [x] Edge functions removidas do repo: `hotmart-backfill`, `hotmart-ledger-brl-backfill`, `hotmart-backfill-14d`, `csv-ledger-v21-import`
- [x] `HotmartBackfillSection.tsx` removido

### 🔥 Pipeline de vendas restaurado (13-14/03/2026)
- [x] Causa raiz identificada e corrigida: constraint UNIQUE em `order_items`
- [x] Backfill Grupo A: 13 vendas recuperadas
- [x] Backfill Grupo B: 168 vendas recuperadas via CSV import
- [x] Trigger `trigger_derive_order_status` recriado + 741 orders corrigidas
- [x] **Receita recuperada: R$ 8.178,18** 🎉

### 📦 Sistema CSV Import (14/03/2026)
- [x] Edge function `provider-csv-import` v4 ACTIVE
- [x] CSV Import Safety: validação + dialog + revert atômico
- [x] Edge function `provider-csv-import-revert` v1 ACTIVE

### 🛠️ Infraestrutura
- [x] MCP Supabase, Playwright e Context7 instalados no Cursor
- [x] CLAUDE.md reescrito com arquitetura completa
