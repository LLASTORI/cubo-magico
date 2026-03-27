# DEBUG LOG — Cubo Mágico

> Atualizado a cada passo da investigação/correção. Use este arquivo para retomar contexto em qualquer sessão futura.

---

## 📅 Última atualização
- **Data:** 2026-03-26 (sessão 36) — Onda 2E: blocos reutilizáveis na edição
- **Status geral:** Social Listening corrigido ✅ | Pipeline financeiro estável ✅ | Onda 2A ✅ | Onda 2B ✅ | Onda 2C ✅ | Onda 2D ✅ | Onda 2E ✅ | Lovable removido ✅

---

### [2026-03-26] Fix: meta_insights vazando campanhas PERPETUO na edição (sessão 36) ✅

**Sintoma:** Blocos UTMAnalysis e MetaHierarchyAnalysis na LaunchEditionAnalysis mostravam campanhas com nome PERPETUO que não pertencem ao lançamento.

**Root cause:** Query `editionMetaInsights` filtrava apenas por `project_id` + date range (`date_start` entre start/end da edição). Como `meta_insights` é project-wide, qualquer campanha ativa no mesmo período aparecia.

**Fix:** Extrair `meta_campaign_id` das vendas da edição (`editionSalesData`) e adicionar `.in('campaign_id', editionCampaignIds)` na query. Agora só campanhas que geraram vendas nesta edição são incluídas. Query também só roda quando `editionCampaignIds.length > 0`.

---

### [2026-03-26] Onda 2E — Blocos reutilizáveis na LaunchEditionAnalysis (sessão 36) ✅

**Objetivo:** Adicionar 4 blocos de análise reutilizáveis na tela de edição do lançamento pago.

**Implementado em `src/pages/LaunchEditionAnalysis.tsx`:**
- `editionSalesData` — query a `funnel_orders_view` filtrada pelo período da edição
- `funnelOfferCodes` — memo com todos os offer codes da edição
- `editionCampaignIds` — campaign IDs extraídos das vendas (escopo para meta_insights)
- `editionMetaInsights` — query a `meta_insights` filtrada pelo período + campaign_ids
- `useMetaHierarchy` — campanhas/adsets/ads do Meta
- `useFunnelHealthMetrics` — saúde do funil (nota: ainda usa `hotmart_sales`, TODO migrar)

**Blocos renderizados:**
1. PaymentMethodAnalysis — formas de pagamento
2. FunnelHealthMetrics — saúde do funil (pode retornar vazio por dívida técnica)
3. UTMAnalysis — UTM/criativos com dados Meta
4. MetaHierarchyAnalysis — campanhas Meta Ads

**Passo 6 (filtrar lancamento_pago de FunnelAnalysis):** já resolvido nativamente — `useFunnelData` filtra por `PERPETUO_TYPE_VARIANTS` e funis `lancamento_pago` têm `funnel_type = 'lancamento'`.

**Build:** zero erros ✅

---

### [2026-03-26] Onda 2D — Três fixes cirúrgicos (sessão 36) ✅

**Fix 1 — `launch_products.product_name` NOT NULL quebrando INSERT:**
- `product_name`, `product_code`, `position_type` eram NOT NULL no banco (colunas legadas)
- Frontend usa `offer_mapping_id` no lugar — INSERT falhava
- Migration `20260326120000`: DROP NOT NULL nas 3 colunas
- Aplicada no banco via SQL Editor ✅

**Fix 2 — Tipo de fase "Ingresso" ausente:**
- Adicionado `captacao_ingresso` em `PHASE_TYPES` (`useLaunchPhases.ts`)
- Posicionado antes de "Captação" — é o tipo principal do lançamento pago
- Métricas: `cpa`, `passing_diario`, `tx_ob`

**Fix 3 — Aba Produtos mostrando apenas FRONTs:**
- Query `offer_mappings` agora filtra `is_active = true` (sem filtro por tipo)
- Badge de posição exibido: Principal (FRONT/FE), Order Bump (OB), Upsell (US), Downsell (DS)
- OBs, upsells e downsells agora visíveis na aba Produtos

**Build:** zero erros ✅

---

### [2026-03-26] Social Listening cron — AI classification completo (sessão 35 cont.) ✅

