-- Fix CRITICAL: offer_mappings table is publicly accessible
-- Drop all "Allow all" policies
DROP POLICY IF EXISTS "Allow all select on offer mappings" ON public.offer_mappings;
DROP POLICY IF EXISTS "Allow all insert on offer mappings" ON public.offer_mappings;
DROP POLICY IF EXISTS "Allow all update on offer mappings" ON public.offer_mappings;
DROP POLICY IF EXISTS "Allow all delete on offer mappings" ON public.offer_mappings;

-- Create secure policies requiring authentication and project membership
CREATE POLICY "Members can view offer mappings" 
ON public.offer_mappings 
FOR SELECT 
TO authenticated
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can insert offer mappings" 
ON public.offer_mappings 
FOR INSERT 
TO authenticated
WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can update offer mappings" 
ON public.offer_mappings 
FOR UPDATE 
TO authenticated
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Managers and owners can delete offer mappings" 
ON public.offer_mappings 
FOR DELETE 
TO authenticated
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));