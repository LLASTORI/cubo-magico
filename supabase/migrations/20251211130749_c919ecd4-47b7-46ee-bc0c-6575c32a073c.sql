-- Create admin notification settings table
CREATE TABLE public.admin_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_name text NOT NULL,
  setting_description text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage notification settings
CREATE POLICY "Super admins can view notification settings"
ON public.admin_notification_settings
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage notification settings"
ON public.admin_notification_settings
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Insert default notification settings
INSERT INTO public.admin_notification_settings (setting_key, setting_name, setting_description, is_enabled) VALUES
('sync_failure_email', 'E-mail de Falha de Sync', 'Enviar e-mail quando a sincronização automática falhar', true),
('sync_failure_inapp', 'Notificação In-App de Falha de Sync', 'Criar notificação no sistema quando a sincronização automática falhar', true),
('sync_critical_email', 'E-mail de Erro Crítico', 'Enviar e-mail quando ocorrer erro crítico no sistema', true),
('sync_critical_inapp', 'Notificação In-App de Erro Crítico', 'Criar notificação no sistema para erros críticos', true);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_notification_settings_updated_at
BEFORE UPDATE ON public.admin_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();