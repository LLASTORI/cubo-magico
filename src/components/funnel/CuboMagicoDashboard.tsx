import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarIcon, RefreshCw, TrendingUp, TrendingDown, Target, 
  DollarSign, ShoppingCart, Users, AlertTriangle, CheckCircle2, XCircle,
  ChevronDown, ChevronRight, Percent, ArrowRight, Megaphone, LineChart, 
  GitCompare, Tag, CreditCard, UsersRound, Coins, History
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Import analysis components
import TemporalChart from '@/components/funnel/TemporalChart';
import PeriodComparison from '@/components/funnel/PeriodComparison';
import UTMAnalysis from '@/components/funnel/UTMAnalysis';
import PaymentMethodAnalysis from '@/components/funnel/PaymentMethodAnalysis';
import LTVAnalysis from '@/components/funnel/LTVAnalysis';
import FunnelChangelog from '@/components/funnel/FunnelChangelog';
import { MetaHierarchyAnalysis } from '@/components/meta/MetaHierarchyAnalysis';

// Define unified sales type that matches FunnelAnalysis query
interface UnifiedSale {
  transaction_id: string;
  product_name: string;
  offer_code: string | null;
  total_price_brl: number | null;
  buyer_email: string | null;
  sale_date: string | null;
  status: string;
  meta_campaign_id_extracted?: string | null;
  meta_adset_id_extracted?: string | null;
  meta_ad_id_extracted?: string | null;
  utm_source?: string | null;
  payment_method?: string | null;
  installment_number?: number | null;
}

interface CuboMagicoDashboardProps {
  projectId: string;
  externalStartDate?: Date;
  externalEndDate?: Date;
  embedded?: boolean;
  onFunnelSelect?: (funnelId: string) => void;
  // Accept pre-fetched sales data from parent to avoid duplicate queries
  salesData?: UnifiedSale[];
}

interface FunnelWithConfig {
  id: string;
  name: string;
  roas_target: number | null;
  campaign_name_pattern: string | null;
}

interface FunnelMetrics {
  funnel: FunnelWithConfig;
  investimento: number;
  faturamento: number;
  vendasFront: number;
  totalProdutos: number;
  ticketMedio: number;
  cpaMaximo: number;
  cpaReal: number;
  roas: number;
  status: 'excellent' | 'good' | 'warning' | 'danger';
  productsByPosition: Record<string, number>;
  // Detailed breakdown by position
  positionBreakdown: Array<{
    tipo: string;
    ordem: number;
    vendas: number;
    receita: number;
    taxaConversao: number;
  }>;
}

