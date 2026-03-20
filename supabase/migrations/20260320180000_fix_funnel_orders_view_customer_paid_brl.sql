-- Fix funnel_orders_view: customer_paid for BRL orders with missing OB/bump amounts
--
-- Problem: For some Hotmart webhook events, customer_paid stores only the FRONT item
-- price, not the total including OB/bump. Example: order HP2221103737C1 has
-- customer_paid = R$97 but 2 items (FRONT R$97 + OB R$97 = R$194 real total).
--
-- Root cause: Hotmart sometimes sends separate webhook events for main purchase and
-- OB, with each event reporting only its own item price in customer_paid. The OB item
-- gets correctly inserted into order_items (bump_revenue = R$97), but customer_paid
-- remains at R$97 (FRONT only).
--
-- Fix: For BRL orders (currency = 'BRL', no BRL conversion needed), if customer_paid
-- is less than SUM(order_items.base_price) but >= main item price (not a coupon),
-- use SUM(base_price) instead. This catches the "missing OB in customer_paid" case
-- without affecting:
--   - Installment orders: customer_paid >= SUM(base_price) (fees on top) → unchanged
--   - Coupon orders: customer_paid < main item price → unchanged (coupon detected)
--   - Foreign currency orders: handled by COALESCE(customer_paid_brl, customer_paid)
--
-- Safe for:
--   ✅ FIO A FIO REALISTA installment: customer_paid=218.10 > SUM(base_price)=197 → keep 218.10
--   ✅ Basic Magic Shadow OB missing: customer_paid=97 < SUM(base_price)=194 AND >= main=97 → use 194
--   ✅ LATAM CLP order: currency != 'BRL' → uses COALESCE path, returns R$272.30
--   ✅ Coupon order (hypothetical): customer_paid=48 < main_price=97 → keep 48

CREATE OR REPLACE VIEW funnel_orders_view AS
WITH order_agg AS (
  SELECT
    o.id AS order_id,
    o.provider_order_id AS transaction_id,
    o.project_id,
    COALESCE(
      (array_agg(oi.funnel_id) FILTER (WHERE oi.item_type = 'main' AND oi.funnel_id IS NOT NULL))[1],
      (array_agg(om.funnel_id) FILTER (WHERE oi.item_type = 'main' AND om.funnel_id IS NOT NULL))[1],
      (array_agg(oi.funnel_id) FILTER (WHERE oi.funnel_id IS NOT NULL))[1],
      (array_agg(om.funnel_id) FILTER (WHERE om.funnel_id IS NOT NULL))[1]
    ) AS funnel_id,
    -- customer_paid: BRL canonical total, with fix for missing OB amounts.
    -- For BRL orders: if customer_paid < SUM(base_price) but >= main item price,
    -- use SUM(base_price) (Hotmart sent customer_paid without OB included).
    -- For foreign currency: COALESCE(customer_paid_brl, customer_paid) as before.
    CASE
      WHEN o.currency = 'BRL' AND o.customer_paid_brl IS NULL THEN
        CASE
          WHEN o.customer_paid >= COALESCE(
                 SUM(CASE WHEN oi.item_type = 'main' THEN oi.base_price ELSE 0::numeric END), 0
               )
           AND o.customer_paid < COALESCE(SUM(oi.base_price), o.customer_paid)
          THEN COALESCE(SUM(oi.base_price), o.customer_paid)
          ELSE o.customer_paid
        END
      ELSE COALESCE(o.customer_paid_brl, o.customer_paid)
    END AS customer_paid,
    o.producer_net_brl AS producer_net,
    o.currency,
    o.payment_method,
    count(oi.id) AS order_items_count,
    max(oi.product_name) FILTER (WHERE oi.item_type = 'main') AS main_product,
    max(oi.provider_offer_id) FILTER (WHERE oi.item_type = 'main') AS main_offer_code,
    bool_or(oi.item_type = 'bump') AS has_bump,
    bool_or(oi.item_type = 'upsell') AS has_upsell,
    bool_or(oi.item_type = 'downsell') AS has_downsell,
    o.buyer_email,
    o.buyer_name,
    o.status,
    o.created_at,
    o.ordered_at,
    date((COALESCE(o.approved_at, o.ordered_at) AT TIME ZONE 'America/Sao_Paulo')) AS economic_day,
    array_agg(oi.provider_offer_id) AS all_offer_codes,
    sum(CASE WHEN oi.item_type = 'main' THEN oi.base_price ELSE 0::numeric END) AS main_revenue,
    sum(CASE WHEN oi.item_type = 'bump' THEN oi.base_price ELSE 0::numeric END) AS bump_revenue,
    sum(CASE WHEN oi.item_type = 'upsell' THEN oi.base_price ELSE 0::numeric END) AS upsell_revenue,
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
  LEFT JOIN offer_mappings om ON om.project_id = o.project_id AND om.codigo_oferta = oi.provider_offer_id
  GROUP BY
    o.id, o.provider_order_id, o.project_id,
    o.customer_paid_brl, o.customer_paid, o.producer_net_brl,
    o.currency, o.payment_method,
    o.buyer_email, o.buyer_name, o.status,
    o.created_at, o.ordered_at, o.approved_at,
    o.meta_campaign_id, o.meta_adset_id, o.meta_ad_id,
    o.utm_source, o.utm_medium, o.utm_campaign,
    o.utm_content, o.utm_adset, o.utm_placement, o.raw_sck
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
