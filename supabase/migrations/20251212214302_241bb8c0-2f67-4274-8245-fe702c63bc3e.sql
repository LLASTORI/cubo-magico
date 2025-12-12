-- Create project_modules table to control which modules are enabled per project
CREATE TABLE public.project_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMP WITH TIME ZONE,
  enabled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, module_key)
);

-- Create index for efficient lookups
CREATE INDEX idx_project_modules_project_id ON public.project_modules(project_id);
CREATE INDEX idx_project_modules_module_key ON public.project_modules(module_key);

-- Enable RLS
ALTER TABLE public.project_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view project modules"
  ON public.project_modules
  FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage modules"
  ON public.project_modules
  FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all modules"
  ON public.project_modules
  FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_project_modules_updated_at
  BEFORE UPDATE ON public.project_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();