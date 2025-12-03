-- Drop existing restrictive policies for user invite responses
DROP POLICY IF EXISTS "Users can view invites sent to them" ON public.project_invites;
DROP POLICY IF EXISTS "Users can respond to their invites" ON public.project_invites;

-- Recreate as PERMISSIVE policies (default)
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