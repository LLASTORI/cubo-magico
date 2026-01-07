-- Criar tabela para permissões de features por membro do projeto
CREATE TABLE public.project_member_feature_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  permission_level TEXT NOT NULL DEFAULT 'none' CHECK (permission_level IN ('none', 'view', 'edit', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id, feature_id)
);

-- Enable RLS
ALTER TABLE public.project_member_feature_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own permissions
CREATE POLICY "Users can read own feature permissions"
ON public.project_member_feature_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Super admins can manage all permissions
CREATE POLICY "Super admins can manage feature permissions"
ON public.project_member_feature_permissions
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

-- Policy: Project owners can manage member permissions
CREATE POLICY "Project owners can manage member feature permissions"
ON public.project_member_feature_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_member_feature_permissions.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = project_member_feature_permissions.project_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'owner'
  )
);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_member_feature_permissions;

-- Create trigger for updated_at
CREATE TRIGGER update_project_member_feature_permissions_updated_at
BEFORE UPDATE ON public.project_member_feature_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();