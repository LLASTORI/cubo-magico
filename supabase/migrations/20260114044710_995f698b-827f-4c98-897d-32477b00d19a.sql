-- =====================================================
-- CORREÇÃO: net_revenue = 0 tratado como NULL
-- =====================================================
-- Problema: Hotmart envia net_revenue = 0 para vendas
-- pendentes, mas COALESCE para ali e retorna 0.
-- Solução: NULLIF(hs.net_revenue, 0) para usar fallback.
-- =====================================================

DROP VIEW IF EXISTS public.sales_core_view;

CREATE OR REPLACE VIEW public.sales_core_view AS
WITH ranked AS (
  SELECT
    sce.id,
    sce.project_id,
    sce.provider,
    sce.provider_event_id,
    sce.event_type,
    sce.occurred_at,
    sce.economic_day,
    (sce.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') AS economic_timestamp,
    sce.gross_amount,
    -- CORREÇÃO: NULLIF em hs.net_revenue para ignorar zeros
    COALESCE(
      NULLIF(sce.net_amount, 0),
      NULLIF(hs.net_revenue, 0),
      sce.gross_amount * 0.46
    ) AS net_amount,
    sce.currency,
    sce.contact_id,
    sce.created_at,
    
    hs.transaction_id,
    hs.product_code,
    hs.product_name,
    hs.offer_code,
    hs.buyer_email,
    hs.buyer_name,
    hs.status AS hotmart_status,
    hs.payment_method,
    hs.payment_type,
    hs.installment_number AS installments,
    hs.affiliate_code,
    hs.affiliate_name,
    hs.coupon AS coupon_code,
    hs.received_value AS commission_value,
    hs.net_revenue AS fee_value,
    hs.total_price AS base_value,
    hs.offer_currency AS currency_code,
    hs.product_currency AS original_currency,
    hs.original_price AS original_value,
    hs.sale_date AS purchase_date,
    hs.confirmation_date,
    hs.total_price_brl,
    
    hs.utm_source,
    hs.utm_campaign_id AS utm_campaign,
    hs.utm_adset_name AS utm_adset,
    hs.utm_creative,
    hs.utm_placement,
    hs.meta_campaign_id_extracted AS utm_medium,
    hs.meta_adset_id_extracted AS utm_content,
    hs.meta_ad_id_extracted AS utm_ad,
    
    om.funnel_id,
    om.tipo_posicao,
    om.nome_oferta,
    
    f.name AS funnel_name,
    
    ROW_NUMBER() OVER (
      PARTITION BY 
        sce.project_id,
        COALESCE(
          hs.transaction_id,
          (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1],
          sce.provider_event_id
        )
      ORDER BY 
        CASE 
          WHEN sce.event_type = 'purchase_complete' THEN 1
          WHEN sce.event_type = 'purchase_approved' THEN 2
          WHEN sce.event_type = 'purchase_backfill' THEN 3
          ELSE 99
        END,
        sce.occurred_at DESC
    ) AS rn

  FROM public.sales_core_events sce
  
  LEFT JOIN public.hotmart_sales hs
    ON hs.project_id = sce.project_id
   AND hs.transaction_id = COALESCE(
         (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1],
         sce.provider_event_id
       )
  
  LEFT JOIN public.offer_mappings om
    ON om.project_id = sce.project_id
   AND om.codigo_oferta = hs.offer_code
  
  LEFT JOIN public.funnels f
    ON f.id = om.funnel_id
  
  WHERE sce.provider = 'hotmart'
    AND sce.event_type IN ('purchase', 'purchase_approved', 'purchase_complete', 'purchase_backfill')
)

SELECT 
  id,
  project_id,
  provider,
  provider_event_id,
  event_type,
  occurred_at,
  economic_day,
  economic_timestamp,
  gross_amount,
  net_amount,
  currency,
  contact_id,
  created_at,
  transaction_id,
  product_code,
  product_name,
  offer_code,
  nome_oferta,
  buyer_email,
  buyer_name,
  hotmart_status,
  payment_method,
  payment_type,
  installments,
  affiliate_code,
  affiliate_name,
  coupon_code,
  commission_value,
  fee_value,
  base_value,
  currency_code,
  original_currency,
  original_value,
  purchase_date,
  confirmation_date,
  total_price_brl,
  utm_source,
  utm_campaign,
  utm_adset,
  utm_creative,
  utm_placement,
  utm_medium,
  utm_content,
  utm_ad,
  funnel_id,
  tipo_posicao,
  funnel_name
FROM ranked
WHERE rn = 1;

COMMENT ON VIEW public.sales_core_view IS 'View canônica de vendas - DEDUPLICADA. net_amount usa NULLIF para ignorar zeros de net_revenue pendentes.';