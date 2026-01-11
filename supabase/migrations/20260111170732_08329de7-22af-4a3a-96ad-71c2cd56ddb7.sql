-- Create personalization_contexts table for ephemeral per-session context
CREATE TABLE public.personalization_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('quiz', 'site', 'email', 'whatsapp', 'ads', 'landing', 'survey')),
  current_intent TEXT,
  dominant_trait TEXT,
  memory_signals JSONB NOT NULL DEFAULT '[]',
  prediction_signals JSONB NOT NULL DEFAULT '[]',
  profile_snapshot JSONB NOT NULL DEFAULT '{}',
  personalization_depth TEXT NOT NULL DEFAULT 'standard' CHECK (personalization_depth IN ('minimal', 'standard', 'deep')),
  excluded_memory_types TEXT[] DEFAULT '{}',
  human_override JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create personalization_logs table for tracking applied personalizations
CREATE TABLE public.personalization_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  context_id UUID REFERENCES public.personalization_contexts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  session_id TEXT,
  channel TEXT NOT NULL,
  directives JSONB NOT NULL DEFAULT '{}',
  tokens_resolved JSONB NOT NULL DEFAULT '{}',
  content_original TEXT,
  content_personalized TEXT,
  applied BOOLEAN NOT NULL DEFAULT false,
  outcome TEXT,
  outcome_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personalization_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personalization_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for personalization_contexts
CREATE POLICY "Users can view contexts for their projects"
  ON public.personalization_contexts FOR SELECT
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

CREATE POLICY "Users can create contexts for their projects"
  ON public.personalization_contexts FOR INSERT
  WITH CHECK (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

CREATE POLICY "Users can update contexts for their projects"
  ON public.personalization_contexts FOR UPDATE
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

CREATE POLICY "Users can delete contexts for their projects"
  ON public.personalization_contexts FOR DELETE
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

-- RLS policies for personalization_logs
CREATE POLICY "Users can view logs for their projects"
  ON public.personalization_logs FOR SELECT
  USING (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

CREATE POLICY "Users can create logs for their projects"
  ON public.personalization_logs FOR INSERT
  WITH CHECK (project_id IN (SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()));

-- Indexes
CREATE INDEX idx_personalization_contexts_project ON public.personalization_contexts(project_id);
CREATE INDEX idx_personalization_contexts_contact ON public.personalization_contexts(contact_id);
CREATE INDEX idx_personalization_contexts_session ON public.personalization_contexts(session_id);
CREATE INDEX idx_personalization_contexts_expires ON public.personalization_contexts(expires_at);
CREATE INDEX idx_personalization_logs_project ON public.personalization_logs(project_id);
CREATE INDEX idx_personalization_logs_context ON public.personalization_logs(context_id);
CREATE INDEX idx_personalization_logs_contact ON public.personalization_logs(contact_id);

-- Trigger for updated_at
CREATE TRIGGER update_personalization_contexts_updated_at
  BEFORE UPDATE ON public.personalization_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();