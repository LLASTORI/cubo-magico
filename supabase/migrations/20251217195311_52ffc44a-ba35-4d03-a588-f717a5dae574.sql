-- Drop and recreate the view without SECURITY DEFINER
-- Views in Postgres default to SECURITY INVOKER, which is the secure option

DROP VIEW IF EXISTS public.project_credentials_secure;

-- Recreate using a function-based approach for controlled access
CREATE OR REPLACE FUNCTION public.get_project_credentials_secure(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  provider text,
  client_id text,
  client_secret text,
  basic_auth text,
  is_configured boolean,
  is_validated boolean,
  validated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has access to this project
  IF NOT has_project_access(auth.uid(), p_project_id) AND NOT is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to project credentials';
  END IF;
  
  -- Check if user is owner or manager (can see decrypted values)
  IF get_user_project_role(auth.uid(), p_project_id) IN ('owner', 'manager') OR is_super_admin(auth.uid()) THEN
    RETURN QUERY
    SELECT 
      pc.id,
      pc.project_id,
      pc.provider,
      pc.client_id,
      public.decrypt_sensitive(pc.client_secret_encrypted) as client_secret,
      public.decrypt_sensitive(pc.basic_auth_encrypted) as basic_auth,
      pc.is_configured,
      pc.is_validated,
      pc.validated_at,
      pc.created_at,
      pc.updated_at
    FROM public.project_credentials pc
    WHERE pc.project_id = p_project_id;
  ELSE
    -- Operators can see masked values
    RETURN QUERY
    SELECT 
      pc.id,
      pc.project_id,
      pc.provider,
      pc.client_id,
      '********'::text as client_secret,
      '********'::text as basic_auth,
      pc.is_configured,
      pc.is_validated,
      pc.validated_at,
      pc.created_at,
      pc.updated_at
    FROM public.project_credentials pc
    WHERE pc.project_id = p_project_id;
  END IF;
END;
$$;