-- Platform-level settings (global, not per-project)
-- Used for: OpenAI API key and other platform-wide credentials managed by super admin

CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,            -- plaintext input, cleared by trigger
  setting_value_encrypted TEXT,  -- encrypted storage
  is_configured BOOLEAN DEFAULT false,
  is_validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can read/write platform settings
CREATE POLICY "super_admin_all_platform_settings"
  ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Trigger function: auto-encrypt setting_value on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_platform_setting()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.setting_value IS NOT NULL AND NEW.setting_value != ''
     AND NOT NEW.setting_value LIKE 'ENC:%' THEN
    NEW.setting_value_encrypted := public.encrypt_sensitive(NEW.setting_value);
    NEW.setting_value := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER encrypt_platform_setting_trigger
  BEFORE INSERT OR UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_platform_setting();

-- RPC: read decrypted value — callable only by service_role
CREATE OR REPLACE FUNCTION public.get_platform_setting_internal(p_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value text;
BEGIN
  SELECT public.decrypt_sensitive(setting_value_encrypted)
  INTO v_value
  FROM public.platform_settings
  WHERE setting_key = p_key;

  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_setting_internal(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_platform_setting_internal(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_platform_setting_internal(text) FROM authenticated;
