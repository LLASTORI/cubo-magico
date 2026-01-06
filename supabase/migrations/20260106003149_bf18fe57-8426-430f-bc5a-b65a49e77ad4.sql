-- Function to increment lovable credits
CREATE OR REPLACE FUNCTION public.increment_lovable_credits(p_project_id uuid, p_count integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_project_quotas
  SET lovable_credits_used = COALESCE(lovable_credits_used, 0) + p_count,
      updated_at = now()
  WHERE project_id = p_project_id;
  
  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO ai_project_quotas (project_id, lovable_credits_used, lovable_credits_limit, provider_preference)
    VALUES (p_project_id, p_count, 1000, 'lovable');
  END IF;
END;
$$;

-- Function to increment openai credits
CREATE OR REPLACE FUNCTION public.increment_openai_credits(p_project_id uuid, p_count integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_project_quotas
  SET openai_credits_used = COALESCE(openai_credits_used, 0) + p_count,
      updated_at = now()
  WHERE project_id = p_project_id;
  
  -- If no row exists, insert one
  IF NOT FOUND THEN
    INSERT INTO ai_project_quotas (project_id, openai_credits_used, provider_preference)
    VALUES (p_project_id, p_count, 'openai');
  END IF;
END;
$$;