-- ============================================
-- PROMPT 2: Payment Method Exposure
-- Add payment_method and installments to orders table
-- ============================================

-- Add payment method fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_type TEXT,
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.payment_method IS 'Normalized payment method: credit_card, pix, billet, paypal, apple_pay, google_pay, wallet, unknown';
COMMENT ON COLUMN public.orders.payment_type IS 'Raw payment type from provider (e.g., CREDIT_CARD, PIX)';
COMMENT ON COLUMN public.orders.installments IS 'Number of installments (only meaningful for credit_card)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method) WHERE payment_method IS NOT NULL;