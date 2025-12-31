-- Add campaign/adset/ad name columns to social_posts for better display
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS campaign_name text,
ADD COLUMN IF NOT EXISTS adset_name text,
ADD COLUMN IF NOT EXISTS ad_name text;