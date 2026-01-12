-- Add identity_settings column to quizzes table for configurable lead capture fields
ALTER TABLE public.quizzes 
ADD COLUMN IF NOT EXISTS identity_settings jsonb NOT NULL DEFAULT '{
  "fields": {
    "name": {"enabled": true, "required": false},
    "email": {"enabled": true, "required": true},
    "phone": {"enabled": true, "required": false},
    "instagram": {"enabled": false, "required": false}
  },
  "primary_identity_field": "email"
}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.quizzes.identity_settings IS 'Configuration for lead identification fields: which are enabled, required, and which is the primary lookup key (email or phone)';