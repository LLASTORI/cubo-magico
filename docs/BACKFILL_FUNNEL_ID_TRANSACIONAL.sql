-- Backfill transacional de funnel_id em offer_mappings
-- Objetivo: corrigir ofertas órfãs/sem funil e manter consistência por projeto
-- Uso: rode no Supabase SQL Editor

BEGIN;

-- 0) SANITY CHECKS (somente leitura)
-- Tipos esperados: perpetuo, lancamento, indefinido
SELECT funnel_type, COUNT(*)
FROM public.funnels
GROUP BY funnel_type
ORDER BY COUNT(*) DESC;

-- Caso reportado
SELECT id, project_id, name, funnel_type
FROM public.funnels
WHERE id = 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2';

-- 1) Snapshot de referência antes
CREATE TEMP TABLE tmp_offer_funnel_before AS
SELECT
  om.id,
  om.project_id,
  om.funnel_id,
  CASE WHEN f.id IS NULL AND om.funnel_id IS NOT NULL THEN true ELSE false END AS invalid_funnel
FROM public.offer_mappings om
LEFT JOIN public.funnels f ON f.id = om.funnel_id;

-- 2) Backfill legado por nome (id_funil -> funnels.name), apenas quando funnel_id está NULL
UPDATE public.offer_mappings om
SET funnel_id = f.id,
    updated_at = now()
FROM public.funnels f
WHERE om.project_id = f.project_id
  AND om.funnel_id IS NULL
  AND om.id_funil IS NOT NULL
  AND btrim(lower(om.id_funil)) = btrim(lower(f.name));

-- 3) Correção específica do projeto informado (órfãos/NULL -> funnel válido)
UPDATE public.offer_mappings om
SET funnel_id = 'eba8c783-1de2-45b3-b3d7-f0d4f3c03cc2'::uuid,
    updated_at = now()
WHERE om.project_id = '7f44b177-5255-4393-a648-3f0dfc681be9'::uuid
  AND (
    om.funnel_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.funnels fx
      WHERE fx.id = om.funnel_id
    )
  );

-- 4) Pós-validação
-- 4.1 ofertas ainda inválidas (esperado: 0 para o projeto acima)
SELECT om.project_id, om.funnel_id, COUNT(*) AS linhas_invalidas
FROM public.offer_mappings om
LEFT JOIN public.funnels f ON f.id = om.funnel_id
WHERE om.funnel_id IS NOT NULL
  AND f.id IS NULL
GROUP BY om.project_id, om.funnel_id
ORDER BY linhas_invalidas DESC;

-- 4.2 delta de linhas corrigidas nesta transação
SELECT
  COUNT(*) FILTER (WHERE b.funnel_id IS NULL AND a.funnel_id IS NOT NULL) AS preenchidas_de_null,
  COUNT(*) FILTER (WHERE b.invalid_funnel IS TRUE AND a.funnel_id IS NOT NULL) AS corrigidas_orfas
FROM tmp_offer_funnel_before b
JOIN public.offer_mappings a ON a.id = b.id;

COMMIT;

-- Se quiser simular sem aplicar, troque COMMIT por ROLLBACK.
