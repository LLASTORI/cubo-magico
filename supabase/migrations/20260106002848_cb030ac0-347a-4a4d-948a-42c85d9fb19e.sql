-- Add columns for better AI usage tracking and provider preference
ALTER TABLE ai_project_quotas 
ADD COLUMN IF NOT EXISTS lovable_credits_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lovable_credits_limit INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS openai_credits_used INTEGER DEFAULT 0;

-- Add comment explaining the columns
COMMENT ON COLUMN ai_project_quotas.lovable_credits_used IS 'Number of Lovable AI credits used this month';
COMMENT ON COLUMN ai_project_quotas.lovable_credits_limit IS 'Monthly limit for free Lovable AI credits';
COMMENT ON COLUMN ai_project_quotas.openai_credits_used IS 'Number of OpenAI API calls used this month';
COMMENT ON COLUMN ai_project_quotas.provider_preference IS 'Preferred AI provider: lovable or openai';