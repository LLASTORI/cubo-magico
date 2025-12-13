import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface UseLaunchDataProps {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
}

export interface LaunchMetrics {
  funnelId: string;
  funnelName: string;
  campaignPattern: string | null;
  roasTarget: number;
  launchStartDate: string | null;
  launchEndDate: string | null;
  hasFixedDates: boolean;
  totalRevenue: number;
  totalSales: number;
  avgTicket: number;
  totalSpend: number;
  roas: number;
  profit: number;
  cpa: number;
  positions: {
    tipo: string;
    nome: string;
    revenue: number;
    sales: number;
    avgTicket: number;
    percentage: number;
  }[];
}

export const useLaunchData = ({ projectId, startDate, endDate }: UseLaunchDataProps) => {
  // Fetch launch funnels only
  const { data: funnels = [], isLoading: loadingFunnels } = useQuery({
    queryKey: ['funnels-lancamento', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('project_id', projectId)
        .eq('funnel_type', 'lancamento')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch offer mappings for launch funnels
  const { data: mappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: ['offer-mappings-lancamento', projectId, funnels.map(f => f.id)],
    queryFn: async () => {
      if (!projectId || funnels.length === 0) return [];
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('project_id', projectId)
        .in('funnel_id', funnels.map(f => f.id));
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && funnels.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active Meta accounts
  const { data: metaAccounts = [] } = useQuery({
    queryKey: ['meta-accounts', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  const activeAccountIds = useMemo(() => 
    metaAccounts.map(a => a.account_id), 
    [metaAccounts]
  );

  // Fetch sales data with pagination
  const { data: salesData = [], isLoading: loadingSales, refetch: refetchSales } = useQuery({
    queryKey: ['hotmart-sales-lancamento', projectId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!projectId) return [];
      
      const brazilTz = 'America/Sao_Paulo';
      const startInBrazil = toZonedTime(startDate, brazilTz);
      startInBrazil.setHours(0, 0, 0, 0);
      const endInBrazil = toZonedTime(endDate, brazilTz);
      endInBrazil.setHours(23, 59, 59, 999);
      
      const startISO = startInBrazil.toISOString();
      const endISO = endInBrazil.toISOString();
      
      let allSales: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('*')
          .eq('project_id', projectId)
          .gte('sale_date', startISO)
          .lte('sale_date', endISO)
          .in('status', ['APPROVED', 'COMPLETE'])
          .range(offset, offset + pageSize - 1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          allSales = allSales.concat(data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allSales;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch Meta insights with pagination
  const { data: metaInsights = [], isLoading: loadingInsights, refetch: refetchInsights } = useQuery({
    queryKey: ['meta-insights-lancamento', projectId, activeAccountIds, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!projectId || activeAccountIds.length === 0) return [];
      
      const dateStart = format(startDate, 'yyyy-MM-dd');
      const dateStop = format(endDate, 'yyyy-MM-dd');
      
      let allInsights: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('*')
          .eq('project_id', projectId)
          .in('ad_account_id', activeAccountIds)
          .gte('date_start', dateStart)
          .lte('date_start', dateStop)
          .not('ad_id', 'is', null)
          .range(offset, offset + pageSize - 1);
        
        if (error) throw error;
        if (data && data.length > 0) {
          allInsights = allInsights.concat(data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      
      return allInsights;
    },
    enabled: !!projectId && activeAccountIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch campaigns for mapping
  const { data: campaigns = [] } = useQuery({
    queryKey: ['meta-campaigns', projectId],
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
    staleTime: 5 * 60 * 1000,
  });

  // Calculate launch metrics
  const launchMetrics = useMemo<LaunchMetrics[]>(() => {
    if (funnels.length === 0) return [];

    const offerCodes = new Set(mappings.map(m => m.codigo_oferta).filter(Boolean));
    const launchSales = salesData.filter(s => 
      s.offer_code && offerCodes.has(s.offer_code)
    );

    return funnels.map(funnel => {
      const funnelMappings = mappings.filter(m => m.funnel_id === funnel.id);
      const funnelOfferCodes = new Set(funnelMappings.map(m => m.codigo_oferta).filter(Boolean));
      const funnelSales = launchSales.filter(s => 
        s.offer_code && funnelOfferCodes.has(s.offer_code)
      );

      // Calculate spend from campaigns matching pattern
      let totalSpend = 0;
      if (funnel.campaign_name_pattern) {
        const pattern = funnel.campaign_name_pattern.toLowerCase();
        const matchingCampaignIds = campaigns
          .filter(c => c.campaign_name?.toLowerCase().includes(pattern))
          .map(c => c.campaign_id);

        totalSpend = metaInsights
          .filter(i => matchingCampaignIds.includes(i.campaign_id))
          .reduce((sum, i) => sum + (i.spend || 0), 0);
      }

      const totalRevenue = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
      const totalSalesCount = funnelSales.length;
      const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const profit = totalRevenue - totalSpend;
      const cpa = totalSalesCount > 0 ? totalSpend / totalSalesCount : 0;

      // Calculate by position
      const positionGroups = funnelMappings.reduce((acc, mapping) => {
        const key = mapping.tipo_posicao || 'NC';
        if (!acc[key]) {
          acc[key] = { 
            tipo: key, 
            nome: mapping.nome_posicao || key, 
            revenue: 0, 
            sales: 0 
          };
        }
        
        const positionSales = funnelSales.filter(s => s.offer_code === mapping.codigo_oferta);
        acc[key].revenue += positionSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
        acc[key].sales += positionSales.length;
        
        return acc;
      }, {} as Record<string, { tipo: string; nome: string; revenue: number; sales: number }>);

      const positions = Object.values(positionGroups).map(p => ({
        ...p,
        avgTicket: p.sales > 0 ? p.revenue / p.sales : 0,
        percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
      }));

      return {
        funnelId: funnel.id,
        funnelName: funnel.name,
        campaignPattern: funnel.campaign_name_pattern,
        roasTarget: funnel.roas_target || 2,
        launchStartDate: funnel.launch_start_date,
        launchEndDate: funnel.launch_end_date,
        hasFixedDates: funnel.has_fixed_dates || false,
        totalRevenue,
        totalSales: totalSalesCount,
        avgTicket,
        totalSpend,
        roas,
        profit,
        cpa,
        positions,
      };
    });
  }, [funnels, mappings, salesData, campaigns, metaInsights]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalRevenue = launchMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalSpend = launchMetrics.reduce((sum, m) => sum + m.totalSpend, 0);
    const totalSales = launchMetrics.reduce((sum, m) => sum + m.totalSales, 0);
    
    return {
      totalRevenue,
      totalSpend,
      totalSales,
      avgTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      profit: totalRevenue - totalSpend,
      cpa: totalSales > 0 ? totalSpend / totalSales : 0,
      funnelCount: funnels.length,
    };
  }, [launchMetrics, funnels.length]);

  const refetchAll = async () => {
    await Promise.all([refetchSales(), refetchInsights()]);
  };

  return {
    funnels,
    mappings,
    salesData,
    metaInsights,
    launchMetrics,
    summaryMetrics,
    activeAccountIds,
    isLoading: loadingFunnels || loadingMappings,
    loadingSales,
    loadingInsights,
    refetchAll,
  };
};
