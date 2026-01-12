import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";

interface UseFinancialCoreProps {
  projectId: string | undefined;
  startDate: string;
  endDate: string;
  financialCoreStartDate?: string | null; // The epoch date - data before this is considered legacy
}

export interface DailyFinancialData {
  economic_day: string;
  revenue: number;
  gross_revenue: number;
  transactions: number;
  unique_buyers: number;
  refunds: number;
  chargebacks: number;
  ad_spend: number;
  net_revenue: number;
  profit: number;
  roas: number;
  cpa: number;
}

export interface MonthlyFinancialData {
  month: string;
  monthLabel: string;
  revenue: number;
  gross_revenue: number;
  transactions: number;
  ad_spend: number;
  profit: number;
  roas: number;
  cpa: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  grossRevenue: number;
  totalRefunds: number;
  totalChargebacks: number;
  netRevenue: number;
  totalSpend: number;
  totalProfit: number;
  totalTransactions: number;
  uniqueBuyers: number;
  roas: number;
  cpa: number;
}

/**
 * Hook to fetch financial data from the Cubo Core (sales_core_events + spend_core_events)
 * via the canonical views: financial_daily, sales_daily, refunds_daily, spend_daily
 * 
 * When financialCoreStartDate is provided, only data >= that date is considered valid Core data.
 * Data before that date is Legacy and should be marked accordingly.
 */
