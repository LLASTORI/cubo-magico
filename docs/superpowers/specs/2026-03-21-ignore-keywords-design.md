# Palavras em Automações — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an "ignore keywords" field to the Social Listening AI Base settings so that comments matching automation trigger words (e.g. ManyChat) are silently skipped by the AI — no classification, no stats impact — and hidden from the comments list by default with a toggle to reveal them.

**Architecture:** New column `ignore_keywords` in `ai_knowledge_base` + new column `is_automation` in `social_comments`. At `process_ai` time, matching comments are marked `ai_processing_status='skipped'` AND `is_automation=true`. The comments list hides `is_automation=true` by default, with a toggle "Ver respostas de automações" mirroring the existing "Ver respostas próprias" toggle. Existing keyword fields (commercial, praise, spam) are unchanged.

---

## 1. Database

Two columns in one migration file: `supabase/migrations/20260321210000_add_ignore_keywords.sql`

**Note:** Verify no existing migration uses timestamp `20260321210000` before applying.

```sql
-- Knowledge base: store ignore keywords
ALTER TABLE public.ai_knowledge_base
  ADD COLUMN IF NOT EXISTS ignore_keywords text[] DEFAULT '{}'::text[];

-- Comments: flag automation-triggered comments for filtering
ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS is_automation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_social_comments_automation
  ON public.social_comments(project_id, is_automation)
  WHERE is_automation = true;
```

Update TypeScript generated types (`src/integrations/supabase/types.ts`):
- `ai_knowledge_base`: add `ignore_keywords: string[] | null`
- `social_comments`: add `is_automation: boolean`

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
    .update({ ai_processing_status: 'skipped', is_automation: true })
    .eq('id', comment.id);
  skippedCount++;
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

## 5. Frontend: `useSocialListening.ts` + `SocialListeningTab.tsx`

### `useSocialListening.ts` — `useComments` filter

Add `showAutomation?: boolean` to the filters interface. Default behavior (when absent or `false`): add `.eq('is_automation', false)` to the query, mirroring the existing `showOwnAccount` pattern:

```typescript
if (!filters?.showAutomation) {
  query = query.eq('is_automation', false);
}
```

Also add `is_automation` to the `SocialComment` interface:
```typescript
is_automation: boolean;
```

### `SocialListeningTab.tsx` — toggle

Add a `showAutomation` state (default `false`) alongside the existing `showOwnAccount` state. Render a toggle "Ver respostas de automações" with the same UX as the existing "Ver respostas próprias" toggle. Pass `showAutomation` to `useComments`.

The two toggles are independent.

---

## 6. Stats — Fix Required in `getStats`

The current formula is `processed = total - pending`. The `total` query has no filter on `ai_processing_status`, so `skipped` comments count in `total` but not in `pending` — causing them to silently inflate `processed`.

**Fix:** Add `.neq('ai_processing_status', 'skipped')` to the `totalRes` query in `getStats` so that `total` reflects only comments in the active pipeline (pending + processing + completed + failed). The `processed = total - pending` formula then remains correct.

```typescript
// getStats — totalRes query (line ~1266)
supabase.from('social_comments')
  .select('id', { count: 'exact', head: true })
  .eq('project_id', projectId)
  .eq('is_deleted', false)
  .eq('is_own_account', false)
  .eq('is_automation', false)       // ADD THIS (excludes automation comments entirely from stats)
  .neq('ai_processing_status', 'skipped')  // ADD THIS (safety net for other skipped cases)
```

Also add `.eq('is_automation', false)` to `pendingRes`, `sentimentRes`, and `classificationRes` queries for full consistency.

---

## 7. TypeScript Types

Update `src/integrations/supabase/types.ts`:
- `ai_knowledge_base` Row/Insert/Update: add `ignore_keywords: string[] | null`
- `social_comments` Row/Insert/Update: add `is_automation: boolean`

---

## Out of Scope

- Retroactive reprocessing of comments already classified as spam via the old workaround (YAGNI — user can manually re-trigger AI on those if needed)
- Applying starts-with logic to existing keyword fields (commercial, praise, spam) — those remain unchanged
- Matching during sync time — happens at process_ai time only
