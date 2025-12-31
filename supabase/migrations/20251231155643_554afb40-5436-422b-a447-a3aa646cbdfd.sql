-- Add thumbnail_url column to social_posts
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add ad_id and adset_id columns if they don't exist
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS ad_id text;

ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS adset_id text;

ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS campaign_id text;