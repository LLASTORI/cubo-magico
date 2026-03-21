# DEBUG LOG — Cubo Mágico

> Atualizado a cada passo da investigação/correção. Use este arquivo para retomar contexto em qualquer sessão futura.

---

## 📅 Última atualização
- **Data:** 2026-03-21 (sessão 25) — CRM ↔ Social Listening + auditoria launch phases
- **Status geral:** Social Listening 100% operacional ✅ | Pipeline financeiro estável ✅ | Launch Phases: schema quebrado ⚠️

---

### [2026-03-21] Auditoria: Launch Phases — ⚠️ Schema quebrado (sessão 25)

**Objetivo:** Auditoria read-only do sistema de fases de lançamento. Resultado salvo em `docs/LAUNCH_PHASES_AUDIT.md`.

**Diagnóstico principal:** `launch_phases` está com ~5 colunas faltando no banco vs TypeScript.
Colunas ausentes no DB: `primary_metric`, `is_active`, `phase_order`, `notes`, `campaign_name_pattern`.
Resultado: toda tentativa de criar fase via UI falha com erro 400 (PostgREST recusa colunas inexistentes).
O banco tem **0 registros** em `launch_phases`, `phase_campaigns`, `launch_products`.

**`launch_products` também desalinhado:** TypeScript usa `offer_mapping_id, product_type, lot_name` — DB tem `product_name, product_code, price, position_type`. Estruturas completamente diferentes.

**O que funciona:** `useLaunchPhaseMetrics` tem lógica Meta correta (spend/CPL/CPA por fase via `phase_campaigns` + `meta_insights`). Aguarda apenas dados no banco.

**O que não existe:** Receita por fase — não há join com `order_items`. `useLaunchData.ts` ainda usa `hotmart_sales` depreciado.

**Próximo passo:** Migration para adicionar colunas ausentes em `launch_phases` (bloqueador 1 de 4). Ver `docs/LAUNCH_PHASES_AUDIT.md` para lista completa.

---

### [2026-03-21] Social Listening — contexto do comentário pai nos replies — ✅ CONCLUÍDO (sessão 24)

**Problema:** Replies apareciam isolados na lista sem mostrar ao que respondiam.
Root cause: `parent_comment_id` (UUID) era null por design desde v29. `parent_meta_id` (string Meta) existia mas o lookup em memória falhava quando o pai estava filtrado, fora do batch de 2000, ou deletado da Meta.

**Solução:** Snapshot denormalizado.
- Migration `20260321130000`: colunas `parent_text` + `parent_author` em `social_comments`
- Backfill via self-join `parent_meta_id = comment_id_meta` (mesmo project_id + platform)
- `buildCommentRow`: parâmetro `parentComment` opcional — copia texto e author no momento do sync
- Loops de replies atualizados: orgânico (linha 770) + Instagram ads (linha 1549)
- Frontend: `parentPreview` IIFE — snapshot primeiro, fallback para `commentsByMetaId`
- Deploy: `social-comments-api` na versão com snapshot

---

### [2026-03-21] Social Listening — is_own_account + ads fix completo + UX — ✅ CONCLUÍDO (sessões 22-23)

**Contexto:** Migração e reconstrução do Social Listening. Múltiplos bugs corrigidos ao longo de duas sessões.

**Problema 1 — Comentários orgânicos não apareciam (sessão 22):**
- Root cause: `parent_comment_id` era UUID do banco, mas Meta retorna string. Tipo incompatível causava falha silenciosa.
- Fix v29: `parent_comment_id: null` (resolução de parent requer segunda passagem).

**Problema 2 — syncAdComments retornava erro 190 (sessão 23):**
- Root cause: `syncAdComments` usava `meta_credentials.access_token` (user token) para buscar comentários de posts de página Facebook. Posts de página exigem page token.
- Fix v31: construído `pageTokenMap` de `social_listening_pages` e usado por story ID.
- Fix adicional v30: coluna `is_selected` não existe em `meta_ad_accounts` → corrigido para `is_active`.

**Problema 3 — ON CONFLICT upsert (sessão 23):**
- Root cause: mesmo criativo Facebook compartilhado por múltiplos ads → mesmo `comment_id_meta` aparecia múltiplas vezes no batch.
- Fix v33: `processedFbStories`/`processedIgMedias` Sets + deduplicação final por `platform:comment_id_meta`.

