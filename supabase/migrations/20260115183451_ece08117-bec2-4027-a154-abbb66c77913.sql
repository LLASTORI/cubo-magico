-- PROMPT 6: Add attribution JSONB column to finance_ledger for UTM storage
ALTER TABLE public.finance_ledger
  ADD COLUMN IF NOT EXISTS attribution jsonb NOT NULL DEFAULT '{}'::jsonb;