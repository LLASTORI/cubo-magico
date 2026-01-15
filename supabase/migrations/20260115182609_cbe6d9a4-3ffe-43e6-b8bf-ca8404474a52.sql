-- PROMPT 6: Step 1 - Add utm_term and utm_content columns to hotmart_sales
-- These are standard UTM fields that map from Hotmart's SCK:
-- parts[3] → utm_term (placement), parts[4] → utm_content (creative)

ALTER TABLE hotmart_sales 
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS raw_checkout_origin TEXT;

-- Add index for UTM-based queries
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_utms 
  ON hotmart_sales(project_id, utm_source, utm_medium, utm_campaign_id);