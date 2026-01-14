
-- Drop and recreate finance_tracking_view with proper UTM extraction from checkout_origin
DROP VIEW IF EXISTS finance_tracking_view;

CREATE VIEW finance_tracking_view AS
WITH deduplicated_events AS (
  SELECT 
    sce.project_id,
    (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1] AS transaction_id,
    sce.event_type,
    sce.occurred_at,
    sce.contact_id,
    row_number() OVER (
      PARTITION BY sce.project_id, (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1]
      ORDER BY 
        CASE sce.event_type 
          WHEN 'COMPLETE' THEN 1 
          WHEN 'APPROVED' THEN 2 
          WHEN 'BACKFILL' THEN 3 
          ELSE 4 
        END,
        sce.occurred_at DESC
    ) AS rn
  FROM sales_core_events sce
  WHERE sce.provider = 'hotmart'
)
SELECT 
  hs.id,
  hs.project_id,
  hs.transaction_id,
  
  -- FINANCIAL DATA - ALWAYS FROM hotmart_sales
  hs.total_price_brl AS gross_amount,
  hs.net_revenue AS net_amount,
  hs.status AS hotmart_status,
  hs.sale_date AS purchase_date,
  (hs.sale_date AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
  
  -- PRODUCT DATA
  hs.product_name,
  hs.product_code,
  hs.offer_code,
  hs.payment_method,
  hs.payment_type,
  
  -- BUYER DATA
  hs.buyer_name,
  hs.buyer_email,
  hs.buyer_phone,
  hs.buyer_phone_ddd,
  hs.buyer_phone_country_code,
  
  -- FUNNEL MAPPING
  om.funnel_id,
  f.name AS funnel_name,
  
  -- UTM DATA - extracted from checkout_origin (format: placement|campaign|adset|creative)
  (string_to_array(hs.checkout_origin, '|'))[1] AS utm_placement,
  (string_to_array(hs.checkout_origin, '|'))[2] AS utm_campaign,
  (string_to_array(hs.checkout_origin, '|'))[3] AS utm_adset,
  (string_to_array(hs.checkout_origin, '|'))[4] AS utm_creative,
  
  -- Keep raw utm_source from hotmart_sales if available, otherwise derive from placement
  COALESCE(
    NULLIF(hs.utm_source, ''),
    CASE 
      WHEN (string_to_array(hs.checkout_origin, '|'))[1] ILIKE '%instagram%' THEN 'instagram'
      WHEN (string_to_array(hs.checkout_origin, '|'))[1] ILIKE '%facebook%' THEN 'facebook'
      ELSE (string_to_array(hs.checkout_origin, '|'))[1]
    END
  ) AS utm_source,
  
  -- META IDs from hotmart_sales
  hs.meta_campaign_id_extracted AS meta_campaign_id,
  hs.meta_adset_id_extracted AS meta_adset_id,
  hs.meta_ad_id_extracted AS meta_ad_id,
  
  -- CONTACT LINK from webhook
  de.contact_id,
  de.event_type AS webhook_event_type,
  
  -- SALE CATEGORIZATION
  hs.sale_category,
  hs.recurrence,
  
  -- TIMESTAMPS
  hs.created_at,
  hs.updated_at

FROM hotmart_sales hs
LEFT JOIN deduplicated_events de 
  ON de.project_id = hs.project_id 
  AND de.transaction_id = hs.transaction_id 
  AND de.rn = 1
LEFT JOIN offer_mappings om 
  ON om.project_id = hs.project_id 
  AND om.codigo_oferta = hs.offer_code
LEFT JOIN funnels f 
  ON f.id = om.funnel_id;
