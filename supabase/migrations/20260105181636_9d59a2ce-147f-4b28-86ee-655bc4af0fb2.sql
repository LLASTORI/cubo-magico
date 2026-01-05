-- Create function to check member permission level for an area
CREATE OR REPLACE FUNCTION public.has_area_permission(
  _user_id uuid, 
  _project_id uuid, 
  _area text, 
  _min_level text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_level text;
  level_order text[] := ARRAY['none', 'view', 'edit', 'admin'];
  user_index int;
  required_index int;
  is_owner boolean;
BEGIN
  -- Check if user is super admin
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Check if user is project owner
  SELECT (role = 'owner') INTO is_owner
  FROM project_members
  WHERE user_id = _user_id AND project_id = _project_id;
  
  IF is_owner THEN
    RETURN true;
  END IF;

  -- Get user's permission level for the area
  EXECUTE format('SELECT %I FROM project_member_permissions WHERE user_id = $1 AND project_id = $2', _area)
  INTO user_level
  USING _user_id, _project_id;

  -- If no permission found, deny access
  IF user_level IS NULL THEN
    RETURN false;
  END IF;

  -- Compare levels
  user_index := array_position(level_order, user_level);
  required_index := array_position(level_order, _min_level);

  IF user_index IS NULL OR required_index IS NULL THEN
    RETURN false;
  END IF;

  RETURN user_index >= required_index;
END;
$$;

-- Drop old restrictive policies on surveys
DROP POLICY IF EXISTS "Managers and owners can manage surveys" ON surveys;

-- Create new policy that uses granular permissions
CREATE POLICY "Members with edit permission can manage surveys" ON surveys
FOR ALL USING (
  has_area_permission(auth.uid(), project_id, 'pesquisas', 'edit')
)
WITH CHECK (
  has_area_permission(auth.uid(), project_id, 'pesquisas', 'edit')
);

-- Drop old restrictive policies on survey_questions
DROP POLICY IF EXISTS "Managers and owners can manage survey questions" ON survey_questions;

-- Create new policy that uses granular permissions
CREATE POLICY "Members with edit permission can manage survey questions" ON survey_questions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_questions.survey_id
    AND has_area_permission(auth.uid(), s.project_id, 'pesquisas', 'edit')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_questions.survey_id
    AND has_area_permission(auth.uid(), s.project_id, 'pesquisas', 'edit')
  )
);