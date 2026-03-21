-- Ignore keywords in knowledge base (for ManyChat triggers etc.)
ALTER TABLE public.ai_knowledge_base
  ADD COLUMN IF NOT EXISTS ignore_keywords text[] DEFAULT '{}'::text[];

-- Flag automation-triggered comments for list filtering
ALTER TABLE public.social_comments
  ADD COLUMN IF NOT EXISTS is_automation boolean NOT NULL DEFAULT false;

-- Partial index for efficient filtering (most comments are NOT automation)
CREATE INDEX IF NOT EXISTS idx_social_comments_automation
  ON public.social_comments(project_id, is_automation)
  WHERE is_automation = true;
