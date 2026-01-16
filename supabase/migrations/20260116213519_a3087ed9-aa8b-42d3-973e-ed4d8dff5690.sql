-- REGRA CANÔNICA DE AUTOMAÇÃO:
-- 1 pedido = 1 evento de automação
-- Não dispara por item/transação

CREATE OR REPLACE VIEW public.crm_order_automation_events_view AS
SELECT 
  o.id AS order_id,
  o.provider_order_id,
  o.project_id,
  
  -- Contact info
  c.id AS contact_id,
  COALESCE(c.name, o.buyer_name) AS contact_name,
  o.buyer_email AS contact_email,
  c.phone AS contact_phone,
  
  -- Event type based on sequence
  CASE 
    WHEN ROW_NUMBER() OVER (
      PARTITION BY o.buyer_email, o.project_id 
      ORDER BY o.ordered_at
    ) = 1 THEN 'first_order'
    ELSE 'repeat_order'
  END AS event_type,
  
  -- Order sequence (1, 2, 3...)
  ROW_NUMBER() OVER (
    PARTITION BY o.buyer_email, o.project_id 
    ORDER BY o.ordered_at
  )::integer AS order_sequence,
  
  -- Order value
  COALESCE(o.customer_paid, 0) AS order_value,
  COALESCE(o.producer_net, 0) AS producer_net,
  o.currency,
  
  -- Timing
  o.ordered_at,
  o.created_at,
  
  -- Items count (for context, not for triggering)
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::integer AS items_count,
  
  -- Main product (first item by base_price desc)
  (
    SELECT oi.product_name 
    FROM order_items oi 
    WHERE oi.order_id = o.id 
    ORDER BY oi.base_price DESC NULLS LAST 
    LIMIT 1
  ) AS main_product_name,
  
  -- Attribution
  o.utm_source,
  o.utm_campaign,
  o.utm_adset,
  o.provider,
  
  -- Status
  o.status,
  
  -- Funnel (from main item)
  (
    SELECT oi.funnel_id 
    FROM order_items oi 
    WHERE oi.order_id = o.id 
    ORDER BY oi.base_price DESC NULLS LAST 
    LIMIT 1
  ) AS funnel_id

FROM orders o
LEFT JOIN crm_contacts c ON 
  c.email = o.buyer_email 
  AND c.project_id = o.project_id

WHERE o.status = 'approved'

ORDER BY o.ordered_at DESC;

-- Documentation comment
COMMENT ON VIEW crm_order_automation_events_view IS 
'REGRA CANÔNICA DE AUTOMAÇÃO: 1 pedido = 1 evento. event_type: first_order ou repeat_order. Não dispara por item/transação.';