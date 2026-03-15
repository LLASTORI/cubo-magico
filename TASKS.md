# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 14/03/2026 — sessão 4

---

## 🚨 Emergência
> Nenhuma. Pipeline de vendas 100% restaurado. ✅

---

## 🔴 Deploy pendente — Próxima sessão começa aqui

> Código commitado mas **não deployado**. O front está desatualizado.

- [ ] **`git push origin main`** — 6 commits aguardando push
  - Vercel fará auto-deploy ao receber o push
  - Inclui: decommission `sales_core_events`, fix `MonthlyRevenueDetailDialog`, fix `CuboMagicoDashboard`

- [ ] **Redeploy `hotmart-webhook`** via CLI ou Cursor
  - `supabase functions deploy hotmart-webhook`
  - Hoje roda v31 (código antigo com `writeSalesCoreEvent` em try/catch)
  - Webhook está funcional (200s), mas tem código morto que tenta escrever em tabela dropada
  - **Não urgente** — não quebra vendas, só gera log de erro interno

- [ ] **Remover edge functions órfãs do Supabase** (deletadas localmente, ainda ACTIVE na plataforma)
  - `hotmart-backfill`, `hotmart-ledger-brl-backfill`, `hotmart-backfill-14d`, `csv-ledger-v21-import`
  - Via dashboard Supabase → Edge Functions → Delete
  - Não causam problema, são apenas lixo

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

## 🔵 Próximo projeto — Migrar componentes com `hotmart_sales`

> Ainda leem `hotmart_sales` (tabela legada, 840 de 6.180 pedidos)

- [ ] **`src/components/FullDataSync.tsx`**
- [ ] **`src/components/launch/LaunchProductsSalesBreakdown.tsx`**
- [ ] **`src/components/meta/MetaROIDashboard.tsx`**
- [ ] **`src/components/settings/HotmartCSVImport.tsx`**
- [ ] **`src/components/analise/AnaliseMensal.tsx`** — verificar se usa `useMonthlyAnalysis` corretamente

---

## 🟡 Importante — Mas não urgente

- [ ] **Correção estrutural: desacoplar `order_items` de `ledger_events` no webhook**
  - Falha em `order_items` não deve abortar criação do ledger
  - Refatorar `hotmart-webhook/index.ts` ~linha 844

- [ ] **Segurança: criptografar `basic_auth` e `client_id` em `project_credentials`**
  - Hoje só `client_secret` é criptografado
  - `basic_auth` = Base64(client_id:client_secret) em texto puro — risco real

- [ ] **Sync automático de ofertas Hotmart (cron semanal)**
  - Criar cron no Supabase → `hotmart-products` (action=sync-offers)
  - Exibir data do último sync na UI

- [ ] **Criar alerta automático para orders sem ledger**
  - Cron SQL simples ou trigger no Supabase

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
