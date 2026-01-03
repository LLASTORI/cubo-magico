/**
 * useSurveys Hook
 * 
 * Gerencia o CRUD completo de pesquisas inteligentes e suas perguntas.
 * 
 * ## Funcionalidades:
 * - Listagem de pesquisas do projeto
 * - Criação, atualização e exclusão de pesquisas
 * - Gerenciamento de perguntas (adicionar, editar, reordenar, excluir)
 * - Suporte a perguntas de identidade (identity_field)
 * 
 * ## Tipos de Perguntas:
 * - `text`: Resposta aberta
 * - `multiple_choice`: Múltipla escolha
 * - `scale`: Escala numérica (1-10, NPS, etc.)
 * - `identity_field`: Captura de dado declarado do contato
 * 
 * ## Exemplo de uso:
 * ```tsx
 * const { surveys, createSurvey, isLoading } = useSurveys();
 * const { survey, addQuestion } = useSurvey(surveyId);
 * ```
 * 
 * @module hooks/useSurveys
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Survey {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  objective: string;
  status: string;
  settings: Record<string, any>;
  slug: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  default_tags: string[] | null;
  default_funnel_id: string | null;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  position: number;
  question_type: 'text' | 'multiple_choice' | 'scale' | 'identity_field';
  question_text: string;
  description: string | null;
  is_required: boolean;
  options: any[];
  settings: Record<string, any>;
  identity_field_target: string | null;
  identity_confidence_weight: number;
  created_at: string;
  updated_at: string;
}

export interface SurveyWithQuestions extends Survey {
  survey_questions: SurveyQuestion[];
}

export const SURVEY_OBJECTIVES = [
  { value: 'general', label: 'Geral' },
  { value: 'qualification', label: 'Qualificação de Lead' },
  { value: 'identity', label: 'Identificação / Linkagem' },
  { value: 'nps', label: 'NPS / Satisfação' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'feedback', label: 'Feedback' },
];

export const IDENTITY_FIELD_TARGETS = [
  { value: 'email', label: 'Email', field: 'email' },
  { value: 'name', label: 'Nome Completo', field: 'name' },
  { value: 'first_name', label: 'Primeiro Nome', field: 'first_name' },
  { value: 'last_name', label: 'Sobrenome', field: 'last_name' },
  { value: 'phone', label: 'Telefone/WhatsApp', field: 'phone' },
  { value: 'instagram', label: 'Instagram', field: 'instagram' },
  { value: 'document', label: 'CPF/Documento', field: 'document' },
  { value: 'city', label: 'Cidade', field: 'city' },
  { value: 'state', label: 'Estado', field: 'state' },
];

export function useSurveys() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: surveys, isLoading } = useQuery({
    queryKey: ['surveys', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Survey[];
    },
    enabled: !!projectId,
  });

  const createSurvey = useMutation({
    mutationFn: async (data: { name: string; description?: string; objective?: string }) => {
      if (!projectId || !user?.id) throw new Error('Projeto não selecionado');

      const { data: survey, error } = await supabase
        .from('surveys')
        .insert({
          project_id: projectId,
          name: data.name,
          description: data.description || null,
          objective: data.objective || 'general',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', projectId] });
      toast({ title: 'Pesquisa criada com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar pesquisa', description: error.message, variant: 'destructive' });
    },
  });

  const updateSurvey = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Survey> & { id: string }) => {
      const { data: survey, error } = await supabase
        .from('surveys')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return survey as Survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', projectId] });
      queryClient.invalidateQueries({ queryKey: ['survey'] });
      toast({ title: 'Pesquisa atualizada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar pesquisa', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSurvey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surveys').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys', projectId] });
      toast({ title: 'Pesquisa excluída' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir pesquisa', description: error.message, variant: 'destructive' });
    },
  });

  return {
    surveys,
    isLoading,
    createSurvey,
    updateSurvey,
    deleteSurvey,
  };
}

export function useSurvey(surveyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: async () => {
      if (!surveyId) return null;

      const { data, error } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_questions (*)
        `)
        .eq('id', surveyId)
        .single();

      if (error) throw error;
      
      // Sort questions by position
      if (data?.survey_questions) {
        data.survey_questions.sort((a: SurveyQuestion, b: SurveyQuestion) => a.position - b.position);
      }
      
      return data as SurveyWithQuestions;
    },
    enabled: !!surveyId,
  });

  const addQuestion = useMutation({
    mutationFn: async (data: Partial<SurveyQuestion>) => {
      if (!surveyId) throw new Error('Survey ID required');

      const { data: question, error } = await supabase
        .from('survey_questions')
        .insert({
          survey_id: surveyId,
          question_type: data.question_type || 'text',
          question_text: data.question_text || 'Nova pergunta',
          position: data.position ?? 0,
          is_required: data.is_required ?? false,
          options: data.options ?? [],
          settings: data.settings ?? {},
          identity_field_target: data.identity_field_target || null,
          identity_confidence_weight: data.identity_confidence_weight ?? 1.0,
        })
        .select()
        .single();

      if (error) throw error;
      return question as SurveyQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', surveyId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar pergunta', description: error.message, variant: 'destructive' });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SurveyQuestion> & { id: string }) => {
      const { data: question, error } = await supabase
        .from('survey_questions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return question as SurveyQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', surveyId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase.from('survey_questions').delete().eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', surveyId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir pergunta', description: error.message, variant: 'destructive' });
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (questions: { id: string; position: number }[]) => {
      const updates = questions.map(q => 
        supabase.from('survey_questions').update({ position: q.position }).eq('id', q.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey', surveyId] });
    },
  });

  return {
    survey,
    isLoading,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
  };
}
