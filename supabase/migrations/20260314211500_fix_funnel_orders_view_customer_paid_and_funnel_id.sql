-- ============================================================
-- Fix: funnel_orders_view
--
-- Bug 1: customer_paid = o.customer_paid_brl → sempre NULL para
--   pedidos de webhook. Corrigido com COALESCE(customer_paid_brl, customer_paid).
--
-- Bug 2: funnel_id = oi.funnel_id → sempre NULL porque order_items
--   não tem funnel_id populado. Resolvido via JOIN com offer_mappings
--   usando COALESCE(oi.funnel_id, om.funnel_id).
--
-- Bug 3: economic_day = date(o.ordered_at) → inconsistente com outras
--   views. Corrigido para DATE(COALESCE(approved_at, ordered_at) AT TIME ZONE
--   'America/Sao_Paulo').
-- ============================================================

CREATE OR REPLACE VIEW funnel_orders_view AS
SELECT
  o.id                                                         AS order_id,
  o.provider_order_id                                          AS transaction_id,
  o.project_id,
  COALESCE(oi.funnel_id, om.funnel_id)                        AS funnel_id,
  f.name                                                       AS funnel_name,
  COALESCE(o.customer_paid_brl, o.customer_paid)              AS customer_paid,
  o.producer_net_brl                                           AS producer_net,
  o.currency,
  COUNT(oi.id)                                                 AS order_items_count,
  MAX(oi.product_name) FILTER (WHERE oi.item_type = 'main')   AS main_product,
  MAX(oi.offer_code)   FILTER (WHERE oi.item_type = 'main')   AS main_offer_code,
  BOOL_OR(oi.item_type = 'bump')                              AS has_bump,
  BOOL_OR(oi.item_type = 'upsell')                            AS has_upsell,
  BOOL_OR(oi.item_type = 'downsell')                          AS has_downsell,
  o.buyer_email,
  o.buyer_name,
  o.status,
  o.created_at,
  o.ordered_at,
  DATE(COALESCE(o.approved_at, o.ordered_at)
    AT TIME ZONE 'America/Sao_Paulo')                         AS economic_day,
  ARRAY_AGG(oi.offer_code)                                    AS all_offer_codes,
  SUM(CASE WHEN oi.item_type = 'main'    THEN oi.base_price ELSE 0 END) AS main_revenue,
  SUM(CASE WHEN oi.item_type = 'bump'    THEN oi.base_price ELSE 0 END) AS bump_revenue,
  SUM(CASE WHEN oi.item_type = 'upsell'  THEN oi.base_price ELSE 0 END) AS upsell_revenue
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN offer_mappings om
  ON om.project_id    = o.project_id
 AND om.codigo_oferta = oi.provider_offer_id
LEFT JOIN funnels f ON f.id = COALESCE(oi.funnel_id, om.funnel_id)
GROUP BY
  o.id, o.provider_order_id, o.project_id,
  COALESCE(oi.funnel_id, om.funnel_id),
  f.name,
  o.customer_paid_brl, o.customer_paid,
  o.producer_net_brl, o.currency,
  o.buyer_email, o.buyer_name,
  o.status, o.created_at, o.ordered_at, o.approved_at;
