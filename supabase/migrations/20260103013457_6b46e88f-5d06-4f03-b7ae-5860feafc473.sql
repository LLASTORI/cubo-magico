-- Add default_tags and default_funnel_id to surveys table
ALTER TABLE public.surveys 
ADD COLUMN IF NOT EXISTS default_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL;

-- Create index for faster funnel lookups
CREATE INDEX IF NOT EXISTS idx_surveys_default_funnel_id ON public.surveys(default_funnel_id);

-- Add comment for documentation
COMMENT ON COLUMN public.surveys.default_tags IS 'Tags automatically applied to contacts who respond to this survey';
COMMENT ON COLUMN public.surveys.default_funnel_id IS 'Funnel to associate contacts with when they respond to this survey';