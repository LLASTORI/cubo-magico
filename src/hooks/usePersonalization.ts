import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  generatePersonalizationDirectives,
  buildTokenValues,
  resolveTokens,
  type PersonalizationContext,
  type PersonalizationDirectives,
  type PersonalizationChannel,
  type PersonalizationDepth,
  type TokenValues
} from '@/lib/personalizationEngine';
import type { Memory, MemoryType } from '@/lib/memoryExtractionEngine';

// Fetch or create personalization context
export function usePersonalizationContext(
  projectId: string | undefined,
  contactId: string | undefined,
  sessionId: string,
  channel: PersonalizationChannel
) {
  return useQuery({
    queryKey: ['personalization-context', projectId, contactId, sessionId, channel],
    queryFn: async () => {
      if (!projectId) return null;

      // Try to find existing context
      const query = supabase
        .from('personalization_contexts')
        .select('*')
        .eq('project_id', projectId)
        .eq('session_id', sessionId)
        .eq('channel', channel)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (contactId) {
        query.eq('contact_id', contactId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!projectId
  });
}

// Create a new personalization context
export function useCreatePersonalizationContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      contactId,
      sessionId,
      channel,
      profile,
      memories,
      predictions,
      depth = 'standard',
      excludedMemoryTypes = []
    }: {
      projectId: string;
      contactId?: string;
      sessionId: string;
      channel: PersonalizationChannel;
      profile?: any;
      memories?: any[];
      predictions?: any[];
      depth?: PersonalizationDepth;
      excludedMemoryTypes?: MemoryType[];
    }) => {
      // Find dominant trait and intent
      let dominantTrait: string | null = null;
      let currentIntent: string | null = null;

      if (profile?.trait_vector) {
        const traits = Object.entries(profile.trait_vector as Record<string, number>)
          .sort((a, b) => b[1] - a[1]);
        if (traits[0]) dominantTrait = traits[0][0];
      }

      if (profile?.intent_vector) {
        const intents = Object.entries(profile.intent_vector as Record<string, number>)
          .sort((a, b) => b[1] - a[1]);
        if (intents[0]) currentIntent = intents[0][0];
      }

      const insertData = {
        project_id: projectId,
        contact_id: contactId || null,
        session_id: sessionId,
        channel,
        current_intent: currentIntent,
        dominant_trait: dominantTrait,
        memory_signals: (memories || []).map((m: Memory) => ({
          type: m.memory_type,
          summary: m.content.summary,
          confidence: m.confidence
        })),
        prediction_signals: (predictions || []).map((p: any) => ({
          type: p.prediction_type,
          urgency: p.urgency_score,
          risk: p.risk_level
        })),
        profile_snapshot: profile || {},
        personalization_depth: depth,
        excluded_memory_types: excludedMemoryTypes,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      };

      const { data, error } = await supabase
        .from('personalization_contexts')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['personalization-context', data.project_id] 
      });
    },
    onError: (error) => {
      console.error('Error creating personalization context:', error);
    }
  });
}

// Generate personalization directives
export function useGenerateDirectives() {
  return useMutation({
    mutationFn: async ({
      profile,
      memories,
      predictions,
      channel,
      depth = 'standard',
      excludedMemoryTypes = [],
      humanOverride
    }: {
      profile?: any;
      memories: Memory[];
      predictions: any[];
      channel: PersonalizationChannel;
      depth?: PersonalizationDepth;
      excludedMemoryTypes?: MemoryType[];
      humanOverride?: Partial<PersonalizationDirectives>;
    }) => {
      const context: PersonalizationContext = {
        session_id: crypto.randomUUID(),
        channel,
        profile: profile ? {
          trait_vector: profile.trait_vector || {},
          intent_vector: profile.intent_vector || {},
          confidence_score: profile.confidence_score || 0,
          entropy_score: profile.entropy_score || 0
        } : undefined,
        memories,
        predictions,
        depth,
        excluded_memory_types: excludedMemoryTypes,
        human_override: humanOverride
      };

      return generatePersonalizationDirectives(context);
    }
  });
}

