/**
 * useQuizzes Hook
 * 
 * Manages the full CRUD for quizzes and their questions/options.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

export interface Quiz {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  type: string;
  is_active: boolean;
  requires_identification: boolean;
  allow_anonymous: boolean;
  start_screen_config: Record<string, any> | null;
  end_screen_config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  order_index: number;
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'text' | 'number';
  title: string;
  subtitle: string | null;
  is_required: boolean;
  config: Record<string, any>;
  created_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  order_index: number;
  label: string;
  value: string;
  weight: number;
  traits_vector: Record<string, number>;
  intent_vector: Record<string, number>;
  created_at: string;
}

export interface QuizWithQuestions extends Quiz {
  quiz_questions: (QuizQuestion & { quiz_options: QuizOption[] })[];
}

export const QUIZ_TYPES = [
  { value: 'lead', label: 'Qualificação de Lead' },
  { value: 'funnel', label: 'Funil de Vendas' },
  { value: 'qualification', label: 'Qualificação' },
  { value: 'personality', label: 'Perfil/Personalidade' },
  { value: 'assessment', label: 'Avaliação' },
  { value: 'engagement', label: 'Engajamento' },
];

export const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Escolha Única' },
  { value: 'multiple_choice', label: 'Múltipla Escolha' },
  { value: 'scale', label: 'Escala' },
  { value: 'text', label: 'Texto Livre' },
];

export function useQuizzes() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ['quizzes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quiz[];
    },
    enabled: !!projectId,
  });

  const { data: questionCounts } = useQuery({
    queryKey: ['quiz-question-counts', projectId],
    queryFn: async () => {
      if (!projectId || !quizzes?.length) return {};
      
      const quizIds = quizzes.map(q => q.id);
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('quiz_id')
        .in('quiz_id', quizIds);

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(q => {
        counts[q.quiz_id] = (counts[q.quiz_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!projectId && !!quizzes?.length,
  });

  const { data: responseCounts } = useQuery({
    queryKey: ['quiz-response-counts', projectId],
    queryFn: async () => {
      if (!projectId || !quizzes?.length) return {};
      
      const quizIds = quizzes.map(q => q.id);
      const { data, error } = await supabase
        .from('quiz_sessions')
        .select('quiz_id')
        .in('quiz_id', quizIds);

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(s => {
        counts[s.quiz_id] = (counts[s.quiz_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!projectId && !!quizzes?.length,
  });

  const createQuiz = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string; 
      type?: string;
      requires_identification?: boolean;
      allow_anonymous?: boolean;
    }) => {
      if (!projectId || !user?.id) throw new Error('Projeto não selecionado');

      console.log('[useQuizzes] Creating quiz for project:', projectId);
      
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .insert({
          project_id: projectId,
          name: data.name,
          description: data.description || null,
          type: (data.type || 'lead') as any,
          requires_identification: data.requires_identification ?? true,
          allow_anonymous: data.allow_anonymous ?? false,
          is_active: true, // Default to active so it can be tested immediately
        })
        .select()
        .single();

      if (error) {
        console.error('[useQuizzes] Create quiz error:', error);
        throw error;
      }
      
      console.log('[useQuizzes] Quiz created successfully:', quiz.id);
      return quiz as Quiz;
    },
    onSuccess: (quiz) => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', projectId] });
      // Also pre-populate the quiz cache for immediate navigation
      queryClient.setQueryData(['quiz', quiz.id, projectId], { ...quiz, quiz_questions: [] });
      toast({ title: 'Quiz criado com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar quiz', description: error.message, variant: 'destructive' });
    },
  });

  const updateQuiz = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Quiz> & { id: string }) => {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return quiz as Quiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', projectId] });
      queryClient.invalidateQueries({ queryKey: ['quiz'] });
      toast({ title: 'Quiz atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar quiz', description: error.message, variant: 'destructive' });
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quizzes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes', projectId] });
      toast({ title: 'Quiz excluído' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir quiz', description: error.message, variant: 'destructive' });
    },
  });

  return {
    quizzes,
    isLoading,
    questionCounts: questionCounts || {},
    responseCounts: responseCounts || {},
    createQuiz,
    updateQuiz,
    deleteQuiz,
  };
}

export function useQuiz(quizId: string | undefined) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: quiz, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['quiz', quizId, projectId],
    queryFn: async () => {
      if (!quizId) return null;

      // Build query - if we have projectId, filter by it for extra safety
      let query = supabase
        .from('quizzes')
        .select(`
          *,
          quiz_questions (
            *,
            quiz_options (*)
          )
        `)
        .eq('id', quizId);
      
      // Add project_id filter if available (for admin pages)
      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query.single();

      if (error) {
        console.error('[useQuiz] Error fetching quiz:', error);
        throw error;
      }
      
      if (data?.quiz_questions) {
        data.quiz_questions.sort((a: any, b: any) => a.order_index - b.order_index);
        data.quiz_questions.forEach((q: any) => {
          if (q.quiz_options) {
            q.quiz_options.sort((a: any, b: any) => a.order_index - b.order_index);
          }
        });
      }
      
      return data as unknown as QuizWithQuestions;
    },
    enabled: !!quizId,
    retry: 1,
    staleTime: 30000, // 30 seconds - prevent excessive refetching
  });

  const addQuestion = useMutation({
    mutationFn: async (data: Partial<QuizQuestion>) => {
      if (!quizId) throw new Error('Quiz ID required');

      const { data: question, error } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quizId,
          type: (data.type || 'single_choice') as any,
          title: data.title || 'Nova pergunta',
          order_index: data.order_index ?? 0,
          is_required: data.is_required ?? true,
          config: (data.config ?? {}) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return question as unknown as QuizQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar pergunta', description: error.message, variant: 'destructive' });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, ...data }: Partial<QuizQuestion> & { id: string }) => {
      const { data: question, error } = await supabase
        .from('quiz_questions')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return question as unknown as QuizQuestion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar pergunta', description: error.message, variant: 'destructive' });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir pergunta', description: error.message, variant: 'destructive' });
    },
  });

  const reorderQuestions = useMutation({
    mutationFn: async (questions: { id: string; order_index: number }[]) => {
      const updates = questions.map(q => 
        supabase.from('quiz_questions').update({ order_index: q.order_index }).eq('id', q.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
  });

  const addOption = useMutation({
    mutationFn: async (data: { questionId: string } & Partial<QuizOption>) => {
      const { data: option, error } = await supabase
        .from('quiz_options')
        .insert({
          question_id: data.questionId,
          label: data.label || 'Nova opção',
          value: data.value || '',
          order_index: data.order_index ?? 0,
          weight: data.weight ?? 1,
          traits_vector: (data.traits_vector ?? {}) as unknown as Json,
          intent_vector: (data.intent_vector ?? {}) as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return option as unknown as QuizOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar opção', description: error.message, variant: 'destructive' });
    },
  });

  const updateOption = useMutation({
    mutationFn: async ({ id, ...data }: Partial<QuizOption> & { id: string }) => {
      const { data: option, error } = await supabase
        .from('quiz_options')
        .update(data as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return option as unknown as QuizOption;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar opção', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOption = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase.from('quiz_options').delete().eq('id', optionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao excluir opção', description: error.message, variant: 'destructive' });
    },
  });

  const reorderOptions = useMutation({
    mutationFn: async (options: { id: string; order_index: number }[]) => {
      const updates = options.map(o => 
        supabase.from('quiz_options').update({ order_index: o.order_index }).eq('id', o.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] });
    },
  });

  return {
    quiz,
    isLoading,
    error: queryError,
    refetch,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions,
    addOption,
    updateOption,
    deleteOption,
    reorderOptions,
  };
}
