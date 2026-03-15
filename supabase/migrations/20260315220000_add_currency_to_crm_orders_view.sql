-- Fix: add currency column to crm_orders_view
-- ContactTransactionsList.tsx was selecting currency but the view didn't have it,
-- causing silent PostgREST errors and empty transaction lists in the contact card.

DROP VIEW IF EXISTS crm_orders_view;

CREATE VIEW crm_orders_view AS
SELECT
  o.id AS order_id,
  o.project_id,
  o.provider_order_id,
  o.buyer_email,
  o.buyer_name,
  o.ordered_at,
  o.approved_at,
  o.status,
  o.customer_paid,
  o.producer_net,
  o.currency,
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::integer AS item_count,
  (EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type <> 'main')) AS has_bump,
  (EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.item_type = 'upsell')) AS has_upsell,
  COALESCE(
    (SELECT oi.funnel_id FROM order_items oi WHERE oi.order_id = o.id LIMIT 1),
    (SELECT om.funnel_id FROM order_items oi JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id WHERE oi.order_id = o.id LIMIT 1)
  ) AS funnel_id,
  (SELECT f.name FROM funnels f WHERE f.id = COALESCE(
    (SELECT oi.funnel_id FROM order_items oi WHERE oi.order_id = o.id LIMIT 1),
    (SELECT om.funnel_id FROM order_items oi JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id WHERE oi.order_id = o.id LIMIT 1)
  )) AS funnel_name
FROM orders o
WHERE status = ANY (ARRAY['approved', 'completed', 'APPROVED', 'COMPLETE']);
