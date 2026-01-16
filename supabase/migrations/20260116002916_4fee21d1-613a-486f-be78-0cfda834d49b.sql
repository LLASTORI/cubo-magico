-- ═══════════════════════════════════════════════════════════════════════════
-- FUNNEL ORDERS VIEW - Canonical view for Funnel Analysis
-- ═══════════════════════════════════════════════════════════════════════════
-- This view aggregates Orders Core data for consumption by FunnelAnalysis.
-- It replaces finance_tracking_view as the source of truth for funnel metrics.
-- 
-- Column mapping from order_items:
--   provider_offer_id = codigo_oferta (from offer_mappings)
--   provider_product_id = id_produto (from offer_mappings)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.funnel_orders_view AS
SELECT
  -- Order identification
  o.id AS order_id,
  o.project_id,
  o.provider_order_id AS transaction_id,
  
  -- Funnel mapping (from main item's offer_mapping)
  COALESCE(om.funnel_id, oi_main.funnel_id) AS funnel_id,
  f.name AS funnel_name,
  
  -- Financial data (from orders - already calculated)
  o.customer_paid,
  o.producer_net,
  o.currency,
  
  -- Item counts and flags
  (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS order_items_count,
  
  -- Main product info (from first 'main' item)
  oi_main.product_name AS main_product,
  oi_main.provider_offer_id AS main_offer_code,
  
  -- Order composition flags
  EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.item_type = 'orderbump'
  ) AS has_bump,
  EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.item_type = 'upsell'
  ) AS has_upsell,
  EXISTS (
    SELECT 1 FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.item_type = 'downsell'
  ) AS has_downsell,
  
  -- Customer info
  o.buyer_email,
  o.buyer_name,
  
  -- Status
  o.status,
  
  -- Dates
  o.created_at,
  o.ordered_at,
  (o.ordered_at AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day,
  
  -- All offer codes in this order (for position analysis)
  (
    SELECT array_agg(DISTINCT oi.provider_offer_id) 
    FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.provider_offer_id IS NOT NULL
  ) AS all_offer_codes,
  
  -- Item breakdown by type
  (
    SELECT COALESCE(SUM(oi.base_price), 0) 
    FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.item_type = 'main'
  ) AS main_revenue,
  (
    SELECT COALESCE(SUM(oi.base_price), 0) 
    FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.item_type = 'orderbump'
  ) AS bump_revenue,
  (
    SELECT COALESCE(SUM(oi.base_price), 0) 
    FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.item_type IN ('upsell', 'downsell')
  ) AS upsell_revenue

FROM orders o

-- Get main item for primary product/offer info
LEFT JOIN LATERAL (
  SELECT 
    oi.product_name,
    oi.provider_offer_id,
    oi.funnel_id,
    oi.offer_mapping_id
  FROM order_items oi 
  WHERE oi.order_id = o.id AND oi.item_type = 'main'
  LIMIT 1
) oi_main ON true

-- Get offer mapping for funnel resolution (match by codigo_oferta = provider_offer_id)
LEFT JOIN offer_mappings om ON om.id = oi_main.offer_mapping_id
  OR (om.codigo_oferta = oi_main.provider_offer_id AND om.project_id = o.project_id)

-- Get funnel info
LEFT JOIN funnels f ON f.id = COALESCE(om.funnel_id, oi_main.funnel_id)

WHERE 
  -- Only approved/completed orders (matching old behavior)
  o.status IN ('approved', 'completed', 'APPROVED', 'COMPLETE');

-- Grant permissions
GRANT SELECT ON public.funnel_orders_view TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.funnel_orders_view IS 
'Canonical view for Funnel Analysis - aggregates Orders Core data with funnel mappings.
Replaces finance_tracking_view as the source of truth for funnel metrics.
IMPORTANT: This view is the ONLY allowed source for funnel sales data.';

-- ═══════════════════════════════════════════════════════════════════════════
-- Helper view for per-offer-code aggregations (used by position metrics)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.funnel_orders_by_offer AS
SELECT
  o.project_id,
  oi.provider_offer_id AS offer_code,
  oi.product_name,
  oi.item_type,
  COALESCE(om.funnel_id, oi.funnel_id) AS funnel_id,
  f.name AS funnel_name,
  om.tipo_posicao,
  om.nome_posicao,
  om.ordem_posicao,
  oi.base_price,
  o.id AS order_id,
  -- Economic day from parent order
  (o.ordered_at AT TIME ZONE 'America/Sao_Paulo')::date AS economic_day
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id 
  AND om.project_id = o.project_id
LEFT JOIN funnels f ON f.id = COALESCE(om.funnel_id, oi.funnel_id)
WHERE o.status IN ('approved', 'completed', 'APPROVED', 'COMPLETE')
  AND oi.provider_offer_id IS NOT NULL;

GRANT SELECT ON public.funnel_orders_by_offer TO authenticated;

COMMENT ON VIEW public.funnel_orders_by_offer IS 
'Per-offer breakdown of orders for position analysis in FunnelAnalysis.
Maps order_items.provider_offer_id to offer_mappings.codigo_oferta.';