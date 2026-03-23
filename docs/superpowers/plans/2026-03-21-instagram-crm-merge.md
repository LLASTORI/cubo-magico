# Instagram CRM Merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-mesclar shadow profiles (criados por social listening) com contatos ricos (email) quando o Instagram é fornecido via survey ou quiz — em ambas as direções.

**Architecture:** Uma função PostgreSQL `merge_instagram_shadow(project_id, instagram_handle, target_contact_id)` centraliza toda lógica de merge. Ao receber o Instagram de um usuário em qualquer ponto de entrada (survey-webhook, quiz-public-complete), chamamos esse RPC imediatamente após atualizar o contato. A função busca shadow profiles com aquele handle, transfere os `social_comments` para o contato rico e deleta o shadow. A direção reversa (rico comenta → já está coberta) já funciona em `linkExistingCommentsToCRM` quando o contato tem `instagram` populado.

**Tech Stack:** PostgreSQL (Supabase RPC), Deno Edge Functions, `supabase-js@2`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/20260321200000_add_merge_instagram_shadow.sql` | CREATE | RPC + índice |
| `supabase/functions/survey-webhook/index.ts` | MODIFY | Chamar RPC após atualizar instagram |
| `supabase/functions/quiz-public-complete/index.ts` | MODIFY | Chamar RPC após salvar contato com instagram |

---

## Task 1: Migration — RPC `merge_instagram_shadow` + índice

**Files:**
- Create: `supabase/migrations/20260321200000_add_merge_instagram_shadow.sql`

**Contexto crítico:**
- Shadow profiles têm `source = 'social_listing'` (typo histórico — é assim no DB)
- Os campos que precisam ser transferidos: `social_comments.crm_contact_id` e `social_comments.contact_id`
- Tags devem ser mescladas (union sem duplicatas)
- Pode haver mais de um shadow para o mesmo handle — merge todos
- O índice existente `idx_crm_contacts_instagram` foi criado e dropado anteriormente — recriar

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260321200000_add_merge_instagram_shadow.sql

-- Index para busca eficiente por instagram handle
CREATE INDEX IF NOT EXISTS idx_crm_contacts_instagram
  ON crm_contacts(project_id, lower(instagram))
  WHERE instagram IS NOT NULL;

-- RPC de merge: dado um handle de instagram, funde todos os shadow profiles
-- encontrados naquele projeto com o contato-alvo (rico).
--
-- Shadow profiles são identificados por source = 'social_listing' (typo histórico).
-- O que é transferido: social_comments (crm_contact_id + contact_id), tags (union).
-- O shadow é deletado após o merge.
--
-- Retorna: jsonb com merged=true/false, shadow_ids[], comments_transferred
CREATE OR REPLACE FUNCTION merge_instagram_shadow(
  p_project_id     uuid,
  p_instagram      text,   -- handle normalizado (sem @, lowercase)
  p_target_id      uuid    -- contato rico que recebe os dados
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shadow_ids   uuid[];
  v_comments_transferred int := 0;
  v_handle_norm  text;
BEGIN
  v_handle_norm := lower(trim(regexp_replace(p_instagram, '^@+', '')));

  IF v_handle_norm = '' THEN
    RETURN jsonb_build_object('merged', false, 'reason', 'empty_handle');
  END IF;

  -- Coletar todos os shadow profiles com esse instagram (exceto o próprio target)
  SELECT array_agg(id) INTO v_shadow_ids
  FROM crm_contacts
  WHERE project_id = p_project_id
    AND source = 'social_listing'
    AND lower(trim(regexp_replace(instagram, '^@+', ''))) = v_handle_norm
    AND id <> p_target_id;

  IF v_shadow_ids IS NULL OR array_length(v_shadow_ids, 1) = 0 THEN
    RETURN jsonb_build_object('merged', false, 'reason', 'no_shadow_found');
  END IF;

  -- Transferir social_comments dos shadows para o contato rico
  UPDATE social_comments
  SET crm_contact_id = p_target_id,
      contact_id     = p_target_id
  WHERE project_id = p_project_id
    AND crm_contact_id = ANY(v_shadow_ids);

  GET DIAGNOSTICS v_comments_transferred = ROW_COUNT;

  -- Mesclar tags (union sem duplicatas)
  UPDATE crm_contacts AS target
  SET tags = (
    SELECT array_agg(DISTINCT tag ORDER BY tag)
    FROM (
      SELECT unnest(COALESCE(target.tags, '{}')) AS tag
      UNION
      SELECT unnest(COALESCE(shadow.tags, '{}')) AS tag
      FROM crm_contacts shadow
      WHERE shadow.id = ANY(v_shadow_ids)
    ) all_tags
  )
  WHERE target.id = p_target_id;

  -- Atualizar instagram no contato rico (caso ainda não tenha)
  UPDATE crm_contacts
  SET instagram = v_handle_norm,
      updated_at = now()
  WHERE id = p_target_id
    AND (instagram IS NULL OR instagram = '');

  -- Deletar shadows (social_comments já foram transferidos)
  DELETE FROM crm_contacts
  WHERE id = ANY(v_shadow_ids);

  RETURN jsonb_build_object(
    'merged',               true,
    'shadow_ids',           v_shadow_ids,
    'comments_transferred', v_comments_transferred
  );
END;
$$;

-- Permissão para service_role chamar via RPC
GRANT EXECUTE ON FUNCTION merge_instagram_shadow(uuid, text, uuid) TO service_role;
```

