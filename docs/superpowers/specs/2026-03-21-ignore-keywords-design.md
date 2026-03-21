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

**Note:** Verify no existing migration uses timestamp `20260321210000` before applying.

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
    return k.length > 0 && normalized.startsWith(k);
  });
}
```

Rules:
- Always case-insensitive (both text and keyword normalized via `toLowerCase`)
- Match: comment starts with the keyword (bare prefix — covers "INFO", "INFO quero saber", "INFO!")
- Note: very short keywords (< 2 chars) will produce false positives — enforced via UI warning

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

**Response:** Add `skipped` field to the existing return object. Current shape:
```typescript
{ success, processed, keywordClassified, aiProcessed, failed, total }
```
Updated shape:
```typescript
{ success, processed, keywordClassified, aiProcessed, skipped, failed, total }
```
Frontend toast reads `data.processed` — not affected. No UI change needed.

**No changes to sync functions** — skip check happens at process time, not sync time. This avoids fetching the KB during every sync.

---

## 4. UI: `AIKnowledgeBaseSettings.tsx`

New section added after the existing "Spam / Irrelevante" keywords section (line ~491).

**Visual style:** Badge cinza neutro (gray), distinguishable from the colored keyword sections.

**Label:** "Palavras em Automações"

**Description:** *"Comentários que começam com essas palavras serão completamente ignorados pela IA — sem classificação e sem impacto nas estatísticas. Use para gatilhos de automação como ManyChat (ex: INFO, QUERO, TESTE)."*

**Behavior:** Same add/remove chip UX as the other keyword fields. Saved to `ignore_keywords` column.

**UX note:** Add a subtle warning if the user adds a keyword shorter than 2 characters (e.g., "e", "a") — very short keywords will match almost every comment starting with that letter.

**Implementation notes for this component:**
- Add `ignore_keywords: string[]` to the `KnowledgeBase` interface (also fix the existing `praise_keywords?: string[]` to `praise_keywords: string[]` removing the cast)
- The `useEffect` that rehydrates `formData` from fetched KB must include `ignore_keywords: knowledgeBase.ignore_keywords ?? []`
- The `dataToSave` object inside `saveMutation.mutationFn` must explicitly include `ignore_keywords: formData.ignore_keywords ?? []`

**Interface update in component:**
```typescript
interface KnowledgeBase {
  // ... existing fields
  ignore_keywords: string[]  // new
}
```

Default value: `[]` (empty array).

---

## 5. Stats — Fix Required in `getStats`

The current formula is `processed = total - pending`. The `total` query has no filter on `ai_processing_status`, so `skipped` comments count in `total` but not in `pending` — causing them to silently inflate `processed`.

**Fix:** Add `.neq('ai_processing_status', 'skipped')` to the `totalRes` query in `getStats` so that `total` reflects only comments in the active pipeline (pending + processing + completed + failed). The `processed = total - pending` formula then remains correct.

```typescript
// getStats — totalRes query (line ~1266)
supabase.from('social_comments')
  .select('id', { count: 'exact', head: true })
  .eq('project_id', projectId)
  .eq('is_deleted', false)
  .eq('is_own_account', false)
  .neq('ai_processing_status', 'skipped')  // ADD THIS
```

---

## 6. TypeScript Types

Update `src/integrations/supabase/types.ts` — add `ignore_keywords: string[] | null` to `ai_knowledge_base` Row, Insert, and Update types.

---

## Out of Scope

- Retroactive reprocessing of comments already classified as spam via the old workaround (YAGNI — user can manually re-trigger AI on those if needed)
- Applying starts-with logic to existing keyword fields (commercial, praise, spam) — those remain unchanged
- Matching during sync time — happens at process_ai time only
