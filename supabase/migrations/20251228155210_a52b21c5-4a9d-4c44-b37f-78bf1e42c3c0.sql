-- ============================================
-- PÚBLICOS AUTOMÁTICOS (CUSTOM AUDIENCES)
-- ============================================

-- Tabela principal de públicos
CREATE TABLE public.meta_ad_audiences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ad_account_id text NOT NULL,
  name text NOT NULL,
  meta_audience_id text,
  segment_type text NOT NULL DEFAULT 'tag',
  segment_config jsonb NOT NULL DEFAULT '{"tags": [], "operator": "AND"}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  sync_frequency text NOT NULL DEFAULT 'manual',
  estimated_size integer DEFAULT 0,
  error_message text,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT meta_ad_audiences_status_check CHECK (status IN ('pending', 'active', 'syncing', 'paused', 'error')),
  CONSTRAINT meta_ad_audiences_sync_frequency_check CHECK (sync_frequency IN ('manual', '6h', '24h')),
  CONSTRAINT meta_ad_audiences_segment_type_check CHECK (segment_type IN ('tag', 'filter'))
);

-- Índices para performance
CREATE INDEX idx_meta_ad_audiences_project ON public.meta_ad_audiences(project_id);
CREATE INDEX idx_meta_ad_audiences_status ON public.meta_ad_audiences(status);
CREATE INDEX idx_meta_ad_audiences_sync_frequency ON public.meta_ad_audiences(sync_frequency) WHERE sync_frequency != 'manual';
CREATE UNIQUE INDEX idx_meta_ad_audiences_unique_name ON public.meta_ad_audiences(project_id, ad_account_id, name);

-- Tabela para controle de contatos sincronizados (delta sync)
CREATE TABLE public.meta_audience_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id uuid NOT NULL REFERENCES public.meta_ad_audiences(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  email_hash text,
  phone_hash text,
  first_name_hash text,
  last_name_hash text,
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  removed_at timestamp with time zone,
  CONSTRAINT meta_audience_contacts_unique UNIQUE (audience_id, contact_id)
);

CREATE INDEX idx_meta_audience_contacts_audience ON public.meta_audience_contacts(audience_id);
CREATE INDEX idx_meta_audience_contacts_synced ON public.meta_audience_contacts(audience_id) WHERE removed_at IS NULL;

-- Tabela de logs de sincronização
CREATE TABLE public.meta_audience_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audience_id uuid NOT NULL REFERENCES public.meta_ad_audiences(id) ON DELETE CASCADE,
  contacts_added integer NOT NULL DEFAULT 0,
  contacts_removed integer NOT NULL DEFAULT 0,
  contacts_total integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'success',
  duration_ms integer,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT meta_audience_sync_logs_status_check CHECK (status IN ('success', 'partial', 'failed'))
);

CREATE INDEX idx_meta_audience_sync_logs_audience ON public.meta_audience_sync_logs(audience_id);
CREATE INDEX idx_meta_audience_sync_logs_executed ON public.meta_audience_sync_logs(executed_at DESC);

-- Tabela de públicos semelhantes (lookalike)
CREATE TABLE public.meta_lookalike_audiences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_audience_id uuid NOT NULL REFERENCES public.meta_ad_audiences(id) ON DELETE CASCADE,
  meta_lookalike_id text,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'BR',
  percentage integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT meta_lookalike_audiences_percentage_check CHECK (percentage BETWEEN 1 AND 10),
  CONSTRAINT meta_lookalike_audiences_status_check CHECK (status IN ('pending', 'active', 'error'))
);

CREATE INDEX idx_meta_lookalike_audiences_source ON public.meta_lookalike_audiences(source_audience_id);

-- Enable RLS on all tables
ALTER TABLE public.meta_ad_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_audience_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_audience_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_lookalike_audiences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meta_ad_audiences
CREATE POLICY "Members can view meta audiences" 
  ON public.meta_ad_audiences 
  FOR SELECT 
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage meta audiences" 
  ON public.meta_ad_audiences 
  FOR ALL 
  USING (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role]));

CREATE POLICY "Super admins can manage all meta audiences" 
  ON public.meta_ad_audiences 
  FOR ALL 
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for meta_audience_contacts
CREATE POLICY "Members can view audience contacts" 
  ON public.meta_audience_contacts 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = audience_id AND has_project_access(auth.uid(), a.project_id)
  ));

CREATE POLICY "Managers and owners can manage audience contacts" 
  ON public.meta_audience_contacts 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = audience_id 
    AND get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = audience_id 
    AND get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ));

CREATE POLICY "Super admins can manage all audience contacts" 
  ON public.meta_audience_contacts 
  FOR ALL 
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for meta_audience_sync_logs
CREATE POLICY "Members can view sync logs" 
  ON public.meta_audience_sync_logs 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = audience_id AND has_project_access(auth.uid(), a.project_id)
  ));

CREATE POLICY "Managers and owners can manage sync logs" 
  ON public.meta_audience_sync_logs 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = audience_id 
    AND get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = audience_id 
    AND get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ));

CREATE POLICY "Super admins can manage all sync logs" 
  ON public.meta_audience_sync_logs 
  FOR ALL 
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies for meta_lookalike_audiences
CREATE POLICY "Members can view lookalike audiences" 
  ON public.meta_lookalike_audiences 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = source_audience_id AND has_project_access(auth.uid(), a.project_id)
  ));

CREATE POLICY "Managers and owners can manage lookalike audiences" 
  ON public.meta_lookalike_audiences 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = source_audience_id 
    AND get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meta_ad_audiences a 
    WHERE a.id = source_audience_id 
    AND get_user_project_role(auth.uid(), a.project_id) = ANY (ARRAY['owner'::project_role, 'manager'::project_role])
  ));

CREATE POLICY "Super admins can manage all lookalike audiences" 
  ON public.meta_lookalike_audiences 
  FOR ALL 
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_meta_ad_audiences_updated_at
  BEFORE UPDATE ON public.meta_ad_audiences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();