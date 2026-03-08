# Investigação: criação de `order_items` quase sempre falha (2026-03-08)

## Contexto

- `orders`: 3824
- `order_items`: 81
- `raw_payload.data.product` existe em 3769 pedidos (investigação anterior).

Hipótese testada: falha silenciosa/bloqueio no `INSERT` de `order_items`.

---

## Consultas executadas

### 1) Constraints de `order_items`

Consulta solicitada:

```sql
SELECT tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'order_items';
```

**Status:** não foi possível executar diretamente no ambiente via PostgREST, porque apenas os schemas `public` e `graphql_public` estão expostos (schema `information_schema` bloqueado no endpoint REST).

Evidência alternativa no repositório (migrations):
- `order_items` foi criado com `PRIMARY KEY` (`id`) e FK `order_id -> orders(id)`.
- Migração posterior adiciona FK `project_id -> projects(id)` e remove apenas FKs antigas de `funnel_id`/`offer_mapping_id`.

### 2) Foreign keys de `order_items`

Consulta solicitada:

```sql
SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu
ON ccu.constraint_name = kcu.constraint_name
WHERE kcu.table_name = 'order_items';
```

**Status:** mesma limitação de exposição de schema para `information_schema`.

Evidência alternativa (migrations):
- FK `order_items.order_id -> orders.id`.
- FK `order_items.project_id -> projects.id`.

### 3) Triggers em `order_items`

Consulta solicitada:

```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'order_items';
```

**Status:** mesma limitação de acesso ao `information_schema`.

Evidência alternativa (migrations):
- Não há `CREATE TRIGGER ... ON public.order_items` nas migrations atuais.

### 4) Erros recentes de inserção (`provider_event_log`)

Consulta executada (equivalente REST):

- `SELECT * FROM provider_event_log WHERE error_message IS NOT NULL ORDER BY received_at DESC LIMIT 20;`

Resultado crítico:
- Diversos eventos recentes com erro:
  - `[OrdersShadow] Order items upsert failed: Could not find the 'src' column of 'order_items' in the schema cache`

Contagem de erros desse tipo:
- **27** ocorrências.

### 5) Itens criados recentemente

Consulta executada:

```sql
SELECT created_at, provider_product_id, order_id
FROM order_items
ORDER BY created_at DESC
LIMIT 20;
```

Resultado:
- Último `order_items.created_at`: **2026-02-07**.
- Não há criação recente acompanhando os pedidos de março.

### 6) Orders criados recentemente

Consulta executada:

```sql
SELECT created_at, provider_order_id
FROM orders
ORDER BY created_at DESC
LIMIT 20;
```

Resultado:
- Há pedidos sendo criados normalmente até **2026-03-08**.

---

## Validação no código (ponto exato da quebra)

Na função `createOrderItemsFromWebhook`, o upsert em `order_items` envia explicitamente o campo `src`:

```ts
src: 'hotmart_webhook'
```

Em seguida faz:

```ts
.from('order_items').upsert(...)
```

Se houver erro, lança:

```ts
throw new Error(`Order items upsert failed: ${error.message}`)
```

No banco atual, `order_items.src` **não existe** (select direto de `src` retorna erro de coluna inexistente), compatível com o erro encontrado em `provider_event_log`.

---

## Conclusão (objetivo A vs B)

✅ **B confirmado**: o fluxo está quebrando no **insert/upsert de `order_items`**, por incompatibilidade entre payload de escrita e schema atual (`src` não existe na tabela).

❌ **A não é a causa principal no estado atual**: `extractOrderItems` não é o gargalo dominante nesta janela, porque o erro explícito e recorrente aponta falha de persistência após extração.

---

## Ação corretiva sugerida

1. Ajustar `createOrderItemsFromWebhook` para não enviar `src` ao `order_items` **ou** criar a coluna `src` via migração (se for requisito funcional).
2. Reprocessar eventos com falha em `provider_event_log` após correção.
3. Adicionar teste de integração para garantir que payload de upsert não referencie colunas inexistentes.

---

## Localização exata solicitada (Edge Functions)

### Busca por `src:`

- `supabase/functions/hotmart-webhook/index.ts` linha com `src: 'hotmart_webhook'` no payload de `order_items`.
- `supabase/functions/hotmart-webhook/index.ts` linha com `src: tracking?.src || null` em extração de atribuição (não é `order_items`).
- Em `supabase/functions/_shared/`: **nenhuma ocorrência** de `src:`.

### (1) Função responsável por inserir `order_items`

- **Arquivo:** `supabase/functions/hotmart-webhook/index.ts`
- **Função:** `createOrderItemsFromWebhook(...)`
- **Operação:** `.from('order_items').upsert(rows, { onConflict: 'order_id,provider_product_id,provider_offer_id' ... })`

### (2) Bloco completo de inserção/upsert de `order_items`

```ts
const rows = items.map((item) => ({
  order_id: order.id,
  project_id: order.project_id,
  product_name: item.product_name,
  provider_product_id: item.provider_product_id,
  provider_offer_id: item.provider_offer_id,
  quantity: item.quantity || 1,
  base_price: item.base_price ?? 0,
  item_type: item.item_type || 'unknown',
  src: 'hotmart_webhook',
  offer_name: item.offer_name,
  metadata: {
    webhook_event_id: webhookEventId,
    source: 'hotmart_webhook',
  },
}));

const { error } = await supabase
  .from('order_items')
  .upsert(rows, {
    onConflict: 'order_id,provider_product_id,provider_offer_id',
    ignoreDuplicates: false,
  });

if (error) {
  throw new Error(`Order items upsert failed: ${error.message}`);
}
```

### (3) Onde `src` é adicionado

- `src: 'hotmart_webhook'` é adicionado no objeto `rows` dentro de `createOrderItemsFromWebhook(...)` antes do `upsert` em `order_items`.

### (4) `order_items.src` é usado em outro lugar?

Busca global por `order_items.src`:
- Não há uso em código de aplicação/migrations; só referência no documento de investigação.

### (5) Decisão técnica: remover `src` ou adicionar coluna?

Com base no código e no schema atual:
- Remover `src` do payload de `order_items` **não deve quebrar dependências atuais**, pois não há leituras de `order_items.src` no repositório.
- Manter `src` exigiria migração para adicionar coluna `src` em `order_items` + possível atualização de tipos/client.

Recomendação prática imediata:
- **Remover `src` do upsert de `order_items`** para destravar ingestão.
- Opcional: manter a origem em `metadata.source` (já existente) para rastreabilidade sem mudança de schema.
