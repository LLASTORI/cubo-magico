-- =====================================================
-- REVENUE, FEES & SPLIT ENGINE (CORRECTED)
-- Separates customer payment from business earnings
-- =====================================================

-- Drop views that may reference wrong columns (from failed attempt)
DROP VIEW IF EXISTS public.owner_profit_daily CASCADE;
DROP VIEW IF EXISTS public.profit_monthly CASCADE;
DROP VIEW IF EXISTS public.profit_daily CASCADE;
DROP VIEW IF EXISTS public.revenue_allocations_daily CASCADE;
DROP VIEW IF EXISTS public.revenue_allocations CASCADE;
DROP VIEW IF EXISTS public.revenue_daily CASCADE;

-- 1) CANONICAL REVENUE VIEW
-- Aggregates gross, fees, and net revenue by day
CREATE OR REPLACE VIEW public.revenue_daily
WITH (security_invoker = true)
AS
SELECT
  project_id,
  economic_day,
  SUM(gross_amount) as gross_revenue,
  SUM(gross_amount - net_amount) as platform_fees,
  SUM(net_amount) as net_revenue,
  COUNT(*) as transaction_count,
  'core'::text as data_source
FROM public.sales_core_events
WHERE is_active = true 
  AND event_type IN ('purchase', 'subscription', 'upgrade')
GROUP BY project_id, economic_day;

-- Grant access
GRANT SELECT ON public.revenue_daily TO authenticated;

-- 2) PRODUCT REVENUE SPLITS TABLE (if not exists from partial migration)
CREATE TABLE IF NOT EXISTS public.product_revenue_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('owner', 'coproducer', 'affiliate')),
  partner_name TEXT,
  percentage DECIMAL(5,4) NOT NULL CHECK (percentage >= 0 AND percentage <= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, product_id, partner_type, partner_name)
);

-- Enable RLS (if not already)
ALTER TABLE public.product_revenue_splits ENABLE ROW LEVEL SECURITY;

-- RLS policies (drop if exist to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their project splits" ON public.product_revenue_splits;
DROP POLICY IF EXISTS "Users can manage their project splits" ON public.product_revenue_splits;

CREATE POLICY "Users can view their project splits"
  ON public.product_revenue_splits
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their project splits"
  ON public.product_revenue_splits
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
      UNION
      SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_revenue_splits_project 
  ON public.product_revenue_splits(project_id);
CREATE INDEX IF NOT EXISTS idx_product_revenue_splits_product 
  ON public.product_revenue_splits(product_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_revenue_splits TO authenticated;

-- 3) REVENUE ALLOCATIONS VIEW
-- Applies split percentages to each sale
-- Uses raw_payload to extract product info
CREATE OR REPLACE VIEW public.revenue_allocations
WITH (security_invoker = true)
AS
SELECT
  e.id as event_id,
  e.project_id,
  e.economic_day,
  COALESCE(
    (e.raw_payload->'data'->'product'->>'id')::text,
    e.raw_payload->>'product_id'
  ) as product_id,
  COALESCE(
    e.raw_payload->'data'->'product'->>'name',
    e.raw_payload->>'product_name'
  ) as product_name,
  s.partner_type,
  s.partner_name,
  s.percentage,
  e.net_amount,
  ROUND((e.net_amount * s.percentage)::numeric, 2) as allocated_amount,
  'core'::text as data_source
FROM public.sales_core_events e
JOIN public.product_revenue_splits s 
  ON s.product_id = COALESCE(
    (e.raw_payload->'data'->'product'->>'id')::text,
    e.raw_payload->>'product_id'
  )
  AND s.project_id = e.project_id
  AND s.is_active = true
WHERE e.is_active = true 
  AND e.event_type IN ('purchase', 'subscription', 'upgrade');

-- Grant access
GRANT SELECT ON public.revenue_allocations TO authenticated;

-- 4) REVENUE ALLOCATIONS DAILY SUMMARY
CREATE OR REPLACE VIEW public.revenue_allocations_daily
WITH (security_invoker = true)
AS
SELECT
  project_id,
  economic_day,
  partner_type,
  partner_name,
  SUM(allocated_amount) as total_allocated,
  COUNT(*) as transaction_count,
  'core'::text as data_source
FROM public.revenue_allocations
GROUP BY project_id, economic_day, partner_type, partner_name;

-- Grant access
GRANT SELECT ON public.revenue_allocations_daily TO authenticated;

-- 5) PROFIT DAILY VIEW
CREATE OR REPLACE VIEW public.profit_daily
WITH (security_invoker = true)
AS
SELECT
  COALESCE(r.project_id, d.project_id) as project_id,
  COALESCE(r.economic_day, d.economic_day) as economic_day,
  COALESCE(r.gross_revenue, 0) as gross_revenue,
  COALESCE(r.platform_fees, 0) as platform_fees,
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

-- Grant access
GRANT SELECT ON public.profit_daily TO authenticated;

-- 6) PROFIT MONTHLY SUMMARY
CREATE OR REPLACE VIEW public.profit_monthly
WITH (security_invoker = true)
AS
SELECT
  project_id,
  DATE_TRUNC('month', economic_day)::date as month,
  SUM(gross_revenue) as gross_revenue,
  SUM(platform_fees) as platform_fees,
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

-- Grant access
GRANT SELECT ON public.profit_monthly TO authenticated;

-- 7) OWNER PROFIT VIEW - shows only owner's share after splits
CREATE OR REPLACE VIEW public.owner_profit_daily
WITH (security_invoker = true)
AS
SELECT
  p.project_id,
  p.economic_day,
  p.gross_revenue,
  p.platform_fees,
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

-- Grant access
GRANT SELECT ON public.owner_profit_daily TO authenticated;

-- 8) Trigger for updated_at (if not exists)
CREATE OR REPLACE FUNCTION public.update_product_revenue_splits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_revenue_splits_timestamp ON public.product_revenue_splits;
CREATE TRIGGER update_product_revenue_splits_timestamp
  BEFORE UPDATE ON public.product_revenue_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_revenue_splits_updated_at();

-- 9) Comments
COMMENT ON VIEW public.revenue_daily IS 'Canonical daily revenue view - separates gross, fees, and net. Use net_revenue for all calculations.';
COMMENT ON TABLE public.product_revenue_splits IS 'Split rules per product - supports multiple partners (owner, coproducer, affiliate)';
COMMENT ON VIEW public.revenue_allocations IS 'Revenue allocated per sale based on split rules';
COMMENT ON VIEW public.profit_daily IS 'Daily profit = net_revenue - ad_spend. NEVER use gross_revenue for optimization.';
COMMENT ON VIEW public.owner_profit_daily IS 'Owner-specific profit after partner splits are applied';