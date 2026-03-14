-- ============================================================
-- Fix: gross_amount em todas as views ledger-first
--
-- Problema: customer_paid_brl é NULL para pedidos de webhook —
-- o webhook só popula customer_paid (moeda original, BRL para
-- vendas Hotmart BR). customer_paid_brl é populado apenas pelo
-- CSV import.
--
-- Solução: COALESCE(customer_paid_brl, customer_paid)
-- Para pedidos em BRL (maioria), customer_paid já é BRL.
-- Para pedidos em EUR (minoria), customer_paid_brl terá o valor
-- convertido quando disponível.
--
-- Aplica-se a: funnel_revenue, sales_daily, refunds_daily,
--              revenue_daily, finance_tracking_view
-- Aplicada via MCP Supabase em 14/03/2026
-- ============================================================

-- ── 1. funnel_revenue ──────────────────────────────────────
CREATE OR REPLACE VIEW funnel_revenue AS
WITH order_funnel AS (
  SELECT DISTINCT ON (o.id)
    o.id          AS order_id,
    o.project_id,
    o.producer_net_brl                                        AS revenue,
    COALESCE(o.customer_paid_brl, o.customer_paid)           AS gross_revenue,
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
CREATE OR REPLACE VIEW sales_daily AS
SELECT
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
  SUM(o.producer_net_brl)                              AS revenue,
  SUM(COALESCE(o.customer_paid_brl, o.customer_paid)) AS gross_revenue,
  COUNT(*)                                              AS transactions,
  COUNT(DISTINCT o.buyer_email)                         AS unique_buyers
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
  SUM(ABS(o.producer_net_brl))                              AS refunds,
  SUM(ABS(COALESCE(o.customer_paid_brl, o.customer_paid))) AS gross_refunds,
  COUNT(*)                                                   AS refund_count,
  0::numeric                                                 AS chargebacks,
  0::bigint                                                  AS chargeback_count
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
  SUM(COALESCE(o.customer_paid_brl, o.customer_paid)) AS gross_revenue,
  SUM(o.platform_fee_brl)                              AS platform_fees,
  SUM(o.affiliate_brl)                                 AS affiliate_fees,
  SUM(o.coproducer_brl)                                AS coproducer_fees,
  SUM(o.producer_net_brl)                              AS net_revenue,
  COUNT(*)                                              AS transaction_count,
  'core'::text                                          AS data_source
FROM orders o
WHERE o.status IN ('approved', 'completed')
GROUP BY
  o.project_id,
  DATE(COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo');


-- ── 5. finance_tracking_view ─────────────────────────────
CREATE OR REPLACE VIEW finance_tracking_view AS
WITH main_item AS (
  SELECT DISTINCT ON (oi.order_id)
    oi.order_id,
    oi.product_name,
    oi.provider_product_id  AS product_code,
    oi.provider_offer_id    AS offer_code,
    COALESCE(oi.funnel_id, om.funnel_id) AS funnel_id,
    f.name AS funnel_name
  FROM order_items oi
  LEFT JOIN offer_mappings om
    ON om.project_id    = oi.project_id
   AND om.codigo_oferta = oi.provider_offer_id
  LEFT JOIN funnels f
    ON f.id = COALESCE(oi.funnel_id, om.funnel_id)
  ORDER BY oi.order_id,
    CASE oi.item_type WHEN 'main' THEN 0 ELSE 1 END
)
SELECT
  o.id,
  o.project_id,
  o.provider_order_id                                    AS transaction_id,
  COALESCE(o.customer_paid_brl, o.customer_paid)        AS gross_amount,
  o.producer_net_brl                                     AS net_amount,
  CASE o.status
    WHEN 'approved'        THEN 'APPROVED'
    WHEN 'completed'       THEN 'COMPLETE'
    WHEN 'cancelled'       THEN 'CANCELLED'
    WHEN 'refunded'        THEN 'REFUNDED'
    WHEN 'partial_refund'  THEN 'APPROVED'
    ELSE UPPER(o.status)
  END                                                    AS hotmart_status,
  COALESCE(o.approved_at, o.ordered_at)                 AS purchase_date,
  DATE(COALESCE(o.approved_at, o.ordered_at)
    AT TIME ZONE 'America/Sao_Paulo')                   AS economic_day,
  mi.product_name,
  mi.product_code,
  mi.offer_code,
  o.payment_method,
  o.payment_type,
  o.buyer_name,
  o.buyer_email,
  NULL::text                                             AS buyer_phone,
  NULL::text                                             AS buyer_phone_ddd,
  NULL::text                                             AS buyer_phone_country_code,
  mi.funnel_id,
  mi.funnel_name,
  o.utm_source,
  o.utm_campaign,
  o.utm_adset,
  o.utm_placement,
  o.utm_creative,
  o.utm_medium,
  o.meta_campaign_id,
  o.meta_adset_id,
  o.meta_ad_id,
  NULL::text                                             AS checkout_origin,
  o.contact_id,
  NULL::text                                             AS webhook_event_type,
  NULL::text                                             AS sale_category,
  NULL::text                                             AS recurrence,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN main_item mi ON mi.order_id = o.id
WHERE o.status IN ('approved', 'completed', 'cancelled', 'refunded', 'partial_refund');
