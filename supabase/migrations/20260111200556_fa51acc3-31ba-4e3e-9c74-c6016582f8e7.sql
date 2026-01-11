-- Add slug, theme_config, and appearance_config to quizzes table for parity with surveys
-- This creates the Experience Engine Base data model shared between Quiz and Survey

-- Add slug column for human-readable URLs
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add theme configuration (colors, branding, etc.) - shared with surveys
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS theme_config JSONB DEFAULT '{
  "primary_color": "#6366f1",
  "text_color": "#1e293b",
  "secondary_text_color": "#64748b",
  "input_text_color": "#1e293b",
  "background_color": "#f8fafc",
  "show_progress": true,
  "one_question_per_page": true
}'::jsonb;

-- Add completion config (CTAs, redirects, etc.) - shared with surveys
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS completion_config JSONB DEFAULT '{
  "enable_auto_redirect": false,
  "redirect_delay_seconds": 5,
  "cta_buttons": []
}'::jsonb;

-- Create unique index for slug within project (prevent collision)
CREATE UNIQUE INDEX IF NOT EXISTS quizzes_project_slug_unique 
ON public.quizzes (project_id, slug) 
WHERE slug IS NOT NULL;

-- Create function to validate slug uniqueness across quizzes and surveys within same project
CREATE OR REPLACE FUNCTION validate_experience_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if slug is being set/changed
  IF NEW.slug IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.slug IS DISTINCT FROM NEW.slug) THEN
    -- Check for collision with surveys in same project
    IF TG_TABLE_NAME = 'quizzes' THEN
      IF EXISTS (
        SELECT 1 FROM public.surveys 
        WHERE project_id = NEW.project_id 
        AND slug = NEW.slug
      ) THEN
        RAISE EXCEPTION 'Slug "%" is already used by a survey in this project', NEW.slug;
      END IF;
    END IF;
    
    -- Check for collision with quizzes in same project
    IF TG_TABLE_NAME = 'surveys' THEN
      IF EXISTS (
        SELECT 1 FROM public.quizzes 
        WHERE project_id = NEW.project_id 
        AND slug = NEW.slug
      ) THEN
        RAISE EXCEPTION 'Slug "%" is already used by a quiz in this project', NEW.slug;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for quizzes
DROP TRIGGER IF EXISTS validate_quiz_slug ON public.quizzes;
CREATE TRIGGER validate_quiz_slug
  BEFORE INSERT OR UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION validate_experience_slug();

-- Create trigger for surveys
DROP TRIGGER IF EXISTS validate_survey_slug ON public.surveys;
CREATE TRIGGER validate_survey_slug
  BEFORE INSERT OR UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION validate_experience_slug();