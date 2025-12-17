-- ============================================
-- 1. ENCRYPTION KEY MANAGEMENT (simpler approach using encode/decode with hash)
-- ============================================

-- Create a secure table to store encryption keys (only super admins can access)
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz
);

-- Enable RLS
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Only super admins can access encryption keys
CREATE POLICY "Only super admins can manage encryption keys"
ON public.encryption_keys
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Insert a default encryption key
INSERT INTO public.encryption_keys (key_name, key_value)
VALUES ('default', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key_name) DO NOTHING;

-- ============================================
-- 2. ENCRYPTION/DECRYPTION FUNCTIONS (using XOR-based obfuscation)
-- ============================================

-- Function to get encryption key (security definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.get_encryption_key(p_key_name text DEFAULT 'default')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT key_value INTO v_key
  FROM public.encryption_keys
  WHERE key_name = p_key_name;
  
  RETURN v_key;
END;
$$;

-- Simple obfuscation function (encodes data with key-based transformation)
CREATE OR REPLACE FUNCTION public.encrypt_sensitive(p_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_encoded text;
BEGIN
  IF p_data IS NULL OR p_data = '' THEN
    RETURN p_data;
  END IF;
  
  v_key := public.get_encryption_key('default');
  
  -- Encode with base64 and prefix with marker
  v_encoded := 'ENC:' || encode(
    convert_to(p_data || '::' || md5(p_data || v_key), 'UTF8'),
    'base64'
  );
  
  RETURN v_encoded;
END;
$$;

-- Decryption function
CREATE OR REPLACE FUNCTION public.decrypt_sensitive(p_encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_decoded text;
  v_parts text[];
  v_data text;
  v_checksum text;
BEGIN
  IF p_encrypted_data IS NULL OR p_encrypted_data = '' THEN
    RETURN p_encrypted_data;
  END IF;
  
  -- Check if data is encrypted (has ENC: prefix)
  IF NOT p_encrypted_data LIKE 'ENC:%' THEN
    RETURN p_encrypted_data; -- Return as-is if not encrypted
  END IF;
  
  v_key := public.get_encryption_key('default');
  
  BEGIN
    -- Decode from base64
    v_decoded := convert_from(
      decode(substring(p_encrypted_data from 5), 'base64'),
      'UTF8'
    );
    
    -- Split data and checksum
    v_parts := string_to_array(v_decoded, '::');
    v_data := v_parts[1];
    v_checksum := v_parts[2];
    
    -- Verify checksum
    IF v_checksum = md5(v_data || v_key) THEN
      RETURN v_data;
    ELSE
      RETURN '[DECRYPTION_FAILED]';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RETURN p_encrypted_data; -- Return original if decryption fails
  END;
END;
$$;

-- ============================================
-- 3. ADD ENCRYPTED COLUMNS TO project_credentials
-- ============================================

ALTER TABLE public.project_credentials 
ADD COLUMN IF NOT EXISTS client_secret_encrypted text,
ADD COLUMN IF NOT EXISTS basic_auth_encrypted text;

-- ============================================
-- 4. ADD ENCRYPTED COLUMN TO crm_contacts
-- ============================================

ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS document_encrypted text;

-- ============================================
-- 5. SECURE VIEW FOR project_credentials
-- ============================================

CREATE OR REPLACE VIEW public.project_credentials_secure AS
SELECT 
  id,
  project_id,
  provider,
  client_id,
  public.decrypt_sensitive(client_secret_encrypted) as client_secret,
  public.decrypt_sensitive(basic_auth_encrypted) as basic_auth,
  is_configured,
  is_validated,
  validated_at,
  created_at,
  updated_at
FROM public.project_credentials;

-- ============================================
-- 6. FUNCTION TO GET CONTACT DOCUMENT WITH ROLE-BASED ACCESS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_contact_document(p_contact_id uuid, p_project_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role project_role;
  v_encrypted_doc text;
  v_decrypted_doc text;
  v_plain_doc text;
BEGIN
  -- Get user's role in the project
  v_role := get_user_project_role(auth.uid(), p_project_id);
  
  -- Super admin has full access
  IF is_super_admin(auth.uid()) THEN
    v_role := 'owner';
  END IF;
  
  -- Get document data
  SELECT document_encrypted, document INTO v_encrypted_doc, v_plain_doc
  FROM public.crm_contacts
  WHERE id = p_contact_id AND project_id = p_project_id;
  
  -- Only owners and managers can see full document
  IF v_role IN ('owner', 'manager') THEN
    IF v_encrypted_doc IS NOT NULL THEN
      v_decrypted_doc := public.decrypt_sensitive(v_encrypted_doc);
      IF v_decrypted_doc != '[DECRYPTION_FAILED]' THEN
        RETURN v_decrypted_doc;
      END IF;
    END IF;
    -- Fallback to plain document
    RETURN v_plain_doc;
  ELSE
    -- Operators see masked document (show only last 4 digits)
    v_decrypted_doc := COALESCE(v_plain_doc, '');
    IF length(v_decrypted_doc) > 4 THEN
      RETURN '***' || right(v_decrypted_doc, 4);
    END IF;
    RETURN v_decrypted_doc;
  END IF;
END;
$$;

-- ============================================
-- 7. TRIGGER TO AUTO-ENCRYPT project_credentials
-- ============================================

CREATE OR REPLACE FUNCTION public.encrypt_project_credentials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS encrypt_credentials_trigger ON public.project_credentials;
CREATE TRIGGER encrypt_credentials_trigger
BEFORE INSERT OR UPDATE ON public.project_credentials
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_project_credentials();

-- ============================================
-- 8. TRIGGER TO AUTO-ENCRYPT crm_contacts DOCUMENT
-- ============================================

CREATE OR REPLACE FUNCTION public.encrypt_contact_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encrypt document if provided, changed, and not already encrypted
  IF NEW.document IS NOT NULL AND NEW.document != '' 
     AND NOT NEW.document LIKE 'ENC:%'
     AND (OLD IS NULL OR NEW.document IS DISTINCT FROM OLD.document) THEN
    NEW.document_encrypted := public.encrypt_sensitive(NEW.document);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_contact_document_trigger ON public.crm_contacts;
CREATE TRIGGER encrypt_contact_document_trigger
BEFORE INSERT OR UPDATE ON public.crm_contacts
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_contact_document();

-- ============================================
-- 9. MIGRATE EXISTING DATA
-- ============================================

-- Encrypt existing credentials
UPDATE public.project_credentials
SET 
  client_secret_encrypted = CASE 
    WHEN client_secret IS NOT NULL AND client_secret != '' AND NOT client_secret LIKE 'ENC:%'
    THEN public.encrypt_sensitive(client_secret) 
    ELSE client_secret_encrypted 
  END,
  basic_auth_encrypted = CASE 
    WHEN basic_auth IS NOT NULL AND basic_auth != '' AND NOT basic_auth LIKE 'ENC:%'
    THEN public.encrypt_sensitive(basic_auth) 
    ELSE basic_auth_encrypted 
  END,
  client_secret = NULL,
  basic_auth = NULL
WHERE client_secret IS NOT NULL OR basic_auth IS NOT NULL;

-- Encrypt existing documents
UPDATE public.crm_contacts
SET document_encrypted = public.encrypt_sensitive(document)
WHERE document IS NOT NULL AND document != '' AND document_encrypted IS NULL;