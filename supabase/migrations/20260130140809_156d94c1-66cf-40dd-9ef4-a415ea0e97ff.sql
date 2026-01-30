-- Remove hardcoded status filter from funnel_orders_view
-- Status filtering will be done at application layer (useFunnelData hook)
-- This aligns with Busca Rápida which includes 'partial_refund' status

CREATE OR REPLACE VIEW public.funnel_orders_view AS
SELECT 
    o.id AS order_id,
    o.project_id,
    o.provider_order_id AS transaction_id,
    COALESCE(om.funnel_id, oi_main.funnel_id) AS funnel_id,
    f.name AS funnel_name,
    o.customer_paid,
    o.producer_net,
    o.currency,
    (SELECT count(*) FROM order_items WHERE order_items.order_id = o.id) AS order_items_count,
    oi_main.product_name AS main_product,
    oi_main.provider_offer_id AS main_offer_code,
    (EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'orderbump')) AS has_bump,
    (EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'upsell')) AS has_upsell,
    (EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'downsell')) AS has_downsell,
    o.buyer_email,
    o.buyer_name,
    o.status,
    o.created_at,
    o.ordered_at,
    (o.ordered_at AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
    (SELECT array_agg(DISTINCT oi.provider_offer_id) FROM order_items oi WHERE oi.order_id = o.id AND oi.provider_offer_id IS NOT NULL) AS all_offer_codes,
    (SELECT COALESCE(sum(oi.base_price), 0) FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'main') AS main_revenue,
    (SELECT COALESCE(sum(oi.base_price), 0) FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'orderbump') AS bump_revenue,
    (SELECT COALESCE(sum(oi.base_price), 0) FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type IN ('upsell', 'downsell')) AS upsell_revenue
FROM orders o
LEFT JOIN LATERAL (
    SELECT oi.product_name, oi.provider_offer_id, oi.funnel_id, oi.offer_mapping_id
    FROM order_items oi
    WHERE oi.order_id = o.id AND oi.item_type = 'main'
    LIMIT 1
) oi_main ON true
LEFT JOIN offer_mappings om ON (om.id = oi_main.offer_mapping_id OR (om.codigo_oferta = oi_main.provider_offer_id AND om.project_id = o.project_id))
LEFT JOIN funnels f ON f.id = COALESCE(om.funnel_id, oi_main.funnel_id);
-- NO WHERE CLAUSE - status filtering done at application layer