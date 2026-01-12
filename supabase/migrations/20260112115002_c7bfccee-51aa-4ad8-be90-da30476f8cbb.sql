
-- Sales Core Events - Immutable versioned sales events
CREATE TABLE public.sales_core_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('purchase', 'refund', 'chargeback', 'subscription', 'upgrade', 'cancellation')),
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  economic_day DATE NOT NULL,
  attribution JSONB DEFAULT '{}'::jsonb,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Spend Core Events - Immutable versioned spend events
CREATE TABLE public.spend_core_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  spend_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  economic_day DATE NOT NULL,
  campaign_id TEXT,
  adset_id TEXT,
  ad_id TEXT,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Provider Event Log - Raw event audit trail
CREATE TABLE public.provider_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'ignored', 'error')),
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Economic Days - Day closing and timezone management
CREATE TABLE public.economic_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, date)
);

-- Indexes for performance
CREATE INDEX idx_sales_core_events_project_day ON public.sales_core_events(project_id, economic_day);
CREATE INDEX idx_sales_core_events_provider ON public.sales_core_events(project_id, provider, provider_event_id);
CREATE INDEX idx_sales_core_events_contact ON public.sales_core_events(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_sales_core_events_active ON public.sales_core_events(project_id, is_active, economic_day);

CREATE INDEX idx_spend_core_events_project_day ON public.spend_core_events(project_id, economic_day);
CREATE INDEX idx_spend_core_events_provider ON public.spend_core_events(project_id, provider, provider_event_id);
CREATE INDEX idx_spend_core_events_campaign ON public.spend_core_events(project_id, campaign_id);
CREATE INDEX idx_spend_core_events_active ON public.spend_core_events(project_id, is_active, economic_day);

CREATE INDEX idx_provider_event_log_lookup ON public.provider_event_log(project_id, provider, provider_event_id);
CREATE INDEX idx_provider_event_log_status ON public.provider_event_log(project_id, status);

CREATE INDEX idx_economic_days_project ON public.economic_days(project_id, date);

-- Enable RLS
ALTER TABLE public.sales_core_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spend_core_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sales_core_events
CREATE POLICY "Users can view sales_core_events for their projects"
ON public.sales_core_events FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert sales_core_events for their projects"
ON public.sales_core_events FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update sales_core_events for their projects"
ON public.sales_core_events FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for spend_core_events
CREATE POLICY "Users can view spend_core_events for their projects"
ON public.spend_core_events FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert spend_core_events for their projects"
ON public.spend_core_events FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update spend_core_events for their projects"
ON public.spend_core_events FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for provider_event_log
CREATE POLICY "Users can view provider_event_log for their projects"
ON public.provider_event_log FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert provider_event_log for their projects"
ON public.provider_event_log FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update provider_event_log for their projects"
ON public.provider_event_log FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for economic_days
CREATE POLICY "Users can view economic_days for their projects"
ON public.economic_days FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert economic_days for their projects"
ON public.economic_days FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update economic_days for their projects"
ON public.economic_days FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at on economic_days
CREATE TRIGGER update_economic_days_updated_at
BEFORE UPDATE ON public.economic_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
