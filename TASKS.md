# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 16/03/2026

---

## 🚨 Emergência
> Nenhuma. Pipeline 100% restaurado. ✅

---

---

## 🔵 Onda 2 — Métricas específicas de lançamento pago (planejamento futuro)

> Não implementar antes da Onda 1 estar completa e validada

- [ ] Passing diário (ritmo de vendas de ingresso vs meta)
- [ ] Comparecimento (show rate: ingressos vendidos vs presentes no evento)
- [ ] Conversão por ticket do produto principal (benchmarks por faixa de preço)
- [ ] NPS e métricas do evento ao vivo
- [ ] ROAS calculado sobre receita total (ingresso + produto principal + OBs)

---

## 🟣 Onda 3 — Evolução de Funis (futuro)

- [ ] Wizard de criação de funil guiado por modelo
- [ ] IA Analista por modelo (benchmarks específicos por `funnel_model`)
- [ ] Métricas do lançamento meteórico via Evolution API (engajamento de grupo WhatsApp)
- [ ] Dashboard de assinatura/recorrência (MRR, Churn, LTV)

---

## 🟡 Importante — Mas não urgente

- [ ] `useLaunchData.ts` ainda referencia `hotmart_sales` — migrar (escopo separado)
- [ ] `CRMRecovery.tsx` ainda referencia `hotmart_sales` — migrar (escopo separado)
- [ ] Fechar batches CSV em status `importing` há mais de 24h como `incomplete`
- [ ] Validar todos os módulos após reconstrução (CRM, automações, mídia paga, quizzes)

---

## 🟢 Backlog futuro

- [ ] Mover parsing do CSV para Web Worker
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Decommission `useFinancialCore.ts:351` query em `hotmart_sales` (validação/comparação intencional — avaliar)

---

## ✅ Concluído

### 🧩 Onda 1: campo funnel_model (16/03/2026)
- [x] **Migration SQL** — `ADD COLUMN funnel_model text` nullable em `funnels` com CHECK constraint (9 valores)
- [x] **Tipos TypeScript** em `src/components/FunnelManager.tsx` — `FunnelModel` type, `FUNNEL_MODEL_LABELS`, `FUNNEL_MODEL_COLORS`, interface `Funnel` atualizada
- [x] **UI — FunnelManager.tsx** — Select de modelo no form de criação e edição; badge na listagem
- [x] **Regenerar tipos Supabase** — `funnel_model` aparece em funnels Row/Insert/Update
- [x] **Validar e commitar** — 31 funis existentes com `funnel_model=NULL`; migration commitada

### 🗺️ Planejamento de Funis (16/03/2026)
- [x] `FUNNEL_TYPE_AUDIT.md` — auditoria completa do sistema de tipos atual
- [x] `FUNNEL_MODELS.md` — documentação de todos os modelos de funil com métricas, benchmarks e jornadas
- [x] Decisão arquitetural: `funnel_model` como campo complementar (não substitui `funnel_type`)

### 📊 Analytics e Funis (15/03/2026)
- [x] UTM attribution corrigida — cruzamento Meta Ads × Hotmart funcionando
- [x] `useFunnelHealthMetrics` migrado para `crm_transactions`
- [x] Fix `item_type='unknown'` + fallback na `funnel_orders_view`
- [x] `client_id` criptografado em `project_credentials`
- [x] Sync automático de ofertas Hotmart (cron semanal)
- [x] Alerta automático orders sem ledger (cron diário)
- [x] Race condition coprodução corrigida
- [x] Backfill 674 orders → ~R$130.000 recuperados

### 📦 CSV Import + Analytics (14/03/2026)
- [x] CSV Import Safety completo (validação + dialog + revert atômico)
- [x] `finance_ledger_summary` migrada: 693 → 6.255 pedidos
- [x] `sales_core_events` dropada + legado removido
- [x] Grupo B: 168 vendas (R$8.178,18) recuperadas

### 🔥 Pipeline restaurado (13/03/2026)
- [x] Constraint UNIQUE em `order_items` adicionada e commitada
- [x] Trigger `trigger_derive_order_status` recriado e commitada
- [x] Grupo A: 13 vendas recuperadas
- [x] **Receita total recuperada: R$ 8.178,18** 🎉

### 🛠️ Infraestrutura
- [x] MCP Supabase, Playwright e Context7 instalados no Cursor
- [x] CLAUDE.md reescrito com arquitetura completa e regras de migrations
- [x] DEBUG_LOG.md, TASKS.md e FUNNEL_MODELS.md criados e mantidos em sincronia
