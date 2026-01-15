-- Add utm_medium column to hotmart_sales
ALTER TABLE hotmart_sales ADD COLUMN IF NOT EXISTS utm_medium TEXT;

-- Fix finance_tracking_view to use pre-parsed UTM columns from hotmart_sales
-- The webhook now properly parses checkout_origin into separate columns

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
  
  -- ============================================
  -- UTM DATA - Using pre-parsed columns from webhook
  -- Format: Meta-Ads|campaign|adset|placement|creative
  -- ============================================
  
  -- utm_source: Use pre-parsed value, fallback to string parsing for legacy data
  COALESCE(
    NULLIF(hs.utm_source, ''),
    CASE 
      WHEN hs.checkout_origin ILIKE 'meta-ads%' THEN 'facebook'
      WHEN hs.checkout_origin ILIKE 'wpp%' OR hs.checkout_origin ILIKE 'whatsapp%' THEN 'whatsapp'
      WHEN hs.checkout_origin ILIKE 'google%' THEN 'google'
      ELSE NULLIF((string_to_array(hs.checkout_origin, '|'))[1], '')
    END
  ) AS utm_source,
  
  -- utm_campaign: Use pre-parsed utm_campaign_id column, fallback to array position 2
  COALESCE(
    NULLIF(hs.utm_campaign_id, ''),
    NULLIF((string_to_array(hs.checkout_origin, '|'))[2], '')
  ) AS utm_campaign,
  
  -- utm_adset: Use pre-parsed utm_adset_name column, fallback to array position 3
  COALESCE(
    NULLIF(hs.utm_adset_name, ''),
    NULLIF((string_to_array(hs.checkout_origin, '|'))[3], '')
  ) AS utm_adset,
  
  -- utm_placement: Use pre-parsed utm_placement column, fallback to array position 4
  COALESCE(
    NULLIF(hs.utm_placement, ''),
    NULLIF((string_to_array(hs.checkout_origin, '|'))[4], '')
  ) AS utm_placement,
  
  -- utm_creative: Use pre-parsed utm_creative column, fallback to array position 5
  COALESCE(
    NULLIF(hs.utm_creative, ''),
    NULLIF((string_to_array(hs.checkout_origin, '|'))[5], '')
  ) AS utm_creative,
  
  -- utm_medium: Derive from utm_medium column or source type
  COALESCE(
    NULLIF(hs.utm_medium, ''),
    CASE 
      WHEN hs.checkout_origin ILIKE 'meta-ads%' THEN 'paid'
      WHEN hs.checkout_origin ILIKE 'wpp%' OR hs.checkout_origin ILIKE 'whatsapp%' THEN 'organic'
      WHEN hs.checkout_origin ILIKE 'google%' THEN 'paid'
      ELSE NULL
    END
  ) AS utm_medium,
  
  -- META IDs from pre-parsed columns
  hs.meta_campaign_id_extracted AS meta_campaign_id,
  hs.meta_adset_id_extracted AS meta_adset_id,
  hs.meta_ad_id_extracted AS meta_ad_id,
  
  -- Raw checkout_origin for debugging
  hs.checkout_origin,
  
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

-- Add comment to document the UTM parsing logic
COMMENT ON VIEW finance_tracking_view IS 'Canonical financial view with proper UTM parsing from Hotmart webhook. UTM columns use pre-parsed values from hotmart_sales with fallback to checkout_origin string parsing for legacy data.';