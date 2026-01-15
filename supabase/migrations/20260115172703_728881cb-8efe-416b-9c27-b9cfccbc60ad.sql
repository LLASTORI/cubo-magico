
-- ============================================
-- PROMPT 5: Atualizar views para usar campos financeiros corretos
-- ============================================

-- 1) ADD breakdown columns to sales_core_events (if not exist)
ALTER TABLE sales_core_events 
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coproducer_cost NUMERIC DEFAULT 0;

-- 2) Add financial breakdown columns to hotmart_sales for correct tracking
ALTER TABLE hotmart_sales 
  ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coproducer_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;

-- 3) DROP and recreate revenue_daily with correct breakdown
DROP VIEW IF EXISTS public.revenue_daily CASCADE;

CREATE OR REPLACE VIEW public.revenue_daily
WITH (security_invoker = true)
AS
SELECT
  project_id,
  economic_day,
  SUM(gross_amount) as gross_revenue,
  SUM(COALESCE(platform_fee, 0)) as platform_fees,
  SUM(COALESCE(affiliate_cost, 0)) as affiliate_fees,
  SUM(COALESCE(coproducer_cost, 0)) as coproducer_fees,
  SUM(net_amount) as net_revenue,
  COUNT(*) as transaction_count,
  'core'::text as data_source
FROM public.sales_core_events
WHERE is_active = true 
  AND event_type IN ('purchase', 'subscription', 'upgrade')
GROUP BY project_id, economic_day;

GRANT SELECT ON public.revenue_daily TO authenticated;

-- 4) DROP and recreate spend_daily (no changes, just for CASCADE rebuild)
DROP VIEW IF EXISTS public.spend_daily CASCADE;

CREATE OR REPLACE VIEW public.spend_daily
WITH (security_invoker = true)
AS
SELECT
  project_id,
  economic_day,
  SUM(spend_amount) as ad_spend,
  COUNT(DISTINCT campaign_id) as campaigns,
  COUNT(DISTINCT ad_id) as ads
FROM spend_core_events
WHERE is_active = true
GROUP BY project_id, economic_day;

GRANT SELECT ON public.spend_daily TO authenticated;

-- 5) DROP and recreate profit_daily with correct fields
DROP VIEW IF EXISTS public.profit_daily CASCADE;

CREATE OR REPLACE VIEW public.profit_daily
WITH (security_invoker = true)
AS
SELECT
  COALESCE(r.project_id, d.project_id) as project_id,
  COALESCE(r.economic_day, d.economic_day) as economic_day,
  COALESCE(r.gross_revenue, 0) as gross_revenue,
  COALESCE(r.platform_fees, 0) as platform_fees,
  COALESCE(r.affiliate_fees, 0) as affiliate_fees,
  COALESCE(r.coproducer_fees, 0) as coproducer_fees,
  COALESCE(r.net_revenue, 0) as net_revenue,
  COALESCE(d.ad_spend, 0) as ad_spend,
  COALESCE(r.net_revenue, 0) - COALESCE(d.ad_spend, 0) as profit,
  CASE 
    WHEN COALESCE(d.ad_spend, 0) > 0 
    THEN ROUND((COALESCE(r.net_revenue, 0) / d.ad_spend)::numeric, 2)
    ELSE NULL 
  END as roas,
  COALESCE(r.transaction_count, 0) as transaction_count,
  'core'::text as data_source
FROM public.revenue_daily r
FULL OUTER JOIN public.spend_daily d 
  ON r.project_id = d.project_id 
  AND r.economic_day = d.economic_day;

GRANT SELECT ON public.profit_daily TO authenticated;

-- 6) Recreate profit_monthly with new columns
DROP VIEW IF EXISTS public.profit_monthly CASCADE;

CREATE OR REPLACE VIEW public.profit_monthly
WITH (security_invoker = true)
AS
SELECT
  project_id,
  DATE_TRUNC('month', economic_day)::date as month,
  SUM(gross_revenue) as gross_revenue,
  SUM(platform_fees) as platform_fees,
  SUM(affiliate_fees) as affiliate_fees,
  SUM(coproducer_fees) as coproducer_fees,
  SUM(net_revenue) as net_revenue,
  SUM(ad_spend) as ad_spend,
  SUM(profit) as profit,
  CASE 
    WHEN SUM(ad_spend) > 0 
    THEN ROUND((SUM(net_revenue) / SUM(ad_spend))::numeric, 2)
    ELSE NULL 
  END as roas,
  SUM(transaction_count) as transaction_count,
  'core'::text as data_source
