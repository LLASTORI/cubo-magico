-- Fix CRITICAL: funnel_changes table is publicly accessible
-- Drop all "Allow all" policies
DROP POLICY IF EXISTS "Allow all select on funnel_changes" ON public.funnel_changes;
DROP POLICY IF EXISTS "Allow all insert on funnel_changes" ON public.funnel_changes;
DROP POLICY IF EXISTS "Allow all update on funnel_changes" ON public.funnel_changes;
DROP POLICY IF EXISTS "Allow all delete on funnel_changes" ON public.funnel_changes;

-- Create secure policies requiring authentication and project membership
CREATE POLICY "Members can view funnel changes" 
ON public.funnel_changes 
FOR SELECT 
TO authenticated
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert funnel changes" 
ON public.funnel_changes 
FOR INSERT 
TO authenticated
WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can update funnel changes" 
ON public.funnel_changes 
FOR UPDATE 
TO authenticated
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can delete funnel changes" 
ON public.funnel_changes 
FOR DELETE 
TO authenticated
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));