**Sintoma (reportado pelo usuário):**
1. Cron "roda" mas não classifica corretamente — sentimento e intenção ficam como "pendente"
2. Keywords customizadas (comerciais/elogios/spam) não eram aplicadas a novos comentários
3. Ao salvar keywords na Base IA, comentários existentes não eram reclassificados automaticamente

**Root causes encontrados (7 bugs):**
1. `OPENAI_API_KEY` ausente → cron marcava como `processing` e nunca resetava (stuck forever)
2. Quota excedida → mesmo problema, stuck em `processing`
3. Erro OpenAI → marcava como `failed` (terminal) em vez de `pending` (retryable)
4. Custom keywords ignoradas → cron usava apenas keywords hardcoded, não lia `ai_knowledge_base`
5. Ignore keywords não aplicadas → cron não filtrava automações (ManyChat etc.)
6. CRM linking ausente → cron não vinculava comentários a contatos CRM
7. Erro tracking → cron não registrava falhas no `ai_usage_tracking`

**Fixes aplicados:**
- **v40 `social-listening-cron`**: todos os 7 bugs corrigidos + batch size 20→50
- **`social-comments-api`**: nova action `apply_custom_keywords` para reclassificação retroativa
- **`AIKnowledgeBaseSettings.tsx`**: chama `apply_custom_keywords` no onSuccess do save

**Resultado:** Cron agora funciona de forma idêntica ao sync manual. Deploy v40 realizado.

### [2026-03-26] Social Listening — tabela UX redesign + token refresh + filtro ad posts (sessão 35) ✅

- Tabela de comentários: 11 colunas → 7 (Post, Comentário, Autor, Análise, Intenção, Status, Ações)
- Token refresh: estratégia always-refresh via `me/accounts` (remove teste não confiável)
- Filtro organic sync: `is_ad.is.false,is_ad.is.null` — dark posts excluídos (evita error 190)
- PostgREST boolean filter: `is.false` em vez de `eq.false`

### [2026-03-23] Social Listening cron — estabilização + telemetria (sessão 35) ✅

**Sintoma:** Camila Leal (`cm_2nxxd9`) sem sincronizar por >14 horas. Todas as outras contas funcionando.

**Investigação:**
- Camila era consistentemente pulada pelo cron. Rotação funcionava, mas deploys instáveis (v26-v28) causaram crashes no `waitUntil` background processing.
- v27 (staleness-based sorting) e v28 (simplificada) crashavam silenciosamente — HTTP 200 mas background morria.
- Sem visibilidade: `console.log` de Edge Functions não é acessível via `get_logs` MCP (só HTTP-level logs).
- `meta_credentials.expires_at` NULL para Camila (não causou o problema, token funciona).

**Fixes:**
1. **v29/v30: revert para rotação original** — `minuteOfDay / 30 % projectCount`. Estável.
2. **Wall-clock guard de 120s** — `break` no loop de projetos se elapsed > 120s (protege contra timeout de `waitUntil` ~150s).
3. **Post limit reduzido** — de 20 para 10 posts por página no cron (ciclos de 30min são suficientes).
4. **v31: telemetria por projeto via `system_health_log`** — cada projeto processado gera entry com `check_type='social_listening_project'`, incluindo contagens e erros. Resolve falta de visibilidade do `console.log`.

**Resultado:** Todos os 6 projetos sincronizaram com sucesso (03:30 UTC). Camila sincronizou pela primeira vez em 14h.

**Investigação adicional (telemetria):**
- Telemetria v31 revelou erro `Graph API error 190: Invalid OAuth 2.0 Access Token` em TODOS os 6 projetos para comentários FB orgânicos.
- Causa: page tokens em `social_listening_pages` expirados; quando OAuth é reconectado, `meta_credentials.access_token` é atualizado mas page tokens NÃO são refreshados.
- Bug `buildAdCommentRow` — `likes_count`/`replies_count` não existem em `social_comments` (colunas corretas: `like_count`/`reply_count`). Natalia tinha 33 ad comments descartados por ciclo. Fix v32.
- Camila: 40 ad posts mas 0 ad comments (ads genuinamente sem comentários).
- Auto-refresh de page tokens adicionado em v33/v34: detecta 190, busca tokens frescos via `me/accounts`, atualiza `social_listening_pages`.

