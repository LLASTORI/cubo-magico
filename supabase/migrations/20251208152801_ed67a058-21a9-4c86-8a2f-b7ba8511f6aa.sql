-- Add preview_url column to meta_ads table
ALTER TABLE public.meta_ads 
ADD COLUMN IF NOT EXISTS preview_url text;