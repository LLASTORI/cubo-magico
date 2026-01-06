-- Fix invite/access flows: ensure user email lookup works even when profiles.email is missing

CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT email FROM auth.users WHERE id = _user_id),
    (SELECT email FROM public.profiles WHERE id = _user_id)
  )
$$;

-- Fix accept invite: use robust email lookup and avoid relying solely on profiles.email
CREATE OR REPLACE FUNCTION public.accept_project_invite(p_invite_id uuid, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invite RECORD;
  v_member_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get user's email reliably
  v_user_email := public.get_user_email(p_user_id);

  IF v_user_email IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Email do usuário não encontrado');
  END IF;

  -- Fetch and validate invite
  SELECT 
    pi.*,
    rt.id as template_id,
    rt.perm_dashboard,
    rt.perm_analise,
    rt.perm_crm,
    rt.perm_automacoes,
    rt.perm_chat_ao_vivo,
    rt.perm_meta_ads,
    rt.perm_ofertas,
    rt.perm_lancamentos,
    rt.perm_configuracoes,
    rt.perm_insights,
    rt.perm_pesquisas,
    rt.perm_social_listening,
    rt.whatsapp_auto_create_agent,
    rt.whatsapp_visibility_mode,
    rt.whatsapp_max_chats,
    rt.whatsapp_is_supervisor
  INTO v_invite
  FROM public.project_invites pi
  LEFT JOIN public.role_templates rt ON rt.id = pi.role_template_id
  WHERE pi.id = p_invite_id
    AND lower(pi.email) = lower(v_user_email)
    AND pi.status = 'pending'
    AND pi.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado, já aceito ou expirado');
  END IF;

  -- Already member
  IF EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = v_invite.project_id AND user_id = p_user_id
  ) THEN
    UPDATE public.project_invites 
    SET status = 'accepted', responded_at = NOW()
    WHERE id = p_invite_id;

    RETURN json_build_object('success', true, 'message', 'Usuário já é membro do projeto');
  END IF;

  -- 1) Mark invite accepted
  UPDATE public.project_invites 
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_invite_id;

  -- 2) Insert membership
  INSERT INTO public.project_members (
    project_id,
    user_id,
    role,
    role_template_id
  ) VALUES (
    v_invite.project_id,
    p_user_id,
    v_invite.role,
    v_invite.role_template_id
  )
  RETURNING id INTO v_member_id;

  -- 3) Permissions based on template (if any)
  IF v_invite.template_id IS NOT NULL THEN
    INSERT INTO public.project_member_permissions (
      project_id,
      user_id,
      dashboard,
      analise,
      crm,
      automacoes,
      chat_ao_vivo,
      meta_ads,
      ofertas,
      lancamentos,
      configuracoes,
      insights,
      pesquisas,
      social_listening
    ) VALUES (
      v_invite.project_id,
      p_user_id,
      COALESCE(v_invite.perm_dashboard, 'none'),
      COALESCE(v_invite.perm_analise, 'none'),
      COALESCE(v_invite.perm_crm, 'none'),
      COALESCE(v_invite.perm_automacoes, 'none'),
      COALESCE(v_invite.perm_chat_ao_vivo, 'none'),
      COALESCE(v_invite.perm_meta_ads, 'none'),
      COALESCE(v_invite.perm_ofertas, 'none'),
      COALESCE(v_invite.perm_lancamentos, 'none'),
      COALESCE(v_invite.perm_configuracoes, 'none'),
      COALESCE(v_invite.perm_insights, 'none'),
      COALESCE(v_invite.perm_pesquisas, 'none'),
      COALESCE(v_invite.perm_social_listening, 'none')
    )
    ON CONFLICT (project_id, user_id) DO UPDATE SET
      dashboard = EXCLUDED.dashboard,
      analise = EXCLUDED.analise,
      crm = EXCLUDED.crm,
      automacoes = EXCLUDED.automacoes,
      chat_ao_vivo = EXCLUDED.chat_ao_vivo,
      meta_ads = EXCLUDED.meta_ads,
      ofertas = EXCLUDED.ofertas,
      lancamentos = EXCLUDED.lancamentos,
      configuracoes = EXCLUDED.configuracoes,
      insights = EXCLUDED.insights,
      pesquisas = EXCLUDED.pesquisas,
      social_listening = EXCLUDED.social_listening,
      updated_at = NOW();

    -- 4) Create WhatsApp agent if configured
    IF v_invite.perm_chat_ao_vivo IS NOT NULL 
       AND v_invite.perm_chat_ao_vivo != 'none'
       AND v_invite.whatsapp_auto_create_agent = true THEN
      INSERT INTO public.whatsapp_agents (
        project_id,
        user_id,
        visibility_mode,
        max_chats,
        is_supervisor,
        is_active
      ) VALUES (
        v_invite.project_id,
        p_user_id,
        COALESCE(v_invite.whatsapp_visibility_mode, 'assigned_only'),
        COALESCE(v_invite.whatsapp_max_chats, 5),
        COALESCE(v_invite.whatsapp_is_supervisor, false),
        true
      )
      ON CONFLICT (project_id, user_id) DO UPDATE SET
        visibility_mode = EXCLUDED.visibility_mode,
        max_chats = EXCLUDED.max_chats,
        is_supervisor = EXCLUDED.is_supervisor,
        is_active = true,
        updated_at = NOW();
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'member_id', v_member_id,
    'project_id', v_invite.project_id
  );
END;
$function$;