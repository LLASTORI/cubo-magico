-- Create offer_mappings table for mapping products/offers to funnels
CREATE TABLE public.offer_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_produto TEXT,
  nome_produto TEXT NOT NULL,
  nome_oferta TEXT,
  codigo_oferta TEXT,
  valor NUMERIC,
  status TEXT,
  data_ativacao DATE,
  data_desativacao DATE,
  id_funil TEXT NOT NULL,
  anotacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.offer_mappings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all offer mappings" 
ON public.offer_mappings 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can create offer mappings" 
ON public.offer_mappings 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can update offer mappings" 
ON public.offer_mappings 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can delete offer mappings" 
ON public.offer_mappings 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_offer_mappings_updated_at
BEFORE UPDATE ON public.offer_mappings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on codigo_oferta for faster lookups
CREATE INDEX idx_offer_mappings_codigo_oferta ON public.offer_mappings(codigo_oferta);

-- Create index on id_funil for filtering
CREATE INDEX idx_offer_mappings_id_funil ON public.offer_mappings(id_funil);