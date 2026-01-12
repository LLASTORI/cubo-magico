import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Json } from "@/integrations/supabase/types";

export interface QuizSession {
  id: string;
  quiz_id: string;
  contact_id: string | null;
  project_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  utm_data: Json | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
  quiz?: {
    id: string;
    name: string;
    type: string;
  };
}

export interface QuizResult {
  id: string;
  session_id: string;
  project_id: string;
  traits_vector: Record<string, number>;
  intent_vector: Record<string, number>;
  raw_score: number;
  normalized_score: number;
  summary: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ContactQuizData {
  session: QuizSession;
  result: QuizResult | null;
  answersCount: number;
}

/**
 * Hook to fetch quiz sessions and results for a specific contact
 */
export function useContactQuizzes(contactId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contact-quizzes', projectId, contactId],
    queryFn: async (): Promise<ContactQuizData[]> => {
      if (!projectId || !contactId) return [];

      // Fetch all quiz sessions for this contact
      const { data: sessions, error: sessionsError } = await supabase
        .from('quiz_sessions')
        .select(`
          *,
          quiz:quizzes (id, name, type)
        `)
        .eq('project_id', projectId)
        .eq('contact_id', contactId)
        .order('started_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map(s => s.id);

      // Fetch results for these sessions
      const { data: results, error: resultsError } = await supabase
        .from('quiz_results')
        .select('*')
        .in('session_id', sessionIds);

      if (resultsError) throw resultsError;

      // Fetch answer counts for each session
      const { data: answerCounts, error: answersError } = await supabase
        .from('quiz_answers')
        .select('session_id')
        .in('session_id', sessionIds);

      if (answersError) throw answersError;

      // Count answers per session
      const answerCountMap: Record<string, number> = {};
      answerCounts?.forEach(a => {
        answerCountMap[a.session_id] = (answerCountMap[a.session_id] || 0) + 1;
      });

      // Build result map
      const resultMap: Record<string, QuizResult> = {};
      results?.forEach(r => {
        // Parse JSON fields safely
        const rawScore = typeof r.raw_score === 'number' ? r.raw_score : 
          (r.raw_score && typeof r.raw_score === 'object' ? 0 : parseFloat(String(r.raw_score)) || 0);
        const normalizedScore = typeof r.normalized_score === 'number' ? r.normalized_score :
          (r.normalized_score && typeof r.normalized_score === 'object' ? 0 : parseFloat(String(r.normalized_score)) || 0);
        const summary = typeof r.summary === 'string' ? 
          (r.summary ? JSON.parse(r.summary) : {}) : 
          (r.summary as Record<string, any>) || {};

        resultMap[r.session_id] = {
          id: r.id,
          session_id: r.session_id,
          project_id: r.project_id,
          traits_vector: (r.traits_vector as Record<string, number>) || {},
          intent_vector: (r.intent_vector as Record<string, number>) || {},
          raw_score: rawScore,
          normalized_score: normalizedScore,
          summary: summary,
          created_at: r.created_at,
          updated_at: r.created_at, // Use created_at since updated_at doesn't exist
        };
      });

      // Combine data
      return sessions.map(session => ({
        session: {
          ...session,
          quiz: session.quiz as unknown as QuizSession['quiz'],
        } as QuizSession,
        result: resultMap[session.id] || null,
        answersCount: answerCountMap[session.id] || 0,
      }));
    },
    enabled: !!projectId && !!contactId,
  });

  // Aggregate data for multiple quizzes
  const aggregatedProfile = data && data.length > 0 ? calculateAggregatedProfile(data) : null;

  return {
    quizzes: data || [],
    isLoading,
    error,
    refetch,
    aggregatedProfile,
    totalQuizzes: data?.length || 0,
    completedQuizzes: data?.filter(q => q.session.status === 'completed').length || 0,
  };
}

interface AggregatedProfile {
  avgTraitsVector: Record<string, number>;
  avgIntentVector: Record<string, number>;
  avgNormalizedScore: number;
  primaryTrait: string | null;
  primaryIntent: string | null;
}

