-- ============================================
-- Phase 10: Predictive Intelligence Layer
-- ============================================

-- Contact Predictions table
CREATE TABLE public.contact_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL, -- conversion, churn, upsell, interest_shift, engagement, etc
  confidence NUMERIC(5,4) NOT NULL DEFAULT 0.5, -- 0 to 1
  explanation JSONB NOT NULL DEFAULT '{}', -- factors, reasoning, weights
  recommended_actions JSONB NOT NULL DEFAULT '[]', -- array of action objects
  risk_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  urgency_score NUMERIC(5,4) NOT NULL DEFAULT 0.5, -- 0 to 1
  expires_at TIMESTAMP WITH TIME ZONE, -- when prediction becomes stale
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for active predictions per contact
CREATE INDEX idx_contact_predictions_contact ON public.contact_predictions(contact_id, is_active);
CREATE INDEX idx_contact_predictions_project ON public.contact_predictions(project_id, is_active, prediction_type);
CREATE INDEX idx_contact_predictions_expires ON public.contact_predictions(expires_at) WHERE is_active = true;

-- Recommendation logs for learning
CREATE TABLE public.recommendation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_id UUID REFERENCES public.contact_predictions(id) ON DELETE SET NULL,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- apply, dismiss, schedule, test_variant
  action_data JSONB NOT NULL DEFAULT '{}', -- what was applied
  performed_by UUID, -- user who took action
  outcome TEXT, -- success, failure, pending, unknown
  outcome_data JSONB, -- conversion value, engagement delta, etc
  outcome_recorded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendation_logs_prediction ON public.recommendation_logs(prediction_id);
CREATE INDEX idx_recommendation_logs_contact ON public.recommendation_logs(contact_id);
CREATE INDEX idx_recommendation_logs_project ON public.recommendation_logs(project_id, action_type);

-- Enable RLS
ALTER TABLE public.contact_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contact_predictions
CREATE POLICY "Users can view predictions for their projects" 
ON public.contact_predictions 
FOR SELECT 
USING (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create predictions for their projects" 
ON public.contact_predictions 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update predictions for their projects" 
ON public.contact_predictions 
FOR UPDATE 
USING (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete predictions for their projects" 
ON public.contact_predictions 
FOR DELETE 
USING (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

-- RLS Policies for recommendation_logs
CREATE POLICY "Users can view recommendation logs for their projects" 
ON public.recommendation_logs 
FOR SELECT 
USING (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create recommendation logs for their projects" 
ON public.recommendation_logs 
FOR INSERT 
WITH CHECK (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update recommendation logs for their projects" 
ON public.recommendation_logs 
FOR UPDATE 
USING (
  project_id IN (
    SELECT pm.project_id FROM public.project_members pm WHERE pm.user_id = auth.uid()
  )
);

-- Trigger for updated_at on contact_predictions
CREATE TRIGGER update_contact_predictions_updated_at
BEFORE UPDATE ON public.contact_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();