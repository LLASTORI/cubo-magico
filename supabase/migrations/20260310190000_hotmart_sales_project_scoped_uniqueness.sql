-- Ensure hotmart_sales idempotency is scoped by project, never global.
-- This prevents cross-project data coupling and supports ON CONFLICT (project_id, transaction_id)
-- used by supabase/functions/hotmart-webhook/index.ts.

BEGIN;

-- 1) Defensive deduplication for the intended logical key.
-- Keep the most recently updated row per (project_id, transaction_id).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, transaction_id
      ORDER BY
        COALESCE(updated_at, last_synced_at, created_at) DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.hotmart_sales
)
DELETE FROM public.hotmart_sales hs
USING ranked r
WHERE hs.id = r.id
  AND r.rn > 1;

-- 2) Drop global uniqueness that can force cross-project coupling.
DROP INDEX IF EXISTS public.idx_hotmart_sales_transaction;
ALTER TABLE public.hotmart_sales
  DROP CONSTRAINT IF EXISTS hotmart_sales_transaction_id_key;
ALTER TABLE public.hotmart_sales
  DROP CONSTRAINT IF EXISTS hotmart_sales_transaction_id_unique;

-- 3) Enforce project-scoped uniqueness for webhook idempotency.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotmart_sales_project_transaction
  ON public.hotmart_sales (project_id, transaction_id);

-- 4) Keep lookup performance by transaction id without global uniqueness.
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_transaction
  ON public.hotmart_sales (transaction_id);

COMMIT;
