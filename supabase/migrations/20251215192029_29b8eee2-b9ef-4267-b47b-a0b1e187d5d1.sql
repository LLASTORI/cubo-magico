-- Create a SECURITY DEFINER function to log activity reliably
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
        p_entity_id,
        p_entity_name,
        p_details,
        p_user_agent
    );
END;
$$;