-- Encripta client_id em project_credentials
--
-- Contexto: basic_auth e client_secret já estão encriptados desde a migração 20251217195149.
-- client_id é o único campo sensível ainda em texto puro (6 rows em produção).
-- client_id está dentro de basic_auth (Base64(client_id:client_secret)), por isso
-- é importante encriptar para consistência de segurança.
--
-- Impacto: frontend passa a usar is_configured/is_validated para checks de presença;
-- get_project_credentials_internal retorna client_id descriptografado via decrypt_sensitive().

-- 1. Adiciona coluna client_id_encrypted (idempotente)
ALTER TABLE public.project_credentials
  ADD COLUMN IF NOT EXISTS client_id_encrypted text;

-- 2. Atualiza trigger para encriptar client_id também
CREATE OR REPLACE FUNCTION public.encrypt_project_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Encrypt client_id if provided and not already encrypted
  IF NEW.client_id IS NOT NULL AND NEW.client_id != '' AND NOT NEW.client_id LIKE 'ENC:%' THEN
    NEW.client_id_encrypted := public.encrypt_sensitive(NEW.client_id);
    NEW.client_id := NULL; -- Clear plaintext
  END IF;

  -- Encrypt client_secret if provided and not already encrypted
  IF NEW.client_secret IS NOT NULL AND NEW.client_secret != '' AND NOT NEW.client_secret LIKE 'ENC:%' THEN
    NEW.client_secret_encrypted := public.encrypt_sensitive(NEW.client_secret);
    NEW.client_secret := NULL; -- Clear plaintext
  END IF;

  -- Encrypt basic_auth if provided and not already encrypted
  IF NEW.basic_auth IS NOT NULL AND NEW.basic_auth != '' AND NOT NEW.basic_auth LIKE 'ENC:%' THEN
    NEW.basic_auth_encrypted := public.encrypt_sensitive(NEW.basic_auth);
    NEW.basic_auth := NULL; -- Clear plaintext
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Backfill: encripta client_id existente e limpa texto puro
UPDATE public.project_credentials
SET
  client_id_encrypted = CASE
    WHEN client_id IS NOT NULL AND client_id != '' AND NOT client_id LIKE 'ENC:%'
    THEN public.encrypt_sensitive(client_id)
    ELSE client_id_encrypted
  END,
  client_id = NULL
WHERE client_id IS NOT NULL AND client_id != '';

-- 4. Atualiza get_project_credentials_internal para descriptografar client_id_encrypted
CREATE OR REPLACE FUNCTION public.get_project_credentials_internal(p_project_id uuid)
RETURNS TABLE(
  id uuid,
  project_id uuid,
  provider text,
  client_id text,
  client_secret text,
  basic_auth text,
  is_configured boolean,
  is_validated boolean,
  validated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.project_id,
    pc.provider,
    public.decrypt_sensitive(pc.client_id_encrypted) as client_id,
    public.decrypt_sensitive(pc.client_secret_encrypted) as client_secret,
    public.decrypt_sensitive(pc.basic_auth_encrypted) as basic_auth,
    pc.is_configured,
    pc.is_validated,
    pc.validated_at,
    pc.created_at,
    pc.updated_at
  FROM public.project_credentials pc
  WHERE pc.project_id = p_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_project_credentials_internal(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_project_credentials_internal(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_project_credentials_internal(uuid) FROM authenticated;
