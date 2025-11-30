-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view all offer mappings" ON public.offer_mappings;
DROP POLICY IF EXISTS "Users can create offer mappings" ON public.offer_mappings;
DROP POLICY IF EXISTS "Users can update offer mappings" ON public.offer_mappings;
DROP POLICY IF EXISTS "Users can delete offer mappings" ON public.offer_mappings;

-- Create permissive policies for personal use (no authentication required)
CREATE POLICY "Allow all select on offer mappings" 
ON public.offer_mappings 
FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert on offer mappings" 
ON public.offer_mappings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update on offer mappings" 
ON public.offer_mappings 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow all delete on offer mappings" 
ON public.offer_mappings 
FOR DELETE 
USING (true);