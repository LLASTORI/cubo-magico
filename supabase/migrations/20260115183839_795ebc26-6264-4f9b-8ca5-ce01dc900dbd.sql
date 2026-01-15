-- PROMPT 6: Recreate views to include utm_term, utm_content, raw_checkout_origin

-- Drop dependent views in correct order
DROP VIEW IF EXISTS live_project_totals_today;
DROP VIEW IF EXISTS live_financial_today;
DROP VIEW IF EXISTS live_sales_today;
DROP VIEW IF EXISTS finance_ledger_summary;

-- Recreate finance_ledger_summary with PROMPT 6 standard UTM fields
CREATE VIEW finance_ledger_summary AS
SELECT
  fl.project_id,
  fl.transaction_id,
  min(fl.occurred_at) AS transaction_date,
  (min(fl.occurred_at) AT TIME ZONE 'America/Sao_Paulo'::text)::date AS economic_day,

  -- Financial breakdown
  sum(CASE WHEN fl.event_type = ANY (ARRAY['credit'::text, 'producer'::text]) THEN fl.amount ELSE 0::numeric END) AS producer_gross,
  sum(CASE WHEN fl.event_type = 'affiliate'::text THEN abs(fl.amount) ELSE 0::numeric END) AS affiliate_cost,
  sum(CASE WHEN fl.event_type = 'coproducer'::text THEN abs(fl.amount) ELSE 0::numeric END) AS coproducer_cost,
  sum(CASE WHEN fl.event_type = ANY (ARRAY['platform_fee'::text, 'tax'::text]) THEN abs(fl.amount) ELSE 0::numeric END) AS platform_cost,
  sum(CASE WHEN fl.event_type = ANY (ARRAY['refund'::text, 'chargeback'::text]) THEN abs(fl.amount) ELSE 0::numeric END) AS refunds,
  (
    sum(CASE WHEN fl.event_type = ANY (ARRAY['credit'::text, 'producer'::text]) THEN fl.amount ELSE 0::numeric END)
    - sum(CASE WHEN fl.event_type = ANY (ARRAY['affiliate'::text, 'coproducer'::text, 'platform_fee'::text, 'tax'::text, 'refund'::text, 'chargeback'::text]) THEN abs(fl.amount) ELSE 0::numeric END)
  ) AS net_revenue,

  fl.provider,
  count(*) AS event_count,

  -- Product/Buyer info
  hs.product_name,
  hs.product_code,
  hs.offer_code,
  hs.buyer_name,
  hs.buyer_email,
  concat(hs.buyer_phone_country_code, hs.buyer_phone_ddd, hs.buyer_phone) AS buyer_phone,
  hs.payment_method,
  hs.payment_type,
  hs.recurrence,
  hs.is_upgrade,
  hs.subscriber_code,

  om.funnel_id,
  f.name AS funnel_name,

  -- Legacy UTM fields (for backward compatibility)
  hs.utm_source,
  hs.utm_medium,
  hs.utm_campaign_id AS utm_campaign,
  hs.utm_adset_name AS utm_adset,
  hs.utm_placement,
  hs.utm_creative,

  hs.meta_campaign_id_extracted AS meta_campaign_id,
  hs.meta_adset_id_extracted AS meta_adset_id,
  hs.meta_ad_id_extracted AS meta_ad_id,
  hs.checkout_origin,
  hs.status AS hotmart_status,
  hs.sale_category,

  -- PROMPT 6: Standard UTM fields (fallback to legacy for older data)
  COALESCE(hs.utm_term, hs.utm_placement) AS utm_term,
  COALESCE(hs.utm_content, hs.utm_creative) AS utm_content,
  COALESCE(hs.raw_checkout_origin, hs.checkout_origin) AS raw_checkout_origin

FROM public.finance_ledger fl
LEFT JOIN public.hotmart_sales hs
  ON fl.transaction_id = hs.transaction_id AND fl.project_id = hs.project_id
LEFT JOIN public.offer_mappings om
  ON hs.offer_code = om.codigo_oferta AND hs.project_id = om.project_id
LEFT JOIN public.funnels f
  ON om.funnel_id = f.id
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
  hs.utm_medium,
  hs.utm_campaign_id,
  hs.utm_adset_name,
  hs.utm_placement,
  hs.utm_creative,
  hs.utm_term,
  hs.utm_content,
  hs.raw_checkout_origin,
  hs.checkout_origin,
  hs.meta_campaign_id_extracted,
  hs.meta_adset_id_extracted,
  hs.meta_ad_id_extracted,
  hs.status,
  hs.sale_category;

