-- =====================================================
-- MÓDULO QUIZ - FUNDAÇÃO (PROMPT 1/5)
-- =====================================================

-- Remover tipos criados parcialmente (se existirem)
DROP TYPE IF EXISTS quiz_type CASCADE;
DROP TYPE IF EXISTS quiz_question_type CASCADE;
DROP TYPE IF EXISTS quiz_session_status CASCADE;

-- ENUMS para tipos de quiz e questões
CREATE TYPE quiz_type AS ENUM (
  'lead',
  'qualification', 
  'funnel',
  'onboarding',
  'entertainment',
  'viral',
  'research'
);

CREATE TYPE quiz_question_type AS ENUM (
  'single_choice',
  'multiple_choice',
  'scale',
  'text',
  'number'
);

CREATE TYPE quiz_session_status AS ENUM (
  'started',
  'in_progress',
  'completed',
  'abandoned'
);

-- =====================================================
-- 4.1 QUIZZES - Definição do quiz
-- =====================================================
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type quiz_type NOT NULL DEFAULT 'lead',
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_identification BOOLEAN NOT NULL DEFAULT false,
  allow_anonymous BOOLEAN NOT NULL DEFAULT true,
  start_screen_config JSONB DEFAULT '{}'::jsonb,
  end_screen_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.2 QUIZ_QUESTIONS - Perguntas do quiz
-- =====================================================
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  type quiz_question_type NOT NULL DEFAULT 'single_choice',
  title TEXT NOT NULL,
  subtitle TEXT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.3 QUIZ_OPTIONS - Opções de resposta
-- =====================================================
CREATE TABLE public.quiz_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  weight FLOAT DEFAULT 0,
  traits_vector JSONB DEFAULT '{}'::jsonb,
  intent_vector JSONB DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.4 QUIZ_SESSIONS - Cada tentativa de resposta
-- =====================================================
CREATE TABLE public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  status quiz_session_status NOT NULL DEFAULT 'started',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_agent TEXT,
  ip_hash TEXT,
  utm_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.5 QUIZ_ANSWERS - Respostas individuais
-- =====================================================
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES public.quiz_options(id) ON DELETE SET NULL,
  answer_text TEXT,
  answer_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.6 QUIZ_RESULTS - Resultado consolidado
-- =====================================================
CREATE TABLE public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE UNIQUE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  traits_vector JSONB DEFAULT '{}'::jsonb,
  intent_vector JSONB DEFAULT '{}'::jsonb,
  raw_score JSONB DEFAULT '{}'::jsonb,
  normalized_score JSONB DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4.7 QUIZ_EVENTS - Preparação para Meta Pixel, etc
-- =====================================================
CREATE TABLE public.quiz_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES para performance
-- =====================================================
CREATE INDEX idx_quizzes_project_id ON public.quizzes(project_id);
CREATE INDEX idx_quizzes_is_active ON public.quizzes(is_active);
CREATE INDEX idx_quiz_questions_quiz_id ON public.quiz_questions(quiz_id);
CREATE INDEX idx_quiz_questions_order ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX idx_quiz_options_question_id ON public.quiz_options(question_id);
CREATE INDEX idx_quiz_sessions_project_id ON public.quiz_sessions(project_id);
CREATE INDEX idx_quiz_sessions_quiz_id ON public.quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_sessions_contact_id ON public.quiz_sessions(contact_id);
CREATE INDEX idx_quiz_sessions_status ON public.quiz_sessions(status);
CREATE INDEX idx_quiz_answers_session_id ON public.quiz_answers(session_id);
CREATE INDEX idx_quiz_results_project_id ON public.quiz_results(project_id);
CREATE INDEX idx_quiz_results_session_id ON public.quiz_results(session_id);
CREATE INDEX idx_quiz_events_project_id ON public.quiz_events(project_id);
CREATE INDEX idx_quiz_events_session_id ON public.quiz_events(session_id);
CREATE INDEX idx_quiz_events_event_name ON public.quiz_events(event_name);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - QUIZZES
-- =====================================================
CREATE POLICY "Members can view quizzes"
  ON public.quizzes FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage quizzes"
  ON public.quizzes FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all quizzes"
  ON public.quizzes FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can view active quizzes"
  ON public.quizzes FOR SELECT
  USING (is_active = true);

