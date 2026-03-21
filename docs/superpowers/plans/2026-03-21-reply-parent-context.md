# Reply Parent Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sempre mostrar o contexto do comentário pai nos replies do Social Listening — mesmo quando o pai está filtrado, fora do batch carregado, ou deletado da Meta.

**Architecture:** Snapshot denormalizado. Durante o sync, salvar `parent_text` e `parent_author` diretamente na linha do reply — os dados do pai já estão disponíveis em memória nesse momento (Meta retorna replies aninhados no próprio comentário pai). No frontend, usar o snapshot do banco como fonte primária, com fallback para o `commentsByMetaId` lookup existente (retrocompatibilidade). Backfill via self-join no banco para dados existentes.

**Tech Stack:** Supabase PostgreSQL (migration), Deno Edge Function (`social-comments-api`), React + TypeScript (`useSocialListening.ts`, `SocialListeningTab.tsx`)

---

## Arquivos

| Operação | Arquivo |
|---|---|
| Create | `supabase/migrations/20260321130000_add_parent_snapshot_to_social_comments.sql` |
| Modify | `supabase/functions/social-comments-api/index.ts` — função `buildCommentRow` (linha 809) e chamadas no loop de sync |
| Modify | `src/hooks/useSocialListening.ts` — interface `SocialComment` (linha 28) |
| Modify | `src/components/meta/social-listening/SocialListeningTab.tsx` — `CommentRow` (linha 677) |

---

### Task 1: Migration — adicionar colunas `parent_text` e `parent_author`

**Arquivo:** `supabase/migrations/20260321130000_add_parent_snapshot_to_social_comments.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Adiciona snapshot denormalizado do comentário pai nos replies
-- Isso garante que o contexto do pai seja sempre exibível, mesmo que o pai
-- esteja fora do batch carregado, filtrado, ou deletado da Meta.

ALTER TABLE social_comments
  ADD COLUMN IF NOT EXISTS parent_text text,
  ADD COLUMN IF NOT EXISTS parent_author text;

-- Backfill: popula parent_text e parent_author para replies existentes
-- via self-join usando parent_meta_id = comment_id_meta (mesma plataforma e projeto)
UPDATE social_comments AS reply
SET
  parent_text   = parent.text,
  parent_author = parent.author_username
FROM social_comments AS parent
WHERE reply.parent_meta_id IS NOT NULL
  AND reply.parent_meta_id = parent.comment_id_meta
  AND reply.project_id     = parent.project_id
  AND reply.platform       = parent.platform
  AND reply.parent_text    IS NULL;  -- só atualiza quem ainda não tem snapshot
```

- [ ] **Step 2: Aplicar a migration via Supabase MCP**

Usar `mcp__supabase__apply_migration` com o conteúdo acima.

- [ ] **Step 3: Verificar no banco**

Executar:
```sql
SELECT COUNT(*) FROM social_comments WHERE parent_meta_id IS NOT NULL;
SELECT COUNT(*) FROM social_comments WHERE parent_meta_id IS NOT NULL AND parent_text IS NOT NULL;
```

Esperado: segundo count ≤ primeiro (nem todos os pais existem no banco — tudo bem).

- [ ] **Step 4: Commitar o arquivo de migration**

```bash
git add supabase/migrations/20260321130000_add_parent_snapshot_to_social_comments.sql
git commit -m "feat: adiciona parent_text e parent_author em social_comments com backfill"
```

---

### Task 2: Edge function — salvar snapshot no `buildCommentRow`

**Arquivo:** `supabase/functions/social-comments-api/index.ts`

**Contexto:** `buildCommentRow` é chamado em dois momentos:
1. Comentários principais (sem pai): `buildCommentRow(projectId, post.id, platform, comment, null, ...)`
2. Replies (com pai): `buildCommentRow(projectId, post.id, platform, reply, comment.id, ...)` — o objeto `comment` (pai) está disponível aqui

**O que mudar:**

**a) Assinatura da função — adicionar `parentComment` como novo parâmetro:**

