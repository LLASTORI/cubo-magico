/**
 * Experience Engine - Themes Hook
 * 
 * Manages reusable visual themes for quizzes and surveys.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { ExperienceTheme, DEFAULT_THEME } from '@/components/experience/types';
import { Json } from '@/integrations/supabase/types';

export interface ExperienceThemeRecord {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  is_default: boolean;
  config: ExperienceTheme;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export function useExperienceThemes() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = currentProject?.id;

  // Fetch all themes for the project
  const { data: themes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['experience-themes', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('experience_themes')
        .select('*')
        .eq('project_id', projectId)
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;

      return (data || []).map(theme => ({
        ...theme,
        config: (theme.config || DEFAULT_THEME) as ExperienceTheme,
      })) as ExperienceThemeRecord[];
    },
    enabled: !!projectId,
  });

  // Create a new theme
  const createTheme = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      config: ExperienceTheme;
      is_default?: boolean;
    }) => {
      if (!projectId) throw new Error('No project selected');

      const { data: theme, error } = await supabase
        .from('experience_themes')
        .insert({
          project_id: projectId,
          name: data.name,
          description: data.description,
          config: data.config as unknown as Json,
          is_default: data.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return theme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-themes', projectId] });
      toast({ title: 'Tema criado com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar tema', description: err.message, variant: 'destructive' });
    },
  });

  // Update a theme
  const updateTheme = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      description: string;
      config: ExperienceTheme;
      is_default: boolean;
    }>) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.config) {
        updateData.config = updates.config as unknown as Json;
      }

      const { data, error } = await supabase
        .from('experience_themes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-themes', projectId] });
      toast({ title: 'Tema atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar tema', description: err.message, variant: 'destructive' });
    },
  });

  // Delete a theme
  const deleteTheme = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('experience_themes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-themes', projectId] });
      toast({ title: 'Tema excluído!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir tema', description: err.message, variant: 'destructive' });
    },
  });

  // Set a theme as default
  const setDefaultTheme = useMutation({
    mutationFn: async (id: string) => {
      if (!projectId) throw new Error('No project selected');

      // First, unset all defaults
      await supabase
        .from('experience_themes')
        .update({ is_default: false })
        .eq('project_id', projectId);

      // Then set the new default
      const { data, error } = await supabase
        .from('experience_themes')
        .update({ is_default: true })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-themes', projectId] });
      toast({ title: 'Tema definido como padrão!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao definir tema padrão', description: err.message, variant: 'destructive' });
    },
  });

  // Save current theme as new
  const saveAsTheme = async (name: string, config: ExperienceTheme, description?: string) => {
    return createTheme.mutateAsync({ name, config, description });
  };

  // Get default theme or first theme
  const getDefaultTheme = (): ExperienceTheme => {
    const defaultTheme = themes.find(t => t.is_default);
    if (defaultTheme) return defaultTheme.config;
    if (themes.length > 0) return themes[0].config;
    return DEFAULT_THEME;
  };

  return {
    themes,
    isLoading,
    error,
    refetch,
    createTheme,
    updateTheme,
    deleteTheme,
    setDefaultTheme,
    saveAsTheme,
    getDefaultTheme,
  };
}
