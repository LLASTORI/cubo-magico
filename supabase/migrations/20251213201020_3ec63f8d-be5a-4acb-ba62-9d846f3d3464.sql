-- Add Meta ID columns to crm_contact_interactions for tracking extracted campaign/adset/ad IDs
ALTER TABLE public.crm_contact_interactions 
ADD COLUMN IF NOT EXISTS meta_campaign_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_adset_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meta_ad_id text DEFAULT NULL;

-- Add index for faster lookups by meta IDs
CREATE INDEX IF NOT EXISTS idx_crm_contact_interactions_meta_campaign_id 
ON public.crm_contact_interactions(meta_campaign_id) 
WHERE meta_campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contact_interactions_meta_adset_id 
ON public.crm_contact_interactions(meta_adset_id) 
WHERE meta_adset_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contact_interactions_meta_ad_id 
ON public.crm_contact_interactions(meta_ad_id) 
WHERE meta_ad_id IS NOT NULL;

-- Also add to crm_contacts for first attribution
ALTER TABLE public.crm_contacts
ADD COLUMN IF NOT EXISTS first_meta_campaign_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_meta_adset_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_meta_ad_id text DEFAULT NULL;