---

### [2026-03-23] Social Listening — investigação forense + 5 fixes (sessão 34) ✅

**Sintomas reportados:** Projeto Camila Leal (`cm_2nxxd9`) — comentários de Meta Ads não aparecem; @perfil mostra "Anônimo" em comentários do Facebook.

**Investigação:**
- `last_synced_at` Camila: 13:32 de 22/03 (11h+ atrás). Natalia idem (12h+). Alice/Monaliza/Leandro atualizados normalmente.
- Cron processa projetos em ordem fixa de UUID. Projetos 1-3 consomem todo o wall-clock timeout (~400s). Camila (4o) e Natalia (5o) nunca são alcançados → **starvation**.
- 429 comentários Facebook no banco: 0 com `author_name`, 0 com `author_username`, 3 com `author_id`. Campo `from` da Graph API retorna null.
- Causa do `from` null: permissão `pages_read_user_content` ausente no OAuth scope — sem ela, Graph API v19.0 não retorna `from` em comentários.
- `upsertComment` no cron (FB orgânico) não incluía `author_username` no objeto de upsert.
- `connectedPageIds` no cron incluía sufixo `_facebook`/`_instagram` → `isOwnAccount` nunca matchava para FB.
- `social-comments-api` usava `fetch()` sem timeout em 8 chamadas externas.

**Fixes aplicados:**
1. **`author_username` adicionado ao upsert FB orgânico** — `social-listening-cron/index.ts` → `upsertComment` agora salva `author_username: authorName`
2. **Rotação de projetos no cron** — offset baseado em `minuteOfDay / 30` evita que projetos no fim da lista sejam eternamente pulados
3. **`fetchWithTimeout` em `social-comments-api`** — 8 chamadas `fetch()` substituídas: Meta API (30s), OpenAI (60s)
4. **`connectedPageIds` suffix fix** — strip `_facebook`/`_instagram` antes de comparar com `comment.from.id`
5. **`pages_read_user_content` adicionado ao OAuth scope** — 3 fluxos (Settings, MetaAds, MetaAdsProviderSettings). Requer reconexão do Meta para ativar.

**Deploy:** `social-listening-cron` + `social-comments-api` deployados.

**Ação necessária do usuário:** Reconectar conta Meta em Configurações → Conexões Meta para que a nova permissão `pages_read_user_content` seja concedida. Após reconexão, o campo `from` dos comentários FB passará a ser preenchido.

---

### [2026-03-22] Remoção Lovable / migração completa para OpenAI (sessão 33) ✅

**Contexto:** projeto foi criado no Lovable mas migrou para Claude Code. Restavam vínculos com Lovable que precisavam ser limpos.

**Remoções (sem impacto funcional):**
- `lovable-tagger` removido de `vite.config.ts` e `package.json`
- CORS allowlists de preview Lovable removidas de `auto-sync`, `meta-api`, `meta-oauth-state`, `meta-oauth-callback`
- Fallback de URL `.lovableproject.com` → URL de produção hard-coded no `meta-oauth-callback`
- Detecção de domínio preview simplificada em `ExperienceSlugSettings`, `SendSurveyDialog`, `QuizEditor`, `SurveyEditor`
- Mensagens de erro atualizadas em `useSocialListening.ts`

**Migração AI — Lovable gateway → OpenAI:**
- `funnel-ai-analysis`: `LOVABLE_API_KEY` → `OPENAI_API_KEY`, endpoint → `api.openai.com`, modelo → `gpt-4o-mini`
- `quiz-copilot`: mesmo (4 chamadas), modelo `google/gemini-3-flash-preview` → `gpt-4o-mini`
- `survey-ai-analysis`: mesmo, modelo `google/gemini-2.5-flash` → `gpt-4o-mini`
- `social-listening-cron`: removida `classifyWithLovableAI()` — OpenAI é agora o único provider AI

**Mantido intacto (correto):** colunas `lovable_credits_*` no banco, RPC `increment_lovable_credits`, `check_and_use_ai_quota` — sem migration necessária. Condição `quotaReason === 'lovable_credits_exhausted'` no hook mantida pois o RPC ainda retorna essa string.

