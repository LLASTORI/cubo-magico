import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, RefreshCw, CalendarIcon, Megaphone, FileText, AlertTriangle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { generateExecutiveReport } from "@/components/funnel/ExecutiveReport";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (!currentProject) {
      navigate('/');
    }
  }, [currentProject, navigate]);

  // Fetch funnels config - use unified query key
  const { data: funnelsConfig } = useQuery({
    queryKey: ['funnels-with-config', currentProject?.id],
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

  // Fetch offer mappings - use unified query key
  const { data: mappings } = useQuery({
    queryKey: ['offer-mappings-unified', currentProject?.id],
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

  // Fetch sales data with timezone handling - use unified query key with date strings for consistent cache
  const startDateStr = format(startDate, 'yyyy-MM-dd');
  const endDateStr = format(endDate, 'yyyy-MM-dd');
  
  const { data: salesData, isLoading: loadingSales, refetch: refetchSales, isRefetching } = useQuery({
    queryKey: ['hotmart-sales-unified', currentProject?.id, startDateStr, endDateStr],
    queryFn: async () => {
      // Calculate UTC timestamps for Brazil timezone (UTC-3)
      // Start of day in Brazil = 03:00 UTC of the same day
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      const startUTC = new Date(Date.UTC(startYear, startMonth, startDay, 3, 0, 0, 0)).toISOString();
      
      // End of day in Brazil = 02:59:59.999 UTC of the next day
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();
      const endUTC = new Date(Date.UTC(endYear, endMonth, endDay + 1, 2, 59, 59, 999)).toISOString();
      
      console.log('Query dates:', { startUTC, endUTC });
      
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

  // Fetch Meta campaigns - use unified query key
  const { data: metaCampaigns } = useQuery({
    queryKey: ['meta-campaigns-unified', currentProject?.id],
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

  // Fetch Meta adsets - without project_id filter as IDs are globally unique
  const { data: metaAdsets } = useQuery({
    queryKey: ['meta-adsets-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_adsets')
        .select('id, adset_id, adset_name, campaign_id, status');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Fetch Meta ads - without project_id filter as IDs are globally unique
  const { data: metaAds } = useQuery({
    queryKey: ['meta-ads-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ads')
        .select('id, ad_id, ad_name, adset_id, campaign_id, status');
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  // Fetch Meta insights - campaign-level only for spend calculations
  const { data: metaInsights, refetch: refetchMetaInsights, isRefetching: isRefetchingMeta } = useQuery({
    queryKey: ['meta-insights-unified', currentProject?.id, startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_insights')
        .select('id, campaign_id, adset_id, ad_id, spend, impressions, clicks, reach, ctr, cpc, cpm, date_start, date_stop')
        .eq('project_id', currentProject!.id)
        .is('adset_id', null)
        .is('ad_id', null)
        .gte('date_start', startDateStr)
        .lte('date_start', endDateStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Fetch ALL Meta insights (all levels) for hierarchy analysis
  const { data: allLevelInsights, refetch: refetchAllInsights } = useQuery({
    queryKey: ['meta-insights-all-levels', currentProject?.id, startDateStr, endDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_insights')
        .select('id, campaign_id, adset_id, ad_id, spend, impressions, clicks, reach, ctr, cpc, cpm, date_start, date_stop')
        .eq('project_id', currentProject!.id)
        .gte('date_start', startDateStr)
        .lte('date_start', endDateStr);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  // Get available funnels (those with mappings) - include A Definir
  const availableFunnels = useMemo(() => {
    if (!mappings || !funnelsConfig) return [];
    const funnelIds = new Set(mappings.map(m => m.funnel_id).filter(Boolean));
    const funnelNames = new Set(mappings.map(m => m.id_funil));
    
    // Include all funnels that have mappings by id or name
    return funnelsConfig.filter(f => funnelIds.has(f.id) || funnelNames.has(f.name));
  }, [mappings, funnelsConfig]);

  // All offer codes from all active mappings
  const allOfferCodes = useMemo(() => {
    if (!mappings) return [];
    return mappings.map(m => m.codigo_oferta).filter(Boolean) as string[];
  }, [mappings]);

  // All mappings sorted
  const allMappingsSorted = useMemo(() => {
    if (!mappings) return [];
    return [...mappings].sort((a, b) => {
      const orderA = getPositionSortOrder(a.tipo_posicao || '', a.ordem_posicao || 0);
      const orderB = getPositionSortOrder(b.tipo_posicao || '', b.ordem_posicao || 0);
      return orderA - orderB;
    });
  }, [mappings]);

  // Calculate total Meta investment (all campaigns)
  const totalMetaInvestment = useMemo(() => {
    if (!metaInsights) return 0;
    return metaInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
  }, [metaInsights]);

  // All Meta data for hierarchy analysis - use ALL level insights
  const allMetaData = useMemo(() => {
    return {
      campaigns: metaCampaigns || [],
      adsets: metaAdsets || [],
      ads: metaAds || [],
      insights: allLevelInsights || [],
    };
  }, [metaCampaigns, metaAdsets, metaAds, allLevelInsights]);

  // Meta metrics aggregated (all campaigns)
  const metaMetrics = useMemo(() => {
    if (!metaInsights) {
      return { spend: 0, impressions: 0, clicks: 0, reach: 0, ctr: 0, cpc: 0 };
    }
    
    const spend = metaInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const impressions = metaInsights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const clicks = metaInsights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    const reach = metaInsights.reduce((sum, i) => sum + (i.reach || 0), 0);
    
    return {
      spend,
      impressions,
      clicks,
      reach,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
    };
  }, [metaInsights]);

  // Calculate aggregated metrics for all funnels - USE TOTAL_PRICE_BRL ALWAYS
  const aggregatedMetrics = useMemo((): PositionMetrics[] => {
    if (!salesData) return [];

    // Count ALL sales by offer code (including unmapped offers)
    const salesByOffer: Record<string, { count: number; revenue: number }> = {};
    salesData.forEach(sale => {
      const code = sale.offer_code || 'SEM_CODIGO';
      if (!salesByOffer[code]) salesByOffer[code] = { count: 0, revenue: 0 };
      salesByOffer[code].count += 1;
      // ALWAYS use total_price_brl for accurate currency conversion
      salesByOffer[code].revenue += sale.total_price_brl || sale.total_price || 0;
    });

    // Build metrics from mappings
    const mappedOffers = new Set(allMappingsSorted.map(m => m.codigo_oferta));
    
    // FRONT sales as base (only from mapped offers)
    const feSales = allMappingsSorted
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => sum + (salesByOffer[m.codigo_oferta || '']?.count || 0), 0);

    // Calculate total revenue from ALL sales (mapped + unmapped)
    const totalAllRevenue = Object.values(salesByOffer).reduce((sum, s) => sum + s.revenue, 0);

    // Create metrics for mapped offers
    const mappedMetrics = allMappingsSorted.map(mapping => {
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

    // Add unmapped offers as "Não Categorizado"
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
  }, [allMappingsSorted, salesData]);

  // Summary metrics for all funnels - USE ALL SALES DATA
  const summaryMetrics = useMemo(() => {
    // Use aggregatedMetrics which now includes ALL sales (mapped + unmapped)
    const totalVendas = aggregatedMetrics.reduce((sum, m) => sum + m.total_vendas, 0);
    const totalReceita = aggregatedMetrics.reduce((sum, m) => sum + m.total_receita, 0);
    const vendasFront = aggregatedMetrics
      .filter(m => m.tipo_posicao === 'FRONT' || m.tipo_posicao === 'FE')
      .reduce((sum, m) => sum + m.total_vendas, 0);
    
    // Count ALL unique customers from ALL sales
    const uniqueCustomers = new Set(
      (salesData || []).map(s => s.buyer_email).filter(Boolean)
    ).size;

    // If no FRONT sales, use total sales for ticket calculation
    const baseVendas = vendasFront > 0 ? vendasFront : totalVendas;
    const ticketMedio = baseVendas > 0 ? totalReceita / baseVendas : 0;
    
    const avgRoasTarget = availableFunnels.length > 0 
      ? availableFunnels.reduce((sum, f) => sum + (f.roas_target || 2), 0) / availableFunnels.length 
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
  }, [aggregatedMetrics, salesData, totalMetaInvestment, availableFunnels]);

  // Sync and refresh all data
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  // Fetch active Meta ad accounts for sync
  const { data: metaAdAccounts } = useQuery({
    queryKey: ['meta-ad-accounts', currentProject?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('account_id')
        .eq('project_id', currentProject!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id,
  });

  const handleRefreshAll = async () => {
    setIsSyncing(true);
    setSyncStatus('Sincronizando Hotmart...');
    
    try {
      // Calculate dates in Brazil timezone for sync
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();
      
      // Create UTC timestamps for Brazil timezone (UTC-3)
      const syncStartDate = Date.UTC(startYear, startMonth, startDay, 3, 0, 0, 0);
      const syncEndDate = Date.UTC(endYear, endMonth, endDay + 1, 2, 59, 59, 999);
      
      console.log('Sync dates:', {
        startDate: new Date(syncStartDate).toISOString(),
        endDate: new Date(syncEndDate).toISOString(),
      });

      // 1. Sync Hotmart sales for the selected period
      const hotmartResponse = await supabase.functions.invoke('hotmart-api', {
        body: {
          projectId: currentProject!.id,
          action: 'sync_sales',
          startDate: syncStartDate,
          endDate: syncEndDate,
        },
      });

      if (hotmartResponse.error) {
        console.error('Hotmart sync error:', hotmartResponse.error);
      } else {
        const total = (hotmartResponse.data?.synced || 0) + (hotmartResponse.data?.updated || 0);
        console.log(`Hotmart synced: ${total} sales`);
      }

      // 2. Sync Meta Insights for the selected period (if accounts available)
      if (metaAdAccounts && metaAdAccounts.length > 0) {
        setSyncStatus('Sincronizando Meta Ads...');
        const accountIds = metaAdAccounts.map(a => a.account_id);
        
        const metaResponse = await supabase.functions.invoke('meta-api', {
          body: {
            projectId: currentProject!.id,
            action: 'sync_insights',
            accountIds,
            dateStart: startDateStr,
            dateStop: endDateStr,
          },
        });

        if (metaResponse.error) {
          console.error('Meta sync error:', metaResponse.error);
          toast.error('Erro ao sincronizar Meta Ads');
        } else {
          console.log('Meta sync initiated:', metaResponse.data);
          toast.success('Sincronização Meta Ads iniciada em background');
        }
      }

      // 3. Refresh data from database
      setSyncStatus('Atualizando dados...');
      await Promise.all([
        refetchSales(),
        refetchMetaInsights(),
        refetchAllInsights(),
      ]);

      setSyncStatus('');
      toast.success('Dados atualizados');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro ao sincronizar dados');
      setSyncStatus('');
    } finally {
      setIsSyncing(false);
    }
  };

  const isRefreshingAll = isRefetching || isRefetchingMeta || isSyncing;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
  };

  const setYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setStartDate(yesterday);
    setEndDate(yesterday);
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
                  <Button variant="outline" size="sm" onClick={setYesterday}>Ontem</Button>
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshAll}
                    disabled={isRefreshingAll}
                    className="gap-2"
                  >
                    <RefreshCw className={cn("w-4 h-4", isRefreshingAll && "animate-spin")} />
                    {syncStatus || 'Atualizar'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sincroniza vendas do Hotmart e atualiza dados</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={async () => {
                      try {
                        toast.info('Gerando relatório executivo...');
                        await generateExecutiveReport({
                          startDate,
                          endDate,
                          summaryMetrics,
                          metaMetrics,
                          funnelMetrics: aggregatedMetrics,
                          salesData: salesData || [],
                          projectName: currentProject.name,
                        });
                        toast.success('Relatório PDF gerado com sucesso!');
                      } catch (error) {
                        console.error('Error generating report:', error);
                        toast.error('Erro ao gerar relatório');
                      }
                    }}
                    disabled={loadingSales || !salesData}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Relatório
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Gera relatório executivo em PDF com todas as métricas</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </Card>

          {/* Warning when no Meta investment data */}
          {!loadingSales && summaryMetrics.investimento === 0 && metaAdAccounts && metaAdAccounts.length > 0 && (
            <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                <strong>Sem dados de investimento Meta Ads para o período selecionado.</strong> Clique em "Atualizar" para sincronizar os dados do Meta. A sincronização pode levar alguns minutos para períodos longos.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning when unmapped offers exist */}
          {!loadingSales && aggregatedMetrics.some(m => m.tipo_posicao === 'NC') && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Existem vendas de ofertas não categorizadas. Acesse <strong>Mapeamento de Ofertas</strong> para vincular essas ofertas a um funil.
              </AlertDescription>
            </Alert>
          )}

          {loadingSales ? (
            <div className="flex flex-col items-center justify-center h-64">
              <CubeLoader message="Carregando dados..." size="lg" />
            </div>
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
                />
                
                {/* Hint para o usuário */}
                <Card className="p-4 bg-muted/30 border-dashed">
                  <p className="text-sm text-muted-foreground text-center">
                    💡 Clique em um funil na tabela acima para expandir e ver os detalhes específicos
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="temporal">
                <TemporalChart
                  selectedFunnel="Todos os Funis"
                  funnelOfferCodes={allOfferCodes}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="comparison">
                <PeriodComparison
                  selectedFunnel="Todos os Funis"
                  funnelOfferCodes={allOfferCodes}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="utm">
                <UTMAnalysis
                  selectedFunnel="Todos os Funis"
                  funnelOfferCodes={allOfferCodes}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="payment">
                <PaymentMethodAnalysis
                  selectedFunnel="Todos os Funis"
                  funnelOfferCodes={allOfferCodes}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="cohort">
                <CustomerCohort
                  selectedFunnel="Todos os Funis"
                  funnelOfferCodes={allOfferCodes}
                  initialStartDate={startDate}
                  initialEndDate={endDate}
                />
              </TabsContent>

              <TabsContent value="ltv">
                <LTVAnalysis
                  salesData={(salesData || []).map(s => ({
                    transaction: s.transaction_id,
                    product: s.product_name,
                    buyer: s.buyer_email || '',
                    value: s.total_price_brl || 0,
                    status: s.status,
                    date: s.sale_date || '',
                    offerCode: s.offer_code || undefined,
                  }))}
                  funnelOfferCodes={allOfferCodes}
                  selectedFunnel="Todos os Funis"
                />
              </TabsContent>

              <TabsContent value="changelog">
                <FunnelChangelog
                  selectedFunnel="Todos os Funis"
                  offerOptions={aggregatedMetrics.map(m => ({
                    codigo_oferta: m.codigo_oferta,
                    nome_oferta: m.nome_oferta
                  }))}
                />
              </TabsContent>

              <TabsContent value="meta-hierarchy">
                {allMetaData.campaigns.length > 0 ? (
                  <MetaHierarchyAnalysis
                    insights={allMetaData.insights}
                    campaigns={allMetaData.campaigns}
                    adsets={allMetaData.adsets}
                    ads={allMetaData.ads}
                    loading={isRefetchingMeta}
                    onRefresh={() => {
                      refetchMetaInsights();
                      refetchAllInsights();
                    }}
                  />
                ) : (
                  <Card className="p-12 text-center">
                    <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhuma campanha encontrada
                    </h3>
                    <p className="text-muted-foreground">
                      Configure campanhas no Meta Ads e sincronize para ver os dados aqui.
                    </p>
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
