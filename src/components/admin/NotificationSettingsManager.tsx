import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, MonitorSmartphone, AlertTriangle, RefreshCcw, Loader2 } from 'lucide-react';
import { useAdminNotificationSettings } from '@/hooks/useAdminNotificationSettings';
import { Skeleton } from '@/components/ui/skeleton';

const settingIcons: Record<string, React.ReactNode> = {
  'sync_failure_email': <Mail className="w-5 h-5 text-blue-500" />,
  'sync_failure_inapp': <MonitorSmartphone className="w-5 h-5 text-green-500" />,
  'sync_critical_email': <AlertTriangle className="w-5 h-5 text-red-500" />,
  'sync_critical_inapp': <AlertTriangle className="w-5 h-5 text-orange-500" />,
};

const settingCategories = {
  sync: ['sync_failure_email', 'sync_failure_inapp', 'sync_critical_email', 'sync_critical_inapp'],
};

export function NotificationSettingsManager() {
  const { settings, loading, updateSetting } = useAdminNotificationSettings();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configurações de Notificações
          </CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const syncSettings = settings.filter(s => settingCategories.sync.includes(s.setting_key));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCcw className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Notificações de Sincronização</CardTitle>
              <CardDescription>
                Configure quais notificações o super admin deve receber sobre sincronizações
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncSettings.map(setting => (
            <div 
              key={setting.id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-lg">
                  {settingIcons[setting.setting_key] || <Bell className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{setting.setting_name}</p>
                    <Badge variant={setting.is_enabled ? 'default' : 'secondary'} className="text-xs">
                      {setting.is_enabled ? 'Ativo' : 'Desativado'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {setting.setting_description}
                  </p>
                </div>
              </div>
              <Switch
                checked={setting.is_enabled}
                onCheckedChange={(checked) => updateSetting(setting.setting_key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-amber-500">Importante</p>
              <p className="text-sm text-muted-foreground">
                As notificações de falha são enviadas apenas para usuários com role <strong>super_admin</strong>. 
                Certifique-se de que o RESEND_API_KEY está configurado para notificações por e-mail.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