---

### [2026-03-22] Social Listening cron — fix de freeze por timeout ausente (sessão 33) ✅

**Sintoma:** Camila Leal com "última sincronização: há 10h / 56 pendentes". Natalia Canezin também travada.

**Investigação:**
- `last_synced_at` da Camila atualizado às 13:32 UTC → Steps 1–4 (sync orgânico) completaram normalmente
- Camila tem `meta_ad_accounts` ativo (`act_312092411354147`) com 0 ad_posts → Step 5 (`syncAdCommentsForProject`) iniciava mas nunca concluía
- Natalia travada porque o loop processa projetos sequencialmente por UUID (Alice → Monaliza → Leandro → Camila → Natalia)

**Causa raiz:** `fetch()` sem timeout em todas as chamadas externas. Se a Meta API travar (network stall, sem TCP reset), o `await fetch()` aguarda indefinidamente, congelando o bloco `waitUntil` inteiro.

**Fix:** helper `fetchWithTimeout(url, timeoutMs, options?)` com `AbortController` adicionado. Aplicado em:
- Meta Graph API (posts, comentários orgânicos, ads list, comentários de ads): **30s**
- OpenAI e Lovable AI (já removida): **60s**
Deploy realizado — próximo cron (30min) já usará a versão corrigida.

---

### [2026-03-23] Onda 2C — Fixes lancamento_pago (sessão 32) ✅

**Task 1 — RLS `launch_phases` e `launch_products`:**
Policy `"Managers and owners can manage"` usava `get_user_project_role()` que bloqueava INSERTs (sem WITH CHECK). Substituída por policy simples baseada em `project_members` (igual a `launch_editions`). Migration `20260323100000_fix_rls_launch_phases_products.sql` aplicada.

**Task 2 — Faturamento R$0 no nível do funil `lancamento_pago`:**
`useLaunchData` usava o date range do dashboard para filtrar `salesData`, que não cobria as datas das edições. Adicionados 3 novos conjuntos de queries:
- `pagoEditions` — editions do funil
- `pagoOrdersData` — receita via `funnel_orders_view` com datas das editions
- `pagoMetaInsights` — spend via `meta_insights` com datas do funil (launch_start_date → launch_end_date)
`launchMetrics` agora usa dados edition-scoped para `lancamento_pago` sem afetar lançamentos clássicos.

**Task 3 — Bloco "Funil de Conversão" para `lancamento_pago`:**
Criado `LaunchPagoConversaoBlock.tsx` com:
- Métricas ingresso→produto (compradores, TX conversão, receita, ticket médio)
- Identificação de ofertas por `phase_id` (Fase 1 / Fase 4), com fallback para `main_offer_code`
- Abas UTM (Campanhas/Conjuntos/Fontes/Criativos/Mídias) baseadas em `funnel_orders_view`
`LaunchEditionAnalysis.tsx` agora renderiza o bloco correto baseado em `funnel.funnel_model`. Lançamentos clássicos não foram afetados.

---

### [2026-03-22] Inconsistências financeiras — Projeto Camila Leal (sessão 31) ✅

**Sintoma inicial:** Faturamento bruto exibindo ~R$12.588 quando o real era ~R$8.000 no funil "Face | Conteúdo Magnético".

**Causa raiz — Faturamento inflado:**
CSV importado em 14/03 criou pedidos com `customer_paid` = valor total do parcelamento (2x ou 3x o preço do item), em vez do valor unitário do plano. Webhook da época também tinha o mesmo bug (corrigido ~14-15/03).

**Fix aplicado:**
Deletados todos os 7.061 pedidos do projeto (cascade em 9.073 order_items + 25.163 ledger_events) e reimportado CSV limpo → R$8.357,46 confirmado correto (133 completed + 63 approved).

**Sintomas secundários identificados (pós-reimportação):**
Três problemas adicionais, todos causados por **cache desatualizado do React Query** — o browser exibia dados antigos de antes da reimportação:

