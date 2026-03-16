# TAGS AUDIT — Mapeamento Completo do Sistema de Tags

> Gerado em: 2026-03-16 | Sessão de auditoria — somente leitura, nenhuma alteração feita.

---

## Executive Summary

O sistema de tags do Cubo Mágico tem **dois subsistemas paralelos**:

1. **`crm_contacts.tags`** — array `text[]`, populado por surveys, CRM webhooks e automações. **Funciona bem.**
2. **`launch_tag`** — campo `text` em `funnels` e `crm_contact_interactions`. **Campo órfão** — definido mas nunca preenchido automaticamente pelo Hotmart webhook quando uma venda ocorre num lançamento.

---

## 1. Banco de Dados

### 1.1 Tabela principal: `crm_contacts.tags`

**Migration:** `supabase/migrations/20251212210224_51c4756b-933a-4c34-8b55-760ac62f7d9b.sql`

```sql
tags text[] DEFAULT '{}',
-- Índice GIN para queries eficientes:
CREATE INDEX idx_crm_contacts_tags ON public.crm_contacts USING GIN(tags);
```

Tags são um array PostgreSQL. Múltiplas tags por contato. Operações disponíveis: `contains` (AND) e `overlaps` (OR).

### 1.2 Tabela satélite: `crm_contact_interactions.launch_tag`

**Migration:** `supabase/migrations/20251213194634_86a48311-b7ba-4da3-8c98-58e6bee176f6.sql`

```sql
CREATE TABLE public.crm_contact_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id),
  interaction_type text DEFAULT 'page_view',
  page_name text,
  funnel_id uuid REFERENCES public.funnels(id),
  launch_tag text,   -- campo individual (não array)
  ...
);

CREATE INDEX idx_crm_contact_interactions_launch_tag ON public.crm_contact_interactions(launch_tag);
```

### 1.3 `funnels.launch_tag`

Adicionado pela mesma migration `20251213194634`:

```sql
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS launch_tag text;
```

Configurável via `LaunchConfigDialog.tsx`. É a "chave" que deveria ser copiada para interações e contatos quando uma venda ocorre — mas não é.

### 1.4 Resumo estrutural

| Tabela | Coluna | Tipo | Índice | Propósito |
|---|---|---|---|---|
| `crm_contacts` | `tags` | `text[]` | GIN | Tags genéricas do contato (survey, webhook, automação) |
| `crm_contact_interactions` | `launch_tag` | `text` | B-tree | Identifica qual lançamento originou a interação |
| `funnels` | `launch_tag` | `text` | — | Tag do lançamento (configurável no LaunchConfigDialog) |

### 1.5 Views e funções SQL

Nenhuma view agrega tags por contato ou por funil. Consultas diretas em `crm_contacts.tags` via operadores de array. `crm_contact_interactions` não tem view analítica própria.

---

## 2. Ingestão de Tags

### 2.1 Survey Webhook ✅ (tags) / ❌ (launch_tag)

**Arquivo:** `supabase/functions/survey-webhook/index.ts` linhas 127–222

Aplica tags corretamente ao criar/atualizar contatos:

```typescript
// Constrói array de tags:
const initialTags = [...surveyDefaultTags, ...webhookDefaultTags, autoTag];
if (funnelTag) initialTags.push(`funil:${funnel.name}`);

// Insere ou atualiza contato com tags
await supabase.from('crm_contacts').insert({ ..., tags: initialTags });
```

❌ **Problema:** Ao criar a interação, `launch_tag` NÃO é preenchido (linhas 202–222):

```typescript
await supabase.from('crm_contact_interactions').insert({
  contact_id: contact.id,
  project_id: projectId,
  funnel_id: survey.default_funnel_id,
  interaction_type: 'survey_response',
  // launch_tag: ← AUSENTE
});
```

### 2.2 CRM Webhook ✅

**Arquivo:** `supabase/functions/crm-webhook/index.ts` linhas 101–218

Suporte a múltiplos aliases de campo:

```typescript
'tag': 'tags',
'labels': 'tags',
'etiquetas': 'tags',
'launch_tag': 'launch_tag',
'tag_lancamento': 'launch_tag',
'lancamento': 'launch_tag',
```

