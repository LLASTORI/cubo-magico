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
- `ledger_events` — decomposição financeira em BRL; rastreia conversão para moedas estrangeiras

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
| Vendas | `hotmart-webhook`, `hotmart-backfill`, `hotmart-ledger-*` |
| Meta Ads | `meta-insights-cron`, `meta-oauth-*`, `meta-hierarchy-cron` |
| Quiz/Survey | `quiz-public-*`, `quiz-copilot`, `survey-public` |
| Automações | `automation-engine`, `whatsapp-webhook`, `evolution-api` |
| Exports | `export-csv-utf8`, `export-orders-sql`, `export-contacts-sql` |

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
**DEBUG** Sempre atualizar o aquivo debug_log.md quando houver alterações no sistema
