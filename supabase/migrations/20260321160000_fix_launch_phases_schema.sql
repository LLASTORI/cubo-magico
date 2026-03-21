-- Fix launch_phases schema: add columns expected by TypeScript but missing from DB.
-- These 5 columns were in the LaunchPhase interface but never added via migration,
-- causing every INSERT from the UI to fail with PostgREST 400 error.

ALTER TABLE launch_phases
  ADD COLUMN IF NOT EXISTS primary_metric text NOT NULL DEFAULT 'spend',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phase_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS campaign_name_pattern text;