- [ ] **Step 2: Aplicar a migration via MCP Supabase**

Use `mcp__supabase__apply_migration` com:
- `name`: `add_merge_instagram_shadow`
- `query`: conteúdo SQL acima

- [ ] **Step 3: Verificar que a função existe**

Execute no SQL Editor:
```sql
SELECT proname, prosrc IS NOT NULL as has_body
FROM pg_proc
WHERE proname = 'merge_instagram_shadow';
```
Esperado: 1 linha, `has_body = true`

- [ ] **Step 4: Verificar que o índice existe**

```sql
SELECT indexname FROM pg_indexes
WHERE tablename = 'crm_contacts'
  AND indexname = 'idx_crm_contacts_instagram';
```
Esperado: 1 linha

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260321200000_add_merge_instagram_shadow.sql
git commit -m "feat: add merge_instagram_shadow RPC + index para mescla de shadow profiles"
```

---

## Task 2: Hook no `survey-webhook` — merge após captura de instagram

**Files:**
- Modify: `supabase/functions/survey-webhook/index.ts` (~linha 363)

**Contexto:**
- O survey-webhook já atualiza `crm_contacts` com `contactUpdates[fieldName] = fieldValue` quando `question_type = 'identity_field'` e `identity_field_target = 'instagram'`
- Precisamos chamar `merge_instagram_shadow` APÓS esse `UPDATE` (linha ~364-373)
- O handle já vem normalizado (sem `@`) pelo bloco existente na linha 333-335
- Usar `supabase` (não `serviceSupabase`) — já tem service role key nessa função
- O RPC não deve falhar o webhook se der erro — usar `try/catch` e apenas logar

**Onde inserir:** após o bloco `if (Object.keys(contactUpdates).length > 0)` (linha ~364):

```typescript
// --- INSTAGRAM MERGE ---
// Se instagram foi atualizado, mesclar shadow profiles (social_listening)
// que tenham o mesmo handle neste projeto.
if (contactUpdates.instagram) {
  try {
    const { data: mergeResult, error: mergeError } = await supabase.rpc(
      'merge_instagram_shadow',
      {
        p_project_id: projectId,
        p_instagram:  contactUpdates.instagram,
        p_target_id:  contact.id,
      }
    );
    if (mergeError) {
      console.error('[SurveyWebhook] merge_instagram_shadow error:', mergeError.message);
    } else {
      console.log('[SurveyWebhook] merge_instagram_shadow result:', JSON.stringify(mergeResult));
    }
  } catch (e: any) {
    console.error('[SurveyWebhook] merge_instagram_shadow exception:', e.message);
  }
}
```

- [ ] **Step 1: Ler o arquivo atual para encontrar a posição exata**

Ler `supabase/functions/survey-webhook/index.ts` linhas 360-395.

- [ ] **Step 2: Inserir o bloco de merge após o update do contacto**

O código existente termina em:
```typescript
  // Update contact if needed
  if (Object.keys(contactUpdates).length > 0) {
    await supabase
      .from('crm_contacts')
      .update({
        ...contactUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', contact.id);
  }
```

Inserir o bloco `// --- INSTAGRAM MERGE ---` imediatamente após o fechamento do `if`.

- [ ] **Step 3: Deploy da survey-webhook**

```bash
supabase functions deploy survey-webhook
```

- [ ] **Step 4: Teste manual**

Verificar nos logs da edge function (Supabase Dashboard → Edge Functions → survey-webhook → Logs) que quando uma pesquisa contém campo `identity_field_target=instagram` e o contato tem shadow profile, o log `[SurveyWebhook] merge_instagram_shadow result: {"merged":true,...}` aparece.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/survey-webhook/index.ts
git commit -m "feat: mesclar shadow profiles instagram ao capturar handle via survey"
```

---

## Task 3: Hook no `quiz-public-complete` — merge após captura de instagram

**Files:**
- Modify: `supabase/functions/quiz-public-complete/index.ts` (~linha 668-698)

**Contexto:**
- O quiz atualiza o contato com `instagram: contact_data.instagram || undefined` (linha ~675)
- Tanto o path de contato existente (update) quanto o path de novo contato (insert) podem receber instagram
- Precisamos chamar o merge APÓS o upsert do contato, se `contact_data.instagram` foi fornecido
- O `contactId` é resolvido em ambos os paths — inserir o bloco depois que `contactId` é conhecido e `contact_data.instagram` não é nulo
- `session.project_id` é o project ID

**Bloco a inserir após a linha ~698 (`} // fim do if existingContact / else`):**

```typescript
// --- INSTAGRAM MERGE ---
// Se o quiz capturou instagram e temos o contactId, mesclar shadow profiles
if (contactId && contact_data.instagram) {
  try {
    const igHandle = String(contact_data.instagram)
      .toLowerCase()
      .trim()
      .replace(/^@+/, '');

    if (igHandle) {
      const { data: mergeResult, error: mergeError } = await supabase.rpc(
        'merge_instagram_shadow',
        {
          p_project_id: session.project_id,
          p_instagram:  igHandle,
          p_target_id:  contactId,
        }
      );
      if (mergeError) {
        console.error('[QuizComplete] merge_instagram_shadow error:', mergeError.message);
      } else {
        console.log('[QuizComplete] merge_instagram_shadow result:', JSON.stringify(mergeResult));
      }
    }
  } catch (e: any) {
    console.error('[QuizComplete] merge_instagram_shadow exception:', e.message);
  }
}
```

- [ ] **Step 1: Ler o arquivo atual para confirmar posição exata**

Ler `supabase/functions/quiz-public-complete/index.ts` linhas 695-730.

- [ ] **Step 2: Inserir o bloco de merge após a resolução do contactId**

O código termina o bloco de identificação de contato com:
```typescript
      }
    }
  }

  if (contactId && contactId !== session.contact_id) {
```
Inserir o bloco `// --- INSTAGRAM MERGE ---` entre o `}` de fechamento do `if (contact_data?.email)` e o `if (contactId && contactId !== session.contact_id)`.

- [ ] **Step 3: Deploy da quiz-public-complete**

```bash
supabase functions deploy quiz-public-complete
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/quiz-public-complete/index.ts
git commit -m "feat: mesclar shadow profiles instagram ao capturar handle via quiz"
```

---

## Verificação final

- [ ] Verificar nos Logs do Supabase que o RPC é chamado sem erros após um survey com campo instagram
- [ ] Confirmar via SQL que shadow profiles com `source='social_listing'` não ficam órfãos após merge:

```sql
-- Não deve retornar contatos com instagram duplicado (shadow + rico) no mesmo projeto
SELECT instagram, count(*) as total
FROM crm_contacts
WHERE project_id = 'SEU_PROJECT_ID'
  AND instagram IS NOT NULL
GROUP BY instagram
HAVING count(*) > 1;
```

- [ ] Atualizar `TASKS.md` — mover "Instagram merge" para ✅ Concluído
- [ ] Commit final de documentação se necessário
