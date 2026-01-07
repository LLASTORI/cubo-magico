-- Add policy to allow super_admin to manage system templates
CREATE POLICY "Super admins can manage system templates"
ON public.role_templates
FOR ALL
USING (
  (is_system_default = true AND project_id IS NULL) AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
)
WITH CHECK (
  (is_system_default = true AND project_id IS NULL) AND
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
);