export const useFinancialCore = ({ projectId, startDate, endDate, financialCoreStartDate }: UseFinancialCoreProps) => {
  // Calculate effective date range - only fetch Core data if epoch is set
  const effectiveStartDate = financialCoreStartDate && startDate < financialCoreStartDate 
    ? financialCoreStartDate 
    : startDate;
  
  const hasLegacyData = financialCoreStartDate ? startDate < financialCoreStartDate : false;
  const hasOnlyCoreData = financialCoreStartDate ? startDate >= financialCoreStartDate : true;

  // Fetch daily financial data from the canonical view (only Core era data)
  const { data: dailyData, isLoading: loadingDaily, refetch: refetchDaily } = useQuery({
    queryKey: ['financial-daily', projectId, effectiveStartDate, endDate, financialCoreStartDate],
    queryFn: async () => {
      if (!projectId) return [];

      // If entire range is before epoch, return empty (no Core data)
      if (financialCoreStartDate && endDate < financialCoreStartDate) {
        console.log(`[useFinancialCore] Entire range ${startDate} to ${endDate} is before epoch ${financialCoreStartDate}, returning empty`);
        return [];
      }

      const { data, error } = await supabase
        .from('financial_daily')
        .select('*')
        .eq('project_id', projectId)
        .gte('economic_day', effectiveStartDate)
        .lte('economic_day', endDate)
        .order('economic_day', { ascending: true });

      if (error) {
        console.error('[useFinancialCore] Error fetching financial_daily:', error);
        throw error;
      }

      console.log(`[useFinancialCore] Loaded ${data?.length || 0} Core daily records for ${effectiveStartDate} to ${endDate}`);
      return (data || []) as DailyFinancialData[];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch monthly financial data
  const { data: monthlyData, isLoading: loadingMonthly, refetch: refetchMonthly } = useQuery({
    queryKey: ['financial-monthly', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];

      // Extract year range from dates
      const startYear = startDate.substring(0, 4);
      const endYear = endDate.substring(0, 4);
      const startMonth = `${startYear}-01-01`;
      const endMonth = `${endYear}-12-31`;

      const { data, error } = await supabase
        .from('financial_monthly')
        .select('*')
        .eq('project_id', projectId)
        .gte('month', startMonth)
        .lte('month', endMonth)
        .order('month', { ascending: true });

      if (error) {
        console.error('[useFinancialCore] Error fetching financial_monthly:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        month: row.month,
        monthLabel: format(parseISO(row.month), 'MMM yyyy'),
        revenue: row.revenue || 0,
        gross_revenue: row.gross_revenue || 0,
        transactions: row.transactions || 0,
        ad_spend: row.ad_spend || 0,
        profit: row.profit || 0,
        roas: row.roas || 0,
        cpa: row.cpa || 0,
      })) as MonthlyFinancialData[];
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // Calculate summary from daily data
  const summary = useMemo((): FinancialSummary => {
    if (!dailyData || dailyData.length === 0) {
      return {
        totalRevenue: 0,
        grossRevenue: 0,
        totalRefunds: 0,
        totalChargebacks: 0,
        netRevenue: 0,
        totalSpend: 0,
        totalProfit: 0,
        totalTransactions: 0,
        uniqueBuyers: 0,
        roas: 0,
        cpa: 0,
      };
    }

    const totalRevenue = dailyData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const grossRevenue = dailyData.reduce((sum, d) => sum + (d.gross_revenue || 0), 0);
    const totalRefunds = dailyData.reduce((sum, d) => sum + (d.refunds || 0), 0);
    const totalChargebacks = dailyData.reduce((sum, d) => sum + (d.chargebacks || 0), 0);
    const netRevenue = totalRevenue - totalRefunds;
    const totalSpend = dailyData.reduce((sum, d) => sum + (d.ad_spend || 0), 0);
    const totalProfit = netRevenue - totalSpend;
    const totalTransactions = dailyData.reduce((sum, d) => sum + (d.transactions || 0), 0);
    // unique_buyers needs special handling - we can't just sum across days
    const uniqueBuyers = dailyData.reduce((sum, d) => sum + (d.unique_buyers || 0), 0);

    return {
      totalRevenue,
      grossRevenue,
      totalRefunds,
      totalChargebacks,
      netRevenue,
      totalSpend,
      totalProfit,
      totalTransactions,
      uniqueBuyers,
      roas: totalSpend > 0 ? netRevenue / totalSpend : 0,
      cpa: totalTransactions > 0 ? totalSpend / totalTransactions : 0,
    };
  }, [dailyData]);

  const refetchAll = async () => {
    await Promise.all([refetchDaily(), refetchMonthly()]);
  };

  const isLoading = loadingDaily || loadingMonthly;

  return {
    dailyData: dailyData || [],
    monthlyData: monthlyData || [],
    summary,
    isLoading,
    loadingDaily,
    loadingMonthly,
    refetchAll,
    // Era information
    hasLegacyData,
    hasOnlyCoreData,
    effectiveStartDate,
    financialCoreStartDate,
  };
};

/**
 * Hook to fetch raw sales core events for detailed analysis
 */
export const useSalesCoreEvents = ({ 
  projectId, 
  startDate, 
  endDate,
  eventTypes = ['purchase', 'subscription', 'upgrade']
}: UseFinancialCoreProps & { eventTypes?: string[] }) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales-core-events', projectId, startDate, endDate, eventTypes],
    queryFn: async () => {
      if (!projectId) return [];

      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('sales_core_events')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .in('event_type', eventTypes)
          .gte('economic_day', startDate)
          .lte('economic_day', endDate)
          .order('occurred_at', { ascending: false })
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

      return allData;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    salesEvents: data || [],
    isLoading,
    refetch,
  };
};

/**
 * Hook to fetch raw spend core events for detailed analysis
 */
export const useSpendCoreEvents = ({ projectId, startDate, endDate }: UseFinancialCoreProps) => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['spend-core-events', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];

      let allData: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('spend_core_events')
          .select('*')
          .eq('project_id', projectId)
          .eq('is_active', true)
          .gte('economic_day', startDate)
          .lte('economic_day', endDate)
          .order('occurred_at', { ascending: false })
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

      return allData;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  return {
    spendEvents: data || [],
    isLoading,
    refetch,
  };
};

/**
 * Hook for validation - compares legacy Hotmart/Meta data with Core data
 */
export const useFinancialCoreValidation = ({ projectId, startDate, endDate }: UseFinancialCoreProps) => {
  // Fetch from sales_core_events
  const { data: coreRevenue } = useQuery({
    queryKey: ['validation-core-revenue', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return { revenue: 0, count: 0 };

      const { data, error } = await supabase
        .from('sales_daily')
        .select('revenue, transactions')
        .eq('project_id', projectId)
        .gte('economic_day', startDate)
        .lte('economic_day', endDate);

      if (error) throw error;

      const revenue = (data || []).reduce((sum, d) => sum + (d.revenue || 0), 0);
      const count = (data || []).reduce((sum, d) => sum + (d.transactions || 0), 0);
      return { revenue, count };
    },
    enabled: !!projectId,
  });

  // Fetch from hotmart_sales (legacy)
  const { data: legacyRevenue } = useQuery({
    queryKey: ['validation-legacy-revenue', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return { revenue: 0, count: 0 };

      const startTimestamp = `${startDate}T03:00:00.000Z`;
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndTimestamp = `${endDateObj.toISOString().split('T')[0]}T02:59:59.999Z`;

      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('total_price_brl')
        .eq('project_id', projectId)
        .in('status', ['APPROVED', 'COMPLETE', 'approved', 'complete'])
        .gte('sale_date', startTimestamp)
        .lte('sale_date', adjustedEndTimestamp);

      if (error) throw error;

      const revenue = (data || []).reduce((sum, d) => sum + (d.total_price_brl || 0), 0);
      return { revenue, count: data?.length || 0 };
    },
    enabled: !!projectId,
  });

  // Fetch from spend_core_events
  const { data: coreSpend } = useQuery({
    queryKey: ['validation-core-spend', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return { spend: 0 };

      const { data, error } = await supabase
        .from('spend_daily')
        .select('ad_spend')
        .eq('project_id', projectId)
        .gte('economic_day', startDate)
        .lte('economic_day', endDate);

      if (error) throw error;

      const spend = (data || []).reduce((sum, d) => sum + (d.ad_spend || 0), 0);
      return { spend };
    },
    enabled: !!projectId,
  });

  // Fetch from meta_insights (legacy)
  const { data: legacySpend } = useQuery({
    queryKey: ['validation-legacy-spend', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return { spend: 0 };

      // Get active accounts first
      const { data: accounts } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (!accounts || accounts.length === 0) return { spend: 0 };

      const accountIds = accounts.map(a => a.account_id);

      const { data, error } = await supabase
        .from('meta_insights')
        .select('spend, ad_id, date_start')
        .eq('project_id', projectId)
        .in('ad_account_id', accountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', startDate)
        .lte('date_start', endDate);

      if (error) throw error;

      // Deduplicate by ad_id + date
      const uniqueSpend = new Map<string, number>();
      (data || []).forEach(insight => {
        if (insight.spend && insight.ad_id) {
          const key = `${insight.ad_id}_${insight.date_start}`;
          if (!uniqueSpend.has(key)) {
            uniqueSpend.set(key, insight.spend);
          }
        }
      });

      const spend = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
      return { spend };
    },
    enabled: !!projectId,
  });

  return {
    coreRevenue: coreRevenue || { revenue: 0, count: 0 },
    legacyRevenue: legacyRevenue || { revenue: 0, count: 0 },
    coreSpend: coreSpend || { spend: 0 },
    legacySpend: legacySpend || { spend: 0 },
    revenueDelta: (coreRevenue?.revenue || 0) - (legacyRevenue?.revenue || 0),
    spendDelta: (coreSpend?.spend || 0) - (legacySpend?.spend || 0),
  };
};