FROM public.profit_daily
GROUP BY project_id, DATE_TRUNC('month', economic_day);

GRANT SELECT ON public.profit_monthly TO authenticated;

-- 7) Recreate owner_profit_daily
DROP VIEW IF EXISTS public.owner_profit_daily CASCADE;

CREATE OR REPLACE VIEW public.owner_profit_daily
WITH (security_invoker = true)
AS
SELECT
  p.project_id,
  p.economic_day,
  p.gross_revenue,
  p.platform_fees,
  p.affiliate_fees,
  p.coproducer_fees,
  p.net_revenue,
  COALESCE(a.owner_allocated, p.net_revenue) as owner_revenue,
  p.ad_spend,
  COALESCE(a.owner_allocated, p.net_revenue) - p.ad_spend as owner_profit,
  CASE 
    WHEN p.ad_spend > 0 
    THEN ROUND((COALESCE(a.owner_allocated, p.net_revenue) / p.ad_spend)::numeric, 2)
    ELSE NULL 
  END as owner_roas,
  p.transaction_count,
  'core'::text as data_source
FROM public.profit_daily p
LEFT JOIN (
  SELECT 
    project_id, 
    economic_day, 
    SUM(allocated_amount) as owner_allocated
  FROM public.revenue_allocations
  WHERE partner_type = 'owner'
  GROUP BY project_id, economic_day
) a ON a.project_id = p.project_id AND a.economic_day = p.economic_day;

GRANT SELECT ON public.owner_profit_daily TO authenticated;

-- 8) Recreate sales_daily (referenced elsewhere)
DROP VIEW IF EXISTS public.sales_daily CASCADE;

CREATE OR REPLACE VIEW public.sales_daily AS
SELECT
  project_id,
  economic_day,
  SUM(net_amount) as revenue,
  SUM(gross_amount) as gross_revenue,
  COUNT(*) as transactions,
  COUNT(DISTINCT contact_id) as unique_buyers
FROM sales_core_events
WHERE is_active = true 
  AND event_type IN ('purchase', 'subscription', 'upgrade')
GROUP BY project_id, economic_day;

GRANT SELECT ON public.sales_daily TO authenticated;

-- 9) Recreate refunds_daily
DROP VIEW IF EXISTS public.refunds_daily CASCADE;

CREATE OR REPLACE VIEW public.refunds_daily AS
SELECT
  project_id,
  economic_day,
  SUM(net_amount) as refunds,
  SUM(gross_amount) as gross_refunds,
  COUNT(*) as refund_count,
  SUM(CASE WHEN event_type = 'chargeback' THEN net_amount ELSE 0 END) as chargebacks,
  SUM(CASE WHEN event_type = 'chargeback' THEN 1 ELSE 0 END) as chargeback_count
FROM sales_core_events
WHERE is_active = true 
  AND event_type IN ('refund', 'chargeback')
GROUP BY project_id, economic_day;

GRANT SELECT ON public.refunds_daily TO authenticated;

-- 10) Recreate financial_daily
DROP VIEW IF EXISTS public.financial_daily CASCADE;

CREATE OR REPLACE VIEW public.financial_daily AS
SELECT
  COALESCE(s.project_id, COALESCE(r.project_id, d.project_id)) as project_id,
  COALESCE(s.economic_day, COALESCE(r.economic_day, d.economic_day)) as economic_day,
  COALESCE(s.revenue, 0) as revenue,
  COALESCE(s.gross_revenue, 0) as gross_revenue,
  COALESCE(s.transactions, 0) as transactions,
  COALESCE(s.unique_buyers, 0) as unique_buyers,
  COALESCE(r.refunds, 0) as refunds,
  COALESCE(r.gross_refunds, 0) as gross_refunds,
  COALESCE(r.refund_count, 0) as refund_count,
  COALESCE(r.chargebacks, 0) as chargebacks,
  COALESCE(r.chargeback_count, 0) as chargeback_count,
  COALESCE(d.ad_spend, 0) as ad_spend,
  COALESCE(d.campaigns, 0) as campaigns,
  COALESCE(d.ads, 0) as ads,
  -- Calculated metrics
  (COALESCE(s.revenue, 0) - COALESCE(r.refunds, 0)) as net_revenue,
  (COALESCE(s.revenue, 0) - COALESCE(r.refunds, 0) - COALESCE(d.ad_spend, 0)) as profit,
  CASE 
    WHEN COALESCE(d.ad_spend, 0) > 0 
    THEN (COALESCE(s.revenue, 0) - COALESCE(r.refunds, 0)) / d.ad_spend 
    ELSE 0 
  END as roas,
  CASE 
    WHEN COALESCE(s.transactions, 0) > 0 
    THEN COALESCE(d.ad_spend, 0) / s.transactions 
    ELSE 0 
  END as cpa
