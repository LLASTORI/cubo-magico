-- Adiciona campos de perfil demográfico ao CRM
-- Usados no sync de Meta Custom Audiences (GEN + DOBY/DOBM/DOBD)
-- Fontes esperadas: quizzes internos, Hotmart webhook/CSV, surveys, integração manual

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('m', 'f')),
  ADD COLUMN IF NOT EXISTS birth_date date;

COMMENT ON COLUMN public.crm_contacts.gender IS 'Gênero no formato Meta: m ou f';
COMMENT ON COLUMN public.crm_contacts.birth_date IS 'Data de nascimento — usada para DOBY/DOBM/DOBD no sync Meta Audiences';
