-- Recalcular total_purchases e total_revenue para todos os contatos
-- baseado nas transações reais em crm_transactions

WITH calculated_stats AS (
  SELECT 
    contact_id,
    COUNT(*) FILTER (WHERE status IN ('APPROVED', 'COMPLETE')) as real_purchases,
    COALESCE(SUM(CASE WHEN status IN ('APPROVED', 'COMPLETE') THEN COALESCE(total_price_brl, total_price, 0) ELSE 0 END), 0) as real_revenue
  FROM crm_transactions
  GROUP BY contact_id
)
UPDATE crm_contacts c
SET 
  total_purchases = COALESCE(cs.real_purchases, 0),
  total_revenue = COALESCE(cs.real_revenue, 0),
  updated_at = now()
FROM calculated_stats cs
WHERE c.id = cs.contact_id
AND (c.total_purchases != cs.real_purchases OR c.total_revenue != cs.real_revenue);