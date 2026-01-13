-- Create unique constraint for sales_core_events to support proper upsert
-- This enables ON CONFLICT handling for deduplication

-- First, check if there are duplicates and clean them up
WITH duplicates AS (
  SELECT id, 
         project_id, 
         provider_event_id, 
         version,
         ROW_NUMBER() OVER (PARTITION BY project_id, provider_event_id, version ORDER BY created_at DESC) as rn
  FROM sales_core_events
)
UPDATE sales_core_events 
SET is_active = false 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now create the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS sales_core_events_project_provider_version_unique 
ON sales_core_events (project_id, provider_event_id, version) 
WHERE is_active = true;

-- Also create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_core_events_provider_lookup 
ON sales_core_events (project_id, provider, is_active);

CREATE INDEX IF NOT EXISTS idx_sales_core_events_economic_day 
ON sales_core_events (project_id, economic_day, is_active);