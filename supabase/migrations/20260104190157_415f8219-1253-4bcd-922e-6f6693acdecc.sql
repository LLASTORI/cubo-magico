-- Performance indexes to speed up canonical views (no metric logic changes)

CREATE INDEX IF NOT EXISTS idx_offer_mappings_project_id_produto
ON public.offer_mappings (project_id, id_produto);

CREATE INDEX IF NOT EXISTS idx_hotmart_sales_project_offer_code
ON public.hotmart_sales (project_id, offer_code);

CREATE INDEX IF NOT EXISTS idx_hotmart_sales_project_product_code
ON public.hotmart_sales (project_id, product_code);

CREATE INDEX IF NOT EXISTS idx_hotmart_sales_project_tx_offer_created_at
ON public.hotmart_sales (project_id, transaction_id, offer_code, created_at DESC);

-- Fix security linter: ensure view is security_invoker
ALTER VIEW public.contact_social_insights
SET (security_invoker = true);
