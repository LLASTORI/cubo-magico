-- Add max_members column to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 5;

-- Add max_members column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 5;

-- Update can_invite_to_project function to use project's limit
CREATE OR REPLACE FUNCTION public.can_invite_to_project(_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.count_project_members(_project_id) < COALESCE(
    (SELECT max_members FROM public.projects WHERE id = _project_id),
    5
  )
$$;

-- Create function to sync project max_members from plan when subscription changes
CREATE OR REPLACE FUNCTION public.sync_project_max_members_from_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan_max_members integer;
BEGIN
  -- Get max_members from the plan
  SELECT max_members INTO plan_max_members
  FROM public.plans
  WHERE id = NEW.plan_id;
  
  -- Update project's max_members if plan has a value
  IF plan_max_members IS NOT NULL THEN
    UPDATE public.projects
    SET max_members = plan_max_members
    WHERE id = NEW.project_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync max_members when subscription is created or updated
DROP TRIGGER IF EXISTS sync_project_max_members_trigger ON public.subscriptions;
CREATE TRIGGER sync_project_max_members_trigger
  AFTER INSERT OR UPDATE OF plan_id ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_project_max_members_from_plan();

-- Add comment for documentation
COMMENT ON COLUMN public.plans.max_members IS 'Maximum number of team members allowed for projects on this plan';
COMMENT ON COLUMN public.projects.max_members IS 'Maximum number of team members allowed for this project';