/**
 * Calculate aggregated profile from multiple quiz results
 * Uses ONLY the most recent result per quiz (no inflation)
 */
function calculateAggregatedProfile(data: ContactQuizData[]): AggregatedProfile {
  // Group by quiz_id and take only the most recent completed result per quiz
  const quizMap = new Map<string, ContactQuizData>();
  
  data.forEach(d => {
    if (!d.result || d.session.status !== 'completed') return;
    
    const quizId = d.session.quiz_id;
    const existing = quizMap.get(quizId);
    
    // Keep only the most recent result per quiz
    if (!existing || new Date(d.session.started_at) > new Date(existing.session.started_at)) {
      quizMap.set(quizId, d);
    }
  });

  const latestResults = Array.from(quizMap.values()).map(d => d.result!);

  if (latestResults.length === 0) {
    return {
      avgTraitsVector: {},
      avgIntentVector: {},
      avgNormalizedScore: 0,
      primaryTrait: null,
      primaryIntent: null,
    };
  }

  // Aggregate traits vectors - average across quizzes (not sessions)
  const traitsSum: Record<string, number> = {};
  const traitsCount: Record<string, number> = {};
  
  latestResults.forEach(r => {
    Object.entries(r.traits_vector).forEach(([key, value]) => {
      traitsSum[key] = (traitsSum[key] || 0) + value;
      traitsCount[key] = (traitsCount[key] || 0) + 1;
    });
  });

  const avgTraitsVector: Record<string, number> = {};
  Object.keys(traitsSum).forEach(key => {
    avgTraitsVector[key] = traitsSum[key] / traitsCount[key];
  });

  // Aggregate intent vectors - average across quizzes (not sessions)
  const intentSum: Record<string, number> = {};
  const intentCount: Record<string, number> = {};
  
  latestResults.forEach(r => {
    Object.entries(r.intent_vector).forEach(([key, value]) => {
      intentSum[key] = (intentSum[key] || 0) + value;
      intentCount[key] = (intentCount[key] || 0) + 1;
    });
  });

  const avgIntentVector: Record<string, number> = {};
  Object.keys(intentSum).forEach(key => {
    avgIntentVector[key] = intentSum[key] / intentCount[key];
  });

  // Normalize vectors to sum to 100 (prevents inflation)
  const normalizeVector = (vec: Record<string, number>): Record<string, number> => {
    const total = Object.values(vec).reduce((a, b) => a + Math.abs(b), 0);
    if (total === 0) return vec;
    const normalized: Record<string, number> = {};
    Object.entries(vec).forEach(([key, value]) => {
      normalized[key] = Math.round((value / total) * 100);
    });
    return normalized;
  };

  const normalizedTraits = normalizeVector(avgTraitsVector);
  const normalizedIntents = normalizeVector(avgIntentVector);

  // Calculate average normalized score
  const avgNormalizedScore = latestResults.reduce((sum, r) => sum + r.normalized_score, 0) / latestResults.length;

  // Find primary trait and intent
  const primaryTrait = Object.entries(normalizedTraits).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const primaryIntent = Object.entries(normalizedIntents).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    avgTraitsVector: normalizedTraits,
    avgIntentVector: normalizedIntents,
    avgNormalizedScore,
    primaryTrait,
    primaryIntent,
  };
}

/**
 * Hook to prepare global intent score update
 * (Preparation for future integration with Social Listening, purchases, etc.)
 */
export function useContactIntentScore(contactId?: string) {
  const { quizzes, aggregatedProfile } = useContactQuizzes(contactId);

  // Calculate quiz-based intent score (0-100)
  const quizIntentScore = aggregatedProfile?.avgNormalizedScore 
    ? Math.round(aggregatedProfile.avgNormalizedScore * 100) 
    : null;

  // Future: This will be a weighted average of:
  // - Quiz intent score
  // - Social listening score
  // - Purchase behavior score
  // - Survey responses score
  
  return {
    quizIntentScore,
    primaryIntent: aggregatedProfile?.primaryIntent,
    hasQuizData: quizzes.length > 0,
  };
}