1. **OB revenue R$0** — `itemRevenueQuery` cacheada quando OBs tinham `item_type='main'` (pré-reimportação). View `offer_item_revenue_view` retornava vazio para `item_type='bump'` → `itemAvgPriceByOfferCode = {}` → `0 × count = R$0`.
2. **FRONT count 147 em vez de 196** — `ordersQuery` cacheada com dados pré-reimportação. DB confirma 196 pedidos com `main_offer_code='7fbtbile'` em março.
3. **Saúde do Funil tudo zerado** — `approvedSalesQuery` cacheada com dados antigos → `vendasAprovadas=0` → funil filtrado do resultado → fallback com zeros exibido.

**Fix de código aplicado (`useProviderCSVImport.ts`):**
Após qualquer importação CSV, agora invalida automaticamente:
- `['funnel-orders', projectId]` — força refetch dos pedidos do funil
- `['item-revenue', projectId]` — força refetch da receita por oferta (OB/US/DS)

**Ação imediata para o usuário:** Hard refresh (Ctrl+Shift+R) para limpar o cache e ver dados corretos.

**Observação sobre Abandonos na Saúde do Funil:**
Bug pré-existente: `offer_mappings.id_produto` guarda UUIDs internos, mas `crm_transactions.product_code` guarda ID numérico da Hotmart (ex: `'4567276'`). Nunca batem → `totalAbandonos = 0` sempre. Reembolsos e cancelamentos funcionam (usam `offer_code`). Requer correção separada no schema ou na lógica de matching.

---

### [2026-03-22] Onda 2B — Comparativo de edições + phase_id (sessão 30) ✅

- `useEditionsComparativo.ts`: `useQueries` paralelo para KPIs de N edições (ingressos, faturamento, ROAS, spend)
- `EditionsComparativoTable.tsx`: tabela com melhor ROAS destacado em verde + botão "Ver análise" por linha
- `LaunchDashboard.tsx`: toggle "Edições / Comparativo" em `LaunchPagoEditionsRow`
- Migration `20260322200000`: `phase_id uuid REFERENCES launch_phases(id)` nullable em `offer_mappings`
- `LaunchConfigDialog.tsx`: phase selector condicional na aba Produtos para `funnel_model = 'lancamento_pago'`
- Build: zero erros

---

### [2026-03-22] Onda 2A — Lançamento Pago completo (sessão 30) ✅

Implementação completa da Onda 2A. Arquivos criados/modificados:
- `useLaunchEditions.ts`: 4 fases padrão automáticas na 1ª edição (Ingressos/Comparecimento/Evento/Vendas) com datas baseadas em `event_date`
- `LaunchDashboard.tsx`: badge amber "Lançamento Pago" + `LaunchPagoEditionsRow` ao expandir funis `lancamento_pago`
- `useLaunchEditionData.ts`: KPIs (ingressos, faturamento, ROAS) + passing diário via `funnel_orders_view`
- `PassingDiarioChart.tsx`: barras coloridas + linha de meta com Recharts `ComposedChart`
- `LaunchEditionAnalysis.tsx`: tela completa com header, KPIs, passing, `LaunchProductsSalesBreakdown`, `LaunchConversionAnalysis`
- `App.tsx`: rota `lancamentos/:funnelId/edicoes/:editionId`

Correções vs plano: `funnel_orders_view` usa `customer_paid` (não `gross_amount`); sem coluna `main_item_type` — usa `.not('main_offer_code', 'is', null)` para identificar pedidos FRONT; props dos componentes reutilizados são `startDate/endDate` (não `dateRange`); `useTenantNavigation` expõe `navigateTo` (não `navigate`).
Build: zero erros.

---

### [2026-03-22] Onda 2 — launch_editions criado (sessão 29) ✅

Pré-requisito para métricas de lançamento pago recorrente.
- Migrations: `launch_editions` (tabela completa com RLS) + `launch_phases.edition_id` (nullable, sem breaking change)
- Tipos: `src/types/launch-editions.ts` — `LaunchEdition`, `LaunchEditionInsert`, `LaunchEditionWithPhases`
- Hook `useLaunchEditions`: CRUD completo, auto `edition_number` (MAX+1), cópia de fases da edição anterior ao criar nova
- UI: aba "Edições" no `LaunchConfigDialog` — lista com badge de status, dialogs de create/edit/delete, aviso de fases copiadas
- Build: zero erros

