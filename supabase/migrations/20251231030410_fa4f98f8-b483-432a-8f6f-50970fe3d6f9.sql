-- Add is_ad and meta_ad_id columns to social_posts
ALTER TABLE public.social_posts 
ADD COLUMN IF NOT EXISTS is_ad BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS meta_ad_id TEXT;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_social_posts_is_ad ON public.social_posts(is_ad);
CREATE INDEX IF NOT EXISTS idx_social_posts_meta_ad_id ON public.social_posts(meta_ad_id);