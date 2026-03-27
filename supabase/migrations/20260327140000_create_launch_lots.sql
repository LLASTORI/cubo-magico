-- Sistema de Lotes para Lançamento Pago
-- Cada lote representa um período de preço dentro de uma edição.
-- Ofertas (FRONT + OBs) são vinculadas a lotes via tabela de junção.

-- Tabela principal de lotes
CREATE TABLE launch_lots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id      uuid NOT NULL REFERENCES launch_editions(id) ON DELETE CASCADE,
  funnel_id       uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  lot_number      integer NOT NULL DEFAULT 1,
  name            text NOT NULL,
  start_datetime  timestamptz NOT NULL,
  end_datetime    timestamptz,
  status          text NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'active', 'finished')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_lots_edition_id ON launch_lots(edition_id);
CREATE INDEX idx_launch_lots_funnel_id ON launch_lots(funnel_id);
CREATE INDEX idx_launch_lots_project_id ON launch_lots(project_id);
CREATE UNIQUE INDEX idx_launch_lots_number
  ON launch_lots(edition_id, lot_number);

ALTER TABLE launch_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_lots_project_access" ON launch_lots
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER set_launch_lots_updated_at
  BEFORE UPDATE ON launch_lots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE launch_lots IS
  'Lotes de preço dentro de uma edição de lançamento pago.
   Cada lote tem um período (start_datetime/end_datetime) e ofertas vinculadas.
   A virada de lote acontece por data/hora. Ofertas (FRONT e OBs) podem
   ser diferentes entre lotes.';

COMMENT ON COLUMN launch_lots.start_datetime IS
  'Momento exato de abertura do lote (com timezone). Lotes podem virar no meio do dia.';

COMMENT ON COLUMN launch_lots.end_datetime IS
  'Momento de fechamento do lote. NULL = lote ainda aberto.';

-- Tabela de junção: ofertas vinculadas a cada lote
CREATE TABLE launch_lot_offers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id            uuid NOT NULL REFERENCES launch_lots(id) ON DELETE CASCADE,
  offer_mapping_id  uuid NOT NULL REFERENCES offer_mappings(id) ON DELETE CASCADE,
  role              text NOT NULL DEFAULT 'front'
                    CHECK (role IN ('front', 'bump', 'upsell', 'downsell')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_launch_lot_offers_unique
  ON launch_lot_offers(lot_id, offer_mapping_id);
CREATE INDEX idx_launch_lot_offers_lot_id ON launch_lot_offers(lot_id);

ALTER TABLE launch_lot_offers ENABLE ROW LEVEL SECURITY;

-- RLS via join com launch_lots (que já tem project_id checado)
CREATE POLICY "launch_lot_offers_project_access" ON launch_lot_offers
  FOR ALL USING (
    lot_id IN (
      SELECT ll.id FROM launch_lots ll
      WHERE ll.project_id IN (
        SELECT project_id FROM project_members
        WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE launch_lot_offers IS
  'Ofertas vinculadas a um lote. Relação N:N — a mesma oferta pode estar
   em múltiplos lotes (ex: OBs que permanecem em todos os lotes).
   O campo role é independente de offer_mappings.tipo_posicao — permite
   que uma oferta tenha papel diferente em lotes diferentes.';

-- Atualizar delete_funnel_safe para incluir launch_lots e launch_lot_offers
CREATE OR REPLACE FUNCTION public.delete_funnel_safe(p_funnel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_owner uuid;
BEGIN
  IF p_funnel_id IS NULL THEN
    RAISE EXCEPTION 'p_funnel_id is required';
  END IF;

  SELECT p.user_id
  INTO v_project_owner
  FROM public.funnels f
  JOIN public.projects p ON p.id = f.project_id
  WHERE f.id = p_funnel_id;

  IF v_project_owner IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Funnel não encontrado';
  END IF;

  IF v_project_owner <> auth.uid() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem permissão para excluir este funil';
  END IF;

  UPDATE public.offer_mappings
  SET phase_id = NULL
  WHERE phase_id IN (
    SELECT id FROM public.launch_phases WHERE funnel_id = p_funnel_id
  );

  DELETE FROM public.phase_campaigns
  WHERE phase_id IN (
    SELECT id FROM public.launch_phases WHERE funnel_id = p_funnel_id
  );

  DELETE FROM public.launch_lot_offers
  WHERE lot_id IN (
    SELECT id FROM public.launch_lots WHERE funnel_id = p_funnel_id
  );

  DELETE FROM public.launch_lots
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.launch_phases
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.launch_editions
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.launch_products
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.funnel_meta_accounts
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.funnel_changes
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.funnel_experiments
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.funnel_score_history
  WHERE funnel_id = p_funnel_id;

  UPDATE public.offer_mappings
  SET funnel_id = NULL,
      id_funil = 'A Definir',
      updated_at = now()
  WHERE funnel_id = p_funnel_id;

  DELETE FROM public.funnels
  WHERE id = p_funnel_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_funnel_safe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_funnel_safe(uuid) TO authenticated;
