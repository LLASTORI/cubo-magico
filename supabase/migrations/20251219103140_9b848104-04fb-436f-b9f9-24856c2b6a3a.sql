-- Add unique constraint on transaction_id for hotmart_sales
-- This is required for ON CONFLICT upsert to work correctly
ALTER TABLE public.hotmart_sales 
ADD CONSTRAINT hotmart_sales_transaction_id_unique UNIQUE (transaction_id);