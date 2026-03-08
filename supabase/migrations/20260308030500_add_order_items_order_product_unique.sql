-- Ensure idempotent, race-safe writes for order_items upserts
-- Canonical conflict target used by hotmart-webhook: (order_id, provider_product_id)

-- 1) Remove duplicates that would block unique constraint creation
DELETE FROM public.order_items a
USING public.order_items b
WHERE a.ctid < b.ctid
  AND a.order_id = b.order_id
  AND a.provider_product_id = b.provider_product_id;

-- 2) Add unique constraint if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_order_product_unique'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
    ADD CONSTRAINT order_items_order_product_unique
    UNIQUE (order_id, provider_product_id);
  END IF;
END $$;
