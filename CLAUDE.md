# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos de Desenvolvimento

```bash
npm run dev          # Dev server (Vite, porta 8080)
npm run build        # Build produção
npm run build:dev    # Build modo desenvolvimento
npm run lint         # ESLint
npm run preview      # Preview do build
```

**Testes E2E (Playwright):**
```bash
npx playwright test              # Todos os testes
npx playwright test tests/foo.spec.ts  # Teste específico
npx playwright test --ui         # Interface visual
```

**Supabase Edge Functions (via CLI):**
```bash
supabase functions serve <function-name>   # Serve localmente (requer Docker)
supabase functions deploy <function-name>  # Deploy
supabase db push                           # Aplica migrations pendentes
```

## Stack Técnica

- **Frontend**: React 18 + TypeScript 5.8 strict, Vite 5, Tailwind CSS, shadcn-ui (Radix UI)
- **Estado**: TanStack React Query 5 (server state) + React Context (local)
- **Roteamento**: React Router 7, multi-tenant via `/app/:projectCode/*`
- **Backend**: Supabase (PostgreSQL + RLS + Realtime) com >50 Edge Functions em Deno
- **Formulários**: React Hook Form + Zod
- **Testes**: Playwright (E2E)

## Arquitetura Multi-Tenant

Toda rota autenticada é prefixada com `/app/:projectCode/`. Leia `ARCHITECTURE_NAVIGATION.md` para regras detalhadas.

- Nunca navegue com `navigate('/rota')` absoluto — sempre use `useTenantNavigation()` para preservar o contexto do tenant.
- `ProtectedRoute` → `ProjectBootstrapGate` → `ProtectedAreaRoute` é a cadeia de guards obrigatória.
- Cada `project` tem isolamento via RLS no banco; super-admin tem acesso cross-project.

## Arquitetura Financeira (Ledger-First)

**Fonte única da verdade: webhook Hotmart** (`supabase/functions/hotmart-webhook/`).

Fluxo canônico:
```
Hotmart webhook → orders → order_items → ledger_events
```

Tabelas:
- `orders` — pedidos; constraint UNIQUE em `(project_id, provider, provider_order_id)` — chave de idempotência
- `order_items` — itens por pedido; constraint UNIQUE em `(order_id, provider_product_id, provider_offer_id)`
- `ledger_events` — decomposição financeira em BRL; rastreia conversão para moedas estrangeiras; UNIQUE `(order_id, provider_event_id)` (escopo por order, não global)
- `crm_transactions` — log de eventos CRM (TODOS os status: ABANDONED, DELAYED, CANCELLED, EXPIRED...); ≠ orders que só tem approved. Trigger `detect_auto_recovery` depende dela. **Não dropar.** Fonte canônica para `CRMRecovery.tsx` (abandoned carts + conversão).
- `crm_contacts.registered_at` — data real de cadastro do lead na landing page. Diferente de `created_at` (entrada no Cubo). NULL = desconhecida. Preenchida por webhook de captura, CSV import ou manualmente. **Não confundir com `created_at`** ao calcular tempo entre cadastro e compra.
- `system_health_log` — alertas de monitoramento automático (check_type, severity ok/warning/critical, affected_count, details jsonb)
- `project_credentials` — credenciais Hotmart encriptadas: `client_id_encrypted`, `client_secret_encrypted`, `basic_auth_encrypted`. Nunca ler `client_id`/`client_secret`/`basic_auth` diretamente (são NULL). Usar RPC `get_project_credentials_internal(project_id)` para obter valores descriptografados. Checar presença via `is_configured`/`is_validated`.

