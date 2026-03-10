-- Restore backward-compatible columns expected by social-comments-api and frontend hooks.
-- This migration is additive and safe to run in environments where columns already exist.

-- =========================
-- social_posts compatibility
-- =========================
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS post_id_meta text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS page_id text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS page_name text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS post_type text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS shares_count integer DEFAULT 0;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS is_ad boolean DEFAULT false;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS meta_ad_id text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS campaign_name text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS adset_name text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS ad_name text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS ad_id text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS adset_id text;
ALTER TABLE public.social_posts ADD COLUMN IF NOT EXISTS campaign_id text;

-- If schema was migrated to platform_post_id, copy values back for compatibility.
UPDATE public.social_posts
SET post_id_meta = COALESCE(post_id_meta, platform_post_id)
WHERE post_id_meta IS NULL
  AND platform_post_id IS NOT NULL;

-- Keep old/new ad marker aligned when both are available.
UPDATE public.social_posts
SET is_ad = COALESCE(is_ad, (post_type = 'ad'))
WHERE is_ad IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_posts_project_id_platform_post_id_meta_key'
      AND conrelid = 'public.social_posts'::regclass
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_project_id_platform_post_id_meta_key
      UNIQUE (project_id, platform, post_id_meta);
  END IF;
END $$;

-- ============================
-- social_comments compatibility
-- ============================
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS comment_id_meta text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS author_id text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS author_profile_picture text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS classification_key text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS is_own_account boolean DEFAULT false;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS ai_processing_status text DEFAULT 'pending';
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS ai_processed_at timestamptz;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS ai_error text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS ai_suggested_reply text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS replied_by uuid;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS reply_status text;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS reply_sent_at timestamptz;
ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS manually_classified boolean DEFAULT false;

-- If schema was migrated to platform_comment_id, copy values back for compatibility.
UPDATE public.social_comments
SET comment_id_meta = COALESCE(comment_id_meta, platform_comment_id)
WHERE comment_id_meta IS NULL
  AND platform_comment_id IS NOT NULL;

-- Preserve author picture data regardless of current column naming.
UPDATE public.social_comments
SET author_profile_picture = COALESCE(author_profile_picture, author_profile_pic)
WHERE author_profile_picture IS NULL
  AND author_profile_pic IS NOT NULL;

-- Keep legacy contact link populated when only contact_id exists.
UPDATE public.social_comments
SET crm_contact_id = COALESCE(crm_contact_id, contact_id)
WHERE crm_contact_id IS NULL
  AND contact_id IS NOT NULL;

-- Backfill comment platform from post when missing.
UPDATE public.social_comments sc
SET platform = sp.platform
FROM public.social_posts sp
WHERE sc.post_id = sp.id
  AND sc.platform IS NULL
  AND sp.platform IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_comments_project_id_platform_comment_id_meta_key'
      AND conrelid = 'public.social_comments'::regclass
  ) THEN
    ALTER TABLE public.social_comments
      ADD CONSTRAINT social_comments_project_id_platform_comment_id_meta_key
      UNIQUE (project_id, platform, comment_id_meta);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'social_comments'
      AND column_name = 'crm_contact_id'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'social_comments_crm_contact_id_fkey'
      AND conrelid = 'public.social_comments'::regclass
  ) THEN
    ALTER TABLE public.social_comments
      ADD CONSTRAINT social_comments_crm_contact_id_fkey
      FOREIGN KEY (crm_contact_id)
      REFERENCES public.crm_contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;
