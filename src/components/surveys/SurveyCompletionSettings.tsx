import { useState } from 'react';
import { Gift, Link2, Clock, Plus, Trash2, ExternalLink, MousePointer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface CTAButton {
  id: string;
  label: string;
  url: string;
  style: 'primary' | 'secondary' | 'outline';
  open_in_new_tab: boolean;
}

export interface CompletionSettings {
  // Redirect settings
  enable_auto_redirect: boolean;
  redirect_url?: string;
  redirect_delay_seconds: number;
  
  // CTA Buttons
  cta_buttons: CTAButton[];
  
  // Reward message
  reward_message?: string;
  reward_highlight?: string;
}

interface SurveyCompletionSettingsProps {
  settings: CompletionSettings;
  onChange: (settings: CompletionSettings) => void;
}

const defaultSettings: CompletionSettings = {
  enable_auto_redirect: false,
  redirect_delay_seconds: 5,
  cta_buttons: [],
};

export function SurveyCompletionSettings({
  settings,
  onChange,
}: SurveyCompletionSettingsProps) {
  const currentSettings = { ...defaultSettings, ...settings };
  
  const updateSettings = (updates: Partial<CompletionSettings>) => {
    onChange({ ...currentSettings, ...updates });
  };

  const addButton = () => {
    const newButton: CTAButton = {
      id: crypto.randomUUID(),
      label: 'Acessar Recompensa',
      url: '',
      style: 'primary',
      open_in_new_tab: true,
    };
    updateSettings({
      cta_buttons: [...currentSettings.cta_buttons, newButton],
    });
  };

  const updateButton = (id: string, updates: Partial<CTAButton>) => {
    updateSettings({
      cta_buttons: currentSettings.cta_buttons.map(btn =>
        btn.id === id ? { ...btn, ...updates } : btn
      ),
    });
  };

  const removeButton = (id: string) => {
    updateSettings({
      cta_buttons: currentSettings.cta_buttons.filter(btn => btn.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* CTA Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MousePointer className="h-5 w-5" />
            Botões de Ação (CTA)
          </CardTitle>
          <CardDescription>
            Adicione botões para direcionar o usuário após concluir a pesquisa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentSettings.cta_buttons.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <MousePointer className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum botão configurado
              </p>
              <Button onClick={addButton} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Botão
              </Button>
            </div>
          ) : (
            <>
              {currentSettings.cta_buttons.map((button, index) => (
                <div 
                  key={button.id} 
                  className="p-4 border rounded-lg space-y-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Botão {index + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeButton(button.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Texto do Botão</Label>
                      <Input
                        value={button.label}
                        onChange={(e) => updateButton(button.id, { label: e.target.value })}
                        placeholder="Ex: Entrar no Grupo VIP"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Estilo</Label>
                      <Select
                        value={button.style}
                        onValueChange={(value: CTAButton['style']) => 
                          updateButton(button.id, { style: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="primary">Primário (destaque)</SelectItem>
                          <SelectItem value="secondary">Secundário</SelectItem>
                          <SelectItem value="outline">Contorno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>URL de Destino</Label>
                    <div className="flex gap-2">
                      <Input
                        value={button.url}
                        onChange={(e) => updateButton(button.id, { url: e.target.value })}
                        placeholder="https://chat.whatsapp.com/..."
                        className="flex-1"
                      />
                      {button.url && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => window.open(button.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`new-tab-${button.id}`}
                      checked={button.open_in_new_tab}
                      onCheckedChange={(checked) => 
                        updateButton(button.id, { open_in_new_tab: checked })
                      }
                    />
                    <Label htmlFor={`new-tab-${button.id}`} className="text-sm">
                      Abrir em nova aba
                    </Label>
                  </div>
                </div>
              ))}
              
              {currentSettings.cta_buttons.length < 3 && (
                <Button onClick={addButton} variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Outro Botão
                </Button>
              )}
            </>
          )}
          
          <p className="text-xs text-muted-foreground">
            Máximo de 3 botões. Ideal para grupos de WhatsApp, aulas bônus, materiais exclusivos, etc.
          </p>
        </CardContent>
      </Card>

      {/* Auto Redirect */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Redirecionamento Automático
          </CardTitle>
          <CardDescription>
            Redirecione automaticamente após alguns segundos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar redirecionamento automático</Label>
              <p className="text-xs text-muted-foreground mt-1">
                O usuário será redirecionado automaticamente após o tempo definido
              </p>
            </div>
            <Switch
              checked={currentSettings.enable_auto_redirect}
              onCheckedChange={(checked) => updateSettings({ enable_auto_redirect: checked })}
            />
          </div>
          
          {currentSettings.enable_auto_redirect && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>URL de Redirecionamento</Label>
                <Input
                  value={currentSettings.redirect_url || ''}
                  onChange={(e) => updateSettings({ redirect_url: e.target.value })}
                  placeholder="https://seu-site.com/obrigado"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tempo de espera (segundos)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={currentSettings.redirect_delay_seconds}
                    onChange={(e) => updateSettings({ 
                      redirect_delay_seconds: parseInt(e.target.value) || 5 
                    })}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    segundos
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reward Message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="h-5 w-5" />
            Mensagem de Recompensa
          </CardTitle>
          <CardDescription>
            Destaque uma recompensa ou benefício especial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Destaque (opcional)</Label>
            <Input
              value={currentSettings.reward_highlight || ''}
              onChange={(e) => updateSettings({ reward_highlight: e.target.value || undefined })}
              placeholder="Ex: 🎁 Você ganhou acesso exclusivo!"
            />
            <p className="text-xs text-muted-foreground">
              Aparece em destaque antes da mensagem de agradecimento
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Mensagem de Recompensa (opcional)</Label>
            <Textarea
              value={currentSettings.reward_message || ''}
              onChange={(e) => updateSettings({ reward_message: e.target.value || undefined })}
              placeholder="Ex: Como agradecimento por participar, liberamos uma aula exclusiva para você!"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
