-- Create semantic_profiles table for human-readable profile interpretation
CREATE TABLE public.semantic_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  primary_intent TEXT,
  primary_traits TEXT[],
  intent_pattern JSONB DEFAULT '{}',
  trait_pattern JSONB DEFAULT '{}',
  buying_style TEXT,
  emotional_driver TEXT,
  risk_profile TEXT,
  copy_angle TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.semantic_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view semantic_profiles for their projects"
ON public.semantic_profiles
FOR SELECT
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert semantic_profiles for their projects"
ON public.semantic_profiles
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update semantic_profiles for their projects"
ON public.semantic_profiles
FOR UPDATE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete semantic_profiles for their projects"
ON public.semantic_profiles
FOR DELETE
USING (
  project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_semantic_profiles_updated_at
BEFORE UPDATE ON public.semantic_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add semantic_profile_id to quiz_results for caching the matched profile
ALTER TABLE public.quiz_results 
ADD COLUMN IF NOT EXISTS semantic_profile_id UUID REFERENCES public.semantic_profiles(id),
ADD COLUMN IF NOT EXISTS semantic_interpretation JSONB DEFAULT '{}';

-- Create index for faster lookups
CREATE INDEX idx_semantic_profiles_project_id ON public.semantic_profiles(project_id);
CREATE INDEX idx_semantic_profiles_priority ON public.semantic_profiles(project_id, priority DESC);