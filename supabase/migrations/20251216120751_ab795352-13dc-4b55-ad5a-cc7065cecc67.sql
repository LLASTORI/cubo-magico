-- =============================================
-- MÓDULO WHATSAPP CRM - FASE 1: SCHEMA
-- =============================================

-- Números WhatsApp por projeto
CREATE TABLE public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Principal',
  priority INTEGER NOT NULL DEFAULT 0, -- 0 = principal, 1+ = backup
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, offline, banned
  provider TEXT NOT NULL DEFAULT 'evolution',
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, phone_number)
);

-- Instâncias Evolution API (sessões de conexão)
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  instance_key TEXT,
  api_url TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected, connecting, connected, qr_pending
  qr_code TEXT,
  qr_expires_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_name)
);

-- Conversas WhatsApp (vinculadas ao CRM)
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  remote_jid TEXT NOT NULL, -- número do cliente no formato WhatsApp
  status TEXT NOT NULL DEFAULT 'open', -- open, closed, archived
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, remote_jid)
);

-- Mensagens WhatsApp
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  direction TEXT NOT NULL, -- inbound, outbound
  content_type TEXT NOT NULL DEFAULT 'text', -- text, image, audio, video, document, sticker
  content TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  external_id TEXT, -- ID da mensagem no WhatsApp
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, read, failed
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_numbers_project ON public.whatsapp_numbers(project_id);
CREATE INDEX idx_whatsapp_numbers_status ON public.whatsapp_numbers(status);
CREATE INDEX idx_whatsapp_conversations_project ON public.whatsapp_conversations(project_id);
CREATE INDEX idx_whatsapp_conversations_contact ON public.whatsapp_conversations(contact_id);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: whatsapp_numbers
CREATE POLICY "Members can view whatsapp numbers"
  ON public.whatsapp_numbers FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Managers and owners can manage whatsapp numbers"
  ON public.whatsapp_numbers FOR ALL
  USING (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'))
  WITH CHECK (get_user_project_role(auth.uid(), project_id) IN ('owner', 'manager'));

CREATE POLICY "Super admins can manage all whatsapp numbers"
  ON public.whatsapp_numbers FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies: whatsapp_instances
CREATE POLICY "Members can view whatsapp instances"
  ON public.whatsapp_instances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_numbers wn
    WHERE wn.id = whatsapp_number_id
    AND has_project_access(auth.uid(), wn.project_id)
  ));

CREATE POLICY "Managers and owners can manage whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_numbers wn
    WHERE wn.id = whatsapp_number_id
    AND get_user_project_role(auth.uid(), wn.project_id) IN ('owner', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_numbers wn
    WHERE wn.id = whatsapp_number_id
    AND get_user_project_role(auth.uid(), wn.project_id) IN ('owner', 'manager')
  ));

CREATE POLICY "Super admins can manage all whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies: whatsapp_conversations
CREATE POLICY "Members can view whatsapp conversations"
  ON public.whatsapp_conversations FOR SELECT
  USING (has_project_access(auth.uid(), project_id));

CREATE POLICY "Members can manage whatsapp conversations"
  ON public.whatsapp_conversations FOR ALL
  USING (has_project_access(auth.uid(), project_id))
  WITH CHECK (has_project_access(auth.uid(), project_id));

CREATE POLICY "Super admins can manage all whatsapp conversations"
  ON public.whatsapp_conversations FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policies: whatsapp_messages
CREATE POLICY "Members can view whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = conversation_id
    AND has_project_access(auth.uid(), wc.project_id)
  ));

CREATE POLICY "Members can insert whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = conversation_id
    AND has_project_access(auth.uid(), wc.project_id)
  ));

CREATE POLICY "Members can update whatsapp messages"
  ON public.whatsapp_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    WHERE wc.id = conversation_id
    AND has_project_access(auth.uid(), wc.project_id)
  ));

CREATE POLICY "Super admins can manage all whatsapp messages"
  ON public.whatsapp_messages FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_whatsapp_numbers_updated_at
  BEFORE UPDATE ON public.whatsapp_numbers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para mensagens (chat em tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;