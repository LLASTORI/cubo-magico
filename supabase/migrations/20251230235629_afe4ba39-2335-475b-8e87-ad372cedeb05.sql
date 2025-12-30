-- Add CRM contact reference to social_comments table
ALTER TABLE public.social_comments 
ADD COLUMN IF NOT EXISTS crm_contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL;

-- Create index for better performance on CRM lookups
CREATE INDEX IF NOT EXISTS idx_social_comments_crm_contact 
ON public.social_comments(crm_contact_id) WHERE crm_contact_id IS NOT NULL;

-- Create index on crm_contacts instagram field for faster matching
CREATE INDEX IF NOT EXISTS idx_crm_contacts_instagram 
ON public.crm_contacts(project_id, instagram) WHERE instagram IS NOT NULL;

-- Create a view for enriched contact social data
CREATE OR REPLACE VIEW public.contact_social_insights AS
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