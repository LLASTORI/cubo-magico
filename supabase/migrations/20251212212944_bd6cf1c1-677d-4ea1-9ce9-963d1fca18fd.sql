-- Create table for webhook API keys
CREATE TABLE public.crm_webhook_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  name TEXT NOT NULL DEFAULT 'Default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  allowed_sources TEXT[] DEFAULT '{}',
  default_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.crm_webhook_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Managers and owners can manage webhook keys"
  ON public.crm_webhook_keys FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Members can view webhook keys"
  ON public.crm_webhook_keys FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Super admins can manage all webhook keys"
  ON public.crm_webhook_keys FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Index for fast API key lookup
CREATE INDEX idx_crm_webhook_keys_api_key ON public.crm_webhook_keys(api_key) WHERE is_active = true;