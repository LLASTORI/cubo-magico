import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

interface UseProjectOverviewProps {
  projectId: string | undefined;
  startDate: string;
  endDate: string;
}

export interface CategoryMetrics {
  category: string;
  label: string;
  revenue: number;
  count: number;
  percentage: number;
}

export interface FunnelROAS {
  funnelId: string;
  funnelName: string;
  revenue: number;
  spend: number;
  roas: number;
}

export interface MonthlyBalance {
  month: string;
  revenue: number;
  spend: number;
  profit: number;
  accumulatedProfit: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'funnel_ads': 'Funil + Ads',
  'funnel_no_ads': 'Funil sem Ads',
  'unidentified_origin': 'Origem Não Identificada',
  'other_origin': 'Outras Origens',
};

export const useProjectOverview = ({ projectId, startDate, endDate }: UseProjectOverviewProps) => {
  // Fetch sales data
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['project-overview-sales', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('*')
        .eq('project_id', projectId)
        .gte('sale_date', `${startDate}T00:00:00`)
        .lte('sale_date', `${endDate}T23:59:59`)
        .in('status', ['APPROVED', 'COMPLETE', 'approved', 'complete']);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
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
  });

  // Fetch offer mappings
  const { data: offerMappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ['project-overview-mappings', projectId],
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

  // Fetch meta insights with campaign info
  const { data: metaInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['project-overview-insights', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Fetch insights with pagination
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('*')
          .eq('project_id', projectId)
          .not('ad_id', 'is', null)
          .gte('date_start', startDate)
          .lte('date_start', endDate)
          .order('id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
    enabled: !!projectId,
  });

  // Fetch meta campaigns for name pattern matching
  const { data: metaCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['project-overview-campaigns', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Calculate category metrics
  const categoryMetrics = useMemo((): CategoryMetrics[] => {
    if (!sales || sales.length === 0) return [];

    const categoryTotals: Record<string, { revenue: number; count: number }> = {};
    let totalRevenue = 0;

    sales.forEach(sale => {
      const category = sale.sale_category || 'unidentified_origin';
      const revenue = sale.total_price_brl || sale.total_price || 0;
      
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
  }, [sales]);

  // Calculate funnel ROAS using campaign_name_pattern
  const funnelROAS = useMemo((): FunnelROAS[] => {
    if (!funnels || !sales || !metaInsights || !offerMappings || !metaCampaigns) {
      return [];
    }

    return funnels.map(funnel => {
      // Get offer codes for this funnel
      const funnelOfferCodes = offerMappings
        .filter(m => m.funnel_id === funnel.id)
        .map(m => m.codigo_oferta)
        .filter(Boolean);

      // Calculate revenue from sales with these offer codes
      const funnelRevenue = sales
        .filter(sale => sale.offer_code && funnelOfferCodes.includes(sale.offer_code))
        .reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0);

      // Find campaigns that match the funnel's campaign_name_pattern
      let funnelSpend = 0;
      if (funnel.campaign_name_pattern) {
        const pattern = funnel.campaign_name_pattern.toLowerCase();
        const matchingCampaignIds = metaCampaigns
          .filter(c => c.campaign_name?.toLowerCase().includes(pattern))
          .map(c => c.campaign_id);

        // Calculate spend from insights for these campaigns
        funnelSpend = metaInsights
          .filter(insight => insight.campaign_id && matchingCampaignIds.includes(insight.campaign_id))
          .reduce((sum, insight) => sum + (insight.spend || 0), 0);
      }

      return {
        funnelId: funnel.id,
        funnelName: funnel.name,
        revenue: funnelRevenue,
        spend: funnelSpend,
        roas: funnelSpend > 0 ? funnelRevenue / funnelSpend : 0,
      };
    }).filter(f => f.revenue > 0 || f.spend > 0);
  }, [funnels, sales, metaInsights, offerMappings, metaCampaigns]);

  // Calculate general ROAS (all sales vs all spend)
  const generalROAS = useMemo(() => {
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0) || 0;
    const totalSpend = metaInsights?.reduce((sum, insight) => sum + (insight.spend || 0), 0) || 0;
    
    return {
      revenue: totalRevenue,
      spend: totalSpend,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    };
  }, [sales, metaInsights]);

  // Calculate monthly balance
  const monthlyBalance = useMemo((): MonthlyBalance[] => {
    if (!sales || !metaInsights) return [];

    const monthlyData: Record<string, { revenue: number; spend: number }> = {};

    // Group sales by month
    sales.forEach(sale => {
      if (!sale.sale_date) return;
      const month = format(new Date(sale.sale_date), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, spend: 0 };
      }
      monthlyData[month].revenue += sale.total_price_brl || sale.total_price || 0;
    });

    // Group spend by month
    metaInsights.forEach(insight => {
      if (!insight.date_start) return;
      const month = format(new Date(insight.date_start), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, spend: 0 };
      }
      monthlyData[month].spend += insight.spend || 0;
    });

    // Convert to array and calculate accumulated profit
    const sortedMonths = Object.keys(monthlyData).sort();
    let accumulatedProfit = 0;

    return sortedMonths.map(month => {
      const data = monthlyData[month];
      const profit = data.revenue - data.spend;
      accumulatedProfit += profit;

      return {
        month,
        revenue: data.revenue,
        spend: data.spend,
        profit,
        accumulatedProfit,
      };
    });
  }, [sales, metaInsights]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0) || 0;
    const totalSpend = metaInsights?.reduce((sum, insight) => sum + (insight.spend || 0), 0) || 0;
    const totalSales = sales?.length || 0;
    const profit = totalRevenue - totalSpend;

    return {
      totalRevenue,
      totalSpend,
      totalSales,
      profit,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    };
  }, [sales, metaInsights]);

  const isLoading = salesLoading || funnelsLoading || mappingsLoading || insightsLoading || campaignsLoading;

  return {
    categoryMetrics,
    funnelROAS,
    generalROAS,
    monthlyBalance,
    summaryMetrics,
    isLoading,
    sales,
    funnels,
  };
};
