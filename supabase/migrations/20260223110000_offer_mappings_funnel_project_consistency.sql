-- Enforce consistency between offer_mappings.project_id and funnels.project_id
-- when offer_mappings.funnel_id is present.

-- ============================================
-- 1) AUDIT + CORRECTION (before strict blocking)
-- ============================================
-- Audit query (can be re-used manually in operations runbooks):
--
-- SELECT
--   om.id,
--   om.project_id AS offer_mapping_project_id,
--   om.funnel_id,
--   f.project_id AS funnel_project_id,
--   om.provider,
--   om.codigo_oferta,
--   om.updated_at
-- FROM public.offer_mappings om
-- JOIN public.funnels f
--   ON f.id = om.funnel_id
-- WHERE om.funnel_id IS NOT NULL
--   AND om.project_id IS DISTINCT FROM f.project_id
-- ORDER BY om.updated_at DESC NULLS LAST;

-- Automatic correction strategy:
-- align offer_mappings.project_id with the owning project of its funnel.
UPDATE public.offer_mappings om
SET project_id = f.project_id,
    updated_at = now()
FROM public.funnels f
WHERE om.funnel_id IS NOT NULL
  AND f.id = om.funnel_id
  AND om.project_id IS DISTINCT FROM f.project_id;

-- ============================================
-- 2) STRICT VALIDATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.validate_offer_mapping_funnel_project()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_funnel_project_id uuid;
BEGIN
  IF NEW.funnel_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT project_id
    INTO v_funnel_project_id
  FROM public.funnels
  WHERE id = NEW.funnel_id;

  IF v_funnel_project_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = format(
        'offer_mappings.funnel_id %s não encontrado em public.funnels',
        NEW.funnel_id
      );
  END IF;

  IF NEW.project_id IS DISTINCT FROM v_funnel_project_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format(
        'Inconsistência de projeto: offer_mappings.project_id (%s) difere de funnels.project_id (%s) para funnel_id %s',
        NEW.project_id,
        v_funnel_project_id,
        NEW.funnel_id
      );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_offer_mapping_funnel_project ON public.offer_mappings;

CREATE TRIGGER trg_validate_offer_mapping_funnel_project
BEFORE INSERT OR UPDATE ON public.offer_mappings
FOR EACH ROW
EXECUTE FUNCTION public.validate_offer_mapping_funnel_project();
