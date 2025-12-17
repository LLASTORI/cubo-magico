-- Create enum for permission levels
CREATE TYPE public.permission_level AS ENUM ('none', 'view', 'edit', 'admin');

-- Create table for member permissions per area
CREATE TABLE public.project_member_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Permission areas
  dashboard permission_level NOT NULL DEFAULT 'none',
  analise permission_level NOT NULL DEFAULT 'none',
  crm permission_level NOT NULL DEFAULT 'none',
  automacoes permission_level NOT NULL DEFAULT 'none',
  chat_ao_vivo permission_level NOT NULL DEFAULT 'none',
  meta_ads permission_level NOT NULL DEFAULT 'none',
  ofertas permission_level NOT NULL DEFAULT 'none',
  lancamentos permission_level NOT NULL DEFAULT 'none',
  configuracoes permission_level NOT NULL DEFAULT 'none',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_member_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Owners can manage all permissions"
ON public.project_member_permissions
FOR ALL
USING (get_user_project_role(auth.uid(), project_id) = 'owner')
WITH CHECK (get_user_project_role(auth.uid(), project_id) = 'owner');

CREATE POLICY "Members can view their own permissions"
ON public.project_member_permissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all permissions"
ON public.project_member_permissions
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Add permissions columns to project_invites
ALTER TABLE public.project_invites 
ADD COLUMN IF NOT EXISTS permissions_dashboard permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_analise permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_crm permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_automacoes permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_chat_ao_vivo permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_meta_ads permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_ofertas permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_lancamentos permission_level DEFAULT 'none',
ADD COLUMN IF NOT EXISTS permissions_configuracoes permission_level DEFAULT 'none';

-- Function to check if user has permission for an area
CREATE OR REPLACE FUNCTION public.has_area_permission(
  _user_id uuid, 
  _project_id uuid, 
  _area text, 
  _min_level permission_level DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role project_role;
  v_permission permission_level;
BEGIN
  -- Get user role
  SELECT role INTO v_role FROM project_members WHERE user_id = _user_id AND project_id = _project_id;
  
  -- Owner has full access to everything
  IF v_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Super admin has full access
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Get specific permission for the area
  EXECUTE format(
    'SELECT %I FROM project_member_permissions WHERE user_id = $1 AND project_id = $2',
    _area
  ) INTO v_permission USING _user_id, _project_id;
  
  -- If no permission record exists, deny access
  IF v_permission IS NULL THEN
    RETURN false;
  END IF;
  
  -- Compare permission levels
  RETURN CASE _min_level
    WHEN 'none' THEN true
    WHEN 'view' THEN v_permission IN ('view', 'edit', 'admin')
    WHEN 'edit' THEN v_permission IN ('edit', 'admin')
    WHEN 'admin' THEN v_permission = 'admin'
    ELSE false
  END;
END;
$$;

-- Function to create permissions when a member joins
CREATE OR REPLACE FUNCTION public.create_member_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't create permissions for owner (they have full access)
  IF NEW.role = 'owner' THEN
    RETURN NEW;
  END IF;
  
  -- Create default permissions record
  INSERT INTO public.project_member_permissions (project_id, user_id)
  VALUES (NEW.project_id, NEW.user_id)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to create permissions when member is added
CREATE TRIGGER on_project_member_created
AFTER INSERT ON public.project_members
FOR EACH ROW
EXECUTE FUNCTION public.create_member_permissions();

-- Create permissions for existing members (except owners)
INSERT INTO public.project_member_permissions (project_id, user_id, dashboard, analise, crm, automacoes, chat_ao_vivo, meta_ads, ofertas, lancamentos, configuracoes)
SELECT 
  pm.project_id, 
  pm.user_id,
  'view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'none'
FROM public.project_members pm
WHERE pm.role != 'owner'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER update_project_member_permissions_updated_at
BEFORE UPDATE ON public.project_member_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();