-- =====================================================
-- RLS POLICIES - QUIZ_QUESTIONS
-- =====================================================
CREATE POLICY "Members can view quiz questions"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_questions.quiz_id 
    AND has_project_access(auth.uid(), q.project_id)
  ));

CREATE POLICY "Managers and owners can manage quiz questions"
  ON public.quiz_questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_questions.quiz_id 
    AND get_user_project_role(auth.uid(), q.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_questions.quiz_id 
    AND get_user_project_role(auth.uid(), q.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ));

CREATE POLICY "Super admins can manage all quiz questions"
  ON public.quiz_questions FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can view questions of active quizzes"
  ON public.quiz_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_questions.quiz_id 
    AND q.is_active = true
  ));

-- =====================================================
-- RLS POLICIES - QUIZ_OPTIONS
-- =====================================================
CREATE POLICY "Members can view quiz options"
  ON public.quiz_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_options.question_id 
    AND has_project_access(auth.uid(), q.project_id)
  ));

CREATE POLICY "Managers and owners can manage quiz options"
  ON public.quiz_options FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_options.question_id 
    AND get_user_project_role(auth.uid(), q.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_options.question_id 
    AND get_user_project_role(auth.uid(), q.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ));

CREATE POLICY "Super admins can manage all quiz options"
  ON public.quiz_options FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can view options of active quizzes"
  ON public.quiz_options FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quiz_questions qq
    JOIN public.quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_options.question_id 
    AND q.is_active = true
  ));

-- =====================================================
-- RLS POLICIES - QUIZ_SESSIONS
-- =====================================================
CREATE POLICY "Members can view quiz sessions"
  ON public.quiz_sessions FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage quiz sessions"
  ON public.quiz_sessions FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all quiz sessions"
  ON public.quiz_sessions FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can create quiz sessions"
  ON public.quiz_sessions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_sessions.quiz_id 
    AND q.is_active = true
  ));

CREATE POLICY "Public can update quiz sessions"
  ON public.quiz_sessions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q 
    WHERE q.id = quiz_sessions.quiz_id 
    AND q.is_active = true
  ));

-- =====================================================
-- RLS POLICIES - QUIZ_ANSWERS
-- =====================================================
CREATE POLICY "Members can view quiz answers"
  ON public.quiz_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quiz_sessions s 
    WHERE s.id = quiz_answers.session_id 
    AND has_project_access(auth.uid(), s.project_id)
  ));

CREATE POLICY "Managers and owners can manage quiz answers"
  ON public.quiz_answers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quiz_sessions s 
    WHERE s.id = quiz_answers.session_id 
    AND get_user_project_role(auth.uid(), s.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_sessions s 
    WHERE s.id = quiz_answers.session_id 
    AND get_user_project_role(auth.uid(), s.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ));

CREATE POLICY "Super admins can manage all quiz answers"
  ON public.quiz_answers FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can create quiz answers"
  ON public.quiz_answers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_sessions s
    JOIN public.quizzes q ON q.id = s.quiz_id
    WHERE s.id = quiz_answers.session_id 
    AND q.is_active = true
  ));

-- =====================================================
-- RLS POLICIES - QUIZ_RESULTS
-- =====================================================
CREATE POLICY "Members can view quiz results"
  ON public.quiz_results FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage quiz results"
  ON public.quiz_results FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all quiz results"
  ON public.quiz_results FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can create quiz results"
  ON public.quiz_results FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_sessions s
    JOIN public.quizzes q ON q.id = s.quiz_id
    WHERE s.id = quiz_results.session_id 
    AND q.is_active = true
  ));

-- =====================================================
-- RLS POLICIES - QUIZ_EVENTS
-- =====================================================
CREATE POLICY "Members can view quiz events"
  ON public.quiz_events FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage quiz events"
  ON public.quiz_events FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all quiz events"
  ON public.quiz_events FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Public can create quiz events"
  ON public.quiz_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_sessions s
    JOIN public.quizzes q ON q.id = s.quiz_id
    WHERE s.id = quiz_events.session_id 
    AND q.is_active = true
  ));

-- =====================================================
-- TRIGGER para updated_at
-- =====================================================
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();