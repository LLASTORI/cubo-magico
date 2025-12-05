-- Add column to store the exchange rate used at the time of sync
ALTER TABLE public.hotmart_sales 
ADD COLUMN IF NOT EXISTS exchange_rate_used numeric DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.hotmart_sales.exchange_rate_used IS 'Exchange rate used to convert from original currency to BRL at the time of sync';