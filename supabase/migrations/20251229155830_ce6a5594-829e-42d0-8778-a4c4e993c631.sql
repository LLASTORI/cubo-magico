-- Add is_public column to plans table to distinguish public vs internal plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Set the "Ilimitado" (Unlimited) plan as internal (not public)
UPDATE public.plans 
SET is_public = false 
WHERE LOWER(name) LIKE '%ilimitado%' OR LOWER(name) LIKE '%unlimited%' OR LOWER(name) LIKE '%interno%';

-- Add comment for clarity
COMMENT ON COLUMN public.plans.is_public IS 'Whether this plan is visible on public pricing pages. Internal plans like "Ilimitado" should be false.';