/**
 * useFinancialLiveLayer
 * 
 * Hook for accessing Live Layer financial data (today only).
 * This data is real-time and NOT safe for AI consumption.
 * 
 * IMPORTANT:
 * - Live data is marked with trust_level: 'live'
 * - Never use for AI analysis
 * - Always display with appropriate warning badges
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { getTodayString, type TrustLevel } from '@/lib/financialTimeModel';

// ============================================
// Types
// ============================================

export interface LiveFinancialData {
  project_id: string;
  funnel_id: string | null;
  funnel_name: string | null;
  economic_day: string;
  revenue: number;
  gross_revenue: number;
  sales_count: number;
  spend: number;
  profit: number;
  roas: number | null;
  cpa: number | null;
  data_source: 'live';
  is_estimated: boolean;
}

export interface LiveProjectTotals {
  project_id: string;
  economic_day: string;
  total_revenue: number;
  total_gross_revenue: number;
  total_sales: number;
  total_spend: number;
  total_profit: number;
  overall_roas: number | null;
  overall_cpa: number | null;
  data_source: 'live';
  is_estimated: boolean;
}

export interface LiveSalesData {
  project_id: string;
  funnel_id: string | null;
  funnel_name: string | null;
  economic_day: string;
  revenue: number;
  gross_revenue: number;
  sales_count: number;
  unique_buyers: number;
  data_source: 'live';
  is_estimated: boolean;
}

export interface LiveSpendData {
  project_id: string;
  funnel_id: string | null;
  funnel_name: string | null;
  economic_day: string;
  spend: number;
  record_count: number;
  data_source: 'live';
  is_estimated: boolean;
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch live financial data for today (all funnels)
 */
export function useLiveFinancialToday() {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['live-financial-today', currentProject?.id],
    queryFn: async () => {
      // Use raw query to avoid type issues with views that changed structure
      const { data, error } = await (supabase as any)
        .from('live_financial_today')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      if (error) throw error;
      
      return {
        data: (data || []) as LiveFinancialData[],
        trustLevel: 'live' as TrustLevel,
        isEstimated: true,
        fetchedAt: new Date().toISOString(),
      };
    },
    enabled: !!currentProject?.id,
    staleTime: 60 * 1000, // 1 minute - live data updates frequently
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Fetch live project totals for today
 */
export function useLiveProjectTotals() {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['live-project-totals', currentProject?.id],
    queryFn: async () => {
      // Use raw query to avoid type issues with views that changed structure
      const { data, error } = await (supabase as any)
        .from('live_project_totals_today')
        .select('*')
        .eq('project_id', currentProject!.id)
        .maybeSingle();
      
      if (error) throw error;
      
      return {
        data: data as LiveProjectTotals | null,
        trustLevel: 'live' as TrustLevel,
        isEstimated: true,
        fetchedAt: new Date().toISOString(),
      };
    },
    enabled: !!currentProject?.id,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Fetch live sales for today
 */
export function useLiveSalesToday() {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['live-sales-today', currentProject?.id],
    queryFn: async () => {
      // Use raw query to avoid type issues with views that changed structure
      const { data, error } = await (supabase as any)
        .from('live_sales_today')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      if (error) throw error;
      
      return {
        data: (data || []) as LiveSalesData[],
        trustLevel: 'live' as TrustLevel,
        isEstimated: true,
      };
    },
    enabled: !!currentProject?.id,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch live spend for today
 */
export function useLiveSpendToday() {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['live-spend-today', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_spend_today')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      if (error) throw error;
      
      return {
        data: (data || []) as LiveSpendData[],
        trustLevel: 'live' as TrustLevel,
        isEstimated: true,
      };
    },
    enabled: !!currentProject?.id,
    staleTime: 60 * 1000,
  });
}

/**
 * Log a financial query for auditing
 * Note: Uses raw SQL insert since the table may not be in generated types yet
 */
export async function logFinancialQuery(
  projectId: string,
  context: string,
  dateRange: { start: string; end: string } | null,
  mode: 'core' | 'live' | 'mixed',
  sources: string[],
  usedForAI: boolean,
  metadata?: Record<string, unknown>
) {
  try {
    // Use rpc to avoid type issues with new table
    await supabase.rpc('log_financial_query' as never, {
      p_project_id: projectId,
      p_query_context: context,
      p_date_range_start: dateRange?.start || null,
      p_date_range_end: dateRange?.end || null,
      p_mode: mode,
      p_sources: sources,
      p_used_for_ai: usedForAI,
      p_trust_level: mode === 'core' ? 'core' : 'live',
      p_metadata: metadata || {},
    } as never);
  } catch (error) {
    // Silently fail - logging is not critical
    console.debug('Financial query logging skipped:', error);
  }
}
