
-- =====================================================
-- SISTEMA DE CARGOS E PERMISSÕES
-- =====================================================

-- 1. Criar tabela role_templates
CREATE TABLE public.role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_role project_role DEFAULT 'operator',
  is_system_default boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  icon text DEFAULT 'user',
  
  -- Permissões por área (12 áreas)
  perm_dashboard permission_level DEFAULT 'view',
  perm_analise permission_level DEFAULT 'none',
  perm_crm permission_level DEFAULT 'none',
  perm_automacoes permission_level DEFAULT 'none',
  perm_chat_ao_vivo permission_level DEFAULT 'none',
  perm_meta_ads permission_level DEFAULT 'none',
  perm_ofertas permission_level DEFAULT 'none',
  perm_lancamentos permission_level DEFAULT 'none',
  perm_configuracoes permission_level DEFAULT 'none',
  perm_insights permission_level DEFAULT 'none',
  perm_pesquisas permission_level DEFAULT 'none',
  perm_social_listening permission_level DEFAULT 'none',
  
  -- Configurações de WhatsApp (quando chat_ao_vivo habilitado)
  whatsapp_visibility_mode text DEFAULT 'assigned_only' 
    CHECK (whatsapp_visibility_mode IN ('all', 'department', 'assigned_only', 'department_and_unassigned')),
  whatsapp_max_chats integer DEFAULT 5,
  whatsapp_is_supervisor boolean DEFAULT false,
  whatsapp_auto_create_agent boolean DEFAULT true,
  
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_system_template_name UNIQUE NULLS NOT DISTINCT (project_id, name, is_system_default)
);

-- Enable RLS
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_templates
CREATE POLICY "Users can view system templates" ON role_templates
FOR SELECT USING (is_system_default = true AND project_id IS NULL);

CREATE POLICY "Project members can view project templates" ON role_templates
FOR SELECT USING (
  project_id IS NOT NULL AND 
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = role_templates.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Managers can manage project templates" ON role_templates
FOR ALL USING (
  project_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = role_templates.project_id 
    AND pm.user_id = auth.uid() 
    AND pm.role IN ('owner', 'manager')
  )
) WITH CHECK (
  project_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = role_templates.project_id 
    AND pm.user_id = auth.uid() 
    AND pm.role IN ('owner', 'manager')
  )
);

-- 2. Alterar project_members para adicionar role_template_id
ALTER TABLE public.project_members ADD COLUMN IF NOT EXISTS role_template_id uuid REFERENCES role_templates(id) ON DELETE SET NULL;

-- 3. Alterar project_invites para adicionar role_template_id
ALTER TABLE public.project_invites ADD COLUMN IF NOT EXISTS role_template_id uuid REFERENCES role_templates(id) ON DELETE SET NULL;

-- 4. Alterar whatsapp_agents para adicionar visibility_mode
ALTER TABLE public.whatsapp_agents ADD COLUMN IF NOT EXISTS visibility_mode text DEFAULT 'all' 
  CHECK (visibility_mode IN ('all', 'department', 'assigned_only', 'department_and_unassigned'));

-- 5. Criar função can_view_conversation
CREATE OR REPLACE FUNCTION public.can_view_conversation(p_user_id uuid, p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_record record;
  conv_record record;
  project_uuid uuid;
BEGIN
  -- Busca conversa primeiro para pegar project_id
  SELECT * INTO conv_record FROM whatsapp_conversations WHERE id = p_conversation_id;
  IF NOT FOUND THEN RETURN false; END IF;
  
  project_uuid := conv_record.project_id;
  
  -- Verifica se é owner ou manager do projeto (acesso total)
  IF EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = project_uuid 
    AND pm.user_id = p_user_id 
    AND pm.role IN ('owner', 'manager')
  ) THEN
    RETURN true;
  END IF;
  
  -- Busca agente
  SELECT * INTO agent_record FROM whatsapp_agents 
  WHERE user_id = p_user_id 
  AND project_id = project_uuid
  AND is_active = true;
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  -- Supervisor vê tudo
  IF agent_record.is_supervisor OR agent_record.visibility_mode = 'all' THEN 
    RETURN true; 
  END IF;
  
  -- assigned_only: só conversas atribuídas ao agente
  IF agent_record.visibility_mode = 'assigned_only' THEN
    RETURN conv_record.assigned_to = p_user_id;
  END IF;
  
  -- department: conversas do departamento do agente
  IF agent_record.visibility_mode = 'department' THEN
    RETURN EXISTS (
      SELECT 1 FROM whatsapp_agent_departments wad
      WHERE wad.agent_id = agent_record.id 
      AND wad.department_id = conv_record.department_id
    );
  END IF;
  
  -- department_and_unassigned: departamento + não atribuídas
  IF agent_record.visibility_mode = 'department_and_unassigned' THEN
    RETURN conv_record.assigned_to IS NULL 
      OR conv_record.assigned_to = p_user_id
      OR EXISTS (
        SELECT 1 FROM whatsapp_agent_departments wad
        WHERE wad.agent_id = agent_record.id 
        AND wad.department_id = conv_record.department_id
      );
  END IF;
  
  RETURN false;
END;
$$;

-- 6. Inserir templates padrão do sistema (project_id = NULL, is_system_default = true)

-- Template 1: Administrador
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Administrador', 'Acesso total ao projeto, pode gerenciar equipe e configurações', 'manager', true, 'shield', 1,
  'admin', 'admin', 'admin', 'admin', 'admin',
  'admin', 'admin', 'admin', 'admin',
  'admin', 'admin', 'admin',
  'all', 10, true, true
);

