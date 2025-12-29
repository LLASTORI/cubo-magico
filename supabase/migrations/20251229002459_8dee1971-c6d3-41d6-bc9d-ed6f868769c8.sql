
-- =====================================================
-- FASE 1: NOVA ARQUITETURA COMERCIAL - CUBO MÁGICO
-- =====================================================

-- 1. CRIAR ENUMS
-- =====================================================

-- Tipo de plano
CREATE TYPE plan_type AS ENUM ('trial', 'monthly', 'yearly', 'lifetime');

-- Origem da assinatura
CREATE TYPE subscription_origin AS ENUM ('hotmart', 'manual', 'stripe', 'other');

-- Tipo de alvo para overrides
CREATE TYPE override_target_type AS ENUM ('user', 'project');

-- 2. ALTERAR TABELA PLANS
-- =====================================================

ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS type plan_type NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS max_users_per_project integer NOT NULL DEFAULT 5;

-- 3. ALTERAR TABELA SUBSCRIPTIONS
-- =====================================================

ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS origin subscription_origin NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id text;

-- Índice para buscar por external_id (ID da Hotmart/Stripe)
CREATE INDEX IF NOT EXISTS idx_subscriptions_external_id ON public.subscriptions(external_id) WHERE external_id IS NOT NULL;

-- 4. CRIAR TABELA FEATURES
-- =====================================================

CREATE TABLE public.features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_key text NOT NULL,
  feature_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_features_module_key ON public.features(module_key);

-- Trigger para updated_at
CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- Todos podem visualizar features (são públicas)
CREATE POLICY "Anyone can view features"
  ON public.features FOR SELECT
  USING (true);

-- Apenas super admins podem gerenciar
CREATE POLICY "Super admins can manage features"
  ON public.features FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 5. CRIAR TABELA PLAN_FEATURES
-- =====================================================

CREATE TABLE public.plan_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

-- Índices
CREATE INDEX idx_plan_features_plan_id ON public.plan_features(plan_id);
CREATE INDEX idx_plan_features_feature_id ON public.plan_features(feature_id);

-- Trigger para updated_at
CREATE TRIGGER update_plan_features_updated_at
  BEFORE UPDATE ON public.plan_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

-- Todos podem visualizar (necessário para verificar acesso)
CREATE POLICY "Anyone can view plan features"
  ON public.plan_features FOR SELECT
  USING (true);

-- Apenas super admins podem gerenciar
CREATE POLICY "Super admins can manage plan features"
  ON public.plan_features FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 6. CRIAR TABELA FEATURE_OVERRIDES
-- =====================================================

CREATE TABLE public.feature_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type override_target_type NOT NULL,
  target_id uuid NOT NULL,
  feature_id uuid NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(target_type, target_id, feature_id)
);

-- Índices
CREATE INDEX idx_feature_overrides_target ON public.feature_overrides(target_type, target_id);
CREATE INDEX idx_feature_overrides_feature_id ON public.feature_overrides(feature_id);
CREATE INDEX idx_feature_overrides_expires_at ON public.feature_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_feature_overrides_updated_at
  BEFORE UPDATE ON public.feature_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.feature_overrides ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios overrides
CREATE POLICY "Users can view own overrides"
  ON public.feature_overrides FOR SELECT
  USING (
    (target_type = 'user' AND target_id = auth.uid())
    OR
    (target_type = 'project' AND has_project_access(auth.uid(), target_id))
  );

-- Super admins podem gerenciar todos
CREATE POLICY "Super admins can manage all overrides"
  ON public.feature_overrides FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- 7. CRIAR TABELA HOTMART_PRODUCT_PLANS (MAPEAMENTO)
-- =====================================================

CREATE TABLE public.hotmart_product_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  offer_code text,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, offer_code)
);

-- Índices
CREATE INDEX idx_hotmart_product_plans_product_id ON public.hotmart_product_plans(product_id);
CREATE INDEX idx_hotmart_product_plans_plan_id ON public.hotmart_product_plans(plan_id);

-- Trigger para updated_at
CREATE TRIGGER update_hotmart_product_plans_updated_at
  BEFORE UPDATE ON public.hotmart_product_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.hotmart_product_plans ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar
