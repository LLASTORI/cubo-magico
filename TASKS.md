# 🧩 Cubo Mágico — Quadro de Tarefas

> Gestão estratégica de tarefas. Atualizar aqui no Claude.ai e levar pro Cursor quando for executar.
> Última atualização: 22/03/2026 (sessão 31 — Fix inconsistências financeiras Camila Leal + cache invalidation CSV)

---

## 🚨 Emergência
> Nenhuma. Pipeline 100% restaurado. ✅

---

## ✅ Onda 2 — Pré-requisito: tabela `launch_editions` (sessão 29)

- [x] Migration `launch_editions` — tabela com RLS, trigger updated_at ✅
- [x] Migration `launch_phases.edition_id` — coluna nullable, sem quebrar fases existentes ✅
- [x] Tipos TypeScript `src/types/launch-editions.ts` ✅
- [x] Hook `useLaunchEditions` — CRUD + auto edition_number + cópia de fases ✅
- [x] UI mínima — aba "Edições" no `LaunchConfigDialog` com lista, create/edit/delete ✅
- [x] Build: zero erros ✅

---

## ✅ Onda 2A — Lançamento Pago: Fases automáticas + Tela de análise (sessão 30)

- [x] Fases padrão automáticas ao criar 1ª edição (4 fases: Ingressos, Comparecimento, Evento, Vendas) ✅
- [x] Badge "Lançamento Pago" (amber) no LaunchDashboard ✅
- [x] Edições colapsáveis ao expandir funil `lancamento_pago` ✅
- [x] Hook `useLaunchEditionData` — KPIs + passing diário via `funnel_orders_view` ✅
- [x] Componente `PassingDiarioChart` — barras coloridas (verde/âmbar/vermelho) + linha meta ✅
- [x] Tela `LaunchEditionAnalysis` — KPIs, passing diário, funil de conversão ✅
- [x] Rota `/app/:projectCode/lancamentos/:funnelId/edicoes/:editionId` ✅
- [x] Build: zero erros ✅

---

## ✅ Onda 2B — Comparativo + phase_id (sessão 30)

- [x] Comparativo entre edições — tabela lado a lado com ROAS, faturamento, ingressos, melhor edição destacada ✅
- [x] `phase_id` em `offer_mappings` — migration + phase selector na aba Produtos (somente `lancamento_pago`) ✅

## 🔵 Onda 2B — Restante (aguardando dados/priorização)

- [ ] Show rate — requer fonte de dados de presença no evento
- [ ] NPS e métricas do evento ao vivo
- [ ] Planejador integrado — meta de ingressos e ROAS por fase
- [ ] Vincular `registered_at` no CSV import de leads

---

## 🟣 Onda 3 — Evolução de Funis (futuro)

- [ ] Wizard de criação de funil — modelo base + módulos opcionais (arquitetura Lego)
- [ ] Refatorar seletor de funil — único seletor com todos os modelos agrupados por família
- [ ] IA Analista por modelo (benchmarks por `funnel_model`)
- [ ] Dashboard de distribuição de conteúdo paga (C1/C2/C3) via Meta Ads
- [ ] Categorização de campanhas por fase C1/C2/C3 no Meta Ads
- [ ] Métricas do lançamento meteórico via Evolution API
- [ ] Dashboard de assinatura/recorrência (MRR, Churn, LTV)
- [ ] Cronograma reverso automático para lançamento pago
- [ ] Cubo Guia — documento "Como fazer" gerado automaticamente por modelo
- [ ] Comparativo entre edições do lançamento pago (ROAS, show rate, aceite de preço)
- [ ] Documentar bairros restantes: Lançamento Clássico, Perpétuo, Meteórico

---

## 🟡 Importante — Mas não urgente

- [ ] **Abandonos na Saúde do Funil sempre zerados** — bug de matching: `offer_mappings.id_produto` (UUID interno) vs `crm_transactions.product_code` (ID numérico Hotmart). Nunca batem. Requer mapear `id_produto` para o ID numérico da Hotmart ou buscar `product_code` de outra fonte.
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

## 🟡 Importante — Social Listening

- [ ] **Reconectar conta Meta — Monaliza Krepe**
  - 39 posts falhando com "Invalid OAuth 2.0 Access Token"
  - Ir em Configurações → Conexões Meta e refazer o OAuth

---

## 🟢 Backlog técnico — Social Listening

- [ ] **Publicação real do reply na Meta API** (Graph API POST `/{comment_id}/replies`)
  - Delicado — requer confirmação antes de postar. Planejar com cuidado.

