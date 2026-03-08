# Hotmart webhook runtime investigation (`order_items` missing) — 2026-03-08

## Scope
Investigation requested to find the exact runtime database error preventing `order_items` inserts for newly created orders.

## 1) Last errors in `provider_event_log`

Executed via Supabase REST (service role):

```bash
curl -sS -G "$SUPABASE_URL/rest/v1/provider_event_log" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --data-urlencode "select=created_at,error_message,raw_payload" \
  --data-urlencode "error_message=not.is.null" \
  --data-urlencode "order=created_at.desc" \
  --data-urlencode "limit=20"
```

Result summary (20 latest errors):

- **14x** `[OrdersShadow] Order items upsert failed: there is no unique or exclusion constraint matching the ON CONFLICT specification`
- 6x duplicate sale insert messages (`Duplicate sale insert without existing record ...`).

✅ **Exact runtime error blocking `order_items` insert identified:**

`Order items upsert failed: there is no unique or exclusion constraint matching the ON CONFLICT specification`

## 2) Constraints on `order_items`

Requested SQL uses `information_schema`:

```sql
SELECT
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_name = 'order_items';
```

Direct execution was **not possible via project REST endpoint**, because `information_schema` relations are not exposed in PostgREST schema cache (error `PGRST205`).

Fallback evidence from repo migration designed to support webhook upsert target:

- `supabase/migrations/20260308030500_add_order_items_order_product_unique.sql`
- Declares expected constraint:
  - `order_items_order_product_unique UNIQUE (order_id, provider_product_id)`

This aligns with the runtime failure: if this unique constraint is missing in runtime DB, `ON CONFLICT (order_id, provider_product_id)` fails exactly with that error.

## 3) Foreign keys on `order_items`

Requested SQL also depends on `information_schema` and cannot be queried through current REST exposure for the same reason (`PGRST205`).

Fallback schema snapshot (`public/cubo_magico_schema_dump.sql`) shows the core `order_items` columns including `order_id`, `funnel_id`, and `offer_mapping_id`; and runtime error indicates FK was **not** the blocker in this incident (the error is explicit ON CONFLICT target mismatch).

## 4) Whether `funnel_id` / `offer_mapping_id` are NOT NULL

Requested SQL depends on `information_schema.columns` (not exposed via REST in this environment).

Fallback schema snapshot confirms both columns are nullable (`funnel_id uuid`, `offer_mapping_id uuid`, no `NOT NULL`):

```sql
CREATE TABLE public.order_items (
  ...
  funnel_id uuid,
  offer_mapping_id uuid,
  ...
);
```

Therefore, nullability of these fields is not the insert blocker.

## 5) New orders without items

Executed equivalent left join via PostgREST embedding:

```bash
curl -sS -G "$SUPABASE_URL/rest/v1/orders" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --data-urlencode "select=provider_order_id,created_at,order_items!left(id)" \
  --data-urlencode "order_items=is.null" \
  --data-urlencode "order=created_at.desc" \
  --data-urlencode "limit=10"
```

Observed latest 10 orders all without `order_items` (empty embedded array), including:

- `HP2122457247`
- `HP0094441982`
- `HP0249495789`
- `HP0051353918`
- `HP1576894818C1`

## Final diagnosis

The blocking runtime DB error is:

> **`there is no unique or exclusion constraint matching the ON CONFLICT specification`**

This indicates webhook code is issuing `upsert(... onConflict ...)` with a conflict target that does not currently match any active UNIQUE/EXCLUDE constraint in the runtime database.

In this codebase, webhook upsert target is `(order_id, provider_product_id)`, and corresponding migration exists (`20260308030500_add_order_items_order_product_unique.sql`).

So the practical root cause is: **expected unique constraint not present (or not applied) in the running environment**.
