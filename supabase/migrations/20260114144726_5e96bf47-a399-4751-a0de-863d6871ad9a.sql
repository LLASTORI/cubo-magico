
-- finance_tracking_view: Fonte canônica de verdade
-- Dinheiro: SEMPRE de hotmart_sales (API)
-- Tracking: SEMPRE de sales_core_events (webhook) com fallback para hotmart_sales
-- Deduplicação: COMPLETE > APPROVED > BACKFILL

CREATE VIEW public.finance_tracking_view AS
WITH deduplicated_events AS (
  SELECT 
    sce.project_id,
    -- Extrair transaction_id do provider_event_id
    (regexp_match(sce.provider_event_id, 'hotmart_([A-Z0-9]+)_'))[1] AS transaction_id,
    sce.event_type,
    sce.occurred_at,
    sce.contact_id,
    -- UTMs do attribution JSONB (webhook)
    sce.attribution->>'utm_source' AS webhook_utm_source,
    sce.attribution->>'utm_campaign' AS webhook_utm_campaign,
    sce.attribution->>'utm_medium' AS webhook_utm_medium,
    sce.attribution->>'utm_content' AS webhook_utm_content,
    sce.attribution->>'utm_term' AS webhook_utm_term,
    sce.attribution->>'external_code' AS webhook_external_code,
    ROW_NUMBER() OVER (
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
  -- Identificadores
  hs.id,
  hs.project_id,
  hs.transaction_id,
  
  -- Financeiro: SEMPRE de hotmart_sales (API)
  hs.total_price_brl AS gross_amount,
  hs.net_revenue AS net_amount,
  hs.status AS hotmart_status,
  hs.sale_date AS purchase_date,
  (hs.sale_date AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
  
  -- Produto
  hs.product_name,
  hs.product_code,
  hs.offer_code,
  hs.payment_method,
  hs.payment_type,
  
  -- Comprador
  hs.buyer_name,
  hs.buyer_email,
  hs.buyer_phone,
  hs.buyer_phone_ddd,
  hs.buyer_phone_country_code,
  
  -- Funil (via offer_mappings)
  om.funnel_id,
  f.name AS funnel_name,
  
  -- UTMs: prioridade webhook (sales_core_events), fallback hotmart_sales
  COALESCE(de.webhook_utm_source, hs.utm_source) AS utm_source,
  COALESCE(de.webhook_utm_campaign, hs.utm_campaign_id) AS utm_campaign,
  hs.utm_adset_name AS utm_adset,
  hs.utm_placement,
  hs.utm_creative,
  
  -- Meta IDs extraídos
  hs.meta_campaign_id_extracted AS meta_campaign_id,
  hs.meta_adset_id_extracted AS meta_adset_id,
  hs.meta_ad_id_extracted AS meta_ad_id,
  
  -- Metadados
  de.contact_id,
  de.event_type AS webhook_event_type,
  hs.sale_category,
  hs.recurrence,
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

GRANT SELECT ON public.finance_tracking_view TO anon, authenticated;

COMMENT ON VIEW public.finance_tracking_view IS 'Fonte canônica de verdade: dinheiro de hotmart_sales (API), tracking de sales_core_events (webhook)';