FROM sales_daily s
FULL OUTER JOIN refunds_daily r 
  ON s.project_id = r.project_id AND s.economic_day = r.economic_day
FULL OUTER JOIN spend_daily d 
  ON COALESCE(s.project_id, r.project_id) = d.project_id 
  AND COALESCE(s.economic_day, r.economic_day) = d.economic_day;

GRANT SELECT ON public.financial_daily TO authenticated;

-- 11) Recreate funnel_revenue with proper net/gross from sales_core
DROP VIEW IF EXISTS public.funnel_revenue CASCADE;

CREATE OR REPLACE VIEW public.funnel_revenue AS
SELECT 
  project_id,
  (attribution->>'funnel_id')::uuid as funnel_id,
  economic_day,
  SUM(net_amount) as revenue,
  SUM(gross_amount) as gross_revenue,
  COUNT(*) as sales_count
FROM sales_core_events
WHERE is_active = true 
  AND (attribution->>'funnel_id') IS NOT NULL
GROUP BY project_id, (attribution->>'funnel_id')::uuid, economic_day;

GRANT SELECT ON public.funnel_revenue TO authenticated;

-- 12) Recreate funnel_financials
DROP VIEW IF EXISTS public.funnel_financials CASCADE;

CREATE OR REPLACE VIEW public.funnel_financials AS
SELECT
  COALESCE(r.project_id, s.project_id) as project_id,
  COALESCE(r.funnel_id, s.funnel_id) as funnel_id,
  COALESCE(r.economic_day, s.economic_day) as economic_day,
  COALESCE(r.revenue, 0) as revenue,
  COALESCE(r.gross_revenue, 0) as gross_revenue,
  COALESCE(r.sales_count, 0) as sales_count,
  COALESCE(s.spend, 0) as spend,
  COALESCE(r.revenue, 0) - COALESCE(s.spend, 0) as profit,
  CASE 
    WHEN COALESCE(s.spend, 0) > 0 THEN ROUND((COALESCE(r.revenue, 0) / s.spend)::numeric, 2)
    ELSE NULL 
  END as roas,
  CASE 
    WHEN COALESCE(r.sales_count, 0) > 0 THEN ROUND((COALESCE(s.spend, 0) / r.sales_count)::numeric, 2)
    ELSE NULL 
  END as cpa
FROM funnel_revenue r
FULL OUTER JOIN funnel_spend s 
  ON r.project_id = s.project_id 
  AND r.funnel_id = s.funnel_id 
  AND r.economic_day = s.economic_day;

GRANT SELECT ON public.funnel_financials TO authenticated;

-- 13) Recreate funnel_financials_summary
DROP VIEW IF EXISTS public.funnel_financials_summary CASCADE;

CREATE OR REPLACE VIEW public.funnel_financials_summary
WITH (security_invoker = true)
AS
SELECT
  ff.project_id,
  ff.funnel_id,
  f.name as funnel_name,
  f.funnel_type,
  f.roas_target,
  ps.financial_core_start_date,
  SUM(ff.revenue) as total_revenue,
  SUM(ff.gross_revenue) as total_gross_revenue,
  SUM(ff.spend) as total_spend,
  SUM(ff.sales_count) as total_sales,
  SUM(ff.profit) as total_profit,
  CASE 
    WHEN SUM(ff.spend) > 0 
    THEN ROUND((SUM(ff.revenue) / SUM(ff.spend))::numeric, 2)
    ELSE NULL 
  END as overall_roas,
  CASE 
    WHEN SUM(ff.sales_count) > 0 
    THEN ROUND((SUM(ff.spend) / SUM(ff.sales_count))::numeric, 2)
    ELSE NULL 
  END as overall_cpa,
  CASE 
    WHEN SUM(ff.sales_count) > 0 
    THEN ROUND((SUM(ff.revenue) / SUM(ff.sales_count))::numeric, 2)
    ELSE NULL 
  END as avg_ticket,
  -- Health status based on ROAS (using net revenue for proper calculation)
  CASE
    WHEN SUM(ff.spend) = 0 OR SUM(ff.spend) IS NULL THEN 'inactive'
    WHEN SUM(ff.revenue) = 0 OR SUM(ff.revenue) IS NULL THEN 'no-return'
    WHEN f.roas_target IS NOT NULL AND (SUM(ff.revenue) / NULLIF(SUM(ff.spend), 0)) >= f.roas_target * 1.2 THEN 'excellent'
    WHEN f.roas_target IS NOT NULL AND (SUM(ff.revenue) / NULLIF(SUM(ff.spend), 0)) >= f.roas_target THEN 'good'
    WHEN f.roas_target IS NOT NULL AND (SUM(ff.revenue) / NULLIF(SUM(ff.spend), 0)) >= f.roas_target * 0.7 THEN 'attention'
    WHEN (SUM(ff.revenue) / NULLIF(SUM(ff.spend), 0)) >= 2.0 THEN 'good'
    WHEN (SUM(ff.revenue) / NULLIF(SUM(ff.spend), 0)) >= 1.0 THEN 'attention'
    ELSE 'danger'
  END as health_status,
  MIN(ff.economic_day) as first_day,
  MAX(ff.economic_day) as last_day,
  COUNT(DISTINCT ff.economic_day) as days_with_data
