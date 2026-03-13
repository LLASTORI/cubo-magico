-- Ensure unique key required by hotmart-webhook upsert
-- Conflict target: (order_id, provider_product_id, provider_offer_id)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'order_items_order_product_offer_unique'
      AND conrelid = 'public.order_items'::regclass
  ) THEN
    ALTER TABLE public.order_items
      ADD CONSTRAINT order_items_order_product_offer_unique
      UNIQUE (order_id, provider_product_id, provider_offer_id);
  END IF;
END $$;