import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, startOfYear, endOfYear, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL MONTHLY ANALYSIS HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Uses EXCLUSIVELY finance_tracking_view for all financial data.
 * Validated 100% against Hotmart API.
 * 
 * FILTER RULES:
 * - Date: economic_day (DATE type, São Paulo timezone)
 * - Status: hotmart_status IN ('APPROVED', 'COMPLETE')
 * - Revenue: gross_amount (from finance_tracking_view)
 * 
 * FORBIDDEN:
 * ❌ hotmart_sales direct queries
 * ❌ sales_core_events
 * ❌ total_price_brl
 * ❌ event_type
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface UseMonthlyAnalysisProps {
  projectId: string | undefined;
  year: number;
  comparisonYear?: number | null;
  selectedMonth?: number | null; // 1-12 for month, null for full year
}

export interface MonthlyData {
  month: string;
  monthLabel: string;
  investment: number;
  revenue: number;
  grossProfit: number;
  roas: number;
  sales: number;
}

export interface DailyData {
  day: string;
  dayLabel: string;
  dayNumber: number;
  investment: number;
  revenue: number;
  grossProfit: number;
  roas: number;
  sales: number;
}

export interface FunnelMonthlyData {
  funnelId: string;
  funnelName: string;
  funnelType: string;
  months: MonthlyData[];
  totals: {
    investment: number;
    revenue: number;
    grossProfit: number;
    roas: number;
    sales: number;
  };
}

// Type for sales from finance_tracking_view
interface FinanceTrackingSale {
  transaction_id: string;
  gross_amount: number | null;
  net_amount: number | null;
  economic_day: string | null;
  purchase_date: string | null;
  offer_code: string | null;
  funnel_id: string | null;
  hotmart_status: string | null;
}

