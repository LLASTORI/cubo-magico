/**
 * useLaunchData
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAUNCH FUNNEL DATA HOOK - PAID MEDIA DOMAIN INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Investment data now comes from Paid Media Domain (provider-agnostic).
 * Sales data uses Orders Core (orders + order_items) via funnel_orders_view architecture.
 * 
 * ARCHITECTURE:
 * - Paid Media metrics fetched via src/domains/paid-media
 * - Decoupled from provider-specific code (Meta/Google/TikTok)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { format } from "date-fns";
import { PaidMediaDomain } from "@/domains/paid-media";

interface PagoEdition {
  id: string;
  funnel_id: string;
  start_date: string | null;
  end_date: string | null;
}

interface UseLaunchDataProps {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
}

export interface LaunchMetrics {
  funnelId: string;
  funnelName: string;
  funnelModel: string | null;
  campaignPattern: string | null;
  roasTarget: number;
  launchStartDate: string | null;
  launchEndDate: string | null;
  hasFixedDates: boolean;
  launchTag: string | null;
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // LANCAMENTO PAGO: Fetch edition-scoped metrics (ignores dashboard date range)
  // ═══════════════════════════════════════════════════════════════════════════════
  const pagoFunnelIds = useMemo(
    () => funnels.filter(f => (f as any).funnel_model === 'lancamento_pago').map(f => f.id),
    [funnels],
  );

  const { data: pagoEditions = [] } = useQuery<PagoEdition[]>({
    queryKey: ['pago-funnel-editions', projectId, pagoFunnelIds.join(',')],
    queryFn: async () => {
      if (!projectId || pagoFunnelIds.length === 0) return [];
      const { data, error } = await supabase
        .from('launch_editions')
        .select('id, funnel_id, start_date, end_date')
        .in('funnel_id', pagoFunnelIds);
      if (error) throw error;
      return (data || []) as PagoEdition[];
    },
    enabled: !!projectId && pagoFunnelIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Min/max date range per pago funnel derived from its editions
  const pagoFunnelDateRanges = useMemo(() => {
    const ranges: Record<string, { start: string; end: string }> = {};
    for (const e of pagoEditions) {
      const edEnd = e.end_date || e.event_date;
      if (!e.start_date || !edEnd) continue;
      const existing = ranges[e.funnel_id];
      if (!existing) {
        ranges[e.funnel_id] = { start: e.start_date, end: edEnd };
      } else {
        if (e.start_date < existing.start) existing.start = e.start_date;
        if (edEnd > existing.end) existing.end = edEnd;
      }
    }
    return ranges;
  }, [pagoEditions]);

  const pagoGlobalRange = useMemo(() => {
    const values = Object.values(pagoFunnelDateRanges);
    if (values.length === 0) return null;
    const starts = values.map(r => r.start).sort();
    const ends = values.map(r => r.end).sort();
    return { start: starts[0], end: ends[ends.length - 1] };
  }, [pagoFunnelDateRanges]);

  // Revenue for pago funnels from funnel_orders_view (edition-scoped, not dashboard range)
  const { data: pagoOrdersData = [] } = useQuery<{ funnel_id: string; customer_paid: number; economic_day: string }[]>({
    queryKey: ['pago-orders', projectId, pagoFunnelIds.join(','), pagoGlobalRange?.start, pagoGlobalRange?.end],
    queryFn: async () => {
      if (!projectId || pagoFunnelIds.length === 0 || !pagoGlobalRange) return [];
      const { data, error } = await supabase
        .from('funnel_orders_view')
        .select('funnel_id, customer_paid, economic_day')
        .eq('project_id', projectId)
        .in('funnel_id', pagoFunnelIds)
        .gte('economic_day', pagoGlobalRange.start)
        .lte('economic_day', pagoGlobalRange.end);
      if (error) throw error;
      return (data || []) as { funnel_id: string; customer_paid: number; economic_day: string }[];
    },
    enabled: !!projectId && pagoFunnelIds.length > 0 && !!pagoGlobalRange,
    staleTime: 2 * 60 * 1000,
  });

  // Revenue per pago funnel (respects each funnel's actual edition date range)
  const pagoRevenueByFunnel = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [funnelId, range] of Object.entries(pagoFunnelDateRanges)) {
      const orders = pagoOrdersData.filter(
        o => o.funnel_id === funnelId &&
             o.economic_day >= range.start &&
             o.economic_day <= range.end,
      );
      result[funnelId] = orders.reduce((sum, o) => sum + (Number(o.customer_paid) || 0), 0);
    }
    return result;
  }, [pagoOrdersData, pagoFunnelDateRanges]);

  // Sales count per pago funnel
  const pagoSalesCountByFunnel = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [funnelId, range] of Object.entries(pagoFunnelDateRanges)) {
      result[funnelId] = pagoOrdersData.filter(
        o => o.funnel_id === funnelId &&
             o.economic_day >= range.start &&
             o.economic_day <= range.end,
      ).length;
    }
    return result;
  }, [pagoOrdersData, pagoFunnelDateRanges]);

  // Meta insights for pago funnels using funnel-level dates (launch_start_date → launch_end_date)
  const pagoInsightRange = useMemo(() => {
    const pagoFunnelsWithDates = funnels.filter(
      f => (f as any).funnel_model === 'lancamento_pago' && f.launch_start_date,
    );
    if (pagoFunnelsWithDates.length === 0) return null;
    const starts = pagoFunnelsWithDates.map(f => f.launch_start_date!).sort();
    const ends = pagoFunnelsWithDates
      .map(f => f.launch_end_date || format(new Date(), 'yyyy-MM-dd'))
      .sort();
    return { start: starts[0], end: ends[ends.length - 1] };
  }, [funnels]);

  const { data: pagoMetaInsights = [] } = useQuery({
    queryKey: ['meta-insights-pago', projectId, pagoInsightRange?.start, pagoInsightRange?.end],
    queryFn: async () => {
      if (!projectId || !pagoInsightRange) return [];
      let all: any[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('campaign_id, spend, date_start')
          .eq('project_id', projectId)
          .gte('date_start', pagoInsightRange.start)
          .lte('date_start', pagoInsightRange.end)
          .not('ad_id', 'is', null)
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          all = all.concat(data);
          offset += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }
      return all;
    },
    enabled: !!projectId && !!pagoInsightRange,
    staleTime: 2 * 60 * 1000,
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

  // Fetch sales data via orders + order_items (canonical source, replaces hotmart_sales)
  const { data: salesData = [], isLoading: loadingSales, refetch: refetchSales } = useQuery({
    queryKey: ['orders-lancamento', projectId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!projectId) return [];

      const dateStart = format(startDate, 'yyyy-MM-dd');
      const dateEnd = format(endDate, 'yyyy-MM-dd');

      // Paginate over orders, embed order_items for per-item offer breakdown.
      // Flatten into {offer_code, total_price_brl} to match consumer shape.
      let allSales: { offer_code: string | null; total_price_brl: number }[] = [];
      let offset = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('orders')
          .select('id, order_items(provider_offer_id, base_price)')
          .eq('project_id', projectId)
          .eq('status', 'approved')
          .gte('economic_day', dateStart)
          .lte('economic_day', dateEnd)
          .range(offset, offset + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          for (const order of data) {
            for (const item of (order.order_items || [])) {
              allSales.push({
                offer_code: item.provider_offer_id,
                total_price_brl: item.base_price ?? 0,
              });
            }
          }
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAID MEDIA DOMAIN: Fetch aggregated metrics via provider-agnostic domain layer
  // ═══════════════════════════════════════════════════════════════════════════════
  const { data: paidMediaData, isLoading: loadingPaidMedia, refetch: refetchPaidMedia } = useQuery({
    queryKey: ['paid-media-metrics-lancamento', projectId, activeAccountIds, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!projectId || activeAccountIds.length === 0) {
        return { metrics: [], aggregated: { spend: 0, impressions: 0, clicks: 0, reach: 0 } };
      }
      
      const dateRange = {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
      };
      
      console.log(`[useLaunchData] Fetching paid media metrics via domain`);
      
      try {
        const dailyMetrics = await PaidMediaDomain.getAggregatedMetrics(projectId, dateRange, activeAccountIds);
        
        const aggregated = dailyMetrics.reduce((acc, day) => ({
          spend: acc.spend + day.spend,
          impressions: acc.impressions + day.impressions,
          clicks: acc.clicks + day.clicks,
          reach: acc.reach + day.reach,
        }), { spend: 0, impressions: 0, clicks: 0, reach: 0 });
        
        console.log(`[useLaunchData] Paid Media Domain: ${dailyMetrics.length} days, total spend: ${aggregated.spend.toFixed(2)}`);
        
        return { metrics: dailyMetrics, aggregated };
      } catch (error) {
        console.error(`[useLaunchData] Error fetching paid media from domain:`, error);
        throw error;
      }
    },
    enabled: !!projectId && activeAccountIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEGACY: Keep raw insights query for campaign-level spend attribution
  // This is needed to match spend to specific campaign patterns per funnel
  // ═══════════════════════════════════════════════════════════════════════════════
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
      const isFunnelPago = (funnel as any).funnel_model === 'lancamento_pago';
      const funnelMappings = mappings.filter(m => m.funnel_id === funnel.id);
      const funnelOfferCodes = new Set(funnelMappings.map(m => m.codigo_oferta).filter(Boolean));
      const funnelSales = launchSales.filter(s =>
        s.offer_code && funnelOfferCodes.has(s.offer_code)
      );

      // Calculate spend from campaigns matching pattern
      // For lancamento_pago: use pagoMetaInsights (funnel-level date range)
      // For others: use metaInsights (dashboard date range)
      let totalSpend = 0;
      if (funnel.campaign_name_pattern) {
        const pattern = funnel.campaign_name_pattern.toLowerCase();
        const matchingCampaignIds = campaigns
          .filter(c => c.campaign_name?.toLowerCase().includes(pattern))
          .map(c => c.campaign_id);

        const insightsSource = isFunnelPago ? pagoMetaInsights : metaInsights;
        totalSpend = insightsSource
          .filter(i => matchingCampaignIds.includes(i.campaign_id))
          .reduce((sum, i) => sum + (i.spend || 0), 0);
      }

      // For lancamento_pago: revenue and sales count come from edition-scoped data
      const totalRevenue = isFunnelPago
        ? (pagoRevenueByFunnel[funnel.id] ?? 0)
        : funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
      const totalSalesCount = isFunnelPago
        ? (pagoSalesCountByFunnel[funnel.id] ?? 0)
        : funnelSales.length;
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

      // Define position order (FRONT first, then OB1, OB2, etc., then others)
      const positionOrder: Record<string, number> = {
        'FRONT': 0,
        'OB1': 1,
        'OB2': 2,
        'OB3': 3,
        'OB4': 4,
        'OB5': 5,
        'OB6': 6,
        'OB7': 7,
        'OB8': 8,
        'OB9': 9,
        'OB10': 10,
        'DOWNSELL': 11,
        'DS': 12,
        'NC': 99,
      };

      const getPositionOrder = (tipo: string): number => {
        const upperTipo = tipo.toUpperCase();
        if (positionOrder[upperTipo] !== undefined) return positionOrder[upperTipo];
        // Handle OB with any number
        const obMatch = upperTipo.match(/^OB(\d+)$/);
        if (obMatch) return parseInt(obMatch[1], 10);
        return 50; // Unknown positions in the middle
      };

      const positions = Object.values(positionGroups)
        .map(p => ({
          ...p,
          avgTicket: p.sales > 0 ? p.revenue / p.sales : 0,
          percentage: totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0,
        }))
        .sort((a, b) => getPositionOrder(a.tipo) - getPositionOrder(b.tipo));

      return {
        funnelId: funnel.id,
        funnelName: funnel.name,
        funnelModel: (funnel as any).funnel_model ?? null,
        campaignPattern: funnel.campaign_name_pattern,
        roasTarget: funnel.roas_target || 2,
        launchStartDate: funnel.launch_start_date,
        launchEndDate: funnel.launch_end_date,
        hasFixedDates: funnel.has_fixed_dates || false,
        launchTag: (funnel as any).launch_tag || null,
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
  }, [funnels, mappings, salesData, campaigns, metaInsights, pagoRevenueByFunnel, pagoSalesCountByFunnel, pagoMetaInsights]);

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
    await Promise.all([refetchSales(), refetchInsights(), refetchPaidMedia()]);
  };

  // Expose paid media aggregated data for potential future use
  const paidMediaAggregated = paidMediaData?.aggregated;

  return {
    funnels,
    mappings,
    salesData,
    metaInsights,
    launchMetrics,
    summaryMetrics,
    activeAccountIds,
    paidMediaAggregated, // New: Aggregated spend from Paid Media Domain
    isLoading: loadingFunnels || loadingMappings,
    loadingSales,
    loadingInsights: loadingInsights || loadingPaidMedia,
    refetchAll,
  };
};
