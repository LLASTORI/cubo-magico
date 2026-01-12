/**
 * useProfitDaily
 * 
 * Canonical hook for profit metrics from profit_daily view.
 * This is the SINGLE SOURCE OF TRUTH for:
 * - Net Revenue (after platform fees)
 * - Profit (net_revenue - ad_spend)
 * - ROAS (based on net_revenue, NOT gross)
 * 
 * NEVER use gross_revenue for optimization or AI analysis.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectSettings } from './useProjectSettings';
import { useMemo } from 'react';

// ============================================
// Types
// ============================================

export interface ProfitDailyRecord {
  project_id: string;
  economic_day: string;
  gross_revenue: number;
  platform_fees: number;
  net_revenue: number;
  ad_spend: number;
  profit: number;
  roas: number | null;
  transaction_count: number;
  data_source: string;
}

export interface ProfitMonthlyRecord {
  project_id: string;
  month: string;
  gross_revenue: number;
  platform_fees: number;
  net_revenue: number;
  ad_spend: number;
  profit: number;
  roas: number | null;
  transaction_count: number;
  data_source: string;
}

export interface OwnerProfitDailyRecord {
  project_id: string;
  economic_day: string;
  gross_revenue: number;
  platform_fees: number;
  net_revenue: number;
  owner_revenue: number;
  ad_spend: number;
  owner_profit: number;
  owner_roas: number | null;
  transaction_count: number;
  data_source: string;
}

export interface ProfitSummary {
  gross_revenue: number;
  platform_fees: number;
  net_revenue: number;
  ad_spend: number;
  profit: number;
  roas: number | null;
  transaction_count: number;
  days_count: number;
  avg_daily_profit: number;
  profit_margin: number | null;
}

// ============================================
// Hooks
// ============================================

/**
 * Fetch daily profit data from profit_daily view
 * Always uses net_revenue for calculations
 */
export function useProfitDaily(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();

  return useQuery({
    queryKey: ['profit-daily', currentProject?.id, options?.startDate, options?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('profit_daily')
        .select('*')
        .eq('project_id', currentProject!.id);

      // Always respect financial core start date
      const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
      query = query.gte('economic_day', coreStartDate);

      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }

      query = query.order('economic_day', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as ProfitDailyRecord[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Fetch monthly profit data
 */
export function useProfitMonthly(options?: {
  startMonth?: string;
  endMonth?: string;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['profit-monthly', currentProject?.id, options?.startMonth, options?.endMonth],
    queryFn: async () => {
      let query = supabase
        .from('profit_monthly')
        .select('*')
        .eq('project_id', currentProject!.id);

      if (options?.startMonth) {
        query = query.gte('month', options.startMonth);
      }
      if (options?.endMonth) {
        query = query.lte('month', options.endMonth);
      }

      query = query.order('month', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as ProfitMonthlyRecord[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Fetch owner-specific profit (after partner splits)
 */
export function useOwnerProfitDaily(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();

  return useQuery({
    queryKey: ['owner-profit-daily', currentProject?.id, options?.startDate, options?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('owner_profit_daily')
        .select('*')
        .eq('project_id', currentProject!.id);

      const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
      query = query.gte('economic_day', coreStartDate);

      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }

      query = query.order('economic_day', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as OwnerProfitDailyRecord[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Fetch daily revenue data from revenue_daily view
 */
export function useRevenueDaily(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { currentProject } = useProject();
  const { settings } = useProjectSettings();

  return useQuery({
    queryKey: ['revenue-daily', currentProject?.id, options?.startDate, options?.endDate],
    queryFn: async () => {
      let query = supabase
        .from('revenue_daily')
        .select('*')
        .eq('project_id', currentProject!.id);

      const coreStartDate = settings?.financial_core_start_date || '2026-01-12';
      query = query.gte('economic_day', coreStartDate);

      if (options?.startDate) {
        query = query.gte('economic_day', options.startDate);
      }
      if (options?.endDate) {
        query = query.lte('economic_day', options.endDate);
      }

      query = query.order('economic_day', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []) as {
        project_id: string;
        economic_day: string;
        gross_revenue: number;
        platform_fees: number;
        net_revenue: number;
        transaction_count: number;
        data_source: string;
      }[];
    },
    enabled: !!currentProject?.id,
  });
}

/**
 * Calculate profit summary from daily data
 */
export function useProfitSummary(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { data: dailyData, isLoading } = useProfitDaily(options);

  const summary = useMemo((): ProfitSummary | null => {
    if (!dailyData || dailyData.length === 0) return null;

    const grossRevenue = dailyData.reduce((sum, d) => sum + (d.gross_revenue || 0), 0);
    const platformFees = dailyData.reduce((sum, d) => sum + (d.platform_fees || 0), 0);
    const netRevenue = dailyData.reduce((sum, d) => sum + (d.net_revenue || 0), 0);
    const adSpend = dailyData.reduce((sum, d) => sum + (d.ad_spend || 0), 0);
    const profit = dailyData.reduce((sum, d) => sum + (d.profit || 0), 0);
    const transactionCount = dailyData.reduce((sum, d) => sum + (d.transaction_count || 0), 0);

    return {
      gross_revenue: grossRevenue,
      platform_fees: platformFees,
      net_revenue: netRevenue,
      ad_spend: adSpend,
      profit,
      roas: adSpend > 0 ? netRevenue / adSpend : null,
      transaction_count: transactionCount,
      days_count: dailyData.length,
      avg_daily_profit: dailyData.length > 0 ? profit / dailyData.length : 0,
      profit_margin: netRevenue > 0 ? (profit / netRevenue) * 100 : null,
    };
  }, [dailyData]);

  return { summary, dailyData, isLoading };
}

/**
 * Get AI-ready profit context
 * IMPORTANT: Only uses net_revenue for all calculations
 */
export function useProfitAIContext(options?: {
  startDate?: string;
  endDate?: string;
}) {
  const { summary, dailyData, isLoading } = useProfitSummary(options);

  const aiContext = useMemo(() => {
    if (!summary) return null;

    return {
      // AI-safe metrics - NEVER use gross_revenue for optimization
      net_revenue: summary.net_revenue,
      platform_fees: summary.platform_fees,
      ad_spend: summary.ad_spend,
      profit: summary.profit,
      roas: summary.roas,
      transaction_count: summary.transaction_count,
      profit_margin: summary.profit_margin,
      avg_daily_profit: summary.avg_daily_profit,
      days_analyzed: summary.days_count,
      
      // Data source metadata
      data_source: 'profit_daily',
      uses_net_revenue: true,
      ai_safe: true,
      
      // Warning for AI
      _ai_instruction: 'ALWAYS use net_revenue for ROAS and profit calculations. NEVER use gross_revenue for optimization.',
    };
  }, [summary]);

  return { aiContext, dailyData, isLoading };
}

/**
 * Validation query for comparing gross vs net
 * Use for debugging and auditing
 */
export function useRevenueValidation(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['revenue-validation', currentProject?.id, options],
    queryFn: async () => {
      const limit = options?.limit || 14;

      // Manual join for validation - mirrors the prompt's validation query
      const { data: profitData, error: profitError } = await supabase
        .from('profit_daily')
        .select('economic_day, gross_revenue, platform_fees, net_revenue, ad_spend, profit')
        .eq('project_id', currentProject!.id)
        .order('economic_day', { ascending: false })
        .limit(limit);

      if (profitError) throw profitError;
      return profitData;
    },
    enabled: !!currentProject?.id,
  });
}
