-- Adiciona phase_id em offer_mappings para vincular oferta a uma fase específica de uma edição
ALTER TABLE offer_mappings
  ADD COLUMN IF NOT EXISTS phase_id uuid REFERENCES launch_phases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offer_mappings_phase_id
  ON offer_mappings(phase_id)
  WHERE phase_id IS NOT NULL;

COMMENT ON COLUMN offer_mappings.phase_id IS
  'Fase do lançamento pago à qual esta oferta pertence. NULL = sem vínculo de fase.
   Usado em lançamentos pagos recorrentes para vincular ingressos/OBs às fases corretas da edição.';
