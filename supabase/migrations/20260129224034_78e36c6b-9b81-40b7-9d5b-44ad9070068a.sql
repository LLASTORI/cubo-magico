-- ============================================
-- OFFER MAPPINGS: Multi-Provider Support
-- NÃO IMPACTA LEDGER/ORDERS/FINANCEIRO
-- ============================================

-- 1. Add provider column with default 'hotmart'
ALTER TABLE public.offer_mappings 
ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'hotmart';

-- 2. Add origem column to track how the offer was created
ALTER TABLE public.offer_mappings 
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'manual';

-- 3. Drop old unique constraint (project_id, codigo_oferta)
ALTER TABLE public.offer_mappings 
DROP CONSTRAINT IF EXISTS offer_mappings_project_codigo_unique;

-- 4. Create new unique constraint (project_id, provider, codigo_oferta)
ALTER TABLE public.offer_mappings 
ADD CONSTRAINT offer_mappings_project_provider_codigo_unique 
UNIQUE (project_id, provider, codigo_oferta);

-- 5. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_offer_mappings_provider_lookup 
ON public.offer_mappings (project_id, provider, codigo_oferta);

-- 6. Sync id_funil from funnel names where it's still "A Definir"
UPDATE public.offer_mappings om
SET id_funil = f.name
FROM public.funnels f
WHERE om.funnel_id = f.id
  AND om.funnel_id IS NOT NULL
  AND (om.id_funil IS NULL OR om.id_funil = 'A Definir');

-- Comment for documentation
COMMENT ON COLUMN public.offer_mappings.provider IS 'Provider source: hotmart, eduzz, kiwify, etc.';
COMMENT ON COLUMN public.offer_mappings.origem IS 'Creation source: manual, api_sync, sale_fallback';