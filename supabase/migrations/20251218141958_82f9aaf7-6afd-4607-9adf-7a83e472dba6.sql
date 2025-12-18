-- Corrigir search_path das funções criadas
CREATE OR REPLACE FUNCTION normalize_phone_number(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  
  IF cleaned LIKE '55%' AND length(cleaned) >= 12 THEN
    RETURN cleaned;
  END IF;
  
  IF length(cleaned) >= 10 AND length(cleaned) <= 11 THEN
    RETURN '55' || cleaned;
  END IF;
  
  RETURN cleaned;
END;
$$;

CREATE OR REPLACE FUNCTION normalize_whatsapp_number_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.phone_number := normalize_phone_number(NEW.phone_number);
  RETURN NEW;
END;
$$;