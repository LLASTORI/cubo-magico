-- =============================================
-- FASE 1: ALTERAÇÕES NO BANCO DE DADOS (CORRIGIDO)
-- =============================================

-- 1.1. Alterar tabela profiles - Dados de contato e vínculo CRM
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_ddd text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '55';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Sao_Paulo';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS crm_contact_id uuid;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- 1.2. Alterar tabela crm_contacts - Vínculo com usuários do sistema
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE crm_contacts ADD COLUMN IF NOT EXISTS is_team_member boolean DEFAULT false;

-- 1.3. Alterar tabela terms_acceptances - Dados de conformidade
ALTER TABLE terms_acceptances ADD COLUMN IF NOT EXISTS acceptance_method text DEFAULT 'checkbox';
ALTER TABLE terms_acceptances ADD COLUMN IF NOT EXISTS scrolled_to_end boolean DEFAULT false;
ALTER TABLE terms_acceptances ADD COLUMN IF NOT EXISTS time_spent_seconds integer;

-- 1.4. Criar tabela terms_versions para versionamento dinâmico
CREATE TABLE IF NOT EXISTS terms_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  title text NOT NULL,
  content text NOT NULL,
  is_active boolean DEFAULT false,
  requires_reaccept boolean DEFAULT false,
  effective_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS na tabela terms_versions
ALTER TABLE terms_versions ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública para termos (todos podem ler)
DROP POLICY IF EXISTS "Termos são públicos para leitura" ON terms_versions;
CREATE POLICY "Termos são públicos para leitura"
ON terms_versions
FOR SELECT
USING (true);

-- Política de escrita apenas para super admins
DROP POLICY IF EXISTS "Apenas admins podem gerenciar termos" ON terms_versions;
CREATE POLICY "Apenas admins podem gerenciar termos"
ON terms_versions
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Inserir versão atual dos termos
INSERT INTO terms_versions (version, title, content, is_active, requires_reaccept, effective_date)
VALUES (
  '1.0',
  'Termos de Uso e Política de Privacidade',
  'Versão 1.0 dos Termos de Uso do Cubo Mágico. Última atualização: Janeiro de 2025.',
  true,
  false,
  now()
) ON CONFLICT (version) DO NOTHING;

-- 1.5. Criar função para criar contato CRM de membro da equipe
CREATE OR REPLACE FUNCTION create_team_member_contact(
  p_project_id uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_phone text DEFAULT NULL,
  p_phone_ddd text DEFAULT NULL,
  p_phone_country_code text DEFAULT '55'
) RETURNS uuid AS $$
DECLARE
  v_contact_id uuid;
BEGIN
  -- Verificar se já existe contato com esse email no projeto
  SELECT id INTO v_contact_id 
  FROM crm_contacts 
  WHERE project_id = p_project_id AND email = p_email;
  
  IF v_contact_id IS NOT NULL THEN
    -- Atualizar contato existente
    UPDATE crm_contacts SET
      user_id = p_user_id,
      is_team_member = true,
      tags = array_append(
        COALESCE(array_remove(tags, 'Equipe'), ARRAY[]::text[]), 
        'Equipe'
      ),
      updated_at = now()
    WHERE id = v_contact_id;
  ELSE
    -- Criar novo contato
    INSERT INTO crm_contacts (
      project_id, email, name, phone, phone_ddd, phone_country_code,
      source, status, user_id, is_team_member, tags
    ) VALUES (
      p_project_id, p_email, p_name, p_phone, p_phone_ddd, p_phone_country_code,
      'team_member', 'active', p_user_id, true, ARRAY['Equipe']
    )
    RETURNING id INTO v_contact_id;
  END IF;
  
  -- Atualizar profile com referência ao contato
  UPDATE profiles SET crm_contact_id = v_contact_id WHERE id = p_user_id;
  
  RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_crm_contacts_user_id ON crm_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_is_team_member ON crm_contacts(is_team_member);
CREATE INDEX IF NOT EXISTS idx_profiles_crm_contact_id ON profiles(crm_contact_id);
CREATE INDEX IF NOT EXISTS idx_terms_versions_is_active ON terms_versions(is_active);