import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, Percent, DollarSign, BarChart3, Target, ArrowRight, Users, 
  TrendingUp, TrendingDown, RefreshCw, CalendarIcon, Filter, Megaphone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CuboBrand } from "@/components/CuboLogo";
import { CubeLoader } from "@/components/CubeLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import PeriodComparison from "@/components/funnel/PeriodComparison";
import FunnelChangelog from "@/components/funnel/FunnelChangelog";
import TemporalChart from "@/components/funnel/TemporalChart";
import UTMAnalysis from "@/components/funnel/UTMAnalysis";
import PaymentMethodAnalysis from "@/components/funnel/PaymentMethodAnalysis";
import CustomerCohort from "@/components/funnel/CustomerCohort";
import LTVAnalysis from "@/components/funnel/LTVAnalysis";
import { CuboMagicoDashboard } from "@/components/funnel/CuboMagicoDashboard";
import { MetaHierarchyAnalysis } from "@/components/meta/MetaHierarchyAnalysis";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import { cn } from "@/lib/utils";

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

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

const POSITION_COLORS: Record<string, string> = {
  'FRONT': 'bg-cube-blue/20 text-cube-blue border-cube-blue/30',
  'FE': 'bg-cube-blue/20 text-cube-blue border-cube-blue/30',
  'OB': 'bg-cube-green/20 text-cube-green border-cube-green/30',
  'US': 'bg-cube-orange/20 text-cube-orange border-cube-orange/30',
  'DS': 'bg-cube-red/20 text-cube-red border-cube-red/30',
};

// Taxas de conversão ideais por posição
const OPTIMAL_CONVERSION_RATES: Record<string, { min: number; max: number }> = {
  'OB1': { min: 30, max: 40 },
  'OB2': { min: 20, max: 30 },
  'OB3': { min: 10, max: 20 },
  'US1': { min: 8, max: 10 },
  'US2': { min: 3, max: 5 },
  'DS1': { min: 1, max: 3 },
  'DS2': { min: 1, max: 3 },
};

// Gera insight para o card do funil
const generateFunnelInsight = (
  tipo: string,
  ordem: number,
  taxaConversao: number,
  totalReceita: number,
  totalVendas: number,
  valorOferta: number
): { message: string; status: 'exceptional' | 'optimal' | 'improving' | 'neutral' } => {
  const positionKey = `${tipo}${ordem || ''}`;
  const optimalRange = OPTIMAL_CONVERSION_RATES[positionKey];
  
  if (tipo === 'FRONT' || tipo === 'FE') {
    const potentialIncrease10 = totalReceita * 0.1;
    return {
      message: `🎯 Base do funil! Se aumentar 10% nas vendas front-end, potencial de +${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(potentialIncrease10)} em receita direta.`,
      status: 'neutral'
    };
  }
  
  if (!optimalRange) {
    return {
      message: `📊 Posição ${positionKey}: ${taxaConversao.toFixed(1)}% de conversão. Continue monitorando!`,
      status: 'neutral'
    };
  }
  
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const additionalSales = Math.ceil(totalVendas * 0.1);
  const additionalRevenue = additionalSales * valorOferta;
  
  if (taxaConversao > optimalRange.max) {
    return {
      message: `🏆 Excepcional! Taxa de ${taxaConversao.toFixed(1)}% acima do ideal (${optimalRange.min}-${optimalRange.max}%). Considere testar aumento de preço!`,
      status: 'exceptional'
    };
  } else if (taxaConversao >= optimalRange.min && taxaConversao <= optimalRange.max) {
    return {
      message: `✅ Ótimo! Taxa de ${taxaConversao.toFixed(1)}% no ponto ideal. +10% = +${formatCurrency(additionalRevenue)} potencial.`,
      status: 'optimal'
    };
  } else {
    const gap = optimalRange.min - taxaConversao;
    return {
      message: `📈 Espaço para crescer! Taxa: ${taxaConversao.toFixed(1)}% | Meta: ${optimalRange.min}-${optimalRange.max}%. Gap: ${gap.toFixed(1)}pp`,
      status: 'improving'
    };
  }
};

