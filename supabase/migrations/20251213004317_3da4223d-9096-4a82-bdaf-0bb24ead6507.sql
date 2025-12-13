-- Tabela para cadências de follow-up
CREATE TABLE public.crm_cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_on TEXT NOT NULL DEFAULT 'stage_change', -- stage_change, new_contact, manual
  trigger_stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para passos da cadência
CREATE TABLE public.crm_cadence_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cadence_id UUID NOT NULL REFERENCES public.crm_cadences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 0,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  activity_type TEXT NOT NULL DEFAULT 'task',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para rastrear cadências aplicadas a contatos
CREATE TABLE public.crm_contact_cadences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  cadence_id UUID NOT NULL REFERENCES public.crm_cadences(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, paused, cancelled
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contact_id, cadence_id)
);

-- Índices
CREATE INDEX idx_crm_cadences_project ON public.crm_cadences(project_id);
CREATE INDEX idx_crm_cadence_steps_cadence ON public.crm_cadence_steps(cadence_id);
CREATE INDEX idx_crm_contact_cadences_contact ON public.crm_contact_cadences(contact_id);
CREATE INDEX idx_crm_contact_cadences_status ON public.crm_contact_cadences(status);

-- Enable RLS
ALTER TABLE public.crm_cadences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cadence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contact_cadences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_cadences
CREATE POLICY "Members can view cadences"
ON public.crm_cadences FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage cadences"
ON public.crm_cadences FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all cadences"
ON public.crm_cadences FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for crm_cadence_steps
CREATE POLICY "Members can view cadence steps"
ON public.crm_cadence_steps FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.crm_cadences c
  WHERE c.id = cadence_id AND has_project_access(auth.uid(), c.project_id)
));

CREATE POLICY "Managers and owners can manage cadence steps"
ON public.crm_cadence_steps FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.crm_cadences c
  WHERE c.id = cadence_id AND get_user_project_role(auth.uid(), c.project_id) IN ('owner', 'manager')
));

CREATE POLICY "Super admins can manage all cadence steps"
ON public.crm_cadence_steps FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for crm_contact_cadences
CREATE POLICY "Members can view contact cadences"
ON public.crm_contact_cadences FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.crm_contacts c
  WHERE c.id = contact_id AND has_project_access(auth.uid(), c.project_id)
));

CREATE POLICY "Managers and owners can manage contact cadences"
ON public.crm_contact_cadences FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.crm_contacts c
  WHERE c.id = contact_id AND get_user_project_role(auth.uid(), c.project_id) IN ('owner', 'manager')
));

CREATE POLICY "Super admins can manage all contact cadences"
ON public.crm_contact_cadences FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Triggers
CREATE TRIGGER update_crm_cadences_updated_at
  BEFORE UPDATE ON public.crm_cadences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_cadence_steps_updated_at
  BEFORE UPDATE ON public.crm_cadence_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_contact_cadences_updated_at
  BEFORE UPDATE ON public.crm_contact_cadences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();