**Campos UTM em `orders`** (populados pelo webhook a partir dos parâmetros do comprador):
- `meta_campaign_id`, `meta_adset_id`, `meta_ad_id` — IDs do Meta Ads (vindos de `{{campaign.id}}` no UTM)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_adset`, `utm_placement`
- `raw_sck` — parâmetro `sck` do Hotmart (origin do checkout)
- ~77% dos pedidos têm `utm_source`, ~50% têm `meta_campaign_id`; resto são vendas orgânicas — correto
- Join key para Meta Ads: `orders.meta_campaign_id = meta_insights.campaign_id`

**`order_items.item_type`** — classificação do item no funil:
- `'main'` — oferta principal (FRONT/FE)
- `'bump'` — order bump (OB)
- `'upsell'` — upsell (US)
- `'downsell'` — downsell (DS)
- `'unknown'` — webhook não conseguiu classificar (falta `tipo_posicao` no `offer_mappings`)
- `funnel_orders_view` usa COALESCE: `main_offer_code` = item com `item_type='main'` OU oferta com `tipo_posicao IN ('FRONT','FE')` no fallback

**`funnel_orders_view`** — view canônica para análise de funil:
- Expõe todos os campos UTM de `orders` + `main_offer_code` com fallback COALESCE
- Hook canônico: `useFunnelData.ts` — `SaleRecord` é a interface de saída; UTMAnalysis usa `gross_amount` como receita canônica
- `useLaunchData.ts` usa `orders + order_items` diretamente (não `funnel_orders_view`) para breakdown por posição via `provider_offer_id`/`base_price`

**`offer_item_revenue_view`** — receita exata por oferta (migration `20260319120000`):
- Agrega `order_items.base_price` por `(project_id, offer_code, item_type, economic_day)`
- Fonte para receita de OB/US/DS por posição no funil (substitui aproximação `mapping.valor × count`)
- Usado via `useFunnelData.itemAvgPriceByOfferCode` — retorna preço médio por oferta no período

## Arquitetura Bruto vs Líquido — Análise de Funil

**Regra crítica:** receita por posição (FRONT/OB/US/DS) é SEMPRE baseada em valores brutos de `order_items.base_price`. Nunca existe um `net_price` por item — o líquido só existe no nível do pedido (`orders.producer_net`).

| Nível | Bruto | Líquido | Fonte |
|---|---|---|---|
| Total do funil | `orders.customer_paid` | `orders.producer_net` | `funnel_orders_view` |
| FRONT (item) | `order_items.base_price` (via `main_revenue`) | ❌ não disponível | `offer_item_revenue_view` |
| OB/US/DS (item) | `avg_price × count` (avg de `order_items.base_price`) | ❌ não disponível | `offer_item_revenue_view` |

**Diferença esperada entre total e soma das posições:**
`orders.customer_paid` (topo) ≠ soma de `order_items.base_price` (posições). Isso é correto e esperado — causas:
- Conversão de moeda: `base_price` usa taxa do cadastro da oferta; `customer_paid` usa taxa real do dia
- Taxas de parcelamento adicionadas pelo Hotmart sobre o valor do item
- Cupons/descontos que reduzem o `customer_paid` abaixo do preço listado
Diferença típica: < 1% do faturamento. Não é bug — `customer_paid` é a fonte canônica de receita real.

**Implicações para o código:**
- `revenueMode` em `FunnelAnalysis.tsx` remapeia `gross_amount → net_amount` via `displaySalesData`
- Esse remap afeta o **total** de faturamento corretamente
- Mas `main_revenue` e `itemAvgPriceByOfferCode` **não são remapeados** — sempre bruto
- Por isso: em modo Líquido, os cards de posição mostram `(B)` e um aviso é exibido na seção de fluxo
- Para futura implementação de líquido por item: precisaria de `net_price` em `order_items` (não existe hoje em nenhum provider)

**Multi-provider:** quando novos providers chegarem (Kiwify, Eduzz etc.), devem popular `order_items` com a mesma estrutura (`base_price`, `provider_offer_id`, `item_type`) para que `offer_item_revenue_view` e toda a análise de funil funcionem automaticamente. O `funnel_orders_view` já é agnóstico de provider.

**Regras invioláveis:**
- Nunca fabricar valores financeiros
- Nunca inferir comissões de coprodutores
- Nunca alterar lógica de ingestão do webhook
- Dados do webhook sempre sobrepõem API e CSV
- O conflict target em upserts de `orders` é `(project_id, provider, provider_order_id)` — nunca quebrar

## Edge Functions

Ficam em `supabase/functions/<nome>/index.ts` (Deno). Padrões:
- JWT verification está desabilitado na maioria das funções (webhook trust model)
- Variáveis de ambiente via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`
- CORS headers necessários para funções chamadas do browser