const FunnelAnalysis = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  
  // Date filters
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Funnel filter
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("");
  
  // Traffic source filter
  const [selectedSource, setSelectedSource] = useState<string>("all");

  useEffect(() => {
    if (!currentProject) {
      navigate('/');
    }
  }, [currentProject, navigate]);

  // Fetch funnels config
  const { data: funnelsConfig } = useQuery({
    queryKey: ['funnels-config', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('id, name, campaign_name_pattern, roas_target')
        .eq('project_id', currentProject!.id);
      if (error) throw error;
      return (data as FunnelConfig[]) || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch offer mappings
  const { data: mappings } = useQuery({
    queryKey: ['offer-mappings-analysis', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offer_mappings')
        .select('*')
        .eq('project_id', currentProject!.id)
        .eq('status', 'Ativo');
      if (error) throw error;
      return (data as OfferMapping[]) || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch sales data with timezone handling
  const { data: salesData, isLoading: loadingSales, refetch: refetchSales, isRefetching } = useQuery({
    queryKey: ['hotmart-sales-analysis', currentProject?.id, startDate, endDate],
    queryFn: async () => {
      const startUTC = formatInTimeZone(startDate, BRAZIL_TIMEZONE, "yyyy-MM-dd'T'00:00:00XXX");
      const endUTC = formatInTimeZone(endDate, BRAZIL_TIMEZONE, "yyyy-MM-dd'T'23:59:59XXX");
      
      const { data, error } = await supabase
        .from('hotmart_sales')
        .select('*')
        .eq('project_id', currentProject!.id)
        .in('status', ['APPROVED', 'COMPLETE'])
        .gte('sale_date', startUTC)
        .lte('sale_date', endUTC);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Meta campaigns
  const { data: metaCampaigns } = useQuery({
    queryKey: ['meta-campaigns-analysis', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('id, campaign_id, campaign_name, status')
        .eq('project_id', currentProject!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Meta adsets
  const { data: metaAdsets } = useQuery({
    queryKey: ['meta-adsets-analysis', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_adsets')
        .select('id, adset_id, adset_name, campaign_id, status')
        .eq('project_id', currentProject!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Meta ads
  const { data: metaAds } = useQuery({
    queryKey: ['meta-ads-analysis', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ads')
        .select('id, ad_id, ad_name, adset_id, campaign_id, status')
        .eq('project_id', currentProject!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch Meta insights
  const { data: metaInsights, refetch: refetchMetaInsights, isRefetching: isRefetchingMeta } = useQuery({
    queryKey: ['meta-insights-analysis', currentProject?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_insights')
        .select('id, campaign_id, adset_id, ad_id, spend, impressions, clicks, reach, ctr, cpc, cpm, date_start, date_stop')
        .eq('project_id', currentProject!.id)
        .gte('date_start', format(startDate, 'yyyy-MM-dd'))
        .lte('date_start', format(endDate, 'yyyy-MM-dd'));
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Get unique sources for filter
  const uniqueSources = useMemo(() => {
    if (!salesData) return [];
    const sources = new Set(salesData.map(s => s.utm_source).filter(Boolean));
    return Array.from(sources).sort();
  }, [salesData]);

  // Get available funnels (those with mappings)
  const availableFunnels = useMemo(() => {
    if (!mappings || !funnelsConfig) return [];
    const funnelIds = new Set(mappings.map(m => m.funnel_id).filter(Boolean));
    const funnelNames = new Set(mappings.map(m => m.id_funil));
    
    return funnelsConfig.filter(f => funnelIds.has(f.id) || funnelNames.has(f.name));
  }, [mappings, funnelsConfig]);

  // Selected funnel config
  const selectedFunnel = useMemo(() => {
    return funnelsConfig?.find(f => f.id === selectedFunnelId);
  }, [funnelsConfig, selectedFunnelId]);

  // Filter sales by source if selected
  const filteredSales = useMemo(() => {
    if (!salesData) return [];
    if (selectedSource === 'all') return salesData;
    return salesData.filter(s => s.utm_source === selectedSource);
  }, [salesData, selectedSource]);

  // Get mappings for selected funnel
  const funnelMappings = useMemo(() => {
    if (!selectedFunnelId || !mappings) return [];
    return mappings
      .filter(m => m.funnel_id === selectedFunnelId || (selectedFunnel && m.id_funil === selectedFunnel.name))
      .sort((a, b) => {
        const orderA = getPositionSortOrder(a.tipo_posicao || '', a.ordem_posicao || 0);
        const orderB = getPositionSortOrder(b.tipo_posicao || '', b.ordem_posicao || 0);
        return orderA - orderB;
      });
  }, [selectedFunnelId, selectedFunnel, mappings]);

  // Calculate Meta investment for selected funnel
  const metaInvestment = useMemo(() => {
    if (!selectedFunnel?.campaign_name_pattern || !metaCampaigns || !metaInsights) return 0;
    
    const pattern = selectedFunnel.campaign_name_pattern.toLowerCase();
    const matchingCampaignIds = new Set(
      metaCampaigns
        .filter(c => c.campaign_name?.toLowerCase().includes(pattern))
        .map(c => c.campaign_id)
    );
    
    return metaInsights
      .filter(i => matchingCampaignIds.has(i.campaign_id || ''))
      .reduce((sum, i) => sum + (i.spend || 0), 0);
  }, [selectedFunnel, metaCampaigns, metaInsights]);

  // Filtered Meta data for hierarchy analysis (based on funnel campaign pattern)
  const filteredMetaData = useMemo(() => {
    if (!selectedFunnel?.campaign_name_pattern || !metaCampaigns || !metaInsights) {
      return { campaigns: [], adsets: [], ads: [], insights: [] };
    }
    
    const pattern = selectedFunnel.campaign_name_pattern.toLowerCase();
    const matchingCampaigns = metaCampaigns.filter(c => 
      c.campaign_name?.toLowerCase().includes(pattern)
    );
    const matchingCampaignIds = new Set(matchingCampaigns.map(c => c.campaign_id));
    
    const filteredAdsets = (metaAdsets || []).filter(a => 
      matchingCampaignIds.has(a.campaign_id)
    );
    const filteredAds = (metaAds || []).filter(a => 
      matchingCampaignIds.has(a.campaign_id)
    );
    const filteredInsights = metaInsights.filter(i => 
      matchingCampaignIds.has(i.campaign_id || '')
    );
    
    return {
      campaigns: matchingCampaigns,
      adsets: filteredAdsets,
      ads: filteredAds,
      insights: filteredInsights,
    };
  }, [selectedFunnel, metaCampaigns, metaAdsets, metaAds, metaInsights]);

  // Meta metrics aggregated
  const metaMetrics = useMemo(() => {
    if (!selectedFunnel?.campaign_name_pattern || !metaCampaigns || !metaInsights) {
      return { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpc: 0 };
    }
    
    const pattern = selectedFunnel.campaign_name_pattern.toLowerCase();
    const matchingCampaignIds = new Set(
      metaCampaigns
        .filter(c => c.campaign_name?.toLowerCase().includes(pattern))
        .map(c => c.campaign_id)
    );
    
    const insights = metaInsights.filter(i => matchingCampaignIds.has(i.campaign_id || ''));
    const spend = insights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const impressions = insights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const clicks = insights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    const reach = insights.reduce((sum, i) => sum + (i.reach || 0), 0);
    
    return {
      spend,
      impressions,
      clicks,
      reach,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    };
  }, [selectedFunnel, metaCampaigns, metaInsights]);

  // Calculate funnel metrics
  const funnelMetrics = useMemo((): PositionMetrics[] => {
    if (!funnelMappings.length || !filteredSales) return [];

    const offerCodes = new Set(funnelMappings.map(m => m.codigo_oferta));
    const funnelSales = filteredSales.filter(s => offerCodes.has(s.offer_code));

    // Count sales by offer
    const salesByOffer: Record<string, { count: number; revenue: number }> = {};
    funnelSales.forEach(sale => {
      const code = sale.offer_code || '';
      if (!salesByOffer[code]) salesByOffer[code] = { count: 0, revenue: 0 };
      salesByOffer[code].count += 1;
      salesByOffer[code].revenue += sale.total_price_brl || 0;
    });

    // FRONT sales as base
    const feSales = funnelMappings
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => sum + (salesByOffer[m.codigo_oferta || '']?.count || 0), 0);

    const totalFunnelRevenue = Object.values(salesByOffer).reduce((sum, s) => sum + s.revenue, 0);

    return funnelMappings.map(mapping => {
      const offerSales = salesByOffer[mapping.codigo_oferta || ''] || { count: 0, revenue: 0 };
      const taxaConversao = feSales > 0 ? (offerSales.count / feSales) * 100 : 0;
      const percentualReceita = totalFunnelRevenue > 0 ? (offerSales.revenue / totalFunnelRevenue) * 100 : 0;

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
  }, [funnelMappings, filteredSales]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    const totalVendas = funnelMetrics.reduce((sum, m) => sum + m.total_vendas, 0);
    const totalReceita = funnelMetrics.reduce((sum, m) => sum + m.total_receita, 0);
    const vendasFront = funnelMetrics
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => sum + m.total_vendas, 0);
    
    const uniqueCustomers = new Set(
      filteredSales
        .filter(s => funnelMappings.some(m => m.codigo_oferta === s.offer_code))
        .map(s => s.buyer_email)
    ).size;

    const ticketMedio = vendasFront > 0 ? totalReceita / vendasFront : 0;
    const roasTarget = selectedFunnel?.roas_target || 2;
    const cpaMaximo = ticketMedio / roasTarget;
    const cpaReal = vendasFront > 0 ? metaInvestment / vendasFront : 0;
    const roas = metaInvestment > 0 ? totalReceita / metaInvestment : 0;

    return { 
      totalVendas, 
      totalReceita, 
      ticketMedio, 
      uniqueCustomers, 
      vendasFront,
      investimento: metaInvestment,
      cpaMaximo,
      cpaReal,
      roas,
      roasTarget,
    };
  }, [funnelMetrics, filteredSales, funnelMappings, metaInvestment, selectedFunnel]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

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

  // Determine ROAS status
  const roasStatus = useMemo(() => {
    if (summaryMetrics.investimento === 0) return 'neutral';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget * 1.2) return 'excellent';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget) return 'good';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget * 0.8) return 'warning';
    return 'danger';
  }, [summaryMetrics]);

  const roasColors: Record<string, string> = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  if (!currentProject) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-cube">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <CuboBrand size="sm" />
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold text-foreground font-display">
                  Análise de Funil
                </h1>
                <p className="text-sm text-muted-foreground">
                  Métricas consolidadas • Meta Ads + Vendas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationsDropdown />
              <ThemeToggle />
              <UserAvatar size="sm" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Filters Card */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              {/* Date filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(0)}>Hoje</Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(7)}>7 dias</Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDate(30)}>30 dias</Button>
                  <Button variant="outline" size="sm" onClick={setThisMonth}>Este mês</Button>
                  <Button variant="outline" size="sm" onClick={setLastMonth}>Mês passado</Button>
                </div>

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
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
                    <PopoverContent className="w-auto p-0" align="start">
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
              </div>

              {/* Funnel filter */}
              <div className="space-y-1">
                <Label className="text-xs">Funil</Label>
                <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione um funil" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFunnels.map(funnel => (
                      <SelectItem key={funnel.id} value={funnel.id}>
                        {funnel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Source filter */}
              <div className="space-y-1">
                <Label className="text-xs">Fonte de Tráfego</Label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source!}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchSales()}
                disabled={isRefetching}
              >
                <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
              </Button>
            </div>
          </Card>

          {loadingSales ? (
            <div className="flex flex-col items-center justify-center h-64">
              <CubeLoader message="Carregando dados..." size="lg" />
            </div>
          ) : !selectedFunnelId ? (
            <Card className="p-12 text-center">
              <Filter className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Selecione um funil
              </h3>
              <p className="text-muted-foreground">
                Escolha um funil no filtro acima para ver a análise detalhada.
              </p>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="flex flex-wrap w-full max-w-5xl gap-1">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="meta-hierarchy" className="gap-1">
                  <Megaphone className="w-3 h-3" />
                  Meta Ads
                </TabsTrigger>
                <TabsTrigger value="temporal">Evolução</TabsTrigger>
                <TabsTrigger value="comparison">Comparar Períodos</TabsTrigger>
                <TabsTrigger value="utm">UTM</TabsTrigger>
                <TabsTrigger value="payment">Pagamentos</TabsTrigger>
                <TabsTrigger value="cohort">Clientes</TabsTrigger>
                <TabsTrigger value="ltv">LTV</TabsTrigger>
                <TabsTrigger value="changelog">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Dashboard Cubo Mágico com Drill-down */}
                <CuboMagicoDashboard 
                  projectId={currentProject.id}
                  externalStartDate={startDate}
                  externalEndDate={endDate}
                  embedded={true}
                  onFunnelSelect={(funnelId) => setSelectedFunnelId(funnelId)}
                />
                
                {/* Hint para o usuário */}
                {!selectedFunnelId && (
                  <Card className="p-4 bg-muted/30 border-dashed">
                    <p className="text-sm text-muted-foreground text-center">
                      💡 Clique em um funil na tabela acima para expandir e ver os detalhes
                    </p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="temporal">
                <TemporalChart
                  selectedFunnel={selectedFunnel?.name || ''}
                  funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="comparison">
                <PeriodComparison
                  selectedFunnel={selectedFunnel?.name || ''}
                  funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="utm">
                <UTMAnalysis
                  selectedFunnel={selectedFunnel?.name || ''}
                  funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="payment">
                <PaymentMethodAnalysis
                  selectedFunnel={selectedFunnel?.name || ''}
                  funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="cohort">
                <CustomerCohort
                  selectedFunnel={selectedFunnel?.name || ''}
                  funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="ltv">
                <LTVAnalysis
                  salesData={filteredSales.map(s => ({
                    transaction: s.transaction_id,
                    product: s.product_name,
                    buyer: s.buyer_email || '',
                    value: s.total_price_brl || 0,
                    status: s.status,
                    date: s.sale_date || '',
                    offerCode: s.offer_code || undefined,
                  }))}
                  funnelOfferCodes={funnelMetrics.map(m => m.codigo_oferta)}
                  selectedFunnel={selectedFunnel?.name || ''}
                />
              </TabsContent>

              <TabsContent value="changelog">
                <FunnelChangelog
                  selectedFunnel={selectedFunnel?.name || ''}
                  offerOptions={funnelMetrics.map(m => ({
                    codigo_oferta: m.codigo_oferta,
                    nome_oferta: m.nome_oferta
                  }))}
                />
              </TabsContent>

              <TabsContent value="meta-hierarchy">
                {filteredMetaData.campaigns.length > 0 ? (
                  <MetaHierarchyAnalysis
                    insights={filteredMetaData.insights}
                    campaigns={filteredMetaData.campaigns}
                    adsets={filteredMetaData.adsets}
                    ads={filteredMetaData.ads}
                    loading={isRefetchingMeta}
                    onRefresh={() => refetchMetaInsights()}
                  />
                ) : (
                  <Card className="p-12 text-center">
                    <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhuma campanha encontrada
                    </h3>
                    <p className="text-muted-foreground">
                      Configure o padrão de campanha no funil "{selectedFunnel?.name}" para vincular campanhas do Meta Ads.
                    </p>
                    {selectedFunnel?.campaign_name_pattern && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Padrão atual: <Badge variant="outline">{selectedFunnel.campaign_name_pattern}</Badge>
                      </p>
                    )}
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default FunnelAnalysis;