-- Template 2: Gestor Geral
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Gestor Geral', 'Gerencia operações do projeto, sem acesso a configurações avançadas', 'manager', true, 'briefcase', 2,
  'edit', 'edit', 'edit', 'edit', 'edit',
  'edit', 'edit', 'edit', 'view',
  'edit', 'edit', 'edit',
  'all', 10, true, true
);

-- Template 3: Gestor de Tráfego
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Gestor de Tráfego', 'Foco em Meta Ads, análises de campanhas e lançamentos', 'operator', true, 'target', 3,
  'view', 'edit', 'view', 'none', 'none',
  'edit', 'edit', 'edit', 'none',
  'view', 'none', 'none',
  'assigned_only', 5, false, false
);

-- Template 4: Gestor de CRM
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Gestor de CRM', 'Gerencia contatos, jornadas e insights de clientes', 'operator', true, 'users', 4,
  'view', 'view', 'edit', 'view', 'view',
  'none', 'view', 'none', 'none',
  'edit', 'edit', 'view',
  'department', 5, false, true
);

-- Template 5: Analista de Dados
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Analista de Dados', 'Visualiza métricas e relatórios, sem edição', 'operator', true, 'bar-chart-2', 5,
  'view', 'view', 'view', 'view', 'view',
  'view', 'view', 'view', 'none',
  'view', 'view', 'view',
  'assigned_only', 0, false, false
);

-- Template 6: Supervisor de Atendimento
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Supervisor de Atendimento', 'Coordena equipe de atendentes, vê todas as conversas', 'operator', true, 'headphones', 6,
  'view', 'none', 'edit', 'edit', 'admin',
  'none', 'none', 'none', 'none',
  'view', 'none', 'none',
  'all', 15, true, true
);

-- Template 7: Atendente Avançado
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Atendente Avançado', 'Atende conversas do departamento e visualiza CRM', 'operator', true, 'message-circle', 7,
  'none', 'none', 'view', 'none', 'edit',
  'none', 'none', 'none', 'none',
  'none', 'none', 'none',
  'department', 8, false, true
);

-- Template 8: Atendente Básico
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Atendente Básico', 'Atende apenas conversas atribuídas a ele', 'operator', true, 'message-square', 8,
  'none', 'none', 'none', 'none', 'edit',
  'none', 'none', 'none', 'none',
  'none', 'none', 'none',
  'assigned_only', 5, false, true
);

-- Template 9: Operador de Automações
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Operador de Automações', 'Cria e gerencia fluxos de automação', 'operator', true, 'zap', 9,
  'view', 'none', 'view', 'edit', 'view',
  'none', 'none', 'none', 'none',
  'none', 'none', 'none',
  'assigned_only', 0, false, false
);

-- Template 10: Pesquisador
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Pesquisador', 'Gerencia pesquisas, social listening e insights', 'operator', true, 'search', 10,
  'view', 'none', 'view', 'none', 'none',
  'none', 'none', 'none', 'none',
  'edit', 'edit', 'edit',
  'assigned_only', 0, false, false
);

-- Template 11: Convidado
INSERT INTO role_templates (
  project_id, name, description, base_role, is_system_default, icon, display_order,
  perm_dashboard, perm_analise, perm_crm, perm_automacoes, perm_chat_ao_vivo,
  perm_meta_ads, perm_ofertas, perm_lancamentos, perm_configuracoes,
  perm_insights, perm_pesquisas, perm_social_listening,
  whatsapp_visibility_mode, whatsapp_max_chats, whatsapp_is_supervisor, whatsapp_auto_create_agent
) VALUES (
  NULL, 'Convidado', 'Apenas visualização básica do dashboard', 'operator', true, 'eye', 11,
  'view', 'none', 'none', 'none', 'none',
  'none', 'none', 'none', 'none',
  'none', 'none', 'none',
  'assigned_only', 0, false, false
);

-- 7. Atualizar RLS de whatsapp_conversations para usar can_view_conversation
DROP POLICY IF EXISTS "Project members can view conversations" ON whatsapp_conversations;
CREATE POLICY "Project members can view conversations based on visibility" ON whatsapp_conversations
FOR SELECT USING (can_view_conversation(auth.uid(), id));

-- Política para UPDATE: apenas conversas que pode ver
DROP POLICY IF EXISTS "Project members can update conversations" ON whatsapp_conversations;
CREATE POLICY "Project members can update visible conversations" ON whatsapp_conversations
FOR UPDATE USING (can_view_conversation(auth.uid(), id))
WITH CHECK (can_view_conversation(auth.uid(), id));

-- Manter política de INSERT para membros do projeto
DROP POLICY IF EXISTS "Project members can insert conversations" ON whatsapp_conversations;
CREATE POLICY "Project members can insert conversations" ON whatsapp_conversations
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = whatsapp_conversations.project_id AND pm.user_id = auth.uid())
);

-- Manter política de DELETE para managers/owners
DROP POLICY IF EXISTS "Managers can delete conversations" ON whatsapp_conversations;
CREATE POLICY "Managers can delete conversations" ON whatsapp_conversations
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm 
    WHERE pm.project_id = whatsapp_conversations.project_id 
    AND pm.user_id = auth.uid() 
    AND pm.role IN ('owner', 'manager')
  )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_role_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_role_templates_updated_at ON role_templates;
CREATE TRIGGER update_role_templates_updated_at
BEFORE UPDATE ON role_templates
FOR EACH ROW EXECUTE FUNCTION update_role_templates_updated_at();
