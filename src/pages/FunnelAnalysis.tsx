/**
 * FunnelAnalysis
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL FUNNEL ANALYSIS PAGE - PAID MEDIA DOMAIN INTEGRATION
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Data comes from:
 * - Sales: funnel_orders_view (Orders Core)
 * - Paid Media: Paid Media Domain (provider-agnostic)
 * 
 * NO MANUAL SYNC:
 * - Data is fetched automatically via domain layer
 * - No "Sync Meta Ads" button - data is continuous
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  RefreshCw, CalendarIcon, Megaphone, AlertTriangle, Search, CheckCircle2, Lock, Clock, Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectModules } from "@/hooks/useProjectModules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CubeLoader } from "@/components/CubeLoader";
import { AppHeader } from "@/components/AppHeader";
import PeriodComparison from "@/components/funnel/PeriodComparison";
import FunnelChangelog from "@/components/funnel/FunnelChangelog";
import TemporalChart from "@/components/funnel/TemporalChart";
import UTMAnalysis from "@/components/funnel/UTMAnalysis";
import PaymentMethodAnalysis from "@/components/funnel/PaymentMethodAnalysis";
import LTVAnalysis from "@/components/funnel/LTVAnalysis";
import { CuboMagicoDashboard } from "@/components/funnel/CuboMagicoDashboard";
import { FunnelAIInsights } from "@/components/funnel/FunnelAIInsights";
import { MetaHierarchyAnalysis } from "@/components/meta/MetaHierarchyAnalysis";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { useFunnelData } from "@/hooks/useFunnelData";
import { computeFunnelAIContext } from "@/hooks/useFunnelAIContext";
import { useFunnelAnalysisState } from "@/hooks/useFunnelAnalysisState";
import { FeatureGate, FeatureLockedBadge } from "@/components/FeatureGate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Internal component for AI Insights tab with funnel selector
interface AIInsightsTabProps {
  funnels: Array<{ id: string; name: string; campaign_name_pattern?: string; roas_target?: number }>;
  startDate: Date;
  endDate: Date;
  salesData: any[];
  metaInsights: any[];
  campaigns: any[];
  offerMappings: any[];
  adsets?: any[];
  ads?: any[];
  cachedAnalysis: Record<string, any>;
  setCachedAnalysis: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

function AIInsightsTab({ 
  funnels, 
  startDate, 
  endDate,
  salesData,
  metaInsights,
  campaigns,
  offerMappings,
  adsets,
  ads,
  cachedAnalysis,
  setCachedAnalysis,
}: AIInsightsTabProps) {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>(funnels[0]?.id || '');
  
  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);
  
  const context = useMemo(() => {
    if (!selectedFunnel || !salesData || !metaInsights || !campaigns || !offerMappings) {
      return null;
    }
    return computeFunnelAIContext(
      selectedFunnel,
      salesData,
      metaInsights,
      campaigns,
      offerMappings,
      startDate,
      endDate,
      adsets,
      ads
    );
  }, [selectedFunnel, salesData, metaInsights, campaigns, offerMappings, startDate, endDate, adsets, ads]);

  const handleAnalysisSave = useCallback((funnelId: string, analysis: any) => {
    setCachedAnalysis(prev => ({
      ...prev,
      [funnelId]: analysis
    }));
  }, [setCachedAnalysis]);
  
  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-medium">Selecione o Funil para Análise:</span>
          </div>
          <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione um funil" />
            </SelectTrigger>
            <SelectContent>
              {funnels.map(funnel => (
                <SelectItem key={funnel.id} value={funnel.id}>
                  {funnel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {context && (
          <div className="mt-3 text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <span>Receita: R$ {context.client_summary.total_revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>Investimento: R$ {context.client_summary.total_investment.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            <span>ROAS: {context.client_summary.roas.toFixed(2)}</span>
            <span>Vendas FRONT: {context.client_summary.front_sales}</span>
            <span>Posições: {context.position_breakdown.length}</span>
            <span>Criativos: {context.top_ads.length}</span>
          </div>
        )}
      </Card>
      
      {selectedFunnelId && selectedFunnel && (
        <FunnelAIInsights
          funnelId={selectedFunnelId}
          funnelName={selectedFunnel.name}
          startDate={startDate}
          endDate={endDate}
          context={context}
          cachedAnalysis={cachedAnalysis[selectedFunnelId]}
          onAnalysisSave={(analysis) => handleAnalysisSave(selectedFunnelId, analysis)}
        />
      )}
    </div>
  );
}

const BRAZIL_TZ = "America/Sao_Paulo";
const formatBrazilDate = (date: Date) => formatInTimeZone(date, BRAZIL_TZ, "yyyy-MM-dd");

const FunnelAnalysis = () => {
  const { currentProject } = useProject();
  const { isModuleEnabled } = useProjectModules();
  const isMetaAdsEnabled = isModuleEnabled('meta_ads');
  
  // Persisted state - survives navigation between tabs
  const {
    startDate, setStartDate,
    endDate, setEndDate,
    appliedStartDate, setAppliedStartDate,
    appliedEndDate, setAppliedEndDate,
    selectedPeriod, setSelectedPeriod,
    activeTab, setActiveTab,
    cachedAIAnalysis, setCachedAIAnalysis,
  } = useFunnelAnalysisState(currentProject?.id);

  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use centralized hook for ALL data (via Paid Media Domain)
  const {
    funnels,
    mappings,
    offerCodes,
    salesData,
    metaInsights,
    metaStructure,
    activeAccountIds,
    aggregatedMetrics,
    summaryMetrics,
    isLoading,
    loadingSales,
    loadingInsights,
    refetchAll,
  } = useFunnelData({
    projectId: currentProject?.id,
    startDate: appliedStartDate,
    endDate: appliedEndDate,
  });

  // Simple search - apply filters and refetch
  const handleSearch = useCallback(() => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  }, [startDate, endDate, setAppliedStartDate, setAppliedEndDate]);

  // Refresh data from cache
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchAll();
      toast.success('Dados atualizados');
    } catch {
      toast.error('Erro ao atualizar dados');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchAll]);

  // Quick date setters
  const setQuickDate = (days: number) => {
    setEndDate(new Date());
    setStartDate(subDays(new Date(), days));
    setSelectedPeriod(days === 0 ? 'today' : `${days}d`);
  };

  const setYesterday = () => {
    const yesterday = subDays(new Date(), 1);
    setStartDate(yesterday);
    setEndDate(yesterday);
    setSelectedPeriod('yesterday');
  };

  const setThisMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
    setSelectedPeriod('thisMonth');
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setStartDate(startOfMonth(lastMonth));
    setEndDate(endOfMonth(lastMonth));
    setSelectedPeriod('lastMonth');
  };

  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    setSelectedPeriod(null);
    if (date > endDate) {
      setEndDate(date);
    }
    setTimeout(() => setEndDatePopoverOpen(true), 100);
  };

  const handleEndDateChange = (date: Date) => {
    if (date < startDate) return;
    setEndDate(date);
    setSelectedPeriod(null);
    setEndDatePopoverOpen(false);
  };

  // ROAS status
  const roasStatus = useMemo(() => {
    if (summaryMetrics.investimento === 0) return 'neutral';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget * 1.2) return 'excellent';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget) return 'good';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget * 0.8) return 'warning';
    return 'danger';
  }, [summaryMetrics]);

  const datesChanged = startDate.getTime() !== appliedStartDate.getTime() || endDate.getTime() !== appliedEndDate.getTime();
  
  // Check if end date is "today"
  const isEndDateToday = useMemo(() => {
    const todayStr = formatBrazilDate(new Date());
    const appliedEndStr = formatBrazilDate(appliedEndDate);
    return appliedEndStr === todayStr;
  }, [appliedEndDate]);

  // Consolidated status for visual feedback
  const dataStatus = useMemo(() => {
    if (loadingSales || loadingInsights) {
      return { status: 'loading', label: 'Carregando...', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' };
    }
    if (isRefreshing) {
      return { status: 'refreshing', label: 'Atualizando...', color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30' };
    }
    if (datesChanged) {
      return { status: 'pending', label: 'Período não aplicado', color: 'bg-amber-500/20 text-amber-600 border-amber-500/30' };
    }
    return { 
      status: 'ready', 
      label: lastUpdateTime 
        ? `Atualizado às ${format(lastUpdateTime, 'HH:mm', { locale: ptBR })}`
        : 'Dados prontos',
      color: 'bg-green-500/20 text-green-600 border-green-500/30' 
    };
  }, [loadingSales, loadingInsights, isRefreshing, datesChanged, lastUpdateTime]);

  // Update timestamp when data loads
  useEffect(() => {
    if (!loadingSales && !loadingInsights && salesData.length > 0) {
      setLastUpdateTime(new Date());
    }
  }, [loadingSales, loadingInsights, salesData.length]);

  if (!currentProject) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Filters Card */}
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  <Button 
                    variant={selectedPeriod === 'today' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setQuickDate(0)}
                    className={cn(selectedPeriod === 'today' && "ring-2 ring-primary/30")}
                  >
                    Hoje
                  </Button>
                  <Button 
                    variant={selectedPeriod === 'yesterday' ? "default" : "outline"} 
                    size="sm" 
                    onClick={setYesterday}
                    className={cn(selectedPeriod === 'yesterday' && "ring-2 ring-primary/30")}
                  >
                    Ontem
                  </Button>
                  <Button 
                    variant={selectedPeriod === '7d' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setQuickDate(7)}
                    className={cn(selectedPeriod === '7d' && "ring-2 ring-primary/30")}
                  >
                    7 dias
                  </Button>
                  <Button 
                    variant={selectedPeriod === '30d' ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setQuickDate(30)}
                    className={cn(selectedPeriod === '30d' && "ring-2 ring-primary/30")}
                  >
                    30 dias
                  </Button>
                  <Button 
                    variant={selectedPeriod === 'thisMonth' ? "default" : "outline"} 
                    size="sm" 
                    onClick={setThisMonth}
                    className={cn(selectedPeriod === 'thisMonth' && "ring-2 ring-primary/30")}
                  >
                    Este mês
                  </Button>
                  <Button 
                    variant={selectedPeriod === 'lastMonth' ? "default" : "outline"} 
                    size="sm" 
                    onClick={setLastMonth}
                    className={cn(selectedPeriod === 'lastMonth' && "ring-2 ring-primary/30")}
                  >
                    Mês passado
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(startDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && handleStartDateChange(d)}
                        disabled={(date) => date > new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">até</span>
                  <Popover open={endDatePopoverOpen} onOpenChange={setEndDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        {format(endDate, 'dd/MM/yyyy', { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => d && handleEndDateChange(d)}
                        disabled={(date) => date < startDate || date > new Date()}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant={datesChanged ? "default" : "outline"} 
                        size="sm" 
                        onClick={handleSearch}
                        className={cn(
                          "gap-2 transition-all",
                          datesChanged && "animate-pulse ring-2 ring-primary/50"
                        )}
                      >
                        <Search className="w-4 h-4" />
                        Aplicar Período
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Busca os dados do banco para o período selecionado</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Badge */}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "gap-1.5 px-3 py-1 text-xs font-medium transition-colors",
                    dataStatus.color
                  )}
                >
                  {dataStatus.status === 'loading' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {dataStatus.status === 'refreshing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {dataStatus.status === 'pending' && <AlertTriangle className="w-3 h-3" />}
                  {dataStatus.status === 'ready' && <CheckCircle2 className="w-3 h-3" />}
                  {dataStatus.label}
                </Badge>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleRefresh}
                      disabled={isRefreshing || loadingSales || loadingInsights}
                      className="gap-2"
                    >
                      <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                      Atualizar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Recarrega os dados do período selecionado</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </Card>

          {/* Loading indicator */}
          {loadingInsights && activeAccountIds.length > 0 && (
            <Card className="p-6 border-cube-blue/30 bg-cube-blue/5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <CubeLoader size="sm" message="" />
                </div>
                <span className="text-sm text-muted-foreground">Carregando dados de mídia paga...</span>
              </div>
            </Card>
          )}

          {/* Info when end date is today */}
          {isEndDateToday && !loadingInsights && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                <strong>Período inclui "hoje".</strong> Dados de mídia paga para o dia atual geralmente ficam disponíveis após 24-48h. 
                Vendas aparecem em tempo real, mas investimento pode estar incompleto.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning when no investment data */}
          {!loadingSales && !loadingInsights && summaryMetrics.investimento === 0 && activeAccountIds.length > 0 && !isEndDateToday && (
            <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                <strong>Sem dados de investimento para o período selecionado.</strong> Verifique se existem dados para as datas escolhidas.
              </AlertDescription>
            </Alert>
          )}

          {/* Warning when unmapped offers exist */}
          {!loadingSales && aggregatedMetrics.some(m => m.tipo_posicao === 'NC') && (
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Existem vendas de ofertas não categorizadas. Acesse <strong>Mapeamento de Ofertas</strong> para vinculá-las.
              </AlertDescription>
            </Alert>
          )}

          {loadingSales ? (
            <div className="flex flex-col items-center justify-center h-64">
              <CubeLoader message="Carregando dados..." size="lg" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex flex-wrap w-full max-w-5xl gap-1">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <TabsTrigger 
                        value="meta-hierarchy" 
                        className={`gap-1 ${!isMetaAdsEnabled ? 'opacity-60' : ''}`}
                        disabled={!isMetaAdsEnabled}
                      >
                        {isMetaAdsEnabled ? (
                          <Megaphone className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        Meta Ads
                        {!isMetaAdsEnabled && <Lock className="w-2.5 h-2.5 ml-1" />}
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  {!isMetaAdsEnabled && (
                    <TooltipContent>
                      <p>Módulo bloqueado. Contate o suporte para ativar.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <TabsTrigger value="temporal">Evolução</TabsTrigger>
                <TabsTrigger value="comparison">Comparar Períodos</TabsTrigger>
                <TabsTrigger value="utm" className="gap-1">
                  UTM
                  <FeatureLockedBadge featureKey="utm_analysis" className="ml-1" />
                </TabsTrigger>
                <TabsTrigger value="payment">Pagamentos</TabsTrigger>
                <TabsTrigger value="ltv" className="gap-1">
                  LTV
                  <FeatureLockedBadge featureKey="ltv_analysis" className="ml-1" />
                </TabsTrigger>
                <TabsTrigger value="changelog">Histórico</TabsTrigger>
                <TabsTrigger value="ai-insights" className="gap-1">
                  <Brain className="w-3 h-3" />
                  Análise IA
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <CuboMagicoDashboard 
                  projectId={currentProject.id}
                  externalStartDate={appliedStartDate}
                  externalEndDate={appliedEndDate}
                  embedded={true}
                  salesData={salesData}
                  insightsData={metaInsights}
                />
                
                <Card className="p-4 bg-muted/30 border-dashed">
                  <p className="text-sm text-muted-foreground text-center">
                    💡 Clique em um funil na tabela acima para expandir e ver os detalhes específicos
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="temporal">
                <TemporalChart
                  salesData={salesData}
                  funnelOfferCodes={offerCodes}
                  startDate={appliedStartDate}
                  endDate={appliedEndDate}
                />
              </TabsContent>

              <TabsContent value="comparison">
                <PeriodComparison
                  salesData={salesData}
                  funnelOfferCodes={offerCodes}
                  startDate={appliedStartDate}
                  endDate={appliedEndDate}
                />
              </TabsContent>

              <TabsContent value="utm">
                <FeatureGate 
                  featureKey="utm_analysis" 
                  showLocked 
                  lockedMessage="Análise UTM detalhada disponível nos planos pagos"
                >
                  <UTMAnalysis
                    salesData={salesData}
                    funnelOfferCodes={offerCodes}
                    metaInsights={metaInsights}
                    metaCampaigns={metaStructure.campaigns}
                    metaAdsets={metaStructure.adsets}
                    metaAds={metaStructure.ads}
                  />
                </FeatureGate>
              </TabsContent>

              <TabsContent value="payment">
                <PaymentMethodAnalysis
                  salesData={salesData}
                  funnelOfferCodes={offerCodes}
                />
              </TabsContent>

              <TabsContent value="ltv">
                <FeatureGate 
                  featureKey="ltv_analysis" 
                  showLocked 
                  lockedMessage="Análise LTV disponível nos planos pagos"
                >
                  <LTVAnalysis
                    salesData={salesData.map(s => ({
                      transaction: s.transaction_id,
                      product: s.product_name || '',
                      buyer: s.buyer_email || '',
                      value: s.gross_amount || 0,
                      status: s.hotmart_status || 'UNKNOWN',
                      date: s.economic_day || '',
                      offerCode: s.offer_code || undefined,
                    }))}
                    funnelOfferCodes={offerCodes}
                    selectedFunnel="Todos os Funis"
                  />
                </FeatureGate>
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
                {!isMetaAdsEnabled ? (
                  <Card className="p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Lock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Módulo Meta Ads Bloqueado
                    </h3>
                    <p className="text-muted-foreground">
                      Entre em contato com o suporte para ativar este recurso.
                    </p>
                  </Card>
                ) : metaStructure.campaigns.length > 0 ? (
                  <MetaHierarchyAnalysis
                    insights={metaInsights}
                    campaigns={metaStructure.campaigns}
                    adsets={metaStructure.adsets}
                    ads={metaStructure.ads}
                    loading={loadingInsights}
                    onRefresh={refetchAll}
                  />
                ) : (
                  <Card className="p-12 text-center">
                    <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      Nenhuma campanha encontrada
                    </h3>
                    <p className="text-muted-foreground">
                      Configure campanhas no Meta Ads para ver os dados aqui.
                    </p>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ai-insights">
                <FeatureGate 
                  featureKey="ai_analysis.funnel" 
                  showLocked 
                  lockedMessage="Análise de Funil com IA requer ativação do módulo ou upgrade do plano"
                >
                  {funnels.length > 0 ? (
                    <AIInsightsTab 
                      funnels={funnels}
                      startDate={appliedStartDate}
                      endDate={appliedEndDate}
                      salesData={salesData || []}
                      metaInsights={metaInsights || []}
                      campaigns={metaStructure?.campaigns || []}
                      offerMappings={mappings || []}
                      adsets={metaStructure?.adsets || []}
                      ads={metaStructure?.ads || []}
                      cachedAnalysis={cachedAIAnalysis}
                      setCachedAnalysis={setCachedAIAnalysis}
                    />
                  ) : (
                    <Card className="p-12 text-center">
                      <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        Nenhum funil configurado
                      </h3>
                      <p className="text-muted-foreground">
                        Configure funis perpétuos para utilizar a análise por IA.
                      </p>
                    </Card>
                  )}
                </FeatureGate>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default FunnelAnalysis;
