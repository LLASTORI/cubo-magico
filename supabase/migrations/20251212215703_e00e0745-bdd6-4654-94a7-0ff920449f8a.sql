-- Drop existing policies
DROP POLICY IF EXISTS "Project managers and owners can manage modules" ON public.project_modules;

-- Keep read access for project members
-- (already exists: "Project members can view their project modules")

-- Create policy for super_admin only to manage modules
CREATE POLICY "Only super admins can manage modules"
ON public.project_modules
FOR ALL
USING (
  public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
);