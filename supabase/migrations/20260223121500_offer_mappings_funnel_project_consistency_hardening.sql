-- Hardening rollout for offer_mappings/funnels project consistency.
-- Adds operational audit helpers and a post-fix assertion before strict trigger enforcement.

-- 1) Operational audit query helper (re-runnable)
create or replace view public.v_offer_mappings_funnel_project_inconsistencies as
select
  om.id,
  om.project_id as offer_mapping_project_id,
  om.funnel_id,
  f.project_id as funnel_project_id,
  om.provider,
  om.codigo_oferta,
  om.updated_at
from public.offer_mappings om
join public.funnels f
  on f.id = om.funnel_id
where om.funnel_id is not null
  and om.project_id is distinct from f.project_id;

comment on view public.v_offer_mappings_funnel_project_inconsistencies is
'Auditoria de inconsistências entre offer_mappings.project_id e funnels.project_id.';

-- 2) Correct current inconsistent rows before strict blocking
update public.offer_mappings om
set project_id = f.project_id,
    updated_at = now()
from public.funnels f
where om.funnel_id is not null
  and f.id = om.funnel_id
  and om.project_id is distinct from f.project_id;

-- 3) Assert there are no residual inconsistencies after correction
DO $$
DECLARE
  v_remaining bigint;
BEGIN
  select count(*)
    into v_remaining
  from public.v_offer_mappings_funnel_project_inconsistencies;

  if v_remaining > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'Ainda existem %s inconsistências entre offer_mappings.project_id e funnels.project_id após correção.',
        v_remaining
      );
  end if;
END;
$$;
