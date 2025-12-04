
-- Adicionar coluna para valor convertido em BRL
ALTER TABLE public.hotmart_sales 
ADD COLUMN IF NOT EXISTS total_price_brl numeric;

-- Atualizar valores existentes com taxas fixas aproximadas (dez/2024)
UPDATE public.hotmart_sales SET total_price_brl = 
  CASE offer_currency
    WHEN 'BRL' THEN total_price
    WHEN 'USD' THEN total_price * 6.00
    WHEN 'EUR' THEN total_price * 6.40
    WHEN 'GBP' THEN total_price * 7.60
    WHEN 'PYG' THEN total_price * 0.0008
    WHEN 'UYU' THEN total_price * 0.14
    WHEN 'AUD' THEN total_price * 3.90
    WHEN 'CHF' THEN total_price * 6.80
    ELSE total_price -- fallback para BRL se moeda desconhecida
  END
WHERE total_price IS NOT NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_currency ON public.hotmart_sales(offer_currency);
