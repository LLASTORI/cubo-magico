# Meta Audience Full Match Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restaurar o sync de Meta Audiences (atualmente quebrado por schema divergência) e expandir os dados enviados de 2 para 9 campos PII para maximizar o match rate.

**Architecture:** Duas partes independentes mas sequencialmente dependentes: (1) Migration SQL que adiciona `email_hash` e `phone_hash` de volta à `meta_audience_contacts` (dropadas em migration anterior) e corrige o `status` tracking; (2) Correção + expansão da edge function `meta-audience-api` para refletir o schema real da tabela e enviar todos os campos disponíveis ao Meta. Nenhuma mudança de frontend.

**Root Cause:** Migration `20260303234736_remote_commit.sql` dropou todas as colunas de hash e `removed_at` de `meta_audience_contacts`. O código da edge function ainda referencia essas colunas → qualquer sync atual falha silenciosamente (query retorna erro ignorado ou crash). A expansão do schema aproveita o fix obrigatório.

**Tech Stack:** Deno, Supabase Edge Functions, TypeScript, Meta Graph API v19.0, PostgreSQL.

---

## Estado atual da tabela `meta_audience_contacts`

```
id         uuid NOT NULL
audience_id uuid NOT NULL
contact_id  uuid NOT NULL
added_at    timestamptz nullable
status      text nullable
created_at  timestamptz NOT NULL
```

Colunas ausentes que o código ainda referencia: `email_hash`, `phone_hash`, `first_name_hash`, `last_name_hash`, `removed_at`

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/TIMESTAMP_fix_meta_audience_contacts.sql` | Adicionar `email_hash`, `phone_hash` de volta; sem `removed_at` (usar `status`) |
| `supabase/functions/meta-audience-api/index.ts` | Corrigir 3 blocos quebrados + expandir schema para 9 campos |

---

## Chunk 1: Migration — restaurar colunas de hash

### Task 1: Criar e aplicar migration

**Files:**
- Create: `supabase/migrations/20260316200000_fix_meta_audience_contacts_hashes.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Criar o arquivo `supabase/migrations/20260316200000_fix_meta_audience_contacts_hashes.sql` com:

```sql
-- Restaura colunas de hash removidas em migration anterior
-- Necessário para o sync Meta Audiences funcionar corretamente
-- Nota: removed_at foi dropada; usamos status='removed' para rastrear remoção

ALTER TABLE public.meta_audience_contacts
  ADD COLUMN IF NOT EXISTS email_hash text,
  ADD COLUMN IF NOT EXISTS phone_hash text;
```

- [ ] **Step 2: Aplicar a migration**

Via `mcp__supabase__apply_migration` com:
- name: `fix_meta_audience_contacts_hashes`
- query: o SQL acima

- [ ] **Step 3: Confirmar colunas no banco**

Via `mcp__supabase__execute_sql`:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'meta_audience_contacts'
ORDER BY ordinal_position;
```

Esperado: 8 colunas — `id, audience_id, contact_id, added_at, status, created_at, email_hash, phone_hash`.

- [ ] **Step 4: Commit da migration**

```bash
cd "C:\Users\Leandro Desk\Documents\GitHub\cubomagicoleandrolastoricombr"
git add supabase/migrations/20260316200000_fix_meta_audience_contacts_hashes.sql
git commit -m "fix: restaura email_hash e phone_hash em meta_audience_contacts"
```

---

## Chunk 2: Edge function — corrigir e expandir

### Task 2: Corrigir 3 blocos quebrados + expandir schema

**Files:**
- Modify: `supabase/functions/meta-audience-api/index.ts`

**Contexto — 3 blocos que precisam de correção:**

**Bloco A (linhas ~827–831) — "Get previously synced contacts":**
```typescript
// QUEBRADO: selects email_hash, phone_hash (não existem mais); usa removed_at (não existe)
const { data: syncedContacts } = await serviceSupabase
  .from('meta_audience_contacts')
  .select('contact_id, email_hash, phone_hash')
  .eq('audience_id', audienceId)
  .is('removed_at', null)
