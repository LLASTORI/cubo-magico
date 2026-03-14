-- ============================================================
-- Migração: Analytics para Ledger-First (fase 1 — 4 views)
-- Substitui views que liam sales_core_events por queries
-- sobre orders + order_items (provider-agnostic, ledger-first)
-- Aplicada via MCP Supabase em 14/03/2026
-- ============================================================

-- ── 1. funnel_revenue ──────────────────────────────────────
CREATE OR REPLACE VIEW funnel_revenue AS
WITH order_funnel AS (
  SELECT DISTINCT ON (o.id)
    o.id          AS order_id,
    o.project_id,
    o.producer_net_brl  AS revenue,
    o.customer_paid_brl AS gross_revenue,
    DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
    oi.funnel_id
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE oi.funnel_id IS NOT NULL
    AND o.status IN ('approved', 'completed')
  ORDER BY o.id,
    CASE oi.item_type WHEN 'main' THEN 0 ELSE 1 END
)
SELECT
  project_id,
  funnel_id,
  economic_day,
  SUM(revenue)       AS revenue,
  SUM(gross_revenue) AS gross_revenue,
  COUNT(*)           AS sales_count
FROM order_funnel
GROUP BY project_id, funnel_id, economic_day;


-- ── 2. sales_daily ────────────────────────────────────────
CREATE OR REPLACE VIEW sales_daily AS
SELECT
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
  SUM(o.producer_net_brl)       AS revenue,
  SUM(o.customer_paid_brl)      AS gross_revenue,
  COUNT(*)                       AS transactions,
  COUNT(DISTINCT o.buyer_email)  AS unique_buyers
FROM orders o
WHERE o.status IN ('approved', 'completed')
GROUP BY
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo');


-- ── 3. refunds_daily ─────────────────────────────────────
CREATE OR REPLACE VIEW refunds_daily AS
SELECT
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
  SUM(ABS(o.producer_net_brl))  AS refunds,
  SUM(ABS(o.customer_paid_brl)) AS gross_refunds,
  COUNT(*)                       AS refund_count,
  0::numeric                     AS chargebacks,
  0::bigint                      AS chargeback_count
FROM orders o
WHERE o.status IN ('cancelled', 'refunded')
GROUP BY
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo');


-- ── 4. revenue_daily ─────────────────────────────────────
CREATE OR REPLACE VIEW revenue_daily AS
SELECT
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
  SUM(o.customer_paid_brl)  AS gross_revenue,
  SUM(o.platform_fee_brl)   AS platform_fees,
  SUM(o.affiliate_brl)      AS affiliate_fees,
  SUM(o.coproducer_brl)     AS coproducer_fees,
  SUM(o.producer_net_brl)   AS net_revenue,
  COUNT(*)                   AS transaction_count,
  'core'::text               AS data_source
FROM orders o
WHERE o.status IN ('approved', 'completed')
GROUP BY
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo');
