-- Tabela de relacionamento entre funis e contas Meta
CREATE TABLE public.funnel_meta_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  meta_account_id UUID NOT NULL REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, meta_account_id)
);

-- Enable RLS
ALTER TABLE public.funnel_meta_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view funnel meta accounts"
ON public.funnel_meta_accounts
FOR SELECT
USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage funnel meta accounts"
ON public.funnel_meta_accounts
FOR ALL
USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

-- Index for performance
CREATE INDEX idx_funnel_meta_accounts_funnel ON public.funnel_meta_accounts(funnel_id);
CREATE INDEX idx_funnel_meta_accounts_meta ON public.funnel_meta_accounts(meta_account_id);
CREATE INDEX idx_funnel_meta_accounts_project ON public.funnel_meta_accounts(project_id);