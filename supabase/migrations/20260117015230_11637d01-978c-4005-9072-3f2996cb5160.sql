-- PROMPT 29: View com fallback silencioso (Orders Core → crm_transactions)
-- Quando Orders Core estiver populado, os dados dele prevalecem automaticamente

DROP VIEW IF EXISTS public.crm_customer_intelligence_overview;

CREATE OR REPLACE VIEW public.crm_customer_intelligence_overview AS
WITH orders_data AS (
  -- Dados de Orders Core (canônico)
  SELECT
    o.project_id,
    o.buyer_email as email,
    o.customer_paid,
    o.id as order_id
  FROM orders o
  WHERE o.status = 'approved'
),
transactions_data AS (
  -- Dados de crm_transactions (fallback)
  SELECT
    t.project_id,
    c.email,
    COALESCE(t.total_price, 0) as customer_paid,
    t.id as order_id
  FROM crm_transactions t
  JOIN crm_contacts c ON c.id = t.contact_id
  WHERE t.status IN ('APPROVED', 'COMPLETE')
),
-- Usa Orders Core se existir, senão usa transactions
combined_orders AS (
  SELECT * FROM orders_data
  UNION ALL
  SELECT * FROM transactions_data td
  WHERE NOT EXISTS (
    SELECT 1 FROM orders_data od 
    WHERE od.project_id = td.project_id
  )
),
customer_order_counts AS (
  SELECT
    email,
    project_id,
    COUNT(*) as order_count,
    SUM(customer_paid) as total_spent
  FROM combined_orders
  GROUP BY email, project_id
),
repeat_customers AS (
  SELECT
    project_id,
    COUNT(*) as count
  FROM customer_order_counts
  WHERE order_count >= 2
  GROUP BY project_id
)
SELECT
  c.project_id,
  
  -- BLOCO 1: BASE DE CONTATOS
  COUNT(DISTINCT c.id)::integer AS total_contacts,
  COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END)::integer AS total_customers,
  COUNT(DISTINCT CASE WHEN coc.email IS NULL THEN c.id END)::integer AS total_leads,
  0::integer AS total_prospects,
  
  -- BLOCO 2: VALOR DA BASE
  COALESCE(SUM(coc.total_spent), 0)::numeric AS total_revenue,
  
  CASE
    WHEN COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END) > 0
    THEN ROUND(
      (COALESCE(SUM(coc.total_spent), 0) / 
       COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END))::numeric,
      2
    )
    ELSE 0
  END AS avg_ltv,
  
  CASE
    WHEN SUM(coc.order_count) > 0
    THEN ROUND(
      (COALESCE(SUM(coc.total_spent), 0) / NULLIF(SUM(coc.order_count), 0))::numeric,
      2
    )
    ELSE 0
  END AS avg_ticket,
  
  COALESCE(SUM(coc.order_count), 0)::integer AS total_orders,
  
  CASE
    WHEN COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END) > 0
    THEN ROUND(
      (COALESCE(SUM(coc.order_count), 0)::numeric / 
       NULLIF(COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END), 0))::numeric,
      2
    )
    ELSE 0
  END AS avg_orders_per_customer,
  
  -- BLOCO 3: COMPORTAMENTO
  COALESCE((SELECT count FROM repeat_customers rc WHERE rc.project_id = c.project_id), 0)::integer AS repeat_customers_count,
  
  CASE
    WHEN COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END) > 0
    THEN ROUND(
      (COALESCE((SELECT count FROM repeat_customers rc WHERE rc.project_id = c.project_id), 0)::numeric / 
       NULLIF(COUNT(DISTINCT CASE WHEN coc.email IS NOT NULL THEN c.id END), 0) * 100),
      1
    )
    ELSE 0
  END AS repeat_rate_percent

FROM crm_contacts c
LEFT JOIN customer_order_counts coc ON coc.email = c.email AND coc.project_id = c.project_id
GROUP BY c.project_id;