**Problema 4 — is_own_account sempre false (sessão 23):**
- Root cause 1: `ownAccountUsernames` construído de `page_name` com sufixo `"(Facebook)"/"(Instagram)"` → nunca batia com `from.name`/`username` do comentário.
- Root cause 2: `instagram_username` nunca populado em `social_listening_pages` — `getAvailablePages` não incluía o campo no objeto retornado.
- Fix v34/v36: Facebook compara `comment.from.id` vs page ID numérico; Instagram compara `comment.username` vs `instagram_username` com fallback regex de `page_name` (`@([\w.]+)`).
- Fix DB: `instagram_username` populado em 4 contas Instagram existentes via UPDATE.
- Fix retroativo: 439 comentários marcados `is_own_account=true, ai_processing_status=skipped`.

**Melhorias UX (sessão 23):**
- Toggle "Ver respostas próprias" no frontend (independente do botão Limpar)
- Botões sync agrupados em "Sincronização" (Orgânicos + Anúncios) e "Ações" com descrições
- Placeholder "Ex: Alice Salazar Maquiagem" → "Ex: Minha Empresa Digital"
- Paginação de comentários: 100 → até 500/post (segue `paging.next`)
- Posts orgânicos: 25 → 50 por plataforma
- `getStats` filtrado por `is_own_account=false` — total e pendentes IA não contam respostas próprias
- Query frontend: limite 1.000 → 2.000 comentários

**Versões deployadas:** v29 → v37 (`social-comments-api`)

---

### [2026-03-20] UTM Analysis — status e investimento zerados em nível Origem/Placement/Page — ✅ CONCLUÍDO (sessão 20)

**Problema:** Coluna "Status" e "Investimento" apareciam vazias ao expandir o nível Origem (e também Placement, Page) no detalhamento UTM.

**Root cause:** `getSpendForUTM` e `getStatusForUTM` em `UTMAnalysis.tsx` só tinham branches para `campaign`, `adset` e `creative`. Para `source`, `placement` e `page`, retornavam `0` e `null`.

**Fix em `src/components/funnel/UTMAnalysis.tsx`:**
- `getSpendForUTM`: adicionado branch `source || placement || page` que coleta `campaignId`s das vendas do grupo e soma `spendMaps.byCampaign` para esses IDs
- `getStatusForUTM`: mesmo padrão — agrega status via campaign IDs das vendas
- `drilldownData`: grupos passaram a carregar `salesData: typeof filtered` (array raw de vendas) para que as funções possam receber o subconjunto correto de vendas no nível expandido

**Pendência registrada no TASKS.md:** redesign visual da tabela UTM (colunas densas, nomes truncados).

---

### [2026-03-20] Funil Monaliza Krepe — análise zerada — ✅ CORRIGIDO (sessão 20)

**Problema:** Projeto recém-criado `32d3439f-f7ca-41bd-ae3f-d968cba5c829` (Monaliza Krepe, infoprodutos) com 68 pedidos reais no webhook, mas Análise de Funil mostrava tudo zerado.

**Sintoma adicional:** alerta "1 funis encontrados / Funis: A Definir" na tela de funis.

**Root cause:** `offer_mappings` tinha o `codigo_oferta` errado mapeado como FRONT do funil `LANPG_MAR26`:
- Mapping registrado como FRONT: `codigo_oferta = '1kp0017c'` → não aparecia em nenhum pedido real
- Todos os 68 pedidos tinham `main_offer_code = '953gfecc'`
- `CuboMagicoDashboard.tsx` filtra `salesData.filter(s => offerCodes.has(s.offer_code))` → se o código não bate, retorna 0 vendas

**Fix via SQL (não foi possível UPDATE direto por constraint unique):**
```sql
-- Inativou o mapping incorreto
UPDATE offer_mappings SET status = 'Inativo'
WHERE id = '3f7da1a5-15fc-442e-be04-89a2b4e31f79';  -- codigo_oferta = '1kp0017c'

-- Promoveu o mapping correto para FRONT do funil
UPDATE offer_mappings SET
  id_funil = 'LANPG_MAR26',
  funnel_id = '0f9db42d-d81f-43e5-8bd1-6b56d7704abc',
  tipo_posicao = 'FRONT',
  ordem_posicao = 1
WHERE id = 'bba305cb-c568-4e3f-8ef5-1ba25eb97b0a';  -- codigo_oferta = '953gfecc'
```

**Resultado:** 68 pedidos visíveis, faturamento R$1.742,50 restaurado.

**Side-finding (não corrigido):** oferta `qv8fq3lv` (10 pedidos, Monaliza Krepe) sem mapeamento de funil. Usuário deve decidir se entra em LANPG_MAR26 como OB.

---

### [2026-03-20] Social Listening — comentários não aparecendo — ✅ CAUSA RAIZ CORRIGIDA (sessão 20)

**Problema:** Projeto Monaliza Krepe (e possivelmente todos) sem comentários no Social Listening. 157 posts existentes no banco (100 FB + 57 IG), `social_comments` com 0 linhas.

