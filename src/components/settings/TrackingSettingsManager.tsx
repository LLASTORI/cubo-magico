import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  useTrackingSettings, 
  SYSTEM_EVENTS, 
  META_EVENTS, 
  GOOGLE_EVENTS, 
  TIKTOK_EVENTS,
  EventDispatchRule,
} from '@/hooks/useTrackingSettings';
import { Facebook, BarChart3, Music2, Plus, Trash2, Save, Activity } from 'lucide-react';
import { CubeLoader } from '@/components/CubeLoader';

export function TrackingSettingsManager() {
  const { settings, rules, isLoading, saveSettings, addRule, updateRule, deleteRule } = useTrackingSettings();
  
  const [pixelSettings, setPixelSettings] = useState({
    meta_pixel_id: settings?.meta_pixel_id || '',
    gtag_id: settings?.gtag_id || '',
    tiktok_pixel_id: settings?.tiktok_pixel_id || '',
    enable_browser_events: settings?.enable_browser_events ?? true,
    enable_server_events: settings?.enable_server_events ?? false,
  });

  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  const [newRule, setNewRule] = useState({
    system_event: '',
    provider: 'meta' as 'meta' | 'google' | 'tiktok',
    provider_event_name: '',
    is_enabled: true,
    payload_mapping: {},
  });

  // Update local state when settings load
  useState(() => {
    if (settings) {
      setPixelSettings({
        meta_pixel_id: settings.meta_pixel_id || '',
        gtag_id: settings.gtag_id || '',
        tiktok_pixel_id: settings.tiktok_pixel_id || '',
        enable_browser_events: settings.enable_browser_events ?? true,
        enable_server_events: settings.enable_server_events ?? false,
      });
    }
  });

  const handleSaveSettings = () => {
    saveSettings.mutate(pixelSettings);
  };

  const handleAddRule = () => {
    if (!newRule.system_event || !newRule.provider_event_name) return;
    
    addRule.mutate(newRule);
    setShowAddRuleDialog(false);
    setNewRule({
      system_event: '',
      provider: 'meta',
      provider_event_name: '',
      is_enabled: true,
      payload_mapping: {},
    });
  };

  const getProviderEvents = (provider: string) => {
    switch (provider) {
      case 'meta': return META_EVENTS;
      case 'google': return GOOGLE_EVENTS;
      case 'tiktok': return TIKTOK_EVENTS;
      default: return META_EVENTS;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'meta': return <Facebook className="h-4 w-4 text-blue-500" />;
      case 'google': return <BarChart3 className="h-4 w-4 text-yellow-500" />;
      case 'tiktok': return <Music2 className="h-4 w-4 text-pink-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <CubeLoader size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pixel Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Pixels de Rastreamento</CardTitle>
              <CardDescription>
                Configure seus pixels para rastrear eventos automaticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {/* Meta Pixel */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4 text-blue-500" />
                <Label>Meta Pixel ID</Label>
              </div>
              <Input
                value={pixelSettings.meta_pixel_id}
                onChange={(e) => setPixelSettings(s => ({ ...s, meta_pixel_id: e.target.value }))}
                placeholder="1234567890123456"
              />
            </div>

            {/* Google Tag */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-yellow-500" />
                <Label>Google Tag ID</Label>
              </div>
              <Input
                value={pixelSettings.gtag_id}
                onChange={(e) => setPixelSettings(s => ({ ...s, gtag_id: e.target.value }))}
                placeholder="G-XXXXXXXXXX ou AW-XXXXXXXXXX"
              />
            </div>

            {/* TikTok Pixel */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4 text-pink-500" />
                <Label>TikTok Pixel ID</Label>
              </div>
              <Input
                value={pixelSettings.tiktok_pixel_id}
                onChange={(e) => setPixelSettings(s => ({ ...s, tiktok_pixel_id: e.target.value }))}
                placeholder="XXXXXXXXXXXXXXXX"
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={pixelSettings.enable_browser_events}
                  onCheckedChange={(checked) => setPixelSettings(s => ({ ...s, enable_browser_events: checked }))}
                />
                <div>
                  <Label>Eventos no Navegador</Label>
                  <p className="text-sm text-muted-foreground">
                    Disparar eventos via JavaScript no navegador do usuário
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={pixelSettings.enable_server_events}
                  onCheckedChange={(checked) => setPixelSettings(s => ({ ...s, enable_server_events: checked }))}
                  disabled
                />
                <div>
                  <Label className="flex items-center gap-2">
                    Eventos no Servidor (CAPI)
                    <Badge variant="outline" className="text-xs">Em breve</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enviar eventos via Conversions API para melhor precisão
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={saveSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Mapping Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Mapeamento de Eventos</CardTitle>
                <CardDescription>
                  Defina quais eventos do sistema disparam eventos nos pixels
                </CardDescription>
              </div>
            </div>
            <Dialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Regra de Evento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Evento do Sistema</Label>
                    <Select
                      value={newRule.system_event}
                      onValueChange={(value) => setNewRule(r => ({ ...r, system_event: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um evento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SYSTEM_EVENTS.map((event) => (
                          <SelectItem key={event.value} value={event.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{event.source}</Badge>
                              {event.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={newRule.provider}
                      onValueChange={(value) => setNewRule(r => ({ 
                        ...r, 
                        provider: value as 'meta' | 'google' | 'tiktok',
                        provider_event_name: '',
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meta">
                          <div className="flex items-center gap-2">
                            <Facebook className="h-4 w-4 text-blue-500" />
                            Meta Pixel
                          </div>
                        </SelectItem>
                        <SelectItem value="google">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-yellow-500" />
                            Google Ads
                          </div>
                        </SelectItem>
                        <SelectItem value="tiktok">
                          <div className="flex items-center gap-2">
                            <Music2 className="h-4 w-4 text-pink-500" />
                            TikTok Pixel
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Evento da Plataforma</Label>
                    <Select
                      value={newRule.provider_event_name}
                      onValueChange={(value) => setNewRule(r => ({ ...r, provider_event_name: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um evento..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getProviderEvents(newRule.provider).map((event) => (
                          <SelectItem key={event.value} value={event.value}>
                            {event.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Evento Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    {newRule.provider_event_name === 'custom' && (
                      <Input
                        placeholder="Nome do evento personalizado"
                        className="mt-2"
                        onChange={(e) => setNewRule(r => ({ ...r, provider_event_name: e.target.value }))}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRule.is_enabled}
                      onCheckedChange={(checked) => setNewRule(r => ({ ...r, is_enabled: checked }))}
                    />
                    <Label>Ativo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddRuleDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddRule} disabled={addRule.isPending}>
                    Adicionar Regra
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {rules && rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento do Sistema</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Evento da Plataforma</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const systemEvent = SYSTEM_EVENTS.find(e => e.value === rule.system_event);
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {systemEvent?.source || 'system'}
                          </Badge>
                          {systemEvent?.label || rule.system_event}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getProviderIcon(rule.provider)}
                          {rule.provider === 'meta' && 'Meta'}
                          {rule.provider === 'google' && 'Google'}
                          {rule.provider === 'tiktok' && 'TikTok'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {rule.provider_event_name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_enabled}
                          onCheckedChange={(checked) => updateRule.mutate({ id: rule.id, is_enabled: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRule.mutate(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma regra de mapeamento configurada</p>
              <p className="text-sm mt-1">
                Adicione regras para disparar eventos nos seus pixels
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
