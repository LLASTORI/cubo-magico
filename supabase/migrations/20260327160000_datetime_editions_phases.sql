-- Migrar launch_editions e launch_phases de date para timestamptz
-- Padroniza com launch_lots que já usa timestamptz

-- launch_editions: date → timestamptz + rename
ALTER TABLE launch_editions
  ALTER COLUMN start_date TYPE timestamptz USING start_date::timestamptz,
  ALTER COLUMN end_date TYPE timestamptz USING end_date::timestamptz,
  ALTER COLUMN event_date TYPE timestamptz USING event_date::timestamptz;

ALTER TABLE launch_editions RENAME COLUMN start_date TO start_datetime;
ALTER TABLE launch_editions RENAME COLUMN end_date TO end_datetime;
ALTER TABLE launch_editions RENAME COLUMN event_date TO event_datetime;

-- launch_phases: date → timestamptz + rename
ALTER TABLE launch_phases
  ALTER COLUMN start_date TYPE timestamptz USING start_date::timestamptz,
  ALTER COLUMN end_date TYPE timestamptz USING end_date::timestamptz;

ALTER TABLE launch_phases RENAME COLUMN start_date TO start_datetime;
ALTER TABLE launch_phases RENAME COLUMN end_date TO end_datetime;
