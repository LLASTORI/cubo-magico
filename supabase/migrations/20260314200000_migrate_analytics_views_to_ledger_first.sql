-- ============================================================
-- Migração: Analytics para Ledger-First
-- Substitui views que liam sales_core_events por queries
-- sobre orders + order_items (provider-agnostic, ledger-first)
--
-- Impacto:
--   funnel_revenue     → funnel_financials → useFunnelFinancials (Dashboard)
--   sales_daily        → financial_daily   → useFinancialCore
--   refunds_daily      → financial_daily   → useFinancialCore
--   revenue_daily      → profit_daily      → useProjectOverview
--
-- Vendas importadas via CSV agora aparecem em todos os módulos.
-- ============================================================

-- ── 1. funnel_revenue ──────────────────────────────────────
-- Antes: sales_core_events.attribution->>'funnel_id'
-- Agora: order_items JOIN offer_mappings ON provider_offer_id = codigo_oferta
CREATE OR REPLACE VIEW funnel_revenue AS
WITH order_funnel AS (
  SELECT DISTINCT ON (o.id)
    o.id          AS order_id,
    o.project_id,
    o.producer_net_brl  AS revenue,
    o.customer_paid_brl AS gross_revenue,
    DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
    COALESCE(oi.funnel_id, om.funnel_id) AS funnel_id
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN offer_mappings om
    ON om.project_id    = o.project_id
   AND om.codigo_oferta = oi.provider_offer_id
  WHERE COALESCE(oi.funnel_id, om.funnel_id) IS NOT NULL
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
-- Antes: sales_core_events WHERE event_type IN ('purchase','subscription','upgrade')
-- Agora: orders WHERE status IN ('approved','completed')
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
-- Antes: sales_core_events WHERE event_type IN ('refund','chargeback')
-- Agora: orders WHERE status IN ('cancelled','refunded')
-- Nota: chargebacks zerados (sem status separado em orders por ora)
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
-- Antes: sales_core_events com platform_fee, affiliate_cost, coproducer_cost
-- Agora: orders (que já tem esses campos desde o webhook)
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
