import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { 
  RefreshCw, CalendarIcon, Megaphone, AlertTriangle, Search, CheckCircle2, Lock
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProject } from "@/contexts/ProjectContext";
import { useProjectModules } from "@/hooks/useProjectModules";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CubeLoader } from "@/components/CubeLoader";
import { SyncLoader } from "@/components/SyncLoader";
import { AppHeader } from "@/components/AppHeader";
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
import { useQueryClient } from "@tanstack/react-query";

const FunnelAnalysis = () => {
  const { currentProject } = useProject();
  const { isModuleEnabled } = useProjectModules();
  const isMetaAdsEnabled = isModuleEnabled('meta_ads');
  const queryClient = useQueryClient();
  
  // Single source of truth for dates
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [appliedStartDate, setAppliedStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDatePopoverOpen, setEndDatePopoverOpen] = useState(false);
  const [appliedEndDate, setAppliedEndDate] = useState<Date>(new Date());
  
  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [hotmartSyncStatus, setHotmartSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [metaSyncStatus, setMetaSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [metaSyncInProgress, setMetaSyncInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ elapsed: 0, estimated: 60 });
  const [dataGaps, setDataGaps] = useState<{ missingDays: number; completeness: number; missingRanges: string[]; missingDateRanges: Array<{start: string, end: string}> } | null>(null);
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

  // Date validation handlers
  const handleStartDateChange = (date: Date) => {
    setStartDate(date);
    // Se a data inicial for maior que a final, ajusta a final
    if (date > endDate) {
      setEndDate(date);
    }
    // Abre o seletor de data final após selecionar a inicial
    setTimeout(() => setEndDatePopoverOpen(true), 100);
  };

  const handleEndDateChange = (date: Date) => {
    // Impede que a data final seja menor que a inicial
    if (date < startDate) return;
    setEndDate(date);
    setEndDatePopoverOpen(false);
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

  // Cleanup polling on unmount
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Check for data gaps in the selected period - query DB directly for accuracy
  const checkDataGaps = useCallback(async () => {
    if (!currentProject?.id || activeAccountIds.length === 0) return;
    
    const dateStart = format(appliedStartDate, 'yyyy-MM-dd');
    const dateStop = format(appliedEndDate, 'yyyy-MM-dd');
    
    console.log('[DataGaps] Checking gaps for period:', dateStart, 'to', dateStop);
    console.log('[DataGaps] Active accounts:', activeAccountIds);
    
    // Query ALL unique dates - use pagination to get beyond 1000 limit
    // First, get count and unique dates in a more efficient way
    let allDates: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('meta_insights')
        .select('date_start')
        .eq('project_id', currentProject.id)
        .in('ad_account_id', activeAccountIds)
        .gte('date_start', dateStart)
        .lte('date_start', dateStop)
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('[DataGaps] Error querying:', error);
        return;
      }
      
      if (data && data.length > 0) {
        allDates = allDates.concat(data.map(d => d.date_start));
        offset += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    // Get unique dates
    const cachedDates = new Set(allDates);
    console.log('[DataGaps] Unique dates found in DB:', cachedDates.size, 'Total records fetched:', allDates.length);
    
    // Calculate expected days (excluding future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDateObj = new Date(dateStop);
    const startDateObj = new Date(dateStart);
    const effectiveEnd = endDateObj > today ? today : endDateObj;
    const expectedDays = Math.max(0, Math.floor((effectiveEnd.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    console.log('[DataGaps] Expected days:', expectedDays, 'Found:', cachedDates.size);
    
    const missingDays = expectedDays - cachedDates.size;
    const completeness = expectedDays > 0 ? cachedDates.size / expectedDays : 1;
    
    // Find missing date ranges with actual dates
    const missingRanges: string[] = [];
    const missingDateRanges: Array<{start: string, end: string}> = [];
    
    if (missingDays > 0) {
      let rangeStart: string | null = null;
      let rangeEnd: string | null = null;
      
      for (let d = new Date(startDateObj); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        if (!cachedDates.has(dateStr)) {
          if (!rangeStart) rangeStart = dateStr;
          rangeEnd = dateStr;
        } else if (rangeStart && rangeEnd) {
          missingRanges.push(rangeStart === rangeEnd ? rangeStart : `${rangeStart} a ${rangeEnd}`);
          missingDateRanges.push({ start: rangeStart, end: rangeEnd });
          rangeStart = null;
          rangeEnd = null;
        }
      }
      if (rangeStart && rangeEnd) {
        missingRanges.push(rangeStart === rangeEnd ? rangeStart : `${rangeStart} a ${rangeEnd}`);
        missingDateRanges.push({ start: rangeStart, end: rangeEnd });
      }
    }
    
    console.log('[DataGaps] Missing days:', missingDays, 'Completeness:', (completeness * 100).toFixed(1) + '%');
    console.log('[DataGaps] Missing ranges:', missingRanges);
    
    if (missingDays > 0 && completeness < 0.95) {
      setDataGaps({ missingDays, completeness, missingRanges, missingDateRanges });
    } else {
      setDataGaps(null);
    }
  }, [currentProject?.id, activeAccountIds, appliedStartDate, appliedEndDate]);

  // Check for gaps when sync completes or data changes - and auto-fill them
  useEffect(() => {
    if (!metaSyncInProgress && activeAccountIds.length > 0 && currentProject?.id) {
      // Small delay to ensure DB has been updated
      const timer = setTimeout(async () => {
        // First check for gaps
        await checkDataGaps();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [metaSyncInProgress, activeAccountIds, checkDataGaps, currentProject?.id]);

  // Intelligent polling - checks database for new data
  const startPolling = useCallback(async (
    projectId: string,
    accountIds: string[],
    dateStart: string,
    dateStop: string,
    initialCount: number
  ) => {
    // Validate inputs before starting
    if (!projectId || accountIds.length === 0) {
      console.error('[Polling] Cannot start: missing projectId or accountIds');
      setMetaSyncInProgress(false);
      setMetaSyncStatus('error');
      toast.error('Erro: Projeto ou contas Meta não configuradas');
      return;
    }

    const POLL_INTERVAL = 3000; // 3 seconds - faster polling
    const MAX_POLL_TIME = 300000; // 5 minutes max
    const startTime = Date.now();
    let elapsed = 0;
    let lastCount = initialCount;
    let lastSpend = 0;
    let stableCount = 0;
    
    const days = differenceInDays(new Date(dateStop), new Date(dateStart)) + 1;
    // More realistic estimation: ~4s per day for full sync, minimum 30s
    const estimatedTime = Math.max(30, Math.min(600, days * 4));
    setSyncProgress({ elapsed: 0, estimated: estimatedTime });

    console.log(`[Polling] Starting intelligent polling.`);
    console.log(`[Polling] Period: ${dateStart} to ${dateStop} (${days} days)`);

    // Calculate expected days (excluding future dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDateObj = new Date(dateStop);
    const startDateObj = new Date(dateStart);
    const effectiveEnd = endDateObj > today ? today : endDateObj;
    const expectedDays = Math.max(0, Math.floor((effectiveEnd.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Optimized cache check - single query with aggregation
    const checkCacheCompleteness = async () => {
      const { data } = await supabase
        .from('meta_insights')
        .select('date_start, spend')
        .eq('project_id', projectId)
        .in('ad_account_id', accountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', dateStart)
        .lte('date_start', dateStop);
      
      const uniqueDates = new Set(data?.map(d => d.date_start) || []);
      const cachedDaysCount = uniqueDates.size;
      const totalSpend = data?.reduce((sum, row) => sum + (row.spend || 0), 0) || 0;
      const completeness = expectedDays > 0 ? cachedDaysCount / expectedDays : 0;
      
      return { 
        cachedDaysCount, 
        completeness, 
        isComplete: completeness >= 0.95, // 95% for more accuracy
        totalSpend,
        count: data?.length || 0
      };
    };

    // Initial cache check
    const initialCacheStatus = await checkCacheCompleteness();
    console.log(`[Polling] Cache: ${initialCacheStatus.cachedDaysCount}/${expectedDays} days, ${initialCacheStatus.count} records, R$${initialCacheStatus.totalSpend.toFixed(2)}`);
    
    // Use cache if complete (95%+)
    if (initialCacheStatus.isComplete && initialCacheStatus.count > 0) {
      console.log(`[Polling] Cache complete! Using cached data.`);
      setMetaSyncInProgress(false);
      setMetaSyncStatus('done');
      toast.success(`Meta Ads: Dados carregados (R$ ${initialCacheStatus.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
      await refetchAll();
      return;
    }

    // Determine stability requirements based on cache state
    const cacheWasEmpty = initialCacheStatus.count === 0;
    const STABLE_CYCLES_REQUIRED = cacheWasEmpty ? 2 : 3; // 2 cycles if empty, 3 if partial

    pollingRef.current = setInterval(async () => {
      // Early exit if polling was stopped
      if (!pollingRef.current) return;
      
      elapsed = Math.floor((Date.now() - startTime) / 1000);
      setSyncProgress(prev => ({ ...prev, elapsed }));

      // Use optimized check function
      const status = await checkCacheCompleteness();
      const { count: currentCount, totalSpend } = status;

      console.log(`[Polling] ${elapsed}s: ${currentCount} records, R$${totalSpend.toFixed(2)}, ${status.cachedDaysCount}/${expectedDays} days`);

      // Check for stability (both count AND spend must be stable)
      const dataStable = currentCount === lastCount && Math.abs(totalSpend - lastSpend) < 0.01;
      
      if (currentCount > 0 && dataStable) {
        stableCount++;
        
        // Complete when stable and cache is reasonably complete
        if (stableCount >= STABLE_CYCLES_REQUIRED && status.completeness >= 0.9) {
          stopPolling();
          setMetaSyncInProgress(false);
          setMetaSyncStatus('done');
          toast.success(`Meta Ads: ${currentCount} registros (R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
          console.log(`[Polling] Complete! ${status.cachedDaysCount}/${expectedDays} days (${(status.completeness * 100).toFixed(0)}%)`);
          await refetchAll();
          return;
        }
      } else if (currentCount > lastCount || totalSpend > lastSpend + 1) {
        stableCount = 0; // Reset on data change
      }
      
      lastCount = currentCount;
      lastSpend = totalSpend;

      // Timeout reached
      if (Date.now() - startTime > MAX_POLL_TIME) {
        stopPolling();
        setMetaSyncInProgress(false);
        setMetaSyncStatus('done');
        
        if (currentCount > 0) {
          const finalCacheStatus = await checkCacheCompleteness();
          
          // Check for gaps in the data
          const missingDays = expectedDays - finalCacheStatus.cachedDaysCount;
          if (missingDays > 0 && finalCacheStatus.completeness < 0.95) {
            toast.warning(`Meta Ads: ${currentCount} registros. Atenção: ${missingDays} dias faltando (${(finalCacheStatus.completeness * 100).toFixed(0)}% completo)`);
            console.log(`[Polling] WARNING: Missing ${missingDays} days. Consider re-syncing the period.`);
          } else {
            toast.success(`Meta Ads: ${currentCount} registros carregados (R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
          }
          console.log(`[Polling] Timeout with ${currentCount} records. Cache: ${(finalCacheStatus.completeness * 100).toFixed(0)}%`);
        } else {
          toast.warning('Tempo limite atingido. Verifique se há dados para o período selecionado.');
          console.log(`[Polling] Timeout reached. No data detected.`);
        }
        
        await refetchAll();
      }
    }, POLL_INTERVAL);
  }, [stopPolling, refetchAll]);

  // Sync only the missing date ranges (gaps) - consolidated to avoid rate limiting
  const handleFillGaps = useCallback(async () => {
    if (!dataGaps?.missingDateRanges?.length || !currentProject?.id || activeAccountIds.length === 0) {
      toast.error('Nenhuma lacuna encontrada para preencher');
      return;
    }

    if (isSyncing || metaSyncInProgress) {
      toast.warning('Sincronização já em andamento');
      return;
    }

    setIsSyncing(true);
    setMetaSyncStatus('syncing');
    setMetaSyncInProgress(true);
    stopPolling();

    // Consolidate all gaps into a single range (earliest start to latest end)
    // This avoids multiple API calls that cause rate limiting
    const allDates = dataGaps.missingDateRanges.flatMap(r => [r.start, r.end]);
    const earliestDate = allDates.sort()[0];
    const latestDate = allDates.sort().reverse()[0];

    toast.info(`Preenchendo ${dataGaps.missingDays} dias faltantes (${earliestDate} a ${latestDate})...`);
    console.log('[FillGaps] Consolidated range:', earliestDate, 'to', latestDate);
    console.log('[FillGaps] Original ranges:', dataGaps.missingDateRanges);

    try {
      // Single API call for the entire gap period
      await supabase.functions.invoke('meta-api', {
        body: {
          projectId: currentProject.id,
          action: 'sync_insights',
          accountIds: activeAccountIds,
          dateStart: earliestDate,
          dateStop: latestDate,
          forceRefresh: true,
        },
      });
    } catch (error) {
      console.error('[FillGaps] Error syncing gaps:', error);
      toast.error('Erro ao preencher lacunas');
    }

    // Start polling for the full applied period to check completion
    const syncStartDateStr = format(appliedStartDate, 'yyyy-MM-dd');
    const syncEndDateStr = format(appliedEndDate, 'yyyy-MM-dd');
    
    const { count: initialCount } = await supabase
      .from('meta_insights')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', currentProject.id)
      .in('ad_account_id', activeAccountIds)
      .not('ad_id', 'is', null)
      .gte('date_start', syncStartDateStr)
      .lte('date_start', syncEndDateStr);

    startPolling(
      currentProject.id,
      activeAccountIds,
      syncStartDateStr,
      syncEndDateStr,
      initialCount || 0
    );

    setIsSyncing(false);
  }, [dataGaps, currentProject?.id, activeAccountIds, isSyncing, metaSyncInProgress, stopPolling, appliedStartDate, appliedEndDate, startPolling]);

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
        toast.info('Nenhuma conta Meta Ads configurada para este projeto');
        console.log('[MetaSync] No active Meta accounts for this project');
        return;
      }
      
      console.log(`[MetaSync] Starting sync for project ${currentProject!.id}`);
      console.log(`[MetaSync] Active accounts: ${activeAccountIds.join(', ')}`);
      console.log(`[MetaSync] Period: ${syncStartDateStr} to ${syncEndDateStr}`);

      setMetaSyncStatus('syncing');
      
      // Get initial count before sync
      const { count: initialCount, error: countError } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', currentProject!.id)
        .in('ad_account_id', activeAccountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', syncStartDateStr)
        .lte('date_start', syncEndDateStr);

      if (countError) {
        console.error(`[MetaSync] Error getting initial count:`, countError);
      }
      
      console.log(`[MetaSync] Initial count before sync: ${initialCount || 0}`);
      console.log(`[MetaSync] Query params: project=${currentProject!.id}, accounts=[${activeAccountIds.join(',')}], dates=${syncStartDateStr} to ${syncEndDateStr}`);
      
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
  
  // Auto-fill gaps for a given period
  const autoFillGaps = useCallback(async (
    projectId: string,
    accountIds: string[],
    dateStart: Date,
    dateEnd: Date
  ) => {
    const dateStartStr = format(dateStart, 'yyyy-MM-dd');
    const dateStopStr = format(dateEnd, 'yyyy-MM-dd');
    
    console.log('[AutoFillGaps] Checking gaps for period:', dateStartStr, 'to', dateStopStr);
    
    // Query existing dates from DB
    let allDates: string[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('meta_insights')
        .select('date_start')
        .eq('project_id', projectId)
        .in('ad_account_id', accountIds)
        .gte('date_start', dateStartStr)
        .lte('date_start', dateStopStr)
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error('[AutoFillGaps] Error querying:', error);
        return false;
      }
      
      if (data && data.length > 0) {
        allDates = allDates.concat(data.map(d => d.date_start));
        offset += pageSize;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }
    
    const cachedDates = new Set(allDates);
    
    // Calculate expected days (excluding future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const effectiveEnd = dateEnd > today ? today : dateEnd;
    const expectedDays = Math.max(0, Math.floor((effectiveEnd.getTime() - dateStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    
    const missingDays = expectedDays - cachedDates.size;
    const completeness = expectedDays > 0 ? cachedDates.size / expectedDays : 1;
    
    console.log('[AutoFillGaps] Expected:', expectedDays, 'Found:', cachedDates.size, 'Missing:', missingDays);
    
    // If more than 5% is missing, auto-sync
    if (missingDays > 0 && completeness < 0.95) {
      console.log('[AutoFillGaps] Gaps detected, auto-syncing...');
      setMetaSyncStatus('syncing');
      setMetaSyncInProgress(true);
      
      try {
        await supabase.functions.invoke('meta-api', {
          body: {
            projectId,
            action: 'sync_insights',
            accountIds,
            dateStart: dateStartStr,
            dateStop: dateStopStr,
            forceRefresh: false, // Smart sync - only fetch missing data
          },
        });
        
        // Get initial count for polling
        const { count: initialCount } = await supabase
          .from('meta_insights')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId)
          .in('ad_account_id', accountIds)
          .not('ad_id', 'is', null)
          .gte('date_start', dateStartStr)
          .lte('date_start', dateStopStr);
        
        // Start polling to track progress
        startPolling(projectId, accountIds, dateStartStr, dateStopStr, initialCount || 0);
        
        return true; // Gaps are being filled
      } catch (error) {
        console.error('[AutoFillGaps] Error syncing:', error);
        setMetaSyncStatus('error');
        setMetaSyncInProgress(false);
        return false;
      }
    }
    
    return false; // No gaps to fill
  }, [startPolling]);

  // Auto-fill gaps when detected (runs after checkDataGaps updates state)
  useEffect(() => {
    if (dataGaps && dataGaps.missingDays > 0 && !metaSyncInProgress && !isSyncing && currentProject?.id && activeAccountIds.length > 0) {
      console.log('[AutoFill] Gaps detected, starting auto-fill...');
      // Auto-fill the gaps silently
      const fillGaps = async () => {
        setDataGaps(null); // Clear the warning immediately
        await autoFillGaps(currentProject.id, activeAccountIds, appliedStartDate, appliedEndDate);
      };
      fillGaps();
    }
  }, [dataGaps, metaSyncInProgress, isSyncing, currentProject?.id, activeAccountIds, appliedStartDate, appliedEndDate, autoFillGaps]);

  // Simple search - apply filters and auto-fill gaps if needed
  const handleSearch = async () => {
    // Invalidate all insights cache to force fresh fetch
    await queryClient.invalidateQueries({ queryKey: ['insights'] });
    await queryClient.invalidateQueries({ queryKey: ['meta-insights'] });
    
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setDataGaps(null); // Clear any existing gap warnings
    
    // Auto-fill gaps if Meta is configured
    if (currentProject?.id && activeAccountIds.length > 0 && !metaSyncInProgress) {
      // Small delay to let the UI update first
      setTimeout(async () => {
        const isFillingGaps = await autoFillGaps(
          currentProject.id,
          activeAccountIds,
          startDate,
          endDate
        );
        
        if (isFillingGaps) {
          toast.info('Sincronizando dados Meta Ads para o período selecionado...');
        }
      }, 500);
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
      <AppHeader />

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

          {/* Data gaps info - now just informational since auto-fill handles it */}
          {dataGaps && !metaSyncInProgress && !loadingInsights && (
            <Card className="p-4 border-cube-blue/30 bg-cube-blue/5">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-cube-blue" />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Sincronizando {dataGaps.missingDays} dias de dados Meta Ads...
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguarde, os dados serão atualizados automaticamente.
                  </p>
                </div>
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
                <UTMAnalysis
                  salesData={salesData}
                  funnelOfferCodes={offerCodes}
                  metaInsights={metaInsights}
                  metaCampaigns={metaStructure.campaigns}
                  metaAdsets={metaStructure.adsets}
                  metaAds={metaStructure.ads}
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
