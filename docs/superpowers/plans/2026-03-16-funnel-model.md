# Funnel Model Field Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar coluna `funnel_model` em `funnels` como campo complementar nullable que refina `funnel_type` com granularidade de modelo de negócio.

**Architecture:** `funnel_model` é um campo adicional que não substitui `funnel_type`. `funnel_type` continua sendo o discriminador de dashboard (`perpetuo` vs `lancamento`). `funnel_model` adiciona subcategoria. A coluna é nullable — funnels existentes ficam com `NULL` sem breaking change.

**Tech Stack:** PostgreSQL (Supabase), TypeScript strict, React 18, shadcn-ui Select/Badge.

---

## Chunk 1: Banco de dados

### Task 1: Migration SQL — ADD COLUMN funnel_model

**Files:**
- Create: `supabase/migrations/20260316125658_add_funnel_model.sql`

**Contexto:** A migration só adiciona — não altera nada existente. `funnel_type` e sua constraint permanecem intactos. O timestamp `20260316125658` é o valor correto para esta sessão.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/20260316125658_add_funnel_model.sql

ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS funnel_model text;

ALTER TABLE public.funnels
  ADD CONSTRAINT funnels_model_check
    CHECK (funnel_model IS NULL OR funnel_model IN (
      'perpetuo',
      'meteorico',
      'lancamento',
      'lancamento_pago',
      'lancamento_interno',
      'webinar',
      'assinatura',
      'high_ticket',
      'custom'
    ));

COMMENT ON COLUMN public.funnels.funnel_model IS
  'Modelo detalhado do funil. Complementa funnel_type com granularidade adicional. '
  'perpetuo/meteorico → usados com funnel_type=perpetuo. '
  'lancamento/lancamento_pago/lancamento_interno/webinar → usados com funnel_type=lancamento. '
  'assinatura/high_ticket/custom → independentes. NULL = não classificado.';
```

- [ ] **Step 2: Aplicar a migration no banco via MCP Supabase**

Usar `mcp__supabase__apply_migration` com o conteúdo acima. Nome sugerido: `add_funnel_model`.

- [ ] **Step 3: Verificar que funis existentes não quebraram**

Executar via `mcp__supabase__execute_sql`:
```sql
SELECT id, name, funnel_type, funnel_model
FROM funnels
LIMIT 10;
```
Esperado: `funnel_model = NULL` em todas as linhas. Nenhum erro.

- [ ] **Step 4: Commit da migration**

```bash
git add supabase/migrations/20260316125658_add_funnel_model.sql
git commit -m "feat: adiciona coluna funnel_model em funnels (nullable, com check constraint)"
```

---

## Chunk 2: Tipos TypeScript e constantes

### Task 2: Adicionar FunnelModel type e constantes em FunnelManager.tsx

**Files:**
- Modify: `src/components/FunnelManager.tsx:53-79` (após `FunnelType` e seus maps)

**Contexto:** O arquivo define `FunnelType` na linha 53 e `FUNNEL_TYPE_COLORS` na linha 75. As novas definições seguem exatamente o mesmo padrão. A interface `Funnel` (linha 55) precisa de um campo novo.

- [ ] **Step 1: Adicionar `FunnelModel` type após a linha 53 (`type FunnelType = ...`)**

Inserir logo após a linha 53:

```typescript
type FunnelModel =
  | 'perpetuo'
  | 'meteorico'
  | 'lancamento'
  | 'lancamento_pago'
  | 'lancamento_interno'
  | 'webinar'
  | 'assinatura'
  | 'high_ticket'
  | 'custom';
```

- [ ] **Step 2: Adicionar `funnel_model` à interface `Funnel` (linha 55)**

Na interface `Funnel`, adicionar após `has_fixed_dates`:

```typescript
  funnel_model?: FunnelModel | null;
```

A interface completa ficará:
```typescript
interface Funnel {
  id: string;
  name: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  roas_target: number | null;
  campaign_name_pattern: string | null;
  funnel_type: FunnelType;
  launch_start_date?: string | null;
  launch_end_date?: string | null;
  has_fixed_dates?: boolean;
  funnel_model?: FunnelModel | null;
}
```

- [ ] **Step 3: Adicionar `FUNNEL_MODEL_LABELS` após `FUNNEL_TYPE_LABELS`**

```typescript
const FUNNEL_MODEL_LABELS: Record<FunnelModel, string> = {
  perpetuo: 'Perpétuo Clássico',
  meteorico: 'Meteórico',
  lancamento: 'Lançamento',
  lancamento_pago: 'Lançamento Pago',
  lancamento_interno: 'Lançamento Interno',
  webinar: 'Webinar',
  assinatura: 'Assinatura',
  high_ticket: 'High Ticket',
  custom: 'Personalizado',
};
```

- [ ] **Step 4: Adicionar `FUNNEL_MODEL_COLORS` após `FUNNEL_TYPE_COLORS`**

```typescript
const FUNNEL_MODEL_COLORS: Record<FunnelModel, string> = {
  perpetuo: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  meteorico: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  lancamento: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  lancamento_pago: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  lancamento_interno: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  webinar: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  assinatura: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  high_ticket: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  custom: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
};
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros. Se aparecer erro de tipo em `funnel_model`, verificar se a interface Funnel foi atualizada corretamente.

