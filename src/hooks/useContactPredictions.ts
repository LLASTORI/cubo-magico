import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useContactProfile } from "@/hooks/useContactProfile";
import { 
  generatePredictions, 
  Prediction, 
  ContactContext,
  PredictionType,
  RiskLevel,
  RecommendedAction
} from "@/lib/recommendationEngine";
import { toast } from "sonner";

export interface ContactPrediction {
  id: string;
  contact_id: string;
  project_id: string;
  prediction_type: PredictionType;
  confidence: number;
  explanation: Record<string, any>;
  recommended_actions: RecommendedAction[];
  risk_level: RiskLevel;
  urgency_score: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecommendationLog {
  id: string;
  prediction_id: string | null;
  contact_id: string;
  project_id: string;
  action_type: 'apply' | 'dismiss' | 'schedule' | 'test_variant';
  action_data: Record<string, any>;
  performed_by: string | null;
  outcome: string | null;
  outcome_data: Record<string, any> | null;
  outcome_recorded_at: string | null;
  created_at: string;
}

/**
 * Hook to fetch and manage contact predictions
 */
export function useContactPredictions(contactId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const queryClient = useQueryClient();

  // Fetch existing predictions
  const { data: predictions, isLoading, refetch } = useQuery({
    queryKey: ['contact-predictions', projectId, contactId],
    queryFn: async (): Promise<ContactPrediction[]> => {
      if (!projectId || !contactId) return [];

      const { data, error } = await supabase
        .from('contact_predictions')
        .select('*')
        .eq('project_id', projectId)
        .eq('contact_id', contactId)
        .eq('is_active', true)
        .order('urgency_score', { ascending: false });

      if (error) throw error;

      return (data || []).map(p => ({
        ...p,
        prediction_type: p.prediction_type as PredictionType,
        risk_level: p.risk_level as RiskLevel,
        explanation: (p.explanation as Record<string, any>) || {},
        recommended_actions: (p.recommended_actions as unknown as RecommendedAction[]) || [],
      }));
    },
    enabled: !!projectId && !!contactId,
  });

  // Fetch recommendation logs
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['recommendation-logs', projectId, contactId],
    queryFn: async (): Promise<RecommendationLog[]> => {
      if (!projectId || !contactId) return [];

      const { data, error } = await supabase
        .from('recommendation_logs')
        .select('*')
        .eq('project_id', projectId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map(l => ({
        ...l,
        action_type: l.action_type as RecommendationLog['action_type'],
        action_data: (l.action_data as Record<string, any>) || {},
        outcome_data: (l.outcome_data as Record<string, any>) || null,
      }));
    },
    enabled: !!projectId && !!contactId,
  });

  // Save prediction mutation
  const savePrediction = useMutation({
    mutationFn: async (prediction: Prediction) => {
      if (!projectId || !contactId) throw new Error('Missing context');

      // Deactivate existing predictions of same type
      await supabase
        .from('contact_predictions')
        .update({ is_active: false })
        .eq('project_id', projectId)
        .eq('contact_id', contactId)
        .eq('prediction_type', prediction.type);

      // Insert new prediction
      const insertData = {
        project_id: projectId,
        contact_id: contactId,
        prediction_type: prediction.type,
        confidence: prediction.confidence,
        explanation: prediction.explanation,
        recommended_actions: prediction.recommendedActions,
        risk_level: prediction.riskLevel,
        urgency_score: prediction.urgencyScore,
        expires_at: prediction.expiresAt?.toISOString() || null,
        is_active: true,
      };
      
      const { data, error } = await supabase
        .from('contact_predictions')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-predictions', projectId, contactId] });
    },
  });

