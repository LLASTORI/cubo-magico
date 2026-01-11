-- Add missing columns to system_events if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_events' AND column_name = 'triggered_events') THEN
    ALTER TABLE public.system_events ADD COLUMN triggered_events UUID[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_events' AND column_name = 'parent_event_id') THEN
    ALTER TABLE public.system_events ADD COLUMN parent_event_id UUID REFERENCES public.system_events(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_events' AND column_name = 'priority') THEN
    ALTER TABLE public.system_events ADD COLUMN priority INTEGER DEFAULT 5;
  END IF;
END $$;

-- Create system_learnings table to track what the system learned
CREATE TABLE IF NOT EXISTS public.system_learnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Learning details
  learning_type TEXT NOT NULL, -- 'pattern', 'correlation', 'optimization', 'insight'
  category TEXT NOT NULL, -- 'conversion', 'churn', 'engagement', 'personalization'
  
  -- The learning itself
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]', -- Array of supporting data points
  confidence NUMERIC DEFAULT 0,
  
  -- Impact assessment
  impact_score NUMERIC DEFAULT 0, -- 0-100
  affected_contacts_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'discovered', -- 'discovered', 'validated', 'applied', 'deprecated'
  validated_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on system_learnings
ALTER TABLE public.system_learnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_learnings (use IF NOT EXISTS pattern)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_learnings' AND policyname = 'Users can view system learnings for their projects') THEN
    CREATE POLICY "Users can view system learnings for their projects"
      ON public.system_learnings FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = system_learnings.project_id
          AND pm.user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_learnings' AND policyname = 'Users can insert system learnings for their projects') THEN
    CREATE POLICY "Users can insert system learnings for their projects"
      ON public.system_learnings FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = system_learnings.project_id
          AND pm.user_id = auth.uid()
        )
      );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_learnings' AND policyname = 'Users can update system learnings for their projects') THEN
    CREATE POLICY "Users can update system learnings for their projects"
      ON public.system_learnings FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.project_members pm
          WHERE pm.project_id = system_learnings.project_id
          AND pm.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Create indexes for system_learnings
CREATE INDEX IF NOT EXISTS idx_system_learnings_project ON public.system_learnings(project_id);
CREATE INDEX IF NOT EXISTS idx_system_learnings_type ON public.system_learnings(learning_type, category);
CREATE INDEX IF NOT EXISTS idx_system_learnings_status ON public.system_learnings(status);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_system_learnings_updated_at ON public.system_learnings;
CREATE TRIGGER update_system_learnings_updated_at
  BEFORE UPDATE ON public.system_learnings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();