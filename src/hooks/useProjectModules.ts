import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ModuleKey = 'crm' | 'meta_ads' | 'analytics';

export interface ProjectModule {
  id: string;
  project_id: string;
  module_key: ModuleKey;
  is_enabled: boolean;
  enabled_at: string | null;
  enabled_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleInfo {
  key: ModuleKey;
  name: string;
  description: string;
  icon: string;
}

export const AVAILABLE_MODULES: ModuleInfo[] = [
  {
    key: 'crm',
    name: 'CRM',
    description: 'Gestão de contatos, jornada do cliente e entrada de leads via webhook',
    icon: 'users',
  },
  {
    key: 'meta_ads',
    name: 'Meta Ads',
    description: 'Integração com Facebook e Instagram Ads para análise de ROI',
    icon: 'facebook',
  },
  {
    key: 'analytics',
    name: 'Analytics Avançado',
    description: 'Dashboards e relatórios avançados de performance',
    icon: 'chart',
  },
];

export function useProjectModules() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: modules, isLoading } = useQuery({
    queryKey: ['project-modules', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return (data || []) as ProjectModule[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ moduleKey, enabled }: { moduleKey: ModuleKey; enabled: boolean }) => {
      if (!projectId || !user?.id) throw new Error('Projeto não selecionado');

      // Check if module record exists
      const { data: existing } = await supabase
        .from('project_modules')
        .select('id')
        .eq('project_id', projectId)
        .eq('module_key', moduleKey)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('project_modules')
          .update({
            is_enabled: enabled,
            enabled_at: enabled ? new Date().toISOString() : null,
            enabled_by: enabled ? user.id : null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('project_modules')
          .insert({
            project_id: projectId,
            module_key: moduleKey,
            is_enabled: enabled,
            enabled_at: enabled ? new Date().toISOString() : null,
            enabled_by: enabled ? user.id : null,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-modules', projectId] });
      const moduleInfo = AVAILABLE_MODULES.find(m => m.key === variables.moduleKey);
      toast({
        title: variables.enabled ? 'Módulo ativado' : 'Módulo desativado',
        description: `${moduleInfo?.name || variables.moduleKey} foi ${variables.enabled ? 'ativado' : 'desativado'} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao alterar módulo',
        variant: 'destructive',
      });
    },
  });

  const isModuleEnabled = (moduleKey: ModuleKey): boolean => {
    if (!modules) return false;
    const module = modules.find(m => m.module_key === moduleKey);
    return module?.is_enabled ?? false;
  };

  const getModuleInfo = (moduleKey: ModuleKey): ModuleInfo | undefined => {
    return AVAILABLE_MODULES.find(m => m.key === moduleKey);
  };

  return {
    modules,
    isLoading,
    isModuleEnabled,
    getModuleInfo,
    toggleModule: toggleModuleMutation.mutate,
    isToggling: toggleModuleMutation.isPending,
  };
}
