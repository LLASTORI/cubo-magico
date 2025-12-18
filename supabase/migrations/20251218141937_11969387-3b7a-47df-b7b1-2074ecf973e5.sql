-- Primeiro, remover a constraint existente
ALTER TABLE whatsapp_numbers DROP CONSTRAINT IF EXISTS whatsapp_numbers_phone_number_unique;

-- Criar função para normalizar número de telefone
CREATE OR REPLACE FUNCTION normalize_phone_number(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  -- Remove todos os caracteres não numéricos
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Se começar com 55 e tiver mais de 11 dígitos, já está normalizado
  IF cleaned LIKE '55%' AND length(cleaned) >= 12 THEN
    RETURN cleaned;
  END IF;
  
  -- Se tiver 10-11 dígitos (DDD + número), adiciona 55
  IF length(cleaned) >= 10 AND length(cleaned) <= 11 THEN
    RETURN '55' || cleaned;
  END IF;
  
  -- Caso contrário, retorna como está
  RETURN cleaned;
END;
$$;

-- Criar trigger para normalizar antes de insert/update
CREATE OR REPLACE FUNCTION normalize_whatsapp_number_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_number := normalize_phone_number(NEW.phone_number);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_whatsapp_number ON whatsapp_numbers;
CREATE TRIGGER normalize_whatsapp_number
  BEFORE INSERT OR UPDATE ON whatsapp_numbers
  FOR EACH ROW
  EXECUTE FUNCTION normalize_whatsapp_number_trigger();

-- Atualizar números existentes para formato normalizado
UPDATE whatsapp_numbers
SET phone_number = normalize_phone_number(phone_number);

-- Agora verificar duplicados após normalização
DO $$
DECLARE
  dup_record RECORD;
BEGIN
  FOR dup_record IN
    SELECT phone_number, COUNT(*), array_agg(id) as ids
    FROM whatsapp_numbers 
    GROUP BY phone_number 
    HAVING COUNT(*) > 1
  LOOP
    -- Manter apenas o primeiro (mais antigo) e deletar os outros
    DELETE FROM whatsapp_numbers 
    WHERE id = ANY(dup_record.ids[2:]);
    
    RAISE NOTICE 'Número duplicado % - mantido o mais antigo, removidos: %', 
      dup_record.phone_number, dup_record.ids[2:];
  END LOOP;
END $$;

-- Adicionar constraint de unicidade
ALTER TABLE whatsapp_numbers
ADD CONSTRAINT whatsapp_numbers_phone_number_unique UNIQUE (phone_number);

COMMENT ON CONSTRAINT whatsapp_numbers_phone_number_unique ON whatsapp_numbers IS 
'Garante que cada número de WhatsApp Business só pode estar vinculado a um projeto por vez. Números são normalizados automaticamente para formato +55DDDNÚMERO.';