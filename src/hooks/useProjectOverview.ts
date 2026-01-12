/**
 * useProjectOverview
 * 
 * Project overview hook that uses profit_daily view for accurate metrics.
 * IMPORTANT: Uses net_revenue (not gross) for all ROAS and profit calculations.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";

interface UseProjectOverviewProps {
  projectId: string | undefined;
  startDate: string;
  endDate: string;
}

export interface CategoryMetrics {
  category: string;
  label: string;
  revenue: number; // This is NET revenue
  count: number;
  percentage: number;
}

export interface FunnelROAS {
  funnelId: string;
  funnelName: string;
  revenue: number; // NET revenue
  spend: number;
  roas: number; // Based on NET revenue
}

export interface MonthlyBalance {
  month: string;
  grossRevenue: number;
  platformFees: number;
  revenue: number; // NET revenue
  spend: number;
  profit: number;
  accumulatedProfit: number;
  roas: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'funnel_ads': 'Funil + Ads',
  'funnel_no_ads': 'Funil sem Ads',
  'unidentified_origin': 'Origem Não Identificada',
  'other_origin': 'Outras Origens',
};

export const useProjectOverview = ({ projectId, startDate, endDate }: UseProjectOverviewProps) => {
  // Fetch profit data from profit_daily view (canonical source for net revenue and profit)
  const { data: profitDaily, isLoading: profitLoading } = useQuery({
    queryKey: ['project-overview-profit', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('profit_daily')
        .select('*')
        .eq('project_id', projectId)
        .gte('economic_day', startDate)
        .lte('economic_day', endDate)
        .order('economic_day', { ascending: true });

      if (error) {
        console.error('[ProjectOverview] Error fetching profit_daily:', error);
        throw error;
      }

      console.log(`[ProjectOverview] Profit daily loaded: ${data?.length || 0} records`);
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch sales_core_events for category analysis (legacy sales still needed for category)
  const { data: salesEvents, isLoading: salesLoading } = useQuery({
    queryKey: ['project-overview-sales-events', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];

      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('sales_core_events')
          .select('id, economic_day, net_amount, gross_amount, event_type, attribution, funnel_id')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .in('event_type', ['purchase', 'subscription', 'upgrade'])
          .gte('economic_day', startDate)
          .lte('economic_day', endDate)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`[ProjectOverview] Sales events loaded: ${allData.length}`);
      return allData;
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch funnels
  const { data: funnels, isLoading: funnelsLoading } = useQuery({
    queryKey: ['project-overview-funnels', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch spend from spend_daily view
  const { data: spendData, isLoading: spendLoading } = useQuery({
    queryKey: ['project-overview-spend', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('spend_daily')
        .select('economic_day, ad_spend')
        .eq('project_id', projectId)
        .gte('economic_day', startDate)
        .lte('economic_day', endDate);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Calculate category metrics from sales events
  const categoryMetrics = useMemo((): CategoryMetrics[] => {
    if (!salesEvents || salesEvents.length === 0) return [];

    const categoryTotals: Record<string, { revenue: number; count: number }> = {};
    let totalRevenue = 0;

    salesEvents.forEach(sale => {
      // Determine category from attribution
      const attribution = sale.attribution as any;
      let category = 'unidentified_origin';
      
      if (sale.funnel_id && (attribution?.utm_source || attribution?.hotmart_checkout_source)) {
        category = 'funnel_ads';
      } else if (sale.funnel_id) {
        category = 'funnel_no_ads';
      } else if (attribution?.utm_source) {
        category = 'other_origin';
      }
      
      const revenue = sale.net_amount || 0;
      
      if (!categoryTotals[category]) {
        categoryTotals[category] = { revenue: 0, count: 0 };
      }
      categoryTotals[category].revenue += revenue;
      categoryTotals[category].count += 1;
      totalRevenue += revenue;
    });

    return Object.entries(categoryTotals).map(([category, data]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      revenue: data.revenue,
      count: data.count,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [salesEvents]);

  // Calculate funnel ROAS from sales_core_events (grouped by funnel_id)
  const funnelROAS = useMemo((): FunnelROAS[] => {
    if (!funnels || !salesEvents) return [];

    // Total spend for general distribution (funnel-level spend tracking can be added later)
    const totalSpend = spendData?.reduce((sum, s) => sum + (s.ad_spend || 0), 0) || 0;

    return funnels.map(funnel => {
      // Revenue from sales_core_events for this funnel
      const funnelRevenue = salesEvents
        .filter(sale => sale.funnel_id === funnel.id)
        .reduce((sum, sale) => sum + (sale.net_amount || 0), 0);

      // For now, we can't attribute spend per funnel without campaign mapping in spend_core_events
      // This will be enhanced when we add funnel_id to spend_core_events
      const funnelSpend = 0; // Placeholder - will be implemented with campaign pattern matching

      return {
        funnelId: funnel.id,
        funnelName: funnel.name,
        revenue: funnelRevenue,
        spend: funnelSpend,
        roas: funnelSpend > 0 ? funnelRevenue / funnelSpend : 0,
      };
    }).filter(f => f.revenue > 0 || f.spend > 0);
  }, [funnels, salesEvents, spendData]);

  // Calculate general ROAS from profit_daily (uses NET revenue)
  const generalROAS = useMemo(() => {
    const totalNetRevenue = profitDaily?.reduce((sum, f) => sum + (f.net_revenue || 0), 0) || 0;
    const totalSpend = profitDaily?.reduce((sum, f) => sum + (f.ad_spend || 0), 0) || 0;
    
    return {
      revenue: totalNetRevenue, // This is NET revenue
      spend: totalSpend,
      roas: totalSpend > 0 ? totalNetRevenue / totalSpend : 0,
    };
  }, [profitDaily]);

  // Calculate monthly balance from profit_daily
  const monthlyBalance = useMemo((): MonthlyBalance[] => {
    if (!profitDaily) return [];

    const monthlyData: Record<string, { 
      grossRevenue: number; 
      platformFees: number;
      netRevenue: number; 
      spend: number;
    }> = {};

    profitDaily.forEach(day => {
      if (!day.economic_day) return;
      const month = format(parseISO(day.economic_day), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { grossRevenue: 0, platformFees: 0, netRevenue: 0, spend: 0 };
      }
      monthlyData[month].grossRevenue += day.gross_revenue || 0;
      monthlyData[month].platformFees += day.platform_fees || 0;
      monthlyData[month].netRevenue += day.net_revenue || 0;
      monthlyData[month].spend += day.ad_spend || 0;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    let accumulatedProfit = 0;

    return sortedMonths.map(month => {
      const data = monthlyData[month];
      const profit = data.netRevenue - data.spend;
      accumulatedProfit += profit;

      return {
        month,
        grossRevenue: data.grossRevenue,
        platformFees: data.platformFees,
        revenue: data.netRevenue, // NET revenue for display
        spend: data.spend,
        profit,
        accumulatedProfit,
        roas: data.spend > 0 ? data.netRevenue / data.spend : null,
      };
    });
  }, [profitDaily]);

  // Summary metrics from profit_daily (uses NET revenue)
  const summaryMetrics = useMemo(() => {
    const totalGrossRevenue = profitDaily?.reduce((sum, f) => sum + (f.gross_revenue || 0), 0) || 0;
    const totalPlatformFees = profitDaily?.reduce((sum, f) => sum + (f.platform_fees || 0), 0) || 0;
    const totalNetRevenue = profitDaily?.reduce((sum, f) => sum + (f.net_revenue || 0), 0) || 0;
    const totalSpend = profitDaily?.reduce((sum, f) => sum + (f.ad_spend || 0), 0) || 0;
    const totalSales = profitDaily?.reduce((sum, f) => sum + (f.transaction_count || 0), 0) || 0;
    const profit = totalNetRevenue - totalSpend;

    return {
      grossRevenue: totalGrossRevenue,
      platformFees: totalPlatformFees,
      totalRevenue: totalNetRevenue, // This is NET revenue
      totalSpend,
      totalSales,
      profit,
      roas: totalSpend > 0 ? totalNetRevenue / totalSpend : 0,
    };
  }, [profitDaily]);

  const isLoading = profitLoading || salesLoading || funnelsLoading || spendLoading;

  return {
    categoryMetrics,
    funnelROAS,
    generalROAS,
    monthlyBalance,
    summaryMetrics,
    isLoading,
    sales: salesEvents,
    funnels,
    // Expose profit data for advanced use cases
    profitDaily,
  };
};
