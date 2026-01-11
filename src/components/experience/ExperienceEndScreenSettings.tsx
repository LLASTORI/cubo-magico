/**
 * Experience End Screen Settings
 * 
 * Unified end screen configuration for Quiz and Survey.
 */

import { CheckCircle2, Share2, ExternalLink, Image, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { MediaPickerDialog } from '@/components/surveys/MediaPickerDialog';
import { ExperienceEndScreen, DEFAULT_END_SCREEN } from './types';

interface ExperienceEndScreenSettingsProps {
  config: ExperienceEndScreen;
  onChange: (config: ExperienceEndScreen) => void;
  type: 'quiz' | 'survey';
}

export function ExperienceEndScreenSettings({
  config,
  onChange,
  type,
}: ExperienceEndScreenSettingsProps) {
  const currentConfig = { ...DEFAULT_END_SCREEN, ...config };
  
  const updateConfig = (updates: Partial<ExperienceEndScreen>) => {
    onChange({ ...currentConfig, ...updates });
  };

  const typeLabel = type === 'quiz' ? 'quiz' : 'pesquisa';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5" />
            Tela Final
          </CardTitle>
          <CardDescription>
            Configure a tela de agradecimento do {typeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={currentConfig.headline || ''}
                onChange={(e) => updateConfig({ headline: e.target.value })}
                placeholder="Parabéns!"
              />
            </div>
            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Input
                value={currentConfig.subheadline || ''}
                onChange={(e) => updateConfig({ subheadline: e.target.value })}
                placeholder="Você completou com sucesso."
              />
            </div>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            <div className="flex items-center gap-3">
              {currentConfig.image_url && (
                <div className="relative h-16 w-16">
                  <img 
                    src={currentConfig.image_url} 
                    alt="Imagem final" 
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => updateConfig({ image_url: undefined })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <MediaPickerDialog
                value={currentConfig.image_url}
                onChange={(url) => updateConfig({ image_url: url })}
                label="Imagem Final"
                filterType="image"
              >
                <Button variant="outline" size="sm">
                  <Image className="h-4 w-4 mr-2" />
                  {currentConfig.image_url ? 'Alterar' : 'Selecionar'}
                </Button>
              </MediaPickerDialog>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Texto do CTA (opcional)</Label>
              <Input
                value={currentConfig.cta_text || ''}
                onChange={(e) => updateConfig({ cta_text: e.target.value })}
                placeholder="Acessar Conteúdo"
              />
            </div>
            <div className="space-y-2">
              <Label>URL do CTA</Label>
              <div className="flex gap-2">
                <Input
                  value={currentConfig.cta_url || ''}
                  onChange={(e) => updateConfig({ cta_url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                {currentConfig.cta_url && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(currentConfig.cta_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            {type === 'quiz' && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mostrar Resultados</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Exibe o resultado/perfil do usuário
                  </p>
                </div>
                <Switch
                  checked={currentConfig.show_results}
                  onCheckedChange={(checked) => updateConfig({ show_results: checked })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Botão de Compartilhar
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Permite o usuário compartilhar o resultado
                </p>
              </div>
              <Switch
                checked={currentConfig.show_share}
                onCheckedChange={(checked) => updateConfig({ show_share: checked })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
