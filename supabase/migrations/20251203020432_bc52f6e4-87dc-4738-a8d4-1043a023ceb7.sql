-- Add unique constraint for upsert to work properly
ALTER TABLE public.project_credentials 
ADD CONSTRAINT project_credentials_project_provider_unique 
UNIQUE (project_id, provider);