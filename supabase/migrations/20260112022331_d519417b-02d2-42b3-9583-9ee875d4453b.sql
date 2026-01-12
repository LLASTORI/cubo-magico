-- View: contact_quiz_latest_results
-- Returns only the most recent completed quiz result per contact/quiz combination
-- This is the source of truth for cognitive profiles

CREATE OR REPLACE VIEW public.contact_quiz_latest_results AS
WITH ranked_results AS (
  SELECT 
    qr.id as result_id,
    qr.session_id,
    qs.quiz_id,
    qs.contact_id,
    qs.project_id,
    qr.traits_vector,
    qr.intent_vector,
    qr.normalized_score,
    qr.raw_score,
    qr.summary,
    qr.created_at as result_created_at,
    q.name as quiz_name,
    q.type as quiz_type,
    ROW_NUMBER() OVER (
      PARTITION BY qs.contact_id, qs.quiz_id 
      ORDER BY qr.created_at DESC
    ) as rn
  FROM quiz_results qr
  JOIN quiz_sessions qs ON qs.id = qr.session_id
  JOIN quizzes q ON q.id = qs.quiz_id
  WHERE qs.contact_id IS NOT NULL
    AND qs.status = 'completed'
)
SELECT 
  result_id,
  session_id,
  quiz_id,
  contact_id,
  project_id,
  traits_vector,
  intent_vector,
  normalized_score,
  raw_score,
  summary,
  result_created_at,
  quiz_name,
  quiz_type
FROM ranked_results
WHERE rn = 1;

-- Add comment to document the view
COMMENT ON VIEW public.contact_quiz_latest_results IS 
'Returns only the most recent completed quiz result per contact/quiz combination. Used for cognitive profile aggregation to prevent inflation from multiple sessions of the same quiz.';