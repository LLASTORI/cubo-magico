-- Backfill hierarchy tables from meta_insights WITHOUT ON CONFLICT dependency.
-- Useful for environments where unique constraints are still missing/drifted.

-- Normalize legacy drifted id types first.
ALTER TABLE public.meta_adsets
  ALTER COLUMN campaign_id TYPE TEXT USING campaign_id::text;

ALTER TABLE public.meta_ads
  ALTER COLUMN adset_id TYPE TEXT USING adset_id::text;

-- CAMPAIGNS
-- 1) Insert missing rows
INSERT INTO public.meta_campaigns (
  project_id,
  ad_account_id,
  campaign_id,
  campaign_name,
  status,
  updated_at
)
SELECT DISTINCT
  mi.project_id,
  mi.ad_account_id,
  mi.campaign_id,
  mi.campaign_id AS campaign_name,
  NULL::text AS status,
  now() AS updated_at
FROM public.meta_insights mi
LEFT JOIN public.meta_campaigns mc
  ON mc.project_id = mi.project_id
 AND mc.campaign_id = mi.campaign_id
WHERE mi.campaign_id IS NOT NULL
  AND mc.id IS NULL;

-- 2) Update existing rows with best-effort enrich
UPDATE public.meta_campaigns mc
SET
  ad_account_id = COALESCE(mc.ad_account_id, src.ad_account_id),
  campaign_name = COALESCE(mc.campaign_name, src.campaign_name),
  updated_at = now()
FROM (
  SELECT DISTINCT project_id, campaign_id, ad_account_id, campaign_id AS campaign_name
  FROM public.meta_insights
  WHERE campaign_id IS NOT NULL
) src
WHERE mc.project_id = src.project_id
  AND mc.campaign_id = src.campaign_id;

-- ADSETS
INSERT INTO public.meta_adsets (
  project_id,
  ad_account_id,
  campaign_id,
  adset_id,
  adset_name,
  status,
  updated_at
)
SELECT DISTINCT
  mi.project_id,
  mi.ad_account_id,
  mi.campaign_id,
  mi.adset_id,
  mi.adset_id AS adset_name,
  NULL::text AS status,
  now() AS updated_at
FROM public.meta_insights mi
LEFT JOIN public.meta_adsets ma
  ON ma.project_id = mi.project_id
 AND ma.adset_id = mi.adset_id
WHERE mi.adset_id IS NOT NULL
  AND ma.id IS NULL;

UPDATE public.meta_adsets ma
SET
  ad_account_id = COALESCE(ma.ad_account_id, src.ad_account_id),
  campaign_id = COALESCE(ma.campaign_id, src.campaign_id),
  adset_name = COALESCE(ma.adset_name, src.adset_name),
  updated_at = now()
FROM (
  SELECT DISTINCT project_id, adset_id, ad_account_id, campaign_id, adset_id AS adset_name
  FROM public.meta_insights
  WHERE adset_id IS NOT NULL
) src
WHERE ma.project_id = src.project_id
  AND ma.adset_id = src.adset_id;

-- ADS
INSERT INTO public.meta_ads (
  project_id,
  ad_account_id,
  campaign_id,
  adset_id,
  ad_id,
  ad_name,
  status,
  updated_at
)
SELECT DISTINCT
  mi.project_id,
  mi.ad_account_id,
  mi.campaign_id,
  mi.adset_id,
  mi.ad_id,
  mi.ad_id AS ad_name,
  NULL::text AS status,
  now() AS updated_at
FROM public.meta_insights mi
LEFT JOIN public.meta_ads mad
  ON mad.project_id = mi.project_id
 AND mad.ad_id = mi.ad_id
WHERE mi.ad_id IS NOT NULL
  AND mad.id IS NULL;

UPDATE public.meta_ads mad
SET
  ad_account_id = COALESCE(mad.ad_account_id, src.ad_account_id),
  campaign_id = COALESCE(mad.campaign_id, src.campaign_id),
  adset_id = COALESCE(mad.adset_id, src.adset_id),
  ad_name = COALESCE(mad.ad_name, src.ad_name),
  updated_at = now()
FROM (
  SELECT DISTINCT project_id, ad_id, ad_account_id, campaign_id, adset_id, ad_id AS ad_name
  FROM public.meta_insights
  WHERE ad_id IS NOT NULL
) src
WHERE mad.project_id = src.project_id
  AND mad.ad_id = src.ad_id;

NOTIFY pgrst, 'reload schema';
