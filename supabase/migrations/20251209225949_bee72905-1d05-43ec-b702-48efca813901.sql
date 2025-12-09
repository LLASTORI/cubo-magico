-- Add sale_category column to hotmart_sales
-- Categories: 'funnel_ads', 'funnel_no_ads', 'unidentified_origin', 'other_origin'
ALTER TABLE public.hotmart_sales 
ADD COLUMN IF NOT EXISTS sale_category text DEFAULT 'unidentified_origin';

-- Add index for better query performance on category
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_category ON public.hotmart_sales(sale_category);

-- Add comment for documentation
COMMENT ON COLUMN public.hotmart_sales.sale_category IS 'Sale category: funnel_ads (funil+ads), funnel_no_ads (funil sem ads), unidentified_origin (origem não identificada), other_origin (outras origens como afiliados)';