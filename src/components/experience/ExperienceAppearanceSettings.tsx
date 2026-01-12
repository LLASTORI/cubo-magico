/**
 * Experience Appearance Settings
 * 
 * Unified appearance settings component used by both Quiz and Survey.
 * This is the SINGLE SOURCE OF TRUTH for appearance configuration.
 */

import { useState } from 'react';
import { Palette, Image, Type, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { MediaPickerDialog } from '@/components/surveys/MediaPickerDialog';
import { ExperienceTheme, ExperienceMessages, DEFAULT_THEME } from './types';

interface ExperienceAppearanceSettingsProps {
  theme: ExperienceTheme;
  messages: ExperienceMessages;
  onThemeChange: (theme: ExperienceTheme) => void;
  onMessagesChange: (messages: ExperienceMessages) => void;
  type: 'quiz' | 'survey';
}

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

const textColorPresets = [
  { name: 'Escuro', value: '#1e293b' },
  { name: 'Preto', value: '#000000' },
  { name: 'Cinza', value: '#64748b' },
  { name: 'Branco', value: '#ffffff' },
];

const secondaryTextPresets = [
  { name: 'Cinza', value: '#64748b' },
  { name: 'Cinza claro', value: '#94a3b8' },
  { name: 'Cinza escuro', value: '#475569' },
  { name: 'Branco suave', value: '#cbd5e1' },
];

export function ExperienceAppearanceSettings({
  theme,
  messages,
  onThemeChange,
  onMessagesChange,
  type,
}: ExperienceAppearanceSettingsProps) {
  const currentTheme = { ...DEFAULT_THEME, ...theme };
  
  const updateTheme = (updates: Partial<ExperienceTheme>) => {
    onThemeChange({ ...currentTheme, ...updates });
  };

  const typeLabel = type === 'quiz' ? 'quiz' : 'pesquisa';

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
            Personalize as cores do seu {typeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Color */}
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

          {/* Text Color */}
          <div className="space-y-3">
            <Label>Cor do Texto</Label>
            <div className="flex flex-wrap gap-2">
              {textColorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateTheme({ text_color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    currentTheme.text_color === color.value 
                      ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20' 
                      : 'border-muted'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={currentTheme.text_color}
                  onChange={(e) => updateTheme({ text_color: e.target.value })}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={currentTheme.text_color}
                  onChange={(e) => updateTheme({ text_color: e.target.value })}
                  className="w-24 font-mono text-sm"
                  placeholder="#1e293b"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cor de títulos e textos das perguntas
            </p>
          </div>

          {/* Secondary Text Color */}
          <div className="space-y-3">
            <Label>Cor do Texto Secundário</Label>
            <div className="flex flex-wrap gap-2">
              {secondaryTextPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateTheme({ secondary_text_color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    currentTheme.secondary_text_color === color.value 
                      ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20' 
                      : 'border-muted'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={currentTheme.secondary_text_color}
                  onChange={(e) => updateTheme({ secondary_text_color: e.target.value })}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={currentTheme.secondary_text_color}
                  onChange={(e) => updateTheme({ secondary_text_color: e.target.value })}
                  className="w-24 font-mono text-sm"
                  placeholder="#64748b"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cor de placeholders, indicadores, navegação e dicas
            </p>
          </div>

          {/* Input Text Color */}
          <div className="space-y-3">
            <Label>Cor do Texto das Respostas</Label>
            <div className="flex flex-wrap gap-2">
              {textColorPresets.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateTheme({ input_text_color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    currentTheme.input_text_color === color.value 
                      ? 'border-foreground ring-2 ring-offset-2 ring-foreground/20' 
                      : 'border-muted'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={currentTheme.input_text_color}
                  onChange={(e) => updateTheme({ input_text_color: e.target.value })}
                  className="w-10 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={currentTheme.input_text_color}
                  onChange={(e) => updateTheme({ input_text_color: e.target.value })}
                  className="w-24 font-mono text-sm"
                  placeholder="#1e293b"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Cor do texto digitado pelo respondente nos campos
            </p>
          </div>

          {/* Benefits list colors (Quiz start screen) */}
          {type === 'quiz' && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-1">
                <Label>Lista de Benefícios</Label>
                <p className="text-xs text-muted-foreground">
                  Configure as cores do texto e do ícone do bloco de benefícios na tela inicial
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Cor do Ícone</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={currentTheme.benefits_icon_color || currentTheme.primary_color}
                      onChange={(e) => updateTheme({ benefits_icon_color: e.target.value })}
                      className="w-10 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={currentTheme.benefits_icon_color || currentTheme.primary_color}
                      onChange={(e) => updateTheme({ benefits_icon_color: e.target.value })}
                      className="w-24 font-mono text-sm"
                      placeholder={currentTheme.primary_color}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTheme({ benefits_icon_color: currentTheme.primary_color })}
                    >
                      Usar Principal
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Cor do Texto</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      value={currentTheme.benefits_text_color || currentTheme.secondary_text_color}
                      onChange={(e) => updateTheme({ benefits_text_color: e.target.value })}
                      className="w-10 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={currentTheme.benefits_text_color || currentTheme.secondary_text_color}
                      onChange={(e) => updateTheme({ benefits_text_color: e.target.value })}
                      className="w-24 font-mono text-sm"
                      placeholder={currentTheme.secondary_text_color}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateTheme({ benefits_text_color: currentTheme.secondary_text_color })}
                    >
                      Usar Secundária
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Background Color */}
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

          {/* Option Button Colors */}
          <div className="space-y-3 pt-4 border-t">
            <div className="space-y-1">
              <Label className="text-base font-medium">Cores dos Botões de Opção</Label>
              <p className="text-xs text-muted-foreground">
                Configure as cores dos botões de resposta das perguntas
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option Background */}
              <div className="space-y-2">
                <Label className="text-sm">Fundo do Botão</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentTheme.option_background_color || '#1e293b'}
                    onChange={(e) => updateTheme({ option_background_color: e.target.value })}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={currentTheme.option_background_color || '#1e293b'}
                    onChange={(e) => updateTheme({ option_background_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#1e293b"
                  />
                </div>
              </div>

              {/* Option Hover */}
              <div className="space-y-2">
                <Label className="text-sm">Fundo ao Passar o Mouse</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentTheme.option_hover_color || '#334155'}
                    onChange={(e) => updateTheme({ option_hover_color: e.target.value })}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={currentTheme.option_hover_color || '#334155'}
                    onChange={(e) => updateTheme({ option_hover_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#334155"
                  />
                </div>
              </div>

              {/* Option Text */}
              <div className="space-y-2">
                <Label className="text-sm">Texto do Botão</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentTheme.option_text_color || '#ffffff'}
                    onChange={(e) => updateTheme({ option_text_color: e.target.value })}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={currentTheme.option_text_color || '#ffffff'}
                    onChange={(e) => updateTheme({ option_text_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              {/* Option Border */}
              <div className="space-y-2">
                <Label className="text-sm">Borda do Botão</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={currentTheme.option_border_color || '#334155'}
                    onChange={(e) => updateTheme({ option_border_color: e.target.value })}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={currentTheme.option_border_color || '#334155'}
                    onChange={(e) => updateTheme({ option_border_color: e.target.value })}
                    className="flex-1 font-mono text-sm"
                    placeholder="#334155"
                  />
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({
                  option_background_color: '#1e293b',
                  option_hover_color: '#334155',
                  option_text_color: '#ffffff',
                  option_border_color: '#334155',
                })}
              >
                Dark (padrão)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({
                  option_background_color: '#ffffff',
                  option_hover_color: '#f1f5f9',
                  option_text_color: '#1e293b',
                  option_border_color: '#e2e8f0',
                })}
              >
                Light
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({
                  option_background_color: '#0f172a',
                  option_hover_color: '#1e3a5f',
                  option_text_color: '#ffffff',
                  option_border_color: '#1e3a5f',
                })}
              >
                Ocean
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTheme({
                  option_background_color: '#064e3b',
                  option_hover_color: '#047857',
                  option_text_color: '#ffffff',
                  option_border_color: '#047857',
                })}
              >
                Emerald
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
            Adicione sua logo e imagem de fundo da biblioteca de mídias
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {currentTheme.logo_url && (
                <div className="relative h-12 w-auto">
                  <img 
                    src={currentTheme.logo_url} 
                    alt="Logo" 
                    className="h-12 w-auto object-contain rounded border bg-muted/50 p-1"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => updateTheme({ logo_url: undefined })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <MediaPickerDialog
                value={currentTheme.logo_url}
                onChange={(url) => updateTheme({ logo_url: url })}
                label="Logo"
                filterType="image"
              >
                <Button variant="outline" size="sm">
                  <Image className="h-4 w-4 mr-2" />
                  {currentTheme.logo_url ? 'Alterar logo' : 'Selecionar logo'}
                </Button>
              </MediaPickerDialog>
            </div>
            <p className="text-xs text-muted-foreground">
              A logo aparecerá nas telas de boas-vindas e agradecimento
            </p>
          </div>

          {/* Background Image */}
          <div className="space-y-2">
            <Label>Imagem de Fundo (opcional)</Label>
            <div className="flex items-center gap-3">
              {currentTheme.background_image && (
                <div className="relative h-16 w-24">
                  <img 
                    src={currentTheme.background_image} 
                    alt="Fundo" 
                    className="h-16 w-24 object-cover rounded border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={() => updateTheme({ background_image: undefined })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <MediaPickerDialog
                value={currentTheme.background_image}
                onChange={(url) => updateTheme({ background_image: url })}
                label="Imagem de Fundo"
                filterType="image"
              >
                <Button variant="outline" size="sm">
                  <Image className="h-4 w-4 mr-2" />
                  {currentTheme.background_image ? 'Alterar fundo' : 'Selecionar fundo'}
                </Button>
              </MediaPickerDialog>
            </div>
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
            Personalize as mensagens exibidas no {typeLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem de Boas-vindas</Label>
            <Textarea
              value={messages.welcome_message || ''}
              onChange={(e) => onMessagesChange({ ...messages, welcome_message: e.target.value || undefined })}
              placeholder={`Olá! Obrigado por participar deste ${typeLabel}...`}
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
            Configure como o {typeLabel} será apresentado
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
