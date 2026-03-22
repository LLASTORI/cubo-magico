CREATE TABLE launch_editions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id       uuid NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            text NOT NULL,
  edition_number  integer NOT NULL DEFAULT 1,
  event_date      date,
  start_date      date,
  end_date        date,
  status          text NOT NULL DEFAULT 'planned'
                  CHECK (status IN ('planned', 'active', 'finished')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_editions_funnel_id ON launch_editions(funnel_id);
CREATE INDEX idx_launch_editions_project_id ON launch_editions(project_id);
CREATE UNIQUE INDEX idx_launch_editions_number
  ON launch_editions(funnel_id, edition_number);

ALTER TABLE launch_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "launch_editions_project_access" ON launch_editions
  FOR ALL USING (
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER set_launch_editions_updated_at
  BEFORE UPDATE ON launch_editions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE launch_editions IS
  'Edições (turmas) de um lançamento pago recorrente.
   Um funil de lançamento pago pode ter múltiplas edições ao longo do tempo,
   cada uma com suas próprias datas, fases e métricas.
   Intervalo entre edições é variável — definido pelo usuário.';

COMMENT ON COLUMN launch_editions.edition_number IS
  'Número sequencial da edição dentro do funil. Gerado automaticamente.';

COMMENT ON COLUMN launch_editions.event_date IS
  'Data do evento/pitch ao vivo. Define o fim da fase de ingressos.';
