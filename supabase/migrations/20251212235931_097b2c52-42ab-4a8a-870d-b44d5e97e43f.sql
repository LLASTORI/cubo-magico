-- Add page_name field to crm_contacts for tracking registration page
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS first_page_name text;

-- Add field_mappings to crm_webhook_keys for custom field mapping per key
ALTER TABLE public.crm_webhook_keys 
ADD COLUMN IF NOT EXISTS field_mappings jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.crm_contacts.first_page_name IS 'Name of the page where the contact first registered';
COMMENT ON COLUMN public.crm_webhook_keys.field_mappings IS 'Custom field mappings for this API key (source_field -> target_field)';