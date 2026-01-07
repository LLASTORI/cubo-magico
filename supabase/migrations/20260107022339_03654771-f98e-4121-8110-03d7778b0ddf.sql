-- Criar tabela para permissões granulares por feature em cada role_template
CREATE TABLE public.role_template_feature_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_template_id UUID NOT NULL REFERENCES public.role_templates(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'none' CHECK (permission_level IN ('none', 'view', 'edit', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role_template_id, feature_id)
);

-- Enable RLS
ALTER TABLE public.role_template_feature_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can manage all feature permissions
CREATE POLICY "Super admins can manage feature permissions"
ON public.role_template_feature_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
  )
);

-- Policy: Project owners can manage their project's custom templates
CREATE POLICY "Project owners can manage custom template permissions"
ON public.role_template_feature_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM role_templates rt
    JOIN project_members pm ON pm.project_id = rt.project_id
    WHERE rt.id = role_template_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM role_templates rt
    JOIN project_members pm ON pm.project_id = rt.project_id
    WHERE rt.id = role_template_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
);

-- Policy: Members can read templates they have access to
CREATE POLICY "Members can read accessible template permissions"
ON public.role_template_feature_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM role_templates rt
    WHERE rt.id = role_template_id
    AND (
      rt.is_system_default = true
      OR EXISTS (
        SELECT 1 FROM project_members pm
        WHERE pm.project_id = rt.project_id
        AND pm.user_id = auth.uid()
      )
    )
  )
);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.role_template_feature_permissions;

-- Create trigger for updated_at
CREATE TRIGGER update_role_template_feature_permissions_updated_at
BEFORE UPDATE ON public.role_template_feature_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();