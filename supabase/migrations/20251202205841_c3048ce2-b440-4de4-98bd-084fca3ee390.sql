-- Add column for the visual/numeric product ID (format: "ID 5242364")
ALTER TABLE public.offer_mappings 
ADD COLUMN id_produto_visual text;

-- Add comment explaining the two ID fields
COMMENT ON COLUMN public.offer_mappings.id_produto IS 'UUID do produto na Hotmart (ucode) - usado para chamadas de API';
COMMENT ON COLUMN public.offer_mappings.id_produto_visual IS 'ID visual do produto na Hotmart (formato "ID 5242364") - para exibição';