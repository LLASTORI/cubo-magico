-- Criar função para atualizar dados financeiros do contato
CREATE OR REPLACE FUNCTION update_contact_financial_data()
RETURNS TRIGGER AS $$
DECLARE
  approved_statuses TEXT[] := ARRAY['COMPLETE', 'APPROVED'];
  total_count INTEGER;
  total_rev NUMERIC;
  first_date TIMESTAMPTZ;
  last_date TIMESTAMPTZ;
BEGIN
  -- Calcular totais baseados em transações aprovadas
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_price_brl), 0),
    MIN(transaction_date),
    MAX(transaction_date)
  INTO total_count, total_rev, first_date, last_date
  FROM crm_transactions
  WHERE contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
    AND status = ANY(approved_statuses);

  -- Atualizar o contato com os dados financeiros
  UPDATE crm_contacts
  SET 
    total_purchases = total_count,
    total_revenue = total_rev,
    first_purchase_at = first_date,
    last_purchase_at = last_date,
    status = CASE WHEN total_count > 0 THEN 'customer' ELSE status END,
    updated_at = now()
  WHERE id = COALESCE(NEW.contact_id, OLD.contact_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para INSERT/UPDATE/DELETE em crm_transactions
DROP TRIGGER IF EXISTS trigger_update_contact_financial ON crm_transactions;
CREATE TRIGGER trigger_update_contact_financial
  AFTER INSERT OR UPDATE OR DELETE ON crm_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_financial_data();

-- Atualizar todos os contatos existentes com dados financeiros corretos
UPDATE crm_contacts c
SET 
  total_purchases = COALESCE(stats.total_count, 0),
  total_revenue = COALESCE(stats.total_rev, 0),
  first_purchase_at = stats.first_date,
  last_purchase_at = stats.last_date,
  status = CASE WHEN COALESCE(stats.total_count, 0) > 0 THEN 'customer' ELSE c.status END,
  updated_at = now()
FROM (
  SELECT 
    contact_id,
    COUNT(*) as total_count,
    SUM(total_price_brl) as total_rev,
    MIN(transaction_date) as first_date,
    MAX(transaction_date) as last_date
  FROM crm_transactions
  WHERE status IN ('COMPLETE', 'APPROVED')
  GROUP BY contact_id
) stats
WHERE c.id = stats.contact_id;