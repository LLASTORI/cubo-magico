-- Create table for funnel score history
CREATE TABLE public.funnel_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  positions_score INTEGER CHECK (positions_score >= 0 AND positions_score <= 100),
  connect_rate_score INTEGER CHECK (connect_rate_score >= 0 AND connect_rate_score <= 100),
  tx_pagina_checkout_score INTEGER CHECK (tx_pagina_checkout_score >= 0 AND tx_pagina_checkout_score <= 100),
  tx_checkout_compra_score INTEGER CHECK (tx_checkout_compra_score >= 0 AND tx_checkout_compra_score <= 100),
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint to prevent multiple scores per funnel per day
  UNIQUE(funnel_id, recorded_date)
);

-- Enable Row Level Security
ALTER TABLE public.funnel_score_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Members can view funnel score history" 
ON public.funnel_score_history 
FOR SELECT 
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert funnel scores" 
ON public.funnel_score_history 
FOR INSERT 
WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Managers and owners can delete funnel scores" 
ON public.funnel_score_history 
FOR DELETE 
USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

-- Create index for efficient queries
CREATE INDEX idx_funnel_score_history_funnel_date ON public.funnel_score_history(funnel_id, recorded_date DESC);
CREATE INDEX idx_funnel_score_history_project ON public.funnel_score_history(project_id);