---

### [2026-03-22] Social Listening — cron não sincronizava comentários (sessão 29) ✅

**Sintoma:** Sync manual funcionava, cron marcava `last_synced_at` mas comentários não apareciam para o projeto Camila Leal.

**Bug 1 — Ordem não-determinística de projetos:**
Query `social_listening_pages` sem `ORDER BY` retornava projetos em ordem aleatória.
Quando Natalia Canezin (3636 comentários, adicionada no mesmo dia) ficava no começo, consumia todo o tempo da função (~150s) e Camila Leal ficava sem processar.
`last_synced_at` é atualizado ao final de cada projeto — Camila não chegava a ser atualizada pelo cron.
Fix: adicionado `.order('project_id')` → ordem determinística, mesma a cada execução.

**Bug 2 — Sem fallback token no fetch de comentários da cron:**
`syncCommentsForProject` buscava comentários com `pageToken`. Se o pageToken retornasse erro 190/10 (token insuficiente/expirado), registrava o erro no array e **pulava o post silenciosamente**.
`social-comments-api` (sync manual) tinha o fallback correto — por isso manual funcionava e cron não.
Fix: extraída função `fetchCommentsWithFallback(url, pageToken, fallbackToken, maxComments)` que, ao receber erro 190/10, retenta com `accessToken` (user-level de `meta_credentials`). Também adicionado suporte a paginação de comentários.

**Deploy:** `social-listening-cron` re-deployada. Commit `2f63fff`.

---

### [2026-03-22] Meta Ads — sync histórico desbloqueado (sessão 28) ✅

**Bug 1 — `isHistorical` calculado errado:**
Em `getInsightsIncremental`, `isHistorical` usava `daysFromEnd` (distância de `dateStop` até hoje). Para um range "90 dias atrás → hoje", `dateStop=hoje` → `daysFromEnd=0` → `isHistorical=false` → apenas 2 chunks paralelos em vez de 6. **3x mais lento do que deveria.**
Corrigido para usar `daysFromStart` (distância de `dateStart` até hoje).

**Bug 2 — Frontend parava de fazer polling cedo demais:**
`pollDurationMs` era `Math.min(180000, ...)` — máximo 3 minutos para qualquer range. Para 90 dias o sync levava mais tempo e dados apareciam depois que o frontend já parou de verificar.
Corrigido: ≤30 dias → até 45s; >30 dias → 4s/dia, máx 10 minutos.

**Auto-batching para ranges > 90 dias:**
Ranges >90 dias são divididos em lotes de 60 dias, disparados sequencialmente com 3s de pausa entre chamadas. Aproveita o smart cache (datas já salvas puladas). 2 anos = 13 lotes de 60 dias.

**UX:** Novos botões rápidos no `MetaDateFilters`: 90 dias, 6 meses, 1 ano, 2 anos. Toast específico para importação histórica.

**Deploy:** `meta-api` re-deployada. Frontend commitado.

---

### [2026-03-22] Social Listening — Palavras de Automação: 2 bugs (sessão 28) ✅

**Bug 1 — Ignore keywords não filtravam comentários existentes:**
Root cause: o check de `ignore_keywords` só rodava dentro do `process_ai` para comentários `pending`. Comentários já processados (`completed`), com falha (`failed`) ou recém-sincronizados sem `process_ai` permaneciam com `is_automation=false` e apareciam na lista.
- Nova ação `apply_ignore_keywords` na edge function: varre TODOS os comentários com `is_automation=false` do projeto e marca os que batem com ignore_keywords como `is_automation=true, ai_processing_status=skipped`
- `AIKnowledgeBaseSettings.onSuccess` chama a ação automaticamente ao salvar o KB quando há ignore_keywords configuradas
- Retroativo imediato: 434 comentários da Monaliza Krepe marcados via SQL direto

**Bug 2 — Mensagem genérica para token OAuth expirado:**
Root cause: erro Meta código 190 ("Invalid OAuth 2.0 Access Token") — `fetchCommentsForPost` tenta pageToken → fallback token → ambos expirados → mensagem genérica "Sincronização parcial" sem indicar o que fazer.
Fix: `useSocialListening.ts` detecta mensagens OAuth/Access Token e exibe: "Token Meta expirado — reconecte em Configurações → Conexões Meta".
**Ação necessária para Monaliza Krepe:** reconectar conta Meta para renovar tokens (39 posts afetados).

