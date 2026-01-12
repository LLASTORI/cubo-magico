/**
 * useFunnelOptimization
 * 
 * Optimization hooks for funnel performance.
 * 
 * IMPORTANT: All financial data MUST come from Financial Core (funnel_financials view).
 * Legacy data (before financial_core_start_date) is ignored for optimization.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { 
  PathSignature, 
  FunnelPerformance, 
  OptimizationSuggestion,
  PathComparison,
  OptimizationConfig,
  DEFAULT_OPTIMIZATION_CONFIG,
  comparePaths,
  generateOptimizationSuggestions,
  signatureToHash
} from '@/lib/funnelOptimizationEngine';
import { Json } from '@/integrations/supabase/types';

// ============================================
// Funnel Performance Hooks
// ============================================

export function useFunnelPerformance(funnelId?: string) {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['funnel-performance', currentProject?.id, funnelId],
    queryFn: async () => {
      let query = supabase
        .from('funnel_performance')
        .select('*')
        .eq('project_id', currentProject!.id)
        .order('performance_score', { ascending: false });
      
      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(row => ({
        ...row,
        path_signature: row.path_signature as unknown as PathSignature,
        trend: row.trend as 'improving' | 'declining' | 'stable'
      })) as FunnelPerformance[];
    },
    enabled: !!currentProject?.id
  });
}

export function useTopPerformingPaths(limit = 5) {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['top-performing-paths', currentProject?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_performance')
        .select('*')
        .eq('project_id', currentProject!.id)
        .gte('sample_size', 50)
        .order('performance_score', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data.map(row => ({
        ...row,
        path_signature: row.path_signature as unknown as PathSignature,
        trend: row.trend as 'improving' | 'declining' | 'stable'
      })) as FunnelPerformance[];
    },
    enabled: !!currentProject?.id
  });
}

export function useUnderperformingPaths(limit = 5) {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['underperforming-paths', currentProject?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_performance')
        .select('*')
        .eq('project_id', currentProject!.id)
        .gte('sample_size', 50)
        .order('performance_score', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return data.map(row => ({
        ...row,
        path_signature: row.path_signature as unknown as PathSignature,
        trend: row.trend as 'improving' | 'declining' | 'stable'
      })) as FunnelPerformance[];
    },
    enabled: !!currentProject?.id
  });
}

export function usePathComparisons(pathId: string) {
  const { data: allPaths } = useFunnelPerformance();
  
  return useQuery({
    queryKey: ['path-comparisons', pathId, allPaths?.length],
    queryFn: () => {
      if (!allPaths) return [];
      
      const targetPath = allPaths.find(p => p.id === pathId);
      if (!targetPath) return [];
      
      const comparisons: PathComparison[] = allPaths
        .filter(p => p.id !== pathId && p.path_type === targetPath.path_type)
        .map(otherPath => comparePaths(targetPath, otherPath))
        .filter(c => c.similarity_score > 0.3)
        .sort((a, b) => b.similarity_score - a.similarity_score);
      
      return comparisons;
    },
    enabled: !!allPaths && !!pathId
  });
}

// ============================================
// Optimization Suggestions Hooks
// ============================================

export function useOptimizationSuggestions(status?: string) {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['optimization-suggestions', currentProject?.id, status],
    queryFn: async () => {
      let query = supabase
        .from('funnel_optimization_suggestions')
        .select('*, funnel_performance:funnel_performance_id(*)')
        .eq('project_id', currentProject!.id)
        .order('impact_estimate', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data;
    },
    enabled: !!currentProject?.id
  });
}

export function usePendingSuggestions() {
  return useOptimizationSuggestions('pending');
}

export function useGenerateSuggestions() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  const { data: allPaths } = useFunnelPerformance();
  
  return useMutation({
    mutationFn: async (config: Partial<OptimizationConfig> = {}) => {
      if (!currentProject?.id || !allPaths) {
        throw new Error('Missing project or paths data');
      }
      
      const finalConfig = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
      const allSuggestions: OptimizationSuggestion[] = [];
      
      for (const path of allPaths) {
        const comparisons = allPaths
          .filter(p => p.id !== path.id && p.path_type === path.path_type)
          .map(otherPath => comparePaths(path, otherPath))
          .filter(c => c.similarity_score > 0.3);
        
        const suggestions = generateOptimizationSuggestions(path, comparisons, finalConfig);
        allSuggestions.push(...suggestions);
      }
      
      if (allSuggestions.length > 0) {
        const { error } = await supabase
          .from('funnel_optimization_suggestions')
          .insert(allSuggestions.map(s => ({
            project_id: s.project_id,
            funnel_performance_id: s.funnel_performance_id,
            suggestion_type: s.suggestion_type,
            title: s.title,
            description: s.description,
            impact_estimate: s.impact_estimate,
            confidence: s.confidence,
            evidence: s.evidence as unknown as Json,
            recommended_action: s.recommended_action as unknown as Json,
            status: s.status
          })));
        
        if (error) throw error;
      }
      
      return allSuggestions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-suggestions'] });
    }
  });
}

export function useUpdateSuggestionStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      suggestionId, 
      status, 
      reviewedBy 
    }: { 
      suggestionId: string; 
      status: 'approved' | 'rejected' | 'applied' | 'rolled_back';
      reviewedBy?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (reviewedBy) {
        updates.reviewed_by = reviewedBy;
        updates.reviewed_at = new Date().toISOString();
      }
      
      if (status === 'applied') {
        updates.applied_at = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('funnel_optimization_suggestions')
        .update(updates)
        .eq('id', suggestionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['optimization-suggestions'] });
    }
  });
}

// ============================================
// Experiments Hooks
// ============================================

export function useFunnelExperiments(status?: string) {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['funnel-experiments', currentProject?.id, status],
    queryFn: async () => {
      let query = supabase
        .from('funnel_experiments')
        .select('*, funnel_performance:funnel_performance_id(*)')
        .eq('project_id', currentProject!.id)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data;
    },
    enabled: !!currentProject?.id
  });
}

export function useCreateExperiment() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (experiment: {
      name: string;
      description?: string;
      funnel_performance_id?: string;
      suggestion_id?: string;
      control_config: Record<string, unknown>;
      variant_config: Record<string, unknown>;
      traffic_split?: number;
      min_sample_size?: number;
      confidence_threshold?: number;
    }) => {
      const { data, error } = await supabase
        .from('funnel_experiments')
        .insert({
          project_id: currentProject!.id,
          ...experiment,
          control_config: experiment.control_config as Json,
          variant_config: experiment.variant_config as Json,
          status: 'draft'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-experiments'] });
    }
  });
}

export function useUpdateExperimentStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      experimentId, 
      status,
      winner,
      results
    }: { 
      experimentId: string; 
      status: 'running' | 'paused' | 'completed' | 'cancelled';
      winner?: string;
      results?: Record<string, unknown>;
    }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'running') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed' || status === 'cancelled') {
        updates.ended_at = new Date().toISOString();
      }
      
      if (winner) updates.winner = winner;
      if (results) updates.results = results;
      
      const { error } = await supabase
        .from('funnel_experiments')
        .update(updates)
        .eq('id', experimentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-experiments'] });
    }
  });
}

// ============================================
// Path Events Hooks
// ============================================

export function useRecordPathEvent() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (event: {
      funnel_performance_id?: string;
      contact_id?: string;
      experiment_id?: string;
      path_signature: PathSignature;
      variant?: string;
      event_type: 'entry' | 'progress' | 'conversion' | 'churn' | 'exit';
      event_data?: Record<string, unknown>;
      conversion_value?: number;
    }) => {
      const { error } = await supabase
        .from('path_events')
        .insert({
          project_id: currentProject!.id,
          funnel_performance_id: event.funnel_performance_id,
          contact_id: event.contact_id,
          experiment_id: event.experiment_id,
          path_signature: event.path_signature as unknown as Json,
          variant: event.variant || 'control',
          event_type: event.event_type,
          event_data: (event.event_data || {}) as Json,
          conversion_value: event.conversion_value
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-performance'] });
    }
  });
}

export function useGetOrCreateFunnelPerformance() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      pathSignature,
      pathType,
      pathName,
      funnelId
    }: {
      pathSignature: PathSignature;
      pathType: string;
      pathName?: string;
      funnelId?: string;
    }) => {
      const hash = signatureToHash(pathSignature);
      
      const { data: existing } = await supabase
        .from('funnel_performance')
        .select('*')
        .eq('project_id', currentProject!.id)
        .eq('path_type', pathType)
        .contains('path_signature', { type: pathSignature.type })
        .limit(1);
      
      if (existing && existing.length > 0) {
        const existingHash = signatureToHash(existing[0].path_signature as unknown as PathSignature);
        if (existingHash === hash) {
          return existing[0];
        }
      }
      
      const { data, error } = await supabase
        .from('funnel_performance')
        .insert({
          project_id: currentProject!.id,
          funnel_id: funnelId,
          path_signature: pathSignature as unknown as Json,
          path_type: pathType,
          path_name: pathName
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel-performance'] });
    }
  });
}

// ============================================
// Summary Stats
// ============================================

export function useFunnelOptimizationStats() {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['funnel-optimization-stats', currentProject?.id],
    queryFn: async () => {
      const [performanceResult, suggestionsResult, experimentsResult] = await Promise.all([
        supabase
          .from('funnel_performance')
          .select('performance_score, trend, sample_size')
          .eq('project_id', currentProject!.id),
        supabase
          .from('funnel_optimization_suggestions')
          .select('status, impact_estimate')
          .eq('project_id', currentProject!.id),
        supabase
          .from('funnel_experiments')
          .select('status, winner')
          .eq('project_id', currentProject!.id)
      ]);
      
      const paths = performanceResult.data || [];
      const suggestions = suggestionsResult.data || [];
      const experiments = experimentsResult.data || [];
      
      const avgScore = paths.length > 0
        ? paths.reduce((sum, p) => sum + (p.performance_score || 0), 0) / paths.length
        : 0;
      
      const improvingPaths = paths.filter(p => p.trend === 'improving').length;
      const decliningPaths = paths.filter(p => p.trend === 'declining').length;
      
      const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length;
      const appliedSuggestions = suggestions.filter(s => s.status === 'applied').length;
      const totalPotentialImpact = suggestions
        .filter(s => s.status === 'pending')
        .reduce((sum, s) => sum + (s.impact_estimate || 0), 0);
      
      const runningExperiments = experiments.filter(e => e.status === 'running').length;
      const completedExperiments = experiments.filter(e => e.status === 'completed').length;
      const successfulExperiments = experiments.filter(e => e.winner === 'variant').length;
      
      return {
        totalPaths: paths.length,
        avgPerformanceScore: Math.round(avgScore * 10) / 10,
        improvingPaths,
        decliningPaths,
        stablePaths: paths.length - improvingPaths - decliningPaths,
        pendingSuggestions,
        appliedSuggestions,
        totalPotentialImpact: Math.round(totalPotentialImpact * 10) / 10,
        runningExperiments,
        completedExperiments,
        successfulExperiments,
        experimentWinRate: completedExperiments > 0 
          ? Math.round(successfulExperiments / completedExperiments * 100) 
          : 0
      };
    },
    enabled: !!currentProject?.id
  });
}
