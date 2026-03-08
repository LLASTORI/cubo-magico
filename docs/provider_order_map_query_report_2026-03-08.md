# Provider Order Map Query Report (2026-03-08)

For the Supabase project in this environment, the requested checks were executed against `provider_order_map` via PostgREST.

## Requested queries and results

1. **`SELECT COUNT(*) FROM provider_order_map;`**
   - Result: `0` rows (`content-range: */0`).

2. **`SELECT COUNT(DISTINCT provider_transaction_id) FROM provider_order_map;`**
   - Result: failed.
   - Error: `column provider_order_map.provider_transaction_id does not exist` (`code: 42703`).

3. **Latest transactions (`provider_transaction_id`, `created_at`)**
   - Result: failed.
   - Error: `column provider_order_map.provider_transaction_id does not exist` (`code: 42703`).

4. **Recent transactions in last 1 day (`provider_transaction_id`)**
   - Result: failed.
   - Error: `column provider_order_map.provider_transaction_id does not exist` (`code: 42703`).

## Additional compatibility check

A compatibility check using `provider_order_id` (new column name in recent schema migrations) was also run:

- `COUNT(*)` for `provider_order_map`: `0`.
- Latest 20 with `provider_order_id, created_at`: `[]`.

So currently the table appears empty in this environment.
