-- Fix funnel_orders_view: eliminate duplicate rows per order + add payment_method
--
-- Root cause: GROUP BY included COALESCE(oi.funnel_id, om.funnel_id), causing one
-- row per (order × funnel) combination when order items belong to different funnels.
-- This inflated faturamento by ~R$11.671 (74 duplicate rows out of 7.093 total).
--
-- Fix: CTE aggregates all items per order_id (GROUP BY o.id only), then joins
-- funnels once at the end → always 1 row per order.

DROP VIEW IF EXISTS funnel_orders_view;

CREATE VIEW funnel_orders_view AS
WITH order_agg AS (
  SELECT
    o.id AS order_id,
    o.provider_order_id AS transaction_id,
    o.project_id,
    -- Funnel from the 'main' item first; fall back to any item's funnel
    COALESCE(
      (array_agg(oi.funnel_id) FILTER (WHERE oi.item_type = 'main' AND oi.funnel_id IS NOT NULL))[1],
      (array_agg(om.funnel_id) FILTER (WHERE oi.item_type = 'main' AND om.funnel_id IS NOT NULL))[1],
      (array_agg(oi.funnel_id) FILTER (WHERE oi.funnel_id IS NOT NULL))[1],
      (array_agg(om.funnel_id) FILTER (WHERE om.funnel_id IS NOT NULL))[1]
    ) AS funnel_id,
    COALESCE(o.customer_paid_brl, o.customer_paid) AS customer_paid,
    o.producer_net_brl AS producer_net,
    o.currency,
    o.payment_method,
    count(oi.id) AS order_items_count,
    max(oi.product_name)       FILTER (WHERE oi.item_type = 'main') AS main_product,
    max(oi.provider_offer_id)  FILTER (WHERE oi.item_type = 'main') AS main_offer_code,
    bool_or(oi.item_type = 'bump')     AS has_bump,
    bool_or(oi.item_type = 'upsell')   AS has_upsell,
    bool_or(oi.item_type = 'downsell') AS has_downsell,
    o.buyer_email,
    o.buyer_name,
    o.status,
    o.created_at,
    o.ordered_at,
    date((COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo')) AS economic_day,
    array_agg(oi.provider_offer_id) AS all_offer_codes,
    sum(CASE WHEN oi.item_type = 'main'    THEN oi.base_price ELSE 0 END) AS main_revenue,
    sum(CASE WHEN oi.item_type = 'bump'    THEN oi.base_price ELSE 0 END) AS bump_revenue,
    sum(CASE WHEN oi.item_type = 'upsell'  THEN oi.base_price ELSE 0 END) AS upsell_revenue,
    o.meta_campaign_id,
    o.meta_adset_id,
    o.meta_ad_id,
    o.utm_source,
    o.utm_medium,
    o.utm_campaign,
    o.utm_content,
    o.utm_adset,
    o.utm_placement,
    o.raw_sck AS checkout_origin
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id
  LEFT JOIN offer_mappings om
    ON om.project_id = o.project_id
   AND om.codigo_oferta = oi.provider_offer_id
  GROUP BY
    o.id, o.provider_order_id, o.project_id,
    o.customer_paid_brl, o.customer_paid, o.producer_net_brl, o.currency, o.payment_method,
    o.buyer_email, o.buyer_name, o.status, o.created_at, o.ordered_at, o.approved_at,
    o.meta_campaign_id, o.meta_adset_id, o.meta_ad_id,
    o.utm_source, o.utm_medium, o.utm_campaign, o.utm_content,
    o.utm_adset, o.utm_placement, o.raw_sck
)
SELECT
  oa.order_id,
  oa.transaction_id,
  oa.project_id,
  oa.funnel_id,
  f.name AS funnel_name,
  oa.customer_paid,
  oa.producer_net,
  oa.currency,
  oa.order_items_count,
  oa.main_product,
  oa.main_offer_code,
  oa.has_bump,
  oa.has_upsell,
  oa.has_downsell,
  oa.buyer_email,
  oa.buyer_name,
  oa.status,
  oa.created_at,
  oa.ordered_at,
  oa.economic_day,
  oa.all_offer_codes,
  oa.main_revenue,
  oa.bump_revenue,
  oa.upsell_revenue,
  oa.meta_campaign_id,
  oa.meta_adset_id,
  oa.meta_ad_id,
  oa.utm_source,
  oa.utm_medium,
  oa.utm_campaign,
  oa.utm_content,
  oa.utm_adset,
  oa.utm_placement,
  oa.checkout_origin,
  oa.payment_method
FROM order_agg oa
LEFT JOIN funnels f ON f.id = oa.funnel_id;

NOTIFY pgrst, 'reload schema';
