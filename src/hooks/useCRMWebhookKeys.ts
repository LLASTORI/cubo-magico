import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface CRMWebhookKey {
  id: string;
  project_id: string;
  api_key: string;
  name: string;
  is_active: boolean;
  allowed_sources: string[] | null;
  default_tags: string[] | null;
  default_funnel_id: string | null;
  field_mappings: Record<string, string> | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCRMWebhookKeys() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: webhookKeys, isLoading } = useQuery({
    queryKey: ['crm-webhook-keys', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('crm_webhook_keys')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as CRMWebhookKey[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const createKeyMutation = useMutation({
    mutationFn: async ({ name, allowedSources, defaultTags, defaultFunnelId }: { 
      name: string; 
      allowedSources?: string[];
      defaultTags?: string[];
      defaultFunnelId?: string | null;
    }) => {
      if (!projectId) throw new Error('Projeto não selecionado');

      const { error } = await supabase
        .from('crm_webhook_keys')
        .insert({
          project_id: projectId,
          name,
          allowed_sources: allowedSources || [],
          default_tags: defaultTags || [],
          default_funnel_id: defaultFunnelId || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-webhook-keys', projectId] });
      toast({
        title: 'API Key criada',
        description: 'Nova chave de API criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar API Key',
        variant: 'destructive',
      });
    },
  });

  const updateKeyMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CRMWebhookKey> & { id: string }) => {
      const { error } = await supabase
        .from('crm_webhook_keys')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-webhook-keys', projectId] });
      toast({
        title: 'API Key atualizada',
        description: 'Chave de API atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar API Key',
        variant: 'destructive',
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_webhook_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-webhook-keys', projectId] });
      toast({
        title: 'API Key excluída',
        description: 'Chave de API excluída com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir API Key',
        variant: 'destructive',
      });
    },
  });

  return {
    webhookKeys,
    isLoading,
    createKey: createKeyMutation.mutate,
    updateKey: updateKeyMutation.mutate,
    deleteKey: deleteKeyMutation.mutate,
    isCreating: createKeyMutation.isPending,
    isUpdating: updateKeyMutation.isPending,
    isDeleting: deleteKeyMutation.isPending,
  };
}
