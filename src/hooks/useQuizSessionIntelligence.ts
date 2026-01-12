import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

export interface QuizSessionDetail {
  id: string;
  quiz_id: string;
  project_id: string;
  contact_id: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  utm_data: Json | null;
  decision_path: Json | null;
  accumulated_vectors: Json | null;
  flow_metadata: Json | null;
  quiz?: {
    id: string;
    name: string;
    type: string;
  };
  contact?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface QuizSessionResult {
  id: string;
  session_id: string;
  traits_vector: Record<string, number>;
  intent_vector: Record<string, number>;
  raw_score: number;
  normalized_score: number;
  summary: Record<string, any>;
  confidence_score: number | null;
  entropy_score: number | null;
  semantic_interpretation: Record<string, any> | null;
  questions_answered: number | null;
  questions_skipped: number | null;
  flow_type: string | null;
  decision_path: Json | null;
}

export interface QuizSessionEvent {
  id: string;
  event_name: string;
  payload: Json | null;
  created_at: string;
}

export interface QuizAnswer {
  id: string;
  session_id: string;
  question_id: string;
  option_id: string | null;
  answer_text: string | null;
  answer_value: number | null;
  created_at: string;
  question?: {
    id: string;
    title: string;
    subtitle: string | null;
    type: string;
    order_index: number;
  };
  option?: {
    id: string;
    label: string;
    value: string;
    weight: number;
    traits_vector: Record<string, number>;
    intent_vector: Record<string, number>;
  };
}

/**
 * Hook to fetch complete session details for the Session Viewer
 */
export function useQuizSessionDetail(quizId?: string, sessionId?: string) {
  return useQuery({
    queryKey: ['quiz-session-detail', quizId, sessionId],
    queryFn: async () => {
      if (!sessionId) return null;

      // Fetch session with quiz and contact info
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz:quizzes (id, name, type),
          contact:crm_contacts (id, name, email)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Fetch result for this session
      const { data: resultData, error: resultError } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (resultError) throw resultError;

      // Parse result data safely
      let result: QuizSessionResult | null = null;
      if (resultData) {
        const parseNumber = (val: any): number => {
          if (typeof val === 'number') return val;
          if (val && typeof val === 'object') return 0;
          return parseFloat(String(val)) || 0;
        };

        result = {
          id: resultData.id,
          session_id: resultData.session_id,
          traits_vector: (resultData.traits_vector as Record<string, number>) || {},
          intent_vector: (resultData.intent_vector as Record<string, number>) || {},
          raw_score: parseNumber(resultData.raw_score),
          normalized_score: parseNumber(resultData.normalized_score),
          summary: typeof resultData.summary === 'string' 
            ? JSON.parse(resultData.summary || '{}') 
            : (resultData.summary as Record<string, any>) || {},
          confidence_score: resultData.confidence_score,
          entropy_score: resultData.entropy_score,
          semantic_interpretation: resultData.semantic_interpretation as Record<string, any> | null,
          questions_answered: resultData.questions_answered,
          questions_skipped: resultData.questions_skipped,
          flow_type: resultData.flow_type,
          decision_path: resultData.decision_path,
        };
      }

      // Fetch events for this session
      const { data: events, error: eventsError } = await supabase
        .from('quiz_events')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      return {
        session: {
          ...session,
          quiz: session.quiz as QuizSessionDetail['quiz'],
          contact: session.contact as QuizSessionDetail['contact'],
        } as QuizSessionDetail,
        result,
        events: (events || []) as QuizSessionEvent[],
      };
    },
    enabled: !!sessionId,
  });
}

/**
 * Hook to fetch answers with questions and options for the Answers Viewer
 */
export function useQuizSessionAnswers(sessionId?: string, quizId?: string) {
  return useQuery({
    queryKey: ['quiz-session-answers', sessionId],
    queryFn: async () => {
      if (!sessionId || !quizId) return [];

      // Fetch answers for this session
      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (answersError) throw answersError;
      if (!answers || answers.length === 0) return [];

      // Get unique question IDs
      const questionIds = [...new Set(answers.map(a => a.question_id))];
      const optionIds = [...new Set(answers.map(a => a.option_id).filter(Boolean))];

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id, title, subtitle, type, order_index')
        .in('id', questionIds);

      if (questionsError) throw questionsError;

      // Fetch options
      let options: any[] = [];
      if (optionIds.length > 0) {
        const { data: optionsData, error: optionsError } = await supabase
          .from('quiz_options')
          .select('*')
          .in('id', optionIds);

        if (optionsError) throw optionsError;
        options = optionsData || [];
      }

      // Build maps
      const questionMap = new Map(questions?.map(q => [q.id, q]) || []);
      const optionMap = new Map(options.map(o => [o.id, o]));

      // Combine data
      const enrichedAnswers: QuizAnswer[] = answers.map(answer => {
        const question = questionMap.get(answer.question_id);
        const option = answer.option_id ? optionMap.get(answer.option_id) : null;

        return {
          id: answer.id,
          session_id: answer.session_id,
          question_id: answer.question_id,
          option_id: answer.option_id,
          answer_text: answer.answer_text,
          answer_value: answer.answer_value,
          created_at: answer.created_at,
          question: question ? {
            id: question.id,
            title: question.title,
            subtitle: question.subtitle,
            type: question.type,
            order_index: question.order_index,
          } : undefined,
          option: option ? {
            id: option.id,
            label: option.label,
            value: option.value,
            weight: option.weight,
            traits_vector: (option.traits_vector as Record<string, number>) || {},
            intent_vector: (option.intent_vector as Record<string, number>) || {},
          } : undefined,
        };
      });

      // Sort by question order
      return enrichedAnswers.sort((a, b) => 
        (a.question?.order_index || 0) - (b.question?.order_index || 0)
      );
    },
    enabled: !!sessionId && !!quizId,
  });
}

/**
 * Utility to calculate session duration
 */
export function calculateSessionDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'Em andamento';
  
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const diffMs = end - start;
  
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  
  if (minutes === 0) return `${seconds} segundos`;
  if (minutes === 1) return `1 minuto e ${seconds} segundos`;
  return `${minutes} minutos e ${seconds} segundos`;
}

