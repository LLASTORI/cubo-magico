-- View para métricas agregadas da base de clientes (PROMPT 28)
-- Objetivo: Fornecer visão executiva em 1 única query
-- Performance: < 500ms para bases grandes

CREATE OR REPLACE VIEW public.crm_customer_intelligence_overview AS
SELECT 
  c.project_id,
  
  -- ═══════════════════════════════════════════════════════════════
  -- BLOCO 1: BASE DE CONTATOS
  -- ═══════════════════════════════════════════════════════════════
  COUNT(DISTINCT c.id)::integer AS total_contacts,
  
  -- Clientes = contatos com pelo menos 1 pedido aprovado
  COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END)::integer AS total_customers,
  
  -- Leads = contatos sem nenhum pedido
  COUNT(DISTINCT CASE WHEN o.id IS NULL THEN c.id END)::integer AS total_leads,
  
  -- Prospects = contatos com pedidos mas nenhum aprovado (futuro, por ora = 0)
  -- Nota: Esta view considera apenas orders approved, então prospects seriam
  -- contatos com transações não-aprovadas, o que requer lógica separada
  0::integer AS total_prospects,
  
  -- ═══════════════════════════════════════════════════════════════
  -- BLOCO 2: VALOR DA BASE
  -- ═══════════════════════════════════════════════════════════════
  
  -- Receita total (soma de todos os pedidos aprovados)
  COALESCE(SUM(o.customer_paid), 0)::numeric AS total_revenue,
  
  -- LTV Médio (receita total / número de clientes)
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END) > 0
    THEN ROUND(
      (COALESCE(SUM(o.customer_paid), 0) / 
       COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END))::numeric, 
      2
    )
    ELSE 0
  END AS avg_ltv,
  
  -- Ticket Médio (receita total / número de pedidos)
  CASE 
    WHEN COUNT(DISTINCT o.id) > 0
    THEN ROUND(
      (COALESCE(SUM(o.customer_paid), 0) / COUNT(DISTINCT o.id))::numeric, 
      2
    )
    ELSE 0
  END AS avg_ticket,
  
  -- Total de pedidos
  COUNT(DISTINCT o.id)::integer AS total_orders,
  
  -- Compras médias por cliente
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END) > 0
    THEN ROUND(
      (COUNT(DISTINCT o.id)::numeric / 
       COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END))::numeric, 
      2
    )
    ELSE 0
  END AS avg_orders_per_customer,
  
  -- ═══════════════════════════════════════════════════════════════
  -- BLOCO 3: COMPORTAMENTO
  -- ═══════════════════════════════════════════════════════════════
  
  -- Clientes com recompra (2+ pedidos)
  (
    SELECT COUNT(*)::integer
    FROM (
      SELECT o2.buyer_email
      FROM orders o2
      WHERE o2.project_id = c.project_id
        AND o2.status = 'approved'
      GROUP BY o2.buyer_email, o2.project_id
      HAVING COUNT(DISTINCT o2.id) >= 2
    ) AS repeat_customers
  ) AS repeat_customers_count,
  
  -- Taxa de recompra (% de clientes com 2+ pedidos)
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END) > 0
    THEN ROUND(
      (
        (
          SELECT COUNT(*)::numeric
          FROM (
            SELECT o2.buyer_email
            FROM orders o2
            WHERE o2.project_id = c.project_id
              AND o2.status = 'approved'
            GROUP BY o2.buyer_email, o2.project_id
            HAVING COUNT(DISTINCT o2.id) >= 2
          ) AS repeat_customers
        ) / COUNT(DISTINCT CASE WHEN o.id IS NOT NULL THEN c.id END)
      ) * 100, 
      1
    )
    ELSE 0
  END AS repeat_rate_percent

FROM crm_contacts c
LEFT JOIN orders o ON 
  o.buyer_email = c.email 
  AND o.project_id = c.project_id
  AND o.status = 'approved'

GROUP BY c.project_id;