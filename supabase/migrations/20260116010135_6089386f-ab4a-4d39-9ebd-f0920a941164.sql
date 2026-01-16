-- Create CRM Recovery Orders View
-- 🚫 LEGACY TABLES FORBIDDEN: crm_transactions, hotmart_sales, crm_contacts
-- This view is 100% Orders + Ledger based

CREATE OR REPLACE VIEW public.crm_recovery_orders_view AS
/*
 * CRM Recovery View - Orders Core
 * Shows orders that need recovery attention:
 * - cancelled, pending, refunded, expired, abandoned, chargeback
 * 
 * FORBIDDEN: crm_transactions, hotmart_sales, crm_contacts
 */
SELECT
  o.id AS order_id,
  o.project_id,
  o.provider_order_id,
  o.buyer_email,
  o.buyer_name,
  o.ordered_at,
  o.status,
  o.customer_paid,
  o.producer_net,
  COALESCE(
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id),
    0
  )::int AS item_count,
  -- Get main product name
  (
    SELECT oi.product_name 
    FROM order_items oi 
    WHERE oi.order_id = o.id 
    ORDER BY oi.base_price DESC 
    LIMIT 1
  ) AS main_product_name,
  -- Funnel info
  COALESCE(
    (SELECT oi.funnel_id FROM order_items oi WHERE oi.order_id = o.id AND oi.funnel_id IS NOT NULL LIMIT 1),
    (
      SELECT om.funnel_id 
      FROM order_items oi 
      JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
      WHERE oi.order_id = o.id AND om.funnel_id IS NOT NULL 
      LIMIT 1
    )
  ) AS funnel_id,
  -- Get funnel name
  (
    SELECT f.name 
    FROM funnels f 
    WHERE f.id = COALESCE(
      (SELECT oi.funnel_id FROM order_items oi WHERE oi.order_id = o.id AND oi.funnel_id IS NOT NULL LIMIT 1),
      (
        SELECT om.funnel_id 
        FROM order_items oi 
        JOIN offer_mappings om ON om.codigo_oferta = oi.provider_offer_id AND om.project_id = o.project_id
        WHERE oi.order_id = o.id AND om.funnel_id IS NOT NULL 
        LIMIT 1
      )
    )
  ) AS funnel_name,
  -- Map status to recovery category
  CASE 
    WHEN o.status IN ('cancelled', 'CANCELLED') THEN 'Cancelado'
    WHEN o.status IN ('chargeback', 'CHARGEBACK') THEN 'Chargeback'
    WHEN o.status IN ('refunded', 'REFUNDED') THEN 'Reembolsado'
    WHEN o.status IN ('abandoned', 'ABANDONED') THEN 'Carrinho Abandonado'
    WHEN o.status IN ('pending', 'PENDING', 'expired', 'EXPIRED') THEN 'Pendente'
    ELSE o.status
  END AS recovery_category
FROM orders o
WHERE o.status NOT IN ('approved', 'completed', 'APPROVED', 'COMPLETE')
ORDER BY o.ordered_at DESC;

-- Add comment
COMMENT ON VIEW public.crm_recovery_orders_view IS 'CRM Recovery View - 100% Orders Core. FORBIDDEN: crm_transactions, hotmart_sales';