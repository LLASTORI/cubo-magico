-- Add unique constraint on project_id + codigo_oferta to prevent duplicates
-- First, let's check for any existing duplicates and keep only the most recent one
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY project_id, codigo_oferta ORDER BY updated_at DESC, created_at DESC) as rn
  FROM offer_mappings
  WHERE codigo_oferta IS NOT NULL
)
DELETE FROM offer_mappings
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add the unique constraint
ALTER TABLE offer_mappings
ADD CONSTRAINT offer_mappings_project_codigo_unique UNIQUE (project_id, codigo_oferta);