Localizar (linha 809):
```typescript
function buildCommentRow(
  projectId: string,
  postId: string,
  platform: string,
  comment: any,
  parentId: string | null,
  ownAccountFbPageIds: Set<string>,
  ownAccountIgUsernames: Set<string>,
  crmContactMap: Map<string, string>,
  contactNameMap?: Map<string, string>,
): any {
```

Substituir por:
```typescript
function buildCommentRow(
  projectId: string,
  postId: string,
  platform: string,
  comment: any,
  parentId: string | null,
  ownAccountFbPageIds: Set<string>,
  ownAccountIgUsernames: Set<string>,
  crmContactMap: Map<string, string>,
  contactNameMap?: Map<string, string>,
  parentComment?: any | null,
): any {
```

**b) Retorno da função — adicionar `parent_text` e `parent_author`:**

Localizar (linha 842, dentro do `return {`):
```typescript
  return {
    project_id: projectId,
    post_id: postId,
    platform,
    comment_id_meta: comment.id,
    parent_comment_id: null,
    parent_meta_id: parentId || null,
```

Substituir por:
```typescript
  const parentText = parentComment
    ? (platform === 'instagram' ? parentComment.text : parentComment.message) ?? null
    : null
  const parentAuthor = parentComment
    ? (platform === 'instagram' ? parentComment.username : parentComment.from?.name) ?? null
    : null

  return {
    project_id: projectId,
    post_id: postId,
    platform,
    comment_id_meta: comment.id,
    parent_comment_id: null,
    parent_meta_id: parentId || null,
    parent_text: parentText,
    parent_author: parentAuthor,
```

**c) Chamadas no loop de sync — passar o objeto pai:**

Há exatamente **dois** loops de replies que precisam ser atualizados:

**Loop 1 — sync orgânico (linha 769):**
```typescript
// ANTES
for (const reply of comment.replies.data) {
  commentRows.push(buildCommentRow(projectId, post.id, post.platform, reply, comment.id, ownAccountFbPageIds, ownAccountIgUsernames, crmContactMap, contactNameMap))
}
```
```typescript
// DEPOIS
for (const reply of comment.replies.data) {
  commentRows.push(buildCommentRow(projectId, post.id, post.platform, reply, comment.id, ownAccountFbPageIds, ownAccountIgUsernames, crmContactMap, contactNameMap, comment))
}
```

**Loop 2 — sync de ads Instagram (linha 1539):**
```typescript
// ANTES
allCommentRows.push(buildCommentRow(projectId, postId, 'instagram', reply, c.id, ownAccountFbPageIds, ownAccountIgUsernames, new Map(), new Map()))
```
```typescript
// DEPOIS
allCommentRows.push(buildCommentRow(projectId, postId, 'instagram', reply, c.id, ownAccountFbPageIds, ownAccountIgUsernames, new Map(), new Map(), c))
```

As chamadas nas linhas 765, 1511 e 1532 passam `null` como `parentId` (comentários principais, sem pai) — não precisam ser alteradas.

- [ ] **Step 1: Aplicar as 3 alterações acima**

- [ ] **Step 2: Verificar que não há erro de TypeScript/Deno**

```bash
cd supabase/functions/social-comments-api && deno check index.ts 2>&1 | head -20
```

Esperado: sem erros.

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy social-comments-api
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/social-comments-api/index.ts
git commit -m "feat: salva parent_text e parent_author no sync de replies"
```

---

### Task 3: Frontend — interface TypeScript e lógica de exibição

**Arquivos:**
- `src/hooks/useSocialListening.ts` — interface `SocialComment`
- `src/components/meta/social-listening/SocialListeningTab.tsx` — `CommentRow`

#### 3a — `useSocialListening.ts`: adicionar campos na interface

Localizar (linha ~52, após `crm_contact_id`):
```typescript
  crm_contact_id: string | null;
  // New reply fields
  ai_suggested_reply: string | null;
