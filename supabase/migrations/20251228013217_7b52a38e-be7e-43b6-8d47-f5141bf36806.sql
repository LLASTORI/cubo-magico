-- Add currency support to offer_mappings table
ALTER TABLE public.offer_mappings 
ADD COLUMN IF NOT EXISTS moeda text DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS valor_original numeric;

-- Add comment for clarity
COMMENT ON COLUMN public.offer_mappings.moeda IS 'Original currency code (BRL, USD, EUR, etc.)';
COMMENT ON COLUMN public.offer_mappings.valor_original IS 'Price in original currency';
COMMENT ON COLUMN public.offer_mappings.valor IS 'Price converted to BRL for calculations';