# Hotmart Webhook Deploy Parity Audit (2026-03-08)

## Objective

Verify whether the Supabase Edge Function running in production matches repository code, focusing on `order_items` writes and the `src` field.

## 1) Repository inspection (`supabase/functions/hotmart-webhook/index.ts`)

### Function that writes `order_items`

- **File:** `supabase/functions/hotmart-webhook/index.ts`
- **Function:** `createOrderItemsFromWebhook(...)`
- **Write path:** `.from('order_items').upsert(rows, ...)`

Relevant snippet:

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
```

Conclusion from repo: **current repository code DOES include `src` in `order_items` upsert payload**.

## 2) Deployed function verification (runtime evidence)

Direct source-code download of deployed Edge Function is not available in this environment (no Supabase CLI installed and no management API token provided).

However, runtime evidence from `provider_event_log` in production project shows recurrent errors:

- `[OrdersShadow] Order items upsert failed: Could not find the 'src' column of 'order_items' in the schema cache`

This confirms production is executing a code path that attempts to write `src` to `order_items`.

## 3) Other code paths writing to `order_items`

Write paths found in repository:

1. `supabase/functions/hotmart-webhook/index.ts`
   - Function: `createOrderItemsFromWebhook(...)`
   - Operation: `upsert(rows)`
   - **Includes `src`** in payload.

2. `supabase/functions/hotmart-orders-backfill-14d/index.ts`
   - Backfill loop (order items creation block)
   - Operation: `.insert({...})`
   - **Does not include `src`**.

3. `src/components/sales/HotmartUnifiedCSVImport.tsx`
   - CSV import flow for orders/items
   - Operation: `.insert({...})`
   - **Does not include `src`**.

(Other occurrences of `.from('order_items')` are reads/updates, not insert/upsert with `src`.)

## 4) Is `order_items.src` required elsewhere?

Global search for `order_items.src` in repository found no code dependency (only investigation docs mention it).

## Final determination

- The currently checked-in repository version **already contains** `src: 'hotmart_webhook'` in `createOrderItemsFromWebhook(...)`.
- Production runtime errors indicate deployed code is also trying to write `src` to `order_items`.
- Therefore, evidence currently points to **no contradiction** between runtime behavior and repository HEAD regarding this field.
- Most likely root cause remains schema mismatch: `order_items` table has no `src` column while webhook upsert sends it.

## Recommendation

Prefer immediate fix in webhook write payload:

- Remove `src` from `order_items` `upsert(rows)` payload (keep traceability in `metadata.source`).

Alternative (if product requires first-class `src` filtering):

- Add `src` column via migration and regenerate Supabase types.