```

Substituir por:
```typescript
  crm_contact_id: string | null;
  parent_text: string | null;
  parent_author: string | null;
  // New reply fields
  ai_suggested_reply: string | null;
```

#### 3b — `SocialListeningTab.tsx`: usar snapshot como fonte primária

Localizar (linha 677):
```typescript
  const parentComment = comment.parent_meta_id ? (commentsByMetaId.get(comment.parent_meta_id) ?? null) : null;
```

Substituir por:
```typescript
  // Usa snapshot denormalizado (sempre disponível, mesmo pai filtrado/fora do batch).
  // Fallback para lookup em memória para comentários antigos sem snapshot.
  const parentPreview: { text: string; author: string | null } | null = (() => {
    if (!comment.parent_meta_id) return null;
    if (comment.parent_text) {
      return { text: comment.parent_text, author: comment.parent_author };
    }
    const parentFromMap = commentsByMetaId.get(comment.parent_meta_id);
    if (parentFromMap) {
      return { text: parentFromMap.text, author: parentFromMap.author_username ?? null };
    }
    return null;
  })();
```

Localizar (linha ~787, o bloco de renderização do pai):
```tsx
          {parentComment && (
            <div className="flex items-start gap-1 mb-1.5 pl-2 border-l-2 border-muted">
              <Reply className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground line-clamp-1">
                <span className="font-medium">@{parentComment.author_username || 'Anônimo'}</span>
                {': '}
                {parentComment.text}
              </p>
            </div>
          )}
```

Substituir por:
```tsx
          {parentPreview && (
            <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 bg-muted/30 border-l-2 border-primary/30 rounded-r-sm">
              <Reply className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium text-foreground/70">@{parentPreview.author || 'Anônimo'}</span>
                {': '}
                {parentPreview.text}
              </p>
            </div>
          )}
```

- [ ] **Step 1: Aplicar alterações em `useSocialListening.ts`**
- [ ] **Step 2: Aplicar alterações em `SocialListeningTab.tsx`**
- [ ] **Step 3: Build**

```bash
npm run build
```

Esperado: zero erros TypeScript.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useSocialListening.ts src/components/meta/social-listening/SocialListeningTab.tsx
git commit -m "feat: exibe contexto do comentário pai nos replies usando snapshot denormalizado"
```

---

### Task 4: Atualizar TASKS.md e debug_log.md

- [ ] **Step 1: Mover tarefa no TASKS.md**

Em `TASKS.md`, remover de `🔴 Próxima sessão`:
```
- [ ] **Contexto do comentário pai nos replies**
  - Replies aparecem isolados na lista sem mostrar ao que estão respondendo
  - Médio esforço — requer segunda passagem para resolver `parent_comment_id` ou exibição inline
```

Adicionar em `✅ Concluído` (topo da seção):
```
### 💬 Social Listening — contexto do comentário pai nos replies (21/03/2026 — sessão 24)
- [x] Migration: `parent_text` + `parent_author` em `social_comments` com backfill
- [x] Edge function: snapshot salvo no sync de replies (Facebook + Instagram)
- [x] Frontend: snapshot como fonte primária, fallback para lookup em memória
- [x] Deploy: `social-comments-api` atualizada
```

- [ ] **Step 2: Atualizar debug_log.md**

Adicionar entrada no topo do debug_log:
```
### [2026-03-21] Social Listening — contexto do comentário pai — ✅ CONCLUÍDO (sessão 24)

Abordagem: snapshot denormalizado. Durante o sync, `parent_text` e `parent_author` são copiados
para a linha do reply — dados disponíveis em memória pois Meta retorna replies aninhados no pai.
No frontend, snapshot tem prioridade; fallback para `commentsByMetaId` para dados históricos.
Backfill: self-join `parent_meta_id = comment_id_meta` para replies existentes.
```

- [ ] **Step 3: Commit**

```bash
git add TASKS.md debug_log.md
git commit -m "chore: registra contexto do comentário pai como concluído"
```
