-- PROMPT 29: View corrigida com fallback silencioso
-- Corrigido: usar contact_id direto do crm_transactions em vez de join por email

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
-- Conta pedidos por projeto para decidir qual fonte usar
orders_per_project AS (
  SELECT project_id, COUNT(*) as cnt FROM orders_data GROUP BY project_id
),
-- Métricas de Orders Core (quando disponível)
orders_metrics AS (
  SELECT
    od.project_id,
    COUNT(DISTINCT od.email) as customers,
    COUNT(*) as total_orders,
    SUM(od.customer_paid) as total_revenue
  FROM orders_data od
  GROUP BY od.project_id
),
-- Métricas de Transactions (fallback)
transactions_metrics AS (
  SELECT
    td.project_id,
    COUNT(DISTINCT td.contact_id) as customers,
    COUNT(*) as total_orders,
    SUM(td.customer_paid) as total_revenue
  FROM transactions_data td
  GROUP BY td.project_id
),
-- Clientes com recompra (Orders Core)
orders_repeat AS (
  SELECT project_id, COUNT(*) as repeat_count
  FROM (
    SELECT project_id, email
    FROM orders_data
    GROUP BY project_id, email
    HAVING COUNT(*) >= 2
  ) x
  GROUP BY project_id
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
),
-- Combina métricas: usa Orders se existir, senão usa Transactions
combined_metrics AS (
  SELECT
    c.project_id,
    CASE WHEN opp.cnt > 0 THEN om.customers ELSE tm.customers END as customers,
    CASE WHEN opp.cnt > 0 THEN om.total_orders ELSE tm.total_orders END as total_orders,
    CASE WHEN opp.cnt > 0 THEN om.total_revenue ELSE tm.total_revenue END as total_revenue,
    CASE WHEN opp.cnt > 0 THEN orep.repeat_count ELSE trep.repeat_count END as repeat_count
  FROM (SELECT DISTINCT project_id FROM crm_contacts) c
  LEFT JOIN orders_per_project opp ON opp.project_id = c.project_id
  LEFT JOIN orders_metrics om ON om.project_id = c.project_id
  LEFT JOIN transactions_metrics tm ON tm.project_id = c.project_id
  LEFT JOIN orders_repeat orep ON orep.project_id = c.project_id
  LEFT JOIN transactions_repeat trep ON trep.project_id = c.project_id
)
SELECT
  c.project_id,
  
  -- BLOCO 1: BASE DE CONTATOS
  (SELECT COUNT(*) FROM crm_contacts WHERE project_id = c.project_id)::integer AS total_contacts,
  COALESCE(cm.customers, 0)::integer AS total_customers,
  ((SELECT COUNT(*) FROM crm_contacts WHERE project_id = c.project_id) - COALESCE(cm.customers, 0))::integer AS total_leads,
  0::integer AS total_prospects,
  
  -- BLOCO 2: VALOR DA BASE
  COALESCE(cm.total_revenue, 0)::numeric AS total_revenue,
  
  CASE 
    WHEN cm.customers > 0 THEN ROUND((cm.total_revenue / cm.customers)::numeric, 2)
    ELSE 0
  END AS avg_ltv,
  
  CASE 
    WHEN cm.total_orders > 0 THEN ROUND((cm.total_revenue / cm.total_orders)::numeric, 2)
    ELSE 0
  END AS avg_ticket,
  
  COALESCE(cm.total_orders, 0)::integer AS total_orders,
  
  CASE 
    WHEN cm.customers > 0 THEN ROUND((cm.total_orders::numeric / cm.customers), 2)
    ELSE 0
  END AS avg_orders_per_customer,
  
  -- BLOCO 3: COMPORTAMENTO
  COALESCE(cm.repeat_count, 0)::integer AS repeat_customers_count,
  
  CASE 
    WHEN cm.customers > 0 THEN ROUND((cm.repeat_count::numeric / cm.customers * 100), 1)
    ELSE 0
  END AS repeat_rate_percent

FROM (SELECT DISTINCT project_id FROM crm_contacts) c
LEFT JOIN combined_metrics cm ON cm.project_id = c.project_id;