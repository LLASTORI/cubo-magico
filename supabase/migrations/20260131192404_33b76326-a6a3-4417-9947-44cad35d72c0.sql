-- Add producer_net_brl column to orders table
-- This field stores the BRL-converted value of producer_net for international orders
-- Source: Hotmart webhook data.commissions[PRODUCER].currency_conversion.converted_value

ALTER TABLE public.orders
ADD COLUMN producer_net_brl NUMERIC(12,2);

-- Add comment explaining the semantic difference
COMMENT ON COLUMN public.orders.producer_net_brl IS 'Producer net value in BRL (liquidation currency). For international orders, this is the currency_conversion.converted_value from Hotmart. For BRL orders, same as producer_net.';