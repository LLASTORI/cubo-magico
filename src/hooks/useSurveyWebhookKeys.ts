import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface SurveyWebhookKey {
  id: string;
  project_id: string;
  survey_id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  field_mappings: Record<string, string>;
  default_tags: string[];
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSurveyWebhookKeys(surveyId: string | undefined) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: webhookKeys, isLoading } = useQuery({
    queryKey: ['survey-webhook-keys', surveyId],
    queryFn: async () => {
      if (!surveyId || !projectId) return [];

      const { data, error } = await supabase
        .from('survey_webhook_keys')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SurveyWebhookKey[];
    },
    enabled: !!surveyId && !!projectId,
  });

  const createWebhookKey = useMutation({
    mutationFn: async (data: { name: string; field_mappings?: Record<string, string>; default_tags?: string[] }) => {
      if (!surveyId || !projectId) throw new Error('Survey e projeto necessários');

      const { data: key, error } = await supabase
        .from('survey_webhook_keys')
        .insert({
          project_id: projectId,
          survey_id: surveyId,
          name: data.name,
          field_mappings: data.field_mappings || {},
          default_tags: data.default_tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return key as SurveyWebhookKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-webhook-keys', surveyId] });
      toast({ title: 'Webhook criado com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar webhook', description: error.message, variant: 'destructive' });
    },
  });

  const updateWebhookKey = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SurveyWebhookKey> & { id: string }) => {
      const { data: key, error } = await supabase
        .from('survey_webhook_keys')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return key as SurveyWebhookKey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-webhook-keys', surveyId] });
      toast({ title: 'Webhook atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar webhook', description: error.message, variant: 'destructive' });
    },
  });

  const deleteWebhookKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('survey_webhook_keys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-webhook-keys', surveyId] });
      toast({ title: 'Webhook excluído' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir webhook', description: error.message, variant: 'destructive' });
    },
  });

  return {
    webhookKeys,
    isLoading,
    createWebhookKey,
    updateWebhookKey,
    deleteWebhookKey,
  };
}
