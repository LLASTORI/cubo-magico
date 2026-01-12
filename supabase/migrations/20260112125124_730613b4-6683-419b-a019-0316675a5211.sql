-- ============================================
-- CANONICAL FINANCIAL VIEWS FOR CUBO CORE
-- ============================================

-- View: sales_daily
-- Aggregates all purchase, subscription, and upgrade events by economic_day
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

-- View: refunds_daily
-- Aggregates all refund and chargeback events by economic_day
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

-- View: spend_daily
-- Aggregates all ad spend by economic_day
CREATE OR REPLACE VIEW public.spend_daily AS
SELECT
  project_id,
  economic_day,
  SUM(spend_amount) as ad_spend,
  COUNT(DISTINCT campaign_id) as campaigns,
  COUNT(DISTINCT ad_id) as ads
FROM spend_core_events
WHERE is_active = true
GROUP BY project_id, economic_day;

-- View: financial_daily
-- Joins all metrics for complete daily financial picture
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

-- ============================================
-- ADDITIONAL UTILITY VIEWS
-- ============================================

-- View: sales_monthly
-- Monthly aggregation for period comparisons
CREATE OR REPLACE VIEW public.sales_monthly AS
SELECT
  project_id,
  DATE_TRUNC('month', economic_day)::date as month,
  SUM(net_amount) as revenue,
  SUM(gross_amount) as gross_revenue,
  COUNT(*) as transactions,
  COUNT(DISTINCT contact_id) as unique_buyers
FROM sales_core_events
WHERE is_active = true 
  AND event_type IN ('purchase', 'subscription', 'upgrade')
GROUP BY project_id, DATE_TRUNC('month', economic_day);

-- View: spend_monthly
-- Monthly spend aggregation
CREATE OR REPLACE VIEW public.spend_monthly AS
SELECT
  project_id,
  DATE_TRUNC('month', economic_day)::date as month,
  SUM(spend_amount) as ad_spend,
  COUNT(DISTINCT campaign_id) as campaigns
FROM spend_core_events
WHERE is_active = true
GROUP BY project_id, DATE_TRUNC('month', economic_day);

-- View: financial_monthly
-- Complete monthly financial picture
CREATE OR REPLACE VIEW public.financial_monthly AS
SELECT
  COALESCE(s.project_id, d.project_id) as project_id,
  COALESCE(s.month, d.month) as month,
  COALESCE(s.revenue, 0) as revenue,
  COALESCE(s.gross_revenue, 0) as gross_revenue,
  COALESCE(s.transactions, 0) as transactions,
  COALESCE(s.unique_buyers, 0) as unique_buyers,
  COALESCE(d.ad_spend, 0) as ad_spend,
  (COALESCE(s.revenue, 0) - COALESCE(d.ad_spend, 0)) as profit,
  CASE 
    WHEN COALESCE(d.ad_spend, 0) > 0 
    THEN COALESCE(s.revenue, 0) / d.ad_spend 
    ELSE 0 
  END as roas,
  CASE 
    WHEN COALESCE(s.transactions, 0) > 0 
    THEN COALESCE(d.ad_spend, 0) / s.transactions 
    ELSE 0 
  END as cpa
FROM sales_monthly s
FULL OUTER JOIN spend_monthly d 
  ON s.project_id = d.project_id AND s.month = d.month;