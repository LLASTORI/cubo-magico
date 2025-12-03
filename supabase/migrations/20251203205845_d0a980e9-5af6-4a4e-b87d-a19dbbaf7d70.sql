-- Tabela para armazenar tokens OAuth do Meta por projeto
CREATE TABLE public.meta_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  user_id TEXT, -- Meta user ID
  user_name TEXT, -- Meta user name
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Tabela para contas de anúncio vinculadas
CREATE TABLE public.meta_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL, -- Meta ad account ID (act_xxx)
  account_name TEXT,
  currency TEXT,
  timezone_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, account_id)
);

-- Tabela para campanhas
CREATE TABLE public.meta_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL, -- Meta campaign ID
  campaign_name TEXT,
  objective TEXT,
  status TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  created_time TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  stop_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, campaign_id)
);

-- Tabela para conjuntos de anúncios (adsets)
CREATE TABLE public.meta_adsets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  adset_id TEXT NOT NULL, -- Meta adset ID
  adset_name TEXT,
  status TEXT,
  daily_budget NUMERIC,
  lifetime_budget NUMERIC,
  targeting JSONB,
  created_time TIMESTAMP WITH TIME ZONE,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, adset_id)
);

-- Tabela para anúncios individuais
CREATE TABLE public.meta_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  adset_id TEXT NOT NULL,
  ad_id TEXT NOT NULL, -- Meta ad ID
  ad_name TEXT,
  status TEXT,
  creative_id TEXT,
  created_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, ad_id)
);

-- Tabela para insights/métricas de performance
CREATE TABLE public.meta_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  date_start DATE NOT NULL,
  date_stop DATE NOT NULL,
  spend NUMERIC DEFAULT 0, -- Valor gasto
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  cpc NUMERIC, -- Custo por clique
  cpm NUMERIC, -- Custo por mil impressões
  ctr NUMERIC, -- Taxa de cliques
  frequency NUMERIC,
  actions JSONB, -- Conversões e outras ações
  cost_per_action_type JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, ad_account_id, campaign_id, adset_id, ad_id, date_start, date_stop)
);

-- Enable RLS
ALTER TABLE public.meta_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_adsets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meta_credentials (somente managers e owners podem ver/gerenciar)
CREATE POLICY "Managers and owners can manage meta credentials"
ON public.meta_credentials FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- RLS Policies for meta_ad_accounts
CREATE POLICY "Members can view meta ad accounts"
ON public.meta_ad_accounts FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage meta ad accounts"
ON public.meta_ad_accounts FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- RLS Policies for meta_campaigns
CREATE POLICY "Members can view meta campaigns"
ON public.meta_campaigns FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage meta campaigns"
ON public.meta_campaigns FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- RLS Policies for meta_adsets
CREATE POLICY "Members can view meta adsets"
ON public.meta_adsets FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage meta adsets"
ON public.meta_adsets FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- RLS Policies for meta_ads
CREATE POLICY "Members can view meta ads"
ON public.meta_ads FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage meta ads"
ON public.meta_ads FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- RLS Policies for meta_insights
CREATE POLICY "Members can view meta insights"
ON public.meta_insights FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage meta insights"
ON public.meta_insights FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- Triggers para updated_at
CREATE TRIGGER update_meta_credentials_updated_at
BEFORE UPDATE ON public.meta_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_ad_accounts_updated_at
BEFORE UPDATE ON public.meta_ad_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_campaigns_updated_at
BEFORE UPDATE ON public.meta_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_adsets_updated_at
BEFORE UPDATE ON public.meta_adsets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_ads_updated_at
BEFORE UPDATE ON public.meta_ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_insights_updated_at
BEFORE UPDATE ON public.meta_insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_meta_insights_project_date ON public.meta_insights(project_id, date_start, date_stop);
CREATE INDEX idx_meta_insights_campaign ON public.meta_insights(campaign_id);
CREATE INDEX idx_meta_campaigns_project ON public.meta_campaigns(project_id);
CREATE INDEX idx_meta_adsets_campaign ON public.meta_adsets(campaign_id);
CREATE INDEX idx_meta_ads_adset ON public.meta_ads(adset_id);