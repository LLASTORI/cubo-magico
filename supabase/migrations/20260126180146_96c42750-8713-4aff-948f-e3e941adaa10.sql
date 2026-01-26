-- PROMPT 3: Consolidação Total do Orders Core
-- Esta migration atualiza a view crm_customer_intelligence_overview para usar exclusivamente orders (Orders Core)
-- Elimina qualquer dependência de crm_transactions

DROP VIEW IF EXISTS crm_customer_intelligence_overview;

CREATE OR REPLACE VIEW crm_customer_intelligence_overview AS
WITH 
-- Orders Core como fonte única de verdade
orders_metrics AS (
  SELECT 
    o.project_id,
    COUNT(DISTINCT o.id) AS total_orders,
    COUNT(DISTINCT o.buyer_email) AS unique_customers,
    SUM(o.customer_paid) AS total_revenue
  FROM orders o
  WHERE o.status = 'approved'
  GROUP BY o.project_id
),

-- Clientes com 2+ compras (recompra)
repeat_customers AS (
  SELECT 
    project_id,
    COUNT(*) AS repeat_count
  FROM (
    SELECT project_id, buyer_email
    FROM orders
    WHERE status = 'approved'
    GROUP BY project_id, buyer_email
    HAVING COUNT(*) >= 2
  ) x
  GROUP BY project_id
)

SELECT 
  c.project_id,
  
  -- BLOCO 1: BASE DE CONTATOS
  (SELECT COUNT(*) FROM crm_contacts WHERE project_id = c.project_id)::integer AS total_contacts,
  COALESCE(om.unique_customers, 0)::integer AS total_customers,
  ((SELECT COUNT(*) FROM crm_contacts WHERE project_id = c.project_id) - COALESCE(om.unique_customers, 0))::integer AS total_leads,
  0 AS total_prospects,
  
  -- BLOCO 2: VALOR DA BASE
  COALESCE(om.total_revenue, 0) AS total_revenue,
  CASE 
    WHEN om.unique_customers > 0 THEN ROUND(om.total_revenue / om.unique_customers, 2)
    ELSE 0
  END AS avg_ltv,
  CASE 
    WHEN om.total_orders > 0 THEN ROUND(om.total_revenue / om.total_orders, 2)
    ELSE 0
  END AS avg_ticket,
  COALESCE(om.total_orders, 0)::integer AS total_orders,
  CASE 
    WHEN om.unique_customers > 0 THEN ROUND(om.total_orders::numeric / om.unique_customers, 2)
    ELSE 0
  END AS avg_orders_per_customer,
  
  -- BLOCO 3: COMPORTAMENTO
  COALESCE(rc.repeat_count, 0)::integer AS repeat_customers_count,
  CASE 
    WHEN om.unique_customers > 0 THEN ROUND((COALESCE(rc.repeat_count, 0)::numeric / om.unique_customers * 100), 1)
    ELSE 0
  END AS repeat_rate_percent

FROM (SELECT DISTINCT project_id FROM crm_contacts) c
LEFT JOIN orders_metrics om ON om.project_id = c.project_id
LEFT JOIN repeat_customers rc ON rc.project_id = c.project_id;