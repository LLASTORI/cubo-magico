# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 14/03/2026 — sessão 2

---

## 🚨 Emergência
> Nenhuma. Pipeline de vendas 100% restaurado. ✅

---

## 🔵 Em andamento — Migração Analytics + Validação de Módulos

> **Status:** Views DB migradas ✅ | Hooks TS migrados ✅ | Funis mostrando faturamento ✅
> **Próximo:** Validar todos os módulos e fechar o decommission de `sales_core_events`

### Validação de módulos no front
- [ ] **Dashboard** — verificar KPIs, gráficos de receita e spend
- [ ] **Análise de Funil** — posições de oferta, bump/upsell rate, ROAS, CPA (faturamento já aparece ✅)
- [ ] **Busca Rápida** (`useSalesCore` → `sales_core_view`) — pesquisa e paginação funcionando
- [ ] **Análise Mensal** (`useMonthlyAnalysis` → `finance_tracking_view`) — valores corretos
- [ ] **Insights** (`useFinanceLedger`) — verificar se lê views migradas ou ainda legado
- [ ] **Visão Geral do Projeto** (`useProjectOverview`) — métricas e categorias

### Fechar decommission de `sales_core_events`
- [ ] **Remover `writeSalesCoreEvent()`** do webhook
  - Função em `hotmart-webhook/index.ts` (~linha 1539)
  - Só remover após validação de todos os módulos acima
- [ ] **Decommission final de `sales_core_events`**
  - Migration de drop da tabela
  - Remover edge functions `hotmart-backfill` e `hotmart-ledger-brl-backfill`
  - Remover `HotmartBackfillSection.tsx`
  - Remover edge function `csv-ledger-v21-import` (antiga)

---

## 🟡 Importante — Mas não urgente

- [ ] **Segurança: criptografar `basic_auth` e `client_id` em `project_credentials`**
  - Hoje só `client_secret` é criptografado
  - `basic_auth` = Base64(client_id:client_secret) em texto puro — risco real

- [ ] **Correção estrutural: desacoplar `order_items` de `ledger_events` no webhook**
  - Falha em `order_items` não deve mais abortar criação do ledger
  - Refatorar `hotmart-webhook/index.ts` ~linha 844

- [ ] **Sync automático de ofertas Hotmart (cron semanal)**
  - Hoje sincronização é 100% manual
  - Criar cron no Supabase → `hotmart-products` (action=sync-offers)
  - Exibir data do último sync na UI

- [ ] **Criar alerta automático para orders sem ledger**
  - Cron SQL simples ou trigger no Supabase
  - Detectar divergência antes que vire problema novamente

- [ ] **Validar CRM, automações, mídia paga, quizzes**
  - Confirmar que nenhum foi afetado pelas migrations recentes

---

## 🟢 Backlog futuro

- [ ] Fechar batches CSV em status `importing` há mais de 24h como `incomplete` (cron ou trigger)
- [ ] Mover parsing do CSV para Web Worker (elimina freeze da UI em arquivos grandes)
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Revisar e otimizar Edge Functions após estabilização

---

## ✅ Concluído

### 🔥 Pipeline de vendas restaurado (13-14/03/2026)
- [x] Causa raiz identificada: constraint UNIQUE ausente em `order_items`
- [x] Constraint UNIQUE adicionada — migration commitada ✅
- [x] Trigger `trigger_derive_order_status` recriado — migration commitada ✅
- [x] Backfill Grupo A: 13 vendas (08-12/03) recuperadas via webhook
- [x] Backfill de status: 741 orders corrigidas
- [x] Fix `item_type`: 88 itens atualizados, zero `unknown`
- [x] Fix visual modal de pedido (label "Oferta:" + pill com código)
- [x] CLAUDE.md reescrito com arquitetura completa
- [x] Grupo B: 168 vendas (16/01-07/02) recuperadas via CSV import ✅
- [x] **Receita total recuperada: R$ 8.178,18** 🎉

### 📦 Sistema CSV Import (14/03/2026)
- [x] Edge function `provider-csv-import` v2 ACTIVE
- [x] Parser browser-side com detecção automática de formato BR/US
- [x] CSV Import Safety: validação cruzada + dialog + revert atômico
- [x] Edge function `provider-csv-import-revert` v1 ACTIVE
- [x] `CsvImportHistory` com botão "Desfazer" (owner/manager)
- [x] Menu Vendas → Histórico removido

### 📊 Migração Analytics → Ledger-First (14/03/2026 — sessão 2)
- [x] `funnel_revenue` migrada para `orders + order_items + offer_mappings`
- [x] `sales_daily` migrada para `orders`
- [x] `refunds_daily` migrada para `orders`
- [x] `revenue_daily` migrada para `orders`
- [x] `finance_tracking_view` migrada para `orders + order_items + funnels`
- [x] `sales_core_view` migrada para `orders + order_items + offer_mappings`
- [x] `funnel_orders_view` corrigida: `customer_paid`, `funnel_id`, `main_offer_code`, timezone
- [x] Fix `COALESCE(customer_paid_brl, customer_paid)` em todas as views
- [x] `useProjectOverview` → `sales_core_view`
- [x] `useRevenueSplits.useProductsForSplits` → `order_items`
- [x] `useFinancialCore.useSalesCoreEvents` → `sales_core_view`
- [x] `useFunnelData`: status `'complete'` → `'completed'`
- [x] Zero queries em `sales_core_events` no frontend ✅
- [x] Análise de Funil exibindo faturamento ✅

### 🛠️ Infraestrutura
- [x] MCP Supabase instalado no Cursor
- [x] MCP Playwright instalado no Cursor
- [x] MCP Context7 instalado no Cursor
- [x] DEBUG_LOG.md e TASKS.md criados e mantidos em sincronia

---

## 📋 Como usar este arquivo

1. **Priorizar aqui** — conversar com Claude.ai para decidir o que atacar
2. **Executar no Cursor** — levar a tarefa escolhida pro agente
3. **Atualizar** — trazer os arquivos atualizados do projeto para o Claude.ai sincronizar
