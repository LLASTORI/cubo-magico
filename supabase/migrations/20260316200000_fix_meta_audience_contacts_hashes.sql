-- Restaura colunas de hash removidas em migration anterior
-- Necessário para o sync Meta Audiences funcionar corretamente
-- Nota: removed_at foi dropada; usamos status='removed' para rastrear remoção

ALTER TABLE public.meta_audience_contacts
  ADD COLUMN IF NOT EXISTS email_hash text,
  ADD COLUMN IF NOT EXISTS phone_hash text;
