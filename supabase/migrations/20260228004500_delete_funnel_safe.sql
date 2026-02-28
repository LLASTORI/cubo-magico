-- Delete funnel safely while preserving offer mappings.
-- This function bypasses row-level visibility issues in migrated datasets,
-- but still enforces ownership by requiring auth user to own the funnel project.

CREATE OR REPLACE FUNCTION public.delete_funnel_safe(p_funnel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_owner uuid;
BEGIN
  IF p_funnel_id IS NULL THEN
    RAISE EXCEPTION 'p_funnel_id is required';
  END IF;

  SELECT p.user_id
  INTO v_project_owner
  FROM public.funnels f
  JOIN public.projects p ON p.id = f.project_id
  WHERE f.id = p_funnel_id;

  IF v_project_owner IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Funnel não encontrado';
  END IF;

  IF v_project_owner <> auth.uid() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem permissão para excluir este funil';
  END IF;

  UPDATE public.offer_mappings
  SET funnel_id = NULL,
      id_funil = 'A Definir',
      updated_at = now()
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.funnels
  WHERE id = p_funnel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_funnel_safe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_funnel_safe(uuid) TO authenticated;
