-- Add OAuth token columns to project_credentials for Hotmart Authorization Code flow
ALTER TABLE public.project_credentials 
ADD COLUMN IF NOT EXISTS hotmart_access_token TEXT,
ADD COLUMN IF NOT EXISTS hotmart_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS hotmart_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hotmart_user_id TEXT,
ADD COLUMN IF NOT EXISTS hotmart_connected_at TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the columns
COMMENT ON COLUMN public.project_credentials.hotmart_access_token IS 'Hotmart OAuth access token (short-lived)';
COMMENT ON COLUMN public.project_credentials.hotmart_refresh_token IS 'Hotmart OAuth refresh token (long-lived, used to get new access tokens)';
COMMENT ON COLUMN public.project_credentials.hotmart_expires_at IS 'When the current access_token expires';
COMMENT ON COLUMN public.project_credentials.hotmart_connected_at IS 'When the user first connected via OAuth';