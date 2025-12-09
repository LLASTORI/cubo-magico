-- Add thumbnail_url column to meta_ads table
ALTER TABLE public.meta_ads ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;