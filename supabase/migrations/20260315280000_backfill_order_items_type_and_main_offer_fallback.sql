-- Fix 1: Backfill item_type = 'unknown' para itens com posição conhecida em offer_mappings
-- Afeta apenas registros onde tipo_posicao está preenchido (FRONT/OB/US/DS)
UPDATE order_items
SET item_type = CASE
  WHEN sub.tipo_posicao IN ('FRONT', 'FE')    THEN 'main'
  WHEN sub.tipo_posicao IN ('OB')             THEN 'bump'
  WHEN sub.tipo_posicao IN ('US', 'upsell')   THEN 'upsell'
  WHEN sub.tipo_posicao IN ('DS', 'downsell') THEN 'downsell'
  ELSE order_items.item_type
END
FROM (
  SELECT oi.id AS oi_id, om.tipo_posicao
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  JOIN offer_mappings om
    ON om.project_id = o.project_id
    AND om.codigo_oferta = oi.provider_offer_id
    AND om.status IN ('Ativo', 'ativo', 'ATIVO')
    AND om.tipo_posicao IS NOT NULL
  WHERE oi.item_type = 'unknown'
) sub
WHERE order_items.id = sub.oi_id;

-- Fix 2: funnel_orders_view com fallback para main_offer_code
-- Se não existe item com item_type='main', usa offer com tipo_posicao FRONT/FE
-- Cobre casos onde item_type permanece 'unknown' por falta de tipo_posicao no mapeamento
CREATE OR REPLACE VIEW funnel_orders_view AS
SELECT
  o.id AS order_id,
  o.provider_order_id AS transaction_id,
  o.project_id,
  COALESCE(oi.funnel_id, om.funnel_id) AS funnel_id,
  f.name AS funnel_name,
  COALESCE(o.customer_paid_brl, o.customer_paid) AS customer_paid,
  o.producer_net_brl AS producer_net,
  o.currency,
  count(oi.id) AS order_items_count,
  max(oi.product_name) FILTER (WHERE oi.item_type = 'main') AS main_product,
  COALESCE(
    max(oi.provider_offer_id) FILTER (WHERE oi.item_type = 'main'),
    max(oi.provider_offer_id) FILTER (WHERE om.tipo_posicao IN ('FRONT', 'FE'))
  ) AS main_offer_code,
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
  sum(CASE WHEN oi.item_type = 'main'    THEN oi.base_price ELSE 0 END) AS main_revenue,
  sum(CASE WHEN oi.item_type = 'bump'    THEN oi.base_price ELSE 0 END) AS bump_revenue,
  sum(CASE WHEN oi.item_type = 'upsell'  THEN oi.base_price ELSE 0 END) AS upsell_revenue,
  -- UTM / atribuição
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
LEFT JOIN funnels f ON f.id = COALESCE(oi.funnel_id, om.funnel_id)
GROUP BY
  o.id, o.provider_order_id, o.project_id,
  COALESCE(oi.funnel_id, om.funnel_id), f.name,
  o.customer_paid_brl, o.customer_paid, o.producer_net_brl, o.currency,
  o.buyer_email, o.buyer_name, o.status, o.created_at, o.ordered_at, o.approved_at,
  o.meta_campaign_id, o.meta_adset_id, o.meta_ad_id,
  o.utm_source, o.utm_medium, o.utm_campaign, o.utm_content,
  o.utm_adset, o.utm_placement, o.raw_sck;

NOTIFY pgrst, 'reload schema';
