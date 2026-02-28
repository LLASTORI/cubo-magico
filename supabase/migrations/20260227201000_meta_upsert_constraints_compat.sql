-- Ensure unique constraints required by Edge Function upserts exist.
-- Fixes 42P10: "there is no unique or exclusion constraint matching the ON CONFLICT specification".

-- 1) Best-effort dedup before adding unique constraints
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY project_id, campaign_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.meta_campaigns
)
DELETE FROM public.meta_campaigns c
USING ranked r
WHERE c.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY project_id, adset_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.meta_adsets
)
DELETE FROM public.meta_adsets a
USING ranked r
WHERE a.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY project_id, ad_id
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.meta_ads
)
DELETE FROM public.meta_ads a
USING ranked r
WHERE a.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY project_id, ad_account_id, campaign_id, adset_id, ad_id, date_start, date_stop
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
         ) AS rn
  FROM public.meta_insights
)
DELETE FROM public.meta_insights i
USING ranked r
WHERE i.id = r.id
  AND r.rn > 1;

-- 2) Add missing unique constraints used by ON CONFLICT in sync code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meta_campaigns'::regclass
      AND conname = 'meta_campaigns_project_id_campaign_id_key'
  ) THEN
    ALTER TABLE public.meta_campaigns
      ADD CONSTRAINT meta_campaigns_project_id_campaign_id_key
      UNIQUE (project_id, campaign_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meta_adsets'::regclass
      AND conname = 'meta_adsets_project_id_adset_id_key'
  ) THEN
    ALTER TABLE public.meta_adsets
      ADD CONSTRAINT meta_adsets_project_id_adset_id_key
      UNIQUE (project_id, adset_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meta_ads'::regclass
      AND conname = 'meta_ads_project_id_ad_id_key'
  ) THEN
    ALTER TABLE public.meta_ads
      ADD CONSTRAINT meta_ads_project_id_ad_id_key
      UNIQUE (project_id, ad_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meta_insights'::regclass
      AND conname = 'meta_insights_project_adacct_campaign_adset_ad_date_key'
  ) THEN
    ALTER TABLE public.meta_insights
      ADD CONSTRAINT meta_insights_project_adacct_campaign_adset_ad_date_key
      UNIQUE (project_id, ad_account_id, campaign_id, adset_id, ad_id, date_start, date_stop);
  END IF;
END $$;

-- 3) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
