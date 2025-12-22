import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useMetaHierarchy } from "./useMetaHierarchy";

interface UseFunnelDataProps {
  projectId: string | undefined;
  startDate: Date;
  endDate: Date;
}

interface OfferMapping {
  id: string;
  id_funil: string;
  funnel_id: string | null;
  nome_produto: string;
  nome_oferta: string | null;
  codigo_oferta: string | null;
  tipo_posicao: string | null;
  nome_posicao: string | null;
  ordem_posicao: number | null;
  valor: number | null;
  status: string | null;
}

interface FunnelConfig {
  id: string;
  name: string;
  campaign_name_pattern: string | null;
  roas_target: number | null;
}

interface SaleRecord {
  transaction_id: string;
  product_name: string;
  offer_code: string | null;
  total_price_brl: number | null;
  buyer_email: string | null;
  sale_date: string | null;
  status: string;
  checkout_origin: string | null;
  meta_campaign_id_extracted: string | null;
  meta_adset_id_extracted: string | null;
  meta_ad_id_extracted: string | null;
  utm_source: string | null;
  utm_campaign_id: string | null;
  utm_adset_name: string | null;
  utm_creative: string | null;
  utm_placement: string | null;
  payment_method: string | null;
  installment_number: number | null;
}

interface MetaInsight {
  id: string;
  campaign_id: string | null;
  adset_id: string | null;
  ad_id: string | null;
  ad_account_id: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  reach: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  date_start: string;
  date_stop: string;
}

interface PositionMetrics {
  tipo_posicao: string;
  nome_posicao: string;
  ordem_posicao: number;
  nome_oferta: string;
  codigo_oferta: string;
  valor_oferta: number;
  total_vendas: number;
  total_receita: number;
  taxa_conversao: number;
  percentual_receita: number;
}

const getPositionSortOrder = (tipo: string, ordem: number): number => {
  if (tipo === 'FRONT' || tipo === 'FE') return 0;
  if (tipo === 'OB') return ordem;
  if (tipo === 'US') return 5 + (ordem * 2) - 1;
  if (tipo === 'DS') return 5 + (ordem * 2);
  return 999;
};

// Insights are now stored ONLY at ad level (most granular)
// No deduplication needed - just aggregate by the level you need
const getInsightsAtLevel = (insights: MetaInsight[], level: 'ad' | 'adset' | 'campaign' | 'account') => {
  // All insights are at ad level now, just return them for aggregation
  return insights.filter(i => i.ad_id !== null);
};

// Aggregate insights by campaign
const aggregateInsightsByCampaign = (insights: MetaInsight[]) => {
  const byCampaign = new Map<string, { spend: number; impressions: number; clicks: number; reach: number }>();
  
  insights.forEach(i => {
    if (!i.campaign_id) return;
    const key = `${i.campaign_id}_${i.date_start}`;
    const existing = byCampaign.get(key) || { spend: 0, impressions: 0, clicks: 0, reach: 0 };
    byCampaign.set(key, {
      spend: existing.spend + (i.spend || 0),
      impressions: existing.impressions + (i.impressions || 0),
      clicks: existing.clicks + (i.clicks || 0),
      reach: existing.reach + (i.reach || 0),
    });
  });
  
  return byCampaign;
};

// Aggregate insights by adset
const aggregateInsightsByAdset = (insights: MetaInsight[]) => {
  const byAdset = new Map<string, { spend: number; impressions: number; clicks: number; reach: number }>();
  
  insights.forEach(i => {
    if (!i.adset_id) return;
    const key = `${i.adset_id}_${i.date_start}`;
    const existing = byAdset.get(key) || { spend: 0, impressions: 0, clicks: 0, reach: 0 };
    byAdset.set(key, {
      spend: existing.spend + (i.spend || 0),
      impressions: existing.impressions + (i.impressions || 0),
      clicks: existing.clicks + (i.clicks || 0),
      reach: existing.reach + (i.reach || 0),
    });
  });
  
  return byAdset;
};