- [ ] Cruzar `ad_id`/`adset_id` dos comentários com Meta Ads
  - Análise: "qual criativo gera mais intenção de compra nos comentários?"
  - Requer planejamento antes de executar

- [ ] Rate limit graceful da Meta API (429) — baixa prioridade

## 🟢 Backlog futuro

- [ ] Mover parsing do CSV para Web Worker
- [ ] Aumentar chunk size do CSV import de 200 para 500
- [ ] Instalar MCP do Vercel para gestão de deploys
- [ ] Instalar MCP do Sentry para monitoramento de erros em produção
- [ ] Decommission `useFinancialCore.ts:351` query em `hotmart_sales`

---

## ✅ Concluído

### 🎯 Meta Ads — importação histórica até 2 anos (22/03/2026 — sessão 28)
- [x] Bug: `isHistorical` usava `daysFromEnd` → corrigido para `daysFromStart` (3x mais rápido)
- [x] Frontend: polling estendido para ranges longos (máx 10 min)
- [x] Auto-batching: ranges >90 dias → lotes de 60 dias sequenciais
- [x] Botões: 90 dias, 6 meses, 1 ano, 2 anos no MetaDateFilters

### 🎯 Social Listening — Palavras de Automação fixes (22/03/2026 — sessão 28)
- [x] Bug: ignore keywords só filtravam comentários `pending` — agora retroativo via `apply_ignore_keywords`
- [x] `AIKnowledgeBaseSettings`: chama `apply_ignore_keywords` automaticamente ao salvar KB
- [x] 434 comentários Monaliza Krepe marcados retroativamente como automation
- [x] Mensagem de OAuth expirado: toast específico com instrução de reconexão

### 🎯 Palavras em Automações — Social Listening (22/03/2026 — sessão 28)
- [x] Migration `20260321210000`: `ignore_keywords text[]` em `ai_knowledge_base`, `is_automation boolean` em `social_comments`
- [x] Edge function: check `matchesIgnoreKeywords` antes do `classifyByKeywords` no `process_ai`
- [x] `getStats`: todas as queries filtram `is_automation=false`
- [x] Frontend: toggle "Ver automações" + filtro `showAutomation` no `useComments`
- [x] `AIKnowledgeBaseSettings`: seção "Palavras em Automações" com badge cinza, aviso < 2 chars

### 🔗 CRM ↔ Social Listening — merge automático por Instagram (21/03/2026 — sessão 27)
- [x] RPC `merge_instagram_shadow(project_id, instagram, target_id)` — funde shadow profiles com contato rico
- [x] Índice `idx_crm_contacts_instagram` recriado para busca eficiente
- [x] `survey-webhook` v18 — merge disparado ao capturar instagram via `identity_field`
- [x] `quiz-public-complete` v17 — merge disparado ao salvar contato com instagram
- [x] Cobertura bidirecional: shadow→rico (compra/survey/quiz) e rico→shadow (já coberto por `linkExistingCommentsToCRM`)

### 🐛 Social Listening — 3 bugs corrigidos (21/03/2026 — sessão 27)
- [x] `last_synced_at` "Última sincronização: Nunca" — 3 camadas corrigidas: ID com sufixo, cron sem UPDATE, posts com page_id=null
- [x] Link do post abre 2 abas — `<a href + onClick>` → `<button onClick>` em `SocialListeningTab.tsx`
- [x] Filtro "Ads" mostrava posts orgânicos — PostgREST embedded filter → client-side em `useSocialListening.ts`

### ✅ Onda 1: Lançamento Pago — Desbloqueador (21/03/2026 — sessão 26)
- [x] Migration `launch_phases` — 5 colunas adicionadas. Criação de fase pelo UI desbloqueada.
- [x] Migration `launch_products` — `offer_mapping_id`, `product_type`, `lot_name` adicionados
- [x] Migration `crm_contacts` — `registered_at` adicionado com documentação no banco
- [x] `useLaunchData.ts` — `hotmart_sales` removido, migrado para `orders + order_items`
- [x] `CRMRecovery.tsx` — `hotmart_sales` removido, ~150 linhas simplificadas
- [x] Build: zero erros ✅

### 🔍 Auditoria: Launch Phases (21/03/2026 — sessão 25)
- [x] Auditoria completa do sistema de fases de lançamento — read-only
- [x] Diagnóstico: `launch_phases` com 5 colunas ausentes no DB (schema vs TypeScript desalinhado)
- [x] Diagnóstico: `launch_products` estruturas totalmente diferentes (TypeScript vs DB)
- [x] Diagnóstico: `useLaunchData.ts` usa `hotmart_sales` depreciado
- [x] Diagnóstico: `useLaunchPhaseMetrics` está correto e funcional — aguarda dados no banco
- [x] Relatório salvo em `docs/LAUNCH_PHASES_AUDIT.md`

