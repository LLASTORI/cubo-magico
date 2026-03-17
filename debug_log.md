# DEBUG LOG — Cubo Mágico

> Atualizado a cada passo da investigação/correção. Use este arquivo para retomar contexto em qualquer sessão futura.

---

## 📅 Última atualização
- **Data:** 2026-03-17 (sessão 13)
- **Status geral:** Pipeline restaurado ✅ | Social Listening desbloqueado e analisado ✅ | CSV Import cards financeiros corrigidos ✅ | Próximo passo: melhorias priorizadas no Social Listening (ver TASKS.md)

---

### [2026-03-17] Social Listening — desbloqueio completo e análise aprofundada — ✅ CONCLUÍDO (sessão 13)

**Bugs corrigidos (commits fc576e9, 7b88e9c):**

1. **CSV Import — cards financeiros zerados (Busca Rápida)**
   - Root cause 1: `isProjectProducer()` em `useOrdersCore.ts` retornava `false` quando `raw_payload` era null (pedidos CSV). Fix: fallback para `true` quando sem dados de commission.
   - Root cause 2: `order-writer.ts` não persistia `platform_fee_brl`, `affiliate_brl`, `coproducer_brl` no insert. Fix: adicionados 3 campos ao INSERT com `reduce()` sobre `group.items`.
   - Migrations aplicadas: `fix_csv_orders_financial_fields` (recalculou de `ledger_events` WHERE `source_origin='csv'`) + `fix_all_orders_financial_fields_from_ledger` (corrigiu todos os orders com NULL via ledger_events).

2. **Social Listening — schema mismatch (colunas ausentes)**
   - Root cause: migration `20260310103000` foi registrada como aplicada mas as colunas (`post_id_meta`, `last_synced_at`, `is_ad`, `comment_id_meta`, `ai_processing_status`, etc.) NÃO existiam nas tabelas.
   - Fix: migration `reapply_social_listening_compat_columns` aplicada — adicionou todas as colunas faltantes.

3. **Social Listening — FK ambiguity PostgREST (lista vazia)**
   - Root cause 1: Duas FKs de `social_comments` para `crm_contacts` (`contact_id_fkey` + `crm_contact_id_fkey`) → PostgREST retornava 400 FK ambiguity → React Query falhou 3x e parou (error state silencioso).
   - Fix: `fix_social_comments_crm_fk_ambiguity` — dropou `social_comments_crm_contact_id_fkey`.
   - Fix adicional: `useSocialListening.ts` passou a usar hint explícito `crm_contacts!contact_id(...)`.

4. **Social Listening — timeout 546 no sync de comentários (N+1 queries)**
   - Root cause: `upsertComment()` fazia 3 queries sequenciais por comentário (CRM lookup, pages lookup, upsert). 752 comentários × 3 = 2.256 queries → 150s timeout.
   - Fix: `syncComments()` refatorado — pré-carrega pages + CRM contacts uma vez (2 queries paralelas), constrói rows em memória com `buildCommentRow()`, batch-upsert em chunks de 200.
   - Fix adicional: `buildCommentRow()` + `linkExistingCommentsToCRM()` agora salvam `contact_id` (coluna com FK) além de `crm_contact_id` → CRM join via PostgREST passa a funcionar.

5. **Schema reload PostgREST**
   - `NOTIFY pgrst, 'reload schema'` executado para forçar recarregamento do cache após drops de FK.

**Análise completa do sistema Social Listening:**
- 1.764 linhas na edge function `social-comments-api`
- Sync: posts orgânicos (50/plataforma) + comentários (25 posts mais recentes) + ads
- Classificação: keyword grátis (~40%) → Lovable AI/OpenAI (~60%)
- Modelos: Gemini 2.5 Flash (via Lovable gateway) e gpt-4o-mini
- Quotas: 100/dia, 3000/mês, 1000 Lovable credits por projeto
- 15+ problemas mapeados — ver TASKS.md para backlog priorizado

---

