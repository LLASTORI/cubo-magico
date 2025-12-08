import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, RefreshCw, CalendarIcon, Megaphone, FileText, AlertTriangle, Search, CheckCircle2
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
import { format, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
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
  const [syncProgress, setSyncProgress] = useState({ elapsed: 0, estimated: 60 });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

  // Cleanup polling on unmount
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Intelligent polling - checks database for new data
  const startPolling = useCallback(async (
    projectId: string,
    accountIds: string[],
    dateStart: string,
    dateStop: string,
    initialCount: number
  ) => {
    const POLL_INTERVAL = 5000; // 5 seconds
    const MAX_POLL_TIME = 300000; // 5 minutes max
    const startTime = Date.now();
    let elapsed = 0;
    
    // Estimate sync time based on date range
    const days = differenceInDays(new Date(dateStop), new Date(dateStart)) + 1;
    const estimatedTime = Math.max(30, Math.min(300, days * 3)); // 3 sec per day, 30s-5min range
    setSyncProgress({ elapsed: 0, estimated: estimatedTime });

    console.log(`[Polling] Starting intelligent polling. Initial count: ${initialCount}, period: ${days} days`);

    pollingRef.current = setInterval(async () => {
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      setSyncProgress(prev => ({ ...prev, elapsed }));

      // Check current count in database
      const { count, error } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('ad_account_id', accountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', dateStart)
        .lte('date_start', dateStop);

      if (error) {
        console.error('[Polling] Error checking data:', error);
        return;
      }

      const currentCount = count || 0;
      console.log(`[Polling] Check: ${currentCount} records (was ${initialCount}), elapsed: ${elapsed}s`);

      // Data arrived or timeout
      if (currentCount > initialCount || Date.now() - startTime > MAX_POLL_TIME) {
        stopPolling();
        setMetaSyncInProgress(false);
        setMetaSyncStatus('done');
        
        if (currentCount > initialCount) {
          const newRecords = currentCount - initialCount;
          toast.success(`Meta Ads: ${newRecords} novos registros sincronizados!`);
          console.log(`[Polling] Success! ${newRecords} new records detected.`);
        } else {
          toast.info('Sincronização Meta Ads finalizada (sem novos dados para o período)');
          console.log(`[Polling] Timeout reached. No new data.`);
        }
        
        // Refetch all data
        await refetchAll();
      }
    }, POLL_INTERVAL);
  }, [stopPolling, refetchAll]);

  // Sync handler - syncs data from APIs
  const handleRefreshAll = async () => {
    if (isSyncing || metaSyncInProgress) {
      toast.warning('Sincronização já em andamento');
      return;
    }

    setIsSyncing(true);
    setHotmartSyncStatus('syncing');
    setMetaSyncStatus('idle');
    stopPolling(); // Clear any existing polling
    
    const syncStartDateStr = format(startDate, 'yyyy-MM-dd');
    const syncEndDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Validate date order before calling APIs
    if (startDate > endDate) {
      toast.error('Data inicial não pode ser maior que data final');
      setIsSyncing(false);
      setHotmartSyncStatus('error');
      return;
    }
    
    // Calculate sync timestamps for Brazil timezone
    const syncStartMs = new Date(syncStartDateStr + 'T00:00:00-03:00').getTime();
    const syncEndMs = new Date(syncEndDateStr + 'T23:59:59-03:00').getTime();

    // Apply dates immediately so UI updates
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);

    const hotmartSync = async () => {
      try {
        const response = await supabase.functions.invoke('hotmart-api', {
          body: {
            projectId: currentProject!.id,
            action: 'sync_sales',
            startDate: syncStartMs,
            endDate: syncEndMs,
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
      
      // Get initial count before sync
      const { count: initialCount } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', currentProject!.id)
        .in('ad_account_id', activeAccountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', syncStartDateStr)
        .lte('date_start', syncEndDateStr);

      console.log(`[MetaSync] Initial count before sync: ${initialCount || 0}`);
      
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
          return;
        }
        
        // Meta sync runs in background - start intelligent polling
        setMetaSyncInProgress(true);
        toast.info('Sincronização Meta Ads iniciada em background...');
        
        startPolling(
          currentProject!.id,
          activeAccountIds,
          syncStartDateStr,
          syncEndDateStr,
          initialCount || 0
        );
        
      } catch (error) {
        setMetaSyncStatus('error');
        toast.error('Erro ao sincronizar Meta Ads');
      }
    };

    try {
      // Run Hotmart sync first (it's faster)
      await hotmartSync();
      
      // Refresh sales data immediately
      await refetchAll();
      
      // Start Meta sync (runs in background with polling)
      await metaSync();
      
    } catch (error) {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Simple search - just apply filters without API sync
  const handleSearch = () => {
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
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
                    onClick={handleSearch}
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
                      disabled={isRefreshingAll || metaSyncInProgress}
                      className="gap-2"
                    >
                      <RefreshCw className={cn("w-4 h-4", (isRefreshingAll || metaSyncInProgress) && "animate-spin")} />
                      {metaSyncInProgress ? 'Sincronizando...' : 'Atualizar'}
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

          {/* Meta sync in progress with intelligent polling */}
          {metaSyncInProgress && (
            <Card className="p-4 border-cube-blue/30 bg-cube-blue/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-cube-blue" />
                  <div>
                    <span className="text-sm font-medium text-foreground">Sincronização Meta Ads em andamento...</span>
                    <p className="text-xs text-muted-foreground">
                      Verificando novos dados a cada 5 segundos. Tempo estimado: ~{syncProgress.estimated}s
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono text-cube-blue">{syncProgress.elapsed}s</span>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden mt-1">
                    <div 
                      className="h-full bg-cube-blue transition-all duration-500"
                      style={{ width: `${Math.min(100, (syncProgress.elapsed / syncProgress.estimated) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
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
