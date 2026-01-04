import { useMemo } from 'react';
import { format, eachDayOfInterval } from 'date-fns';

/**
 * Computes AI context payload from frontend data.
 * This allows the AI analysis to use the same metrics displayed in the dashboard,
 * avoiding slow database view queries.
 */

interface SaleRecord {
  id: string;
  offer_code?: string;
  total_price_brl?: number;
  sale_date?: string;
  transaction_status?: string;
  product_name?: string;
}

interface MetaInsight {
  campaign_id?: string;
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
  tipo_posicao?: string;
  ordem_posicao?: number;
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
}

export function computeFunnelAIContext(
  funnel: FunnelConfig,
  salesData: SaleRecord[],
  metaInsights: MetaInsight[],
  campaigns: Campaign[],
  offerMappings: OfferMapping[],
  startDate: Date,
  endDate: Date
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
  const totalRevenue = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
  const totalSales = funnelSales.length;

  // Count FRONT sales
  const frontOffers = funnelOffers.filter(o => 
    o.tipo_posicao === 'FRONT' || o.tipo_posicao === 'FE'
  );
  const frontOfferCodes = new Set(frontOffers.map(o => o.codigo_oferta));
  const frontSales = funnelSales.filter(s => frontOfferCodes.has(s.offer_code || '')).length;

  // Calculate metrics
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

  // Build daily metrics
  const dailyMap = new Map<string, { revenue: number; investment: number; sales: number }>();
  
  // Initialize all days in range
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  allDays.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    dailyMap.set(dateStr, { revenue: 0, investment: 0, sales: 0 });
  });

  // Aggregate sales by day
  funnelSales.forEach(s => {
    if (s.sale_date) {
      const dateStr = s.sale_date.split('T')[0];
      const existing = dailyMap.get(dateStr);
      if (existing) {
        existing.revenue += s.total_price_brl || 0;
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
  };
}

export function useFunnelAIContext(
  funnel: FunnelConfig | null,
  salesData: SaleRecord[] | undefined,
  metaInsights: MetaInsight[] | undefined,
  campaigns: Campaign[] | undefined,
  offerMappings: OfferMapping[] | undefined,
  startDate: Date,
  endDate: Date
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
      endDate
    );
  }, [funnel, salesData, metaInsights, campaigns, offerMappings, startDate, endDate]);
}