### [2026-03-17] Meta Audiences — edição de tags em públicos existentes — ✅ CONCLUÍDO (sessão 12)
- **Problema:** Dialog de edição só permitia alterar nome e frequência. Para mudar tags, precisava excluir e recriar o público.
- **Fix:** `MetaAudienceEditDialog` reescrito com UI completa de tags: checkbox list com busca, badges de tags selecionadas (clique para remover), botões "Adicionar Todas"/"Remover Todas", operador AND/OR condicional, tamanho estimado em tempo real (debounced 300ms).
- **Fluxo ao salvar:** `updateAudience` atualiza `segment_config` + `estimated_size` no banco → se tags mudaram, dispara `syncAudience` imediatamente → Meta Ads recebe lista atualizada (adições e remoções).
- **Backend:** edge function `meta-audience-api` action `update_audience` já suportava `segmentConfig` — nenhuma mudança necessária na edge function.
- **Commit:** 9d5d57e

---

### [2026-03-17] MetaAccountsManager — act_ID visível + filtro em Contas disponíveis — ✅ CONCLUÍDO (sessão 11)
- **Problema 1:** Seção "Contas disponíveis" mostrava só o nome (`acc.name`), sem o `act_ID`.
- **Problema 2:** Filtro de busca inexistente nessa seção (havia filtro só nas contas salvas).
- **Diagnóstico:** Componente correto era `MetaAccountsManager.tsx`, não `MetaAccountSelector.tsx` (que é um dialog diferente).
- **Fix:** `act_ID` exibido em `font-mono` abaixo do nome; filtro `availableSearch` adicionado com normalização NFD (accent-insensitive); `newAccounts` migrado para `useMemo`.
- **Commits:** 91293e5, 780804d

---

### [2026-03-17] Criação e exclusão de projetos — pipelines corrigidos — ✅ CONCLUÍDO (sessão 11)

**Exclusão (delete-project edge function):**
- **Root cause:** `orders.contact_id → crm_contacts NO ACTION` — `orders` não estava na lista de deleção, então ao deletar `crm_contacts` o PostgreSQL bloqueava com constraint violation → HTTP 500.
- **Root cause 2:** `meta_audience_contacts` (sem `project_id`) não estava na lista → bloqueava deleção de `meta_ad_audiences`.
- **Fix:** Adicionadas ~25 tabelas faltantes na ordem correta. `meta_audience_contacts` recebeu handler especial (lookup por `audience_id` em vez de `project_id`). Edge function deployada (v17).
- **Tabelas críticas adicionadas:** `orders`, `order_items`, `ledger_events`, `provider_order_map`, `meta_audience_contacts` (especial), `meta_audience_sync_logs`, `meta_lookalike_audiences`, `quiz_*`, `path_events`, `personalization_*`, `recommendation_logs`, `agent_decisions_log`, `notifications`, `subscriptions`, `project_settings`, `project_tracking_settings`, `integration_*`, `ai_agents`, `whatsapp_contact_notes/messages/quick_replies`, `hotmart_backfill_runs`, `hotmart_product_plans`, `ledger_import_batches`, `ledger_official`, `finance_ledger`, `finance_sync_runs`, e outros.

**Criação (trigger duplicado em projects):**
- **Root cause:** Dois triggers AFTER INSERT idênticos na tabela `projects` — `on_project_created` e `trg_handle_new_project` — ambos chamavam `handle_new_project()`. O segundo INSERT em `project_members(project_id, user_id, 'owner')` violava a UNIQUE constraint `(project_id, user_id)`, fazendo rollback da criação inteira.
- **Root cause 2:** Dois triggers BEFORE INSERT idênticos — `trigger_generate_project_public_code` e `trg_generate_public_code` — benignos (segundo é no-op por `IF NULL`), mas indicam histórico de migrations sobrepostas.
- **Fix:** Migration `20260317010000` dropa `on_project_created` e `trigger_generate_project_public_code`. `handle_new_project()` atualizado com `ON CONFLICT (project_id, user_id) DO NOTHING` como guard defensivo.