Domínios principais:
| Domínio | Funções |
|---|---|
| Vendas | `hotmart-webhook`, `hotmart-products`, `hotmart-offers-cron` |
| CSV Import | `provider-csv-import` (v2), `provider-csv-import-revert` (v1) |
| Meta Ads | `meta-api` (sync_insights, sync_hierarchy_full), `meta-insights-cron`, `meta-oauth-*`, `meta-hierarchy-cron` |
| Quiz/Survey | `quiz-public-*`, `quiz-copilot`, `survey-public` |
| Automações | `automation-engine`, `whatsapp-webhook`, `evolution-api` |
| Social Listening | `social-listening-cron` (cron 30min, todos os projetos), `social-comments-api` (sync manual + fallback token) |
| Exports | `export-csv-utf8`, `export-orders-sql`, `export-contacts-sql` |
| Monitoramento | `orders-health-check` (cron diário 08h UTC), `hotmart-offers-cron` (cron segunda 07h UTC) |

## Meta Ads — Sync de Histórico

**Ação:** `sync_insights` em `supabase/functions/meta-api/index.ts`

**Smart cache:** `determineDatesToFetch` — datas já em `meta_insights` há >8 dias são puladas (imutáveis). Datas <7 dias são sempre re-buscadas (janela de atribuição Meta).

**Chunking:** `MAX_DAYS_PER_CHUNK = 15` — qualquer range é dividido em chunks de 15 dias. `PARALLEL_CHUNKS_HISTORICAL = 6` (usado quando `daysFromStart >= 30`), `PARALLEL_CHUNKS_RECENT = 2`.

**Auto-batching no frontend (`MetaAds.tsx`):** Ranges >90 dias são divididos em lotes de 60 dias e disparados sequencialmente com 3s de pausa. O smart cache garante idempotência. Suporta até 2 anos.

**Polling:** ≤30 dias → até 45s; >30 dias → ~4s/dia, máx 10 minutos.

**Reauthenticação:** tokens OAuth Meta expiram em ~60 dias. Reconectar em Configurações → Conexões Meta. Erro detectado automaticamente pelo frontend (toast específico).

## Sistema de CSV Import (Hotmart)

**Caminho no app:** Settings → Integrações → Hotmart → "Importar Histórico de Vendas"

**Arquivos principais:**
- `src/types/csv-import.ts` — tipos compartilhados
- `src/lib/csv-parsers/hotmart.ts` — parser browser-side (síncrono, detecta formato, agrupa bumps)
- `src/hooks/useProviderCSVImport.ts` — hook (chunks de 200, validação cruzada, batch_id)
- `src/components/settings/ProviderCSVImport.tsx` — UI (upload, preview, dialog, progresso, resultado)
- `src/components/settings/CsvImportHistory.tsx` — histórico de imports com botão "Desfazer"
- `supabase/functions/provider-csv-import/` — edge function principal
- `supabase/functions/provider-csv-import-revert/` — edge function de revert

**Regras do CSV import:**
- Webhook sempre vence: `exists_webhook_ledger` → skip total, nunca sobrescrever
- `batch_id` gravado em `ledger_events.raw_payload` (jsonb) — zero schema change em `ledger_events`
- Batch criado no **primeiro chunk** pela edge function; fechado no último com `is_last_chunk=true`
- Revert usa `ledger_events WHERE source_origin != 'csv'` para decidir se order tem vínculo com webhook
- `provider_event_log` NÃO tem coluna `order_id` — não usar para decisões de revert
- Contatos CRM **não** são revertidos (podem ter sido alterados por outras fontes)
- Roles para revert: apenas `owner` e `manager` (verificado na edge function via `project_members.role`)

