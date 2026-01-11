import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";

export interface ContactProfile {
  id: string;
  contact_id: string;
  project_id: string;
  intent_vector: Record<string, number>;
  trait_vector: Record<string, number>;
  confidence_score: number;
  volatility_score: number;
  entropy_score: number;
  total_signals: number;
  signal_sources: string[];
  created_at: string;
  last_updated_at: string;
}

export interface ProfileHistoryEntry {
  id: string;
  contact_profile_id: string;
  project_id: string;
  source: 'quiz' | 'survey' | 'social' | 'purchase' | 'manual' | 'webhook' | 'import';
  source_id: string | null;
  source_name: string | null;
  delta_intent_vector: Record<string, number>;
  delta_trait_vector: Record<string, number>;
  confidence_delta: number;
  entropy_delta: number;
  profile_snapshot: Record<string, any>;
  metadata: Record<string, any> | null;
  created_at: string;
}

/**
 * Hook to fetch and manage a contact's cognitive profile
 */
export function useContactProfile(contactId?: string) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const queryClient = useQueryClient();

  // Fetch profile
  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['contact-profile', projectId, contactId],
    queryFn: async (): Promise<ContactProfile | null> => {
      if (!projectId || !contactId) return null;

      const { data, error } = await supabase
        .from('contact_profiles')
        .select('*')
        .eq('project_id', projectId)
        .eq('contact_id', contactId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        ...data,
        intent_vector: (data.intent_vector as Record<string, number>) || {},
        trait_vector: (data.trait_vector as Record<string, number>) || {},
        signal_sources: (data.signal_sources as string[]) || [],
      };
    },
    enabled: !!projectId && !!contactId,
  });

  // Fetch profile history
  const { data: history, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['contact-profile-history', projectId, contactId],
    queryFn: async (): Promise<ProfileHistoryEntry[]> => {
      if (!projectId || !contactId || !profile?.id) return [];

      const { data, error } = await supabase
        .from('contact_profile_history')
        .select('*')
        .eq('contact_profile_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map(entry => ({
        ...entry,
        source: entry.source as ProfileHistoryEntry['source'],
        delta_intent_vector: (entry.delta_intent_vector as Record<string, number>) || {},
        delta_trait_vector: (entry.delta_trait_vector as Record<string, number>) || {},
        profile_snapshot: (entry.profile_snapshot as Record<string, any>) || {},
        metadata: (entry.metadata as Record<string, any>) || null,
      }));
    },
    enabled: !!projectId && !!contactId && !!profile?.id,
  });

  // Get recent history (last 3)
  const recentHistory = history?.slice(0, 3) || [];

  // Calculate evolution trend
  const evolutionTrend = calculateEvolutionTrend(history || []);

  return {
    profile,
    history,
    recentHistory,
    evolutionTrend,
    isLoading,
    isLoadingHistory,
    error,
    refetch,
  };
}

interface EvolutionTrend {
  confidenceTrend: 'up' | 'down' | 'stable';
  entropyTrend: 'up' | 'down' | 'stable';
  volatilityTrend: 'up' | 'down' | 'stable';
  signalFrequency: 'increasing' | 'decreasing' | 'stable';
  dominantSource: string | null;
}

function calculateEvolutionTrend(history: ProfileHistoryEntry[]): EvolutionTrend {
  if (history.length < 2) {
    return {
      confidenceTrend: 'stable',
      entropyTrend: 'stable',
      volatilityTrend: 'stable',
      signalFrequency: 'stable',
      dominantSource: history[0]?.source || null,
    };
  }

  // Calculate average deltas from recent history
  const recentEntries = history.slice(0, 5);
  const avgConfidenceDelta = recentEntries.reduce((sum, e) => sum + e.confidence_delta, 0) / recentEntries.length;
  const avgEntropyDelta = recentEntries.reduce((sum, e) => sum + e.entropy_delta, 0) / recentEntries.length;

  // Count sources
  const sourceCounts: Record<string, number> = {};
  history.forEach(e => {
    sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
  });
  const dominantSource = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Calculate signal frequency trend
  const oldEntries = history.slice(5, 10);
  const recentCount = recentEntries.length;
  const oldCount = oldEntries.length;
  const signalFrequency: 'increasing' | 'decreasing' | 'stable' = 
    recentCount > oldCount * 1.2 ? 'increasing' :
    recentCount < oldCount * 0.8 ? 'decreasing' : 'stable';

  return {
    confidenceTrend: avgConfidenceDelta > 0.01 ? 'up' : avgConfidenceDelta < -0.01 ? 'down' : 'stable',
    entropyTrend: avgEntropyDelta > 0.01 ? 'up' : avgEntropyDelta < -0.01 ? 'down' : 'stable',
    volatilityTrend: 'stable', // Would need volatility history to calculate
    signalFrequency,
    dominantSource,
  };
}

/**
 * Get primary trait from profile
 */
export function getPrimaryTrait(profile: ContactProfile | null): { name: string; value: number } | null {
  if (!profile?.trait_vector) return null;
  const entries = Object.entries(profile.trait_vector);
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return { name: sorted[0][0], value: sorted[0][1] };
}

/**
 * Get primary intent from profile
 */
export function getPrimaryIntent(profile: ContactProfile | null): { name: string; value: number } | null {
  if (!profile?.intent_vector) return null;
  const entries = Object.entries(profile.intent_vector);
  if (entries.length === 0) return null;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return { name: sorted[0][0], value: sorted[0][1] };
}

/**
 * Format source name for display
 */
export function formatSourceName(source: string): string {
  const sourceLabels: Record<string, string> = {
    quiz: 'Quiz',
    survey: 'Pesquisa',
    social: 'Social',
    purchase: 'Compra',
    manual: 'Manual',
    webhook: 'Webhook',
    import: 'Importação',
  };
  return sourceLabels[source] || source;
}

/**
 * Get color for source badge
 */
export function getSourceColor(source: string): string {
  const sourceColors: Record<string, string> = {
    quiz: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    survey: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    social: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    purchase: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    manual: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    webhook: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    import: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return sourceColors[source] || 'bg-gray-100 text-gray-800';
}
