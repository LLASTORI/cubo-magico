import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, RefreshCw, CalendarIcon, Megaphone, FileText, AlertTriangle, Search
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
import { SyncLoader } from "@/components/SyncLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserAvatar } from "@/components/UserAvatar";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import PeriodComparison from "@/components/funnel/PeriodComparison";
import FunnelChangelog from "@/components/funnel/FunnelChangelog";
import TemporalChart from "@/components/funnel/TemporalChart";
import UTMAnalysis from "@/components/funnel/UTMAnalysis";
import PaymentMethodAnalysis from "@/components/funnel/PaymentMethodAnalysis";
import LTVAnalysis from "@/components/funnel/LTVAnalysis";
import { CuboMagicoDashboard } from "@/components/funnel/CuboMagicoDashboard";
import { MetaHierarchyAnalysis } from "@/components/meta/MetaHierarchyAnalysis";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useFunnelData } from "@/hooks/useFunnelData";

const FunnelAnalysis = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  
  // Single source of truth for dates
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(subDays(new Date(), 7));
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(new Date());
  
  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [hotmartSyncStatus, setHotmartSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [metaSyncStatus, setMetaSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [metaSyncInProgress, setMetaSyncInProgress] = useState(false);

  // Use centralized hook for ALL data
  const {
    funnels,
    mappings,
    sortedMappings,
    offerCodes,
    salesData,
    metaInsights,
    metaStructure,
    activeAccountIds,
    aggregatedMetrics,
    summaryMetrics,
    metaMetrics,
    isLoading,
    loadingSales,
    loadingInsights,
    refetchAll,
  } = useFunnelData({
    projectId: currentProject?.id,
    startDate: appliedStartDate,
    endDate: appliedEndDate,
  });

  // Apply date filters
  const applyDateFilters = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  // Quick date setters
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

  // Sync handler
  const handleRefreshAll = async () => {
    setIsSyncing(true);
    setHotmartSyncStatus('syncing');
    setMetaSyncStatus('idle');
    
    const syncStartDateStr = format(startDate, 'yyyy-MM-dd');
    const syncEndDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Calculate sync timestamps for Brazil timezone
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();
    
    const syncStartDate = Date.UTC(startYear, startMonth, startDay, 3, 0, 0, 0);
    const syncEndDate = Date.UTC(endYear, endMonth, endDay + 1, 2, 59, 59, 999);

    const hotmartSync = async () => {
      try {
        const response = await supabase.functions.invoke('hotmart-api', {
          body: {
            projectId: currentProject!.id,
            action: 'sync_sales',
            startDate: syncStartDate,
            endDate: syncEndDate,
          },
        });

        if (response.error) {
          setHotmartSyncStatus('error');
          toast.error('Erro ao sincronizar Hotmart');
        } else {
          const total = (response.data?.synced || 0) + (response.data?.updated || 0);
          setHotmartSyncStatus('done');
          toast.success(`Hotmart: ${total} vendas sincronizadas`);
        }
      } catch (error) {
        setHotmartSyncStatus('error');
        toast.error('Erro ao sincronizar Hotmart');
      }
    };

    const metaSync = async () => {
      if (activeAccountIds.length === 0) {
        setMetaSyncStatus('done');
        return;
      }

      setMetaSyncStatus('syncing');
      
      try {
        const response = await supabase.functions.invoke('meta-api', {
          body: {
            projectId: currentProject!.id,
            action: 'sync_insights',
            accountIds: activeAccountIds,
            dateStart: syncStartDateStr,
            dateStop: syncEndDateStr,
          },
        });

        if (response.error) {
          setMetaSyncStatus('error');
          toast.error('Erro ao sincronizar Meta Ads');
        } else {
          setMetaSyncInProgress(true);
          
          // Poll for data completion
          const periodDays = response.data?.periodDays || 30;
          const pollDurationMs = Math.max(20000, Math.min(120000, periodDays * 800));
          
          setTimeout(async () => {
            setMetaSyncInProgress(false);
            setMetaSyncStatus('done');
            await refetchAll();
            toast.success('Meta Ads sincronizado!');
          }, pollDurationMs);
        }
      } catch (error) {
        setMetaSyncStatus('error');
        toast.error('Erro ao sincronizar Meta Ads');
      }
    };

    try {
      // Apply dates immediately
      setAppliedStartDate(startDate);
      setAppliedEndDate(endDate);
      
      // Run both syncs in parallel
      await Promise.all([hotmartSync(), metaSync()]);
      
      // Refresh data
      await refetchAll();
    } catch (error) {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  };

  // ROAS status
  const roasStatus = useMemo(() => {
    if (summaryMetrics.investimento === 0) return 'neutral';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget * 1.2) return 'excellent';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget) return 'good';
    if (summaryMetrics.roas >= summaryMetrics.roasTarget * 0.8) return 'warning';
    return 'danger';
  }, [summaryMetrics]);

  const isRefreshingAll = isSyncing;
  const datesChanged = startDate.getTime() !== appliedStartDate.getTime() || endDate.getTime() !== appliedEndDate.getTime();

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
                  
                  <Button 
                    variant={datesChanged ? "default" : "outline"} 
                    size="sm" 
                    onClick={applyDateFilters}
                    className="gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Buscar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
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
                      Atualizar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Sincroniza vendas do Hotmart e Meta Ads em paralelo</p>
                  </TooltipContent>
                </Tooltip>
                
                {isSyncing && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full",
                      hotmartSyncStatus === 'syncing' && "bg-yellow-500/20 text-yellow-600",
                      hotmartSyncStatus === 'done' && "bg-green-500/20 text-green-600",
                      hotmartSyncStatus === 'error' && "bg-red-500/20 text-red-600",
                      hotmartSyncStatus === 'idle' && "bg-muted text-muted-foreground"
                    )}>
                      {hotmartSyncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Hotmart
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-full",
                      metaSyncStatus === 'syncing' && "bg-yellow-500/20 text-yellow-600",
                      metaSyncStatus === 'done' && "bg-green-500/20 text-green-600",
                      metaSyncStatus === 'error' && "bg-red-500/20 text-red-600",
                      metaSyncStatus === 'idle' && "bg-muted text-muted-foreground"
                    )}>
                      {metaSyncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Meta
                    </div>
                  </div>
                )}
              </div>

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
                          salesData,
                          projectName: currentProject.name,
                          funnelsConfig: funnels,
                          mappings,
                          metaCampaigns: metaStructure.campaigns,
                          metaAds: metaStructure.ads,
                          metaInsights,
                        });
                        toast.success('Relatório PDF gerado com sucesso!');
                      } catch (error) {
                        console.error('Error generating report:', error);
                        toast.error('Erro ao gerar relatório');
                      }
                    }}
                    disabled={loadingSales || !salesData.length}
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

          {/* Meta sync in progress */}
          {metaSyncInProgress && (
            <Card className="p-4 border-cube-blue/30 bg-cube-blue/5">
              <SyncLoader showProgress={true} estimatedDuration={60} />
            </Card>
          )}

          {/* Loading Meta data indicator */}
          {!metaSyncInProgress && loadingInsights && activeAccountIds.length > 0 && (
            <Card className="p-4 border-cube-blue/30 bg-cube-blue/5">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-cube-blue" />
                <span className="text-sm text-muted-foreground">Carregando dados do Meta Ads...</span>
              </div>
            </Card>
          )}

          {/* Warning when no Meta investment data */}
          {!loadingSales && !metaSyncInProgress && !loadingInsights && summaryMetrics.investimento === 0 && activeAccountIds.length > 0 && (
            <Alert variant="destructive" className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                <strong>Sem dados de investimento Meta Ads para o período selecionado.</strong> Clique em "Atualizar" para sincronizar os dados.
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
                <TabsTrigger value="ltv">LTV</TabsTrigger>
                <TabsTrigger value="changelog">Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <CuboMagicoDashboard 
                  projectId={currentProject.id}
                  externalStartDate={appliedStartDate}
                  externalEndDate={appliedEndDate}
                  embedded={true}
                  salesData={salesData}
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
                <UTMAnalysis
                  salesData={salesData}
                  funnelOfferCodes={offerCodes}
                />
              </TabsContent>

              <TabsContent value="payment">
                <PaymentMethodAnalysis
                  salesData={salesData}
                  funnelOfferCodes={offerCodes}
                />
              </TabsContent>

              <TabsContent value="ltv">
                <LTVAnalysis
                  salesData={salesData.map(s => ({
                    transaction: s.transaction_id,
                    product: s.product_name,
                    buyer: s.buyer_email || '',
                    value: s.total_price_brl || 0,
                    status: s.status,
                    date: s.sale_date || '',
                    offerCode: s.offer_code || undefined,
                  }))}
                  funnelOfferCodes={offerCodes}
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
                {metaStructure.campaigns.length > 0 ? (
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