---

## Chunk 3: State, handlers e persistência

### Task 3: Adicionar estado e lógica de criação/edição

**Files:**
- Modify: `src/components/FunnelManager.tsx` (seção de useState e handlers)

**Contexto:** O componente tem `newFunnelType` (linha 143) e `editingType` (linha 146) como estados. O padrão é idêntico — adicionar análogos para `funnel_model`. Os handlers `handleCreate`, `handleEdit`, `handleSaveEdit` e `handleCancelEdit` precisam de pequenas adições.

- [ ] **Step 1: Adicionar estados para funnel_model logo após os estados de funnel_type**

Após a linha `const [editingType, setEditingType] = useState<FunnelType>('perpetuo');` (linha 146), adicionar:

```typescript
const [newFunnelModel, setNewFunnelModel] = useState<FunnelModel | null>(null);
const [editingModel, setEditingModel] = useState<FunnelModel | null>(null);
```

- [ ] **Step 2: Atualizar handleCreate para incluir funnel_model no insert**

Na função `handleCreate`, dentro do objeto passado para `.insert(...)`, adicionar `funnel_model` após `funnel_type`:

```typescript
const { error } = await supabase
  .from('funnels')
  .insert({
    name: newFunnelName.trim(),
    project_id: projectId,
    funnel_type: newFunnelType,
    funnel_model: newFunnelModel,      // ← adicionar esta linha
  });
```

E no reset após sucesso, adicionar:
```typescript
setNewFunnelModel(null);
```
(junto com `setNewFunnelName('')` e `setNewFunnelType('perpetuo')`)

- [ ] **Step 3: Atualizar handleEdit para popular editingModel**

Na função `handleEdit`:
```typescript
const handleEdit = (funnel: Funnel) => {
  setEditingId(funnel.id);
  setEditingName(funnel.name);
  setEditingType(funnel.funnel_type);
  setEditingModel(funnel.funnel_model ?? null);   // ← adicionar
};
```

- [ ] **Step 4: Atualizar handleSaveEdit para incluir funnel_model no update**

Na função `handleSaveEdit`, dentro do `.update(...)`:
```typescript
const { error } = await supabase
  .from('funnels')
  .update({
    name: editingName.trim(),
    funnel_type: editingType,
    funnel_model: editingModel,    // ← adicionar
  })
  .eq('id', editingId);
```

- [ ] **Step 5: Atualizar handleCancelEdit para resetar editingModel**

```typescript
const handleCancelEdit = () => {
  setEditingId(null);
  setEditingName('');
  setEditingType('perpetuo');
  setEditingModel(null);    // ← adicionar
};
```

Também no bloco de reset após `handleSaveEdit` bem-sucedido:
```typescript
setEditingModel(null);
```

---

## Chunk 4: UI — Select e Badge

### Task 4: Selects no form e badge na listagem

**Files:**
- Modify: `src/components/FunnelManager.tsx` (JSX — form de criação, inline edit, badge)

**Contexto:**
- **Form de criação** (linha ~1014): há um `<Select>` de `funnel_type` com `w-[160px]`. Adicionar Select de `funnel_model` à direita.
- **Inline edit** (linha ~642): há um `<Select>` de `editingType` dentro do `<div className="flex items-center gap-2 flex-wrap">`. Adicionar Select de `editingModel`.
- **Badge na listagem** (linha ~666): há `<Badge>` com `FUNNEL_TYPE_LABELS[funnel.funnel_type]`. Adicionar badge de modelo ao lado, só quando `funnel_model` não for null.

- [ ] **Step 1: Adicionar Select de funnel_model no form de criação**

Localizar o bloco do Select de `newFunnelType` (linha ~1014-1023) e adicionar logo após:

