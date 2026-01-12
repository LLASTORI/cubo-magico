-- ================================================
-- PROMPT 6: Funnel, ROAS & AI Migration to Financial Core
-- Canonical funnel views for optimization and AI
-- ================================================

-- 1) Funnel Revenue View (from sales_core_events)
CREATE OR REPLACE VIEW public.funnel_revenue
WITH (security_invoker = true)
AS
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

COMMENT ON VIEW public.funnel_revenue IS 'Canonical funnel revenue aggregated from sales_core_events. Source of truth for AI and optimization.';

-- 2) Funnel Spend View (from spend_core_events via campaign pattern matching)
-- Links spend to funnels by matching campaign_id to funnel campaign_name_pattern
CREATE OR REPLACE VIEW public.funnel_spend
WITH (security_invoker = true)
AS
SELECT
  s.project_id,
  f.id as funnel_id,
  s.economic_day,
  SUM(s.spend_amount) as spend,
  COUNT(*) as record_count
FROM spend_core_events s
JOIN meta_campaigns mc ON mc.campaign_id = s.campaign_id AND mc.project_id = s.project_id
JOIN funnels f ON f.project_id = s.project_id 
  AND f.campaign_name_pattern IS NOT NULL
  AND mc.campaign_name ILIKE '%' || f.campaign_name_pattern || '%'
WHERE s.is_active = true
GROUP BY s.project_id, f.id, s.economic_day;

COMMENT ON VIEW public.funnel_spend IS 'Canonical funnel spend aggregated from spend_core_events via campaign pattern matching.';

-- 3) Project-level spend (no funnel attribution) for fallback
CREATE OR REPLACE VIEW public.spend_by_project
WITH (security_invoker = true)
AS
SELECT
  project_id,
  economic_day,
  SUM(spend_amount) as total_spend,
  COUNT(*) as record_count
FROM spend_core_events
WHERE is_active = true
GROUP BY project_id, economic_day;

COMMENT ON VIEW public.spend_by_project IS 'Total spend by project from Core events, for cases without funnel attribution.';

-- 4) Funnel Financials View (combined revenue + spend)
CREATE OR REPLACE VIEW public.funnel_financials
WITH (security_invoker = true)
AS
SELECT
  COALESCE(r.project_id, s.project_id) as project_id,
  COALESCE(r.funnel_id, s.funnel_id) as funnel_id,
  COALESCE(r.economic_day, s.economic_day) as economic_day,
  COALESCE(r.revenue, 0) as revenue,
  COALESCE(r.gross_revenue, 0) as gross_revenue,
  COALESCE(r.sales_count, 0) as sales_count,
  COALESCE(s.spend, 0) as spend,
  (COALESCE(r.revenue, 0) - COALESCE(s.spend, 0)) as profit,
  CASE 
    WHEN COALESCE(s.spend, 0) > 0 
    THEN ROUND((COALESCE(r.revenue, 0) / s.spend)::numeric, 2)
    ELSE NULL 
  END as roas,
  CASE 
    WHEN COALESCE(r.sales_count, 0) > 0 
    THEN ROUND((COALESCE(s.spend, 0) / r.sales_count)::numeric, 2)
    ELSE NULL 
  END as cpa
FROM funnel_revenue r
FULL OUTER JOIN funnel_spend s 
  ON r.project_id = s.project_id 
  AND r.funnel_id = s.funnel_id 
  AND r.economic_day = s.economic_day;

COMMENT ON VIEW public.funnel_financials IS 'Canonical funnel financials combining revenue and spend. ONLY source for ROAS, profit, and CPA calculations.';

-- 5) Funnel Financials Summary (aggregated by funnel, respecting core start date)
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
  -- Health status based on ROAS
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

COMMENT ON VIEW public.funnel_financials_summary IS 'Aggregated funnel financials respecting financial_core_start_date. Use for AI analysis and optimization.';

-- 6) Grant permissions
GRANT SELECT ON public.funnel_revenue TO anon, authenticated;
GRANT SELECT ON public.funnel_spend TO anon, authenticated;
GRANT SELECT ON public.spend_by_project TO anon, authenticated;
GRANT SELECT ON public.funnel_financials TO anon, authenticated;
GRANT SELECT ON public.funnel_financials_summary TO anon, authenticated;