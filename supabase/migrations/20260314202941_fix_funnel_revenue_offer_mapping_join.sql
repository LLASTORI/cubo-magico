-- ============================================================
-- Fix: funnel_revenue — adiciona JOIN com offer_mappings
-- order_items.funnel_id é sempre NULL (nunca populado pelo webhook).
-- A atribuição de funil vem de offer_mappings.funnel_id via
-- offer_mappings.codigo_oferta = order_items.provider_offer_id.
-- Aplicada via MCP Supabase em 14/03/2026
-- ============================================================

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
