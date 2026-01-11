
-- Create funnel_performance table for tracking funnel path performance
CREATE TABLE public.funnel_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  path_signature JSONB NOT NULL DEFAULT '{}',
  path_type TEXT NOT NULL DEFAULT 'quiz_outcome',
  path_name TEXT,
  conversion_rate NUMERIC(5,4) DEFAULT 0,
  avg_time_to_convert INTERVAL,
  churn_rate NUMERIC(5,4) DEFAULT 0,
  revenue_per_user NUMERIC(12,2) DEFAULT 0,
  confidence NUMERIC(5,4) DEFAULT 0,
  sample_size INTEGER DEFAULT 0,
  total_entries INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_churns INTEGER DEFAULT 0,
  performance_score NUMERIC(5,2) DEFAULT 0,
  trend TEXT DEFAULT 'stable',
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_path_type CHECK (path_type IN ('quiz_outcome', 'automation_chain', 'agent_decision', 'campaign_flow', 'custom'))
);

-- Create funnel_optimization_suggestions table
CREATE TABLE public.funnel_optimization_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  funnel_performance_id UUID REFERENCES public.funnel_performance(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact_estimate NUMERIC(5,2),
  confidence NUMERIC(5,4) DEFAULT 0,
  evidence JSONB DEFAULT '{}',
  recommended_action JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE,
  outcome JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_suggestion_status CHECK (status IN ('pending', 'approved', 'rejected', 'applied', 'rolled_back'))
);

-- Create funnel_experiments table for A/B testing micro-variations
CREATE TABLE public.funnel_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  funnel_performance_id UUID REFERENCES public.funnel_performance(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES public.funnel_optimization_suggestions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  control_config JSONB NOT NULL DEFAULT '{}',
  variant_config JSONB NOT NULL DEFAULT '{}',
  traffic_split NUMERIC(3,2) DEFAULT 0.5,
  min_sample_size INTEGER DEFAULT 100,
  confidence_threshold NUMERIC(5,4) DEFAULT 0.95,
  status TEXT NOT NULL DEFAULT 'draft',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  winner TEXT,
  results JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_experiment_status CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled'))
);

-- Create path_events table for tracking individual path traversals
CREATE TABLE public.path_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  funnel_performance_id UUID REFERENCES public.funnel_performance(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  experiment_id UUID REFERENCES public.funnel_experiments(id) ON DELETE SET NULL,
  path_signature JSONB NOT NULL DEFAULT '{}',
  variant TEXT DEFAULT 'control',
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  conversion_value NUMERIC(12,2),
  time_in_path INTERVAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_event_type CHECK (event_type IN ('entry', 'progress', 'conversion', 'churn', 'exit'))
);

-- Enable RLS
ALTER TABLE public.funnel_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_optimization_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.path_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for funnel_performance
CREATE POLICY "Users can view funnel performance for their projects"
  ON public.funnel_performance FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage funnel performance for their projects"
  ON public.funnel_performance FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- RLS Policies for funnel_optimization_suggestions
CREATE POLICY "Users can view optimization suggestions for their projects"
  ON public.funnel_optimization_suggestions FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage optimization suggestions for their projects"
  ON public.funnel_optimization_suggestions FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- RLS Policies for funnel_experiments
CREATE POLICY "Users can view experiments for their projects"
  ON public.funnel_experiments FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage experiments for their projects"
  ON public.funnel_experiments FOR ALL
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- RLS Policies for path_events
CREATE POLICY "Users can view path events for their projects"
  ON public.path_events FOR SELECT
  USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert path events for their projects"
  ON public.path_events FOR INSERT
  WITH CHECK (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_funnel_performance_project ON public.funnel_performance(project_id);
CREATE INDEX idx_funnel_performance_funnel ON public.funnel_performance(funnel_id);
CREATE INDEX idx_funnel_performance_path_type ON public.funnel_performance(path_type);
CREATE INDEX idx_funnel_performance_score ON public.funnel_performance(performance_score DESC);
CREATE INDEX idx_optimization_suggestions_project ON public.funnel_optimization_suggestions(project_id);
CREATE INDEX idx_optimization_suggestions_status ON public.funnel_optimization_suggestions(status);
CREATE INDEX idx_experiments_project ON public.funnel_experiments(project_id);
CREATE INDEX idx_experiments_status ON public.funnel_experiments(status);
CREATE INDEX idx_path_events_project ON public.path_events(project_id);
CREATE INDEX idx_path_events_funnel_perf ON public.path_events(funnel_performance_id);
CREATE INDEX idx_path_events_contact ON public.path_events(contact_id);
CREATE INDEX idx_path_events_created ON public.path_events(created_at DESC);

-- Function to update funnel performance metrics
CREATE OR REPLACE FUNCTION public.update_funnel_performance_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.funnel_performance_id IS NOT NULL THEN
    UPDATE public.funnel_performance
    SET 
      total_entries = total_entries + CASE WHEN NEW.event_type = 'entry' THEN 1 ELSE 0 END,
      total_conversions = total_conversions + CASE WHEN NEW.event_type = 'conversion' THEN 1 ELSE 0 END,
      total_churns = total_churns + CASE WHEN NEW.event_type = 'churn' THEN 1 ELSE 0 END,
      sample_size = sample_size + 1,
      conversion_rate = CASE 
        WHEN (total_entries + CASE WHEN NEW.event_type = 'entry' THEN 1 ELSE 0 END) > 0 
        THEN (total_conversions + CASE WHEN NEW.event_type = 'conversion' THEN 1 ELSE 0 END)::NUMERIC / 
             (total_entries + CASE WHEN NEW.event_type = 'entry' THEN 1 ELSE 0 END)
        ELSE 0 
      END,
      churn_rate = CASE 
        WHEN (total_entries + CASE WHEN NEW.event_type = 'entry' THEN 1 ELSE 0 END) > 0 
        THEN (total_churns + CASE WHEN NEW.event_type = 'churn' THEN 1 ELSE 0 END)::NUMERIC / 
             (total_entries + CASE WHEN NEW.event_type = 'entry' THEN 1 ELSE 0 END)
        ELSE 0 
      END,
      last_updated_at = now()
    WHERE id = NEW.funnel_performance_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-updating metrics
CREATE TRIGGER update_funnel_metrics_on_path_event
  AFTER INSERT ON public.path_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_funnel_performance_metrics();

-- Trigger for updating timestamps
CREATE TRIGGER update_optimization_suggestions_updated_at
  BEFORE UPDATE ON public.funnel_optimization_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON public.funnel_experiments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