/**
 * Get human-readable event name
 */
export function getEventDisplayName(eventName: string): string {
  const eventMap: Record<string, string> = {
    quiz_started: 'Quiz iniciado',
    quiz_completed: 'Quiz finalizado',
    quiz_abandoned: 'Quiz abandonado',
    question_answered: 'Pergunta respondida',
    question_skipped: 'Pergunta pulada',
    question_viewed: 'Pergunta visualizada',
    outcome_selected: 'Resultado definido',
    identification_completed: 'Identificação concluída',
    cta_clicked: 'CTA clicado',
    page_viewed: 'Página visualizada',
  };
  
  return eventMap[eventName] || eventName;
}

/**
 * Get status display info
 */
export function getStatusInfo(status: string): { label: string; color: string; description: string } {
  const statusMap: Record<string, { label: string; color: string; description: string }> = {
    started: { 
      label: 'Iniciado', 
      color: 'bg-blue-500',
      description: 'O quiz foi iniciado mas ainda não há respostas'
    },
    in_progress: { 
      label: 'Em progresso', 
      color: 'bg-amber-500',
      description: 'O lead está respondendo o quiz'
    },
    completed: { 
      label: 'Completo', 
      color: 'bg-green-500',
      description: 'O quiz foi respondido completamente'
    },
    abandoned: { 
      label: 'Abandonado', 
      color: 'bg-red-500',
      description: 'O lead saiu antes de finalizar'
    },
  };
  
  return statusMap[status] || { label: status, color: 'bg-gray-500', description: 'Status desconhecido' };
}
