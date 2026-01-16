
-- REGRA CANÔNICA DE LTV
-- LTV é calculado por pedido, não por item/transação
-- Orders Core é a única fonte válida
-- CRM legado é transitório

-- Create canonical contact orders metrics view (extends existing view with avg_ticket)
CREATE OR REPLACE VIEW public.crm_contact_orders_metrics_view AS
SELECT 
  c.id AS contact_id,
  c.email AS contact_email,
  c.name AS contact_name,
  c.project_id,
  
  -- Order counts
  COALESCE(COUNT(DISTINCT o.id), 0)::integer AS orders_count,
  COALESCE(COUNT(oi.id), 0)::integer AS items_count,
  
  -- Revenue metrics (canonical LTV)
  COALESCE(SUM(o.customer_paid), 0)::numeric AS total_customer_paid,
  COALESCE(SUM(o.producer_net), 0)::numeric AS total_producer_net,
  
  -- Average ticket (LTV / orders)
  CASE 
    WHEN COUNT(DISTINCT o.id) > 0 
    THEN ROUND((SUM(o.customer_paid) / COUNT(DISTINCT o.id))::numeric, 2)
    ELSE 0
  END AS avg_ticket,
  
  -- Order dates
  MIN(o.ordered_at) AS first_order_at,
  MAX(o.ordered_at) AS last_order_at,
  
  -- Days since last order
  CASE 
    WHEN MAX(o.ordered_at) IS NOT NULL 
    THEN EXTRACT(DAY FROM (NOW() - MAX(o.ordered_at)))::integer
    ELSE NULL
  END AS days_since_last_order,
  
  -- Repeat customer flag
  (COUNT(DISTINCT o.id) > 1) AS is_repeat_customer,
  
  -- Product info
  (
    SELECT oi2.product_name 
    FROM orders o2 
    JOIN order_items oi2 ON oi2.order_id = o2.id 
    WHERE o2.buyer_email = c.email 
      AND o2.project_id = c.project_id
      AND o2.status = 'paid'
    ORDER BY o2.ordered_at ASC 
    LIMIT 1
  ) AS first_product,
  (
    SELECT oi2.product_name 
    FROM orders o2 
    JOIN order_items oi2 ON oi2.order_id = o2.id 
    WHERE o2.buyer_email = c.email 
      AND o2.project_id = c.project_id
      AND o2.status = 'paid'
    ORDER BY o2.ordered_at DESC 
    LIMIT 1
  ) AS last_product,
  
  -- First UTM source
  (
    SELECT o2.utm_source 
    FROM orders o2 
    WHERE o2.buyer_email = c.email 
      AND o2.project_id = c.project_id
      AND o2.status = 'paid'
      AND o2.utm_source IS NOT NULL
    ORDER BY o2.ordered_at ASC 
    LIMIT 1
  ) AS first_utm_source,
  
  -- Provider breakdown (JSON)
  (
    SELECT jsonb_object_agg(
      provider, 
      jsonb_build_object('count', order_count, 'revenue', revenue)
    )
    FROM (
      SELECT 
        o2.provider,
        COUNT(DISTINCT o2.id) AS order_count,
        SUM(o2.customer_paid) AS revenue
      FROM orders o2
      WHERE o2.buyer_email = c.email 
        AND o2.project_id = c.project_id
        AND o2.status = 'paid'
      GROUP BY o2.provider
    ) AS breakdown
  ) AS provider_breakdown

FROM crm_contacts c
LEFT JOIN orders o ON 
  o.buyer_email = c.email 
  AND o.project_id = c.project_id
  AND o.status = 'paid'
LEFT JOIN order_items oi ON oi.order_id = o.id

GROUP BY c.id, c.email, c.name, c.project_id;

-- Add comment for documentation
COMMENT ON VIEW crm_contact_orders_metrics_view IS 
'REGRA CANÔNICA DE LTV: LTV calculado por pedido (Orders Core), não por transação. CRM legado é transitório.';
