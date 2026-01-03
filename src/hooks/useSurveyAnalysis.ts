import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SurveyResponseAnalysis {
  id: string;
  response_id: string;
  project_id: string;
  survey_id: string;
  contact_id: string | null;
  classification: string | null;
  sentiment: string | null;
  intent_score: number | null;
  ai_summary: string | null;
  key_insights: any[];
  detected_keywords: string[] | null;
  processed_at: string | null;
  processed_by: string | null;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SurveyAnalysisStats {
  totalResponses: number;
  uniqueRespondents: number;
  avgIntentScore: number;
  highIntentPercentage: number;
  classificationDistribution: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  painPointsDetected: number;
  satisfactionCount: number;
  opportunitiesIdentified: number;
}

export interface SurveyAIKnowledgeBase {
  id: string;
  project_id: string;
  business_name: string | null;
  business_description: string | null;
  target_audience: string | null;
  products_services: string | null;
  high_intent_indicators: string | null;
  pain_point_indicators: string | null;
  satisfaction_indicators: string | null;
  objection_patterns: string | null;
  high_intent_keywords: string[];
  pain_keywords: string[];
  satisfaction_keywords: string[];
  auto_classify_responses: boolean;
  min_intent_score_for_action: number;
  created_at: string;
  updated_at: string;
}

export function useSurveyAnalysisStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['survey-analysis-stats', projectId],
    queryFn: async (): Promise<SurveyAnalysisStats> => {
      if (!projectId) throw new Error('Project ID is required');

      // Get total responses
      const { count: totalResponses } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      // Get unique respondents
      const { data: respondents } = await supabase
        .from('survey_responses')
        .select('contact_id')
        .eq('project_id', projectId)
        .not('contact_id', 'is', null);
      
      const uniqueRespondents = new Set(respondents?.map(r => r.contact_id)).size;

      // Get analysis stats
      const { data: analyses } = await supabase
        .from('survey_response_analysis')
        .select('classification, sentiment, intent_score')
        .eq('project_id', projectId);

      const classificationDistribution: Record<string, number> = {};
      const sentimentDistribution: Record<string, number> = {};
      let totalIntentScore = 0;
      let countWithIntent = 0;
      let highIntentCount = 0;
      let painPointsDetected = 0;
      let satisfactionCount = 0;

      analyses?.forEach(a => {
        if (a.classification) {
          classificationDistribution[a.classification] = (classificationDistribution[a.classification] || 0) + 1;
          if (a.classification === 'pain_point') painPointsDetected++;
          if (a.classification === 'satisfaction') satisfactionCount++;
        }
        if (a.sentiment) {
          sentimentDistribution[a.sentiment] = (sentimentDistribution[a.sentiment] || 0) + 1;
        }
        if (a.intent_score !== null) {
          totalIntentScore += a.intent_score;
          countWithIntent++;
          if (a.intent_score >= 70) highIntentCount++;
        }
      });

      const avgIntentScore = countWithIntent > 0 ? Math.round(totalIntentScore / countWithIntent) : 0;
      const highIntentPercentage = countWithIntent > 0 ? Math.round((highIntentCount / countWithIntent) * 100) : 0;
      
      // Opportunities = high intent + commercial interest
      const opportunitiesIdentified = highIntentCount + (classificationDistribution['high_intent'] || 0);

      return {
        totalResponses: totalResponses || 0,
        uniqueRespondents,
        avgIntentScore,
        highIntentPercentage,
        classificationDistribution,
        sentimentDistribution,
        painPointsDetected,
        satisfactionCount,
        opportunitiesIdentified,
      };
    },
    enabled: !!projectId,
  });
}

export function useSurveyAnalysisBySurvey(projectId: string | undefined, surveyId: string | undefined) {
  return useQuery({
    queryKey: ['survey-analysis-by-survey', projectId, surveyId],
    queryFn: async () => {
      if (!projectId || !surveyId) throw new Error('Project ID and Survey ID are required');

      const { data, error } = await supabase
        .from('survey_response_analysis')
        .select(`
          *,
          survey_responses!inner(
            id,
            answers,
            created_at,
            crm_contacts(id, name, email)
          )
        `)
        .eq('project_id', projectId)
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!surveyId,
  });
}

export function useSurveyAnalysisResponses(
  projectId: string | undefined,
  filters: {
    surveyId?: string;
    classification?: string;
    sentiment?: string;
    minIntent?: number;
    search?: string;
  } = {}
) {
  return useQuery({
    queryKey: ['survey-analysis-responses', projectId, filters],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');

      let query = supabase
        .from('survey_response_analysis')
        .select(`
          *,
          surveys!inner(id, name),
          crm_contacts(id, name, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.surveyId && filters.surveyId !== 'all') {
        query = query.eq('survey_id', filters.surveyId);
      }
      if (filters.classification && filters.classification !== 'all') {
        query = query.eq('classification', filters.classification);
      }
      if (filters.sentiment && filters.sentiment !== 'all') {
        query = query.eq('sentiment', filters.sentiment);
      }
      if (filters.minIntent !== undefined) {
        query = query.gte('intent_score', filters.minIntent);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

export function useSurveyAIKnowledgeBase(projectId: string | undefined) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['survey-ai-knowledge-base', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');

      const { data, error } = await supabase
        .from('survey_ai_knowledge_base')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) throw error;
      return data as SurveyAIKnowledgeBase | null;
    },
    enabled: !!projectId,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: Partial<SurveyAIKnowledgeBase>) => {
      if (!projectId) throw new Error('Project ID is required');

      const { error } = await supabase
        .from('survey_ai_knowledge_base')
        .upsert({
          project_id: projectId,
          ...formData,
        }, { onConflict: 'project_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['survey-ai-knowledge-base', projectId] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving survey AI knowledge base:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  return {
    knowledgeBase: data,
    isLoading,
    save: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}

export function useProcessSurveyAI(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (surveyId?: string) => {
      if (!projectId) throw new Error('Project ID is required');

      const { data, error } = await supabase.functions.invoke('survey-ai-analysis', {
        body: { 
          action: 'process',
          projectId,
          surveyId,
          limit: 100
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['survey-analysis-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['survey-analysis-responses', projectId] });
      toast.success(`${data?.processed || 0} respostas processadas com sucesso!`);
    },
    onError: (error) => {
      console.error('Error processing survey AI:', error);
      toast.error('Erro ao processar respostas com IA');
    },
  });
}
