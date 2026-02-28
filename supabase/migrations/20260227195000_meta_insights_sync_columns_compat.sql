-- Ensure meta_insights has all columns expected by the meta-api sync writer.

ALTER TABLE public.meta_insights
  ADD COLUMN IF NOT EXISTS frequency NUMERIC;

ALTER TABLE public.meta_insights
  ADD COLUMN IF NOT EXISTS cost_per_action_type JSONB;

ALTER TABLE public.meta_insights
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ask PostgREST to refresh schema cache so Edge Functions stop seeing stale columns.
NOTIFY pgrst, 'reload schema';