**Investigação:**
- `meta_credentials` existe e tem `access_token` ✅
- `social_listening_pages`: 2 páginas ativas com tokens (`109023034163413_facebook`, `17841436333732627_instagram`) ✅
- Logs de edge functions: apenas `social-comments-api` (read API) aparecendo — **zero invocações de `social-listening-cron`**
- `cron.job` table: apenas 2 jobs registrados (`hotmart-offers-sync-weekly`, `orders-health-check-daily`) — `social-listening-cron` **nunca foi registrado**

**Root cause:** A edge function `social-listening-cron` foi criada mas nunca agendada no pg_cron. Os posts existentes no banco foram sincronizados manualmente durante a configuração inicial do Social Listening.

**Fix:** Migration `20260320120000_social_listening_cron_schedule.sql` — registra cron job:
```sql
SELECT cron.schedule(
  'social-listening-sync-30min',
  '*/30 * * * *',
  $$ SELECT net.http_post(url := '.../social-listening-cron', ...) $$
);
```

**Status atual:** cron ativo, próxima execução em até 30 minutos. A partir daí, posts e comentários sincronizam automaticamente a cada 30 minutos para todos os projetos com páginas ativas.

**Pendência para amanhã:** verificar se comentários orgânicos aparecem após o cron rodar. Se sim, investigar comentários de anúncios (ads) separadamente — podem requerer permissões Meta Graph API adicionais. Ver TASKS.md → backlog técnico Social Listening.

---

### [2026-03-19] Análise de Funil — Primeiros fixes: dedup view + payment_method + contagem bumps — ✅ CONCLUÍDO (sessão 17)

**Problema relatado:** faturamento inflado na tela de funil (gráficos mostravam valores maiores que o real), gráficos de método de pagamento e comparação de período em branco.

**Root cause 1 — Duplicatas na view:**
`funnel_orders_view` sem CTE → GROUP BY multi-coluna gerava 74 linhas duplicadas = R$11.671 inflados no faturamento. Fix: view reescrita com CTE (`GROUP BY o.id` apenas), sem duplicatas.
Migration: `20260319220000_fix_funnel_orders_view_dedup_payment.sql`

**Root cause 2 — Campos nulos nos gráficos:**
- `TemporalChart`, `PaymentMethodAnalysis`, `PeriodComparison` usavam `total_price_brl` (nunca populado pelo webhook) e `sale_date` (nulo). Fix: migrado para `gross_amount` e `economic_day`.
- `payment_method` adicionado à view e ao adapter `useFunnelData` com `normalizePaymentMethod()` (converte lowercase do banco para enum do frontend).

**Root cause 3 — OB/US/DS com 0 vendas:**
Contagem filtrava por `offer_code = main` para todas as posições → bumps e upsells sempre zero. Fix: `SaleRecord` ganhou campo `all_offer_codes`; posições OB/US/DS filtram por `all_offer_codes`, apenas FRONT usa `offer_code` exato.

---

### [2026-03-17] Social Listening — fixes adicionais de IA e sync — ✅ CONCLUÍDO (sessão 15)

**Contexto:** Continuação da sessão 14 (7 melhorias). Bugs encontrados ao testar em produção.

**Fixes aplicados (commits 448e75c → 1641114):**

1. **Remove Lovable AI — OpenAI como único provider** (`fix: remove Lovable AI`)
   - Lovable AI removido completamente da `social-comments-api`: gateway instável, respostas inconsistentes
   - OpenAI (`gpt-4o-mini`) é agora o único provider de classificação e geração de resposta
   - Fallback para keyword classification quando sem OpenAI key

2. **Configuração OpenAI no Admin** (`feat: configuração OpenAI no Admin — platform_settings`)
   - Tabela `platform_settings` criada (migration `20260317200000`) — chave-valor global por super-admin
   - `AIUsageDashboard.tsx` ganhou campo de input para `openai_api_key`
   - `social-comments-api`: RPC `get_platform_setting_internal('openai_api_key')` tem precedência sobre env var `OPENAI_API_KEY`

3. **Fix `generate_reply` antes do check de credentials** (`fix: generate_reply movido`)
   - `generate_reply` era bloqueado por verificação de Meta credentials (desnecessária para IA)
   - Movido para antes do bloco de verificação de token Meta

4. **Fix `syncAdComments` — ReferenceError silencioso** (`fix: syncAdComments e timeout`)
   - `syncAdComments` chamava `upsertComment()` (função inexistente na versão nova) → ReferenceError silencioso → comentários de ads nunca salvos
   - Fix: substituído por batch upsert inline; `is_ad=true` marcado nos posts de anúncio
   - `processCommentsWithAI`: limit 100 → 30 por chamada; updates de keyword paralelizados com `Promise.all` (evitava timeout de 75s)

