
-- Enum para status do atendente
CREATE TYPE public.agent_status AS ENUM ('online', 'away', 'offline', 'busy');

-- Tabela de departamentos
CREATE TABLE public.whatsapp_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, name)
);

-- Tabela de atendentes
CREATE TABLE public.whatsapp_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    status agent_status NOT NULL DEFAULT 'offline',
    max_concurrent_chats INTEGER NOT NULL DEFAULT 5,
    is_supervisor BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    work_hours JSONB DEFAULT '{"monday": {"start": "09:00", "end": "18:00"}, "tuesday": {"start": "09:00", "end": "18:00"}, "wednesday": {"start": "09:00", "end": "18:00"}, "thursday": {"start": "09:00", "end": "18:00"}, "friday": {"start": "09:00", "end": "18:00"}}'::jsonb,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

-- Relação atendente <-> departamento (N:N)
CREATE TABLE public.whatsapp_agent_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.whatsapp_agents(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.whatsapp_departments(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(agent_id, department_id)
);

-- Adicionar campos de atribuição nas conversas
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.whatsapp_departments(id),
ADD COLUMN IF NOT EXISTS queue_position INTEGER,
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.whatsapp_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_agent_departments ENABLE ROW LEVEL SECURITY;

-- Policies para departments
CREATE POLICY "Members can view departments" ON public.whatsapp_departments
    FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage departments" ON public.whatsapp_departments
    FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
    WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all departments" ON public.whatsapp_departments
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Policies para agents
CREATE POLICY "Members can view agents" ON public.whatsapp_agents
    FOR SELECT USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage agents" ON public.whatsapp_agents
    FOR ALL USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
    WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Agents can update own status" ON public.whatsapp_agents
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all agents" ON public.whatsapp_agents
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Policies para agent_departments
CREATE POLICY "Members can view agent departments" ON public.whatsapp_agent_departments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_agents a 
            WHERE a.id = agent_id AND has_project_access(auth.uid(), a.project_id)
        )
    );

CREATE POLICY "Managers and owners can manage agent departments" ON public.whatsapp_agent_departments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_agents a 
            WHERE a.id = agent_id AND get_user_project_role(auth.uid(), a.project_id) IN ('owner', 'manager')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.whatsapp_agents a 
            WHERE a.id = agent_id AND get_user_project_role(auth.uid(), a.project_id) IN ('owner', 'manager')
        )
    );

CREATE POLICY "Super admins can manage all agent departments" ON public.whatsapp_agent_departments
    FOR ALL USING (is_super_admin(auth.uid()))
    WITH CHECK (is_super_admin(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_whatsapp_departments_updated_at
    BEFORE UPDATE ON public.whatsapp_departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_agents_updated_at
    BEFORE UPDATE ON public.whatsapp_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_whatsapp_departments_project ON public.whatsapp_departments(project_id);
CREATE INDEX idx_whatsapp_agents_project ON public.whatsapp_agents(project_id);
CREATE INDEX idx_whatsapp_agents_user ON public.whatsapp_agents(user_id);
CREATE INDEX idx_whatsapp_agents_status ON public.whatsapp_agents(project_id, status) WHERE is_active = true;
CREATE INDEX idx_whatsapp_conversations_department ON public.whatsapp_conversations(department_id);
CREATE INDEX idx_whatsapp_conversations_assigned ON public.whatsapp_conversations(assigned_to) WHERE status = 'open';
