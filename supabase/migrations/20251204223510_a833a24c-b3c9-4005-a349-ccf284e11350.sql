-- Add unique constraint for upsert to work
ALTER TABLE public.hotmart_sales 
ADD CONSTRAINT hotmart_sales_project_transaction_unique 
UNIQUE (project_id, transaction_id);