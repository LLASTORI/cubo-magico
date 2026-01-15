/**
 * useTimeAwareFinancials
 * 
 * Master hook for time-aware financial data that respects the Core vs Live separation.
 * This hook automatically determines which data source to use based on date range.
 * 
 * Rules:
 * - date < today: Use Financial Core
 * - date === today: Use Live Layer
 * - Never mix for calculations
 * - AI only receives Core data
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectSettings } from './useProjectSettings';
import { 
  getFinancialDataContext, 
  getTodayString, 
  type FinancialDataMode,
  type FinancialDataContext,
  type TrustLevel 
} from '@/lib/financialTimeModel';
import { logFinancialQuery } from './useFinancialLiveLayer';

// ============================================
// Types
// ============================================

export interface TimeAwareFinancialData {
  project_id: string;
  funnel_id: string | null;
  funnel_name?: string | null;
  economic_day: string;
  revenue: number;
  gross_revenue: number;
  sales_count: number;
  spend: number;
  profit: number;
  roas: number | null;
  cpa: number | null;
  data_source: 'core' | 'live';
  is_estimated: boolean;
}

export interface TimeAwareResult {
  coreData: TimeAwareFinancialData[];
  liveData: TimeAwareFinancialData[];
  combinedData: TimeAwareFinancialData[];
  context: FinancialDataContext;
  mode: FinancialDataMode;
  trustLevel: TrustLevel;
  isLoading: boolean;
  isCoreLoading: boolean;
  isLiveLoading: boolean;
}

export interface TimeAwareSummary {
  totalRevenue: number;
  totalSpend: number;
  totalSales: number;
  totalProfit: number;
  roas: number | null;
  cpa: number | null;
  mode: FinancialDataMode;
  trustLevel: TrustLevel;
  liveRevenue: number;
  liveSpend: number;
  liveSales: number;
  coreRevenue: number;
  coreSpend: number;
  coreSales: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Master hook for time-aware financial data
 */
