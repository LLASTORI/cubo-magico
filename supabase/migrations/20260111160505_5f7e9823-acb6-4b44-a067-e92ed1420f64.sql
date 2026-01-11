-- =============================================
-- Phase 8: Funnel Brain Layer - Quiz Outcomes
-- =============================================

-- Create enum for outcome action types
CREATE TYPE outcome_action_type AS ENUM (
  'add_tag',
  'remove_tag',
  'set_lifecycle_stage',
  'trigger_automation',
  'trigger_whatsapp_flow',
  'trigger_email_sequence',
  'fire_webhook',
  'fire_pixel_event',
  'redirect_url',
  'dynamic_end_screen',
  'update_custom_field'
);

-- Create quiz_outcomes table
CREATE TABLE public.quiz_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  end_screen_override JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quiz_outcome_logs table
CREATE TABLE public.quiz_outcome_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES public.quiz_outcomes(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  decision_trace JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  evaluation_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for quiz_outcomes
CREATE INDEX idx_quiz_outcomes_quiz_id ON public.quiz_outcomes(quiz_id);
CREATE INDEX idx_quiz_outcomes_priority ON public.quiz_outcomes(quiz_id, priority DESC);
CREATE INDEX idx_quiz_outcomes_active ON public.quiz_outcomes(quiz_id, is_active);

-- Create indexes for quiz_outcome_logs
CREATE INDEX idx_quiz_outcome_logs_session ON public.quiz_outcome_logs(quiz_session_id);
CREATE INDEX idx_quiz_outcome_logs_outcome ON public.quiz_outcome_logs(outcome_id);
CREATE INDEX idx_quiz_outcome_logs_project ON public.quiz_outcome_logs(project_id);
CREATE INDEX idx_quiz_outcome_logs_contact ON public.quiz_outcome_logs(contact_id);
CREATE INDEX idx_quiz_outcome_logs_created ON public.quiz_outcome_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.quiz_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_outcome_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_outcomes
CREATE POLICY "Quiz outcomes are viewable by project members"
  ON public.quiz_outcomes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.project_members pm ON pm.project_id = q.project_id
      WHERE q.id = quiz_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Quiz outcomes are manageable by project members"
  ON public.quiz_outcomes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      JOIN public.project_members pm ON pm.project_id = q.project_id
      WHERE q.id = quiz_id AND pm.user_id = auth.uid()
    )
  );

-- RLS policies for quiz_outcome_logs
CREATE POLICY "Quiz outcome logs are viewable by project members"
  ON public.quiz_outcome_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = quiz_outcome_logs.project_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Quiz outcome logs are insertable by project members"
  ON public.quiz_outcome_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = quiz_outcome_logs.project_id AND pm.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at on quiz_outcomes
CREATE TRIGGER update_quiz_outcomes_updated_at
  BEFORE UPDATE ON public.quiz_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Realtime for quiz_outcomes
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_outcomes;

-- Add comments for documentation
COMMENT ON TABLE public.quiz_outcomes IS 'Quiz outcome rules that define actions based on quiz results';
COMMENT ON TABLE public.quiz_outcome_logs IS 'Log of quiz outcome evaluations and executed actions';
COMMENT ON COLUMN public.quiz_outcomes.conditions IS 'JSON array of conditions to evaluate (vector thresholds, scores, answers)';
COMMENT ON COLUMN public.quiz_outcomes.actions IS 'JSON array of actions to execute when conditions are met';
COMMENT ON COLUMN public.quiz_outcomes.end_screen_override IS 'Optional custom end screen config for this outcome';
COMMENT ON COLUMN public.quiz_outcome_logs.decision_trace IS 'Detailed trace of condition evaluation for debugging';