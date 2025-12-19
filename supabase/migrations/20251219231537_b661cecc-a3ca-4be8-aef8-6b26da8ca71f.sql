-- Corrigir função para incluir search_path
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
  FROM public.crm_transactions
  WHERE contact_id = COALESCE(NEW.contact_id, OLD.contact_id)
    AND status = ANY(approved_statuses);

  -- Atualizar o contato com os dados financeiros
  UPDATE public.crm_contacts
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;