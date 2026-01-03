-- Table to store AI analysis for survey responses
CREATE TABLE IF NOT EXISTS public.survey_response_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  
  -- AI Classification
  classification TEXT, -- 'high_intent', 'pain_point', 'price_objection', 'confusion', 'feature_request', 'satisfaction', 'neutral'
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  intent_score INTEGER CHECK (intent_score >= 0 AND intent_score <= 100),
  
  -- AI Generated content
  ai_summary TEXT,
  key_insights JSONB DEFAULT '[]'::jsonb,
  detected_keywords TEXT[],
  
  -- Processing metadata
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by TEXT, -- model name
  processing_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one analysis per response
  CONSTRAINT unique_response_analysis UNIQUE (response_id)
);

-- Table for survey AI knowledge base (similar to social listening)
CREATE TABLE IF NOT EXISTS public.survey_ai_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Business context
  business_name TEXT,
  business_description TEXT,
  target_audience TEXT,
  products_services TEXT,
  
  -- Survey-specific context
  high_intent_indicators TEXT, -- what characterizes high purchase intent
  pain_point_indicators TEXT, -- what characterizes customer pain
  satisfaction_indicators TEXT, -- what characterizes satisfaction
  objection_patterns TEXT, -- common objection patterns
  
  -- Keywords
  high_intent_keywords TEXT[] DEFAULT '{}',
  pain_keywords TEXT[] DEFAULT '{}',
  satisfaction_keywords TEXT[] DEFAULT '{}',
  
  -- Settings
  auto_classify_responses BOOLEAN DEFAULT false,
  min_intent_score_for_action INTEGER DEFAULT 50,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_project_survey_kb UNIQUE (project_id)
);

-- Table for aggregated survey insights (dashboard metrics)
CREATE TABLE IF NOT EXISTS public.survey_insights_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES public.surveys(id) ON DELETE CASCADE, -- null = global
  metric_date DATE NOT NULL,
  
  -- Response counts
  total_responses INTEGER DEFAULT 0,
  unique_respondents INTEGER DEFAULT 0,
  
  -- Classification distribution
  high_intent_count INTEGER DEFAULT 0,
  pain_point_count INTEGER DEFAULT 0,
  satisfaction_count INTEGER DEFAULT 0,
  confusion_count INTEGER DEFAULT 0,
  price_objection_count INTEGER DEFAULT 0,
  feature_request_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  
  -- Sentiment distribution
  positive_count INTEGER DEFAULT 0,
  neutral_sentiment_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  
  -- Intent metrics
  avg_intent_score NUMERIC(5,2),
  high_intent_percentage NUMERIC(5,2),
  
  -- AI Summary
  ai_daily_summary TEXT,
  opportunities_identified INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_survey_insights_daily UNIQUE (project_id, survey_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.survey_response_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_insights_daily ENABLE ROW LEVEL SECURITY;

-- RLS policies for survey_response_analysis
CREATE POLICY "Users can view survey response analysis for their projects"
  ON public.survey_response_analysis FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert survey response analysis for their projects"
  ON public.survey_response_analysis FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update survey response analysis for their projects"
  ON public.survey_response_analysis FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete survey response analysis for their projects"
  ON public.survey_response_analysis FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- RLS policies for survey_ai_knowledge_base
CREATE POLICY "Users can view survey AI knowledge base for their projects"
  ON public.survey_ai_knowledge_base FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert survey AI knowledge base for their projects"
  ON public.survey_ai_knowledge_base FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update survey AI knowledge base for their projects"
  ON public.survey_ai_knowledge_base FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete survey AI knowledge base for their projects"
  ON public.survey_ai_knowledge_base FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- RLS policies for survey_insights_daily
CREATE POLICY "Users can view survey insights for their projects"
  ON public.survey_insights_daily FOR SELECT
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can insert survey insights for their projects"
  ON public.survey_insights_daily FOR INSERT
  WITH CHECK (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can update survey insights for their projects"
  ON public.survey_insights_daily FOR UPDATE
  USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Users can delete survey insights for their projects"
  ON public.survey_insights_daily FOR DELETE
  USING (public.has_project_access(auth.uid(), project_id));

-- Indexes for performance
CREATE INDEX idx_survey_response_analysis_project ON public.survey_response_analysis(project_id);
CREATE INDEX idx_survey_response_analysis_survey ON public.survey_response_analysis(survey_id);
CREATE INDEX idx_survey_response_analysis_classification ON public.survey_response_analysis(classification);
CREATE INDEX idx_survey_response_analysis_intent ON public.survey_response_analysis(intent_score);
CREATE INDEX idx_survey_insights_daily_project_date ON public.survey_insights_daily(project_id, metric_date);
CREATE INDEX idx_survey_insights_daily_survey_date ON public.survey_insights_daily(survey_id, metric_date);

-- Trigger for updated_at
CREATE TRIGGER update_survey_response_analysis_updated_at
  BEFORE UPDATE ON public.survey_response_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_ai_knowledge_base_updated_at
  BEFORE UPDATE ON public.survey_ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_insights_daily_updated_at
  BEFORE UPDATE ON public.survey_insights_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();