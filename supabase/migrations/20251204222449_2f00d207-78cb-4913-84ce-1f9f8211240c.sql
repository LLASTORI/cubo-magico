-- Add attribution fields to hotmart_sales for intelligent sync
ALTER TABLE public.hotmart_sales 
ADD COLUMN IF NOT EXISTS sale_attribution_type text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS meta_campaign_id_extracted text,
ADD COLUMN IF NOT EXISTS meta_adset_id_extracted text,
ADD COLUMN IF NOT EXISTS meta_ad_id_extracted text,
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone DEFAULT now();

-- Add index for attribution type queries
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_attribution_type 
ON public.hotmart_sales(sale_attribution_type);

-- Add index for extracted meta IDs
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_meta_campaign 
ON public.hotmart_sales(meta_campaign_id_extracted) 
WHERE meta_campaign_id_extracted IS NOT NULL;

-- Add comment to explain attribution types
COMMENT ON COLUMN public.hotmart_sales.sale_attribution_type IS 
'Tipos: paid_tracked (UTM com IDs), paid_untracked (funil com ads mas sem UTM), organic_funnel (orgânica de funil com ads), organic_pure (orgânica pura), unknown (não classificado)';