Cria/atualiza contato com tags e cria interação com `launch_tag` se fornecido.

### 2.3 Hotmart Webhook ❌ (launch_tag nunca aplicado)

**Arquivo:** `supabase/functions/hotmart-webhook/index.ts` linhas 273–463

O webhook sincroniza vendas para `crm_contacts` mas **não implementa** lógica de tagging:

- Não lê `funnels.launch_tag` via `offer_mappings`
- Não adiciona `launch_tag` a `crm_contacts.tags`
- Não cria `crm_contact_interactions` com `launch_tag`

Este é o gap principal: compras em lançamentos via Hotmart não geram tags automáticas.

### 2.4 Automação Engine ✅

**Arquivo:** `supabase/functions/automation-engine/index.ts`

Suporte a action type `add_tag` — adiciona tags a `crm_contacts.tags` via workflow.

### 2.5 CSV Import

O CSV import (`supabase/functions/provider-csv-import/`) não aplica tags — foco é em `orders` e `ledger_events`.

---

## 3. Frontend — CRM

### 3.1 Hook: `useCRMContact.ts`

**Arquivo:** `src/hooks/useCRMContact.ts`

```typescript
// Interface:
tags: string[] | null;

// Lê direto de crm_contacts:
await supabase.from('crm_contacts').select('*').eq('id', contactId).single();

// Atualiza tags via mutation:
updateContact({ tags: [...novasTags] });
```

✅ Funcional — lê e escreve tags corretamente.

### 3.2 Componente: `KanbanFilters.tsx`

**Arquivo:** `src/components/crm/KanbanFilters.tsx` linhas 92–140

Extrai tags únicas dos contatos carregados e exibe como filtros. Suporte AND/OR via toggle.

✅ Tags exibidas e filtráveis no Kanban CRM — **desde que os contatos tenham tags**.

---

## 4. Frontend — Criação de Públicos Meta Ads

### 4.1 Hook: `useMetaAudiences.ts`

**Arquivo:** `src/hooks/useMetaAudiences.ts` linhas 87–104

```typescript
const { data: availableTags } = useQuery({
  queryKey: ['meta_audience_tags', projectId],
  queryFn: async () => {
    const { data } = await supabase.functions.invoke('meta-audience-api', {
      body: { action: 'get_available_tags', projectId },
    });
    return (data?.tags || []) as AvailableTag[];
  },
});
```

### 4.2 Edge Function: `meta-audience-api`

**Arquivo:** `supabase/functions/meta-audience-api/index.ts` linhas 160–196

```typescript
// Filtra por tags usando operadores de array PostgreSQL:
if (operator === 'AND') {
  query = query.contains('tags', tags)   // todos os itens do array presentes
} else {
  query = query.overlaps('tags', tags)   // ao menos um item presente
}
```

✅ Filtros funcionam — mas **só leem `crm_contacts.tags`**, não `crm_contact_interactions.launch_tag`.

❌ Contatos que compraram em lançamentos via Hotmart não têm `launch_tag` em `tags` → não aparecem nos filtros.

---

## 5. Diagnóstico

### 5.1 O que está funcionando

| Fluxo | Tags em crm_contacts | launch_tag em interactions |
|---|---|---|
| Survey → Contato | ✅ | ❌ |
| CRM Webhook | ✅ | ✅ (se fornecido) |
| Automação Engine | ✅ | — |
| Hotmart Webhook (compra) | ❌ | ❌ |
| Meta Audience API | Lê ✅ | Não lê |

### 5.2 O que está quebrado

**Gap 1 — Hotmart Webhook não aplica launch_tag:**
Quando um lead compra em um lançamento via Hotmart, o webhook sincroniza o contato em `crm_contacts` mas não busca a `launch_tag` do funil (`funnels.launch_tag` via `offer_mappings.funnel_id`) para adicioná-la ao contato.

**Gap 2 — Survey Webhook não propaga launch_tag para a interação:**
`survey-webhook` sabe o `funnel_id` do survey mas não consulta `funnels.launch_tag` para preencher `crm_contact_interactions.launch_tag`.

