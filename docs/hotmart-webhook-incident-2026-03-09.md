# Hotmart webhook incident investigation (2026-03-09)

## 1) Recent provider events

Command executed:

```bash
curl -sS "$SUPABASE_URL/rest/v1/provider_event_log?select=created_at,provider,status,error_message&provider=eq.hotmart&order=created_at.desc&limit=20" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Observed latest rows (excerpt):

- 2026-03-09T15:49:51.81952+00:00 — status=error — `[OrdersShadow] Order items upsert failed: Could not find the table 'public.public.order_items' in the schema cache`
- 2026-03-09T15:38:34.936487+00:00 — status=error — `[OrdersShadow] Order items upsert failed: Could not find the table 'public.public.order_items' in the schema cache`
- 2026-03-09T15:12:28.468755+00:00 — status=error — `[OrdersShadow] Order items upsert failed: Could not find the table 'public.public.order_items' in the schema cache`

Conclusion: webhook events are still arriving, but processing is failing inside Orders Shadow item upsert.

## 2) Orders insertion continuity

Command executed:

```bash
curl -sS "$SUPABASE_URL/rest/v1/orders?select=provider_order_id,created_at&order=created_at.desc&limit=20" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Observed latest order:

- 2026-03-09T15:08:39.013746+00:00 — provider_order_id=HP2215534188

Conclusion: after ~15:08 UTC, new incoming Hotmart events continue, but orders stop being materialized.

## 3) Deployed source inspection

`hotmart-webhook` has the failing call:

```ts
const { error } = await supabase
  .from('public.order_items')
  .upsert(rows, {
    onConflict: 'order_id,provider_product_id',
    ignoreDuplicates: false,
  });
```

This produces PostgREST table resolution for `public.public.order_items`, which matches runtime error text.

## 4) First failing line in execution flow

Execution path:

1. `writeOrderShadow()` inserts/loads order id.
2. Then immediately calls `createOrderItemsFromWebhook(...)`.
3. Failure occurs at order items upsert call.
4. `createOrderItemsFromWebhook` throws `Order items upsert failed: ...`.
5. `writeOrderShadow` catch stores `result.errorMessage` and returns early.
6. Handler logs provider event status as `error`.

## 5) Minimal fix applied

Use explicit schema selector with table name only:

```ts
const { error } = await supabase
  .schema('public')
  .from('order_items')
  .upsert(rows, {
    onConflict: 'order_id,provider_product_id',
    ignoreDuplicates: false,
  });
```

This avoids schema double-prefixing.
