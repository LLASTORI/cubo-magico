ALTER TABLE launch_phases
  ADD COLUMN IF NOT EXISTS edition_id uuid REFERENCES launch_editions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_launch_phases_edition_id
  ON launch_phases(edition_id);

COMMENT ON COLUMN launch_phases.edition_id IS
  'Edição à qual esta fase pertence. NULL = fase não associada a uma edição específica
   (compatibilidade com fases criadas antes do conceito de edições).';