---

### [2026-03-17] Meta Audiences — end-to-end funcionando — ✅ CONCLUÍDO (sessão 10)
- **Root cause 1 (500 na criação):** `meta_ad_audiences.ad_account_id` é UUID (FK), frontend enviava string Meta `act_XXX`. Fix: edge function normaliza `act_XXX` → lookup em `meta_ad_accounts` por `account_id` → resolve UUID para insert.
- **Root cause 2 (sync sem gravar contatos):** `meta_audience_contacts` não tinha UNIQUE constraint em `(audience_id, contact_id)`. O upsert com `onConflict` era rejeitado silenciosamente pelo PostgREST. Fix: migration `20260317001500` adicionou o constraint.
- **Schema expandido para 13 campos PII:** EMAIL, PHONE, FN, LN, CT, ST, ZIP, COUNTRY, GEN, DOBY, DOBM, DOBD, EXTERN_ID — máximo match rate no Meta.
- **Campos adicionados ao CRM:** `gender` e `birth_date` em `crm_contacts` (migrations 20260316210000 e 20260316220000).
- **Resultado verificado:** público "COMPRADORES CM | CUBO MÁGICO" criado com `meta_audience_id` real. Sync: 4.353 contatos gravados em `meta_audience_contacts` (100% com email_hash, 86% com phone_hash).
- **Commits:** e00edd1, 1b87b54, 2340025, 75a4252

---

### [2026-03-16] Fix sistema de tags — lançamento:NOME|LAUNCH_TAG — ✅ CONCLUÍDO (sessão 9)
- **Gap 1 (hotmart-webhook):** bloco não-bloqueante inserido após automation engine (commit 330fb2a). Ao receber `PURCHASE_APPROVED`, busca `offer_mappings → funnels`. Se `funnel_type='lancamento'` e `launch_tag IS NOT NULL`, aplica tag `lançamento:NOME|LAUNCH_TAG` em `crm_contacts.tags` (merge idempotente, sem duplicatas).
- **Gap 2 (survey-webhook):** variável `funnelLaunchTag` adicionada; select do funil inclui `launch_tag`; interações inseridas em `crm_contact_interactions` passam a ter `launch_tag` populado (commit c30da12).
- Zero breaking change: lógica não-bloqueante, não altera perpétuos, não remove tags existentes.
- Deploy: ambas edge functions deployadas em `mqaygpnfjuyslnxpvipa`.

---

### [2026-03-16] Auditoria sistema de tags — ✅ CONCLUÍDO (sessão 9)
- `crm_contacts.tags` (`text[]` + GIN index) funciona bem — populado por surveys, crm-webhook e automações
- `launch_tag` é campo órfão: definido em `funnels` e `crm_contact_interactions`, mas nunca preenchido automaticamente pelo hotmart-webhook
- **Gap 1:** Hotmart webhook não aplica `launch_tag` ao contato quando uma venda ocorre em lançamento
- **Gap 2:** survey-webhook não propaga `launch_tag` do funil para `crm_contact_interactions`
- **Gap 3:** Meta Audience API só lê `crm_contacts.tags`, não enxerga `crm_contact_interactions.launch_tag`
- **Correção de menor risco:** survey-webhook (~5 linhas). Maior impacto: hotmart-webhook aplicar tag com prefixo `lancamento:` no array `tags` resolve gaps 1 e 3 juntos
- Artefato: `docs/TAGS_AUDIT.md`

---

### [2026-03-16] Onda 1: campo funnel_model — ✅ CONCLUÍDO (sessão 9)
- Migration `20260316125658_add_funnel_model.sql` aplicada e commitada
- CHECK constraint com 9 valores: perpetuo, meteorico, lancamento, lancamento_pago, lancamento_interno, webinar, assinatura, high_ticket, custom
- Nullable — zero breaking change em funnels existentes (funnel_model=NULL para todos)
- `FunnelManager.tsx`: FunnelModel type, FUNNEL_MODEL_LABELS, FUNNEL_MODEL_COLORS, interface Funnel atualizada
- UI: Select de modelo no form de criação e inline edit; badge condicional na listagem
- Tipos Supabase regenerados — funnel_model aparece em funnels Row/Insert/Update