// Log personalization application
export function useLogPersonalization() {
  return useMutation({
    mutationFn: async ({
      projectId,
      contextId,
      contactId,
      sessionId,
      channel,
      directives,
      tokensResolved,
      contentOriginal,
      contentPersonalized,
      applied
    }: {
      projectId: string;
      contextId?: string;
      contactId?: string;
      sessionId?: string;
      channel: PersonalizationChannel;
      directives: PersonalizationDirectives;
      tokensResolved: Partial<TokenValues>;
      contentOriginal?: string;
      contentPersonalized?: string;
      applied: boolean;
    }) => {
      const insertData = {
        project_id: projectId,
        context_id: contextId || null,
        contact_id: contactId || null,
        session_id: sessionId || null,
        channel,
        directives: directives as any,
        tokens_resolved: tokensResolved as any,
        content_original: contentOriginal || null,
        content_personalized: contentPersonalized || null,
        applied
      };

      const { data, error } = await supabase
        .from('personalization_logs')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  });
}

// Resolve content tokens
export function useResolveTokens() {
  return useMutation({
    mutationFn: async ({
      content,
      profile,
      memories,
      predictions,
      channel,
      contactName
    }: {
      content: string;
      profile?: any;
      memories: Memory[];
      predictions: any[];
      channel: PersonalizationChannel;
      contactName?: string;
    }) => {
      const context: PersonalizationContext = {
        session_id: crypto.randomUUID(),
        channel,
        profile: profile ? {
          trait_vector: profile.trait_vector || {},
          intent_vector: profile.intent_vector || {},
          confidence_score: profile.confidence_score || 0,
          entropy_score: profile.entropy_score || 0
        } : undefined,
        memories,
        predictions,
        depth: 'standard',
        excluded_memory_types: []
      };

      const tokenValues = buildTokenValues(context, contactName);
      const resolved = resolveTokens(content, tokenValues);

      return {
        original: content,
        resolved,
        tokens: tokenValues
      };
    }
  });
}

// Fetch personalization logs for a contact
export function usePersonalizationLogs(contactId: string | undefined) {
  return useQuery({
    queryKey: ['personalization-logs', contactId],
    queryFn: async () => {
      if (!contactId) return [];

      const { data, error } = await supabase
        .from('personalization_logs')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId
  });
}

// Hook for complete personalization flow
export function usePersonalizeContent() {
  const generateDirectives = useGenerateDirectives();
  const resolveTokensMutation = useResolveTokens();
  const logPersonalization = useLogPersonalization();

  return useMutation({
    mutationFn: async ({
      content,
      projectId,
      contactId,
      contactName,
      profile,
      memories,
      predictions,
      channel,
      depth = 'standard',
      excludedMemoryTypes = [],
      humanOverride
    }: {
      content: string;
      projectId: string;
      contactId?: string;
      contactName?: string;
      profile?: any;
      memories: Memory[];
      predictions: any[];
      channel: PersonalizationChannel;
      depth?: PersonalizationDepth;
      excludedMemoryTypes?: MemoryType[];
      humanOverride?: Partial<PersonalizationDirectives>;
    }) => {
      // Generate directives
      const directives = await generateDirectives.mutateAsync({
        profile,
        memories,
        predictions,
        channel,
        depth,
        excludedMemoryTypes,
        humanOverride
      });

      // Resolve tokens
      const { resolved, tokens } = await resolveTokensMutation.mutateAsync({
        content,
        profile,
        memories,
        predictions,
        channel,
        contactName
      });

      // Log the personalization
      await logPersonalization.mutateAsync({
        projectId,
        contactId,
        channel,
        directives,
        tokensResolved: tokens,
        contentOriginal: content,
        contentPersonalized: resolved,
        applied: true
      });

      return {
        directives,
        content: resolved,
        tokens
      };
    }
  });
}
