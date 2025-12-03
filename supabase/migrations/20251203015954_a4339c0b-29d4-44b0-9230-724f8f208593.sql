-- Add validated field to track if credentials have been tested successfully
ALTER TABLE public.project_credentials ADD COLUMN is_validated BOOLEAN DEFAULT false;
ALTER TABLE public.project_credentials ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE;