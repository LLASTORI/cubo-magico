# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 17/03/2026 (sessão 13 — Social Listening desbloqueado e analisado, melhorias priorizadas)

---

## 🚨 Emergência
> Nenhuma. Pipeline 100% restaurado. ✅

---

## 🔴 Social Listening — Melhorias Priorizadas (próxima sessão)

> Sistema desbloqueado (sessão 13). Análise completa concluída. 15+ problemas mapeados.

### Quick wins (alta ROI, baixo esforço)
- [ ] **Conectar custom categories ao prompt da IA** — campo `ai_knowledge_base.custom_categories` existe mas nunca vai no prompt (`buildClassificationPrompt` usa hardcoded 9 categorias)
- [ ] **Conectar FAQs ao prompt da IA** — `ai_knowledge_base.faqs` carregado mas ignorado nos prompts de classificação e geração de resposta
- [ ] **Corrigir praise keywords para comentários >25 chars** — limite hardcoded impede classificação keyword de comments maiores que têm praise óbvio, enviando desnecessariamente para IA
- [ ] **Atualizar `last_synced_at` após sync** — campo existe em `social_listening_pages` mas nunca é gravado após sync de comentários

### Médio prazo
- [ ] **Linking CRM para Facebook** — `linkExistingCommentsToCRM` só processa Instagram (linha 854). Facebook comments têm `from.name` e `from.id` — cruzar com `crm_contacts.name` ou `buyer_name` em `orders`
- [ ] **Linking CRM contínuo** — rodar linking automático no batch-upsert de comentários (já temos o `crmContactMap` pré-carregado — só expandir para Facebook)
- [ ] **Envio de resposta via Meta Graph API** — endpoint `POST /{commentId}/replies` com `message` body — elimina copy-paste manual. Requer `manage_pages` permission. Preencher `reply_sent_at` e `replied_by` após envio.

### Backlog técnico
- [ ] **Detectar e marcar comentários deletados no Meta** — no sync, checar se IDs existentes no DB ainda retornam da API; se não, setar `is_deleted=true`
- [ ] **Soft-delete ao invés de orphans** — comentários removidos no Meta devem ser marcados `is_deleted=true` não ignorados
- [ ] **Limite de posts configurável** — 100 posts/plataforma hardcoded; expor como configuração por projeto
- [ ] **OpenAI como provider padrão** — batch de 15 comentários/request é 15x mais eficiente que Lovable (1/request); sugerir preferência OpenAI quando key disponível
- [ ] **`manually_classified=true` impede re-classificação automática** — hoje o campo existe mas não é verificado no `processCommentsWithAI`; adicionar filtro `.eq('manually_classified', false)` na query de pendentes

---

## 🔴 Próxima sessão alternativa — Onda 2: métricas de lançamento pago

> Onda 1 concluída e publicada ✅ — Onda 2 aguardando priorização

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

## 🟢 Backlog futuro — Meta Ads / CAPI

- [ ] **FBP/FBC — Conversions API (CAPI) server-side**
  - Coletar `fbp` e `fbc` nas páginas de captura/checkout (via pixel Meta ou parâmetro `fbclid` na URL)
  - Passar esses valores pelo survey-webhook/quiz até o banco (`crm_contacts.fbp`, `crm_contacts.fbc`)
  - Implementar envio de evento `Purchase` via CAPI quando `PURCHASE_APPROVED` chega no hotmart-webhook
  - **Por que importa:** fecha o ciclo de atribuição server-side, especialmente pós-iOS 14. É o recurso que mais melhora atribuição no Meta hoje.
  - **Pré-requisito:** definir como coletar FBP/FBC nas landing pages (pixel JS ou parâmetro de URL)

- [ ] **Enriquecer localização dos contatos via dados do Hotmart**
  - ~10% dos contatos têm cidade/estado; pedidos Hotmart têm endereço do comprador
  - Cruzar `orders` com `crm_contacts` para popular `city`, `state`, `country`, `cep` onde estão nulos
  - Pode ser feito via backfill SQL + hotmart-webhook ao receber novos pedidos

## 🟢 Backlog futuro

- [ ] Mover parsing do CSV para Web Worker
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Decommission `useFinancialCore.ts:351` query em `hotmart_sales` (validação/comparação intencional — avaliar)

---

## ✅ Concluído

### 🎯 Meta Audiences — Edição de Tags (17/03/2026)
- [x] `MetaAudienceEditDialog` reescrito com edição completa de tags (add/remove via checkbox list)
- [x] Busca de tags, botões "Adicionar Todas" / "Remover Todas", operador AND/OR, estimated size em tempo real
- [x] Ao salvar: atualiza `segment_config` + dispara sync automático no Meta Ads
- [x] `MetaAudiencesTab` passa `availableTags`, `tagsLoading`, `refetchTags` para o dialog de edição

### 🔍 MetaAccountsManager — act_ID + Filtro (17/03/2026)
- [x] act_ID exibido em `font-mono` na seção "Contas disponíveis"
- [x] Filtro de busca por nome ou act_ID adicionado (accent-insensitive)

### 🏗️ Pipelines de Projeto — Criação e Exclusão (17/03/2026)
- [x] Fix exclusão: 25+ tabelas faltantes adicionadas em ordem topológica correta (`orders` antes de `crm_contacts`, `meta_audience_contacts` via handler especial, etc.)
- [x] Fix exclusão: `meta_audience_contacts` (sem `project_id`) — handler dedicado via lookup por `audience_id`
- [x] Fix criação: trigger duplicado `on_project_created` removido — causava UNIQUE violation em `project_members` no segundo AFTER INSERT
- [x] `handle_new_project()` atualizado com `ON CONFLICT DO NOTHING` como guard defensivo
- [x] Migration `20260317010000_fix_duplicate_project_triggers.sql` commitada
- [x] Edge function `delete-project` deployada (v17)

### 🎯 Meta Audiences — End-to-end (17/03/2026)
- [x] Fix 500 na criação de público (UUID vs string Meta mismatch no ad_account_id)
- [x] Schema expandido para 13 campos PII (EMAIL, PHONE, FN, LN, CT, ST, ZIP, COUNTRY, GEN, DOBY, DOBM, DOBD, EXTERN_ID)
- [x] `gender` e `birth_date` adicionados a `crm_contacts`
- [x] UNIQUE constraint `(audience_id, contact_id)` em `meta_audience_contacts` — fix do sync silencioso
- [x] Sync verificado: 4.353 contatos gravados (100% email, 86% phone)

### 🏷️ Sistema de Tags — Fix lançamento (16/03/2026)
- [x] **Auditoria** — `docs/TAGS_AUDIT.md` com 3 gaps identificados
- [x] **survey-webhook** — propaga `launch_tag` do funil para `crm_contact_interactions` (commit c30da12)
- [x] **hotmart-webhook** — aplica tag `lançamento:NOME|LAUNCH_TAG` em `crm_contacts.tags` no PURCHASE_APPROVED (commit 330fb2a)
- [x] Ambas edge functions deployadas em produção

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