FROM funnel_financials ff
JOIN funnels f ON f.id = ff.funnel_id
LEFT JOIN project_settings ps ON ps.project_id = ff.project_id
WHERE ff.economic_day >= COALESCE(ps.financial_core_start_date, '2026-01-12'::date)
GROUP BY ff.project_id, ff.funnel_id, f.name, f.funnel_type, f.roas_target, ps.financial_core_start_date;

GRANT SELECT ON public.funnel_financials_summary TO authenticated;

-- 14) Update live_sales_today to use CORRECT financial breakdown from finance_ledger_summary
DROP VIEW IF EXISTS public.live_sales_today CASCADE;

CREATE OR REPLACE VIEW public.live_sales_today AS
SELECT 
  fls.project_id,
  fls.funnel_id,
  f.name as funnel_name,
  CURRENT_DATE as economic_day,
  -- Use net_revenue for revenue (what producer actually receives)
  SUM(CASE WHEN fls.hotmart_status IN ('APPROVED', 'COMPLETE') THEN COALESCE(fls.net_revenue, 0) ELSE 0 END) as revenue,
  -- Use producer_gross for gross_revenue (what customer paid)
  SUM(CASE WHEN fls.hotmart_status IN ('APPROVED', 'COMPLETE') THEN COALESCE(fls.producer_gross, 0) ELSE 0 END) as gross_revenue,
  -- Platform fees
  SUM(CASE WHEN fls.hotmart_status IN ('APPROVED', 'COMPLETE') THEN COALESCE(fls.platform_cost, 0) ELSE 0 END) as platform_fees,
  -- Affiliate costs  
  SUM(CASE WHEN fls.hotmart_status IN ('APPROVED', 'COMPLETE') THEN COALESCE(fls.affiliate_cost, 0) ELSE 0 END) as affiliate_fees,
  -- Coproducer costs
  SUM(CASE WHEN fls.hotmart_status IN ('APPROVED', 'COMPLETE') THEN COALESCE(fls.coproducer_cost, 0) ELSE 0 END) as coproducer_fees,
  COUNT(DISTINCT CASE WHEN fls.hotmart_status IN ('APPROVED', 'COMPLETE') THEN fls.transaction_id ELSE NULL END) as sales_count,
  COUNT(DISTINCT fls.buyer_email) as unique_buyers,
  'live'::text as data_source,
  true as is_estimated
FROM finance_ledger_summary fls
LEFT JOIN funnels f ON f.id = fls.funnel_id
WHERE fls.economic_day = CURRENT_DATE
GROUP BY fls.project_id, fls.funnel_id, f.name;

GRANT SELECT ON public.live_sales_today TO authenticated;

-- 15) Recreate live_financial_today with correct financial breakdown
DROP VIEW IF EXISTS public.live_financial_today CASCADE;

