-- ============================================
-- PHASE 6: ADAPTIVE QUIZ LOGIC LAYER
-- ============================================

-- 1. Add flow_type to quizzes table
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS flow_type text NOT NULL DEFAULT 'linear' CHECK (flow_type IN ('linear', 'adaptive', 'tree'));

-- 2. Add adaptive configuration to quizzes
ALTER TABLE public.quizzes
ADD COLUMN IF NOT EXISTS adaptive_config jsonb DEFAULT '{}'::jsonb;

-- The adaptive_config will store:
-- {
--   "max_questions": null,          -- Maximum questions to ask
--   "min_questions": null,          -- Minimum questions before completion
--   "adaptive_depth": false,        -- Enable adaptive depth control
--   "stop_when_confidence_reached": false,
--   "confidence_threshold": 0.8,    -- Vector variance threshold
--   "entropy_threshold": 0.5        -- Intent entropy threshold
-- }

-- 3. Add branching fields to quiz_options
ALTER TABLE public.quiz_options
ADD COLUMN IF NOT EXISTS next_question_id uuid REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS next_block_id uuid REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS end_quiz boolean DEFAULT false;

-- 4. Add hidden questions support
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS visibility_type text NOT NULL DEFAULT 'visible' CHECK (visibility_type IN ('visible', 'hidden', 'system_generated'));

-- 5. Add dynamic weight rules to quiz_questions
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS dynamic_weight_rules jsonb DEFAULT '[]'::jsonb;

-- Example dynamic_weight_rules:
-- [
--   {
--     "condition": {
--       "type": "answer_equals",
--       "question_id": "uuid",
--       "option_id": "uuid"
--     },
--     "weight_multiplier": 2.0
--   }
-- ]

-- 6. Create quiz_question_conditions table for conditional logic
CREATE TABLE IF NOT EXISTS public.quiz_question_conditions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  condition_type text NOT NULL CHECK (condition_type IN (
    'answer_equals',
    'answer_not_equals',
    'answer_contains',
    'vector_gt',
    'vector_lt',
    'vector_eq',
    'trait_gt',
    'trait_lt',
    'intent_gt',
    'intent_lt',
    'intent_range',
    'score_gt',
    'score_lt',
    'session_field',
    'is_identified',
    'is_anonymous',
    'question_answered',
    'question_skipped',
    'custom'
  )),
  condition_payload jsonb NOT NULL DEFAULT '{}',
  logical_operator text NOT NULL DEFAULT 'AND' CHECK (logical_operator IN ('AND', 'OR')),
  group_id uuid DEFAULT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- condition_payload examples:
-- answer_equals: {"question_id": "uuid", "option_id": "uuid"}
-- vector_gt: {"vector_name": "trait_x", "threshold": 0.5}
-- trait_gt: {"trait_name": "adventurous", "threshold": 0.6}
-- intent_range: {"intent_name": "purchase", "min": 0.3, "max": 0.7}
-- session_field: {"field": "contact_id", "operator": "is_not_null"}
-- custom: {"expression": "answers.q1.option_id == 'abc' && vectors.trait_x > 0.5"}

-- 7. Add session flow control columns to quiz_sessions
ALTER TABLE public.quiz_sessions
ADD COLUMN IF NOT EXISTS current_question_id uuid REFERENCES public.quiz_questions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visited_question_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS skipped_question_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS injected_question_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS decision_path jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accumulated_vectors jsonb DEFAULT '{"traits": {}, "intents": {}}'::jsonb,
ADD COLUMN IF NOT EXISTS flow_metadata jsonb DEFAULT '{}'::jsonb;

-- decision_path example:
-- [
--   {
--     "question_id": "uuid",
--     "decision": "condition_passed",
--     "reason": "trait_adventurous > 0.6",
--     "timestamp": "2024-01-01T00:00:00Z"
--   }
-- ]

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_question_conditions_question_id 
ON public.quiz_question_conditions(question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_conditions_group_id 
ON public.quiz_question_conditions(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_options_next_question 
ON public.quiz_options(next_question_id) WHERE next_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quiz_questions_visibility 
ON public.quiz_questions(quiz_id, is_hidden, visibility_type);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_current_question 
ON public.quiz_sessions(current_question_id) WHERE current_question_id IS NOT NULL;

-- 9. Enable RLS on quiz_question_conditions
ALTER TABLE public.quiz_question_conditions ENABLE ROW LEVEL SECURITY;

-- 10. RLS policies for quiz_question_conditions
CREATE POLICY "Managers and owners can manage quiz conditions"
ON public.quiz_question_conditions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_question_conditions.question_id
    AND get_user_project_role(auth.uid(), q.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_question_conditions.question_id
    AND get_user_project_role(auth.uid(), q.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  )
);

CREATE POLICY "Members can view quiz conditions"
ON public.quiz_question_conditions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_question_conditions.question_id
    AND has_project_access(auth.uid(), q.project_id)
  )
);

CREATE POLICY "Public can view conditions of active quizzes"
ON public.quiz_question_conditions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quiz_questions qq
    JOIN quizzes q ON q.id = qq.quiz_id
    WHERE qq.id = quiz_question_conditions.question_id
    AND q.is_active = true
  )
);

CREATE POLICY "Super admins can manage all quiz conditions"
ON public.quiz_question_conditions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- 11. Create trigger for updated_at on quiz_question_conditions
CREATE TRIGGER update_quiz_question_conditions_updated_at
BEFORE UPDATE ON public.quiz_question_conditions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Add quiz results columns for adaptive tracking
ALTER TABLE public.quiz_results
ADD COLUMN IF NOT EXISTS questions_answered integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS questions_skipped integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS flow_type text DEFAULT 'linear',
ADD COLUMN IF NOT EXISTS decision_path jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS confidence_score numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS entropy_score numeric DEFAULT NULL;