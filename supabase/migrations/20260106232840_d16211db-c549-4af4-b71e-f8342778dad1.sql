-- Create a public function to safely retrieve invite details for anonymous users
CREATE OR REPLACE FUNCTION public.get_project_invite_public(p_invite_id uuid, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_project RECORD;
  v_inviter RECORD;
  v_has_account boolean;
  v_normalized_email text;
BEGIN
  -- Normalize email
  v_normalized_email := lower(trim(p_email));
  
  -- Find the invite
  SELECT * INTO v_invite
  FROM project_invites
  WHERE id = p_invite_id
    AND lower(trim(email)) = v_normalized_email;
  
  -- Check if invite exists
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  
  -- Check if already used
  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;
  
  -- Check if expired
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;
  
  -- Get project info
  SELECT id, name INTO v_project
  FROM projects
  WHERE id = v_invite.project_id;
  
  -- Get inviter info
  SELECT full_name INTO v_inviter
  FROM profiles
  WHERE id = v_invite.invited_by;
  
  -- Check if user has an account (check auth.users via profiles)
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE lower(trim(email)) = v_normalized_email
  ) INTO v_has_account;
  
  RETURN jsonb_build_object(
    'success', true,
    'invite', jsonb_build_object(
      'id', v_invite.id,
      'project_id', v_invite.project_id,
      'project_name', v_project.name,
      'role', v_invite.role,
      'inviter_name', COALESCE(v_inviter.full_name, 'Um membro'),
      'email', v_invite.email,
      'expires_at', v_invite.expires_at
    ),
    'has_account', v_has_account
  );
END;
$$;

-- Grant execute to both anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_project_invite_public(uuid, text) TO anon, authenticated;