-- Drop the view with SECURITY DEFINER and recreate without it
DROP VIEW IF EXISTS public.contact_social_insights;

-- Recreate as a regular view (SECURITY INVOKER is default in PostgreSQL)
CREATE VIEW public.contact_social_insights AS
SELECT 
  c.id as contact_id,
  c.project_id,
  c.name as contact_name,
  c.email,
  c.instagram,
  COUNT(sc.id) as total_comments,
  COUNT(CASE WHEN sc.sentiment = 'positive' THEN 1 END) as positive_comments,
  COUNT(CASE WHEN sc.sentiment = 'negative' THEN 1 END) as negative_comments,
  COUNT(CASE WHEN sc.sentiment = 'neutral' THEN 1 END) as neutral_comments,
  COUNT(CASE WHEN sc.classification = 'commercial_interest' THEN 1 END) as commercial_interest_count,
  COUNT(CASE WHEN sc.classification = 'question' THEN 1 END) as questions_count,
  ROUND(AVG(sc.intent_score)::numeric, 1) as avg_intent_score,
  MAX(sc.comment_timestamp) as last_comment_at
FROM public.crm_contacts c
LEFT JOIN public.social_comments sc ON sc.crm_contact_id = c.id AND sc.is_deleted = false
GROUP BY c.id, c.project_id, c.name, c.email, c.instagram;