CREATE OR REPLACE VIEW public.live_financial_today 
WITH (security_invoker = true) AS
SELECT 
  COALESCE(s.project_id, sp.project_id) as project_id,
  COALESCE(s.funnel_id, sp.funnel_id) as funnel_id,
  COALESCE(s.funnel_name, sp.funnel_name) as funnel_name,
  CURRENT_DATE as economic_day,
  -- Net revenue (producer's share after all deductions)
  COALESCE(s.revenue, 0) as revenue,
  -- Gross revenue (what customer paid)
  COALESCE(s.gross_revenue, 0) as gross_revenue,
  -- Fee breakdown
  COALESCE(s.platform_fees, 0) as platform_fees,
  COALESCE(s.affiliate_fees, 0) as affiliate_fees,
  COALESCE(s.coproducer_fees, 0) as coproducer_fees,
  COALESCE(s.sales_count, 0)::int as sales_count,
  COALESCE(sp.spend, 0) as spend,
  -- Profit = net_revenue - ad_spend
  COALESCE(s.revenue, 0) - COALESCE(sp.spend, 0) as profit,
  -- ROAS = net_revenue / ad_spend
  CASE 
    WHEN COALESCE(sp.spend, 0) > 0 THEN COALESCE(s.revenue, 0) / sp.spend
    ELSE NULL 
  END as roas,
  -- CPA = ad_spend / sales_count
  CASE 
    WHEN COALESCE(s.sales_count, 0) > 0 THEN COALESCE(sp.spend, 0) / s.sales_count
    ELSE NULL 
  END as cpa,
  'live'::text as data_source,
  true as is_estimated
FROM public.live_sales_today s
FULL OUTER JOIN public.live_spend_today sp 
  ON sp.project_id = s.project_id 
  AND sp.funnel_id = s.funnel_id;

GRANT SELECT ON public.live_financial_today TO authenticated;

-- 16) Recreate live_project_totals_today
DROP VIEW IF EXISTS public.live_project_totals_today CASCADE;

CREATE OR REPLACE VIEW public.live_project_totals_today 
WITH (security_invoker = true) AS
SELECT 
  project_id,
  CURRENT_DATE as economic_day,
  SUM(revenue) as total_revenue,
  SUM(gross_revenue) as total_gross_revenue,
  SUM(platform_fees) as total_platform_fees,
  SUM(affiliate_fees) as total_affiliate_fees,
  SUM(coproducer_fees) as total_coproducer_fees,
  SUM(sales_count) as total_sales,
  SUM(spend) as total_spend,
  SUM(profit) as total_profit,
  CASE 
    WHEN SUM(spend) > 0 THEN SUM(revenue) / SUM(spend)
    ELSE NULL 
  END as overall_roas,
  CASE 
    WHEN SUM(sales_count) > 0 THEN SUM(spend) / SUM(sales_count)
    ELSE NULL 
  END as overall_cpa,
  'live'::text as data_source,
  true as is_estimated
FROM live_financial_today
GROUP BY project_id;

GRANT SELECT ON public.live_project_totals_today TO authenticated;

-- 17) Add utm_medium to finance_ledger_summary if missing
DROP VIEW IF EXISTS public.finance_ledger_summary CASCADE;

CREATE VIEW public.finance_ledger_summary AS
SELECT 
  fl.project_id,
  fl.transaction_id,
  min(fl.occurred_at) AS transaction_date,
  (min(fl.occurred_at) AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
  
  -- Financial metrics from ledger (CANONICAL - real money)
  -- producer_gross = what the customer paid (gross amount)
  sum(CASE WHEN fl.event_type IN ('credit', 'producer') THEN fl.amount ELSE 0 END) AS producer_gross,
  sum(CASE WHEN fl.event_type = 'affiliate' THEN abs(fl.amount) ELSE 0 END) AS affiliate_cost,
  sum(CASE WHEN fl.event_type = 'coproducer' THEN abs(fl.amount) ELSE 0 END) AS coproducer_cost,
  sum(CASE WHEN fl.event_type IN ('platform_fee', 'tax') THEN abs(fl.amount) ELSE 0 END) AS platform_cost,
  sum(CASE WHEN fl.event_type IN ('refund', 'chargeback') THEN abs(fl.amount) ELSE 0 END) AS refunds,
  
  -- Net revenue = producer_gross - all deductions (what producer actually receives)
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
  
  -- UTM fields directly from hotmart_sales (parsed by webhook)
  hs.utm_source,
  hs.utm_medium,
  hs.utm_campaign_id AS utm_campaign,
  hs.utm_adset_name AS utm_adset,
  hs.utm_placement,
  hs.utm_creative,
  
  -- Meta attribution extracted IDs
  hs.meta_campaign_id_extracted AS meta_campaign_id,
  hs.meta_adset_id_extracted AS meta_adset_id,
  hs.meta_ad_id_extracted AS meta_ad_id,
  
  -- Original checkout_origin for reference
  hs.checkout_origin,
  
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
  hs.utm_medium,
  hs.utm_campaign_id,
  hs.utm_adset_name,
  hs.utm_placement,
  hs.utm_creative,
  hs.meta_campaign_id_extracted,
  hs.meta_adset_id_extracted,
  hs.meta_ad_id_extracted,
  hs.checkout_origin,
  hs.status,
  hs.sale_category;

GRANT SELECT ON public.finance_ledger_summary TO authenticated;
