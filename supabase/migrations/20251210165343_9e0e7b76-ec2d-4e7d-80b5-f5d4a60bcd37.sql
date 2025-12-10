-- Create helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Create admin_audit_logs table for tracking admin actions
CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (is_super_admin(auth.uid()));

-- Only super_admins can insert audit logs
CREATE POLICY "Super admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Super admin policies for profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Super admin policies for projects
CREATE POLICY "Super admins can view all projects"
ON public.projects
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all projects"
ON public.projects
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete all projects"
ON public.projects
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Super admin policies for user_roles
CREATE POLICY "Super admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage user roles"
ON public.user_roles
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Super admin policies for project_members
CREATE POLICY "Super admins can view all project members"
ON public.project_members
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all project members"
ON public.project_members
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Create indexes for audit logs
CREATE INDEX idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);