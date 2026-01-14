import { useMemo } from 'react';
import { format, eachDayOfInterval } from 'date-fns';

/**
 * CANONICAL Funnel AI Context Hook
 * 
 * Computes COMPREHENSIVE AI context payload from frontend data.
 * 
 * IMPORTANT: This hook expects data from finance_tracking_view (canonical source).
 * All financial fields should use:
 * - gross_amount (NOT total_price_brl)
 * - net_amount (for net revenue)
 * - economic_day (for date filtering)
 * - purchase_date (for raw timestamp)
 */

// ============= Types =============

interface SaleRecord {
  transaction_id?: string;
  id?: string;
  offer_code?: string | null;
  // CANONICAL: Use gross_amount and net_amount from finance_tracking_view
  gross_amount?: number | null;
  net_amount?: number | null;
  // LEGACY support (will be removed)
  total_price_brl?: number;
  // CANONICAL: Use economic_day
  economic_day?: string | null;
  purchase_date?: string | null;
  // LEGACY support
  sale_date?: string;
  // Status
  hotmart_status?: string | null;
  transaction_status?: string;
  status?: string;
  // Other fields
  product_name?: string | null;
  buyer_email?: string | null;
  payment_method?: string | null;
  recurrence?: number | null;
  installment_number?: number;
}

interface MetaInsight {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  date_start?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
  actions?: any[];
}

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status?: string;
}

interface Adset {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  status?: string;
}

interface Ad {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  campaign_id: string;
  status?: string;
}

interface FunnelConfig {
  id: string;
  name: string;
  campaign_name_pattern?: string;
  roas_target?: number;
}

interface OfferMapping {
  id: string;
  funnel_id?: string;
  id_funil?: string;
  codigo_oferta: string;
  nome_produto: string;
  nome_oferta?: string;
  tipo_posicao?: string;
  ordem_posicao?: number;
  valor?: number;
}

// ============= Output Types =============

export interface PositionBreakdown {
  tipo: string;
  ordem: number;
  vendas: number;
  receita: number;
  taxaConversao: number;
  produtos: Array<{
    nome_produto: string;
    nome_oferta?: string;
    codigo_oferta: string;
    vendas: number;
    receita: number;
  }>;
}

export interface CreativeMetrics {
  id: string;
  name: string;
  type: 'campaign' | 'adset' | 'ad';
  spend: number;
  impressions: number;
  clicks: number;
  revenue: number;
  sales: number;
  roas: number;
  cpc: number;
  ctr: number;
  status?: string;
}

export interface PaymentMetrics {
  method: string;
  sales: number;
  revenue: number;
  percentage: number;
  avg_ticket: number;
  avg_installments?: number;
}

export interface LTVMetrics {
  total_customers: number;
  avg_ltv: number;
  repeat_rate: number;
  avg_purchases_per_customer: number;
  top_20_contribution: number;
}

export interface ConversionFunnel {
  link_clicks: number;
  landing_page_views: number;
  connect_rate: number;
  initiate_checkouts: number;
  tx_pagina_checkout: number;
  purchases: number;
  tx_checkout_compra: number;
}

export interface AIContextSummary {
  total_revenue: number;
  total_investment: number;
  total_sales: number;
  front_sales: number;
  roas: number;
  health_status: 'excellent' | 'good' | 'attention' | 'danger' | 'no-return' | 'inactive';
  ticket_medio: number;
  cpa_real: number;
  cpa_maximo: number;
  campaign_pattern_used: string | null;
  funnel_name: string;
  roas_target: number;
}

export interface AIContextDaily {
  date: string;
  revenue: number;
  investment: number;
  sales: number;
}

export interface FunnelAIContext {
  client_summary: AIContextSummary;
  client_daily: AIContextDaily[];
  position_breakdown: PositionBreakdown[];
  top_campaigns: CreativeMetrics[];
  top_adsets: CreativeMetrics[];
  top_ads: CreativeMetrics[];
  payment_distribution: PaymentMetrics[];
  ltv_metrics: LTVMetrics;
  conversion_funnel: ConversionFunnel;
}