5. **Fix reclassificação manual** (`fix: reclassificação manual não salvava`)
   - `useEffect` não inicializava o estado do dropdown ao abrir o dialog → classificação selecionada não era salva
   - Fix: `useEffect` inicializa `selectedClassification` e `selectedSentiment` a partir dos valores atuais do comentário

6. **Fix listagem de pedidos — produto de front sempre primeiro** (`fix: listagem de pedidos`)
   - `OrdersTable.tsx`: sort garante que item com `item_type='main'` aparece no topo da lista de itens por pedido
   - Antes: ordem aleatória dependia do banco → OB aparecia como produto principal na UI

---

### [2026-03-19] Análise de Funil — Transparência bruto/líquido + receita exata por posição — ✅ CONCLUÍDO (sessão 18)

**Problema identificado pelo usuário:** faturamento top (R$2.731) ≠ FRONT (R$2.606) + OBs (valores inflados). OB2 mostrava R$4.267 para um período de 7 dias, maior que o faturamento total.

**Root cause (3 camadas):**
1. FRONT usava `gross_amount` (= `customer_paid`, total do pedido incluindo bumps) → inflava o FRONT
2. OBs usavam `itemRevenueByOfferCode` — soma global do projeto, não filtrada por funil → inflava OBs de funis com ofertas compartilhadas
3. `order_items.base_price` não existia na view; receita OB era aproximada como `mapping.valor × count`

**Solução implementada:**
- `offer_item_revenue_view` (migration `20260319120000`): agrega `base_price` por `(project_id, offer_code, economic_day)`
- `itemAvgPriceByOfferCode` = `total_revenue / sales_count` por oferta no período → avg price independente de funil
- FRONT = `main_revenue` (= `order_items.base_price` do item principal, sem bumps)
- OBs = `avg_price × vendas_no_funil` → escalonado pela contagem funil-específica
- Total top = `customer_paid` (correto, é a soma de todos os itens do pedido)
- Resultado: FRONT + OBs ≈ Total top (dentro de variação de câmbio e taxas)

**Transparência adicionada:**
- Modo Líquido: aviso "receita por posição sempre bruta" + badge `(B)` nos cards
- Tooltips com fonte exata (`order_items.base_price`, `funnel_orders_view`)
- Indicador de confiança por funil: N pedidos + partial_refunds
- `CLAUDE.md` atualizado com tabela de fontes e regras multi-provider

**Arquitetura multi-provider documentada:** novos providers (Kiwify, Eduzz) devem popular `order_items` com `base_price` + `provider_offer_id` + `item_type` para que `offer_item_revenue_view` funcione automaticamente.

---

### [2026-03-17] Social Listening — 7 melhorias implementadas — ✅ CONCLUÍDO (sessão 14)

**Melhorias aplicadas em `supabase/functions/social-comments-api/index.ts`:**

1. **Custom categories no prompt** — `buildClassificationPrompt` e `buildBatchPrompt` agora usam `knowledgeBase.custom_categories` dinamicamente. Fallback para 9 categorias hardcoded quando não configurado.

2. **FAQs no prompt** — bloco `faqsContext` injetado em `buildClassificationPrompt`, `buildBatchPrompt` e `generateReply`. FAQs formatadas como `P:/R:` numeradas.

3. **Praise keywords limit: 25 → 60 chars** — comentários até 60 chars são classificados por keyword (não IA). Evita gasto desnecessário de quota em elogios óbvios.

4. **`last_synced_at` gravado após sync** — ao final do batch-upsert em `syncComments()`, atualiza `social_listening_pages.last_synced_at` para todos os `page_id` dos posts sincronizados.

5. **`manually_classified=true` bloqueia re-classificação** — `.neq('manually_classified', true)` adicionado à query de pendentes em `processCommentsWithAI`.

6. **CRM linking para Facebook** — `linkExistingCommentsToCRM` reescrita para processar ambas plataformas. Instagram: match por `instagram` handle. Facebook: match por `from.name` (author_username) vs `crm_contacts.name` normalizado.

7. **CRM linking contínuo no sync** — `syncComments` agora:
   - Busca contatos com `id, instagram, name` (sem filtro `instagram IS NOT NULL`)
   - Constrói `contactNameMap` (nome→id) além do `crmContactMap` (instagram→id)
   - Passa `contactNameMap` para `buildCommentRow` — Facebook comments vinculados no momento do upsert, sem precisar do botão manual

**Deploy:** `social-comments-api` deployada via `supabase functions deploy` ✅

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
