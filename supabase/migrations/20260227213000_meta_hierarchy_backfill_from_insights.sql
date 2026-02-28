-- Normalize drifted id column types and backfill hierarchy tables from meta_insights.
-- This helps populate campaigns/adsets/ads lists when only insights were synced.

-- 1) Align legacy drifted id types to canonical text ids
ALTER TABLE public.meta_adsets
  ALTER COLUMN campaign_id TYPE TEXT USING campaign_id::text;

ALTER TABLE public.meta_ads
  ALTER COLUMN adset_id TYPE TEXT USING adset_id::text;

-- 2) Backfill campaigns from insights
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
WHERE mi.campaign_id IS NOT NULL
ON CONFLICT (project_id, campaign_id)
DO UPDATE SET
  ad_account_id = COALESCE(EXCLUDED.ad_account_id, meta_campaigns.ad_account_id),
  campaign_name = COALESCE(meta_campaigns.campaign_name, EXCLUDED.campaign_name),
  updated_at = now();

-- 3) Backfill adsets from insights
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
WHERE mi.adset_id IS NOT NULL
ON CONFLICT (project_id, adset_id)
DO UPDATE SET
  ad_account_id = COALESCE(EXCLUDED.ad_account_id, meta_adsets.ad_account_id),
  campaign_id = COALESCE(EXCLUDED.campaign_id, meta_adsets.campaign_id),
  adset_name = COALESCE(meta_adsets.adset_name, EXCLUDED.adset_name),
  updated_at = now();

-- 4) Backfill ads from insights
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
WHERE mi.ad_id IS NOT NULL
ON CONFLICT (project_id, ad_id)
DO UPDATE SET
  ad_account_id = COALESCE(EXCLUDED.ad_account_id, meta_ads.ad_account_id),
  campaign_id = COALESCE(EXCLUDED.campaign_id, meta_ads.campaign_id),
  adset_id = COALESCE(EXCLUDED.adset_id, meta_ads.adset_id),
  ad_name = COALESCE(meta_ads.ad_name, EXCLUDED.ad_name),
  updated_at = now();

NOTIFY pgrst, 'reload schema';
