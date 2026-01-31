-- Dropar e recriar crm_orders_view com campo currency
DROP VIEW IF EXISTS crm_orders_view;

CREATE VIEW crm_orders_view AS
SELECT 
    id AS order_id,
    project_id,
    provider_order_id,
    buyer_email,
    buyer_name,
    ordered_at,
    approved_at,
    status,
    customer_paid,
    producer_net,
    currency,
    ( SELECT count(*) AS count
           FROM order_items oi
          WHERE oi.order_id = o.id) AS item_count,
    (EXISTS ( SELECT 1
           FROM order_items oi
          WHERE oi.order_id = o.id AND oi.item_type <> 'main'::text)) AS has_bump,
    (EXISTS ( SELECT 1
           FROM order_items oi
          WHERE oi.order_id = o.id AND oi.item_type = 'upsell'::text)) AS has_upsell,
    COALESCE(( SELECT oi.funnel_id
           FROM order_items oi
          WHERE oi.order_id = o.id
         LIMIT 1), ( SELECT om.funnel_id
           FROM order_items oi
             JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
          WHERE oi.order_id = o.id
         LIMIT 1)) AS funnel_id,
    ( SELECT f.name
           FROM funnels f
          WHERE f.id = COALESCE(( SELECT oi.funnel_id
                   FROM order_items oi
                  WHERE oi.order_id = o.id
                 LIMIT 1), ( SELECT om.funnel_id
                   FROM order_items oi
                     JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
                  WHERE oi.order_id = o.id
                 LIMIT 1))) AS funnel_name
   FROM orders o
  WHERE status = ANY (ARRAY['approved'::text, 'completed'::text, 'APPROVED'::text, 'COMPLETE'::text]);