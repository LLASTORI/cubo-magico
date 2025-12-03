-- Fix: Allow project members to view projects they are members of
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;

CREATE POLICY "Users can view accessible projects" 
ON public.projects 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_project_access(auth.uid(), id)
);