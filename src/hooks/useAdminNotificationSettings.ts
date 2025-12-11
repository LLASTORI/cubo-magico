import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSetting {
  id: string;
  setting_key: string;
  setting_name: string;
  setting_description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useAdminNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notification_settings')
        .select('*')
        .order('setting_key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('admin_notification_settings')
        .update({ is_enabled: isEnabled })
        .eq('setting_key', settingKey);

      if (error) throw error;

      setSettings(prev => 
        prev.map(s => 
          s.setting_key === settingKey ? { ...s, is_enabled: isEnabled } : s
        )
      );

      toast({ 
        title: 'Configuração atualizada',
        description: `Notificação ${isEnabled ? 'ativada' : 'desativada'}` 
      });
    } catch (error: any) {
      toast({ 
        title: 'Erro ao atualizar', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, updateSetting, refetch: fetchSettings };
}