CREATE POLICY "Super admins can manage hotmart product plans"
  ON public.hotmart_product_plans FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins podem visualizar
CREATE POLICY "Super admins can view hotmart product plans"
  ON public.hotmart_product_plans FOR SELECT
  USING (is_super_admin(auth.uid()));

-- 8. INSERIR FEATURES INICIAIS
-- =====================================================

INSERT INTO public.features (module_key, feature_key, name, description) VALUES
-- Meta Ads
('meta_ads', 'meta_ads.view_campaigns', 'Visualizar Campanhas', 'Permite visualizar campanhas, conjuntos e anúncios do Meta Ads'),
('meta_ads', 'meta_ads.create_audience', 'Criar Públicos', 'Permite criar públicos personalizados no Meta Ads'),
('meta_ads', 'meta_ads.sync_conversions', 'Sincronizar Conversões', 'Permite sincronizar dados de conversão com o Meta'),
('meta_ads', 'meta_ads.ai_insights', 'Insights com IA', 'Permite usar análises e recomendações com inteligência artificial'),
('meta_ads', 'meta_ads.hierarchy_analysis', 'Análise de Hierarquia', 'Permite analisar campanhas, conjuntos e anúncios em hierarquia'),

-- CRM
('crm', 'crm.view_contacts', 'Visualizar Contatos', 'Permite visualizar contatos e leads no CRM'),
('crm', 'crm.manage_contacts', 'Gerenciar Contatos', 'Permite criar, editar e excluir contatos'),
('crm', 'crm.pipelines', 'Pipelines/Kanban', 'Permite usar visualização em Kanban e gerenciar pipelines'),
('crm', 'crm.recovery', 'Recuperação de Clientes', 'Permite usar o módulo de recuperação de clientes'),
('crm', 'crm.segments', 'Segmentação Avançada', 'Permite criar e gerenciar segmentos de clientes'),
('crm', 'crm.activities', 'Atividades', 'Permite registrar e visualizar atividades dos contatos'),
('crm', 'crm.utm_behavior', 'Comportamento UTM', 'Permite analisar comportamento de UTMs'),

-- Hotmart
('hotmart', 'hotmart.view_sales', 'Visualizar Vendas', 'Permite visualizar vendas e transações da Hotmart'),
('hotmart', 'hotmart.import_sales', 'Importar Vendas', 'Permite importar vendas manualmente ou via CSV'),
('hotmart', 'hotmart.advanced_reports', 'Relatórios Avançados', 'Permite acessar relatórios avançados de vendas'),
('hotmart', 'hotmart.webhooks', 'Webhooks', 'Permite configurar e receber webhooks da Hotmart'),

-- WhatsApp
('whatsapp', 'whatsapp.view_conversations', 'Visualizar Conversas', 'Permite visualizar conversas do WhatsApp'),
('whatsapp', 'whatsapp.send_messages', 'Enviar Mensagens', 'Permite enviar mensagens manualmente'),
('whatsapp', 'whatsapp.automations', 'Automações WhatsApp', 'Permite criar automações de mensagens'),
('whatsapp', 'whatsapp.multiple_numbers', 'Múltiplos Números', 'Permite conectar múltiplos números de WhatsApp'),
('whatsapp', 'whatsapp.agents', 'Gerenciar Agentes', 'Permite configurar agentes de atendimento'),

-- Automações
('automations', 'automations.view_flows', 'Visualizar Fluxos', 'Permite visualizar fluxos de automação'),
('automations', 'automations.create_flows', 'Criar Fluxos', 'Permite criar e editar fluxos de automação'),
('automations', 'automations.execute_flows', 'Executar Fluxos', 'Permite ativar e executar fluxos'),
('automations', 'automations.advanced_nodes', 'Nós Avançados', 'Permite usar nós avançados como HTTP, condições complexas'),

-- Dashboard
('dashboard', 'dashboard.view', 'Visualizar Dashboard', 'Permite visualizar o dashboard principal'),
('dashboard', 'dashboard.executive_report', 'Relatório Executivo', 'Permite gerar relatórios executivos'),
('dashboard', 'dashboard.period_comparison', 'Comparação de Períodos', 'Permite comparar métricas entre períodos'),

