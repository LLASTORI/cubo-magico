
-- Recreate live_sales_today view (was dropped by CASCADE)
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

-- Recreate live_financial_today (depends on live_sales_today)
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

-- Recreate live_project_totals_today
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