**Deploy:** `social-comments-api` re-deployada (v44).

---

### [2026-03-21] Social Listening — merge Instagram shadow profiles ✅ (sessão 27)

**RPC `merge_instagram_shadow`** — migration `20260321200000`. Encontra todos os shadow profiles (`source='social_listing'`) com instagram matching, transfere `social_comments`, mescla tags, deleta shadows. Index `idx_crm_contacts_instagram` criado para lookup eficiente.

**survey-webhook v18** — chama `merge_instagram_shadow` ao salvar `contactUpdates.instagram`. Cobertura: quando lead preenche survey e informa Instagram que já tinha comentado.

**quiz-public-complete v17** — chama `merge_instagram_shadow` após upsert do contato quando `contact_data.instagram` está presente. Mesma cobertura via quiz.

**Cobertura bidirecional:**
- shadow→rico: survey/quiz captura instagram → merge automático ✅
- rico→shadow: `linkExistingCommentsToCRM` (já existia) cobre quando rico comenta ✅

---

### [2026-03-21] Social Listening — last_synced_at corrigido ✅ (sessão 27)

**3 camadas com bug:**
1. `social-comments-api` v41: UPDATE usava base IDs mas `social_listening_pages` usa IDs com sufixo `_facebook/_instagram` → zero matches. Corrigido com lógica de strip de sufixo.
2. `social-listening-cron`: NUNCA tinha bloco de UPDATE para `last_synced_at`. Adicionado.
3. Posts de Monaliza Krepe (20 mais recentes) tinham `page_id=null` → `postBasePageIds` vazio. Simplificado para atualizar TODAS as páginas ativas do projeto.

**Resultado:** 8/8 páginas com `last_synced_at` preenchido. Tela não mostra mais "Nunca".

---

### [2026-03-21] Social Listening — bug link duplo + filtro Ads ✅ (sessão 27)

**Bug 1 — dupla abertura de aba:** `<a href target="_blank">` + `onClick { e.preventDefault(); window.open() }` disparavam os dois em alguns browsers. Substituído por `<button onClick>` sem href em `SocialListeningTab.tsx`.

**Bug 2 — filtro Ads:** `.eq('social_posts.is_ad', true)` em PostgREST embedded to-one apenas nulifica o objeto aninhado, não exclui a linha pai. Removido do DB query; filtro aplicado client-side em `useSocialListening.ts`.

**Deploy:** Frontend `d844431` pusheado. Edge functions todas ativas (social-comments-api v42, social-listening-cron v19).

---

### [2026-03-21] Onda 1: Lançamento Pago — ✅ CONCLUÍDO (sessão 25)

**Tarefa 1 — launch_phases schema:** Migration `20260321160000` adicionou 5 colunas ausentes (`primary_metric`, `is_active`, `phase_order`, `notes`, `campaign_name_pattern`). Criação de fases pelo UI desbloqueada.

**Tarefa 2 — launch_products schema:** Migration `20260321170000` adicionou `offer_mapping_id` (FK → offer_mappings), `product_type`, `lot_name`. Colunas antigas mantidas.

**Tarefa 3 — useLaunchData.ts:** Substituída query `hotmart_sales` por `orders + order_items`. Usa `economic_day` para filtro de data (sem timezone gymnastics). Shape de saída preservado (`offer_code`, `total_price_brl`). Import `toZonedTime` removido.

**Tarefa 3b — CRMRecovery.tsx:** Removidos dois blocos `hotmart_sales` (~150 linhas). ABANDONED agora incluído no `crm_transactions` query junto com CANCELLED/CHARGEBACK/REFUNDED. Conversão verificada via `crm_transactions` APPROVED por contact_id + product_code (antes era por email). Build: ✅

**Tarefa 4 — registered_at:** Migration `20260321180000` adicionou `registered_at timestamptz` em `crm_contacts` com COMMENT. NULL por padrão, sem backfill.

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
