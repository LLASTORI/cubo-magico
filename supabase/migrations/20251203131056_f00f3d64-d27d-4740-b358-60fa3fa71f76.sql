-- Drop the problematic policies that reference auth.users
DROP POLICY IF EXISTS "Users can view invites sent to them" ON public.project_invites;
DROP POLICY IF EXISTS "Users can respond to their invites" ON public.project_invites;

-- Create a security definer function to get user email from profiles
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = _user_id
$$;

-- Recreate policies using the profiles table instead of auth.users
CREATE POLICY "Users can view invites sent to them" 
ON public.project_invites 
FOR SELECT 
USING (lower(email) = lower(public.get_user_email(auth.uid())));

CREATE POLICY "Users can respond to their invites" 
ON public.project_invites 
FOR UPDATE 
USING (lower(email) = lower(public.get_user_email(auth.uid())) AND status = 'pending'::invite_status);