**Gap 3 — Meta Audience API não filtra por launch_tag:**
O sistema de públicos só lê `crm_contacts.tags` (array). Não tem caminho para filtrar por `crm_contact_interactions.launch_tag`. Mesmo que os dois gaps acima fossem corrigidos, o filtro no Meta Audiences ainda não enxergaria `launch_tag` diretamente — a menos que a tag seja duplicada em `crm_contacts.tags`.

---

## 6. Plano de Correção

### Prioridade 1 — Quick win: Survey Webhook propaga launch_tag (baixo esforço)

**Arquivo:** `supabase/functions/survey-webhook/index.ts` linhas 202–222

Buscar `funnels.launch_tag` quando `survey.default_funnel_id` está presente e incluir na inserção de `crm_contact_interactions`:

```typescript
if (survey.default_funnel_id) {
  const { data: funnel } = await supabase
    .from('funnels')
    .select('launch_tag')
    .eq('id', survey.default_funnel_id)
    .single();

  await supabase.from('crm_contact_interactions').insert({
    contact_id: contact.id,
    project_id: projectId,
    funnel_id: survey.default_funnel_id,
    interaction_type: 'survey_response',
    launch_tag: funnel?.launch_tag || null,  // ← adicionar
    ...
  });
}
```

**Esforço:** ~5 linhas. Deploy simples.

---

### Prioridade 2 — Hotmart Webhook aplica launch_tag ao contato (médio esforço)

**Arquivo:** `supabase/functions/hotmart-webhook/index.ts`

Quando uma venda é processada:
1. Buscar `offer_mappings.funnel_id` pela `provider_offer_id` da venda
2. Buscar `funnels.launch_tag` pelo `funnel_id`
3. Se encontrar, adicionar `launch_tag` ao array `crm_contacts.tags` (evitar duplicatas)

**Consideração importante:** O Hotmart webhook é a fonte de verdade financeira — **não alterar** a lógica de `orders`/`ledger_events`. A lógica de tag é um efeito colateral CRM independente.

**Esforço:** Médio — requer join em `offer_mappings` + `funnels` + update do array no contato.

---

### Prioridade 3 — Meta Audience API filtra por launch_tag (alto esforço)

**Abordagem recomendada:** Ao corrigir o gap do Hotmart Webhook (Prioridade 2), adicionar a `launch_tag` ao array `crm_contacts.tags` com um prefixo padronizado (ex: `lancamento:BLACK_FRIDAY_2025`). Assim o Meta Audience API existente passa a enxergar a tag sem precisar de alterações.

**Alternativa:** Criar nova RPC `get_contacts_by_launch_tag(project_id, launch_tag)` que busca via `crm_contact_interactions.launch_tag`. Mais cirúrgico mas requer mudança na edge function.

---

### Ordem de execução recomendada

1. **Survey Webhook** — fix imediato, sem risco
2. **Hotmart Webhook** — fix mais impactante; ao usar prefixo `lancamento:` no array `tags`, resolve também a Prioridade 3 sem custo extra
3. **Meta Audience API** — valida após Prioridade 2; só implementar RPC adicional se necessário

---

## 7. Arquivos críticos de referência

| Arquivo | Linhas relevantes | Papel |
|---|---|---|
| `supabase/migrations/20251212210224_...sql` | linha com `tags text[]` | Define crm_contacts.tags |
| `supabase/migrations/20251213194634_...sql` | CREATE TABLE crm_contact_interactions | Define launch_tag |
| `supabase/functions/survey-webhook/index.ts` | 127–222 | Tags em surveys (gap: launch_tag) |
| `supabase/functions/hotmart-webhook/index.ts` | 273–463 | Compras Hotmart (gap: sem tags) |
| `supabase/functions/crm-webhook/index.ts` | 101–218 | CRM genérico (funciona) |
| `supabase/functions/meta-audience-api/index.ts` | 160–196 | Filtro por tags (só lê array) |
| `src/hooks/useCRMContact.ts` | — | CRUD de contato + tags |
| `src/components/crm/KanbanFilters.tsx` | 92–140 | Filtros do Kanban por tag |
| `src/hooks/useMetaAudiences.ts` | 87–104 | Fetch tags disponíveis para públicos |
| `src/components/launch/LaunchConfigDialog.tsx` | 44, 74 | Edição de launch_tag no funil |