---

### [2026-03-16] Auditoria sistema de tipos de funil — ✅ CONCLUÍDO (sessão 9)
- `funnels.funnel_type` já existe com CHECK (`perpetuo`, `lancamento`, `indefinido`) desde migration `20251210123712`
- Colunas satélite para lançamento: `launch_start_date`, `launch_end_date`, `has_fixed_dates`, `launch_tag`
- Tabelas satélite: `launch_phases`, `phase_campaigns`, `launch_products`, `crm_contact_interactions`
- Dashboard por rota: `/funis` → `useFunnelData` (filtra variantes de 'perpetuo') | `/lancamentos` → `useLaunchData` (filtra 'lancamento' exato)
- `funnel-ai-analysis` prompt hardcoded para perpétuos — não recebe `funnel_type` como parâmetro
- Artefato: `docs/FUNNEL_TYPE_AUDIT.md` + `docs/FUNNEL_MODELS.md`

---

### [2026-03-15] UTM Attribution + Fix item_type + useFunnelHealthMetrics — ✅ CONCLUÍDO (sessão 8)
- `funnel_orders_view` recriada com campos UTM
- `useFunnelData.ts` adapter passa UTMs reais
- `UTMAnalysis.tsx` revenue usa `gross_amount` (canônico)
- Backfill `item_type='unknown'` → 88 itens corrigidos; fallback na view
- `useFunnelHealthMetrics` migrado de `hotmart_sales` → `crm_transactions`
- Migration: `20260315280000_backfill_order_items_type_and_main_offer_fallback.sql` ✅

---

### [2026-03-15] Infraestrutura e segurança — ✅ CONCLUÍDO (sessão 7)
- `hotmart-offers-cron` ACTIVE — sync semanal segunda 07:00 UTC
- `orders-health-check` ACTIVE — alerta diário 08:00 UTC
- `client_id` criptografado em `project_credentials`
- Race condition coprodução corrigida: `UNIQUE(order_id, provider_event_id)`
- Backfill 674 orders → ~R$130.000 recuperados nos relatórios

---

### [2026-03-15] CRM e pipeline — ✅ CONCLUÍDO (sessões 5-6)
- `useCRMJourneyData` migrado para `crm_journey_orders_view` (8.455 pedidos)
- `crm_transactions` mantida (log de eventos CRM + trigger detect_auto_recovery)
- CRM aba Transações + pipeline filters corrigidos

---

### [2026-03-14] Analytics ledger-first + decommission legado — ✅ CONCLUÍDO (sessões 2-4)
- `finance_ledger_summary` migrada: 693 → 6.255 pedidos
- `sales_core_events` dropada + edge functions legadas removidas
- CSV Import Safety completo (3 camadas)
- Grupo B: 168 vendas recuperadas via CSV

---

### [2026-03-13] Pipeline de vendas restaurado — ✅ CONCLUÍDO
- Causa raiz: constraint UNIQUE ausente em `order_items`
- Grupo A: 13 vendas recuperadas
- Trigger `trigger_derive_order_status` recriado
- **Receita recuperada: R$ 8.178,18** 🎉

---

## 🔎 Observações Técnicas Permanentes

- `order_items.offer_code` nunca populado — webhook usa `provider_offer_id`
- `order_items.funnel_id` nunca populado — atribuição via `offer_mappings.funnel_id`
- `customer_paid_brl` nunca populado pelo webhook — usar `COALESCE(customer_paid_brl, customer_paid)`
- `offer_mappings.codigo_oferta` = `order_items.provider_offer_id` (chave de join para funil)
- `provider_event_log` NÃO tem coluna `order_id`
- Webhook sempre vence CSV: `exists_webhook_ledger` → skip total
