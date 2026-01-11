-- Create ai_agents table for autonomous agents
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL,
  allowed_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  boundaries JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_on JSONB NOT NULL DEFAULT '["prediction_created", "recommendation_generated", "profile_shift", "high_risk_signal"]'::jsonb,
  max_actions_per_day INTEGER DEFAULT 100,
  require_human_approval BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create agent_decisions_log table for tracking decisions
CREATE TABLE public.agent_decisions_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prediction_id UUID REFERENCES public.contact_predictions(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL,
  decision_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  reward_score NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_reason TEXT,
  outcome TEXT,
  outcome_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decisions_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_agents
CREATE POLICY "Users can view agents for their projects"
  ON public.ai_agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = ai_agents.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents for their projects"
  ON public.ai_agents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = ai_agents.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update agents for their projects"
  ON public.ai_agents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = ai_agents.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete agents for their projects"
  ON public.ai_agents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = ai_agents.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS policies for agent_decisions_log
CREATE POLICY "Users can view decisions for their projects"
  ON public.agent_decisions_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = agent_decisions_log.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create decisions for their projects"
  ON public.agent_decisions_log FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = agent_decisions_log.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update decisions for their projects"
  ON public.agent_decisions_log FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = agent_decisions_log.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_ai_agents_project_id ON public.ai_agents(project_id);
CREATE INDEX idx_ai_agents_is_active ON public.ai_agents(is_active);
CREATE INDEX idx_agent_decisions_log_agent_id ON public.agent_decisions_log(agent_id);
CREATE INDEX idx_agent_decisions_log_contact_id ON public.agent_decisions_log(contact_id);
CREATE INDEX idx_agent_decisions_log_project_id ON public.agent_decisions_log(project_id);
CREATE INDEX idx_agent_decisions_log_status ON public.agent_decisions_log(status);
CREATE INDEX idx_agent_decisions_log_created_at ON public.agent_decisions_log(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_decisions_log_updated_at
  BEFORE UPDATE ON public.agent_decisions_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();