-- Pastas para organização dos fluxos
CREATE TABLE public.automation_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.automation_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fluxos de automação
CREATE TABLE public.automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.automation_folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_type TEXT NOT NULL DEFAULT 'keyword',
  trigger_config JSONB NOT NULL DEFAULT '{}',
  viewport JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nós do fluxo (cada bloco no canvas)
CREATE TABLE public.automation_flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL,
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Conexões entre nós
CREATE TABLE public.automation_flow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.automation_flow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.automation_flow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_handle TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Execuções de fluxos (tracking)
CREATE TABLE public.automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.automation_flows(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running',
  current_node_id UUID REFERENCES public.automation_flow_nodes(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_log JSONB NOT NULL DEFAULT '[]',
  next_execution_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Templates de mensagem reutilizáveis
CREATE TABLE public.automation_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  variables TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_message_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_folders
CREATE POLICY "Members can view automation folders" ON public.automation_folders
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage automation folders" ON public.automation_folders
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all automation folders" ON public.automation_folders
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for automation_flows
CREATE POLICY "Members can view automation flows" ON public.automation_flows
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage automation flows" ON public.automation_flows
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all automation flows" ON public.automation_flows
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for automation_flow_nodes
CREATE POLICY "Members can view automation flow nodes" ON public.automation_flow_nodes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND has_project_access(auth.uid(), f.project_id)
  ));

CREATE POLICY "Managers and owners can manage automation flow nodes" ON public.automation_flow_nodes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND get_user_project_role(auth.uid(), f.project_id) IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND get_user_project_role(auth.uid(), f.project_id) IN ('owner', 'manager')
  ));

CREATE POLICY "Super admins can manage all automation flow nodes" ON public.automation_flow_nodes
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for automation_flow_edges
CREATE POLICY "Members can view automation flow edges" ON public.automation_flow_edges
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND has_project_access(auth.uid(), f.project_id)
  ));

CREATE POLICY "Managers and owners can manage automation flow edges" ON public.automation_flow_edges
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND get_user_project_role(auth.uid(), f.project_id) IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND get_user_project_role(auth.uid(), f.project_id) IN ('owner', 'manager')
  ));

CREATE POLICY "Super admins can manage all automation flow edges" ON public.automation_flow_edges
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for automation_executions
CREATE POLICY "Members can view automation executions" ON public.automation_executions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND has_project_access(auth.uid(), f.project_id)
  ));

CREATE POLICY "Managers and owners can manage automation executions" ON public.automation_executions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND get_user_project_role(auth.uid(), f.project_id) IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.automation_flows f 
    WHERE f.id = flow_id AND get_user_project_role(auth.uid(), f.project_id) IN ('owner', 'manager')
  ));

CREATE POLICY "Super admins can manage all automation executions" ON public.automation_executions
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for automation_message_templates
CREATE POLICY "Members can view automation message templates" ON public.automation_message_templates
  FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage automation message templates" ON public.automation_message_templates
  FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all automation message templates" ON public.automation_message_templates
  FOR ALL USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_automation_flows_project_id ON public.automation_flows(project_id);
CREATE INDEX idx_automation_flows_trigger_type ON public.automation_flows(trigger_type);
CREATE INDEX idx_automation_flows_is_active ON public.automation_flows(is_active);
CREATE INDEX idx_automation_flow_nodes_flow_id ON public.automation_flow_nodes(flow_id);
CREATE INDEX idx_automation_flow_edges_flow_id ON public.automation_flow_edges(flow_id);
CREATE INDEX idx_automation_executions_flow_id ON public.automation_executions(flow_id);
CREATE INDEX idx_automation_executions_contact_id ON public.automation_executions(contact_id);
CREATE INDEX idx_automation_executions_status ON public.automation_executions(status);
CREATE INDEX idx_automation_executions_next_execution ON public.automation_executions(next_execution_at) WHERE next_execution_at IS NOT NULL;
CREATE INDEX idx_automation_message_templates_project_id ON public.automation_message_templates(project_id);

-- Triggers for updated_at
CREATE TRIGGER update_automation_folders_updated_at
  BEFORE UPDATE ON public.automation_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_flows_updated_at
  BEFORE UPDATE ON public.automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_flow_nodes_updated_at
  BEFORE UPDATE ON public.automation_flow_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_executions_updated_at
  BEFORE UPDATE ON public.automation_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_message_templates_updated_at
  BEFORE UPDATE ON public.automation_message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();