-- Recreate live_sales_today using finance_ledger_summary
CREATE VIEW live_sales_today AS
SELECT
  fls.project_id,
  om.funnel_id,
  fls.economic_day,
  COALESCE(hs.total_price_brl, 0) AS gross_amount,
  fls.net_revenue,
  fls.platform_cost AS platform_fee,
  fls.affiliate_cost,
  fls.coproducer_cost,
  fls.transaction_id,
  fls.hotmart_status AS status,
  fls.product_name,
  fls.offer_code,
  fls.buyer_email,
  fls.utm_source,
  fls.utm_medium,
  fls.utm_campaign,
  fls.utm_term,
  fls.utm_content,
  fls.raw_checkout_origin
FROM finance_ledger_summary fls
LEFT JOIN offer_mappings om 
  ON fls.offer_code = om.codigo_oferta 
  AND fls.project_id = om.project_id
LEFT JOIN hotmart_sales hs
  ON fls.transaction_id = hs.transaction_id
  AND fls.project_id = hs.project_id
WHERE fls.economic_day = CURRENT_DATE
  AND fls.hotmart_status IN ('APPROVED', 'COMPLETE');

-- Recreate live_financial_today using live_spend_today for spend
CREATE VIEW live_financial_today AS
WITH live_spend AS (
  SELECT 
    project_id,
    funnel_id,
    CURRENT_DATE AS economic_day,
    SUM(spend) AS spend
  FROM live_spend_today
  GROUP BY project_id, funnel_id
),
live_revenue AS (
  SELECT
    project_id,
    funnel_id,
    economic_day,
    SUM(gross_amount) AS gross_revenue,
    SUM(net_revenue) AS revenue,
    SUM(platform_fee) AS platform_fees,
    SUM(affiliate_cost) AS affiliate_fees,
    SUM(coproducer_cost) AS coproducer_fees,
    COUNT(*) AS sales_count
  FROM live_sales_today
  GROUP BY project_id, funnel_id, economic_day
)
SELECT
  COALESCE(r.project_id, s.project_id) AS project_id,
  COALESCE(r.funnel_id, s.funnel_id) AS funnel_id,
  COALESCE(r.economic_day, s.economic_day) AS economic_day,
  COALESCE(r.revenue, 0) AS revenue,
  COALESCE(r.gross_revenue, 0) AS gross_revenue,
  COALESCE(r.platform_fees, 0) AS platform_fees,
  COALESCE(r.affiliate_fees, 0) AS affiliate_fees,
  COALESCE(r.coproducer_fees, 0) AS coproducer_fees,
  COALESCE(r.sales_count, 0)::INTEGER AS sales_count,
  COALESCE(s.spend, 0) AS spend,
  COALESCE(r.revenue, 0) - COALESCE(s.spend, 0) AS profit,
  CASE 
    WHEN COALESCE(s.spend, 0) > 0 THEN ROUND((COALESCE(r.revenue, 0) / s.spend)::numeric, 2)
    ELSE NULL
  END AS roas,
  CASE 
    WHEN COALESCE(r.sales_count, 0) > 0 THEN ROUND((COALESCE(s.spend, 0) / r.sales_count)::numeric, 2)
    ELSE NULL
  END AS cpa,
  TRUE AS is_estimated,
  'live'::TEXT AS data_source,
  f.name AS funnel_name
FROM live_revenue r
FULL OUTER JOIN live_spend s 
  ON r.project_id = s.project_id 
  AND r.funnel_id = s.funnel_id
LEFT JOIN funnels f 
  ON COALESCE(r.funnel_id, s.funnel_id) = f.id;

-- Recreate live_project_totals_today
CREATE VIEW live_project_totals_today AS
SELECT
  project_id,
  economic_day,
  SUM(revenue) AS total_revenue,
  SUM(gross_revenue) AS total_gross_revenue,
  SUM(platform_fees) AS total_platform_fees,
  SUM(affiliate_fees) AS total_affiliate_fees,
  SUM(coproducer_fees) AS total_coproducer_fees,
  SUM(sales_count) AS total_sales,
  SUM(spend) AS total_spend,
  SUM(profit) AS total_profit,
  CASE 
    WHEN SUM(spend) > 0 THEN ROUND((SUM(revenue) / SUM(spend))::numeric, 2)
    ELSE NULL
  END AS roas,
  CASE 
    WHEN SUM(sales_count) > 0 THEN ROUND((SUM(spend) / SUM(sales_count))::numeric, 2)
    ELSE NULL
  END AS cpa
FROM live_financial_today
GROUP BY project_id, economic_day;