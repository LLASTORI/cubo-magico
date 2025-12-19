-- Add default_funnel_id column to crm_webhook_keys table
ALTER TABLE public.crm_webhook_keys 
ADD COLUMN IF NOT EXISTS default_funnel_id uuid REFERENCES public.funnels(id) ON DELETE SET NULL;