## Social Listening

**Tabelas:** `social_listening_pages` (páginas configuradas por projeto), `social_posts`, `social_comments`, `ai_knowledge_base`

**Sync cron (`social-listening-cron`):** roda a cada 30 min via pg_cron; processa TODOS os projetos ativos. Projetados ordenados por `project_id` (ORDER BY obrigatório — sem ele, projetos no fim da lista podem ser pulados se a função timeout).

**Sync manual (`social-comments-api`):** chamado pelo frontend; tem fallback token: se `pageToken` falha com erro 190/10, retenta com `accessToken` do usuário (`meta_credentials`).

**Token hierarchy:** `social_listening_pages.access_token` (page-level) → fallback para `meta_credentials.access_token` (user-level) em caso de erro 190 ou 10.

**`last_synced_at`** em `social_listening_pages` — atualizado ao final de cada sync bem-sucedido do projeto. Usado no frontend para exibir "última sincronização".

**AI processing:** classificação em dois estágios — 1) keywords (síncrono, sem custo) → 2) OpenAI GPT-4o-mini batch com fallback para Lovable AI. Quota controlada por `check_and_use_ai_quota` RPC.

**Ignore keywords:** salvas em `ai_knowledge_base.ignore_keywords` (jsonb array). Ação `apply_ignore_keywords` na `social-comments-api` aplica retroativamente marcando `is_automation=true`.

## Launch Editions (Onda 2 — Lançamento Pago Recorrente)

**Conceito:** cada ciclo de um lançamento pago é uma "Edição" ou "Turma". Sem isso, métricas de edições diferentes ficam misturadas no mesmo funil.

**Tabelas:**
- `launch_editions` — id, funnel_id, project_id, name, edition_number (UNIQUE por funnel), event_date, start_date, end_date, status (planned/active/finished)
- `launch_phases.edition_id` — nullable; NULL = fase não vinculada a edição (retrocompatibilidade)
- `offer_mappings.phase_id` — nullable FK para `launch_phases(id)`; vincula oferta a uma fase específica da edição (ex: Fase 1 = ingressos, Fase 4 = produto principal). Usado em `LaunchConfigDialog` aba Produtos (somente `lancamento_pago`) e em `LaunchPagoConversaoBlock` para identificar ofertas por fase.

**Hook:** `src/hooks/useLaunchEditions.ts` — CRUD + auto `edition_number` (MAX+1) + cópia de fases da edição anterior ao criar nova (copia phase_type, name, primary_metric, campaign_name_pattern, notes; **não copia** start_date/end_date)

**UI:**
- Aba "Edições" no `LaunchConfigDialog` (`src/components/launch/LaunchEditionsTab.tsx`)
- Tela de análise de edição: `src/pages/LaunchEditionAnalysis.tsx` — KPIs, passing diário, bloco de conversão
- Bloco de conversão `lancamento_pago`: `src/components/launch/LaunchPagoConversaoBlock.tsx` — métricas ingresso→produto + abas UTM por `funnel_orders_view` (não por tag CRM)
- Bloco de conversão clássico: `src/components/launch/LaunchConversionAnalysis.tsx` — usa `launch_tag` do CRM

**Tipos:** `src/types/launch-editions.ts` — `LaunchEdition`, `LaunchEditionInsert`, `LaunchEditionWithPhases`

**`useLaunchData` — comportamento por `funnel_model`:**
- Lançamentos clássicos: receita e spend filtrados pelo date range do dashboard
- `lancamento_pago`: receita somada de **todas as edições** via `funnel_orders_view` (edition-scoped); spend via `meta_insights` com `launch_start_date → launch_end_date` do funil — **ignora o filtro do dashboard**

**RLS `launch_phases` e `launch_products`:** usam política `project_members` (igual a `launch_editions`) — não `get_user_project_role()` (que bloqueava INSERTs sem WITH CHECK).

