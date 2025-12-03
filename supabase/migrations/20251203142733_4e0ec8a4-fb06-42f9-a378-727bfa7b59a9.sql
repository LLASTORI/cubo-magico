-- Fix: Update policy to allow status change when responding to invites
-- Drop the current UPDATE policy and recreate with proper WITH CHECK

DROP POLICY IF EXISTS "Users can respond to their invites" ON public.project_invites;

CREATE POLICY "Users can respond to their invites" 
ON public.project_invites 
FOR UPDATE 
TO authenticated
USING (
  lower(email) = lower(get_user_email(auth.uid())) 
  AND status = 'pending'::invite_status
)
WITH CHECK (
  lower(email) = lower(get_user_email(auth.uid()))
  AND status IN ('accepted'::invite_status, 'rejected'::invite_status)
);

-- Also ensure project_members INSERT policy exists for accepting invites
DROP POLICY IF EXISTS "Users can join via invite" ON public.project_members;

CREATE POLICY "Users can join via invite" 
ON public.project_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.project_invites
    WHERE project_invites.project_id = project_members.project_id
    AND lower(project_invites.email) = lower(get_user_email(auth.uid()))
    AND project_invites.status = 'accepted'::invite_status
    AND project_invites.role = project_members.role
  )
);