-- Fix delete_funnel_safe: delete ALL FK-dependent rows before deleting the funnel.
-- Previous version only handled offer_mappings, causing FK violations on:
-- funnel_meta_accounts, launch_editions, launch_phases, launch_products,
-- funnel_changes, funnel_experiments, funnel_score_history, phase_campaigns.

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

  -- 1. Detach offer_mappings from phases of this funnel (before deleting phases)
  UPDATE public.offer_mappings
  SET phase_id = NULL
  WHERE phase_id IN (
    SELECT id FROM public.launch_phases WHERE funnel_id = p_funnel_id
  );

  -- 2. Delete phase_campaigns (FK → launch_phases)
  DELETE FROM public.phase_campaigns
  WHERE phase_id IN (
    SELECT id FROM public.launch_phases WHERE funnel_id = p_funnel_id
  );

  -- 3. Delete launch_phases (FK → funnels, FK → launch_editions)
  DELETE FROM public.launch_phases
  WHERE funnel_id = p_funnel_id;

  -- 4. Delete launch_editions (FK → funnels)
  DELETE FROM public.launch_editions
  WHERE funnel_id = p_funnel_id;

  -- 5. Delete launch_products (FK → funnels)
  DELETE FROM public.launch_products
  WHERE funnel_id = p_funnel_id;

  -- 6. Delete funnel_meta_accounts (FK → funnels)
  DELETE FROM public.funnel_meta_accounts
  WHERE funnel_id = p_funnel_id;

  -- 7. Delete funnel_changes (FK → funnels)
  DELETE FROM public.funnel_changes
  WHERE funnel_id = p_funnel_id;

  -- 8. Delete funnel_experiments (FK → funnels)
  DELETE FROM public.funnel_experiments
  WHERE funnel_id = p_funnel_id;

  -- 9. Delete funnel_score_history (FK → funnels)
  DELETE FROM public.funnel_score_history
  WHERE funnel_id = p_funnel_id;

  -- 10. Detach offer_mappings from funnel (preserve mappings for audit)
  UPDATE public.offer_mappings
  SET funnel_id = NULL,
      id_funil = 'A Definir',
      updated_at = now()
  WHERE funnel_id = p_funnel_id;

  -- 11. Delete the funnel itself
  DELETE FROM public.funnels
  WHERE id = p_funnel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_funnel_safe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_funnel_safe(uuid) TO authenticated;
