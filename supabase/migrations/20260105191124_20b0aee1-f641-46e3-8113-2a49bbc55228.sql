-- Corrigir search_path da função create_team_member_contact
CREATE OR REPLACE FUNCTION public.create_team_member_contact(
  p_project_id uuid,
  p_user_id uuid,
  p_email text,
  p_name text,
  p_phone text DEFAULT NULL,
  p_phone_ddd text DEFAULT NULL,
  p_phone_country_code text DEFAULT '55'
) RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;