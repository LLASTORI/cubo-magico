-- Create table for contact interactions/UTM history
CREATE TABLE public.crm_contact_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  interaction_type text NOT NULL DEFAULT 'page_view',
  page_name text,
  page_url text,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  utm_content text,
  utm_term text,
  utm_adset text,
  utm_ad text,
  utm_creative text,
  utm_placement text,
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL,
  launch_tag text,
  metadata jsonb DEFAULT '{}'::jsonb,
  interacted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_crm_contact_interactions_contact_id ON public.crm_contact_interactions(contact_id);
CREATE INDEX idx_crm_contact_interactions_project_id ON public.crm_contact_interactions(project_id);
CREATE INDEX idx_crm_contact_interactions_funnel_id ON public.crm_contact_interactions(funnel_id);
CREATE INDEX idx_crm_contact_interactions_launch_tag ON public.crm_contact_interactions(launch_tag);
CREATE INDEX idx_crm_contact_interactions_interacted_at ON public.crm_contact_interactions(interacted_at);
CREATE INDEX idx_crm_contact_interactions_utm_campaign ON public.crm_contact_interactions(utm_campaign);

-- Enable RLS
ALTER TABLE public.crm_contact_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view contact interactions"
ON public.crm_contact_interactions
FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert contact interactions"
ON public.crm_contact_interactions
FOR INSERT
WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Managers and owners can update contact interactions"
ON public.crm_contact_interactions
FOR UPDATE
USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Managers and owners can delete contact interactions"
ON public.crm_contact_interactions
FOR DELETE
USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all contact interactions"
ON public.crm_contact_interactions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add launch_tag column to funnels for tagging leads
ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS launch_tag text;