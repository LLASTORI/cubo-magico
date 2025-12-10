-- Add funnel_type column to funnels table
-- Types: 'perpetuo' (Cubo Mágico), 'lancamento' (Lançamentos), 'indefinido' (A Definir)

ALTER TABLE public.funnels 
ADD COLUMN funnel_type text NOT NULL DEFAULT 'perpetuo';

-- Add check constraint for valid funnel types
ALTER TABLE public.funnels 
ADD CONSTRAINT funnels_type_check CHECK (funnel_type IN ('perpetuo', 'lancamento', 'indefinido'));

-- Update existing "A Definir" funnels to 'indefinido' type
UPDATE public.funnels 
SET funnel_type = 'indefinido' 
WHERE LOWER(name) LIKE '%a definir%' OR LOWER(name) LIKE '%indefinido%';

-- Create index for filtering by funnel_type
CREATE INDEX idx_funnels_type ON public.funnels(funnel_type);

-- Add comment for documentation
COMMENT ON COLUMN public.funnels.funnel_type IS 'Tipo do funil: perpetuo (Cubo Mágico), lancamento (Campanhas pontuais), indefinido (A Definir)';