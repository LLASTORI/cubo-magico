import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { OutcomeCondition, OutcomeAction } from '@/lib/quizOutcomeEngine';
import { Json } from '@/integrations/supabase/types';

export interface QuizOutcome {
  id: string;
  quiz_id: string;
  name: string;
  description: string | null;
  priority: number;
  is_active: boolean;
  conditions: OutcomeCondition[];
  actions: OutcomeAction[];
  end_screen_override: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export function useQuizOutcomes(quizId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch outcomes for a quiz
  const { data: outcomes, isLoading } = useQuery({
    queryKey: ['quiz-outcomes', quizId],
    queryFn: async () => {
      if (!quizId) return [];
      
      const { data, error } = await supabase
        .from('quiz_outcomes')
        .select('*')
        .eq('quiz_id', quizId)
        .order('priority', { ascending: false });

      if (error) throw error;

      // Parse JSON fields
      return (data || []).map(outcome => ({
        ...outcome,
        conditions: (outcome.conditions as unknown as OutcomeCondition[]) || [],
        actions: (outcome.actions as unknown as OutcomeAction[]) || [],
        end_screen_override: outcome.end_screen_override as Record<string, any> | null,
      })) as QuizOutcome[];
    },
    enabled: !!quizId,
  });

  // Create outcome
  const createOutcome = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      priority?: number;
    }) => {
      if (!quizId) throw new Error('Quiz ID required');
      
      const { data: outcome, error } = await supabase
        .from('quiz_outcomes')
        .insert({
          quiz_id: quizId,
          name: data.name,
          description: data.description || null,
          priority: data.priority ?? 0,
          conditions: [] as unknown as Json,
          actions: [] as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;
      return outcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-outcomes', quizId] });
      toast({ title: 'Outcome criado com sucesso' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao criar outcome', description: error.message, variant: 'destructive' });
    },
  });

  // Update outcome
  const updateOutcome = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      priority?: number;
      is_active?: boolean;
      conditions?: OutcomeCondition[];
      actions?: OutcomeAction[];
      end_screen_override?: Record<string, any> | null;
    }) => {
      const updateData: Record<string, any> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.conditions !== undefined) updateData.conditions = data.conditions as unknown as Json;
      if (data.actions !== undefined) updateData.actions = data.actions as unknown as Json;
      if (data.end_screen_override !== undefined) updateData.end_screen_override = data.end_screen_override as unknown as Json;

      const { data: outcome, error } = await supabase
        .from('quiz_outcomes')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return outcome;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-outcomes', quizId] });
      toast({ title: 'Outcome atualizado' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar outcome', description: error.message, variant: 'destructive' });
    },
  });

  // Delete outcome
  const deleteOutcome = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('quiz_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-outcomes', quizId] });
      toast({ title: 'Outcome removido' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao remover outcome', description: error.message, variant: 'destructive' });
    },
  });

  // Reorder outcomes
  const reorderOutcomes = useMutation({
    mutationFn: async (updates: { id: string; priority: number }[]) => {
      const promises = updates.map(({ id, priority }) =>
        supabase
          .from('quiz_outcomes')
          .update({ priority })
          .eq('id', id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-outcomes', quizId] });
    },
  });

  return {
    outcomes: outcomes || [],
    isLoading,
    createOutcome,
    updateOutcome,
    deleteOutcome,
    reorderOutcomes,
  };
}
