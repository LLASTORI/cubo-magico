-- Remove duplicate triggers on projects table that caused project creation to fail.
-- Two AFTER INSERT triggers both called handle_new_project(), which inserts into
-- project_members(project_id, user_id, 'owner'). The second invocation violated
-- the UNIQUE(project_id, user_id) constraint, rolling back the entire INSERT.
--
-- Kept: trg_generate_public_code (BEFORE) + trg_handle_new_project (AFTER)
-- Dropped: trigger_generate_project_public_code + on_project_created (exact duplicates)

DROP TRIGGER IF EXISTS on_project_created ON public.projects;
DROP TRIGGER IF EXISTS trigger_generate_project_public_code ON public.projects;

-- Add ON CONFLICT DO NOTHING as a defensive guard so future duplicate invocations
-- are silently ignored instead of raising an exception.
CREATE OR REPLACE FUNCTION public.handle_new_project()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
