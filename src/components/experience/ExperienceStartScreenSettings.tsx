/**
 * Experience Start Screen Settings
 * 
 * Unified start screen configuration for Quiz and Survey.
 */

import { Play, Clock, Plus, Trash2, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MediaPickerDialog } from '@/components/surveys/MediaPickerDialog';
import { ExperienceStartScreen, DEFAULT_START_SCREEN } from './types';
import { Image, X } from 'lucide-react';

interface ExperienceStartScreenSettingsProps {
  config: ExperienceStartScreen;
  onChange: (config: ExperienceStartScreen) => void;
  type: 'quiz' | 'survey';
}

export function ExperienceStartScreenSettings({
  config,
  onChange,
  type,
}: ExperienceStartScreenSettingsProps) {
  const currentConfig = { ...DEFAULT_START_SCREEN, ...config };
  
  const updateConfig = (updates: Partial<ExperienceStartScreen>) => {
    onChange({ ...currentConfig, ...updates });
  };

  const addBenefit = () => {
    const benefits = [...(currentConfig.benefits || []), ''];
    updateConfig({ benefits });
  };

  const updateBenefit = (index: number, value: string) => {
    const benefits = [...(currentConfig.benefits || [])];
    benefits[index] = value;
    updateConfig({ benefits });
  };

  const removeBenefit = (index: number) => {
    const benefits = [...(currentConfig.benefits || [])];
    benefits.splice(index, 1);
    updateConfig({ benefits });
  };

  const typeLabel = type === 'quiz' ? 'quiz' : 'pesquisa';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Play className="h-5 w-5" />
            Tela Inicial
          </CardTitle>
          <CardDescription>
            Configure a tela de boas-vindas do {typeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Título Principal</Label>
              <Input
                value={currentConfig.headline || ''}
                onChange={(e) => updateConfig({ headline: e.target.value })}
                placeholder={`Descubra seu perfil...`}
              />
            </div>
            <div className="space-y-2">
              <Label>Texto do Botão</Label>
              <Input
                value={currentConfig.cta_text || ''}
                onChange={(e) => updateConfig({ cta_text: e.target.value })}
                placeholder="Começar"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Textarea
              value={currentConfig.subheadline || ''}
              onChange={(e) => updateConfig({ subheadline: e.target.value })}
              placeholder="Responda algumas perguntas e descubra insights valiosos..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição Adicional (opcional)</Label>
            <Textarea
              value={currentConfig.description || ''}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="Informações adicionais sobre o que será abordado..."
              rows={2}
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            <div className="flex items-center gap-3">
              {currentConfig.image_url && (
                <div className="relative h-16 w-16">
                  <img 
                    src={currentConfig.image_url} 
                    alt="Imagem inicial" 
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
                label="Imagem Inicial"
                filterType="image"
              >
                <Button variant="outline" size="sm">
                  <Image className="h-4 w-4 mr-2" />
                  {currentConfig.image_url ? 'Alterar' : 'Selecionar'}
                </Button>
              </MediaPickerDialog>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tempo Estimado
            </Label>
            <Input
              value={currentConfig.estimated_time || ''}
              onChange={(e) => updateConfig({ estimated_time: e.target.value })}
              placeholder="2 minutos"
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Benefits List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5" />
            Lista de Benefícios
          </CardTitle>
          <CardDescription>
            Adicione pontos que serão exibidos na tela inicial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(currentConfig.benefits || []).length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <ListChecks className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum benefício adicionado
              </p>
              <Button onClick={addBenefit} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Benefício
              </Button>
            </div>
          ) : (
            <>
              {(currentConfig.benefits || []).map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    placeholder="Ex: Perguntas rápidas e objetivas"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeBenefit(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button onClick={addBenefit} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Benefício
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
