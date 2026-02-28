-- Meta schema compatibility hardening for new databases.
-- Ensures critical columns from canonical schema exist.

ALTER TABLE public.meta_adsets
  ADD COLUMN IF NOT EXISTS ad_account_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS ad_account_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS preview_url TEXT;

ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