export function useTimeAwareFinancials(options: {
  startDate: string;
  endDate: string;
  funnelId?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();
  
  const today = getTodayString();
  const coreStartDate = settings?.financial_core_start_date || today;
  
  // Analyze the date range
  const context = useMemo(() => 
    getFinancialDataContext(options.startDate, options.endDate, coreStartDate),
    [options.startDate, options.endDate, coreStartDate]
  );
  
  // Fetch Core data (historical, excluding today)
  const coreEndDate = context.hasLiveData && options.endDate >= today
    ? new Date(new Date(today).setDate(new Date(today).getDate() - 1)).toISOString().split('T')[0]
    : options.endDate;
  
  const shouldFetchCore = coreEndDate >= options.startDate && coreEndDate >= coreStartDate;
  
  const { data: coreData, isLoading: isCoreLoading } = useQuery({
    queryKey: ['time-aware-core', currentProject?.id, options.funnelId, options.startDate, coreEndDate],
    queryFn: async () => {
      let query = supabase
        .from('funnel_financials')
        .select('*')
        .eq('project_id', currentProject!.id)
        .gte('economic_day', Math.max(new Date(options.startDate).getTime(), new Date(coreStartDate).getTime()) === new Date(coreStartDate).getTime() ? coreStartDate : options.startDate)
        .lte('economic_day', coreEndDate);
      
      if (options.funnelId) {
        query = query.eq('funnel_id', options.funnelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(d => ({
        ...d,
        data_source: 'core' as const,
        is_estimated: false,
      }));
    },
    enabled: !!currentProject?.id && shouldFetchCore,
  });
  
  // Fetch Live data (today only)
  const shouldFetchLive = context.hasLiveData;
  
  const { data: liveData, isLoading: isLiveLoading } = useQuery({
    queryKey: ['time-aware-live', currentProject?.id, options.funnelId],
    queryFn: async () => {
      // Use raw query to avoid type issues with views that changed structure
      let query = (supabase as any)
        .from('live_financial_today')
        .select('*')
        .eq('project_id', currentProject!.id);
      
      if (options.funnelId) {
        query = query.eq('funnel_id', options.funnelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return ((data || []) as TimeAwareFinancialData[]).map(d => ({
        ...d,
        data_source: 'live' as const,
        is_estimated: true,
      }));
    },
    enabled: !!currentProject?.id && shouldFetchLive,
  });
  
  // Combined result
  const result: TimeAwareResult = useMemo(() => {
    const core = coreData || [];
    const live = liveData || [];
    
    // Combined data for display (NOT for AI)
    const combined = [...core, ...live];
    
    return {
      coreData: core,
      liveData: live,
      combinedData: combined,
      context,
      mode: context.mode,
      trustLevel: context.trustLevel,
      isLoading: isCoreLoading || isLiveLoading,
      isCoreLoading,
      isLiveLoading,
    };
  }, [coreData, liveData, context, isCoreLoading, isLiveLoading]);
  
  return result;
}

/**
 * Get summarized time-aware metrics
 */
export function useTimeAwareSummary(options: {
  startDate: string;
  endDate: string;
  funnelId?: string;
}) {
  const { coreData, liveData, context, isLoading } = useTimeAwareFinancials(options);
  
  const summary: TimeAwareSummary = useMemo(() => {
    // Calculate Core metrics
    const coreRevenue = coreData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const coreSpend = coreData.reduce((sum, d) => sum + (d.spend || 0), 0);
    const coreSales = coreData.reduce((sum, d) => sum + (d.sales_count || 0), 0);
    
    // Calculate Live metrics
    const liveRevenue = liveData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const liveSpend = liveData.reduce((sum, d) => sum + (d.spend || 0), 0);
    const liveSales = liveData.reduce((sum, d) => sum + (d.sales_count || 0), 0);
    
    // Totals (for display only, not for AI)
    const totalRevenue = coreRevenue + liveRevenue;
    const totalSpend = coreSpend + liveSpend;
    const totalSales = coreSales + liveSales;
    const totalProfit = totalRevenue - totalSpend;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : null;
    const cpa = totalSales > 0 ? totalSpend / totalSales : null;
    
    return {
      totalRevenue,
      totalSpend,
      totalSales,
      totalProfit,
      roas,
      cpa,
      mode: context.mode,
      trustLevel: context.trustLevel,
      liveRevenue,
      liveSpend,
      liveSales,
      coreRevenue,
      coreSpend,
      coreSales,
    };
  }, [coreData, liveData, context]);
  
  return { summary, isLoading, context };
}

/**
 * Get Core-only data for AI consumption
 * This hook NEVER returns live data
 */
export function useCoreOnlyFinancials(options: {
  startDate: string;
  endDate: string;
  funnelId?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();
  
  const today = getTodayString();
  const coreStartDate = settings?.financial_core_start_date || today;
  
  // For AI, end date is always yesterday at most
  const safeEndDate = options.endDate >= today
    ? new Date(new Date(today).setDate(new Date(today).getDate() - 1)).toISOString().split('T')[0]
    : options.endDate;
  
  const safeStartDate = options.startDate < coreStartDate ? coreStartDate : options.startDate;
  
  const { data, isLoading } = useQuery({
    queryKey: ['core-only-financials', currentProject?.id, options.funnelId, safeStartDate, safeEndDate],
    queryFn: async () => {
      if (safeEndDate < safeStartDate) {
        return [];
      }
      
      let query = supabase
        .from('funnel_financials')
        .select('*')
        .eq('project_id', currentProject!.id)
        .gte('economic_day', safeStartDate)
        .lte('economic_day', safeEndDate);
      
      if (options.funnelId) {
        query = query.eq('funnel_id', options.funnelId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Log this query for auditing
      if (currentProject) {
        logFinancialQuery(
          currentProject.id,
          'core_only_financials',
          { start: safeStartDate, end: safeEndDate },
          'core',
          ['funnel_financials'],
          true
        );
      }
      
      return data || [];
    },
    enabled: !!currentProject?.id && safeEndDate >= safeStartDate,
  });
  
  return {
    data: data || [],
    isLoading,
    trustLevel: 'core' as TrustLevel,
    isAISafe: true,
    dateRange: { start: safeStartDate, end: safeEndDate },
  };
}
