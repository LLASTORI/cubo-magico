-- Add avatar_url column to crm_contacts for caching WhatsApp profile pictures
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS avatar_url text;