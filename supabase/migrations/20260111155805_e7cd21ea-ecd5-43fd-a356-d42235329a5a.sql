-- Phase 7: Cognitive Profile Layer
-- Tables for dynamic, evolving contact profiles

-- 1. Create contact_profiles table (main profile)
CREATE TABLE public.contact_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Cognitive vectors
  intent_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  trait_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Profile metrics
  confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  volatility_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  entropy_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  
  -- Aggregated data
  total_signals INTEGER NOT NULL DEFAULT 0,
  signal_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Meta
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint - one profile per contact
  CONSTRAINT contact_profiles_contact_unique UNIQUE (contact_id)
);

-- 2. Create contact_profile_history table (snapshots)
CREATE TABLE public.contact_profile_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_profile_id UUID NOT NULL REFERENCES public.contact_profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Source of update
  source TEXT NOT NULL CHECK (source IN ('quiz', 'survey', 'social', 'purchase', 'manual', 'webhook', 'import')),
  source_id UUID,
  source_name TEXT,
  
  -- Deltas
  delta_intent_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  delta_trait_vector JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Scores at time of update
  confidence_delta NUMERIC(5,4) NOT NULL DEFAULT 0,
  entropy_delta NUMERIC(5,4) NOT NULL DEFAULT 0,
  
  -- Snapshot of profile after update
  profile_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Meta
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.contact_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_profile_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for contact_profiles
CREATE POLICY "Users can view contact profiles of their projects" 
ON public.contact_profiles 
FOR SELECT 
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert contact profiles for their projects" 
ON public.contact_profiles 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update contact profiles in their projects" 
ON public.contact_profiles 
FOR UPDATE 
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete contact profiles in their projects" 
ON public.contact_profiles 
FOR DELETE 
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- 5. RLS Policies for contact_profile_history
CREATE POLICY "Users can view profile history of their projects" 
ON public.contact_profile_history 
FOR SELECT 
USING (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert profile history for their projects" 
ON public.contact_profile_history 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);

-- 6. Create indexes for performance
CREATE INDEX idx_contact_profiles_contact_id ON public.contact_profiles(contact_id);
CREATE INDEX idx_contact_profiles_project_id ON public.contact_profiles(project_id);
CREATE INDEX idx_contact_profiles_confidence ON public.contact_profiles(confidence_score DESC);
CREATE INDEX idx_contact_profiles_updated ON public.contact_profiles(last_updated_at DESC);

CREATE INDEX idx_profile_history_profile_id ON public.contact_profile_history(contact_profile_id);
CREATE INDEX idx_profile_history_project_id ON public.contact_profile_history(project_id);
CREATE INDEX idx_profile_history_source ON public.contact_profile_history(source);
CREATE INDEX idx_profile_history_created ON public.contact_profile_history(created_at DESC);

-- 7. Enable realtime for profile updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_profiles;
