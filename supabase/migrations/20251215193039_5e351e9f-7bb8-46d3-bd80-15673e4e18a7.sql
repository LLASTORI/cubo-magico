-- Harden activity logging RPC to prevent users forging logs for other users
CREATE OR REPLACE FUNCTION public.log_user_activity(
    p_user_id uuid,
    p_action text,
    p_entity_type text,
    p_entity_id text DEFAULT NULL,
    p_entity_name text DEFAULT NULL,
    p_project_id uuid DEFAULT NULL,
    p_details jsonb DEFAULT '{}'::jsonb,
    p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Require authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'not authenticated';
    END IF;

    -- Only allow logging for self, except super admins
    IF auth.uid() <> p_user_id AND NOT public.is_super_admin(auth.uid()) THEN
        RAISE EXCEPTION 'not allowed';
    END IF;

    INSERT INTO public.user_activity_logs (
        user_id,
        project_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        details,
        user_agent
    ) VALUES (
        p_user_id,
        p_project_id,
        p_action,
        p_entity_type,
        NULLIF(p_entity_id, '')::uuid,
        p_entity_name,
        COALESCE(p_details, '{}'::jsonb),
        p_user_agent
    );
END;
$$;