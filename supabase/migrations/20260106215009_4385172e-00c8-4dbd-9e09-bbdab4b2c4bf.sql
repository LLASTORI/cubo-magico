-- Adicionar campo para rastrear origem do signup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_source text;

-- Adicionar campo para indicar se conta foi ativada
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_activated boolean DEFAULT false;

-- Marcar usuários existentes como legacy e ativados
UPDATE profiles SET signup_source = 'legacy', account_activated = true WHERE signup_source IS NULL;

-- Criar índice para consultas de acesso
CREATE INDEX IF NOT EXISTS idx_profiles_account_activated ON profiles(account_activated);
CREATE INDEX IF NOT EXISTS idx_profiles_signup_source ON profiles(signup_source);