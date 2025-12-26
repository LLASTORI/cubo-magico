-- Fase 0: Adicionar campos first_name e last_name para normalização de nomes

-- 1. Adicionar novos campos
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- 2. Migrar dados existentes (separar pelo primeiro espaço)
UPDATE public.crm_contacts
SET 
  first_name = TRIM(SPLIT_PART(COALESCE(name, ''), ' ', 1)),
  last_name = TRIM(
    CASE 
      WHEN POSITION(' ' IN COALESCE(name, '')) > 0 
      THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
      ELSE ''
    END
  )
WHERE name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);

-- 3. Criar função para extrair first_name e last_name automaticamente
CREATE OR REPLACE FUNCTION public.extract_name_parts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se first_name não foi fornecido mas name sim, extrair do name
  IF NEW.first_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.first_name := TRIM(SPLIT_PART(NEW.name, ' ', 1));
  END IF;
  
  -- Se last_name não foi fornecido mas name sim, extrair do name
  IF NEW.last_name IS NULL AND NEW.name IS NOT NULL AND POSITION(' ' IN NEW.name) > 0 THEN
    NEW.last_name := TRIM(SUBSTRING(NEW.name FROM POSITION(' ' IN NEW.name) + 1));
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Criar trigger para extrair automaticamente em INSERT/UPDATE
DROP TRIGGER IF EXISTS extract_contact_name_parts ON public.crm_contacts;
CREATE TRIGGER extract_contact_name_parts
  BEFORE INSERT OR UPDATE ON public.crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.extract_name_parts();

-- 5. Criar índices para busca por nome
CREATE INDEX IF NOT EXISTS idx_crm_contacts_first_name ON public.crm_contacts(first_name);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_name ON public.crm_contacts(last_name);