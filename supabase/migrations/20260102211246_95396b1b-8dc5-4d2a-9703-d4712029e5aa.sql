-- =============================================
-- MÓDULO PESQUISA INTELIGENTE - ESTRUTURA DE BANCO DE DADOS
-- =============================================

-- 1. Tabela de Pesquisas
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'draft',
  settings JSONB DEFAULT '{}'::jsonb,
  slug TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, slug)
);

-- 2. Tabela de Perguntas
CREATE TABLE public.survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  identity_field_target TEXT,
  identity_confidence_weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabela de Respostas
CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'public_link',
  metadata JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Eventos de Identidade
CREATE TABLE public.contact_identity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT NOT NULL,
  previous_value TEXT,
  source_type TEXT NOT NULL,
  source_id UUID,
  source_name TEXT,
  confidence_score NUMERIC DEFAULT 1.0,
  is_declared BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela de Chaves de Webhook
CREATE TABLE public.survey_webhook_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN DEFAULT true,
  field_mappings JSONB DEFAULT '{}'::jsonb,
  default_tags TEXT[] DEFAULT '{}'::text[],
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX idx_surveys_project ON public.surveys(project_id);
CREATE INDEX idx_surveys_status ON public.surveys(status);
CREATE INDEX idx_surveys_slug ON public.surveys(slug);

CREATE INDEX idx_survey_questions_survey ON public.survey_questions(survey_id);
CREATE INDEX idx_survey_questions_position ON public.survey_questions(survey_id, position);

CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX idx_survey_responses_contact ON public.survey_responses(contact_id);
CREATE INDEX idx_survey_responses_email ON public.survey_responses(email);
CREATE INDEX idx_survey_responses_project ON public.survey_responses(project_id);

CREATE INDEX idx_contact_identity_events_contact ON public.contact_identity_events(contact_id);
CREATE INDEX idx_contact_identity_events_field ON public.contact_identity_events(field_name, field_value);
CREATE INDEX idx_contact_identity_events_project ON public.contact_identity_events(project_id);

CREATE INDEX idx_survey_webhook_keys_api_key ON public.survey_webhook_keys(api_key);
CREATE INDEX idx_survey_webhook_keys_survey ON public.survey_webhook_keys(survey_id);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON public.surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_questions_updated_at
  BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_survey_webhook_keys_updated_at
  BEFORE UPDATE ON public.survey_webhook_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES - SURVEYS
-- =============================================

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view surveys"
  ON public.surveys FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage surveys"
  ON public.surveys FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all surveys"
  ON public.surveys FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES - SURVEY_QUESTIONS
-- =============================================

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view survey questions"
  ON public.survey_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
    AND has_project_access(auth.uid(), s.project_id)
  ));

CREATE POLICY "Managers and owners can manage survey questions"
  ON public.survey_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
    AND get_user_project_role(auth.uid(), s.project_id) IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_questions.survey_id
    AND get_user_project_role(auth.uid(), s.project_id) IN ('owner', 'manager')
  ));

CREATE POLICY "Super admins can manage all survey questions"
  ON public.survey_questions FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES - SURVEY_RESPONSES
-- =============================================

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view survey responses"
  ON public.survey_responses FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage survey responses"
  ON public.survey_responses FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all survey responses"
  ON public.survey_responses FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES - CONTACT_IDENTITY_EVENTS
-- =============================================

ALTER TABLE public.contact_identity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contact identity events"
  ON public.contact_identity_events FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage contact identity events"
  ON public.contact_identity_events FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all contact identity events"
  ON public.contact_identity_events FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =============================================
-- RLS POLICIES - SURVEY_WEBHOOK_KEYS
-- =============================================

ALTER TABLE public.survey_webhook_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view survey webhook keys"
  ON public.survey_webhook_keys FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage survey webhook keys"
  ON public.survey_webhook_keys FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all survey webhook keys"
  ON public.survey_webhook_keys FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));