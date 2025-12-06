import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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

// Função para calcular a ordem correta no funil
const getPositionSortOrder = (tipo: string, ordem: number): number => {
  if (tipo === 'FRONT' || tipo === 'FE') return 0;
  if (tipo === 'OB') return ordem;
  if (tipo === 'US') return 5 + (ordem * 2) - 1;
  if (tipo === 'DS') return 5 + (ordem * 2);
  return 999;
};

// Deduplicate insights by ad_id + date or campaign_id + date
const deduplicateInsights = (insights: MetaInsight[]) => {
  const adLevelInsights = insights.filter(i => i.ad_id);
  const campaignLevelInsights = insights.filter(i => !i.ad_id && !i.adset_id);
  
  if (adLevelInsights.length > 0) {
    const unique = new Map<string, MetaInsight>();
    adLevelInsights.forEach(i => {
      const key = `${i.ad_id}_${i.date_start}`;
      if (!unique.has(key)) unique.set(key, i);
    });
    return Array.from(unique.values());
  }
  
  if (campaignLevelInsights.length > 0) {
    const unique = new Map<string, MetaInsight>();
    campaignLevelInsights.forEach(i => {
      const key = `${i.campaign_id}_${i.date_start}`;
      if (!unique.has(key)) unique.set(key, i);
    });
    return Array.from(unique.values());
  }
  
  return [];
};

export const useFunnelData = ({ projectId, startDate, endDate }: UseFunnelDataProps) => {
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // ALL queries run in PARALLEL - no dependencies between them
  const queries = useQueries({
    queries: [
      // 0: Funnels
      {
        queryKey: ['funnels', projectId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('funnels')
            .select('id, name, campaign_name_pattern, roas_target')
            .eq('project_id', projectId!);
          if (error) throw error;
          return (data as FunnelConfig[]) || [];
        },
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000,
      },
      // 1: Mappings
      {
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
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000,
      },
      // 2: Active Account IDs
      {
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
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000,
      },
      // 3: Sales - simple single query (no pagination for faster load)
      {
        queryKey: ['sales', projectId, startDateStr, endDateStr],
        queryFn: async () => {
          const startTimestamp = `${startDateStr}T00:00:00`;
          const endTimestamp = `${endDateStr}T23:59:59`;
          
          const { data, error } = await supabase
            .from('hotmart_sales')
            .select('transaction_id, product_name, offer_code, total_price_brl, buyer_email, sale_date, status, meta_campaign_id_extracted, meta_adset_id_extracted, meta_ad_id_extracted, utm_source, utm_campaign_id, utm_adset_name, utm_creative, utm_placement, payment_method, installment_number')
            .eq('project_id', projectId!)
            .in('status', ['APPROVED', 'COMPLETE'])
            .gte('sale_date', startTimestamp)
            .lte('sale_date', endTimestamp)
            .order('sale_date', { ascending: false })
            .limit(5000); // Limit to avoid timeout
          
          if (error) throw error;
          return (data as SaleRecord[]) || [];
        },
        enabled: !!projectId,
        staleTime: 30 * 1000,
      },
      // 4: Meta Insights - simple single query
      {
        queryKey: ['insights', projectId, startDateStr, endDateStr],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('meta_insights')
            .select('id, campaign_id, adset_id, ad_id, ad_account_id, spend, impressions, clicks, reach, ctr, cpc, cpm, date_start, date_stop')
            .eq('project_id', projectId!)
            .gte('date_start', startDateStr)
            .lte('date_start', endDateStr)
            .limit(5000);
          
          if (error) throw error;
          return (data as MetaInsight[]) || [];
        },
        enabled: !!projectId,
        staleTime: 30 * 1000,
      },
      // 5: Campaigns
      {
        queryKey: ['campaigns', projectId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('meta_campaigns')
            .select('id, campaign_id, campaign_name, status')
            .eq('project_id', projectId!);
          if (error) throw error;
          return data || [];
        },
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000,
      },
      // 6: Adsets
      {
        queryKey: ['adsets', projectId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('meta_adsets')
            .select('id, adset_id, adset_name, campaign_id, status')
            .eq('project_id', projectId!);
          if (error) throw error;
          return data || [];
        },
        enabled: !!projectId,
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  // Extract data from parallel queries
  const funnels = queries[0].data || [];
  const mappings = queries[1].data || [];
  const activeAccountIds = queries[2].data || [];
  const salesData = queries[3].data || [];
  const rawInsights = queries[4].data || [];
  const campaigns = queries[5].data || [];
  const adsets = queries[6].data || [];

  // Loading states - separate for each data type
  const loadingStatic = queries[0].isLoading || queries[1].isLoading || queries[2].isLoading;
  const loadingSales = queries[3].isLoading;
  const loadingInsights = queries[4].isLoading;
  const loadingStructure = queries[5].isLoading || queries[6].isLoading;

  // Primary loading - only block UI if sales are loading (main data)
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

  // Deduplicated insights
  const deduplicatedInsights = useMemo(() => {
    if (!rawInsights.length) return [];
    return deduplicateInsights(rawInsights);
  }, [rawInsights]);

  // Total Meta investment
  const totalMetaInvestment = useMemo(() => {
    return deduplicatedInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
  }, [deduplicatedInsights]);

  // Meta metrics
  const metaMetrics = useMemo(() => {
    const spend = deduplicatedInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const impressions = deduplicatedInsights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const clicks = deduplicatedInsights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    const reach = deduplicatedInsights.reduce((sum, i) => sum + (i.reach || 0), 0);
    
    return {
      spend,
      impressions,
      clicks,
      reach,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    };
  }, [deduplicatedInsights]);

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
    await Promise.all([
      queries[3].refetch(),
      queries[4].refetch(),
    ]);
  };

  return {
    // Raw data
    funnels,
    mappings,
    sortedMappings,
    offerCodes,
    salesData,
    metaInsights: deduplicatedInsights,
    metaStructure: { campaigns, adsets, ads: [] },
    activeAccountIds,
    
    // Computed metrics
    aggregatedMetrics,
    summaryMetrics,
    metaMetrics,
    totalMetaInvestment,
    
    // Loading states
    isLoading,
    loadingSales,
    loadingInsights,
    
    // Actions
    refetchAll,
    refetchSales: queries[3].refetch,
    refetchInsights: queries[4].refetch,
  };
};

export type { OfferMapping, FunnelConfig, SaleRecord, MetaInsight, PositionMetrics };