-- Lançamentos
('launches', 'launches.view', 'Visualizar Lançamentos', 'Permite visualizar lançamentos'),
('launches', 'launches.manage', 'Gerenciar Lançamentos', 'Permite criar e editar lançamentos'),
('launches', 'launches.conversion_analysis', 'Análise de Conversão', 'Permite analisar conversões por fase'),

-- Configurações
('settings', 'settings.integrations', 'Integrações', 'Permite configurar integrações externas'),
('settings', 'settings.team', 'Gerenciar Equipe', 'Permite gerenciar membros e permissões'),
('settings', 'settings.webhooks', 'Configurar Webhooks', 'Permite configurar webhooks do projeto');

-- 9. FUNÇÃO HELPER: CAN_USE_FEATURE
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_use_feature(
  _user_id uuid,
  _project_id uuid,
  _feature_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_module_key text;
  v_override_enabled boolean;
  v_plan_enabled boolean;
  v_module_active boolean;
BEGIN
  -- Super admin sempre tem acesso
  IF is_super_admin(_user_id) THEN
    RETURN true;
  END IF;

  -- Extrair module_key da feature_key (ex: 'meta_ads.create_audience' -> 'meta_ads')
  v_module_key := split_part(_feature_key, '.', 1);
  
  -- 1. Verificar se o módulo está ativo no projeto
  SELECT EXISTS (
    SELECT 1 FROM project_modules pm
    WHERE pm.project_id = _project_id
      AND pm.module_key = v_module_key
      AND pm.is_active = true
  ) INTO v_module_active;
  
  IF NOT v_module_active THEN
    RETURN false;
  END IF;
  
  -- 2. Verificar override do usuário (prioridade máxima)
  SELECT fo.enabled INTO v_override_enabled
  FROM feature_overrides fo
  JOIN features f ON f.id = fo.feature_id
  WHERE fo.target_type = 'user'
    AND fo.target_id = _user_id
    AND f.feature_key = _feature_key
    AND (fo.expires_at IS NULL OR fo.expires_at > now())
  LIMIT 1;
  
  IF v_override_enabled IS NOT NULL THEN
    RETURN v_override_enabled;
  END IF;
  
  -- 3. Verificar override do projeto
  SELECT fo.enabled INTO v_override_enabled
  FROM feature_overrides fo
  JOIN features f ON f.id = fo.feature_id
  WHERE fo.target_type = 'project'
    AND fo.target_id = _project_id
    AND f.feature_key = _feature_key
    AND (fo.expires_at IS NULL OR fo.expires_at > now())
  LIMIT 1;
  
  IF v_override_enabled IS NOT NULL THEN
    RETURN v_override_enabled;
  END IF;
  
  -- 4. Verificar plano da assinatura do usuário
  SELECT pf.enabled INTO v_plan_enabled
  FROM subscriptions s
  JOIN plan_features pf ON pf.plan_id = s.plan_id
  JOIN features f ON f.id = pf.feature_id
  WHERE s.user_id = _user_id
    AND s.status IN ('active', 'trial')
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND (s.is_trial = false OR s.trial_ends_at IS NULL OR s.trial_ends_at > now())
    AND f.feature_key = _feature_key
  LIMIT 1;
  
  IF v_plan_enabled IS NOT NULL THEN
    RETURN v_plan_enabled;
  END IF;
  
  -- 5. Fallback: sem assinatura = sem acesso (exceto features básicas)
  -- Por enquanto, liberamos features básicas de visualização
  IF _feature_key LIKE '%.view%' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.features IS 'Features granulares do sistema, organizadas por módulo';
COMMENT ON TABLE public.plan_features IS 'Relacionamento entre planos e features habilitadas';
COMMENT ON TABLE public.feature_overrides IS 'Exceções de features por usuário ou projeto';
COMMENT ON TABLE public.hotmart_product_plans IS 'Mapeamento de produtos Hotmart para planos do sistema';
COMMENT ON FUNCTION public.can_use_feature IS 'Verifica se um usuário pode usar uma feature específica em um projeto';
