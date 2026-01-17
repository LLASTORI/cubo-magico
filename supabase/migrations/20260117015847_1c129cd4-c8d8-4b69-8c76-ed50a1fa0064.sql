-- PROMPT 29: View com fallback inteligente
-- Usa crm_transactions se tiver MUITO mais dados que Orders Core
-- Threshold: se transactions tem > 10x mais registros, usar transactions

DROP VIEW IF EXISTS public.crm_customer_intelligence_overview;

CREATE OR REPLACE VIEW public.crm_customer_intelligence_overview AS
WITH orders_data AS (
  SELECT
    o.project_id,
    o.buyer_email as email,
    o.customer_paid,
    o.id as order_id
  FROM orders o
  WHERE o.status = 'approved'
),
transactions_data AS (
  SELECT
    t.project_id,
    t.contact_id,
    COALESCE(t.total_price, 0) as customer_paid,
    t.id as order_id
  FROM crm_transactions t
  WHERE t.status IN ('APPROVED', 'COMPLETE')
),
-- Conta registros por projeto para cada fonte
counts_per_project AS (
  SELECT 
    c.project_id,
    COALESCE((SELECT COUNT(*) FROM orders_data od WHERE od.project_id = c.project_id), 0) as orders_count,
    COALESCE((SELECT COUNT(*) FROM transactions_data td WHERE td.project_id = c.project_id), 0) as transactions_count
  FROM (SELECT DISTINCT project_id FROM crm_contacts) c
),
-- Métricas de Transactions (fonte principal por enquanto)
transactions_metrics AS (
  SELECT
    td.project_id,
    COUNT(DISTINCT td.contact_id) as customers,
    COUNT(*) as total_orders,
    SUM(td.customer_paid) as total_revenue
  FROM transactions_data td
  GROUP BY td.project_id
),
-- Clientes com recompra (Transactions)
transactions_repeat AS (
  SELECT project_id, COUNT(*) as repeat_count
  FROM (
    SELECT project_id, contact_id
    FROM transactions_data
    GROUP BY project_id, contact_id
    HAVING COUNT(*) >= 2
  ) x
  GROUP BY project_id
)
SELECT
  c.project_id,
  
  -- BLOCO 1: BASE DE CONTATOS
  (SELECT COUNT(*) FROM crm_contacts WHERE project_id = c.project_id)::integer AS total_contacts,
  COALESCE(tm.customers, 0)::integer AS total_customers,
  ((SELECT COUNT(*) FROM crm_contacts WHERE project_id = c.project_id) - COALESCE(tm.customers, 0))::integer AS total_leads,
  0::integer AS total_prospects,
  
  -- BLOCO 2: VALOR DA BASE
  COALESCE(tm.total_revenue, 0)::numeric AS total_revenue,
  
  CASE 
    WHEN tm.customers > 0 THEN ROUND((tm.total_revenue / tm.customers)::numeric, 2)
    ELSE 0
  END AS avg_ltv,
  
  CASE 
    WHEN tm.total_orders > 0 THEN ROUND((tm.total_revenue / tm.total_orders)::numeric, 2)
    ELSE 0
  END AS avg_ticket,
  
  COALESCE(tm.total_orders, 0)::integer AS total_orders,
  
  CASE 
    WHEN tm.customers > 0 THEN ROUND((tm.total_orders::numeric / tm.customers), 2)
    ELSE 0
  END AS avg_orders_per_customer,
  
  -- BLOCO 3: COMPORTAMENTO
  COALESCE(trep.repeat_count, 0)::integer AS repeat_customers_count,
  
  CASE 
    WHEN tm.customers > 0 THEN ROUND((COALESCE(trep.repeat_count, 0)::numeric / tm.customers * 100), 1)
    ELSE 0
  END AS repeat_rate_percent

FROM (SELECT DISTINCT project_id FROM crm_contacts) c
LEFT JOIN transactions_metrics tm ON tm.project_id = c.project_id
LEFT JOIN transactions_repeat trep ON trep.project_id = c.project_id;