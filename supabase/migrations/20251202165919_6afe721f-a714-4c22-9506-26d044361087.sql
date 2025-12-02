-- Add funnel position fields to offer_mappings table
ALTER TABLE public.offer_mappings 
ADD COLUMN tipo_posicao text,
ADD COLUMN ordem_posicao integer DEFAULT 1,
ADD COLUMN nome_posicao text;

-- Add comment to explain the fields
COMMENT ON COLUMN public.offer_mappings.tipo_posicao IS 'Tipo da posição no funil: FRONT, OB, US, DS';
COMMENT ON COLUMN public.offer_mappings.ordem_posicao IS 'Ordem numérica da posição (ex: 1 para OB1, 2 para OB2)';
COMMENT ON COLUMN public.offer_mappings.nome_posicao IS 'Nome de exibição da posição (ex: FRONT, OB1, US1, DS)';