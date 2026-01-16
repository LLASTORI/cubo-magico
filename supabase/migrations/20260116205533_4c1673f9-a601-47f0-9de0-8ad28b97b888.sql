-- ============================================================================
-- SHADOW VIEW: crm_journey_orders_view
-- REGRA CANÔNICA DE JORNADA:
-- - 1 pedido (orders) = 1 evento de jornada
-- - Order items são detalhes, não eventos
-- - Ledger não cria eventos de jornada
-- - CRM legacy é transitório
-- ============================================================================

CREATE OR REPLACE VIEW crm_journey_orders_view AS
SELECT 
  -- Identificação do pedido
  o.id as order_id,
  o.provider_order_id,
  o.project_id,
  
  -- Link com contato CRM (por email)
  c.id as contact_id,
  COALESCE(c.name, o.buyer_name) as contact_name,
  o.buyer_email as contact_email,
  
  -- Timing
  o.ordered_at,
  
  -- Valores canônicos
  COALESCE(o.customer_paid, 0) as customer_paid,
  COALESCE(o.producer_net, 0) as producer_net,
  o.currency,
  o.provider,
  
  -- UTMs de atribuição (colunas existentes na tabela orders)
  o.utm_source,
  o.utm_campaign,
  o.utm_adset,
  o.utm_placement,
  o.utm_creative,
  
  -- Contagem de items
  (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id)::int as items_count,
  
  -- Status
  o.status,
  
  -- Produtos como array agregado
  (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'item_type', oi.item_type,
          'product_name', oi.product_name,
          'offer_name', oi.offer_name,
          'base_price', oi.base_price,
          'funnel_id', oi.funnel_id
        )
        ORDER BY CASE oi.item_type WHEN 'main' THEN 0 WHEN 'bump' THEN 1 ELSE 2 END
      ),
      '[]'::jsonb
    )
    FROM order_items oi 
    WHERE oi.order_id = o.id
  ) as products_detail,
  
  -- Produto principal (primeiro item main)
  (
    SELECT oi.product_name 
    FROM order_items oi 
    WHERE oi.order_id = o.id 
    ORDER BY CASE oi.item_type WHEN 'main' THEN 0 WHEN 'bump' THEN 1 ELSE 2 END
    LIMIT 1
  ) as main_product_name,
  
  -- Funil do produto principal
  (
    SELECT oi.funnel_id 
    FROM order_items oi 
    WHERE oi.order_id = o.id 
    ORDER BY CASE oi.item_type WHEN 'main' THEN 0 WHEN 'bump' THEN 1 ELSE 2 END
    LIMIT 1
  ) as main_funnel_id,
  
  -- Número da compra na jornada do cliente
  ROW_NUMBER() OVER (
    PARTITION BY o.buyer_email, o.project_id 
    ORDER BY o.ordered_at
  ) as purchase_sequence

FROM orders o
LEFT JOIN crm_contacts c ON c.email = o.buyer_email AND c.project_id = o.project_id
WHERE o.status = 'approved';

-- ============================================================================
-- SHADOW VIEW: crm_contact_journey_metrics_view
-- Métricas agregadas por contato baseadas em Orders Core
-- ============================================================================

CREATE OR REPLACE VIEW crm_contact_journey_metrics_view AS
SELECT 
  j.project_id,
  j.contact_id,
  j.contact_email,
  MAX(j.contact_name) as contact_name,
  
  -- Métricas canônicas
  COUNT(DISTINCT j.order_id) as total_orders,
  SUM(j.customer_paid) as total_customer_paid,
  SUM(j.producer_net) as total_producer_net,
  SUM(j.items_count) as total_items,
  
  -- Datas
  MIN(j.ordered_at) as first_order_at,
  MAX(j.ordered_at) as last_order_at,
  
  -- Flags
  CASE WHEN COUNT(DISTINCT j.order_id) > 1 THEN true ELSE false END as is_repeat_customer,
  
  -- Primeiro produto comprado
  (
    SELECT jf.main_product_name 
    FROM crm_journey_orders_view jf 
    WHERE jf.contact_email = j.contact_email 
      AND jf.project_id = j.project_id 
    ORDER BY jf.ordered_at 
    LIMIT 1
  ) as first_product,
  
  -- Último produto comprado
  (
    SELECT jl.main_product_name 
    FROM crm_journey_orders_view jl 
    WHERE jl.contact_email = j.contact_email 
      AND jl.project_id = j.project_id 
    ORDER BY jl.ordered_at DESC 
    LIMIT 1
  ) as last_product,
  
  -- Primeira UTM source
  (
    SELECT ju.utm_source 
    FROM crm_journey_orders_view ju 
    WHERE ju.contact_email = j.contact_email 
      AND ju.project_id = j.project_id 
      AND ju.utm_source IS NOT NULL
    ORDER BY ju.ordered_at 
    LIMIT 1
  ) as first_utm_source

FROM crm_journey_orders_view j
GROUP BY j.project_id, j.contact_id, j.contact_email;