  // Log recommendation action mutation
  const logAction = useMutation({
    mutationFn: async ({ 
      predictionId, 
      actionType, 
      actionData 
    }: { 
      predictionId?: string; 
      actionType: RecommendationLog['action_type']; 
      actionData: Record<string, any>;
    }) => {
      if (!projectId || !contactId) throw new Error('Missing context');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('recommendation_logs')
        .insert({
          project_id: projectId,
          contact_id: contactId,
          prediction_id: predictionId || null,
          action_type: actionType,
          action_data: actionData,
          performed_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-logs', projectId, contactId] });
    },
  });

  // Record outcome mutation
  const recordOutcome = useMutation({
    mutationFn: async ({
      logId,
      outcome,
      outcomeData
    }: {
      logId: string;
      outcome: string;
      outcomeData?: Record<string, any>;
    }) => {
      const { data, error } = await supabase
        .from('recommendation_logs')
        .update({
          outcome,
          outcome_data: outcomeData || null,
          outcome_recorded_at: new Date().toISOString(),
        })
        .eq('id', logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendation-logs', projectId, contactId] });
    },
  });

  // Dismiss prediction mutation
  const dismissPrediction = useMutation({
    mutationFn: async (predictionId: string) => {
      const { error } = await supabase
        .from('contact_predictions')
        .update({ is_active: false })
        .eq('id', predictionId);

      if (error) throw error;

      // Log dismissal
      await logAction.mutateAsync({
        predictionId,
        actionType: 'dismiss',
        actionData: { reason: 'user_dismissed' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-predictions', projectId, contactId] });
      toast.success('Recomendação descartada');
    },
  });

  // Get primary prediction
  const primaryPrediction = predictions?.[0] || null;

  return {
    predictions,
    primaryPrediction,
    logs,
    isLoading,
    isLoadingLogs,
    savePrediction,
    logAction,
    recordOutcome,
    dismissPrediction,
    refetch,
  };
}

/**
 * Hook to generate predictions for a contact with full context
 */
export function useGeneratePredictions(contactId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const { profile } = useContactProfile(contactId);
  const { savePrediction } = useContactPredictions(contactId);

  const generateAndSave = useMutation({
    mutationFn: async (additionalContext?: Partial<ContactContext>) => {
      if (!projectId || !contactId) throw new Error('Missing context');

      // Fetch additional data for context
      const [contactResult, transactionsResult, eventsResult] = await Promise.all([
        supabase
          .from('crm_contacts')
          .select('status, tags, total_revenue, total_purchases, last_activity_at, last_purchase_at')
          .eq('id', contactId)
          .single(),
        supabase
          .from('crm_transactions')
          .select('product_name, status, total_price_brl, transaction_date')
          .eq('contact_id', contactId)
          .order('transaction_date', { ascending: false })
          .limit(10),
        supabase
          .from('system_events')
          .select('event_name, source, payload, created_at')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const contact = contactResult.data;
      const transactions = transactionsResult.data || [];
      const events = eventsResult.data || [];

      // Build context
      const context: ContactContext = {
        contactId,
        projectId,
        profile: profile || undefined,
        status: contact?.status as ContactContext['status'],
        tags: contact?.tags as string[] || [],
        totalRevenue: contact?.total_revenue || 0,
        purchaseCount: contact?.total_purchases || 0,
        lastInteractionAt: contact?.last_activity_at ? new Date(contact.last_activity_at) : undefined,
        daysSinceLastPurchase: contact?.last_purchase_at 
          ? Math.floor((Date.now() - new Date(contact.last_purchase_at).getTime()) / (1000 * 60 * 60 * 24))
          : undefined,
        transactions: transactions.map(t => ({
          productName: t.product_name,
          status: t.status,
          value: t.total_price_brl || 0,
          date: new Date(t.transaction_date || Date.now()),
        })),
        events: events.map(e => ({
          eventName: e.event_name,
          source: e.source,
          payload: e.payload as Record<string, any>,
          createdAt: new Date(e.created_at),
        })),
        ...additionalContext,
      };

      // Generate predictions
      const predictions = generatePredictions(context);

      // Save top predictions
      const savedPredictions = [];
      for (const prediction of predictions.slice(0, 3)) {
        const saved = await savePrediction.mutateAsync(prediction);
        savedPredictions.push(saved);
      }

      return savedPredictions;
    },
    onSuccess: () => {
      toast.success('Previsões geradas com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar previsões: ${error.message}`);
    },
  });

  return {
    generate: generateAndSave.mutateAsync,
    isGenerating: generateAndSave.isPending,
  };
}
