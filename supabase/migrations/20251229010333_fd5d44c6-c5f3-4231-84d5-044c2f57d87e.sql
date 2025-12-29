-- Add trial configuration columns to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_trial_available boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.plans.trial_days IS 'Number of days for trial period when is_trial_available is true';
COMMENT ON COLUMN public.plans.is_trial_available IS 'Whether this plan offers a trial period';