-- ============================================
-- RESTORE sales_core_view TO STABLE CHECKPOINT
-- ============================================
-- Drop existing view first to allow column changes
DROP VIEW IF EXISTS public.sales_core_view;

-- Recreate with exact structure for Busca Rápida
CREATE VIEW public.sales_core_view AS
SELECT
  sce.id,
  sce.project_id,
  sce.provider,
  sce.provider_event_id,
  sce.event_type,
  sce.gross_amount,
  sce.net_amount,
  sce.currency,
  sce.occurred_at,
  sce.received_at,
  sce.economic_day,
  sce.contact_id,
  sce.is_active,
  sce.created_at,

  -- transaction_id extracted from provider_event_id (hotmart_XXXX_)
  CASE 
    WHEN sce.provider = 'hotmart'
      THEN (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]
    ELSE sce.provider_event_id
  END AS transaction_id,

  -- Hotmart data
  hs.buyer_name,
  hs.buyer_email,
  hs.product_name,
  hs.product_code,
  hs.offer_code,
  hs.status AS hotmart_status,

  -- Funnel data
  om.funnel_id,
  f.name AS funnel_name,

  -- UTMs
  hs.utm_source,
  hs.utm_campaign_id AS utm_campaign,
  hs.utm_adset_name AS utm_adset,
  hs.utm_placement,
  hs.utm_creative

FROM sales_core_events sce
LEFT JOIN hotmart_sales hs
  ON hs.project_id = sce.project_id
 AND hs.transaction_id = (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]

LEFT JOIN offer_mappings om
  ON om.project_id = sce.project_id
 AND om.codigo_oferta = hs.offer_code

LEFT JOIN funnels f
  ON f.id = om.funnel_id;

-- Grant permissions
GRANT SELECT ON public.sales_core_view TO authenticated;
GRANT SELECT ON public.sales_core_view TO anon;