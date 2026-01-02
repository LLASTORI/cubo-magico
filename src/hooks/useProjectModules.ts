import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type ModuleKey = 'crm' | 'meta_ads' | 'hotmart' | 'whatsapp' | 'automation' | 'surveys';

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
  requiresModule?: ModuleKey; // Módulo pai necessário
}

export const AVAILABLE_MODULES: ModuleInfo[] = [
  {
    key: 'crm',
    name: 'CRM',
    description: 'Gestão de contatos, jornada do cliente e entrada de leads via webhook',
    icon: 'users',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    description: 'Atendimento via WhatsApp integrado ao CRM com múltiplos números',
    icon: 'message-circle',
    requiresModule: 'crm',
  },
  {
    key: 'meta_ads',
    name: 'Meta Ads',
    description: 'Integração com Facebook e Instagram Ads para análise de ROI',
    icon: 'facebook',
  },
  {
    key: 'hotmart',
    name: 'Hotmart',
    description: 'Sincronização de vendas, produtos e métricas de faturamento',
    icon: 'shopping-cart',
  },
  {
    key: 'automation',
    name: 'Automações',
    description: 'Fluxos de automação para WhatsApp com editor visual',
    icon: 'workflow',
    requiresModule: 'whatsapp',
  },
  {
    key: 'surveys',
    name: 'Pesquisa Inteligente',
    description: 'Coleta de dados declarados e enriquecimento de identidade',
    icon: 'clipboard-list',
    requiresModule: 'crm',
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
    staleTime: 30 * 1000, // 30 seconds - more responsive to changes
    refetchOnWindowFocus: true,
  });

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ moduleKey, enabled }: { moduleKey: ModuleKey; enabled: boolean }) => {
      if (!projectId || !user?.id) throw new Error('Projeto não selecionado');

      // Check if module record exists
      const { data: existing } = await supabase
        .from('project_modules')
        .select('id, is_enabled')
        .eq('project_id', projectId)
        .eq('module_key', moduleKey)
        .maybeSingle();

      const wasEnabled = existing?.is_enabled ?? false;

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

      // If enabling CRM for the first time, migrate historical data from hotmart_sales
      if (moduleKey === 'crm' && enabled && !wasEnabled) {
        const { data: migrationResult, error: migrationError } = await supabase
          .rpc('migrate_hotmart_to_crm');
        
        if (migrationError) {
          console.error('Error migrating hotmart data to CRM:', migrationError);
          // Don't throw - module is enabled, migration is best-effort
        } else {
          console.log('CRM migration completed:', migrationResult);
        }
        
        return { moduleKey, enabled, migrationResult };
      }

      return { moduleKey, enabled };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-modules', projectId] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-ascension-transactions'] });
      
      const moduleInfo = AVAILABLE_MODULES.find(m => m.key === variables.moduleKey);
      
      if (variables.moduleKey === 'crm' && variables.enabled && result?.migrationResult) {
        const migration = result.migrationResult as { contacts_created: number; transactions_created: number }[];
        const stats = migration[0] || { contacts_created: 0, transactions_created: 0 };
        toast({
          title: 'CRM ativado com sucesso',
          description: `${stats.contacts_created} contatos e ${stats.transactions_created} transações foram migrados do histórico.`,
        });
      } else {
        toast({
          title: variables.enabled ? 'Módulo ativado' : 'Módulo desativado',
          description: `${moduleInfo?.name || variables.moduleKey} foi ${variables.enabled ? 'ativado' : 'desativado'} com sucesso.`,
        });
      }
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
