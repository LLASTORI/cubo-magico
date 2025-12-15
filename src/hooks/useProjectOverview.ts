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
  // Fetch sales data with proper timezone handling (Brazil UTC-3)
  const { data: sales, isLoading: salesLoading } = useQuery({
    queryKey: ['project-overview-sales', projectId, startDate, endDate],
    queryFn: async () => {
      if (!projectId) return [];
      
      // IMPORTANT: Sales are stored in UTC. To filter by Brazil timezone (UTC-3),
      // we need to adjust the timestamps. When user selects a date in Brazil:
      // - Start: YYYY-MM-DD 00:00:00 Brazil = YYYY-MM-DD 03:00:00 UTC
      // - End: YYYY-MM-DD 23:59:59 Brazil = next day 02:59:59 UTC
      const startTimestamp = `${startDate}T03:00:00.000Z`; // 00:00 Brazil = 03:00 UTC
      
      // Adjust end date to next day for the UTC conversion
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndDate = endDateObj.toISOString().split('T')[0];
      const adjustedEndTimestamp = `${adjustedEndDate}T02:59:59.999Z`;
      
      console.log(`[ProjectOverview] Sales query: Brazil ${startDate} to ${endDate} => UTC ${startTimestamp} to ${adjustedEndTimestamp}`);
      
      // Fetch ALL sales with pagination
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('*')
          .eq('project_id', projectId)
          .gte('sale_date', startTimestamp)
          .lte('sale_date', adjustedEndTimestamp)
          .in('status', ['APPROVED', 'COMPLETE', 'approved', 'complete'])
          .order('transaction_id', { ascending: true })
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
      
      console.log(`[ProjectOverview] Sales loaded: ${allData.length}, total revenue: R$${allData.reduce((s: number, sale: any) => s + (sale.total_price_brl || sale.total_price || 0), 0).toFixed(2)}`);
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
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch active meta ad accounts first (same as useFunnelData)
  const { data: activeAccountIds, isLoading: accountsLoading } = useQuery({
    queryKey: ['project-overview-accounts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (error) throw error;
      return (data || []).map(a => a.account_id).sort();
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch meta insights filtered by active accounts (same as useFunnelData)
  const { data: metaInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['project-overview-insights', projectId, startDate, endDate, activeAccountIds?.join(',')],
    queryFn: async () => {
      if (!projectId || !activeAccountIds || activeAccountIds.length === 0) return [];
      
      console.log(`[ProjectOverview] Fetching insights for accounts: ${activeAccountIds.join(',')}`);
      
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
          .in('ad_account_id', activeAccountIds)
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
      
      console.log(`[ProjectOverview] Insights loaded: ${allData.length}, total spend: ${allData.reduce((s: number, i: any) => s + (i.spend || 0), 0).toFixed(2)}`);
      return allData;
    },
    enabled: !!projectId && !!activeAccountIds && activeAccountIds.length > 0,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch meta campaigns for name pattern matching (with pagination)
  const { data: metaCampaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['project-overview-campaigns', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Fetch ALL campaigns with pagination
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_campaigns')
          .select('campaign_id, campaign_name')
          .eq('project_id', projectId)
          .order('campaign_id', { ascending: true })
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
      
      console.log(`[ProjectOverview] Campaigns loaded: ${allData.length}`);
      return allData;
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: 'always',
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
    console.log('[ProjectOverview] Calculating funnelROAS:', {
      funnels: funnels?.length,
      sales: sales?.length,
      metaInsights: metaInsights?.length,
      offerMappings: offerMappings?.length,
      metaCampaigns: metaCampaigns?.length,
    });

    if (!funnels || !sales || !metaInsights || !offerMappings || !metaCampaigns) {
      console.log('[ProjectOverview] Missing data, returning empty');
      return [];
    }

    const results = funnels.map(funnel => {
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
      let matchingCampaignIds: string[] = [];
      
      if (funnel.campaign_name_pattern) {
        const pattern = funnel.campaign_name_pattern.toLowerCase();
        matchingCampaignIds = metaCampaigns
          .filter(c => c.campaign_name?.toLowerCase().includes(pattern))
          .map(c => c.campaign_id);

        // Calculate spend from insights for these campaigns
        // IMPORTANT: Deduplicate by ad_id + date to avoid double counting
        const matchingInsights = metaInsights.filter(
          insight => insight.campaign_id && matchingCampaignIds.includes(insight.campaign_id)
        );
        
        const uniqueSpend = new Map<string, number>();
        matchingInsights.forEach(insight => {
          if (insight.spend && insight.ad_id) {
            const key = `${insight.ad_id}_${insight.date_start}`;
            if (!uniqueSpend.has(key)) {
              uniqueSpend.set(key, insight.spend);
            }
          }
        });
        funnelSpend = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
      }

      console.log(`[ProjectOverview] Funnel "${funnel.name}": pattern="${funnel.campaign_name_pattern}", campaigns=${matchingCampaignIds.length}, offers=${funnelOfferCodes.length}, revenue=${funnelRevenue.toFixed(2)}, spend=${funnelSpend.toFixed(2)}`);

      return {
        funnelId: funnel.id,
        funnelName: funnel.name,
        revenue: funnelRevenue,
        spend: funnelSpend,
        roas: funnelSpend > 0 ? funnelRevenue / funnelSpend : 0,
      };
    }).filter(f => f.revenue > 0 || f.spend > 0);

    console.log('[ProjectOverview] Final funnelROAS results:', results);
    return results;
  }, [funnels, sales, metaInsights, offerMappings, metaCampaigns]);

  // Calculate general ROAS (all sales vs all spend)
  // IMPORTANT: Deduplicate spend by ad_id + date to avoid double counting
  const generalROAS = useMemo(() => {
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0) || 0;
    
    // Deduplicate spend
    const uniqueSpend = new Map<string, number>();
    metaInsights?.forEach(insight => {
      if (insight.spend && insight.ad_id) {
        const key = `${insight.ad_id}_${insight.date_start}`;
        if (!uniqueSpend.has(key)) {
          uniqueSpend.set(key, insight.spend);
        }
      }
    });
    const totalSpend = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
    
    return {
      revenue: totalRevenue,
      spend: totalSpend,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    };
  }, [sales, metaInsights]);

  // Calculate monthly balance
  // IMPORTANT: Deduplicate spend by ad_id + date to avoid double counting
  const monthlyBalance = useMemo((): MonthlyBalance[] => {
    if (!sales || !metaInsights) return [];

    const monthlyData: Record<string, { revenue: number; spend: number }> = {};
    
    // Track unique spend entries
    const uniqueSpendEntries = new Map<string, { month: string; spend: number }>();

    // Group sales by month
    sales.forEach(sale => {
      if (!sale.sale_date) return;
      const month = format(new Date(sale.sale_date), 'yyyy-MM');
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, spend: 0 };
      }
      monthlyData[month].revenue += sale.total_price_brl || sale.total_price || 0;
    });

    // Group spend by month (deduplicated)
    metaInsights.forEach(insight => {
      if (!insight.date_start || !insight.ad_id || !insight.spend) return;
      const key = `${insight.ad_id}_${insight.date_start}`;
      if (!uniqueSpendEntries.has(key)) {
        const month = format(new Date(insight.date_start), 'yyyy-MM');
        uniqueSpendEntries.set(key, { month, spend: insight.spend });
      }
    });
    
    // Add unique spend to monthly data
    uniqueSpendEntries.forEach(({ month, spend }) => {
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, spend: 0 };
      }
      monthlyData[month].spend += spend;
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
  // IMPORTANT: Deduplicate spend by ad_id + date to avoid double counting
  const summaryMetrics = useMemo(() => {
    const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.total_price_brl || sale.total_price || 0), 0) || 0;
    
    // Deduplicate spend
    const uniqueSpend = new Map<string, number>();
    metaInsights?.forEach(insight => {
      if (insight.spend && insight.ad_id) {
        const key = `${insight.ad_id}_${insight.date_start}`;
        if (!uniqueSpend.has(key)) {
          uniqueSpend.set(key, insight.spend);
        }
      }
    });
    const totalSpend = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
    
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

  const isLoading = salesLoading || funnelsLoading || mappingsLoading || insightsLoading || campaignsLoading || accountsLoading;

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
