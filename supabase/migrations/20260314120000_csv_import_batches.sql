-- Tabela de controle de importações CSV
CREATE TABLE IF NOT EXISTS csv_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'importing'
    CHECK (status IN ('importing', 'active', 'reverted')),
  total_created INT NOT NULL DEFAULT 0,
  total_complemented INT NOT NULL DEFAULT 0,
  total_skipped INT NOT NULL DEFAULT 0,
  total_errors INT NOT NULL DEFAULT 0,
  total_revenue_brl NUMERIC NOT NULL DEFAULT 0,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_csv_import_batches_project
  ON csv_import_batches(project_id, created_at DESC);

-- Índice expressional para queries de revert por batch_id em ledger_events
CREATE INDEX IF NOT EXISTS idx_ledger_events_batch_id
  ON ledger_events ((raw_payload->>'batch_id'))
  WHERE raw_payload ? 'batch_id';

-- RLS
ALTER TABLE csv_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select" ON csv_import_batches
  FOR SELECT USING (
    is_super_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = csv_import_batches.project_id
        AND user_id = auth.uid()
    )
  );

-- Função atômica de revert (SECURITY DEFINER — bypassa RLS intencionalmente,
-- pois a validação de ownership e role é feita pela edge function antes de chamar)
CREATE OR REPLACE FUNCTION revert_csv_import_batch(
  p_batch_id UUID,
  p_project_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_ids UUID[];
  v_deleted_ledger INT;
  v_deleted_orders INT;
BEGIN
  -- 1. Validar que batch existe, pertence ao projeto e está active
  IF NOT EXISTS (
    SELECT 1 FROM csv_import_batches
    WHERE id = p_batch_id
      AND project_id = p_project_id
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'batch_not_found_or_not_active';
  END IF;

  -- 2. Coletar order_ids associados ao batch
  SELECT ARRAY_AGG(DISTINCT order_id) INTO v_order_ids
  FROM ledger_events
  WHERE raw_payload->>'batch_id' = p_batch_id::TEXT
    AND project_id = p_project_id;

  -- 3. Deletar ledger_events do batch
  DELETE FROM ledger_events
  WHERE raw_payload->>'batch_id' = p_batch_id::TEXT
    AND project_id = p_project_id;
  GET DIAGNOSTICS v_deleted_ledger = ROW_COUNT;

  -- 4. Deletar order_items de orders que não têm mais ledger não-CSV
  --    (NÃO usa provider_event_log — não tem coluna order_id)
  DELETE FROM order_items
  WHERE order_id = ANY(v_order_ids)
    AND NOT EXISTS (
      SELECT 1 FROM ledger_events le
      WHERE le.order_id = order_items.order_id
        AND le.source_origin != 'csv'
    );

  -- 5. Deletar orders órfãos (sem ledger não-CSV remanescente)
  DELETE FROM orders
  WHERE id = ANY(v_order_ids)
    AND NOT EXISTS (
      SELECT 1 FROM ledger_events le
      WHERE le.order_id = orders.id
        AND le.source_origin != 'csv'
    );
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;

  -- 6. Marcar batch como revertido
  UPDATE csv_import_batches
  SET status = 'reverted', reverted_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object(
    'deleted_ledger_events', v_deleted_ledger,
    'deleted_orders', v_deleted_orders
  );
END;
$$;
