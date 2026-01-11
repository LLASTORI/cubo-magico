-- Phase 9: Event Orchestration Layer
-- System Events table for unified event storage
CREATE TABLE public.system_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- quiz, survey, crm, social, checkout
  event_name TEXT NOT NULL,
  session_id UUID, -- optional reference to quiz/survey session
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  external_dispatch_status JSONB NOT NULL DEFAULT '{}', -- {meta: {dispatched: true, at: ...}, google: {...}}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project tracking settings for pixel configuration
CREATE TABLE public.project_tracking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE UNIQUE,
  meta_pixel_id TEXT,
  gtag_id TEXT,
  tiktok_pixel_id TEXT,
  enable_browser_events BOOLEAN NOT NULL DEFAULT true,
  enable_server_events BOOLEAN NOT NULL DEFAULT false, -- future CAPI support
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event dispatch rules for mapping system events to external pixels
CREATE TABLE public.event_dispatch_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  system_event TEXT NOT NULL, -- quiz_started, quiz_completed, etc.
  provider TEXT NOT NULL, -- meta, google, tiktok
  provider_event_name TEXT NOT NULL, -- Lead, CompleteRegistration, custom_event
  payload_mapping JSONB NOT NULL DEFAULT '{}', -- how to transform payload
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, system_event, provider)
);

-- Quiz-specific tracking overrides
ALTER TABLE public.quizzes 
  ADD COLUMN IF NOT EXISTS enable_pixel_events BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pixel_event_overrides JSONB NOT NULL DEFAULT '{}';

-- Indexes for performance
CREATE INDEX idx_system_events_project_source ON public.system_events(project_id, source);
CREATE INDEX idx_system_events_project_event ON public.system_events(project_id, event_name);
CREATE INDEX idx_system_events_created_at ON public.system_events(created_at DESC);
CREATE INDEX idx_system_events_contact ON public.system_events(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_event_dispatch_rules_project ON public.event_dispatch_rules(project_id, system_event);

-- Enable RLS
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tracking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_dispatch_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_events
CREATE POLICY "Users can view system events for their projects" ON public.system_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = system_events.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert events" ON public.system_events
  FOR INSERT WITH CHECK (true);

-- RLS Policies for project_tracking_settings  
CREATE POLICY "Users can view tracking settings for their projects" ON public.project_tracking_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tracking_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tracking settings for their projects" ON public.project_tracking_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_tracking_settings.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS Policies for event_dispatch_rules
CREATE POLICY "Users can view dispatch rules for their projects" ON public.event_dispatch_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = event_dispatch_rules.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage dispatch rules for their projects" ON public.event_dispatch_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = event_dispatch_rules.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_project_tracking_settings_updated_at
  BEFORE UPDATE ON public.project_tracking_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_dispatch_rules_updated_at
  BEFORE UPDATE ON public.event_dispatch_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();