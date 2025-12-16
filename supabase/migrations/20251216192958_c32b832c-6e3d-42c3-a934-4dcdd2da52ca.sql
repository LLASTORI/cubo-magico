-- Add phone_country_code column to crm_contacts
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT '55';

-- Add a computed/derived full phone field for convenience (stored as E.164 format)
-- This will help with WhatsApp integration and international calls
COMMENT ON COLUMN public.crm_contacts.phone_country_code IS 'Country calling code without + sign (e.g., 55 for Brazil, 1 for USA)';

-- Update hotmart_sales to also have country code
ALTER TABLE public.hotmart_sales
ADD COLUMN IF NOT EXISTS buyer_phone_country_code text DEFAULT '55';