-- Index para busca eficiente por instagram handle
CREATE INDEX IF NOT EXISTS idx_crm_contacts_instagram
  ON crm_contacts(project_id, lower(instagram))
  WHERE instagram IS NOT NULL;

-- RPC de merge: dado um handle de instagram, funde todos os shadow profiles
-- encontrados naquele projeto com o contato-alvo (rico).
--
-- Shadow profiles são identificados por source = 'social_listing' (typo histórico).
-- O que é transferido: social_comments (crm_contact_id + contact_id), tags (union).
-- O shadow é deletado após o merge.
--
-- Retorna: jsonb com merged=true/false, shadow_ids[], comments_transferred
CREATE OR REPLACE FUNCTION merge_instagram_shadow(
  p_project_id     uuid,
  p_instagram      text,
  p_target_id      uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_shadow_ids   uuid[];
  v_comments_transferred int := 0;
  v_handle_norm  text;
BEGIN
  v_handle_norm := lower(trim(regexp_replace(p_instagram, '^@+', '')));

  IF v_handle_norm = '' THEN
    RETURN jsonb_build_object('merged', false, 'reason', 'empty_handle');
  END IF;

  -- Coletar todos os shadow profiles com esse instagram (exceto o próprio target)
  SELECT array_agg(id) INTO v_shadow_ids
  FROM crm_contacts
  WHERE project_id = p_project_id
    AND source = 'social_listing'
    AND lower(trim(regexp_replace(instagram, '^@+', ''))) = v_handle_norm
    AND id <> p_target_id;

  IF v_shadow_ids IS NULL OR array_length(v_shadow_ids, 1) = 0 THEN
    RETURN jsonb_build_object('merged', false, 'reason', 'no_shadow_found');
  END IF;

  -- Transferir social_comments dos shadows para o contato rico
  UPDATE social_comments
  SET crm_contact_id = p_target_id,
      contact_id     = p_target_id
  WHERE project_id = p_project_id
    AND crm_contact_id = ANY(v_shadow_ids);

  GET DIAGNOSTICS v_comments_transferred = ROW_COUNT;

  -- Mesclar tags (union sem duplicatas)
  UPDATE crm_contacts AS target
  SET tags = (
    SELECT array_agg(DISTINCT tag ORDER BY tag)
    FROM (
      SELECT unnest(COALESCE(target.tags, '{}')) AS tag
      UNION
      SELECT unnest(COALESCE(shadow.tags, '{}')) AS tag
      FROM crm_contacts shadow
      WHERE shadow.id = ANY(v_shadow_ids)
    ) all_tags
  )
  WHERE target.id = p_target_id;

  -- Atualizar instagram no contato rico (caso ainda não tenha)
  UPDATE crm_contacts
  SET instagram = v_handle_norm,
      updated_at = now()
  WHERE id = p_target_id
    AND (instagram IS NULL OR instagram = '');

  -- Deletar shadows (social_comments já foram transferidos)
  DELETE FROM crm_contacts
  WHERE id = ANY(v_shadow_ids);

  RETURN jsonb_build_object(
    'merged',               true,
    'shadow_ids',           v_shadow_ids,
    'comments_transferred', v_comments_transferred
  );
END;
$$;

-- Permissão para service_role chamar via RPC
GRANT EXECUTE ON FUNCTION merge_instagram_shadow(uuid, text, uuid) TO service_role;
