-- Drop ALL existing policies on project_invites
DROP POLICY IF EXISTS "Members can view project invites" ON public.project_invites;
DROP POLICY IF EXISTS "Owner can manage all invites" ON public.project_invites;
DROP POLICY IF EXISTS "Manager can create operator invites" ON public.project_invites;
DROP POLICY IF EXISTS "Users can view invites sent to them" ON public.project_invites;
DROP POLICY IF EXISTS "Users can respond to their invites" ON public.project_invites;

-- Recreate ALL as PERMISSIVE policies
CREATE POLICY "Members can view project invites" 
ON public.project_invites 
FOR SELECT 
TO authenticated
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Owner can manage all invites" 
ON public.project_invites 
FOR ALL 
TO authenticated
USING (get_user_project_role(auth.uid(), project_id) = 'owner'::project_role)
WITH CHECK (get_user_project_role(auth.uid(), project_id) = 'owner'::project_role);

CREATE POLICY "Manager can create operator invites" 
ON public.project_invites 
FOR INSERT 
TO authenticated
WITH CHECK (
  get_user_project_role(auth.uid(), project_id) = 'manager'::project_role 
  AND role = 'operator'::project_role 
  AND can_invite_to_project(project_id)
);

CREATE POLICY "Users can view invites sent to them" 
ON public.project_invites 
FOR SELECT 
TO authenticated
USING (lower(email) = lower(get_user_email(auth.uid())));

CREATE POLICY "Users can respond to their invites" 
ON public.project_invites 
FOR UPDATE 
TO authenticated
USING (lower(email) = lower(get_user_email(auth.uid())) AND status = 'pending'::invite_status);