-- Adiciona last_synced_at em social_listening_pages
-- O edge function social-comments-api já tenta atualizar este campo ao final do sync,
-- mas a coluna nunca existia — causando "Última sincronização: Nunca" no frontend.

ALTER TABLE social_listening_pages
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