// ============= Helper Functions =============

const getActionValue = (actions: any[] | null, actionType: string): number => {
  if (!actions || !Array.isArray(actions)) return 0;
  const action = actions.find((a: any) => a.action_type === actionType);
  return action ? parseInt(action.value || '0', 10) : 0;
};

/**
 * Get revenue from sale record using CANONICAL fields
 * Falls back to legacy fields for backwards compatibility
 */
const getSaleRevenue = (sale: SaleRecord): number => {
  // CANONICAL: Use gross_amount from finance_tracking_view
  if (sale.gross_amount !== undefined && sale.gross_amount !== null) {
    return sale.gross_amount;
  }
  // LEGACY fallback (will be removed)
  return sale.total_price_brl || 0;
};

/**
 * Get sale date from record using CANONICAL fields
 */
const getSaleDate = (sale: SaleRecord): string | null => {
  // CANONICAL: Use economic_day from finance_tracking_view
  if (sale.economic_day) {
    return sale.economic_day;
  }
  // LEGACY fallback
  if (sale.purchase_date) {
    return sale.purchase_date.split('T')[0];
  }
  if (sale.sale_date) {
    return sale.sale_date.split('T')[0];
  }
  return null;
};

function computeLTVMetrics(sales: SaleRecord[]): LTVMetrics {
  if (sales.length === 0) {
    return {
      total_customers: 0,
      avg_ltv: 0,
      repeat_rate: 0,
      avg_purchases_per_customer: 0,
      top_20_contribution: 0,
    };
  }

  // Group by customer email
  const customerData = new Map<string, { totalSpent: number; purchases: number }>();
  
  sales.forEach(sale => {
    const email = sale.buyer_email || 'unknown';
    const existing = customerData.get(email) || { totalSpent: 0, purchases: 0 };
    existing.totalSpent += getSaleRevenue(sale);
    existing.purchases += 1;
    customerData.set(email, existing);
  });

  const customers = Array.from(customerData.values());
  const totalCustomers = customers.length;
  
  if (totalCustomers === 0) {
    return {
      total_customers: 0,
      avg_ltv: 0,
      repeat_rate: 0,
      avg_purchases_per_customer: 0,
      top_20_contribution: 0,
    };
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgLTV = totalRevenue / totalCustomers;
  
  const repeatCustomers = customers.filter(c => c.purchases > 1).length;
  const repeatRate = (repeatCustomers / totalCustomers) * 100;
  
  const totalPurchases = customers.reduce((sum, c) => sum + c.purchases, 0);
  const avgPurchasesPerCustomer = totalPurchases / totalCustomers;
  
  // Top 20% contribution
  const sortedByValue = [...customers].sort((a, b) => b.totalSpent - a.totalSpent);
  const top20Count = Math.max(1, Math.ceil(totalCustomers * 0.2));
  const top20Revenue = sortedByValue.slice(0, top20Count).reduce((sum, c) => sum + c.totalSpent, 0);
  const top20Contribution = totalRevenue > 0 ? (top20Revenue / totalRevenue) * 100 : 0;

  return {
    total_customers: totalCustomers,
    avg_ltv: avgLTV,
    repeat_rate: repeatRate,
    avg_purchases_per_customer: avgPurchasesPerCustomer,
    top_20_contribution: top20Contribution,
  };
}

function computePaymentDistribution(sales: SaleRecord[]): PaymentMetrics[] {
  if (sales.length === 0) return [];

  const byMethod = new Map<string, { sales: number; revenue: number; installments: number[] }>();
  
  sales.forEach(sale => {
    const method = sale.payment_method || 'UNKNOWN';
    const existing = byMethod.get(method) || { sales: 0, revenue: 0, installments: [] };
    existing.sales += 1;
    existing.revenue += getSaleRevenue(sale);
    // Use recurrence from finance_tracking_view or fallback to installment_number
    const installment = sale.recurrence || sale.installment_number;
    if (installment) {
      existing.installments.push(installment);
    }
    byMethod.set(method, existing);
  });

  const totalSales = sales.length;
  
  return Array.from(byMethod.entries())
    .map(([method, data]) => ({
      method,
      sales: data.sales,
      revenue: data.revenue,
      percentage: totalSales > 0 ? (data.sales / totalSales) * 100 : 0,
      avg_ticket: data.sales > 0 ? data.revenue / data.sales : 0,
      avg_installments: data.installments.length > 0 
        ? data.installments.reduce((a, b) => a + b, 0) / data.installments.length 
        : undefined,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ============= Main Compute Function =============

export function computeFunnelAIContext(
  funnel: FunnelConfig,
  salesData: SaleRecord[],
  metaInsights: MetaInsight[],
  campaigns: Campaign[],
  offerMappings: OfferMapping[],
  startDate: Date,
  endDate: Date,
  adsets?: Adset[],
  ads?: Ad[]
): FunnelAIContext {
  const pattern = funnel.campaign_name_pattern?.toLowerCase() || null;
  const roasTarget = funnel.roas_target || 2.5;

  // Find campaigns matching the pattern
  const matchingCampaigns = pattern
    ? campaigns.filter(c => {
        const name = c.campaign_name?.toLowerCase() || '';
        return name.includes(pattern);
      })
    : [];
  const matchingCampaignIds = new Set(matchingCampaigns.map(c => String(c.campaign_id)));

  // Filter insights by matching campaigns
  const matchingInsights = metaInsights.filter(i => {
    const campaignId = String(i.campaign_id || '');
    return matchingCampaignIds.has(campaignId);
  });

  // Deduplicate investment by ad_id + date
  const uniqueSpend = new Map<string, number>();
  matchingInsights.forEach(i => {
    if (i.spend && i.ad_id) {
      const key = `${i.ad_id}_${i.date_start}`;
      if (!uniqueSpend.has(key)) {
        uniqueSpend.set(key, i.spend);
      }
    }
  });
  const totalInvestment = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);

  // Get offer codes for this funnel
  const funnelOffers = offerMappings.filter(o => {
    if (o.funnel_id) return o.funnel_id === funnel.id;
    return o.id_funil === funnel.name;
  });
  const offerCodes = new Set(funnelOffers.map(o => o.codigo_oferta));

  // Filter sales by funnel offers
  const funnelSales = salesData.filter(s => offerCodes.has(s.offer_code || ''));
  
  // CANONICAL: Use gross_amount for revenue
  const totalRevenue = funnelSales.reduce((sum, s) => sum + getSaleRevenue(s), 0);
  const totalSales = funnelSales.length;

  // ============= Position Breakdown =============
  const frontOffers = funnelOffers.filter(o => 
    o.tipo_posicao === 'FRONT' || o.tipo_posicao === 'FE'
  );
  const frontOfferCodes = new Set(frontOffers.map(o => o.codigo_oferta));
  const frontSales = funnelSales.filter(s => frontOfferCodes.has(s.offer_code || '')).length;

  // Build position breakdown
  const positionDetails: Record<string, { vendas: number; receita: number; ordem: number; produtos: Array<{ nome_produto: string; nome_oferta?: string; codigo_oferta: string; vendas: number; receita: number }> }> = {};
  
  funnelOffers.forEach(offer => {
    const pos = offer.tipo_posicao || 'OTHER';
    const ordem = offer.ordem_posicao || 0;
    const posKey = `${pos}${ordem || ''}`;
    const offerSales = funnelSales.filter(s => s.offer_code === offer.codigo_oferta);
    const salesCount = offerSales.length;
    const salesRevenue = offerSales.reduce((sum, s) => sum + getSaleRevenue(s), 0);
    
    if (!positionDetails[posKey]) {
      positionDetails[posKey] = { vendas: 0, receita: 0, ordem, produtos: [] };
    }
    positionDetails[posKey].vendas += salesCount;
    positionDetails[posKey].receita += salesRevenue;
    positionDetails[posKey].produtos.push({
      nome_produto: offer.nome_produto,
      nome_oferta: offer.nome_oferta,
      codigo_oferta: offer.codigo_oferta,
      vendas: salesCount,
      receita: salesRevenue
    });
  });

  const positionBreakdown: PositionBreakdown[] = Object.entries(positionDetails)
    .map(([key, details]) => {
      const tipo = key.replace(/[0-9]/g, '');
      const taxaConversao = frontSales > 0 ? (details.vendas / frontSales) * 100 : 0;
      return {
        tipo,
        ordem: details.ordem,
        vendas: details.vendas,
        receita: details.receita,
        taxaConversao: tipo === 'FRONT' || tipo === 'FE' ? 100 : taxaConversao,
        produtos: details.produtos,
      };
    })
    .sort((a, b) => {
      const order = ['FRONT', 'FE', 'OB', 'US', 'DS'];
      const aIdx = order.indexOf(a.tipo);
      const bIdx = order.indexOf(b.tipo);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.ordem - b.ordem;
    });

  // ============= Conversion Funnel (Meta Actions) =============
  const actionMetrics = new Map<string, { linkClicks: number; landingPageViews: number; initiateCheckouts: number; purchases: number }>();
  matchingInsights.forEach(i => {
    if (i.ad_id) {
      const key = `${i.ad_id}_${i.date_start}`;
      if (!actionMetrics.has(key)) {
        actionMetrics.set(key, {
          linkClicks: getActionValue(i.actions, 'link_click'),
          landingPageViews: getActionValue(i.actions, 'landing_page_view') || getActionValue(i.actions, 'omni_landing_page_view'),
          initiateCheckouts: getActionValue(i.actions, 'initiate_checkout') || getActionValue(i.actions, 'omni_initiated_checkout'),
          purchases: getActionValue(i.actions, 'purchase') || getActionValue(i.actions, 'omni_purchase'),
        });
      }
    }
  });
  
  const linkClicks = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.linkClicks, 0);
  const landingPageViews = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.landingPageViews, 0);
  const initiateCheckouts = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.initiateCheckouts, 0);
  const metaPurchases = Array.from(actionMetrics.values()).reduce((sum, m) => sum + m.purchases, 0);
  
  const connectRate = linkClicks > 0 ? (landingPageViews / linkClicks) * 100 : 0;
  const txPaginaCheckout = landingPageViews > 0 ? (initiateCheckouts / landingPageViews) * 100 : 0;
  const txCheckoutCompra = initiateCheckouts > 0 ? (metaPurchases / initiateCheckouts) * 100 : 0;

  const conversionFunnel: ConversionFunnel = {
    link_clicks: linkClicks,
    landing_page_views: landingPageViews,
    connect_rate: connectRate,
    initiate_checkouts: initiateCheckouts,
    tx_pagina_checkout: txPaginaCheckout,
    purchases: metaPurchases,
    tx_checkout_compra: txCheckoutCompra,
  };

  // ============= Top Campaigns/Adsets/Ads =============
  
  // Aggregate by campaign
  const campaignMetrics = new Map<string, { spend: number; impressions: number; clicks: number; revenue: number; sales: number }>();
  matchingInsights.forEach(i => {
    if (i.campaign_id) {
      const key = String(i.campaign_id);
      const existing = campaignMetrics.get(key) || { spend: 0, impressions: 0, clicks: 0, revenue: 0, sales: 0 };
      existing.spend += i.spend || 0;
      existing.impressions += i.impressions || 0;
      existing.clicks += i.clicks || 0;
      campaignMetrics.set(key, existing);
    }
  });

  const totalCampaignSpend = Array.from(campaignMetrics.values()).reduce((sum, c) => sum + c.spend, 0);
  
  const topCampaigns: CreativeMetrics[] = Array.from(campaignMetrics.entries())
    .map(([campaignId, metrics]) => {
      const campaign = campaigns.find(c => String(c.campaign_id) === campaignId);
      const revenueShare = totalCampaignSpend > 0 ? metrics.spend / totalCampaignSpend : 0;
      const estimatedRevenue = totalRevenue * revenueShare;
      const estimatedSales = Math.round(frontSales * revenueShare);
      return {
        id: campaignId,
        name: campaign?.campaign_name || `Campanha ${campaignId}`,
        type: 'campaign' as const,
        spend: metrics.spend,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        revenue: estimatedRevenue,
        sales: estimatedSales,
        roas: metrics.spend > 0 ? estimatedRevenue / metrics.spend : 0,
        cpc: metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0,
        ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
        status: campaign?.status,
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  // Aggregate by adset
  const adsetMetrics = new Map<string, { spend: number; impressions: number; clicks: number }>();
  matchingInsights.forEach(i => {
    if (i.adset_id) {
      const key = String(i.adset_id);
      const existing = adsetMetrics.get(key) || { spend: 0, impressions: 0, clicks: 0 };
      existing.spend += i.spend || 0;
      existing.impressions += i.impressions || 0;
      existing.clicks += i.clicks || 0;
      adsetMetrics.set(key, existing);
    }
  });

  const topAdsets: CreativeMetrics[] = Array.from(adsetMetrics.entries())
    .map(([adsetId, metrics]) => {
      const adset = adsets?.find(a => String(a.adset_id) === adsetId);
      const revenueShare = totalCampaignSpend > 0 ? metrics.spend / totalCampaignSpend : 0;
      const estimatedRevenue = totalRevenue * revenueShare;
      const estimatedSales = Math.round(frontSales * revenueShare);
      return {
        id: adsetId,
        name: adset?.adset_name || `Conjunto ${adsetId}`,
        type: 'adset' as const,
        spend: metrics.spend,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        revenue: estimatedRevenue,
        sales: estimatedSales,
        roas: metrics.spend > 0 ? estimatedRevenue / metrics.spend : 0,
        cpc: metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0,
        ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
        status: adset?.status,
      };
    })
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 10);

  // Aggregate by ad
  const adMetrics = new Map<string, { spend: number; impressions: number; clicks: number }>();
  matchingInsights.forEach(i => {
    if (i.ad_id) {
      const key = String(i.ad_id);
      const existing = adMetrics.get(key) || { spend: 0, impressions: 0, clicks: 0 };
      existing.spend += i.spend || 0;
      existing.impressions += i.impressions || 0;
      existing.clicks += i.clicks || 0;
      adMetrics.set(key, existing);
    }
  });

  const topAds: CreativeMetrics[] = Array.from(adMetrics.entries())
    .map(([adId, metrics]) => {
      const ad = ads?.find(a => String(a.ad_id) === adId);
      const revenueShare = totalCampaignSpend > 0 ? metrics.spend / totalCampaignSpend : 0;
      const estimatedRevenue = totalRevenue * revenueShare;
      const estimatedSales = Math.round(frontSales * revenueShare);
      return {
        id: adId,
        name: ad?.ad_name || `Criativo ${adId}`,
        type: 'ad' as const,
        spend: metrics.spend,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        revenue: estimatedRevenue,
        sales: estimatedSales,
        roas: metrics.spend > 0 ? estimatedRevenue / metrics.spend : 0,
        cpc: metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0,
        ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
        status: ad?.status,
      };
    })
    .sort((a, b) => b.roas - a.roas) // Sort by ROAS for top performers
    .slice(0, 15);

  // ============= Payment & LTV =============
  const paymentDistribution = computePaymentDistribution(funnelSales);
  const ltvMetrics = computeLTVMetrics(funnelSales);

  // ============= Calculate Summary Metrics =============
  const ticketMedio = frontSales > 0 ? totalRevenue / frontSales : 0;
  const cpaMaximo = ticketMedio / roasTarget;
  const cpaReal = frontSales > 0 ? totalInvestment / frontSales : 0;
  const roas = totalInvestment > 0 ? totalRevenue / totalInvestment : 0;

  // Determine status
  let healthStatus: AIContextSummary['health_status'] = 'good';
  if (totalInvestment === 0 && totalRevenue === 0) {
    healthStatus = 'inactive';
  } else if (totalInvestment > 0 && totalRevenue === 0) {
    healthStatus = 'no-return';
  } else if (cpaReal > 0 && cpaMaximo > 0) {
    if (cpaReal <= cpaMaximo * 0.8) {
      healthStatus = 'excellent';
    } else if (cpaReal <= cpaMaximo) {
      healthStatus = 'good';
    } else if (cpaReal <= cpaMaximo * 1.2) {
      healthStatus = 'attention';
    } else {
      healthStatus = 'danger';
    }
  }

  // ============= Daily Metrics =============
  const dailyMap = new Map<string, { revenue: number; investment: number; sales: number }>();
  
  // Initialize all days in range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  allDays.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    dailyMap.set(dateStr, { revenue: 0, investment: 0, sales: 0 });
  });

  // Aggregate sales by day using CANONICAL field (economic_day)
  funnelSales.forEach(s => {
    const dateStr = getSaleDate(s);
    if (dateStr) {
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.revenue += getSaleRevenue(s);
        existing.sales += 1;
      }
    }
  });

  // Aggregate investment by day (deduplicated)
  const dailySpendMap = new Map<string, Map<string, number>>();
  matchingInsights.forEach(i => {
    if (i.spend && i.ad_id && i.date_start) {
      const dateStr = i.date_start;
      if (!dailySpendMap.has(dateStr)) {
        dailySpendMap.set(dateStr, new Map());
      }
      const adMap = dailySpendMap.get(dateStr)!;
      if (!adMap.has(i.ad_id)) {
        adMap.set(i.ad_id, i.spend);
      }
    }
  });
  dailySpendMap.forEach((adMap, dateStr) => {
    const existing = dailyMap.get(dateStr);
    if (existing) {
      existing.investment = Array.from(adMap.values()).reduce((sum, s) => sum + s, 0);
    }
  });

  const clientDaily = Array.from(dailyMap.entries())
    .map(([date, data]) => ({
      date,
      revenue: data.revenue,
      investment: data.investment,
      sales: data.sales,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

  return {
    client_summary: {
      total_revenue: totalRevenue,
      total_investment: totalInvestment,
      total_sales: totalSales,
      front_sales: frontSales,
      roas,
      health_status: healthStatus,
      ticket_medio: ticketMedio,
      cpa_real: cpaReal,
      cpa_maximo: cpaMaximo,
      campaign_pattern_used: pattern,
      funnel_name: funnel.name,
      roas_target: roasTarget,
    },
    client_daily: clientDaily,
    position_breakdown: positionBreakdown,
    top_campaigns: topCampaigns,
    top_adsets: topAdsets,
    top_ads: topAds,
    payment_distribution: paymentDistribution,
    ltv_metrics: ltvMetrics,
    conversion_funnel: conversionFunnel,
  };
}

export function useFunnelAIContext(
  funnel: FunnelConfig | null,
  salesData: SaleRecord[] | undefined,
  metaInsights: MetaInsight[] | undefined,
  campaigns: Campaign[] | undefined,
  offerMappings: OfferMapping[] | undefined,
  startDate: Date,
  endDate: Date,
  adsets?: any[],
  ads?: any[]
): FunnelAIContext | null {
  return useMemo(() => {
    if (!funnel || !salesData || !metaInsights || !campaigns || !offerMappings) {
      return null;
    }
    return computeFunnelAIContext(
      funnel,
      salesData,
      metaInsights,
      campaigns,
      offerMappings,
      startDate,
      endDate,
      adsets,
      ads
    );
  }, [funnel, salesData, metaInsights, campaigns, offerMappings, startDate, endDate, adsets, ads]);
}