```

**Bloco B (linhas ~860–930) — "Hash and send new contacts":**
```typescript
// INCOMPLETO: schema mínimo EMAIL+PHONE; não armazena hashes no contactRecords
const schema = ['EMAIL', 'PHONE']
```

**Bloco C (linhas ~933–947) — "Remove contacts from Meta":**
```typescript
// QUEBRADO: selects first_name_hash, last_name_hash (não existem mais)
.select('contact_id, email_hash, phone_hash, first_name_hash, last_name_hash')
// E depois marca removed_at (não existe mais):
.update({ removed_at: new Date().toISOString() })
```

---

- [ ] **Step 1: Ler o arquivo para confirmar linhas exatas**

Leia `supabase/functions/meta-audience-api/index.ts` com `offset: 824, limit: 130` para confirmar os números de linha dos 3 blocos antes de editar.

- [ ] **Step 2: Corrigir Bloco A — sync query**

Localizar (linhas ~827–831):
```typescript
    const { data: syncedContacts } = await serviceSupabase
      .from('meta_audience_contacts')
      .select('contact_id, email_hash, phone_hash')
      .eq('audience_id', audienceId)
      .is('removed_at', null)
```

Substituir por:
```typescript
    const { data: syncedContacts } = await serviceSupabase
      .from('meta_audience_contacts')
      .select('contact_id, email_hash, phone_hash')
      .eq('audience_id', audienceId)
      .neq('status', 'removed')
