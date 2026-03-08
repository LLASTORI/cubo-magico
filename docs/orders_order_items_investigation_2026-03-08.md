# Orders x Order Items Investigation (2026-03-08)

Context received:

- `orders`: 3824
- `order_items`: 81

Hypothesis: `extractOrderItems` is often returning an empty array.

## Executed queries and findings

### 1) Recent order payloads

Equivalent executed via PostgREST:

`SELECT created_at, raw_payload FROM orders ORDER BY created_at DESC LIMIT 5;`

Result summary:
- Recent `raw_payload.data` objects consistently include top-level keys like `buyer`, `product`, `producer`, `purchase`, `affiliates`, `commissions`.
- In sampled recent rows, `product` appears at `raw_payload.data.product` (top-level under `data`).

### 2) Payload structure only

Equivalent executed via PostgREST projection of `raw_payload->data` (top 3 recent rows):

`SELECT jsonb_pretty(raw_payload->'data') FROM orders ORDER BY created_at DESC LIMIT 3;`

Result summary:
- Structure confirms `product` is under `data.product`.
- `purchase` object does **not** contain nested `product` in the sampled rows.

### 3) Check if `data.product` exists

`SELECT COUNT(*) FROM orders WHERE raw_payload->'data'->'product' IS NOT NULL;`

Result:
- **3769** rows.

### 4) Check if `purchase.product` exists

`SELECT COUNT(*) FROM orders WHERE raw_payload->'data'->'purchase'->'product' IS NOT NULL;`

Result:
- **0** rows.

## Conclusion

If `extractOrderItems` currently reads `raw_payload.data.purchase.product`, this explains why `order_items` are rarely created (or never created for this payload pattern).

The payload format in current data strongly indicates item extraction should read from `raw_payload.data.product` (and potentially `raw_payload.data.product.content.products` when bundles/combo content exists).
