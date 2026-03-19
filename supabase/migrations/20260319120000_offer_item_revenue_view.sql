-- Offer Item Revenue View
-- Aggregates base_price from order_items at offer level with date dimension.
-- Used by useFunnelData to compute exact per-offer revenue for OB/US/DS positions
-- instead of approximating with mapping.valor × count.

CREATE OR REPLACE VIEW offer_item_revenue_view AS
SELECT
  o.project_id,
  oi.provider_offer_id AS offer_code,
  oi.item_type,
  DATE((COALESCE(o.approved_at, o.ordered_at)) AT TIME ZONE 'America/Sao_Paulo') AS economic_day,
  SUM(oi.base_price) AS revenue,
  COUNT(*) AS sales_count
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.status IN ('approved', 'completed', 'partial_refund')
  AND oi.provider_offer_id IS NOT NULL
GROUP BY
  o.project_id,
  oi.provider_offer_id,
  oi.item_type,
  DATE((COALESCE(o.approved_at, o.ordered_at)) AT TIME ZONE 'America/Sao_Paulo');
