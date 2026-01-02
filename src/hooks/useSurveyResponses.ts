import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface SurveyResponse {
  id: string;
  survey_id: string;
  project_id: string;
  contact_id: string | null;
  email: string;
  answers: Record<string, any>;
  source: 'public_link' | 'webhook' | 'csv_import';
  metadata: Record<string, any>;
  submitted_at: string;
  processed_at: string | null;
  created_at: string;
}

export function useSurveyResponses(surveyId: string | undefined) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: responses, isLoading } = useQuery({
    queryKey: ['survey-responses', surveyId],
    queryFn: async () => {
      if (!surveyId) return [];

      const { data, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          crm_contacts (
            id,
            name,
            email,
            phone,
            status
          )
        `)
        .eq('survey_id', surveyId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as (SurveyResponse & { crm_contacts: any })[];
    },
    enabled: !!surveyId,
  });

  const deleteResponse = useMutation({
    mutationFn: async (responseId: string) => {
      const { error } = await supabase
        .from('survey_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-responses', surveyId] });
      toast({ title: 'Resposta excluída' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir resposta', description: error.message, variant: 'destructive' });
    },
  });

  return {
    responses,
    isLoading,
    deleteResponse,
  };
}

export function useContactSurveyResponses(contactId: string | undefined) {
  const { data: responses, isLoading } = useQuery({
    queryKey: ['contact-survey-responses', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          surveys (
            id,
            name,
            objective
          )
        `)
        .eq('contact_id', contactId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data as (SurveyResponse & { surveys: any })[];
    },
    enabled: !!contactId,
  });

  return { responses, isLoading };
}
