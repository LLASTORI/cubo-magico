-- Tabela para rastrear uso de IA em todas as features
CREATE TABLE public.ai_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  feature TEXT NOT NULL, -- 'social_listening', 'survey_analysis', 'funnel_analysis', 'chat'
  action TEXT NOT NULL, -- 'classify_comment', 'batch_classify', 'generate_reply', etc
  provider TEXT NOT NULL, -- 'lovable', 'openai'
  model TEXT, -- 'gpt-4o-mini', 'gemini-2.5-flash', etc
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 1,
  cost_estimate DECIMAL(10, 6) DEFAULT 0, -- custo em USD
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas frequentes
CREATE INDEX idx_ai_usage_tracking_project_id ON public.ai_usage_tracking(project_id);
CREATE INDEX idx_ai_usage_tracking_created_at ON public.ai_usage_tracking(created_at);
CREATE INDEX idx_ai_usage_tracking_feature ON public.ai_usage_tracking(feature);
CREATE INDEX idx_ai_usage_tracking_project_date ON public.ai_usage_tracking(project_id, created_at);

-- Tabela para quotas de IA por projeto
CREATE TABLE public.ai_project_quotas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  daily_limit INTEGER NOT NULL DEFAULT 100, -- limite diário de classificações
  monthly_limit INTEGER NOT NULL DEFAULT 3000, -- limite mensal
  current_daily_usage INTEGER NOT NULL DEFAULT 0,
  current_monthly_usage INTEGER NOT NULL DEFAULT 0,
  last_daily_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_monthly_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_unlimited BOOLEAN NOT NULL DEFAULT false, -- para planos enterprise
  provider_preference TEXT NOT NULL DEFAULT 'openai', -- 'openai', 'lovable', 'auto'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para consultas por projeto
CREATE INDEX idx_ai_project_quotas_project_id ON public.ai_project_quotas(project_id);

-- Habilitar RLS
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_project_quotas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_usage_tracking
CREATE POLICY "Membros podem ver tracking do projeto"
ON public.ai_usage_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = ai_usage_tracking.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Sistema pode inserir tracking"
ON public.ai_usage_tracking
FOR INSERT
WITH CHECK (true);

-- Políticas RLS para ai_project_quotas
CREATE POLICY "Membros podem ver quotas do projeto"
ON public.ai_project_quotas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_members pm
    WHERE pm.project_id = ai_project_quotas.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Sistema pode gerenciar quotas"
ON public.ai_project_quotas
FOR ALL
USING (true)
WITH CHECK (true);

-- Função para verificar e usar quota de IA
CREATE OR REPLACE FUNCTION public.check_and_use_ai_quota(
  p_project_id UUID,
  p_items_count INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota RECORD;
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_result JSONB;
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

  -- Reset mensal se necessário
  IF date_trunc('month', v_quota.last_monthly_reset) < date_trunc('month', v_now) THEN
    UPDATE public.ai_project_quotas
    SET current_monthly_usage = 0, last_monthly_reset = v_now
    WHERE project_id = p_project_id;
    v_quota.current_monthly_usage := 0;
  END IF;

  -- Verificar se tem quota disponível
  IF NOT v_quota.is_unlimited THEN
    IF v_quota.current_daily_usage + p_items_count > v_quota.daily_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'daily_limit_exceeded',
        'current_daily', v_quota.current_daily_usage,
        'daily_limit', v_quota.daily_limit,
        'remaining_daily', GREATEST(0, v_quota.daily_limit - v_quota.current_daily_usage)
      );
    END IF;

    IF v_quota.current_monthly_usage + p_items_count > v_quota.monthly_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'monthly_limit_exceeded',
        'current_monthly', v_quota.current_monthly_usage,
        'monthly_limit', v_quota.monthly_limit,
        'remaining_monthly', GREATEST(0, v_quota.monthly_limit - v_quota.current_monthly_usage)
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
    'provider_preference', v_quota.provider_preference
  );
END;
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_project_quotas_updated_at
BEFORE UPDATE ON public.ai_project_quotas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();