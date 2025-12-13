-- Tabela para etapas do pipeline (funil de vendas CRM)
CREATE TABLE public.crm_pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna de stage ao contato
ALTER TABLE public.crm_contacts 
ADD COLUMN pipeline_stage_id UUID REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL;

-- Adicionar coluna de notas/anotações ao contato
ALTER TABLE public.crm_contacts 
ADD COLUMN notes TEXT;

-- Tabela para atividades/tarefas
CREATE TABLE public.crm_activities_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL DEFAULT 'task', -- task, call, meeting, email, whatsapp, reminder
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_crm_contacts_pipeline_stage ON public.crm_contacts(pipeline_stage_id);
CREATE INDEX idx_crm_activities_tasks_contact ON public.crm_activities_tasks(contact_id);
CREATE INDEX idx_crm_activities_tasks_due_date ON public.crm_activities_tasks(due_date);
CREATE INDEX idx_crm_activities_tasks_status ON public.crm_activities_tasks(status);
CREATE INDEX idx_crm_pipeline_stages_project ON public.crm_pipeline_stages(project_id);

-- Enable RLS
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crm_pipeline_stages
CREATE POLICY "Members can view pipeline stages"
ON public.crm_pipeline_stages
FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage pipeline stages"
ON public.crm_pipeline_stages
FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all pipeline stages"
ON public.crm_pipeline_stages
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for crm_activities_tasks
CREATE POLICY "Members can view activities"
ON public.crm_activities_tasks
FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage activities"
ON public.crm_activities_tasks
FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all activities"
ON public.crm_activities_tasks
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_crm_pipeline_stages_updated_at
  BEFORE UPDATE ON public.crm_pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_crm_activities_tasks_updated_at
  BEFORE UPDATE ON public.crm_activities_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar etapas padrão do pipeline quando um projeto ativa o CRM
CREATE OR REPLACE FUNCTION public.create_default_pipeline_stages(_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.crm_pipeline_stages (project_id, name, color, position, is_default, is_won, is_lost)
  VALUES 
    (_project_id, 'Novo Lead', '#6366f1', 0, true, false, false),
    (_project_id, 'Qualificado', '#f59e0b', 1, false, false, false),
    (_project_id, 'Negociação', '#3b82f6', 2, false, false, false),
    (_project_id, 'Proposta Enviada', '#8b5cf6', 3, false, false, false),
    (_project_id, 'Fechado - Ganho', '#22c55e', 4, false, true, false),
    (_project_id, 'Fechado - Perdido', '#ef4444', 5, false, false, true)
  ON CONFLICT DO NOTHING;
END;
$$;