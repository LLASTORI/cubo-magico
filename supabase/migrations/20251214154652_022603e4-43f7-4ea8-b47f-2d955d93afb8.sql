
-- Create recovery pipeline stages table (fully customizable per project)
CREATE TABLE public.crm_recovery_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_initial BOOLEAN NOT NULL DEFAULT false,
  is_recovered BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add recovery tracking fields to crm_contacts
ALTER TABLE public.crm_contacts 
ADD COLUMN recovery_stage_id UUID REFERENCES public.crm_recovery_stages(id) ON DELETE SET NULL,
ADD COLUMN recovery_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN recovery_updated_at TIMESTAMP WITH TIME ZONE;

-- Create recovery activities table for tracking outreach attempts
CREATE TABLE public.crm_recovery_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.crm_recovery_stages(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.crm_recovery_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_recovery_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for recovery stages
CREATE POLICY "Members can view recovery stages" ON public.crm_recovery_stages
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage recovery stages" ON public.crm_recovery_stages
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all recovery stages" ON public.crm_recovery_stages
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- RLS policies for recovery activities
CREATE POLICY "Members can view recovery activities" ON public.crm_recovery_activities
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage recovery activities" ON public.crm_recovery_activities
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all recovery activities" ON public.crm_recovery_activities
  FOR ALL USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- Create function to initialize default recovery stages
CREATE OR REPLACE FUNCTION public.create_default_recovery_stages(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.crm_recovery_stages (project_id, name, color, position, is_initial, is_recovered, is_lost)
  VALUES 
    (_project_id, 'Novo', '#6366f1', 0, true, false, false),
    (_project_id, 'Tentando Contato', '#f59e0b', 1, false, false, false),
    (_project_id, 'Em Negociação', '#3b82f6', 2, false, false, false),
    (_project_id, 'Proposta Enviada', '#8b5cf6', 3, false, false, false),
    (_project_id, 'Recuperado', '#22c55e', 4, false, true, false),
    (_project_id, 'Perdido', '#ef4444', 5, false, false, true)
  ON CONFLICT DO NOTHING;
END;
$function$;

-- Create indexes for performance
CREATE INDEX idx_crm_recovery_stages_project ON public.crm_recovery_stages(project_id);
CREATE INDEX idx_crm_contacts_recovery_stage ON public.crm_contacts(recovery_stage_id);
CREATE INDEX idx_crm_recovery_activities_contact ON public.crm_recovery_activities(contact_id);
CREATE INDEX idx_crm_recovery_activities_project ON public.crm_recovery_activities(project_id);

-- Trigger for updated_at
CREATE TRIGGER update_crm_recovery_stages_updated_at
  BEFORE UPDATE ON public.crm_recovery_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
