/**
 * useFunnelFinancials
 * 
 * Canonical hook for funnel financial data from Financial Core.
 * This is the ONLY source of truth for funnel ROAS, profit, and CPA.
 * 
 * IMPORTANT: Never use legacy Meta/Hotmart tables for optimization.
 * All AI and optimization must use these views.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectSettings } from './useProjectSettings';

// ============================================
// Types
// ============================================

export interface FunnelFinancialsDaily {
  project_id: string;
  funnel_id: string;
  economic_day: string;
  revenue: number;
  gross_revenue: number;
  sales_count: number;
  spend: number;
  profit: number;
  roas: number | null;
  cpa: number | null;
}

export interface FunnelFinancialsSummary {
  project_id: string;
  funnel_id: string;
  funnel_name: string;
  funnel_type: string;
  roas_target: number | null;
  financial_core_start_date: string | null;
  total_revenue: number;
  total_gross_revenue: number;
  total_spend: number;
  total_sales: number;
  total_profit: number;
  overall_roas: number | null;
  overall_cpa: number | null;
  avg_ticket: number | null;
  health_status: 'excellent' | 'good' | 'attention' | 'danger' | 'no-return' | 'inactive';
  first_day: string | null;
  last_day: string | null;
  days_with_data: number;
}

export interface FunnelRevenueDaily {
  project_id: string;
  funnel_id: string;
  economic_day: string;
  revenue: number;
  gross_revenue: number;
  sales_count: number;
}

export interface FunnelSpendDaily {
  project_id: string;
  funnel_id: string;
  economic_day: string;
  spend: number;
  record_count: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch daily funnel financials from Core
 * Respects financial_core_start_date automatically
 */
export function useFunnelFinancialsDaily(options?: {
  funnelId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();
  
  return useQuery({
    queryKey: ['funnel-financials-daily', currentProject?.id, options?.funnelId, options?.startDate, options?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('funnel_financials')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      // Always filter by Core start date
      const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
      query = query.gte('economic_day', coreStartDate);
      
      if (options?.funnelId) {
        query = query.eq('funnel_id', options.funnelId);
      }
      
      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }
      
      query = query.order('economic_day', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as FunnelFinancialsDaily[];
    },
    enabled: !!currentProject?.id
  });
}

/**
 * Fetch aggregated funnel financials summary
 * Pre-filtered by financial_core_start_date in the view
 */
export function useFunnelFinancialsSummary(funnelId?: string) {
  const { currentProject } = useProject();
  
  return useQuery({
    queryKey: ['funnel-financials-summary', currentProject?.id, funnelId],
    queryFn: async () => {
      let query = supabase
        .from('funnel_financials_summary')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }
      
      query = query.order('total_revenue', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as FunnelFinancialsSummary[];
    },
    enabled: !!currentProject?.id
  });
}

/**
 * Fetch funnel revenue only (from sales_core_events)
 */
export function useFunnelRevenue(options?: {
  funnelId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();
  
  return useQuery({
    queryKey: ['funnel-revenue', currentProject?.id, options?.funnelId, options?.startDate, options?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('funnel_revenue')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
      query = query.gte('economic_day', coreStartDate);
      
      if (options?.funnelId) {
        query = query.eq('funnel_id', options.funnelId);
      }
      
      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as FunnelRevenueDaily[];
    },
    enabled: !!currentProject?.id
  });
}

/**
 * Fetch funnel spend only (from spend_core_events)
 */
export function useFunnelSpend(options?: {
  funnelId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();
  
  return useQuery({
    queryKey: ['funnel-spend', currentProject?.id, options?.funnelId, options?.startDate, options?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('funnel_spend')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
      query = query.gte('economic_day', coreStartDate);
      
      if (options?.funnelId) {
        query = query.eq('funnel_id', options.funnelId);
      }
      
      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as FunnelSpendDaily[];
    },
    enabled: !!currentProject?.id
  });
}

/**
 * Calculate overall project ROAS from Core data
 */
export function useProjectROAS(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { data: financials, isLoading } = useFunnelFinancialsDaily(options);
  
  const metrics = {
    totalRevenue: 0,
    totalSpend: 0,
    roas: null as number | null,
    profit: 0,
    totalSales: 0,
  };
  
  if (financials && financials.length > 0) {
    metrics.totalRevenue = financials.reduce((sum, f) => sum + (f.revenue || 0), 0);
    metrics.totalSpend = financials.reduce((sum, f) => sum + (f.spend || 0), 0);
    metrics.totalSales = financials.reduce((sum, f) => sum + (f.sales_count || 0), 0);
    metrics.profit = metrics.totalRevenue - metrics.totalSpend;
    metrics.roas = metrics.totalSpend > 0 ? metrics.totalRevenue / metrics.totalSpend : null;
  }
  
  return { metrics, isLoading };
}

/**
 * Get funnel health status from Core
 */
export function useFunnelHealth(funnelId: string) {
  const { data: summaries, isLoading } = useFunnelFinancialsSummary(funnelId);
  
  const health = summaries?.[0] || null;
  
  return {
    health,
    isLoading,
    status: health?.health_status || 'inactive',
    roas: health?.overall_roas || null,
    roasTarget: health?.roas_target || null,
  };
}

/**
 * Check if a date is within Core era
 */
export function useIsCorePeriod(date: string) {
  const { settings } = useProjectSettings();
  const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
  return date >= coreStartDate;
}

/**
 * Get financial context for AI analysis
 * Returns data formatted for AI consumption
 */
export function useFunnelAIContext(funnelId: string, options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { data: dailyData, isLoading: loadingDaily } = useFunnelFinancialsDaily({
    funnelId,
    startDate: options?.startDate,
    endDate: options?.endDate,
  });
  
  const { data: summaries, isLoading: loadingSummary } = useFunnelFinancialsSummary(funnelId);
  
  const summary = summaries?.[0] || null;
  
  return {
    isLoading: loadingDaily || loadingSummary,
    summary,
    dailyData: dailyData || [],
    // AI-ready format
    aiContext: summary ? {
      funnel_id: summary.funnel_id,
      funnel_name: summary.funnel_name,
      health_status: summary.health_status,
      total_revenue: summary.total_revenue,
      total_spend: summary.total_spend,
      total_sales: summary.total_sales,
      overall_roas: summary.overall_roas,
      overall_cpa: summary.overall_cpa,
      avg_ticket: summary.avg_ticket,
      roas_target: summary.roas_target,
      days_with_data: summary.days_with_data,
      data_source: 'financial_core',
      core_start_date: summary.financial_core_start_date,
    } : null,
  };
}
