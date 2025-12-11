import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format, startOfYear, endOfYear, parseISO, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UseMonthlyAnalysisProps {
  projectId: string | undefined;
  year: number;
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

export const useMonthlyAnalysis = ({ projectId, year }: UseMonthlyAnalysisProps) => {
  const startDate = startOfYear(new Date(year, 0, 1));
  const endDate = endOfYear(new Date(year, 0, 1));

  // Fetch sales data
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['monthly-sales', projectId, year],
    queryFn: async () => {
      if (!projectId) return [];
      
      let allSales: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('*')
          .eq('project_id', projectId)
          .gte('sale_date', startDate.toISOString())
          .lte('sale_date', endDate.toISOString())
          .in('status', ['APPROVED', 'COMPLETE'])
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        allSales = [...allSales, ...(data || [])];
        hasMore = data?.length === pageSize;
        page++;
      }

      return allSales;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch meta insights
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
          .select('*')
          .eq('project_id', projectId)
          .in('ad_account_id', accountIds)
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
      monthLabel: format(date, 'MMMM', { locale: ptBR }),
    }));
  }, [year]);

  // Calculate general monthly data (all funnels combined)
  const generalMonthlyData = useMemo(() => {
    if (!salesData || !metaInsights) return [];

    return monthsOfYear.map(({ month, monthLabel }) => {
      // Filter sales for this month
      const monthSales = salesData.filter(sale => {
        if (!sale.sale_date) return false;
        return format(parseISO(sale.sale_date), 'yyyy-MM') === month;
      });

      // Filter insights for this month
      const monthInsights = metaInsights.filter(insight => {
        return format(parseISO(insight.date_start), 'yyyy-MM') === month;
      });

      const revenue = monthSales.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0);
      const investment = monthInsights.reduce((sum, insight) => sum + (insight.spend || 0), 0);
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
  }, [salesData, metaInsights, monthsOfYear]);

  // Calculate per-funnel monthly data
  const funnelMonthlyData = useMemo((): FunnelMonthlyData[] => {
    if (!salesData || !metaInsights || !funnels || !mappings || !campaigns) return [];

    return funnels.map(funnel => {
      // Get offer codes for this funnel
      const funnelMappings = mappings.filter(m => m.funnel_id === funnel.id || m.id_funil === funnel.id);
      const offerCodes = funnelMappings.map(m => m.codigo_oferta).filter(Boolean);

      // Get campaign IDs matching this funnel's pattern
      const pattern = funnel.campaign_name_pattern;
      const matchingCampaignIds = pattern
        ? campaigns.filter(c => c.campaign_name?.toLowerCase().includes(pattern.toLowerCase())).map(c => c.campaign_id)
        : [];

      const months = monthsOfYear.map(({ month, monthLabel }) => {
        // Filter sales for this funnel and month
        const monthSales = salesData.filter(sale => {
          if (!sale.sale_date) return false;
          const saleMonth = format(parseISO(sale.sale_date), 'yyyy-MM');
          return saleMonth === month && offerCodes.includes(sale.offer_code);
        });

        // Filter insights for this funnel and month
        const monthInsights = metaInsights.filter(insight => {
          const insightMonth = format(parseISO(insight.date_start), 'yyyy-MM');
          return insightMonth === month && matchingCampaignIds.includes(insight.campaign_id);
        });

        const revenue = monthSales.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0);
        const investment = monthInsights.reduce((sum, insight) => sum + (insight.spend || 0), 0);
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

  // Calculate general totals
  const generalTotals = useMemo(() => {
    const totals = generalMonthlyData.reduce(
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
  }, [generalMonthlyData]);

  return {
    generalMonthlyData,
    funnelMonthlyData,
    generalTotals,
    isLoading: loadingSales || loadingInsights,
    funnels,
  };
};
