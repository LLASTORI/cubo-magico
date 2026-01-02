import { useState } from 'react';
import { Palette, Image, Type, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export interface SurveyTheme {
  primary_color: string;
  background_color: string;
  background_image?: string;
  logo_url?: string;
  show_progress: boolean;
  one_question_per_page: boolean;
}

export interface SurveyMessages {
  welcome_message?: string;
  thank_you_message?: string;
}

interface SurveyAppearanceSettingsProps {
  theme: SurveyTheme;
  messages: SurveyMessages;
  onThemeChange: (theme: SurveyTheme) => void;
  onMessagesChange: (messages: SurveyMessages) => void;
}

const defaultTheme: SurveyTheme = {
  primary_color: '#6366f1',
  background_color: '#f8fafc',
  show_progress: true,
  one_question_per_page: true,
};

const presetColors = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
];

export function SurveyAppearanceSettings({
  theme,
  messages,
  onThemeChange,
  onMessagesChange,
}: SurveyAppearanceSettingsProps) {
  const currentTheme = { ...defaultTheme, ...theme };
  
  const updateTheme = (updates: Partial<SurveyTheme>) => {
    onThemeChange({ ...currentTheme, ...updates });
  };

  return (
    <div className="space-y-6">
      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Cores
          </CardTitle>
          <CardDescription>
            Personalize as cores da sua pesquisa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Cor Principal</Label>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateTheme({ primary_color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    currentTheme.primary_color === color.value 
                      ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20' 
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={currentTheme.primary_color}
                  onChange={(e) => updateTheme({ primary_color: e.target.value })}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={currentTheme.primary_color}
                  onChange={(e) => updateTheme({ primary_color: e.target.value })}
                  className="w-24 font-mono text-sm"
                  placeholder="#6366f1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Cor de Fundo</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={currentTheme.background_color}
                onChange={(e) => updateTheme({ background_color: e.target.value })}
                className="w-10 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={currentTheme.background_color}
                onChange={(e) => updateTheme({ background_color: e.target.value })}
                className="w-24 font-mono text-sm"
                placeholder="#f8fafc"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({ background_color: '#ffffff' })}
              >
                Branco
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({ background_color: '#f8fafc' })}
              >
                Cinza claro
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({ background_color: '#0f172a' })}
              >
                Escuro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Adicione sua logo e imagem de fundo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL da Logo</Label>
            <Input
              type="url"
              value={currentTheme.logo_url || ''}
              onChange={(e) => updateTheme({ logo_url: e.target.value || undefined })}
              placeholder="https://sua-empresa.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              A logo aparecerá nas telas de boas-vindas e agradecimento
            </p>
          </div>

          <div className="space-y-2">
            <Label>URL da Imagem de Fundo (opcional)</Label>
            <Input
              type="url"
              value={currentTheme.background_image || ''}
              onChange={(e) => updateTheme({ background_image: e.target.value || undefined })}
              placeholder="https://sua-empresa.com/background.jpg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="h-5 w-5" />
            Mensagens
          </CardTitle>
          <CardDescription>
            Personalize as mensagens exibidas na pesquisa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem de Boas-vindas</Label>
            <Textarea
              value={messages.welcome_message || ''}
              onChange={(e) => onMessagesChange({ ...messages, welcome_message: e.target.value || undefined })}
              placeholder="Olá! Obrigado por participar desta pesquisa..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Mensagem de Agradecimento</Label>
            <Textarea
              value={messages.thank_you_message || ''}
              onChange={(e) => onMessagesChange({ ...messages, thank_you_message: e.target.value || undefined })}
              placeholder="Obrigado por participar! Sua opinião é muito importante para nós."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Exibição
          </CardTitle>
          <CardDescription>
            Configure como a pesquisa será apresentada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Mostrar barra de progresso</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Exibe o progresso do respondente no topo
              </p>
            </div>
            <Switch
              checked={currentTheme.show_progress}
              onCheckedChange={(checked) => updateTheme({ show_progress: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Uma pergunta por vez</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Exibe perguntas uma de cada vez com transições
              </p>
            </div>
            <Switch
              checked={currentTheme.one_question_per_page}
              onCheckedChange={(checked) => updateTheme({ one_question_per_page: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
