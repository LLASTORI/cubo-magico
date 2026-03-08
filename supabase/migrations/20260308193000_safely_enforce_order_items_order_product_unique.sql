-- Safely enforce unique key required by hotmart-webhook upsert
-- Required conflict target: (order_id, provider_product_id)

-- 1) Remove duplicates that would block unique constraint creation.
-- Keep the newest row per (order_id, provider_product_id) by created_at desc, then id desc.
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, provider_product_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.order_items
)
DELETE FROM public.order_items oi
USING ranked r
WHERE oi.id = r.id
  AND r.rn > 1;

-- 2) Add the unique constraint if missing.
DO $$
BEGIN
  ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_product_unique
    UNIQUE (order_id, provider_product_id);
EXCEPTION
  WHEN duplicate_object THEN
    -- already exists, keep migration idempotent
    NULL;
END $$;

-- 3) Verification query expected by runbook/operators:
-- SELECT conname
-- FROM pg_constraint
-- WHERE conname = 'order_items_order_product_unique';