## Padrões de Código

**TypeScript**: strict mode sempre; sem `any`; tipos explícitos.

**Hooks**: toda lógica de negócio em custom hooks (`src/hooks/`). Componentes apenas apresentação + eventos.

**Formatação**: 2 espaços, aspas simples, ponto-e-vírgula sempre, linha máxima 80 chars (preferencial, sem enforcement por linter).

**Commits** (Conventional Commits):
```
feat: adiciona validação de email
fix: corrige erro no login
refactor: extrai hook useOrdersCore
```

## Regras de Migrations — OBRIGATÓRIO

Toda alteração de schema executada no banco **deve ter o arquivo de migration correspondente commitado no git** antes de encerrar a sessão. Migrations não commitadas são risco crítico — um reset de branch as apaga silenciosamente.

**Checklist após qualquer migration:**
1. Arquivo existe em `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`?
2. `git status` mostra o arquivo?
3. Commit realizado?

Se a migration foi aplicada diretamente no SQL Editor (sem CLI), criar o arquivo manualmente e commitar imediatamente.

## Manutenção dos Arquivos de Contexto

Estes arquivos devem ser mantidos atualizados em tempo real durante qualquer sessão:

### debug_log.md
Atualizar **a cada passo significativo**: query executada, hipótese confirmada/descartada, bug encontrado, correção aplicada, deploy realizado.

Formato de entrada:
```
### [YYYY-MM-DD] Título curto — status (✅ OK | ⚠️ Parcial | ❌ Falhou)
Descrição do que foi feito, resultado obtido e observações relevantes.
```

Mover itens resolvidos da seção "Pendências Abertas" para "Correções Aplicadas" assim que concluídos.

### TASKS.md
Atualizar sempre que:
- Uma tarefa for concluída → mover para ✅ Concluído com data
- Uma tarefa nova surgir → adicionar na categoria correta (🚨 Emergência / 🔴 Alta / 🟡 Média / 🟢 Backlog)
- A prioridade de uma tarefa mudar → mover entre categorias

### CLAUDE.md (este arquivo)
Atualizar quando houver mudança arquitetural, nova regra de negócio, novo módulo relevante ou nova edge function importante.

### VISION.md
Visão estratégica do produto. **Ler quando for:**
- Tomar decisões arquiteturais
- Criar novas features ou módulos
- Avaliar se uma implementação está alinhada com o norte do produto

**Não precisa ler para:** fixes de bug, migrations simples, ajustes de UI pontuais.

### FUNNEL_MODELS.md
Documentação completa de todos os modelos de funil com jornadas, métricas, benchmarks reais e fases.
**Ler quando for:**
- Implementar features relacionadas a lançamento pago, meteórico, assinatura ou high ticket
- Trabalhar na Onda 2 (métricas específicas de lançamento pago)
- Criar wizard de criação de funil ou IA analista por modelo

**Não precisa ler para** fixes de bug ou ajustes em perpétuo/lançamento clássico que já funcionam.

### TRACKING.md
Arquitetura de tracking independente, atribuição e Decision Engine.
**⚠️ NADA disso foi implementado ainda — é planejamento de médio/longo prazo.**
Ler apenas quando for trabalhar em features relacionadas a:
- Rastreamento de sessão (cubo_session_id, SCK v2)
- Atribuição de conversões
- Reverse CAPI (envio de eventos para Meta/Google)
- Decision Engine (automação de campanhas)

**Não ler para** tarefas do dia a dia — o sistema atual usa `orders.utm_*` e `raw_sck` do webhook.

## Sistema de Design

Skills de design instaladas em `.claude/skills/`:
- `cubo-design` — identidade visual do projeto (cores, componentes, animações)
- `frontend-design` — skill oficial Anthropic para UI de qualidade

Ao criar ou refatorar qualquer componente visual, consultar a skill `cubo-design`
para paleta de cores, padrões de componente e regras de animação.