```

- [ ] **Step 3: Substituir Bloco B — expandir schema para 9 campos**

Localizar (linhas ~860–929 — do comentário até o fechamento do `if (contactsToAdd.length > 0)`):
```typescript
    // Hash and send new contacts to Meta
    // IMPORTANTE: para evitar estouro de CPU em listas grandes, usamos um schema mínimo (EMAIL + PHONE).
    if (contactsToAdd.length > 0) {
      const schema = ['EMAIL', 'PHONE']
      const hashedData: string[][] = []
      const contactRecords: any[] = []

      for (const contact of contactsToAdd) {
        const emailHash = contact.email ? await sha256(normalizeEmail(contact.email)) : ''
        const phoneHash = contact.phone
          ? await sha256(normalizePhone(contact.phone, contact.phone_country_code || '55'))
          : ''

        // Skip if no email or phone (minimum required for matching)
        if (!emailHash && !phoneHash) continue

        hashedData.push([emailHash || '', phoneHash || ''])

        contactRecords.push({
          audience_id: audienceId,
          contact_id: contact.id,
          email_hash: emailHash || null,
          phone_hash: phoneHash || null,
        })
      }
```

Substituir por:
```typescript
    // Hash and send new contacts to Meta — full schema for maximum match rate
    if (contactsToAdd.length > 0) {
      const schema = ['EMAIL', 'PHONE', 'FN', 'LN', 'CT', 'ST', 'ZIP', 'COUNTRY', 'EXTERN_ID']
      const hashedData: string[][] = []
      const contactRecords: any[] = []

      for (const contact of contactsToAdd) {
        const emailHash = contact.email ? await sha256(normalizeEmail(contact.email)) : ''
        const phoneHash = contact.phone
          ? await sha256(normalizePhone(contact.phone, contact.phone_country_code || '55'))
          : ''

        // Skip if no email or phone (minimum required for matching)
        if (!emailHash && !phoneHash) continue

        // Name: prefer dedicated fields, fallback to splitting full name
        const firstName = contact.first_name || getFirstName(contact.name || '')
        const lastName = contact.last_name || getLastName(contact.name || '')

        const fnHash = firstName ? await sha256(normalizeName(firstName)) : ''
        const lnHash = lastName ? await sha256(normalizeName(lastName)) : ''
        const ctHash = contact.city ? await sha256(normalizeCity(contact.city)) : ''
        const stHash = contact.state ? await sha256(normalizeState(contact.state)) : ''
        const zipHash = contact.cep ? await sha256(normalizeZip(contact.cep)) : ''
        const countryHash = await sha256(normalizeCountry(contact.country || ''))
        // EXTERN_ID: internal contact UUID — must be SHA-256 hashed per Meta spec
        const externIdHash = await sha256(contact.id)

        hashedData.push([
          emailHash,
          phoneHash,
          fnHash,
          lnHash,
          ctHash,
          stHash,
          zipHash,
          countryHash,
          externIdHash,
        ])

        contactRecords.push({
          audience_id: audienceId,
          contact_id: contact.id,
          email_hash: emailHash || null,
          phone_hash: phoneHash || null,
          status: 'active',
        })
      }
```

- [ ] **Step 4: Corrigir Bloco C — removal query e status update**

Localizar (linhas ~933–947):
```typescript
      const { data: contactsToRemoveData } = await serviceSupabase
        .from('meta_audience_contacts')
        .select('contact_id, email_hash, phone_hash, first_name_hash, last_name_hash')
        .eq('audience_id', audienceId)
        .in('contact_id', contactsToRemove)
```

Substituir por:
```typescript
      const { data: contactsToRemoveData } = await serviceSupabase
        .from('meta_audience_contacts')
        .select('contact_id, email_hash, phone_hash')
        .eq('audience_id', audienceId)
        .in('contact_id', contactsToRemove)
```

Depois, localizar o `update` de remoção (dentro do mesmo bloco C, após o fetch):
```typescript
            await serviceSupabase
              .from('meta_audience_contacts')
              .update({ removed_at: new Date().toISOString() })
              .eq('audience_id', audienceId)
              .in('contact_id', batchIds)
```

Substituir por:
```typescript
            await serviceSupabase
              .from('meta_audience_contacts')
              .update({ status: 'removed' })
              .eq('audience_id', audienceId)
              .in('contact_id', batchIds)
```

- [ ] **Step 5: Atualizar log message do batch**

Localizar:
```typescript
        console.log(
          `Sending batch ${Math.floor(i / META_BATCH_SIZE) + 1} with ${batch.length} users (schema EMAIL/PHONE)`
        )
```

Substituir por:
```typescript
        console.log(
          `Sending batch ${Math.floor(i / META_BATCH_SIZE) + 1} with ${batch.length} users (schema: 9 fields)`
        )
```

- [ ] **Step 6: Verificar o arquivo final**

Leia `supabase/functions/meta-audience-api/index.ts` com `offset: 824, limit: 170` para confirmar:
1. Bloco A: `.neq('status', 'removed')` sem `removed_at`
2. Bloco B: schema com 9 campos, `hashedData.push` com 9 elementos na ordem correta
3. Bloco C: select sem `first_name_hash`/`last_name_hash`, update usa `status: 'removed'`

- [ ] **Step 7: Verificar disponibilidade dos campos nos contatos**

Via `mcp__supabase__execute_sql`:
```sql
SELECT
  COUNT(*) AS total,
  COUNT(email) AS com_email,
  COUNT(phone) AS com_phone,
  COUNT(COALESCE(first_name, split_part(name, ' ', 1))) AS com_fn_efetivo,
  COUNT(COALESCE(last_name, NULLIF(split_part(name, ' ', 2), ''))) AS com_ln_efetivo,
  COUNT(city) AS com_city,
  COUNT(state) AS com_state,
  COUNT(cep) AS com_zip,
  COUNT(country) AS com_country
FROM crm_contacts
WHERE (email IS NOT NULL OR phone IS NOT NULL);
```

Registrar os números — isso mostra o ganho esperado de match rate antes do deploy.

- [ ] **Step 8: Deploy**

```bash
cd "C:\Users\Leandro Desk\Documents\GitHub\cubomagicoleandrolastoricombr"
supabase functions deploy meta-audience-api --project-ref mqaygpnfjuyslnxpvipa
```

Esperado: `Deployed meta-audience-api` sem erros.

- [ ] **Step 9: Commit e push**

```bash
cd "C:\Users\Leandro Desk\Documents\GitHub\cubomagicoleandrolastoricombr"
git add supabase/functions/meta-audience-api/index.ts
git commit -m "fix: corrige sync Meta Audiences + expande schema para 9 campos PII"
git push origin main
```
