/**
 * Experience Engine - Theme Selector
 * 
 * Allows users to select from saved themes or create new ones.
 */

import { useState } from 'react';
import { Palette, Plus, Star, Save, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useExperienceThemes, ExperienceThemeRecord } from '@/hooks/useExperienceThemes';
import { ExperienceTheme, DEFAULT_THEME } from './types';

interface ThemeSelectorProps {
  currentTheme: ExperienceTheme;
  onThemeSelect: (theme: ExperienceTheme) => void;
  onThemeChange: (theme: ExperienceTheme) => void;
}

export function ThemeSelector({ currentTheme, onThemeSelect, onThemeChange }: ThemeSelectorProps) {
  const { themes, isLoading, createTheme, deleteTheme, setDefaultTheme } = useExperienceThemes();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');

  const handleSaveTheme = async () => {
    if (!newThemeName.trim()) return;
    
    await createTheme.mutateAsync({
      name: newThemeName.trim(),
      description: newThemeDescription.trim() || undefined,
      config: currentTheme,
    });
    
    setNewThemeName('');
    setNewThemeDescription('');
    setSaveDialogOpen(false);
  };

  const handleSelectTheme = (theme: ExperienceThemeRecord) => {
    onThemeSelect(theme.config);
  };

  const handleDeleteTheme = async (id: string) => {
    await deleteTheme.mutateAsync(id);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultTheme.mutateAsync(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Temas Salvos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="h-5 w-5" />
          Temas Salvos
        </CardTitle>
        <CardDescription>
          Selecione um tema salvo ou crie um novo a partir das configurações atuais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Saved themes grid */}
        {themes.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {themes.map(theme => (
              <div
                key={theme.id}
                className="relative group rounded-lg border p-3 cursor-pointer hover:border-primary transition-all"
                onClick={() => handleSelectTheme(theme)}
              >
                {/* Color preview */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full border"
                    style={{ backgroundColor: theme.config.primary_color }}
                  />
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: theme.config.background_color }}
                  />
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: theme.config.text_color }}
                  />
                </div>
                
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm truncate">{theme.name}</span>
                  {theme.is_default && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                
                {theme.description && (
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {theme.description}
                  </p>
                )}

                {/* Actions on hover */}
                <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetDefault(theme.id);
                    }}
                    title="Definir como padrão"
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir tema?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o tema "{theme.name}"? 
                          Quizzes que usam este tema não serão afetados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTheme(theme.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum tema salvo ainda</p>
            <p className="text-xs">Personalize as cores acima e salve como tema</p>
          </div>
        )}

        {/* Save current as new theme */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Save className="h-4 w-4" />
              Salvar Configurações como Novo Tema
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar Tema</DialogTitle>
              <DialogDescription>
                Salve as configurações visuais atuais como um tema reutilizável
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <div
                  className="w-8 h-8 rounded-full border"
                  style={{ backgroundColor: currentTheme.primary_color }}
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: currentTheme.background_color }}
                />
                <div
                  className="w-6 h-6 rounded border"
                  style={{ backgroundColor: currentTheme.text_color }}
                />
                <span className="text-sm text-muted-foreground">Preview do tema</span>
              </div>

              <div className="space-y-2">
                <Label>Nome do Tema</Label>
                <Input
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Ex: Tema Corporativo Azul"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={newThemeDescription}
                  onChange={(e) => setNewThemeDescription(e.target.value)}
                  placeholder="Ex: Cores da marca para quizzes B2B"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveTheme} 
                disabled={!newThemeName.trim() || createTheme.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar Tema
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
