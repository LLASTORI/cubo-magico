-- AJUSTE ESTRUTURAL: Índice único para idempotência do ledger
-- provider_event_id = {transaction_id}_{event_type}_{actor}

-- Verificar e remover duplicados antes de criar constraint
DELETE FROM ledger_events a
USING ledger_events b
WHERE a.id > b.id 
  AND a.provider_event_id = b.provider_event_id
  AND a.provider_event_id IS NOT NULL;

-- Remover índice não-único existente
DROP INDEX IF EXISTS idx_ledger_events_provider_event_id;

-- Criar índice único para garantir idempotência
CREATE UNIQUE INDEX idx_ledger_events_provider_event_id_unique 
ON ledger_events(provider_event_id) 
WHERE provider_event_id IS NOT NULL;