### 🔗 CRM ↔ Social Listening — integração completa (21/03/2026 — sessão 25)
- [x] Fix `last_synced_at` em `social_listening_pages` — coluna nunca existia, cron funcionava mas não atualizava ("Última sincronização: Nunca")
- [x] `linkExistingCommentsToCRM` reescrito: auto-cria lead no CRM para comentaristas não encontrados (`source=social_listening`, `tags=['social:instagram'|'social:facebook']`)
- [x] `syncComments` chama `linkExistingCommentsToCRM` automaticamente ao final — sem botão manual necessário
- [x] Backfill: 988 de 1.701 comentários vinculados (274 Facebook anônimos sem username)
- [x] Link CRM no Social Listening corrigido: `getProjectUrl` em vez de path absoluto
- [x] `CRMContact.email` e `KanbanContact.email` corrigidos para `string | null`

### 💬 Social Listening — contexto do comentário pai nos replies (21/03/2026 — sessão 24)
- [x] Migration: `parent_text` + `parent_author` em `social_comments` com backfill
- [x] Edge function: snapshot salvo no sync de replies (Facebook + Instagram)
- [x] Frontend: snapshot como fonte primária, fallback para lookup em memória
- [x] Deploy: `social-comments-api` atualizada

### ✅ Oferta qv8fq3lv (Monaliza Krepe) encaixada no funil (21/03/2026 — sessão 24)
- [x] 10 pedidos mapeados — usuário resolveu manualmente

### 🎨 UTM Analysis — redesign visual da tabela (21/03/2026 — sessão 24)
- [x] Nome truncado com tooltip nativo (max-w-[220px])
- [x] Status: dot colorido + texto inline sem badge box (Ativo/Inativo/Misto/Desc.)
- [x] Barra de participação full-width (flex-1 h-1.5) com percentual tabular-nums
- [x] Fix a11y: aria-hidden no dot decorativo de status

### 🎯 Social Listening — stats + limite frontend (21/03/2026 — sessão 23)
- [x] `getStats` filtra `is_own_account=false` — total e pendentes IA não contam mais respostas próprias
- [x] Query frontend: limite 1.000 → 2.000 comentários
- [x] `is_own_account` fix root cause: `instagram_username` nunca era populado ao salvar páginas
- [x] `getAvailablePages` agora retorna `instagram_username` corretamente
- [x] Fallback: extrai handle do `page_name` quando `instagram_username` é null (regex `@([\w.]+)`)
- [x] DB: `instagram_username` populado nas 4 contas Instagram existentes
- [x] 439 comentários retroativamente marcados `is_own_account=true, ai_processing_status=skipped`
- [x] v36 deployada

### 🎯 Social Listening — paginação + UX (21/03/2026 — sessão 23)
- [x] Paginação de comentários além de 100 (até 500/post) em orgânicos e ads — segue `paging.next`
- [x] Limite de posts orgânicos: 25 → 50 por plataforma
- [x] Toggle "Ver respostas próprias" no frontend (independente do filtro Limpar)
- [x] Botões de sync agrupados em "Sincronização" e "Ações" com descrições contextuais

### 🎯 Social Listening — is_own_account + placeholder fix (21/03/2026 — sessão 23)
- [x] `buildCommentRow` refatorado: Facebook compara `comment.from.id` vs page ID numérico; Instagram compara `comment.username` vs `instagram_username` limpo — elimina falsos negativos causados por sufixo `"(Facebook)"/"(Instagram)"` no `page_name`
- [x] Query de listagem no frontend filtrada com `.eq('is_own_account', false)` — respostas da própria conta não aparecem mais
- [x] Placeholder "Ex: Alice Salazar Maquiagem" → "Ex: Minha Empresa Digital" na aba Base IA
- [x] `social-comments-api` v34 deployada

### 📡 Social Listening — ads fix completo (21/03/2026 — sessão 23)
- [x] v30: `is_selected` → `is_active` em `meta_ad_accounts`
- [x] v31: page token map para Facebook ad stories (corrige error 190)
- [x] v32: rewrite completo de `syncAdComments` com suporte a Facebook + Instagram
- [x] v33: deduplicação de creatives compartilhadas (corrige ON CONFLICT upsert)

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
