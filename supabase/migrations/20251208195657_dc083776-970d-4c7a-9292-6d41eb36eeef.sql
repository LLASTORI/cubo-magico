-- Create function to add project owner to project_members
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert the project creator as owner in project_members
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after a project is created
CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project();

-- Also backfill existing projects that don't have owner in project_members
INSERT INTO public.project_members (project_id, user_id, role)
SELECT p.id, p.user_id, 'owner'
FROM public.projects p
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_members pm 
  WHERE pm.project_id = p.id AND pm.user_id = p.user_id AND pm.role = 'owner'
);