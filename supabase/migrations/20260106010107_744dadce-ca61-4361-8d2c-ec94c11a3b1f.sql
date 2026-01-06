-- Drop and recreate check_and_use_ai_quota with Lovable credits verification
DROP FUNCTION IF EXISTS public.check_and_use_ai_quota(UUID, INTEGER);

CREATE FUNCTION public.check_and_use_ai_quota(p_project_id UUID, p_items_count INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quota RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_lovable_remaining INTEGER;
BEGIN
  -- Criar quota se não existir
  INSERT INTO public.ai_project_quotas (project_id)
  VALUES (p_project_id)
  ON CONFLICT (project_id) DO NOTHING;

  -- Buscar quota atual com lock
  SELECT * INTO v_quota
  FROM public.ai_project_quotas
  WHERE project_id = p_project_id
  FOR UPDATE;

  -- Reset diário se necessário
  IF v_quota.last_daily_reset::date < v_now::date THEN
    UPDATE public.ai_project_quotas
    SET current_daily_usage = 0, last_daily_reset = v_now
    WHERE project_id = p_project_id;
    v_quota.current_daily_usage := 0;
  END IF;

  -- Reset mensal se necessário (incluindo créditos)
  IF date_trunc('month', v_quota.last_monthly_reset) < date_trunc('month', v_now) THEN
    UPDATE public.ai_project_quotas
    SET current_monthly_usage = 0, lovable_credits_used = 0, openai_credits_used = 0, last_monthly_reset = v_now
    WHERE project_id = p_project_id;
    v_quota.current_monthly_usage := 0;
    v_quota.lovable_credits_used := 0;
    v_quota.openai_credits_used := 0;
  END IF;

  -- Calcular créditos Lovable restantes
  v_lovable_remaining := GREATEST(0, COALESCE(v_quota.lovable_credits_limit, 1000) - COALESCE(v_quota.lovable_credits_used, 0));

  -- Verificar se tem quota disponível (diário/mensal)
  IF NOT v_quota.is_unlimited THEN
    IF v_quota.current_daily_usage + p_items_count > v_quota.daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'daily_limit_exceeded',
        'current_daily', v_quota.current_daily_usage,
        'daily_limit', v_quota.daily_limit,
        'remaining_daily', GREATEST(0, v_quota.daily_limit - v_quota.current_daily_usage),
        'lovable_remaining', v_lovable_remaining,
        'lovable_used', COALESCE(v_quota.lovable_credits_used, 0),
        'lovable_limit', COALESCE(v_quota.lovable_credits_limit, 1000)
      );
    END IF;

    IF v_quota.current_monthly_usage + p_items_count > v_quota.monthly_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'monthly_limit_exceeded',
        'current_monthly', v_quota.current_monthly_usage,
        'monthly_limit', v_quota.monthly_limit,
        'remaining_monthly', GREATEST(0, v_quota.monthly_limit - v_quota.current_monthly_usage),
        'lovable_remaining', v_lovable_remaining,
        'lovable_used', COALESCE(v_quota.lovable_credits_used, 0),
        'lovable_limit', COALESCE(v_quota.lovable_credits_limit, 1000)
      );
    END IF;
  END IF;

  -- Verificar créditos Lovable se provider preferido é Lovable
  IF v_quota.provider_preference = 'lovable' THEN
    IF v_lovable_remaining < p_items_count THEN
      -- Lovable credits exhausted - signal to use OpenAI as fallback
      RETURN jsonb_build_object(
        'allowed', true,
        'use_fallback_provider', 'openai',
        'reason', 'lovable_credits_exhausted',
        'lovable_remaining', 0,
        'lovable_used', COALESCE(v_quota.lovable_credits_used, 0),
        'lovable_limit', COALESCE(v_quota.lovable_credits_limit, 1000),
        'current_daily', v_quota.current_daily_usage,
        'daily_limit', v_quota.daily_limit,
        'current_monthly', v_quota.current_monthly_usage,
        'monthly_limit', v_quota.monthly_limit,
        'provider_preference', v_quota.provider_preference
      );
    END IF;
  END IF;

  -- Incrementar uso
  UPDATE public.ai_project_quotas
  SET 
    current_daily_usage = current_daily_usage + p_items_count,
    current_monthly_usage = current_monthly_usage + p_items_count,
    updated_at = v_now
  WHERE project_id = p_project_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_daily', v_quota.current_daily_usage + p_items_count,
    'daily_limit', v_quota.daily_limit,
    'remaining_daily', GREATEST(0, v_quota.daily_limit - v_quota.current_daily_usage - p_items_count),
    'current_monthly', v_quota.current_monthly_usage + p_items_count,
    'monthly_limit', v_quota.monthly_limit,
    'remaining_monthly', GREATEST(0, v_quota.monthly_limit - v_quota.current_monthly_usage - p_items_count),
    'is_unlimited', v_quota.is_unlimited,
    'provider_preference', v_quota.provider_preference,
    'lovable_remaining', GREATEST(0, v_lovable_remaining - p_items_count),
    'lovable_used', COALESCE(v_quota.lovable_credits_used, 0),
    'lovable_limit', COALESCE(v_quota.lovable_credits_limit, 1000)
  );
END;
$$;