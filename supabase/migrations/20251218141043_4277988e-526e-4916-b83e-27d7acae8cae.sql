-- Adicionar constraint de unicidade para phone_number na tabela whatsapp_numbers
-- Isso garante que um número de WhatsApp Business só pode estar em um projeto por vez

-- Primeiro verificar se já existe algum duplicado
DO $$
BEGIN
  IF EXISTS (
    SELECT phone_number, COUNT(*) 
    FROM whatsapp_numbers 
    GROUP BY phone_number 
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existem números duplicados na tabela. Remova os duplicados antes de adicionar a constraint.';
  END IF;
END $$;

-- Adicionar constraint de unicidade
ALTER TABLE whatsapp_numbers
ADD CONSTRAINT whatsapp_numbers_phone_number_unique UNIQUE (phone_number);

-- Adicionar comentário explicativo
COMMENT ON CONSTRAINT whatsapp_numbers_phone_number_unique ON whatsapp_numbers IS 
'Garante que cada número de WhatsApp Business só pode estar vinculado a um projeto por vez. Para usar o mesmo número em outro projeto, primeiro remova-o do projeto atual.';