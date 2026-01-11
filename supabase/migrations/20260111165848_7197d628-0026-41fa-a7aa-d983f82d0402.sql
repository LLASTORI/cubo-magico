-- Create contact_memory table for long-term semantic memory
CREATE TABLE public.contact_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('preference', 'objection', 'desire', 'trigger', 'pain_point', 'habit', 'belief', 'language_style', 'goal', 'fear', 'value', 'constraint', 'context')),
  content JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT NOT NULL CHECK (source IN ('quiz', 'chat', 'social', 'agent', 'manual', 'survey', 'purchase', 'behavior', 'inference')),
  source_id UUID,
  source_name TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_contradicted BOOLEAN NOT NULL DEFAULT false,
  contradicted_by UUID REFERENCES public.contact_memory(id),
  last_reinforced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reinforcement_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_memory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view memories for their project contacts"
  ON public.contact_memory
  FOR SELECT
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memories for their project contacts"
  ON public.contact_memory
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update memories for their project contacts"
  ON public.contact_memory
  FOR UPDATE
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete memories for their project contacts"
  ON public.contact_memory
  FOR DELETE
  USING (
    project_id IN (
      SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_contact_memory_contact ON public.contact_memory(contact_id);
CREATE INDEX idx_contact_memory_project ON public.contact_memory(project_id);
CREATE INDEX idx_contact_memory_type ON public.contact_memory(memory_type);
CREATE INDEX idx_contact_memory_confidence ON public.contact_memory(confidence DESC);
CREATE INDEX idx_contact_memory_last_reinforced ON public.contact_memory(last_reinforced_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_contact_memory_updated_at
  BEFORE UPDATE ON public.contact_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();