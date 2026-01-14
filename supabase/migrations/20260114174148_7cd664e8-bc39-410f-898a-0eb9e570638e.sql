-- Recreate finance_ledger_summary with proper joins
-- First drop the old view (it was dropped by the failed migration)
DROP VIEW IF EXISTS public.finance_ledger_summary;

CREATE VIEW public.finance_ledger_summary AS
SELECT 
  fl.project_id,
  fl.transaction_id,
  min(fl.occurred_at) AS transaction_date,
  (min(fl.occurred_at) AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
  
  -- Financial metrics from ledger (CANONICAL - real money)
  sum(CASE WHEN fl.event_type IN ('credit', 'producer') THEN fl.amount ELSE 0 END) AS producer_gross,
  sum(CASE WHEN fl.event_type = 'affiliate' THEN abs(fl.amount) ELSE 0 END) AS affiliate_cost,
  sum(CASE WHEN fl.event_type = 'coproducer' THEN abs(fl.amount) ELSE 0 END) AS coproducer_cost,
  sum(CASE WHEN fl.event_type IN ('platform_fee', 'tax') THEN abs(fl.amount) ELSE 0 END) AS platform_cost,
  sum(CASE WHEN fl.event_type IN ('refund', 'chargeback') THEN abs(fl.amount) ELSE 0 END) AS refunds,
  
  -- Net revenue = producer_gross - all deductions
  sum(CASE WHEN fl.event_type IN ('credit', 'producer') THEN fl.amount ELSE 0 END)
  - sum(CASE WHEN fl.event_type IN ('affiliate', 'coproducer', 'platform_fee', 'tax', 'refund', 'chargeback') THEN abs(fl.amount) ELSE 0 END) AS net_revenue,
  
  fl.provider,
  count(*) AS event_count,
  
  -- Metadata from hotmart_sales
  hs.product_name,
  hs.product_code,
  hs.offer_code,
  hs.buyer_name,
  hs.buyer_email,
  CONCAT(hs.buyer_phone_country_code, hs.buyer_phone_ddd, hs.buyer_phone) AS buyer_phone,
  hs.payment_method,
  hs.payment_type,
  hs.recurrence,
  hs.is_upgrade,
  hs.subscriber_code,
  
  -- Funnel info via offer_mappings
  om.funnel_id,
  f.name AS funnel_name,
  
  -- UTM fields directly from hotmart_sales
  hs.utm_source,
  hs.utm_campaign_id AS utm_campaign,
  hs.utm_adset_name AS utm_adset,
  hs.utm_placement,
  hs.utm_creative,
  
  -- Meta attribution extracted IDs
  hs.meta_campaign_id_extracted AS meta_campaign_id,
  hs.meta_adset_id_extracted AS meta_adset_id,
  hs.meta_ad_id_extracted AS meta_ad_id,
  
  -- Status for filtering
  hs.status AS hotmart_status,
  hs.sale_category
  
FROM finance_ledger fl
LEFT JOIN hotmart_sales hs ON fl.transaction_id = hs.transaction_id AND fl.project_id = hs.project_id
LEFT JOIN offer_mappings om ON hs.offer_code = om.codigo_oferta AND hs.project_id = om.project_id
LEFT JOIN funnels f ON om.funnel_id = f.id
GROUP BY 
  fl.project_id,
  fl.transaction_id,
  fl.provider,
  hs.product_name,
  hs.product_code,
  hs.offer_code,
  hs.buyer_name,
  hs.buyer_email,
  hs.buyer_phone_country_code,
  hs.buyer_phone_ddd,
  hs.buyer_phone,
  hs.payment_method,
  hs.payment_type,
  hs.recurrence,
  hs.is_upgrade,
  hs.subscriber_code,
  om.funnel_id,
  f.name,
  hs.utm_source,
  hs.utm_campaign_id,
  hs.utm_adset_name,
  hs.utm_placement,
  hs.utm_creative,
  hs.meta_campaign_id_extracted,
  hs.meta_adset_id_extracted,
  hs.meta_ad_id_extracted,
  hs.status,
  hs.sale_category;

-- Add comment explaining the view
COMMENT ON VIEW public.finance_ledger_summary IS 'Canonical financial view. Money comes from finance_ledger (real Hotmart payouts). Metadata comes from hotmart_sales. This is the ONLY source of truth for financial UI.';