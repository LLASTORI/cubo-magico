# Palavras em Automações — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "ignore keywords" field to the Social Listening AI Base settings so that comments matching automation trigger words (e.g. ManyChat) are silently skipped by the AI — no classification, no stats impact.

**Architecture:** New column in `ai_knowledge_base`, checked in `process_ai` before any OpenAI call. Matching is starts-with + case-insensitive, applied only to this field. Existing keyword fields (commercial, praise, spam) are unchanged.

---

## 1. Database

Add column to `ai_knowledge_base`:
```sql
ALTER TABLE public.ai_knowledge_base
  ADD COLUMN IF NOT EXISTS ignore_keywords text[] DEFAULT '{}'::text[];
```

Migration file: `supabase/migrations/20260321210000_add_ignore_keywords.sql`

Also update TypeScript generated types (`src/integrations/supabase/types.ts`) to include `ignore_keywords: string[] | null`.

---

## 2. Matching Logic

**Function** (in `social-comments-api/index.ts`):
```typescript
function matchesIgnoreKeywords(text: string, keywords: string[]): boolean {
  if (!keywords.length) return false;
  const normalized = text.toLowerCase().trim();
  return keywords.some(kw => {
    const k = kw.toLowerCase().trim();
    return k.length > 0 && (normalized === k || normalized.startsWith(k + ' '));
  });
}
```

Rules:
- Always case-insensitive
- Match: comment equals keyword exactly OR comment starts with keyword followed by a space
- Example: keyword `"info"` matches `"INFO"`, `"info"`, `"info quero saber"`, `"Info!"` → wait, "Info!" starts with "info" but not "info " — handle via `normalized.startsWith(k)` without requiring space suffix, since punctuation variants are valid
- Revised: `normalized === k || normalized.startsWith(k)` — simpler and covers "INFO!", "INFO quero", "info"

**Revised function:**
```typescript
function matchesIgnoreKeywords(text: string, keywords: string[]): boolean {
  if (!keywords.length) return false;
  const normalized = text.toLowerCase().trim();
  return keywords.some(kw => {
    const k = kw.toLowerCase().trim();
    return k.length > 0 && normalized.startsWith(k);
  });
}
```

---

## 3. Edge Function: `social-comments-api`

**Where:** In the `process_ai` action, inside the per-comment loop, BEFORE the `classifyByKeywords()` call and BEFORE any OpenAI invocation.

**What:**
```typescript
// Check ignore keywords first
if (knowledgeBase?.ignore_keywords?.length &&
    matchesIgnoreKeywords(comment.text, knowledgeBase.ignore_keywords)) {
  await supabase
    .from('social_comments')
    .update({ ai_processing_status: 'skipped' })
    .eq('id', comment.id);
  skippedCount++;  // track separately for response
  continue;
}
```

**Response:** Include `skipped` count in the `process_ai` response alongside `processed` and `remaining`. Frontend toast already handles the response gracefully — no UI change needed for this.

**No changes to sync functions** — skip check happens at process time, not sync time. This avoids fetching the KB during every sync.

---

## 4. UI: `AIKnowledgeBaseSettings.tsx`

New section added after the existing "Spam / Irrelevante" keywords section (line ~491).

**Visual style:** Badge cinza neutro (gray), distinguishable from the colored keyword sections.

**Label:** "Palavras em Automações"

**Description:** *"Comentários que começam com essas palavras serão completamente ignorados pela IA — sem classificação e sem impacto nas estatísticas. Use para gatilhos de automação como ManyChat (ex: INFO, QUERO, TESTE)."*

**Behavior:** Same add/remove chip UX as the other keyword fields. Saved to `ignore_keywords` column.

**Interface update in component:**
```typescript
interface KnowledgeBase {
  // ... existing fields
  ignore_keywords: string[]  // new
}
```

Default value: `[]` (empty array).

---

## 5. Stats — No Change Needed

`getStats` counts `ai_processing_status = 'pending'` for the pending count. Comments marked `skipped` are already excluded. No changes needed to the stats query.

---

## 6. TypeScript Types

Update `src/integrations/supabase/types.ts` — add `ignore_keywords: string[] | null` to `ai_knowledge_base` Row, Insert, and Update types.

---

## Out of Scope

- Retroactive reprocessing of comments already classified as spam via the old workaround (YAGNI — user can manually re-trigger AI on those if needed)
- Applying starts-with logic to existing keyword fields (commercial, praise, spam) — those remain unchanged
- Matching during sync time — happens at process_ai time only
