-- ============================================
-- ORDERS CORE: Materializar UTMs como colunas físicas
-- Elimina parsing em runtime, permite filtros SQL diretos
-- ============================================

-- 1. Adicionar colunas UTM canônicas na tabela orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_adset TEXT,
ADD COLUMN IF NOT EXISTS utm_placement TEXT,
ADD COLUMN IF NOT EXISTS utm_creative TEXT,
ADD COLUMN IF NOT EXISTS raw_sck TEXT;

-- 2. Adicionar colunas para Meta IDs extraídos
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
ADD COLUMN IF NOT EXISTS meta_adset_id TEXT,
ADD COLUMN IF NOT EXISTS meta_ad_id TEXT;

-- 3. Criar índices para filtros SQL otimizados
CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON public.orders(project_id, utm_source) WHERE utm_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign ON public.orders(project_id, utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_utm_adset ON public.orders(project_id, utm_adset) WHERE utm_adset IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_utm_placement ON public.orders(project_id, utm_placement) WHERE utm_placement IS NOT NULL;

-- 4. Criar índice composto para consultas frequentes (source + campaign)
CREATE INDEX IF NOT EXISTS idx_orders_utm_source_campaign ON public.orders(project_id, utm_source, utm_campaign) WHERE utm_source IS NOT NULL;

-- 5. Criar índice para Meta IDs (join com meta_ads)
CREATE INDEX IF NOT EXISTS idx_orders_meta_campaign_id ON public.orders(project_id, meta_campaign_id) WHERE meta_campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_meta_adset_id ON public.orders(project_id, meta_adset_id) WHERE meta_adset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_meta_ad_id ON public.orders(project_id, meta_ad_id) WHERE meta_ad_id IS NOT NULL;

-- 6. Adicionar comentários para documentação
COMMENT ON COLUMN public.orders.utm_source IS 'UTM source extracted from SCK (e.g., "Meta-Ads", "wpp"). RAW - never normalized.';
COMMENT ON COLUMN public.orders.utm_campaign IS 'UTM campaign from SCK part[2]. Includes campaign name and Meta ID suffix.';
COMMENT ON COLUMN public.orders.utm_adset IS 'UTM adset from SCK part[1]. Maps to utm_medium in legacy systems.';
COMMENT ON COLUMN public.orders.utm_placement IS 'UTM placement from SCK part[3]. Maps to utm_term in legacy systems.';
COMMENT ON COLUMN public.orders.utm_creative IS 'UTM creative from SCK part[4]. Maps to utm_content in legacy systems.';
COMMENT ON COLUMN public.orders.raw_sck IS 'Original SCK string from checkout for audit purposes.';
COMMENT ON COLUMN public.orders.meta_campaign_id IS 'Meta Ads campaign ID extracted from utm_campaign suffix.';
COMMENT ON COLUMN public.orders.meta_adset_id IS 'Meta Ads adset ID extracted from utm_adset suffix.';
COMMENT ON COLUMN public.orders.meta_ad_id IS 'Meta Ads ad ID extracted from utm_creative suffix.';