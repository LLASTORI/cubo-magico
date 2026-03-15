-- Adiciona campo offers_synced_at em project_credentials
-- Registra quando as ofertas Hotmart foram sincronizadas pela última vez (via cron semanal)
ALTER TABLE public.project_credentials
  ADD COLUMN IF NOT EXISTS offers_synced_at timestamptz;
