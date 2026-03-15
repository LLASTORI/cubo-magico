# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 14/03/2026 — sessão 3

---

## 🚨 Emergência
> Nenhuma. Pipeline de vendas 100% restaurado. ✅

---

## 🔴 Prioridade Alta — Correções de Funis (próxima sessão)

> Ver spec completo em `docs/FUNNEL_FIXES_SPEC.md`

- [x] **Fix `CuboMagicoDashboard.tsx` — migrar de `finance_tracking_view` para `funnel_orders_view`** ✅
  - Dashboard já usava `funnel_orders_view` via `useFunnelData` — dados corretos
  - `offer_code` em `UnifiedSale` é populado de `main_offer_code` (= `provider_offer_id`) — join funciona
  - Fix: comentário do header corrigido (removida referência a `finance_tracking_view`)

- [x] **Fix `MonthlyRevenueDetailDialog.tsx` — remover query em `hotmart_sales`** ✅
  - Migrado para `finance_tracking_view` com paginação — agora mostra todos os 6.255 registros

- [ ] **Fix `useCRMJourneyData.ts` — migrar CRM para ledger-first** ⚠️ Adiado — problema maior
  - `crm_transactions` tem apenas 840 de 6.180 pedidos (legado = hotmart_sales)
  - Hook já tem @deprecated; substituto é `useCRMJourneyOrders` (Orders Core)
  - `CustomerJourneyAnalysis.tsx` precisa migrar para `useCRMJourneyOrders`
  - Tratar em sessão dedicada ao CRM — tem muito mais para limpar lá

- [x] **Fix `useMonthlyAnalysis.ts` — já migrado** ✅
  - Hook já usava `finance_tracking_view` com `economic_day` + `gross_amount` corretos
  - Spec baseada em análise desatualizada — nenhuma ação necessária

---

## 🔵 Próximo projeto — Migração Analytics para ledger-first

> **Por que é importante:** vendas importadas via CSV não aparecem nos Funis, Análise Mensal e Insights enquanto esses módulos ainda lerem `sales_core_events` ou tabelas legadas.

- [ ] **Migrar `AnaliseMensal.tsx` para novos dados**
  - Depende do fix de `useMonthlyAnalysis.ts` acima

- [ ] **Migrar demais componentes com queries em `hotmart_sales`**
  - `src/components/FullDataSync.tsx`
  - `src/components/launch/LaunchProductsSalesBreakdown.tsx`
  - `src/components/meta/MetaROIDashboard.tsx`
  - `src/components/settings/HotmartCSVImport.tsx`

- [x] **Remover `writeSalesCoreEvent()` do webhook** ✅
- [x] **Decommission final de `sales_core_events`** ✅
  - Tabela dropada via migration
  - Edge functions `hotmart-backfill`, `hotmart-ledger-brl-backfill`, `hotmart-backfill-14d`, `csv-ledger-v21-import` removidas
  - `HotmartBackfillSection.tsx` removido

---

## 🟡 Importante — Mas não urgente

- [ ] **Correção estrutural: desacoplar `order_items` de `ledger_events` no webhook**
  - Falha em `order_items` não deve abortar criação do ledger
  - Refatorar `hotmart-webhook/index.ts` ~linha 844

- [ ] **Segurança: criptografar `basic_auth` e `client_id` em `project_credentials`**
  - Hoje só `client_secret` é criptografado
  - `basic_auth` = Base64(client_id:client_secret) em texto puro — risco real

- [ ] **Sync automático de ofertas Hotmart (cron semanal)**
  - Hoje sincronização é 100% manual
  - Criar cron no Supabase → `hotmart-products` (action=sync-offers)
  - Exibir data do último sync na UI

- [ ] **Criar alerta automático para orders sem ledger**
  - Cron SQL simples ou trigger no Supabase

- [ ] **Validar todos os módulos após reconstrução**
  - CRM, automações, mídia paga, quizzes

---

## 🟣 Evolução — Funis (planejamento futuro)

> Não implementar antes de terminar a limpeza do legado

- [ ] **Adicionar campo `funnel_model` na tabela `funnels`**
  - Valores: `perpetuo`, `lancamento`, `lancamento_pago`, `isca_oferta`, `quiz_oferta`, `formulario_oferta`
  - Base para wizard de criação guiado e análise por modelo

- [ ] **Wizard de criação de funil guiado**
  - Perguntas sobre a jornada do lead → Cubo monta a estrutura automaticamente
  - Cada modelo pré-define: fases, métricas alvo, tipos de campanha

- [ ] **IA Analista por modelo de funil**
  - Cada modelo tem benchmarks diferentes
  - "Seu CPL está 40% acima da média para lançamentos desse ticket"
  - Integra Meta Ads (antes da venda) + Hotmart (depois da venda)

---

## 🟢 Backlog futuro

- [ ] Fechar batches CSV em status `importing` há mais de 24h como `incomplete`
- [ ] Mover parsing do CSV para Web Worker
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Decommission da edge function `csv-ledger-v21-import`

---

## ✅ Concluído

### 🔥 Pipeline de vendas restaurado (13-14/03/2026)
- [x] Causa raiz identificada e corrigida: constraint UNIQUE em `order_items`
- [x] Migrations commitadas: `20260311223407` + `20260313000000`
- [x] Backfill Grupo A: 13 vendas recuperadas via webhook
- [x] Backfill Grupo B: 168 vendas recuperadas via CSV import
- [x] Trigger `trigger_derive_order_status` recriado + 741 orders corrigidas
- [x] Fix `item_type`: 88 itens atualizados, zero `unknown`
- [x] Fix visual modal de pedido
- [x] **Receita recuperada: R$ 8.178,18** 🎉

### 📦 Sistema CSV Import (14/03/2026)
- [x] Edge function `provider-csv-import` v2 ACTIVE
- [x] CSV Import Safety: validação + dialog + revert atômico
- [x] Edge function `provider-csv-import-revert` v1 ACTIVE
- [x] Menu Vendas → Histórico removido

### 🗺️ Arquitetura mapeada (14/03/2026)
- [x] `FUNNEL_ARCHITECTURE.md` criado — mapa completo de tabelas, views, hooks, componentes e problemas
- [x] CLAUDE.md reescrito com arquitetura completa e regras de migrations

### 🛠️ Infraestrutura
- [x] MCP Supabase, Playwright e Context7 instalados no Cursor
- [x] DEBUG_LOG.md e TASKS.md criados e mantidos em sincronia