export function CuboMagicoDashboard({ 
  projectId, 
  externalStartDate, 
  externalEndDate, 
  embedded = false,
  onFunnelSelect,
  salesData: externalSalesData
}: CuboMagicoDashboardProps) {
  const [internalStartDate, setInternalStartDate] = useState<Date>(subDays(new Date(), 7));
  const [internalEndDate, setInternalEndDate] = useState<Date>(new Date());
  const [expandedFunnelId, setExpandedFunnelId] = useState<string | null>(null);
  
  // Use external dates if provided, otherwise use internal state
  const startDate = externalStartDate || internalStartDate;
  const endDate = externalEndDate || internalEndDate;
  const setStartDate = externalStartDate ? () => {} : setInternalStartDate;
  const setEndDate = externalEndDate ? () => {} : setInternalEndDate;

  // Convert dates to strings for consistent query keys
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Fetch funnels with config - show ALL funnels
  const { data: funnels, isLoading: loadingFunnels } = useQuery({
    queryKey: ['funnels-with-config', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name, roas_target, campaign_name_pattern')
        .eq('project_id', projectId);
      
      if (error) throw error;
      console.log(`[CuboMagico] Funnels loaded: ${data?.length || 0}`);
      return (data as FunnelWithConfig[]) || [];
    },
    enabled: !!projectId,
  });

  // Fetch offer mappings - use unified query key
  const { data: offerMappings } = useQuery({
    queryKey: ['offer-mappings-unified', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('id_funil, funnel_id, codigo_oferta, tipo_posicao, nome_posicao, valor, ordem_posicao')
        .eq('project_id', projectId)
        .eq('status', 'Ativo');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Use external sales data if provided, otherwise fetch from cache
  // This avoids duplicate queries - FunnelAnalysis.tsx fetches all sales with full fields
  // and passes them down to this component
  const salesData = externalSalesData || [];
  // Fetch Meta campaigns - use unified query key
  const { data: campaignsData } = useQuery({
    queryKey: ['meta-campaigns-unified', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, campaign_name, status')
        .eq('project_id', projectId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch Meta adsets - filter by project_id
  const { data: adsetsData } = useQuery({
    queryKey: ['meta-adsets-cubo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_adsets')
        .select('adset_id, adset_name, campaign_id, status')
        .eq('project_id', projectId);
      
      if (error) throw error;
      console.log(`[CuboMagico] Adsets loaded: ${data?.length || 0}`);
      return data || [];
    },
    enabled: !!projectId,
  });

  // Fetch active Meta ad accounts FIRST (needed for insights queries)
  const { data: metaAdAccounts } = useQuery({
    queryKey: ['meta-ad-accounts-cubo', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', projectId)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get active account IDs for consistent filtering
  const activeAccountIds = useMemo(() => {
    if (!metaAdAccounts || metaAdAccounts.length === 0) return [];
    return metaAdAccounts.map(a => a.account_id).sort();
  }, [metaAdAccounts]);

  // Fetch Meta insights - ALL ad-level for accurate spend calculations with pagination
  const { data: insightsData, refetch: refetchInsights, isRefetching } = useQuery({
    queryKey: ['meta-insights-cubo', projectId, startDateStr, endDateStr, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      // Fetch ALL ad-level insights with pagination to handle any time period
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('meta_insights')
          .select('campaign_id, ad_account_id, spend, date_start, date_stop, adset_id, ad_id, impressions, clicks, reach, ctr, cpc, cpm')
          .eq('project_id', projectId)
          .in('ad_account_id', activeAccountIds)
          .not('ad_id', 'is', null)
          .gte('date_start', startDateStr)
          .lte('date_start', endDateStr)
          .order('date_start', { ascending: true })
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
      
      console.log(`[CuboMagico] Ad-level insights loaded: ${allData.length}, total spend: R$${allData.reduce((s: number, i: any) => s + (i.spend || 0), 0).toFixed(2)}`);
      return allData;
    },
    enabled: !!projectId && activeAccountIds.length > 0,
  });

  // Extract unique ad_ids from insights for efficient lookup
  const insightAdIdsCubo = useMemo(() => {
    if (!insightsData) return [];
    return [...new Set(insightsData.filter(i => i.ad_id).map(i => i.ad_id))];
  }, [insightsData]);

  // Fetch Meta ads - only the ones that appear in insights
  const { data: adsData } = useQuery({
    queryKey: ['meta-ads-cubo', projectId, insightAdIdsCubo.length],
    queryFn: async () => {
      if (insightAdIdsCubo.length === 0) return [];
      const allAds: any[] = [];
      const batchSize = 100;
      for (let i = 0; i < insightAdIdsCubo.length; i += batchSize) {
        const batch = insightAdIdsCubo.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('meta_ads')
          .select('ad_id, ad_name, adset_id, campaign_id, status')
          .eq('project_id', projectId)
          .in('ad_id', batch);
        if (error) throw error;
        if (data) allAds.push(...data);
      }
      console.log(`[CuboMagico] Ads loaded: ${allAds.length}`);
      return allAds;
    },
    enabled: !!projectId && insightAdIdsCubo.length > 0,
  });

  // Calculate metrics for each funnel
  const funnelMetrics = useMemo((): FunnelMetrics[] => {
    if (!funnels || !offerMappings || !salesData || !campaignsData || !insightsData) {
      return [];
    }

    return funnels.map(funnel => {
      const pattern = funnel.campaign_name_pattern?.toLowerCase() || '';
      const roasTarget = funnel.roas_target || 2;

      // Find campaigns matching the pattern (Padrão do Nome da Campanha)
      const matchingCampaigns = pattern 
        ? campaignsData.filter(c => c.campaign_name?.toLowerCase().includes(pattern))
        : [];
      const matchingCampaignIds = new Set(matchingCampaigns.map(c => c.campaign_id));

      // Calculate total spend from ad-level insights (aggregate by ad_id + date)
      const matchingInsights = insightsData.filter(i => matchingCampaignIds.has(i.campaign_id || ''));
      
      // Deduplicate by ad_id + date to avoid double counting
      const uniqueSpend = new Map<string, number>();
      matchingInsights.forEach(i => {
        if (i.spend && i.ad_id) {
          const key = `${i.ad_id}_${i.date_start}`;
          if (!uniqueSpend.has(key)) {
            uniqueSpend.set(key, i.spend);
          }
        }
      });
      const investimento = Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
      
      // Debug log for funnel matching
      if (pattern) {
        console.log(`[CuboMagico] Funnel "${funnel.name}" pattern="${pattern}": ${matchingCampaigns.length} campaigns, ${matchingInsights.length} insights, R$${investimento.toFixed(2)}`);
      }

      // Get offer codes for this funnel - check both funnel_id (FK) and id_funil (legacy name)
      const funnelOffers = offerMappings.filter(o => 
        o.funnel_id === funnel.id || o.id_funil === funnel.name
      );
      const offerCodes = new Set(funnelOffers.map(o => o.codigo_oferta));

      // Calculate sales metrics
      const funnelSales = salesData.filter(s => offerCodes.has(s.offer_code));
      const faturamento = funnelSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
      
      // Count unique customers
      const uniqueCustomers = new Set(funnelSales.map(s => s.buyer_email)).size;
      
      // Count products by position
      const productsByPosition: Record<string, number> = {};
      const positionDetails: Record<string, { vendas: number; receita: number; ordem: number }> = {};
      
      funnelOffers.forEach(offer => {
        const pos = offer.tipo_posicao || 'OTHER';
        const ordem = offer.ordem_posicao || 0;
        const posKey = `${pos}${ordem || ''}`;
        const offerSales = funnelSales.filter(s => s.offer_code === offer.codigo_oferta);
        const salesCount = offerSales.length;
        const salesRevenue = offerSales.reduce((sum, s) => sum + (s.total_price_brl || 0), 0);
        
        productsByPosition[pos] = (productsByPosition[pos] || 0) + salesCount;
        
        if (!positionDetails[posKey]) {
          positionDetails[posKey] = { vendas: 0, receita: 0, ordem };
        }
        positionDetails[posKey].vendas += salesCount;
        positionDetails[posKey].receita += salesRevenue;
      });

      // FRONT sales count
      const vendasFront = productsByPosition['FRONT'] || productsByPosition['FE'] || 0;
      const totalProdutos = Object.values(productsByPosition).reduce((sum, v) => sum + v, 0);

      // Calculate ticket médio = Faturamento Total / Vendas FRONT
      const ticketMedio = vendasFront > 0 ? faturamento / vendasFront : 0;

      // CPA máximo aceitável = Ticket médio / ROAS alvo
      const cpaMaximo = ticketMedio / roasTarget;

      // CPA real = Investimento / Vendas FRONT
      const cpaReal = vendasFront > 0 ? investimento / vendasFront : 0;

      // ROAS real
      const roas = investimento > 0 ? faturamento / investimento : 0;

      // Status based on CPA comparison
      let status: 'excellent' | 'good' | 'warning' | 'danger' = 'good';
      if (cpaReal === 0 || investimento === 0) {
        status = 'good';
      } else if (cpaReal <= cpaMaximo * 0.8) {
        status = 'excellent';
      } else if (cpaReal <= cpaMaximo) {
        status = 'good';
      } else if (cpaReal <= cpaMaximo * 1.2) {
        status = 'warning';
      } else {
        status = 'danger';
      }

      // Build position breakdown for drill-down
      const positionBreakdown = Object.entries(positionDetails)
        .map(([key, details]) => {
          const tipo = key.replace(/[0-9]/g, '');
          const taxaConversao = vendasFront > 0 ? (details.vendas / vendasFront) * 100 : 0;
          return {
            tipo,
            ordem: details.ordem,
            vendas: details.vendas,
            receita: details.receita,
            taxaConversao,
          };
        })
        .sort((a, b) => {
          const order = ['FRONT', 'FE', 'OB', 'US', 'DS'];
          const aIdx = order.indexOf(a.tipo);
          const bIdx = order.indexOf(b.tipo);
          if (aIdx !== bIdx) return aIdx - bIdx;
          return a.ordem - b.ordem;
        });

      return {
        funnel,
        investimento,
        faturamento,
        vendasFront,
        totalProdutos,
        ticketMedio,
        cpaMaximo,
        cpaReal,
        roas,
        status,
        productsByPosition,
        positionBreakdown,
      };
    });
  }, [funnels, offerMappings, salesData, campaignsData, insightsData]);

  // Total investment from ALL ad-level insights (the real total)
  const totalInvestmentAll = useMemo(() => {
    if (!insightsData) return 0;
    // Deduplicate by ad_id + date to avoid double counting
    const uniqueSpend = new Map<string, number>();
    insightsData.forEach(i => {
      if (i.spend && i.ad_id) {
        const key = `${i.ad_id}_${i.date_start}`;
        if (!uniqueSpend.has(key)) {
          uniqueSpend.set(key, i.spend);
        }
      }
    });
    return Array.from(uniqueSpend.values()).reduce((sum, s) => sum + s, 0);
  }, [insightsData]);

  // Totals from funnels with campaign patterns (attributed)
  const totals = useMemo(() => {
    const attributed = funnelMetrics.reduce((acc, m) => ({
      investimento: acc.investimento + m.investimento,
      faturamento: acc.faturamento + m.faturamento,
      vendasFront: acc.vendasFront + m.vendasFront,
      totalProdutos: acc.totalProdutos + m.totalProdutos,
    }), { investimento: 0, faturamento: 0, vendasFront: 0, totalProdutos: 0 });
    
    return {
      ...attributed,
      investimentoTotal: totalInvestmentAll,
      investimentoNaoAtribuido: totalInvestmentAll - attributed.investimento,
    };
  }, [funnelMetrics, totalInvestmentAll]);

  // Helper to get offer codes for a specific funnel
  const getOfferCodesForFunnel = (funnelId: string, funnelName: string): string[] => {
    if (!offerMappings) return [];
    return offerMappings
      .filter(o => o.funnel_id === funnelId || o.id_funil === funnelName)
      .map(o => o.codigo_oferta)
      .filter(Boolean) as string[];
  };

  // Helper to get offer options for FunnelChangelog
  const getOfferOptionsForFunnel = (funnelId: string, funnelName: string) => {
    if (!offerMappings) return [];
    return offerMappings
      .filter(o => o.funnel_id === funnelId || o.id_funil === funnelName)
      .map(o => ({
        codigo_oferta: o.codigo_oferta || '',
        nome_oferta: o.nome_posicao || o.codigo_oferta || '',
      }))
      .filter(o => o.codigo_oferta);
  };

  // Filtered Meta data for hierarchy analysis - uses insightsData
  const getFilteredMetaData = (campaignPattern: string) => {
    if (!campaignPattern || !campaignsData || !insightsData) {
      return { campaigns: [], adsets: [], ads: [], insights: [] };
    }
    
    const pattern = campaignPattern.toLowerCase();
    const matchingCampaigns = campaignsData.filter(c => 
      c.campaign_name?.toLowerCase().includes(pattern)
    );
    const matchingCampaignIds = new Set(matchingCampaigns.map(c => c.campaign_id));
    
    // Filter insights by matching campaigns
    const filteredInsights = insightsData.filter(i => 
      matchingCampaignIds.has(i.campaign_id || '')
    );
    
    // Filter adsets by matching campaigns
    const filteredAdsets = (adsetsData || []).filter(a => 
      matchingCampaignIds.has(a.campaign_id)
    );
    const matchingAdsetIds = new Set(filteredAdsets.map(a => a.adset_id));
    
    // Filter ads by matching adsets
    const filteredAds = (adsData || []).filter(a => 
      matchingAdsetIds.has(a.adset_id)
    );
    
    return {
      campaigns: matchingCampaigns.map(c => ({
        id: c.campaign_id,
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name,
        status: c.status,
      })),
      adsets: filteredAdsets.map(a => ({
        id: a.adset_id,
        adset_id: a.adset_id,
        adset_name: a.adset_name,
        campaign_id: a.campaign_id,
        status: a.status,
      })),
      ads: filteredAds.map(a => ({
        id: a.ad_id,
        ad_id: a.ad_id,
        ad_name: a.ad_name,
        adset_id: a.adset_id,
        campaign_id: a.campaign_id,
        status: a.status,
      })),
      insights: filteredInsights.map(i => ({
        id: i.campaign_id || '',
        campaign_id: i.campaign_id,
        adset_id: i.adset_id,
        ad_id: i.ad_id,
        spend: i.spend,
        impressions: i.impressions,
        clicks: i.clicks,
        reach: i.reach,
        ctr: i.ctr,
        cpc: i.cpc,
        cpm: i.cpm,
        date_start: i.date_start,
        date_stop: i.date_stop,
      })),
    };
  };

  // Format sales data for LTVAnalysis
  const getFormattedSalesData = (offerCodes: string[]) => {
    if (!salesData) return [];
    const offerCodesSet = new Set(offerCodes);
    return salesData
      .filter(s => offerCodesSet.has(s.offer_code || ''))
      .map(s => ({
        transaction: s.transaction_id,
        product: s.product_name,
        buyer: s.buyer_email || 'Desconhecido',
        value: s.total_price_brl || 0,
        status: s.status,
        date: s.sale_date || '',
        offerCode: s.offer_code || '',
      }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'good': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'danger': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Excelente</Badge>;
      case 'good': return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">Bom</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Atenção</Badge>;
      case 'danger': return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Crítico</Badge>;
      default: return null;
    }
  };

  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  const setThisMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
  };

  if (loadingFunnels) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando...</span>
        </div>
      </Card>
    );
  }

  if (!funnels || funnels.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <Target className="w-12 h-12 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Nenhum funil configurado</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Para usar o dashboard Cubo Mágico, configure o <strong>padrão de nome da campanha</strong> e o <strong>ROAS alvo</strong> em cada funil no menu Configurações → Funis.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - only show when not embedded */}
      {!embedded && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Dashboard Cubo Mágico</h2>
              <p className="text-sm text-muted-foreground">
                Análise de ROI por funil • {funnels.length} funis configurados
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick date buttons */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setQuickDate(0)}>Hoje</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(7)}>7 dias</Button>
                <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>30 dias</Button>
                <Button variant="outline" size="sm" onClick={setThisMonth}>Este mês</Button>
                <Button variant="outline" size="sm" onClick={setLastMonth}>Mês passado</Button>
              </div>

              {/* Date pickers */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => d && setStartDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">até</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(d) => d && setEndDate(d)}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchInsights()}
                disabled={isRefetching}
              >
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Coins className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Investimento Total</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.investimentoTotal)}</p>
              {totals.investimentoNaoAtribuido > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totals.investimentoNaoAtribuido)} não atribuído
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <TrendingDown className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invest. Atribuído</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.investimento)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totals.faturamento)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <ShoppingCart className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vendas FRONT</p>
              <p className="text-xl font-bold text-foreground">{totals.vendasFront}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Produtos</p>
              <p className="text-xl font-bold text-foreground">{totals.totalProdutos}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Funnel Table with Drill-down */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Funil</TableHead>
              <TableHead>Padrão</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">FRONT</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
              <TableHead className="text-right">CPA Máximo</TableHead>
              <TableHead className="text-right">CPA Real</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funnelMetrics.map(metrics => {
              const isExpanded = expandedFunnelId === metrics.funnel.id;
              const gradients: Record<string, string> = {
                'FRONT': 'from-blue-500 to-cyan-400',
                'FE': 'from-blue-500 to-cyan-400',
                'OB': 'from-emerald-500 to-green-400',
                'US': 'from-purple-500 to-violet-400',
                'DS': 'from-orange-500 to-amber-400',
              };
              
              return (
                <Fragment key={metrics.funnel.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setExpandedFunnelId(isExpanded ? null : metrics.funnel.id);
                      onFunnelSelect?.(metrics.funnel.id);
                    }}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{metrics.funnel.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {metrics.funnel.campaign_name_pattern}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(metrics.investimento)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatCurrency(metrics.faturamento)}
                    </TableCell>
                    <TableCell className="text-right">{metrics.vendasFront}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(metrics.ticketMedio)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(metrics.cpaMaximo)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono font-bold",
                      metrics.status === 'excellent' && "text-green-600",
                      metrics.status === 'good' && "text-blue-600",
                      metrics.status === 'warning' && "text-yellow-600",
                      metrics.status === 'danger' && "text-red-600"
                    )}>
                      {formatCurrency(metrics.cpaReal)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {metrics.roas.toFixed(2)}x
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(metrics.status)}
                        {getStatusBadge(metrics.status)}
                      </div>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Details Row with Nested Tabs */}
                  {isExpanded && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={11} className="p-0">
                        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
                          <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="flex flex-wrap gap-1 h-auto p-1 mb-4">
                              <TabsTrigger value="overview" className="text-xs gap-1">
                                <Target className="w-3 h-3" />
                                Visão Geral
                              </TabsTrigger>
                              <TabsTrigger value="meta" className="text-xs gap-1">
                                <Megaphone className="w-3 h-3" />
                                Meta Ads
                              </TabsTrigger>
                              <TabsTrigger value="temporal" className="text-xs gap-1">
                                <LineChart className="w-3 h-3" />
                                Evolução
                              </TabsTrigger>
                              <TabsTrigger value="comparison" className="text-xs gap-1">
                                <GitCompare className="w-3 h-3" />
                                Comparar
                              </TabsTrigger>
                              <TabsTrigger value="utm" className="text-xs gap-1">
                                <Tag className="w-3 h-3" />
                                UTM
                              </TabsTrigger>
                              <TabsTrigger value="payment" className="text-xs gap-1">
                                <CreditCard className="w-3 h-3" />
                                Pagamentos
                              </TabsTrigger>
                              <TabsTrigger value="ltv" className="text-xs gap-1">
                                <Coins className="w-3 h-3" />
                                LTV
                              </TabsTrigger>
                              <TabsTrigger value="changelog" className="text-xs gap-1">
                                <History className="w-3 h-3" />
                                Histórico
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="mt-0">
                              {/* Funnel Flow */}
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Fluxo do Funil</h4>
                                  <div className="flex flex-wrap items-stretch gap-2">
                                    {metrics.positionBreakdown.map((pos, index) => {
                                      const gradient = gradients[pos.tipo] || 'from-gray-500 to-gray-400';
                                      
                                      return (
                                        <Fragment key={`${pos.tipo}${pos.ordem}`}>
                                          <div 
                                            className={cn(
                                              "relative overflow-hidden rounded-lg p-3 bg-gradient-to-br shadow-md min-w-[90px] flex-1 max-w-[140px]",
                                              gradient
                                            )}
                                          >
                                            <div className="relative z-10 flex flex-col items-center justify-center text-white">
                                              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                                                {pos.tipo}{pos.ordem || ''}
                                              </span>
                                              <span className="text-2xl font-black">
                                                {pos.vendas}
                                              </span>
                                              <div className="flex items-center gap-1 text-[10px] font-medium opacity-90">
                                                <Percent className="w-2.5 h-2.5" />
                                                {pos.taxaConversao.toFixed(1)}%
                                              </div>
                                              <span className="text-[10px] mt-1 opacity-70">
                                                {formatCurrency(pos.receita)}
                                              </span>
                                            </div>
                                          </div>
                                          
                                          {index < metrics.positionBreakdown.length - 1 && (
                                            <div className="flex items-center justify-center w-6">
                                              <ArrowRight className="w-4 h-4 text-muted-foreground/50" />
                                            </div>
                                          )}
                                        </Fragment>
                                      );
                                    })}
                                  </div>
                                </div>
                                
                                {/* Key Metrics */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Lucro (Fat - Inv)</p>
                                    <p className={cn(
                                      "text-lg font-bold",
                                      metrics.faturamento - metrics.investimento > 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                      {formatCurrency(metrics.faturamento - metrics.investimento)}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Total Produtos</p>
                                    <p className="text-lg font-bold">{metrics.totalProdutos}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">ROAS Alvo</p>
                                    <p className="text-lg font-bold">{metrics.funnel.roas_target || 2}x</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Diferença CPA</p>
                                    <p className={cn(
                                      "text-lg font-bold",
                                      metrics.cpaReal <= metrics.cpaMaximo ? "text-green-600" : "text-red-600"
                                    )}>
                                      {formatCurrency(metrics.cpaMaximo - metrics.cpaReal)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="meta" className="mt-0">
                              {(() => {
                                const metaData = getFilteredMetaData(metrics.funnel.campaign_name_pattern || '');
                                return (
                                  <MetaHierarchyAnalysis
                                    insights={metaData.insights}
                                    campaigns={metaData.campaigns}
                                    adsets={metaData.adsets}
                                    ads={metaData.ads}
                                  />
                                );
                              })()}
                            </TabsContent>

                            <TabsContent value="temporal" className="mt-0">
                              <TemporalChart
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                startDate={startDate}
                                endDate={endDate}
                              />
                            </TabsContent>

                            <TabsContent value="comparison" className="mt-0">
                              <PeriodComparison
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                startDate={startDate}
                                endDate={endDate}
                              />
                            </TabsContent>

                            <TabsContent value="utm" className="mt-0">
                              <UTMAnalysis
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                              />
                            </TabsContent>

                            <TabsContent value="payment" className="mt-0">
                              <PaymentMethodAnalysis
                                salesData={salesData}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                              />
                            </TabsContent>

                            <TabsContent value="ltv" className="mt-0">
                              <LTVAnalysis
                                salesData={getFormattedSalesData(getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name))}
                                funnelOfferCodes={getOfferCodesForFunnel(metrics.funnel.id, metrics.funnel.name)}
                                selectedFunnel={metrics.funnel.name}
                              />
                            </TabsContent>

                            <TabsContent value="changelog" className="mt-0">
                              <FunnelChangelog
                                selectedFunnel={metrics.funnel.name}
                                offerOptions={getOfferOptionsForFunnel(metrics.funnel.id, metrics.funnel.name)}
                              />
                            </TabsContent>
                          </Tabs>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-3">Legenda de Status</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span><strong>Excelente:</strong> CPA ≤ 80% do máximo</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span><strong>Bom:</strong> CPA ≤ 100% do máximo</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span><strong>Atenção:</strong> CPA até 120% do máximo</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span><strong>Crítico:</strong> CPA &gt; 120% do máximo</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          <strong>Fórmula:</strong> CPA Máximo = Ticket Médio ÷ ROAS Alvo | CPA Real = Investimento ÷ Vendas FRONT
        </p>
      </Card>
    </div>
  );
}
