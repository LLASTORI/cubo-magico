// Hook for quiz data control operations

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { 
  resetQuizData, 
  deleteQuizComplete, 
  rebuildContactProfile, 
  rebuildAllProfiles 
} from '@/lib/cognitiveRebuildEngine';

export function useQuizDataControls() {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const queryClient = useQueryClient();

  const resetQuizDataMutation = useMutation({
    mutationFn: async (quizId: string) => {
      if (!projectId) throw new Error('No project selected');
      return resetQuizData(quizId, projectId);
    },
    onSuccess: (result, quizId) => {
      if (result.success) {
        toast.success('Dados do quiz limpos', {
          description: `${result.deleted.sessions} sessões, ${result.deleted.results} resultados, ${result.deleted.answers} respostas removidas.`
        });
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['quiz-results', quizId] });
        queryClient.invalidateQueries({ queryKey: ['quiz-sessions', quizId] });
        queryClient.invalidateQueries({ queryKey: ['contact-profile'] });
        queryClient.invalidateQueries({ queryKey: ['contact-quizzes'] });
      } else {
        toast.error('Erro ao limpar dados', { description: result.errors.join(', ') });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao limpar dados', { description: error.message });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      if (!projectId) throw new Error('No project selected');
      return deleteQuizComplete(quizId, projectId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Quiz excluído com sucesso');
        queryClient.invalidateQueries({ queryKey: ['quizzes'] });
        queryClient.invalidateQueries({ queryKey: ['contact-profile'] });
        queryClient.invalidateQueries({ queryKey: ['contact-quizzes'] });
      } else {
        toast.error('Erro ao excluir quiz', { description: result.errors.join(', ') });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir quiz', { description: error.message });
    },
  });

  const rebuildProfileMutation = useMutation({
    mutationFn: async (contactId: string) => {
      if (!projectId) throw new Error('No project selected');
      return rebuildContactProfile(contactId, projectId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Perfil reconstruído', {
          description: `${result.quizzesProcessed} quizzes processados.`
        });
        queryClient.invalidateQueries({ queryKey: ['contact-profile', projectId, result.contactId] });
      } else {
        toast.error('Erro ao reconstruir perfil', { description: result.errors.join(', ') });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao reconstruir perfil', { description: error.message });
    },
  });

  const rebuildAllProfilesMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project selected');
      return rebuildAllProfiles(projectId);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Todos os perfis reconstruídos', {
          description: `${result.profilesRebuilt} perfis atualizados, ${result.profilesDeleted} removidos.`
        });
        queryClient.invalidateQueries({ queryKey: ['contact-profile'] });
        queryClient.invalidateQueries({ queryKey: ['contact-quizzes'] });
      } else {
        toast.error('Erro ao reconstruir perfis', { description: result.errors.join(', ') });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao reconstruir perfis', { description: error.message });
    },
  });

  return {
    resetQuizData: resetQuizDataMutation,
    deleteQuiz: deleteQuizMutation,
    rebuildProfile: rebuildProfileMutation,
    rebuildAllProfiles: rebuildAllProfilesMutation,
  };
}