```tsx
<Select
  value={newFunnelModel ?? 'none'}
  onValueChange={(v) => setNewFunnelModel(v === 'none' ? null : v as FunnelModel)}
>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Modelo (opcional)" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Sem modelo</SelectItem>
    <SelectItem value="perpetuo">Perpétuo Clássico</SelectItem>
    <SelectItem value="meteorico">Meteórico</SelectItem>
    <SelectItem value="lancamento">Lançamento</SelectItem>
    <SelectItem value="lancamento_pago">Lançamento Pago</SelectItem>
    <SelectItem value="lancamento_interno">Lançamento Interno</SelectItem>
    <SelectItem value="webinar">Webinar</SelectItem>
    <SelectItem value="assinatura">Assinatura</SelectItem>
    <SelectItem value="high_ticket">High Ticket</SelectItem>
    <SelectItem value="custom">Personalizado</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 2: Adicionar Select de funnel_model no inline edit**

Localizar o Select de `editingType` (linha ~642-651) e adicionar logo após:

```tsx
<Select
  value={editingModel ?? 'none'}
  onValueChange={(v) => setEditingModel(v === 'none' ? null : v as FunnelModel)}
>
  <SelectTrigger className="h-8 w-[160px]">
    <SelectValue placeholder="Modelo" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">Sem modelo</SelectItem>
    <SelectItem value="perpetuo">Perpétuo Clássico</SelectItem>
    <SelectItem value="meteorico">Meteórico</SelectItem>
    <SelectItem value="lancamento">Lançamento</SelectItem>
    <SelectItem value="lancamento_pago">Lançamento Pago</SelectItem>
    <SelectItem value="lancamento_interno">Lançamento Interno</SelectItem>
    <SelectItem value="webinar">Webinar</SelectItem>
    <SelectItem value="assinatura">Assinatura</SelectItem>
    <SelectItem value="high_ticket">High Ticket</SelectItem>
    <SelectItem value="custom">Personalizado</SelectItem>
  </SelectContent>
</Select>
```

- [ ] **Step 3: Adicionar badge de funnel_model na listagem (view mode)**

Localizar o bloco `<div className="flex items-center gap-2">` (linha ~660) onde está o badge de `funnel_type`:

```tsx
<Badge variant="outline" className={`text-xs ${FUNNEL_TYPE_COLORS[funnel.funnel_type]}`}>
  {FUNNEL_TYPE_LABELS[funnel.funnel_type]}
</Badge>
```

Adicionar logo após:

```tsx
{funnel.funnel_model && (
  <Badge variant="outline" className={`text-xs ${FUNNEL_MODEL_COLORS[funnel.funnel_model]}`}>
    {FUNNEL_MODEL_LABELS[funnel.funnel_model]}
  </Badge>
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 5: Commit das mudanças de UI**

```bash
git add src/components/FunnelManager.tsx
git commit -m "feat: adiciona seletor e badge de funnel_model em FunnelManager"
```

---

## Chunk 5: Tipos Supabase e validação final

### Task 5: Regenerar tipos e validar

**Files:**
- Modify: `src/integrations/supabase/types.ts` (gerado automaticamente)

- [ ] **Step 1: Regenerar tipos Supabase**

```bash
supabase gen types typescript --project-id mqaygpnfjuyslnxpvipa > src/integrations/supabase/types.ts
```

Verificar que `funnel_model` aparece em `funnels.Row` como `funnel_model: string | null`.

- [ ] **Step 2: Verificar TypeScript completo após regeneração**

```bash
npx tsc --noEmit
```
Esperado: zero erros.

- [ ] **Step 3: Verificar no banco que funis existentes não quebraram**

Via MCP `execute_sql`:
```sql
SELECT
  COUNT(*) FILTER (WHERE funnel_model IS NULL) AS sem_modelo,
  COUNT(*) FILTER (WHERE funnel_model IS NOT NULL) AS com_modelo,
  COUNT(*) AS total
FROM funnels;
```
Esperado: `sem_modelo = total`, `com_modelo = 0` (todos existentes ficam sem modelo).

- [ ] **Step 4: Commit final**

```bash
git add src/integrations/supabase/types.ts
git commit -m "chore: regenera tipos Supabase com funnel_model"
```

- [ ] **Step 5: Atualizar debug_log.md e TASKS.md**

**debug_log.md** — adicionar entrada:
```
### [2026-03-16] Onda 1: campo funnel_model — ✅ CONCLUÍDO (sessão 9)
- Migration `20260316125658_add_funnel_model.sql` aplicada e commitada
- CHECK constraint com 9 valores; nullable — zero breaking change em funnels existentes
- FunnelManager.tsx: type FunnelModel, FUNNEL_MODEL_LABELS, FUNNEL_MODEL_COLORS, interface Funnel atualizada
- UI: Select de modelo no form de criação e inline edit; badge na listagem
- Tipos Supabase regenerados
```

**TASKS.md** — mover todos os itens da seção `🔴 Próxima sessão — Onda 1` para `✅ Concluído` com data 16/03/2026.
