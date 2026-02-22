-- ============================================================================
-- CUBO MÁGICO - HOTFIX FUNIS (idempotente)
-- Objetivo:
-- 1) Criar registros em public.funnels a partir do legado public.offer_mappings.id_funil
-- 2) Preencher public.offer_mappings.funnel_id com o UUID correto
--
-- Cenário alvo: projetos com offer_mappings preenchido e funnels vazio,
-- causando tela de funis sem dados.
-- ============================================================================

BEGIN;

-- 1) Criar funis ausentes por (project_id, id_funil)
--    IMPORTANTE: ignora placeholders comuns (ex.: "A Definir", "indefinido").
--    Esses valores não representam funis reais e podem poluir a UI se virarem
--    a única opção disponível.
INSERT INTO public.funnels (
  name,
  project_id,
  funnel_type,
  has_fixed_dates,
  created_at,
  updated_at
)
SELECT DISTINCT
  TRIM(om.id_funil) AS name,
  om.project_id,
  'perpetuo'::text AS funnel_type,
  TRUE AS has_fixed_dates,
  NOW() AS created_at,
  NOW() AS updated_at
FROM public.offer_mappings om
WHERE om.project_id IS NOT NULL
  AND om.id_funil IS NOT NULL
  AND TRIM(om.id_funil) <> ''
  AND LOWER(TRIM(om.id_funil)) NOT IN ('a definir', 'indefinido', 'undefined', 'sem funil')
  AND NOT EXISTS (
    SELECT 1
    FROM public.funnels f
    WHERE f.project_id = om.project_id
      AND f.name = TRIM(om.id_funil)
  );

-- 2) Backfill do vínculo UUID funnel_id em offer_mappings
--    Proteção extra: só aplica quando o nome do funil é unívoco no projeto.
--    Evita vincular cegamente casos ambíguos como múltiplos "A Definir".
UPDATE public.offer_mappings om
SET funnel_id = f.id,
    updated_at = NOW()
FROM public.funnels f
JOIN (
  SELECT project_id, name
  FROM public.funnels
  GROUP BY project_id, name
  HAVING COUNT(*) = 1
) uniq ON uniq.project_id = f.project_id AND uniq.name = f.name
WHERE om.project_id = f.project_id
  AND TRIM(om.id_funil) = f.name
  AND om.funnel_id IS NULL;

COMMIT;

-- ============================================================================
-- CONSULTAS DE VALIDAÇÃO (execute após COMMIT)
-- ============================================================================
-- a) Deve retornar 0 linhas:
-- SELECT *
-- FROM public.offer_mappings
-- WHERE project_id = '<PROJECT_UUID>'
--   AND funnel_id IS NULL;
--
-- b) Deve retornar >= 1 funil (quando existir offer_mappings para o projeto):
-- SELECT id, name, project_id
-- FROM public.funnels
-- WHERE project_id = '<PROJECT_UUID>'
-- ORDER BY name;
--
-- c) Conferir distribuição por funil:
-- SELECT f.name, COUNT(*) AS ofertas
-- FROM public.offer_mappings om
-- JOIN public.funnels f ON f.id = om.funnel_id
-- WHERE om.project_id = '<PROJECT_UUID>'
-- GROUP BY 1
-- ORDER BY 2 DESC;
