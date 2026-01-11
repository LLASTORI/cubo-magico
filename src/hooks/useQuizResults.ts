import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";

export function useQuizResults(quizId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['quiz-results', projectId, quizId],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('quiz_results')
        .select(`*, quiz_sessions!inner (id, quiz_id, contact_id, status, started_at, completed_at, utm_data, crm_contacts (id, name, email, phone))`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (quizId) {
        query = query.eq('quiz_sessions.quiz_id', quizId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useQuizSessions(quizId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['quiz-sessions', projectId, quizId],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('quiz_sessions')
        .select(`*, crm_contacts (id, name, email, phone), quiz_results (id, normalized_score, summary)`)
        .eq('project_id', projectId)
        .order('started_at', { ascending: false });

      if (quizId) {
        query = query.eq('quiz_id', quizId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useQuizEvents(sessionId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  return useQuery({
    queryKey: ['quiz-events', projectId, sessionId],
    queryFn: async () => {
      if (!projectId) return [];

      let query = supabase
        .from('quiz_events')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useReprocessQuizScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { session_id?: string; quiz_id?: string; project_id?: string; dry_run?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('quiz-reprocess-scores', { body: params });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (!data.dry_run) {
        queryClient.invalidateQueries({ queryKey: ['quiz-results'] });
        queryClient.invalidateQueries({ queryKey: ['quiz-sessions'] });
        toast.success(`${data.success_count} resultado(s) reprocessado(s)`);
      }
    },
    onError: () => toast.error('Erro ao reprocessar scores'),
  });
}
