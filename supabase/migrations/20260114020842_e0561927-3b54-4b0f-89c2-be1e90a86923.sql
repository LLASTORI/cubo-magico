-- Create canonical view that joins sales_core_events with hotmart_sales and offer_mappings
-- This enables SQL-level filtering for funnel, product, offer, and UTMs

CREATE OR REPLACE VIEW public.sales_core_view AS
SELECT 
  -- Core financial data
  sce.id,
  sce.project_id,
  sce.provider,
  sce.provider_event_id,
  sce.event_type,
  sce.gross_amount,
  -- Use Core net_amount, fallback to hotmart net_revenue, then estimate 46% of gross
  COALESCE(
    NULLIF(sce.net_amount, 0),
    hs.net_revenue,
    sce.gross_amount * 0.46
  ) AS net_amount,
  sce.currency,
  sce.occurred_at,
  sce.received_at,
  sce.economic_day,
  sce.contact_id,
  sce.is_active,
  sce.created_at,
  sce.raw_payload,
  sce.attribution,
  
  -- Transaction ID extracted from provider_event_id (hotmart_XXXXX_...)
  CASE 
    WHEN sce.provider = 'hotmart' THEN 
      (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]
    ELSE sce.provider_event_id
  END AS transaction_id,
  
  -- Identity data from hotmart_sales
  COALESCE(hs.buyer_name, hs.buyer_email, '-') AS buyer_name,
  hs.buyer_email,
  COALESCE(hs.product_name, '-') AS product_name,
  hs.product_code,
  hs.offer_code,
  hs.status AS hotmart_status,
  
  -- Funnel data from offer_mappings
  om.id AS offer_mapping_id,
  om.funnel_id,
  f.name AS funnel_name,
  om.id_funil,
  om.nome_produto AS mapped_product_name,
  om.nome_oferta AS mapped_offer_name,
  om.tipo_posicao,
  om.nome_posicao,
  
  -- UTM data from hotmart_sales
  COALESCE(
    hs.utm_source,
    -- Fallback: parse from checkout_origin (format: Source|Conjunto|Campanha|Posicionamento|Criativo)
    split_part(hs.checkout_origin, '|', 1)
  ) AS utm_source,
  COALESCE(
    hs.utm_campaign_id,
    split_part(hs.checkout_origin, '|', 3)
  ) AS utm_campaign,
  COALESCE(
    hs.utm_adset_name,
    split_part(hs.checkout_origin, '|', 2)
  ) AS utm_adset,
  COALESCE(
    hs.utm_placement,
    split_part(hs.checkout_origin, '|', 4)
  ) AS utm_placement,
  COALESCE(
    hs.utm_creative,
    split_part(hs.checkout_origin, '|', 5)
  ) AS utm_creative,
  hs.checkout_origin,
  
  -- Meta IDs for attribution
  hs.meta_campaign_id_extracted,
  hs.meta_adset_id_extracted,
  hs.meta_ad_id_extracted
  
FROM public.sales_core_events sce
-- LEFT JOIN to hotmart_sales by extracting transaction_id from provider_event_id
LEFT JOIN public.hotmart_sales hs 
  ON hs.project_id = sce.project_id 
  AND hs.transaction_id = (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]
-- LEFT JOIN to offer_mappings by offer_code
LEFT JOIN public.offer_mappings om 
  ON om.project_id = sce.project_id 
  AND om.codigo_oferta = hs.offer_code
-- LEFT JOIN to funnels for funnel_name
LEFT JOIN public.funnels f 
  ON f.id = om.funnel_id;

-- Add comment explaining the view
COMMENT ON VIEW public.sales_core_view IS 'Canonical view joining sales_core_events with hotmart_sales and offer_mappings for unified filtering';

-- Grant SELECT access (inherits RLS from underlying tables)
GRANT SELECT ON public.sales_core_view TO authenticated;
GRANT SELECT ON public.sales_core_view TO anon;