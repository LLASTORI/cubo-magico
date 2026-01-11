/**
 * Experience Engine - Templates Hook
 * 
 * Manages reusable layout templates for quizzes and surveys.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface TemplateConfig {
  layout: 'centered' | 'grid' | 'sidebar' | 'fullscreen';
  image_position: 'top' | 'left' | 'right' | 'background' | 'hidden';
  progress_style: 'bar' | 'dots' | 'percentage' | 'segments' | 'steps';
  navigation_style: 'buttons' | 'cards' | 'tap' | 'numbered';
  animation: 'slide' | 'fade' | 'slide-up' | 'none';
  cta_style: 'full_width' | 'inline' | 'outline' | 'floating';
}

export interface ExperienceTemplateRecord {
  id: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  slug: string;
  is_system: boolean;
  is_active: boolean;
  config: TemplateConfig;
  preview_image_url?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  layout: 'centered',
  image_position: 'top',
  progress_style: 'bar',
  navigation_style: 'buttons',
  animation: 'slide',
  cta_style: 'full_width',
};

export function useExperienceTemplates() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = currentProject?.id;

  // Fetch all templates (system + project-specific)
  const { data: templates = [], isLoading, error, refetch } = useQuery({
    queryKey: ['experience-templates', projectId],
    queryFn: async () => {
      // Fetch system templates
      const { data: systemTemplates, error: systemError } = await supabase
        .from('experience_templates')
        .select('*')
        .eq('is_system', true)
        .eq('is_active', true)
        .order('name');

      if (systemError) throw systemError;

      // Fetch project templates if project is selected
      let projectTemplates: any[] = [];
      if (projectId) {
        const { data, error } = await supabase
          .from('experience_templates')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        projectTemplates = data || [];
      }

      const allTemplates = [...(systemTemplates || []), ...projectTemplates];

      return allTemplates.map(template => ({
        ...template,
        config: (template.config || DEFAULT_TEMPLATE_CONFIG) as TemplateConfig,
      })) as ExperienceTemplateRecord[];
    },
    enabled: true, // Always fetch system templates
  });

  // Get template by slug
  const getTemplateBySlug = (slug: string): ExperienceTemplateRecord | undefined => {
    return templates.find(t => t.slug === slug);
  };

  // Get template by ID
  const getTemplateById = (id: string): ExperienceTemplateRecord | undefined => {
    return templates.find(t => t.id === id);
  };

  // Create a new project template
  const createTemplate = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      slug: string;
      config: TemplateConfig;
      preview_image_url?: string;
    }) => {
      if (!projectId) throw new Error('No project selected');

      const { data: template, error } = await supabase
        .from('experience_templates')
        .insert({
          project_id: projectId,
          name: data.name,
          description: data.description,
          slug: data.slug,
          config: data.config as unknown as Json,
          preview_image_url: data.preview_image_url,
          is_system: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-templates', projectId] });
      toast({ title: 'Template criado com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar template', description: err.message, variant: 'destructive' });
    },
  });

  // Update a project template
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      description: string;
      config: TemplateConfig;
      preview_image_url: string;
      is_active: boolean;
    }>) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.config) {
        updateData.config = updates.config as unknown as Json;
      }

      const { data, error } = await supabase
        .from('experience_templates')
        .update(updateData)
        .eq('id', id)
        .eq('is_system', false) // Can only update non-system templates
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-templates', projectId] });
      toast({ title: 'Template atualizado!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao atualizar template', description: err.message, variant: 'destructive' });
    },
  });

  // Delete a project template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('experience_templates')
        .delete()
        .eq('id', id)
        .eq('is_system', false); // Can only delete non-system templates

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experience-templates', projectId] });
      toast({ title: 'Template excluído!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir template', description: err.message, variant: 'destructive' });
    },
  });

  // Get system templates only
  const systemTemplates = templates.filter(t => t.is_system);
  
  // Get project templates only
  const projectTemplates = templates.filter(t => !t.is_system);

  // Get default template (conversational)
  const getDefaultTemplate = (): ExperienceTemplateRecord | undefined => {
    return templates.find(t => t.slug === 'conversational') || templates[0];
  };

  return {
    templates,
    systemTemplates,
    projectTemplates,
    isLoading,
    error,
    refetch,
    getTemplateBySlug,
    getTemplateById,
    getDefaultTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
