/**
 * useFunnelData
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL FUNNEL DATA HOOK - ORDERS CORE + PAID MEDIA DOMAIN
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Sales data comes EXCLUSIVELY from funnel_orders_view (Orders Core).
 * Investment data comes from Paid Media Domain (provider-agnostic).
 * 
 * ARCHITECTURE:
 * - Paid Media metrics are fetched via src/domains/paid-media
 * - This decouples FunnelAnalysis from provider-specific code
 * - Supports future Google Ads / TikTok Ads integration
 * 
 * FILTER RULES:
 * - Date: economic_day (DATE type, São Paulo timezone)
 * - Status: handled by view (approved, completed)
 * 
 * FORBIDDEN:
 * ❌ hotmart_sales - MUST NOT be used in FunnelAnalysis
 * ❌ finance_tracking_view - DEPRECATED, replaced by funnel_orders_view
 * ❌ sales_core_events
 * ❌ sales_core_view
 * ❌ Direct meta_* table access for metrics (use Paid Media Domain)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useMetaHierarchy } from "./useMetaHierarchy";
import { PaidMediaDomain } from "@/domains/paid-media";

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

// ═══════════════════════════════════════════════════════════════════════════════
// ORDERS CORE: New canonical order record from funnel_orders_view
// ═══════════════════════════════════════════════════════════════════════════════
interface OrderRecord {
  order_id: string;
  transaction_id: string;
  project_id: string;
  funnel_id: string | null;
  funnel_name: string | null;
  customer_paid: number | null;
  producer_net: number | null;
  currency: string | null;
  order_items_count: number;
  main_product: string | null;
  main_offer_code: string | null;
  has_bump: boolean;
  has_upsell: boolean;
  has_downsell: boolean;
  buyer_email: string | null;
  buyer_name: string | null;
  status: string | null;
  created_at: string;
  ordered_at: string;
  economic_day: string | null;
  all_offer_codes: string[] | null;
  main_revenue: number;
  bump_revenue: number;
  upsell_revenue: number;
}

// Legacy interface for backward compatibility
interface SaleRecord {
  transaction_id: string;
  product_name: string | null;
  offer_code: string | null;
  gross_amount: number | null;
  net_amount: number | null;
  buyer_email: string | null;
  economic_day: string | null;
  purchase_date: string | null;
  hotmart_status: string | null;
  funnel_id: string | null;
  funnel_name: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_adset: string | null;
  utm_creative: string | null;
  utm_placement: string | null;
  payment_method: string | null;
  recurrence: number | null;
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
  actions?: any | null;
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORDERS CORE: Fetch from funnel_orders_view (replaces finance_tracking_view)
  // Status filter applied at application layer (same logic as Busca Rápida)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // CANONICAL STATUS FILTER: Same as Busca Rápida (useOrdersCore)
  // Includes 'partial_refund' to show orders with positive net value after partial refund
  const VALID_ORDER_STATUSES = ['approved', 'complete', 'partial_refund'];
  
  const ordersQuery = useQuery({
    queryKey: ['funnel-orders', projectId, startDateStr, endDateStr],
    queryFn: async () => {
      console.log(`[useFunnelData] Fetching orders from funnel_orders_view for ${startDateStr} to ${endDateStr}`);
      
      // Fetch ALL orders with pagination to bypass 1000 limit
      // Status filter applied here (view no longer has hardcoded WHERE)
      const PAGE_SIZE = 1000;
      let allData: OrderRecord[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('funnel_orders_view')
          .select(`
            order_id,
            transaction_id,
            project_id,
            funnel_id,
            funnel_name,
            customer_paid,
            producer_net,
            currency,
            order_items_count,
            main_product,
            main_offer_code,
            has_bump,
            has_upsell,
            has_downsell,
            buyer_email,
            buyer_name,
            status,
            created_at,
            ordered_at,
            economic_day,
            all_offer_codes,
            main_revenue,
            bump_revenue,
            upsell_revenue
          `)
          .eq('project_id', projectId!)
          .in('status', VALID_ORDER_STATUSES)
          .gte('economic_day', startDateStr)
          .lte('economic_day', endDateStr)
          .order('order_id', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) {
          console.error(`[useFunnelData] Error fetching orders page ${page}:`, error);
          throw error;
        }
        
        if (data && data.length > 0) {
          allData = [...allData, ...data as OrderRecord[]];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      const totalCustomerPaid = allData.reduce((s, o) => s + (o.customer_paid || 0), 0);
      const totalProducerNet = allData.reduce((s, o) => s + (o.producer_net || 0), 0);
      console.log(`[useFunnelData] Total orders from funnel_orders_view: ${allData.length}, customer_paid: R$${totalCustomerPaid.toFixed(2)}, producer_net: R$${totalProducerNet.toFixed(2)}`);
      return allData;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Get active account IDs first before building insights query
  const activeAccountIds = accountsQuery.data || [];

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAID MEDIA DOMAIN: Fetch metrics via provider-agnostic domain layer
  // This replaces direct meta_insights queries for aggregated metrics
  // ═══════════════════════════════════════════════════════════════════════════════
  const paidMediaMetricsQuery = useQuery({
    queryKey: ['paid-media-metrics', projectId, startDateStr, endDateStr, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) {
        console.log(`[useFunnelData] No active accounts, skipping paid media metrics fetch`);
        return { metrics: [], aggregated: { spend: 0, impressions: 0, clicks: 0, reach: 0 } };
      }
      
      console.log(`[useFunnelData] Fetching paid media metrics via domain for project=${projectId}, dates=${startDateStr} to ${endDateStr}`);
      
      try {
        const dateRange = { start: startDateStr, end: endDateStr };
        const dailyMetrics = await PaidMediaDomain.getAggregatedMetrics(projectId!, dateRange, activeAccountIds);
        
        // Aggregate totals from daily metrics
        const aggregated = dailyMetrics.reduce((acc, day) => ({
          spend: acc.spend + day.spend,
          impressions: acc.impressions + day.impressions,
          clicks: acc.clicks + day.clicks,
          reach: acc.reach + day.reach,
        }), { spend: 0, impressions: 0, clicks: 0, reach: 0 });
        
        console.log(`[useFunnelData] Paid Media Domain: ${dailyMetrics.length} days, total spend: ${aggregated.spend.toFixed(2)}`);
        
        return { metrics: dailyMetrics, aggregated };
      } catch (error) {
        console.error(`[useFunnelData] Error fetching paid media metrics from domain:`, error);
        throw error;
      }
    },
    enabled: enabled && activeAccountIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEGACY: Keep raw insights query for hierarchy and ad-level detail
  // This is still needed for useMetaHierarchy and detailed breakdowns
  // Will be migrated in a future phase
  // ═══════════════════════════════════════════════════════════════════════════════
  const insightsQuery = useQuery({
    queryKey: ['insights', projectId, startDateStr, endDateStr, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) {
        console.log(`[useFunnelData] No active accounts, skipping insights fetch`);
        return [];
      }
      
      console.log(`[useFunnelData] Fetching raw insights for hierarchy, project=${projectId}`);
      
      // Fetch ALL ad-level insights with pagination to handle any time period
      const PAGE_SIZE = 1000;
      let allData: MetaInsight[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('id, campaign_id, adset_id, ad_id, ad_account_id, spend, impressions, clicks, reach, ctr, cpc, cpm, actions, date_start, date_stop')
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
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }
      
      console.log(`[useFunnelData] Raw insights for hierarchy: ${allData.length} records`);
      return allData as MetaInsight[];
    },
    enabled: enabled && activeAccountIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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
  const ordersData = ordersQuery.data || [];
  const rawInsights = insightsQuery.data || [];

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADAPTER: Convert OrderRecord to SaleRecord for backward compatibility
  // This allows gradual migration without breaking existing components
  // ═══════════════════════════════════════════════════════════════════════════════
  const salesData: SaleRecord[] = useMemo(() => {
    return ordersData.map(order => ({
      transaction_id: order.transaction_id,
      product_name: order.main_product,
      offer_code: order.main_offer_code,
      gross_amount: order.customer_paid,
      net_amount: order.producer_net,
      buyer_email: order.buyer_email,
      economic_day: order.economic_day,
      purchase_date: order.ordered_at,
      hotmart_status: order.status?.toUpperCase() || 'APPROVED',
      funnel_id: order.funnel_id,
      funnel_name: order.funnel_name,
      // UTMs not available in orders yet - will be added later
      meta_campaign_id: null,
      meta_adset_id: null,
      meta_ad_id: null,
      utm_source: null,
      utm_campaign: null,
      utm_adset: null,
      utm_creative: null,
      utm_placement: null,
      payment_method: null,
      recurrence: 1, // Orders are always unique (no parcelas duplicated)
    }));
  }, [ordersData]);

  // Loading states
  const loadingSales = ordersQuery.isLoading;
  const loadingInsights = insightsQuery.isLoading || paidMediaMetricsQuery.isLoading;
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAID MEDIA DOMAIN: Use aggregated metrics from domain layer
  // Falls back to raw insights if domain fails
  // ═══════════════════════════════════════════════════════════════════════════════
  const paidMediaAggregated = paidMediaMetricsQuery.data?.aggregated;
  
  // Total investment from Paid Media Domain (provider-agnostic)
  const totalMetaInvestment = useMemo(() => {
    // Primary: Use Paid Media Domain aggregated metrics
    if (paidMediaAggregated) {
      return paidMediaAggregated.spend;
    }
    // Fallback: Calculate from raw insights (legacy behavior)
    return adLevelInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
  }, [paidMediaAggregated, adLevelInsights]);

  // Meta metrics from Paid Media Domain (derived metrics calculated here per contract)
  const metaMetrics = useMemo(() => {
    // Primary: Use Paid Media Domain
    if (paidMediaAggregated) {
      const { spend, impressions, clicks, reach } = paidMediaAggregated;
      return {
        spend,
        impressions,
        clicks,
        reach,
        // CTR and CPC are DERIVED at domain consumer level (not provider level)
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
      };
    }
    
    // Fallback: Calculate from raw insights (legacy behavior)
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
  }, [paidMediaAggregated, adLevelInsights]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORDERS CORE: New metrics calculation using order-level data
  // ═══════════════════════════════════════════════════════════════════════════════
  const aggregatedMetrics = useMemo((): PositionMetrics[] => {
    if (!ordersData.length) return [];

    // Build offer code revenue map from all_offer_codes in orders
    const salesByOffer: Record<string, { count: number; revenue: number }> = {};
    
    ordersData.forEach(order => {
      const offerCodes = order.all_offer_codes || [order.main_offer_code].filter(Boolean);
      
      // For each order, count 1 sale for the main offer code
      const mainCode = order.main_offer_code || 'SEM_CODIGO';
      if (!salesByOffer[mainCode]) salesByOffer[mainCode] = { count: 0, revenue: 0 };
      salesByOffer[mainCode].count += 1;
      salesByOffer[mainCode].revenue += order.main_revenue || 0;
      
      // Add bump revenue if has_bump or if bump_revenue > 0
      if (order.bump_revenue > 0) {
        // Find bump offer codes from all_offer_codes (exclude main)
        const bumpCodes = (order.all_offer_codes || []).filter(c => c !== mainCode);
        bumpCodes.forEach(code => {
          if (!salesByOffer[code]) salesByOffer[code] = { count: 0, revenue: 0 };
          salesByOffer[code].count += 1;
          // Distribute bump_revenue evenly (simplified)
          salesByOffer[code].revenue += order.bump_revenue / Math.max(bumpCodes.length, 1);
        });
      }
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
  }, [sortedMappings, ordersData]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // ORDERS CORE: Summary metrics using order-level aggregations
  // ═══════════════════════════════════════════════════════════════════════════════
  const summaryMetrics = useMemo(() => {
    // Count unique orders (not transactions/parcelas)
    const totalVendas = ordersData.length;
    
    // Total revenue = sum of customer_paid
    const totalReceita = ordersData.reduce((sum, o) => sum + (o.customer_paid || 0), 0);
    
    // Producer net
    const totalProducerNet = ordersData.reduce((sum, o) => sum + (o.producer_net || 0), 0);
    
    // Front-end sales (orders with main offer in FRONT position)
    const frontOfferCodes = new Set(
      sortedMappings
        .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
        .map(m => m.codigo_oferta)
    );
    const vendasFront = ordersData.filter(o => 
      frontOfferCodes.has(o.main_offer_code || '')
    ).length;
    
    // Unique customers
    const uniqueCustomers = new Set(ordersData.map(o => o.buyer_email).filter(Boolean)).size;
    
    // Ticket médio = customer_paid / orders
    const baseVendas = vendasFront > 0 ? vendasFront : totalVendas;
    const ticketMedio = baseVendas > 0 ? totalReceita / baseVendas : 0;
    
    // ROAS and CPA
    const avgRoasTarget = funnels.length 
      ? funnels.reduce((sum, f) => sum + (f.roas_target || 2), 0) / funnels.length 
      : 2;
    const cpaMaximo = ticketMedio / avgRoasTarget;
    const cpaReal = baseVendas > 0 ? totalMetaInvestment / baseVendas : 0;
    const roas = totalMetaInvestment > 0 ? totalReceita / totalMetaInvestment : 0;
    
    // Order composition rates
    const ordersWithBump = ordersData.filter(o => o.has_bump || o.bump_revenue > 0).length;
    const ordersWithUpsell = ordersData.filter(o => o.has_upsell || o.upsell_revenue > 0).length;
    const bumpRate = totalVendas > 0 ? (ordersWithBump / totalVendas) * 100 : 0;
    const upsellRate = totalVendas > 0 ? (ordersWithUpsell / totalVendas) * 100 : 0;

    return { 
      totalVendas, 
      totalReceita, 
      totalProducerNet,
      ticketMedio, 
      uniqueCustomers, 
      vendasFront,
      investimento: totalMetaInvestment,
      cpaMaximo,
      cpaReal,
      roas,
      roasTarget: avgRoasTarget,
      // New metrics from Orders Core
      bumpRate,
      upsellRate,
      ordersWithBump,
      ordersWithUpsell,
    };
  }, [ordersData, sortedMappings, totalMetaInvestment, funnels]);

  // Refetch functions
  const refetchAll = async () => {
    console.log(`[useFunnelData] Refetching all data...`);
    const results = await Promise.all([
      ordersQuery.refetch(),
      insightsQuery.refetch(),
      paidMediaMetricsQuery.refetch(),
    ]);
    console.log(`[useFunnelData] Refetch complete. Orders: ${results[0].data?.length || 0}, Insights: ${results[1].data?.length || 0}`);
  };

  return {
    funnels,
    mappings,
    sortedMappings,
    offerCodes,
    salesData, // Backward compatible - uses adapter from ordersData
    ordersData, // New: Raw orders from Orders Core
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
    refetchSales: ordersQuery.refetch,
    refetchInsights: insightsQuery.refetch,
  };
};

export type { OfferMapping, FunnelConfig, SaleRecord, MetaInsight, PositionMetrics, OrderRecord };