export const useFunnelData = ({ projectId, startDate, endDate }: UseFunnelDataProps) => {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  const enabled = !!projectId;

  // STABLE individual queries - no useQueries to avoid hooks order issues
  // Filter only 'perpetuo' funnels (exclude 'A Definir' and 'Lançamento')
  const funnelsQuery = useQuery({
    queryKey: ['funnels-perpetuo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name, campaign_name_pattern, roas_target')
        .eq('project_id', projectId!)
        .eq('funnel_type', 'perpetuo');
      if (error) throw error;
      return (data as FunnelConfig[]) || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const mappingsQuery = useQuery({
    queryKey: ['mappings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('project_id', projectId!)
        .eq('status', 'Ativo');
      if (error) throw error;
      return (data as OfferMapping[]) || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const accountsQuery = useQuery({
    queryKey: ['meta-accounts', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId!)
        .eq('is_active', true);
      if (error) throw error;
      return (data || []).map(a => a.account_id).sort();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const salesQuery = useQuery({
    queryKey: ['sales', projectId, startDateStr, endDateStr],
    queryFn: async () => {
      // IMPORTANT: Sales are stored in UTC. To filter by Brazil timezone (UTC-3),
      // we need to adjust the timestamps. When user selects "2025-12-09" in Brazil:
      // - Start: 2025-12-09 00:00:00 Brazil = 2025-12-09 03:00:00 UTC
      // - End: 2025-12-09 23:59:59 Brazil = 2025-12-10 02:59:59 UTC
      // Using timezone-aware timestamps ensures correct filtering
      const startTimestamp = `${startDateStr}T03:00:00.000Z`; // 00:00 Brazil = 03:00 UTC
      
      // Adjust end date to next day for the UTC conversion
      const endDateObj = new Date(endDateStr);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndDate = endDateObj.toISOString().split('T')[0];
      const adjustedEndTimestamp = `${adjustedEndDate}T02:59:59.999Z`;
      
      console.log(`[useFunnelData] Sales query: Brazil ${startDateStr} to ${endDateStr} => UTC ${startTimestamp} to ${adjustedEndTimestamp}`);
      
      // Fetch ALL sales with pagination to handle large date ranges
      const PAGE_SIZE = 1000;
      let allData: SaleRecord[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('hotmart_sales')
          .select('transaction_id, product_name, offer_code, total_price_brl, buyer_email, sale_date, status, checkout_origin, meta_campaign_id_extracted, meta_adset_id_extracted, meta_ad_id_extracted, utm_source, utm_campaign_id, utm_adset_name, utm_creative, utm_placement, payment_method, installment_number')
          .eq('project_id', projectId!)
          .in('status', ['APPROVED', 'COMPLETE'])
          .gte('sale_date', startTimestamp)
          .lte('sale_date', adjustedEndTimestamp)
          .order('transaction_id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) {
          console.error(`[useFunnelData] Error fetching sales page ${page}:`, error);
          throw error;
        }
        
        console.log(`[useFunnelData] Sales page ${page}: ${data?.length || 0} records`);
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[useFunnelData] Total sales loaded: ${allData.length}, total revenue: R$${allData.reduce((s, sale) => s + (sale.total_price_brl || 0), 0).toFixed(2)}`);
      return allData;
    },
    enabled,
    staleTime: 30 * 1000,
  });

  // Get active account IDs first before building insights query
  const activeAccountIds = accountsQuery.data || [];

  const insightsQuery = useQuery({
    queryKey: ['insights', projectId, startDateStr, endDateStr, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) {
        console.log(`[useFunnelData] No active accounts, skipping insights fetch`);
        return [];
      }
      
      console.log(`[useFunnelData] Fetching insights for project=${projectId}, dates=${startDateStr} to ${endDateStr}, accounts=${activeAccountIds.join(',')}`);
      
      // Fetch ALL ad-level insights with pagination to handle any time period
      const PAGE_SIZE = 1000;
      let allData: MetaInsight[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('id, campaign_id, adset_id, ad_id, ad_account_id, spend, impressions, clicks, reach, ctr, cpc, cpm, date_start, date_stop')
          .eq('project_id', projectId!)
          .in('ad_account_id', activeAccountIds)
          .not('ad_id', 'is', null)
          .gte('date_start', startDateStr)
          .lte('date_start', endDateStr)
          .order('id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) {
          console.error(`[useFunnelData] Error fetching insights:`, error);
          throw error;
        }
        
        console.log(`[useFunnelData] Page ${page}: ${data?.length || 0} records`);
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[useFunnelData] Ad-level insights loaded: ${allData.length}, total spend: ${allData.reduce((s, i) => s + (i.spend || 0), 0).toFixed(2)}`);
      return allData as MetaInsight[];
    },
    enabled: enabled && activeAccountIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds - prevents excessive refetches
    gcTime: 60 * 1000, // 1 minute cache
  });

  // Use unified hook for Meta hierarchy (campaigns, adsets, ads)
  const { campaigns, adsets, ads, insightIds } = useMetaHierarchy({
    projectId,
    insights: insightsQuery.data,
    enabled,
  });

  // Extract data
  const funnels = funnelsQuery.data || [];
  const mappings = mappingsQuery.data || [];
  const salesData = salesQuery.data || [];
  const rawInsights = insightsQuery.data || [];

  // Loading states
  const loadingSales = salesQuery.isLoading;
  const loadingInsights = insightsQuery.isLoading;
  const isLoading = loadingSales;

  // Sorted mappings
  const sortedMappings = useMemo(() => {
    if (!mappings.length) return [];
    return [...mappings].sort((a, b) => {
      const orderA = getPositionSortOrder(a.tipo_posicao || '', a.ordem_posicao || 0);
      const orderB = getPositionSortOrder(b.tipo_posicao || '', b.ordem_posicao || 0);
      return orderA - orderB;
    });
  }, [mappings]);

  const offerCodes = useMemo(() => {
    return sortedMappings.map(m => m.codigo_oferta).filter(Boolean) as string[];
  }, [sortedMappings]);

  // All insights are now at ad level only - no deduplication needed
  // Just filter to ensure we only have ad-level data
  const adLevelInsights = useMemo(() => {
    if (!rawInsights.length) return [];
    // Filter to only ad-level insights (ad_id is not null)
    return rawInsights.filter(i => i.ad_id !== null);
  }, [rawInsights]);

  // Total Meta investment (sum of all ad-level insights)
  const totalMetaInvestment = useMemo(() => {
    return adLevelInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
  }, [adLevelInsights]);

  // Meta metrics (aggregated from ad-level insights)
  const metaMetrics = useMemo(() => {
    const spend = adLevelInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const impressions = adLevelInsights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const clicks = adLevelInsights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    const reach = adLevelInsights.reduce((sum, i) => sum + (i.reach || 0), 0);
    
    return {
      spend,
      impressions,
      clicks,
      reach,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    };
  }, [adLevelInsights]);

  // Aggregated metrics by position
  const aggregatedMetrics = useMemo((): PositionMetrics[] => {
    if (!salesData.length) return [];

    const salesByOffer: Record<string, { count: number; revenue: number }> = {};
    salesData.forEach(sale => {
      const code = sale.offer_code || 'SEM_CODIGO';
      if (!salesByOffer[code]) salesByOffer[code] = { count: 0, revenue: 0 };
      
      const isFirstInstallment = sale.installment_number === 1 || sale.installment_number === null;
      if (isFirstInstallment) salesByOffer[code].count += 1;
      salesByOffer[code].revenue += sale.total_price_brl || 0;
    });

    const mappedOffers = new Set(sortedMappings.map(m => m.codigo_oferta));
    const feSales = sortedMappings
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => sum + (salesByOffer[m.codigo_oferta || '']?.count || 0), 0);
    const totalAllRevenue = Object.values(salesByOffer).reduce((sum, s) => sum + s.revenue, 0);

    const mappedMetrics = sortedMappings.map(mapping => {
      const offerSales = salesByOffer[mapping.codigo_oferta || ''] || { count: 0, revenue: 0 };
      const taxaConversao = feSales > 0 ? (offerSales.count / feSales) * 100 : 0;
      const percentualReceita = totalAllRevenue > 0 ? (offerSales.revenue / totalAllRevenue) * 100 : 0;

      return {
        tipo_posicao: mapping.tipo_posicao || '',
        nome_posicao: mapping.nome_posicao || '',
        ordem_posicao: mapping.ordem_posicao || 0,
        nome_oferta: mapping.nome_oferta || '',
        codigo_oferta: mapping.codigo_oferta || '',
        valor_oferta: mapping.valor || 0,
        total_vendas: offerSales.count,
        total_receita: offerSales.revenue,
        taxa_conversao: taxaConversao,
        percentual_receita: percentualReceita,
      };
    });

    const unmappedOffers = Object.entries(salesByOffer)
      .filter(([code]) => !mappedOffers.has(code) && code !== 'SEM_CODIGO')
      .map(([code, data]) => ({
        tipo_posicao: 'NC',
        nome_posicao: 'Não Categorizado',
        ordem_posicao: 999,
        nome_oferta: `Oferta ${code}`,
        codigo_oferta: code,
        valor_oferta: data.count > 0 ? data.revenue / data.count : 0,
        total_vendas: data.count,
        total_receita: data.revenue,
        taxa_conversao: feSales > 0 ? (data.count / feSales) * 100 : 0,
        percentual_receita: totalAllRevenue > 0 ? (data.revenue / totalAllRevenue) * 100 : 0,
      }));

    return [...mappedMetrics, ...unmappedOffers];
  }, [sortedMappings, salesData]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalVendas = aggregatedMetrics.reduce((sum, m) => sum + m.total_vendas, 0);
    const totalReceita = aggregatedMetrics.reduce((sum, m) => sum + m.total_receita, 0);
    const vendasFront = aggregatedMetrics
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => sum + m.total_vendas, 0);
    
    const uniqueCustomers = new Set(salesData.map(s => s.buyer_email).filter(Boolean)).size;
    const baseVendas = vendasFront > 0 ? vendasFront : totalVendas;
    const ticketMedio = baseVendas > 0 ? totalReceita / baseVendas : 0;
    
    const avgRoasTarget = funnels.length 
      ? funnels.reduce((sum, f) => sum + (f.roas_target || 2), 0) / funnels.length 
      : 2;
    const cpaMaximo = ticketMedio / avgRoasTarget;
    const cpaReal = baseVendas > 0 ? totalMetaInvestment / baseVendas : 0;
    const roas = totalMetaInvestment > 0 ? totalReceita / totalMetaInvestment : 0;

    return { 
      totalVendas, 
      totalReceita, 
      ticketMedio, 
      uniqueCustomers, 
      vendasFront,
      investimento: totalMetaInvestment,
      cpaMaximo,
      cpaReal,
      roas,
      roasTarget: avgRoasTarget,
    };
  }, [aggregatedMetrics, salesData, totalMetaInvestment, funnels]);

  // Refetch functions
  const refetchAll = async () => {
    console.log(`[useFunnelData] Refetching all data...`);
    const results = await Promise.all([
      salesQuery.refetch(),
      insightsQuery.refetch(),
    ]);
    console.log(`[useFunnelData] Refetch complete. Sales: ${results[0].data?.length || 0}, Insights: ${results[1].data?.length || 0}`);
  };

  return {
    funnels,
    mappings,
    sortedMappings,
    offerCodes,
    salesData,
    metaInsights: adLevelInsights,
    rawInsights, // Keep raw for debugging
    metaStructure: { campaigns, adsets, ads },
    activeAccountIds,
    aggregatedMetrics,
    summaryMetrics,
    metaMetrics,
    totalMetaInvestment,
    isLoading,
    loadingSales,
    loadingInsights,
    refetchAll,
    refetchSales: salesQuery.refetch,
    refetchInsights: insightsQuery.refetch,
  };
};

export type { OfferMapping, FunnelConfig, SaleRecord, MetaInsight, PositionMetrics };
