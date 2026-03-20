# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 20/03/2026 (sessão 22)

---

## 🚨 Emergência
> Nenhuma. Pipeline 100% restaurado. ✅

---

## 🔴 Próxima sessão — Verificações pendentes

- [ ] **Verificar se comentários orgânicos aparecem no Social Listening**
  - Cron `social-listening-sync-30min` funcionando (401 corrigido na sessão 22)
  - Confirmar que posts e comentários estão sendo sincronizados no app
  - Se OK → investigar comentários de anúncios (ads) separadamente

- [ ] **Comentários de ads — Meta Graph API**
  - Podem requerer permissões adicionais na Meta Graph API
  - Investigar se `social-listening-cron` tem permissão para ler comentários de anúncios

- [ ] **Redesign visual da tabela UTM**
  - Colunas densas, nomes truncados — dificulta leitura
  - Melhoria de UX identificada na sessão 20

- [ ] **Oferta `qv8fq3lv` (Monaliza Krepe) sem funil**
  - 10 pedidos sem mapeamento de funil
  - Usuário deve decidir se entra em LANPG_MAR26 como OB

---

## 🔵 Onda 2 — Métricas de lançamento pago

> Aguardando planejamento com Claude.ai antes de implementar

- [ ] Passing diário (ritmo de vendas de ingresso vs meta)
- [ ] Comparecimento (show rate: ingressos vendidos vs presentes)
- [ ] Conversão por ticket do produto principal
- [ ] NPS e métricas do evento ao vivo
- [ ] ROAS calculado sobre receita total

---

## 🟣 Onda 3 — Evolução de Funis (futuro)

- [ ] Wizard de criação de funil guiado por modelo
- [ ] IA Analista por modelo (benchmarks por `funnel_model`)
- [ ] Métricas do corredor polonês (C1/C2/C3) via Meta Ads
- [ ] Métricas do lançamento meteórico via Evolution API
- [ ] Dashboard de assinatura/recorrência (MRR, Churn, LTV)

---

## 🟡 Importante — Mas não urgente

- [ ] `useLaunchData.ts` ainda referencia `hotmart_sales` — migrar
- [ ] `CRMRecovery.tsx` ainda referencia `hotmart_sales` — migrar
- [ ] Fechar batches CSV em status `importing` há mais de 24h como `incomplete`
- [ ] Validar todos os módulos após reconstrução (CRM, automações, mídia paga, quizzes)

---

## 🟢 Backlog técnico — Meta Ads / CAPI

- [ ] **FBP/FBC — Conversions API (CAPI) server-side**
  - Coletar `fbp` e `fbc` nas páginas de captura/checkout
  - Enviar evento `Purchase` via CAPI no `PURCHASE_APPROVED`
  - Fecha ciclo de atribuição server-side pós-iOS 14

- [ ] **Enriquecer localização dos contatos via dados do Hotmart**
  - Cruzar `orders` com `crm_contacts` para popular `city`, `state`, `country`, `cep`

## 🟢 Backlog técnico — Social Listening

- [ ] Comentários de ads (permissões Meta Graph API)
  - Investigar `ad_id` e `adset_id` dos comentários para cruzar com Meta Ads
  - Pode abrir análise: "qual criativo gera mais intenção de compra nos comentários?"

- [ ] Redesign visual tabela UTM (colunas densas)

## 🟢 Backlog futuro

- [ ] Mover parsing do CSV para Web Worker
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Decommission `useFinancialCore.ts:351` query em `hotmart_sales`

---

## ✅ Concluído

### 📡 Social Listening — cron 401 corrigido (20/03/2026 — sessão 22)
- [x] `social-listening-cron` v17 deployada com `verify_jwt: false` — auth check removido do handler
- [x] Cron `social-listening-sync-30min` agora executa sem 401

### 📊 Análise de Funil — fixes de dados (20/03/2026 — sessão 21)
- [x] `funnel_orders_view` corrigida: `customer_paid` BRL com OB ausente usa `SUM(base_price)` (migration `20260320180000`)
- [x] CAC card adicionado ao dashboard (Investimento ÷ Vendas FRONT)
- [x] Ícone ⓘ no filtro de datas explica `economic_day` = data de aprovação (±1 dia vs Hotmart para PIX)
- [x] 2 pedidos Monaliza Krepe ausentes do DB importados via CSV (HP2947589570 + HP0209993876C1)
- [x] HP0209993876C1: `customer_paid` corrigido R$17 → R$51, `producer_net_brl` R$14.32 → R$42.96
- [x] Investigado: 30 pedidos Monaliza Krepe (13-16/03) sem `ledger_events` — funil correto, gap apenas no ledger (sem ação necessária por ora)

### 📊 UTM Analysis — Status e Investimento (20/03/2026 — sessão 20)
- [x] `getSpendForUTM` e `getStatusForUTM` corrigidos para níveis Origem/Placement/Page
- [x] `drilldownData` passa array raw de vendas para funções de agregação

### 🔧 Funil Monaliza Krepe restaurado (20/03/2026 — sessão 20)
- [x] `offer_mappings` corrigido: `codigo_oferta` errado inativado, correto promovido para FRONT
- [x] 68 pedidos visíveis, R$1.742,50 restaurado

### 📡 Social Listening — cron registrado (20/03/2026 — sessão 20)
- [x] Migration `20260320120000` — `social-listening-sync-30min` registrado no pg_cron
- [x] Sincronização automática a cada 30 minutos para todos os projetos com páginas ativas

### 📊 Análise de Funil — múltiplos fixes (19/03/2026 — sessões 17-19)
- [x] Dedup view: `funnel_orders_view` reescrita com CTE — 74 linhas duplicadas removidas
- [x] `payment_method` adicionado à view e normalizado no frontend
- [x] OB/US/DS contagem corrigida via `all_offer_codes`
- [x] `offer_item_revenue_view` criada — receita exata por posição (base_price real)
- [x] Bruto vs Líquido implementado com aviso visual em modo líquido
- [x] `TemporalChart`, `PaymentMethodAnalysis`, `PeriodComparison` migrados para `gross_amount`/`economic_day`

### 🎨 Social Listening — 7 melhorias (17-18/03/2026 — sessões 13-15)
- [x] OpenAI como único provider (Lovable AI removido)
- [x] Configuração OpenAI no Admin via `platform_settings`
- [x] Fix `generate_reply` movido para antes do check de Meta credentials
- [x] Múltiplas melhorias de UI e estabilidade

### 🎯 Meta Audiences — Edição de Tags (17/03/2026 — sessão 12)
- [x] `MetaAudienceEditDialog` reescrito com edição completa de tags
- [x] Sync automático ao salvar

### 🏗️ Pipelines de Projeto (17/03/2026 — sessão 11)
- [x] Fix exclusão: 25+ tabelas adicionadas em ordem correta
- [x] Fix criação: trigger duplicado removido

### 🎯 Meta Audiences End-to-end (17/03/2026 — sessão 10)
- [x] 4.353 contatos sincronizados (100% email, 86% phone)
- [x] Schema expandido para 13 campos PII

### 🏷️ Tags de lançamento (16/03/2026 — sessão 9)
- [x] hotmart-webhook aplica `lançamento:NOME|LAUNCH_TAG`
- [x] survey-webhook propaga `launch_tag`

### 🧩 Onda 1: funnel_model (16/03/2026 — sessão 9)
- [x] Migration + UI + tipos TypeScript

### 🔥 Pipeline restaurado (13/03/2026)
- [x] Receita recuperada: R$ 8.178,18 🎉