export const useMonthlyAnalysis = ({ projectId, year, comparisonYear, selectedMonth }: UseMonthlyAnalysisProps) => {
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 0, 1));
  
  const compStartDate = comparisonYear ? startOfYear(new Date(comparisonYear, 0, 1)) : null;
  const compEndDate = comparisonYear ? endOfYear(new Date(comparisonYear, 0, 1)) : null;

  // Calculate month date range when a specific month is selected
  const monthStartDate = selectedMonth ? startOfMonth(new Date(year, selectedMonth - 1, 1)) : null;
  const monthEndDate = selectedMonth ? endOfMonth(new Date(year, selectedMonth - 1, 1)) : null;

  // CANONICAL: Fetch sales data from finance_tracking_view for primary year
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['monthly-sales-canonical', projectId, year],
    queryFn: async () => {
      if (!projectId) return [];
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      let allSales: FinanceTrackingSale[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('finance_tracking_view')
          .select('transaction_id, gross_amount, net_amount, economic_day, purchase_date, offer_code, funnel_id, hotmart_status')
          .eq('project_id', projectId)
          .gte('economic_day', startDateStr)
          .lte('economic_day', endDateStr)
          .in('hotmart_status', ['APPROVED', 'COMPLETE'])
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allSales = [...allSales, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      console.log(`[useMonthlyAnalysis] Loaded ${allSales.length} sales from finance_tracking_view for year ${year}`);
      return allSales;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // CANONICAL: Fetch sales data from finance_tracking_view for comparison year
  const { data: comparisonSalesData, isLoading: loadingCompSales } = useQuery({
    queryKey: ['monthly-sales-canonical', projectId, comparisonYear],
    queryFn: async () => {
      if (!projectId || !compStartDate || !compEndDate) return [];
      
      const startDateStr = format(compStartDate, 'yyyy-MM-dd');
      const endDateStr = format(compEndDate, 'yyyy-MM-dd');
      
      let allSales: FinanceTrackingSale[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('finance_tracking_view')
          .select('transaction_id, gross_amount, net_amount, economic_day, purchase_date, offer_code, funnel_id, hotmart_status')
          .eq('project_id', projectId)
          .gte('economic_day', startDateStr)
          .lte('economic_day', endDateStr)
          .in('hotmart_status', ['APPROVED', 'COMPLETE'])
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allSales = [...allSales, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      console.log(`[useMonthlyAnalysis] Loaded ${allSales.length} sales from finance_tracking_view for comparison year ${comparisonYear}`);
      return allSales;
    },
    enabled: !!projectId && !!comparisonYear,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch meta insights for primary year (for investment data)
  const { data: metaInsights, isLoading: loadingInsights } = useQuery({
    queryKey: ['monthly-insights', projectId, year],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data: activeAccounts } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (!activeAccounts?.length) return [];

      const accountIds = activeAccounts.map(a => a.account_id);
      
      let allInsights: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('spend, date_start, campaign_id, ad_id')
          .eq('project_id', projectId)
          .in('ad_account_id', accountIds)
          .not('ad_id', 'is', null)
          .gte('date_start', format(startDate, 'yyyy-MM-dd'))
          .lte('date_stop', format(endDate, 'yyyy-MM-dd'))
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allInsights = [...allInsights, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      return allInsights;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch meta insights for comparison year
  const { data: comparisonMetaInsights, isLoading: loadingCompInsights } = useQuery({
    queryKey: ['monthly-insights', projectId, comparisonYear],
    queryFn: async () => {
      if (!projectId || !compStartDate || !compEndDate) return [];
      
      const { data: activeAccounts } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (!activeAccounts?.length) return [];

      const accountIds = activeAccounts.map(a => a.account_id);
      
      let allInsights: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('spend, date_start, campaign_id, ad_id')
          .eq('project_id', projectId)
          .in('ad_account_id', accountIds)
          .not('ad_id', 'is', null)
          .gte('date_start', format(compStartDate, 'yyyy-MM-dd'))
          .lte('date_stop', format(compEndDate, 'yyyy-MM-dd'))
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allInsights = [...allInsights, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      return allInsights;
    },
    enabled: !!projectId && !!comparisonYear,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch funnels and mappings
  const { data: funnels } = useQuery({
    queryKey: ['monthly-funnels', projectId],
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
  });

  const { data: mappings } = useQuery({
    queryKey: ['monthly-mappings', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const { data: campaigns } = useQuery({
    queryKey: ['monthly-campaigns', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Generate all months for the year
  const monthsOfYear = useMemo(() => {
    return eachMonthOfInterval({ start: startDate, end: endDate }).map(date => ({
      month: format(date, 'yyyy-MM'),
      monthIndex: date.getMonth(),
      monthLabel: format(date, 'MMMM', { locale: ptBR }),
    }));
  }, [year]);

  const comparisonMonthsOfYear = useMemo(() => {
    if (!compStartDate || !compEndDate) return [];
    return eachMonthOfInterval({ start: compStartDate, end: compEndDate }).map(date => ({
      month: format(date, 'yyyy-MM'),
      monthIndex: date.getMonth(),
      monthLabel: format(date, 'MMMM', { locale: ptBR }),
    }));
  }, [comparisonYear]);

  // Generate all days for the selected month
  const daysOfMonth = useMemo(() => {
    if (!monthStartDate || !monthEndDate) return [];
    return eachDayOfInterval({ start: monthStartDate, end: monthEndDate }).map(date => ({
      day: format(date, 'yyyy-MM-dd'),
      dayNumber: date.getDate(),
      dayLabel: format(date, 'dd/MM', { locale: ptBR }),
    }));
  }, [selectedMonth, year]);

  // Helper function to deduplicate insights by ad_id + date
  const deduplicateInsights = (insights: any[] | undefined) => {
    if (!insights) return new Map<string, number>();
    const spendMap = new Map<string, number>();
    insights.forEach(i => {
      if (i.spend && i.ad_id && i.date_start) {
        const key = `${i.ad_id}_${i.date_start}`;
        if (!spendMap.has(key)) {
          spendMap.set(key, i.spend);
        }
      }
    });
    return spendMap;
  };

  // Helper function to calculate monthly data from CANONICAL source
  const calculateMonthlyData = (
    sales: FinanceTrackingSale[] | undefined,
    insights: any[] | undefined,
    months: { month: string; monthIndex: number; monthLabel: string }[]
  ): MonthlyData[] => {
    if (!sales) return [];

    // Deduplicate insights
    const spendMap = deduplicateInsights(insights);
    
    // Group spend by month
    const monthlySpend = new Map<string, number>();
    spendMap.forEach((spend, key) => {
      const dateStr = key.split('_')[1]; // Extract date from key
      if (dateStr) {
        const month = dateStr.substring(0, 7); // yyyy-MM
        monthlySpend.set(month, (monthlySpend.get(month) || 0) + spend);
      }
    });

    return months.map(({ month, monthLabel }) => {
      // Use economic_day for month matching (CANONICAL)
      const monthSales = sales.filter(sale => {
        if (!sale.economic_day) return false;
        return sale.economic_day.startsWith(month);
      });

      // Use gross_amount from finance_tracking_view (CANONICAL)
      const revenue = monthSales.reduce((sum, sale) => sum + (sale.gross_amount || 0), 0);
      const investment = monthlySpend.get(month) || 0;
      const grossProfit = revenue - investment;
      const roas = investment > 0 ? revenue / investment : 0;

      return {
        month,
        monthLabel,
        investment,
        revenue,
        grossProfit,
        roas,
        sales: monthSales.length, // COUNT(transaction_id) - already deduplicated in view
      };
    });
  };

  // Helper function to calculate daily data from CANONICAL source
  const calculateDailyData = (
    sales: FinanceTrackingSale[] | undefined,
    insights: any[] | undefined,
    days: { day: string; dayNumber: number; dayLabel: string }[]
  ): DailyData[] => {
    if (!sales) return [];

    // Deduplicate insights
    const spendMap = deduplicateInsights(insights);
    
    // Group spend by day
    const dailySpend = new Map<string, number>();
    spendMap.forEach((spend, key) => {
      const dateStr = key.split('_')[1];
      if (dateStr) {
        dailySpend.set(dateStr, (dailySpend.get(dateStr) || 0) + spend);
      }
    });

    return days.map(({ day, dayNumber, dayLabel }) => {
      // Use economic_day for day matching (CANONICAL)
      const daySales = sales.filter(sale => sale.economic_day === day);

      // Use gross_amount from finance_tracking_view (CANONICAL)
      const revenue = daySales.reduce((sum, sale) => sum + (sale.gross_amount || 0), 0);
      const investment = dailySpend.get(day) || 0;
      const grossProfit = revenue - investment;
      const roas = investment > 0 ? revenue / investment : 0;

      return {
        day,
        dayLabel,
        dayNumber,
        investment,
        revenue,
        grossProfit,
        roas,
        sales: daySales.length,
      };
    });
  };

  // Calculate general monthly data (all funnels combined)
  const generalMonthlyData = useMemo(() => {
    return calculateMonthlyData(salesData, metaInsights, monthsOfYear);
  }, [salesData, metaInsights, monthsOfYear]);

  // Calculate comparison monthly data
  const comparisonMonthlyData = useMemo(() => {
    if (!comparisonYear) return [];
    return calculateMonthlyData(comparisonSalesData, comparisonMetaInsights, comparisonMonthsOfYear);
  }, [comparisonSalesData, comparisonMetaInsights, comparisonMonthsOfYear, comparisonYear]);

  // Calculate daily data for selected month
  const dailyData = useMemo((): DailyData[] => {
    if (!selectedMonth || !salesData || !metaInsights) return [];
    
    // Filter sales for the selected month using economic_day (CANONICAL)
    const monthStr = `${year}-${String(selectedMonth).padStart(2, '0')}`;
    const monthSales = salesData.filter(sale => 
      sale.economic_day?.startsWith(monthStr)
    );

    // Filter insights for the selected month
    const monthInsights = metaInsights.filter(insight => {
      if (!insight.date_start) return false;
      return insight.date_start.startsWith(monthStr);
    });

    return calculateDailyData(monthSales, monthInsights, daysOfMonth);
  }, [salesData, metaInsights, selectedMonth, year, daysOfMonth]);

  // Get selected month data
  const selectedMonthData = useMemo(() => {
    if (!selectedMonth) return null;
    return generalMonthlyData.find((_, index) => index === selectedMonth - 1) || null;
  }, [generalMonthlyData, selectedMonth]);

  // Calculate per-funnel monthly data
  const funnelMonthlyData = useMemo((): FunnelMonthlyData[] => {
    if (!salesData || !metaInsights || !funnels || !mappings || !campaigns) return [];

    // Deduplicate insights
    const spendMap = deduplicateInsights(metaInsights);
    
    // Group spend by campaign_id and month
    const campaignMonthlySpend = new Map<string, Map<string, number>>();
    metaInsights?.forEach(i => {
      if (i.spend && i.ad_id && i.date_start && i.campaign_id) {
        const key = `${i.ad_id}_${i.date_start}`;
        if (!spendMap.has(key)) return; // Skip if already processed (dedup)
        
        const month = i.date_start.substring(0, 7);
        const campaignId = String(i.campaign_id);
        
        if (!campaignMonthlySpend.has(campaignId)) {
          campaignMonthlySpend.set(campaignId, new Map());
        }
        const monthMap = campaignMonthlySpend.get(campaignId)!;
        monthMap.set(month, (monthMap.get(month) || 0) + i.spend);
      }
    });

    return funnels.map(funnel => {
      const funnelMappings = mappings.filter(m => m.funnel_id === funnel.id || m.id_funil === funnel.id);
      const offerCodes = new Set(funnelMappings.map(m => m.codigo_oferta).filter(Boolean));

      const pattern = funnel.campaign_name_pattern?.toLowerCase();
      const matchingCampaignIds = pattern
        ? campaigns.filter(c => c.campaign_name?.toLowerCase().includes(pattern)).map(c => String(c.campaign_id))
        : [];
      const matchingCampaignIdSet = new Set(matchingCampaignIds);

      const months = monthsOfYear.map(({ month, monthLabel }) => {
        // Filter sales by offer_code and month using economic_day (CANONICAL)
        const monthSales = salesData.filter(sale => {
          if (!sale.economic_day) return false;
          const saleMonth = sale.economic_day.substring(0, 7);
          return saleMonth === month && offerCodes.has(sale.offer_code || '');
        });

        // Sum investment from matching campaigns for this month
        let investment = 0;
        matchingCampaignIdSet.forEach(campaignId => {
          const monthSpend = campaignMonthlySpend.get(campaignId)?.get(month) || 0;
          investment += monthSpend;
        });

        // Use gross_amount from finance_tracking_view (CANONICAL)
        const revenue = monthSales.reduce((sum, sale) => sum + (sale.gross_amount || 0), 0);
        const grossProfit = revenue - investment;
        const roas = investment > 0 ? revenue / investment : 0;

        return {
          month,
          monthLabel,
          investment,
          revenue,
          grossProfit,
          roas,
          sales: monthSales.length,
        };
      });

      const totals = months.reduce(
        (acc, m) => ({
          investment: acc.investment + m.investment,
          revenue: acc.revenue + m.revenue,
          grossProfit: acc.grossProfit + m.grossProfit,
          roas: 0,
          sales: acc.sales + m.sales,
        }),
        { investment: 0, revenue: 0, grossProfit: 0, roas: 0, sales: 0 }
      );
      totals.roas = totals.investment > 0 ? totals.revenue / totals.investment : 0;

      return {
        funnelId: funnel.id,
        funnelName: funnel.name,
        funnelType: funnel.funnel_type,
        months,
        totals,
      };
    });
  }, [salesData, metaInsights, funnels, mappings, campaigns, monthsOfYear]);

  // Helper to calculate totals
  const calculateTotals = (data: MonthlyData[]) => {
    const totals = data.reduce(
      (acc, m) => ({
        investment: acc.investment + m.investment,
        revenue: acc.revenue + m.revenue,
        grossProfit: acc.grossProfit + m.grossProfit,
        sales: acc.sales + m.sales,
      }),
      { investment: 0, revenue: 0, grossProfit: 0, sales: 0 }
    );
    return {
      ...totals,
      roas: totals.investment > 0 ? totals.revenue / totals.investment : 0,
    };
  };

  // Helper to calculate daily totals
  const calculateDailyTotals = (data: DailyData[]) => {
    const totals = data.reduce(
      (acc, d) => ({
        investment: acc.investment + d.investment,
        revenue: acc.revenue + d.revenue,
        grossProfit: acc.grossProfit + d.grossProfit,
        sales: acc.sales + d.sales,
      }),
      { investment: 0, revenue: 0, grossProfit: 0, sales: 0 }
    );
    return {
      ...totals,
      roas: totals.investment > 0 ? totals.revenue / totals.investment : 0,
    };
  };

  const generalTotals = useMemo(() => calculateTotals(generalMonthlyData), [generalMonthlyData]);
  const comparisonTotals = useMemo(() => calculateTotals(comparisonMonthlyData), [comparisonMonthlyData]);
  const selectedMonthTotals = useMemo(() => {
    if (!selectedMonth || !dailyData.length) return null;
    return calculateDailyTotals(dailyData);
  }, [dailyData, selectedMonth]);

  return {
    generalMonthlyData,
    funnelMonthlyData,
    generalTotals,
    comparisonMonthlyData,
    comparisonTotals,
    dailyData,
    selectedMonthData,
    selectedMonthTotals,
    isLoading: loadingSales || loadingCompSales || loadingInsights || loadingCompInsights,
    year,
    comparisonYear,
    selectedMonth,
    funnels,
    mappings,
  };
};
