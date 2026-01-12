-- ============================================
-- Live Layer Views Only (logging table already created)
-- Financial Time Model: Core vs Live separation
-- ============================================

-- 2. Create live_sales_today view
-- Real-time sales from hotmart_sales for current date
-- Links to funnel via offer_mappings (codigo_oferta = offer_code)
-- Uses CURRENT_DATE directly since we filter on today
CREATE OR REPLACE VIEW public.live_sales_today 
WITH (security_invoker = true) AS
SELECT 
  hs.project_id,
  om.funnel_id,
  f.name as funnel_name,
  CURRENT_DATE as economic_day,
  SUM(CASE WHEN hs.status IN ('approved', 'complete') THEN COALESCE(hs.total_price_brl, hs.total_price) ELSE 0 END) as revenue,
  SUM(CASE WHEN hs.status IN ('approved', 'complete') THEN hs.original_price ELSE 0 END) as gross_revenue,
  COUNT(DISTINCT CASE WHEN hs.status IN ('approved', 'complete') THEN hs.transaction_id END) as sales_count,
  COUNT(DISTINCT hs.buyer_email) as unique_buyers,
  'live'::text as data_source,
  true as is_estimated
FROM public.hotmart_sales hs
LEFT JOIN public.offer_mappings om ON om.codigo_oferta = hs.offer_code AND om.project_id = hs.project_id
LEFT JOIN public.funnels f ON f.id = om.funnel_id
WHERE DATE(hs.sale_date AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
GROUP BY hs.project_id, om.funnel_id, f.name;

-- 3. Create live_spend_today view
-- Real-time spend from meta_insights for current date
CREATE OR REPLACE VIEW public.live_spend_today 
WITH (security_invoker = true) AS
SELECT 
  mi.project_id,
  f.id as funnel_id,
  f.name as funnel_name,
  mi.date_start as economic_day,
  SUM(mi.spend) as spend,
  COUNT(*) as record_count,
  'live'::text as data_source,
  true as is_estimated
FROM public.meta_insights mi
LEFT JOIN public.meta_campaigns mc ON mc.campaign_id = mi.campaign_id AND mc.project_id = mi.project_id
LEFT JOIN public.funnels f ON f.project_id = mi.project_id 
  AND f.campaign_name_pattern IS NOT NULL 
  AND mc.campaign_name ILIKE '%' || f.campaign_name_pattern || '%'
WHERE mi.date_start = CURRENT_DATE
GROUP BY mi.project_id, f.id, f.name, mi.date_start;

-- 4. Create live_financial_today view
-- Combined live financials for today
CREATE OR REPLACE VIEW public.live_financial_today 
WITH (security_invoker = true) AS
SELECT 
  COALESCE(s.project_id, sp.project_id) as project_id,
  COALESCE(s.funnel_id, sp.funnel_id) as funnel_id,
  COALESCE(s.funnel_name, sp.funnel_name) as funnel_name,
  CURRENT_DATE as economic_day,
  COALESCE(s.revenue, 0) as revenue,
  COALESCE(s.gross_revenue, 0) as gross_revenue,
  COALESCE(s.sales_count, 0)::int as sales_count,
  COALESCE(sp.spend, 0) as spend,
  COALESCE(s.revenue, 0) - COALESCE(sp.spend, 0) as profit,
  CASE 
    WHEN COALESCE(sp.spend, 0) > 0 THEN COALESCE(s.revenue, 0) / sp.spend
    ELSE NULL 
  END as roas,
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

-- 5. Create live_project_totals_today view
-- Project-level live totals for today
CREATE OR REPLACE VIEW public.live_project_totals_today 
WITH (security_invoker = true) AS
SELECT 
  project_id,
  CURRENT_DATE as economic_day,
  SUM(revenue) as total_revenue,
  SUM(gross_revenue) as total_gross_revenue,
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
FROM public.live_financial_today
GROUP BY project_id;

-- 6. Grant SELECT permissions on views
GRANT SELECT ON public.live_sales_today TO authenticated;
GRANT SELECT ON public.live_spend_today TO authenticated;
GRANT SELECT ON public.live_financial_today TO authenticated;
GRANT SELECT ON public.live_project_totals_today TO authenticated;