-- Follow-up compatibility for legacy/new-drift Meta tables.
-- Goal: keep front-end read queries working even when table definitions diverged.

-- 1) Required columns used by read filters
ALTER TABLE public.meta_adsets
  ADD COLUMN IF NOT EXISTS ad_account_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS ad_account_id TEXT NOT NULL DEFAULT '';

-- 2) Required columns used by read projections/orders
ALTER TABLE public.meta_adsets
  ADD COLUMN IF NOT EXISTS adset_name TEXT;

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS campaign_id TEXT;

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS ad_name TEXT;

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS preview_url TEXT;

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3) Canonical meta_insights date_stop (present in canonical schema)
ALTER TABLE public.meta_insights
  ADD COLUMN IF NOT EXISTS date_stop DATE;

-- 4) Best-effort backfill from older naming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meta_adsets'
      AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE public.meta_adsets SET adset_name = COALESCE(adset_name, name)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'meta_ads'
      AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE public.meta_ads SET ad_name = COALESCE(ad_name, name)';
  END IF;
END $$;
