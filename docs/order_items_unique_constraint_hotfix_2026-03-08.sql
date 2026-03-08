-- Run in Supabase SQL Editor (production) to align DB with webhook upsert

-- 1) Check duplicates that block UNIQUE(order_id, provider_product_id)
SELECT
  order_id,
  provider_product_id,
  COUNT(*)
FROM order_items
GROUP BY order_id, provider_product_id
HAVING COUNT(*) > 1;

-- 2) Deduplicate keeping newest row (created_at desc, id desc)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, provider_product_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM order_items
)
DELETE FROM order_items oi
USING ranked r
WHERE oi.id = r.id
  AND r.rn > 1;

-- 3) Create UNIQUE constraint (idempotent-safe variant)
DO $$
BEGIN
  ALTER TABLE order_items
    ADD CONSTRAINT order_items_order_product_unique
    UNIQUE (order_id, provider_product_id);
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- 4) Verify
SELECT
  conname
FROM pg_constraint
WHERE conname = 'order_items_order_product_unique';
