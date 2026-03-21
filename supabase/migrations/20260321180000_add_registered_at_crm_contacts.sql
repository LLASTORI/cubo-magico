-- Add registered_at to crm_contacts.
-- Represents the real date the lead signed up on the landing page.
-- Different from created_at (when the record entered the Cubo system).
-- NULL = signup date unknown. No backfill — historical data without a reliable
-- date should remain NULL. Populated by: capture webhook, CSV import, or manually.

ALTER TABLE crm_contacts
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

COMMENT ON COLUMN crm_contacts.registered_at IS
  'Data real de cadastro do lead na landing page. Diferente de created_at (entrada no Cubo).
   Populado por: webhook de captura, CSV import com coluna de data, ou manualmente.
   NULL = data de cadastro desconhecida.';
