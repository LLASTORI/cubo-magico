-- Create an internal-only function for VPS credential retrieval
-- This function ONLY works when called with service_role key (no RLS)
-- It does NOT check auth.uid() since VPS calls are pre-authenticated via X-Cubo-Internal-Key

CREATE OR REPLACE FUNCTION public.get_project_credentials_internal(p_project_id uuid)
RETURNS TABLE(
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
  -- No auth.uid() check - this function is only for service_role calls
  -- Security is enforced at the edge function layer via X-Cubo-Internal-Key
  
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
END;
$$;

-- Revoke public access - only service_role can call this
REVOKE ALL ON FUNCTION public.get_project_credentials_internal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_project_credentials_internal(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_project_credentials_internal(uuid) FROM authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_project_credentials_internal(uuid) IS 
'Internal function for VPS/service-role credential retrieval. Bypasses auth.uid() checks. Security enforced at edge function layer via X-Cubo-Internal-Key.';