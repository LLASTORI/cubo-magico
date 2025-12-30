import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, TrendingUp, DollarSign, Eye, MousePointer, Target, Calendar, Facebook, AlertCircle, CheckCircle, Loader2, Filter, Building2, BarChart3, Settings, Lock, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const META_APP_ID = '845927421602166';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { SyncLoader } from '@/components/SyncLoader';
import { AppHeader } from '@/components/AppHeader';

import { MetaAccountsManager } from '@/components/MetaAccountsManager';
import MetaDateFilters from '@/components/MetaDateFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { MetaHierarchyAnalysis } from '@/components/meta/MetaHierarchyAnalysis';
import { MetaROIDashboard } from '@/components/meta/MetaROIDashboard';
import { MetaAudiencesTab } from '@/components/meta/audiences';
import { SocialListeningTab } from '@/components/meta/social-listening';


const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// Wrapper component to handle OAuth callback and project switching
const MetaAds = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const metaAdsEnabled = isModuleEnabled('meta_ads');

  // Handle OAuth callback params - only once on mount
  useEffect(() => {
    const metaConnected = searchParams.get('meta_connected');
    const metaError = searchParams.get('meta_error');

    if (metaConnected === 'true') {
      toast({
        title: 'Meta conectado!',
        description: 'Sua conta Meta foi conectada com sucesso.',
      });
      searchParams.delete('meta_connected');
      setSearchParams(searchParams);
      queryClient.invalidateQueries({ queryKey: ['meta_credentials'] });
    }

    if (metaError) {
      toast({
        title: 'Erro ao conectar Meta',
        description: metaError,
        variant: 'destructive',
      });
      searchParams.delete('meta_error');
      setSearchParams(searchParams);
    }
  }, []);

  // Show loading while project context or modules are loading
  if (projectLoading || modulesLoading) {
    return <CubeLoader />;
  }

  if (!currentProject?.id) {
    return <CubeLoader />;
  }

  // Check if module is enabled
  if (!metaAdsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Meta Ads" />
        <main className="container mx-auto px-6 py-8 flex items-center justify-center">
          <UITooltip>
            <TooltipTrigger asChild>
              <Card className="max-w-md cursor-help border-muted">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Facebook className="h-5 w-5" />
                    Módulo Meta Ads
                  </CardTitle>
                  <CardDescription>
                    Este módulo não está habilitado para o seu projeto.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Entre em contato com o suporte para ativar este recurso.
                  </p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p>Para ativar o módulo Meta Ads, entre em contato com nosso suporte pelo email suporte@cubo.app ou WhatsApp.</p>
            </TooltipContent>
          </UITooltip>
        </main>
      </div>
    );
  }

  // Key forces complete remount when project changes
  return <MetaAdsContent key={currentProject.id} projectId={currentProject.id} />;
};

// Main content component - completely remounts on project change
const MetaAdsContent = ({ projectId }: { projectId: string }) => {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Date range state - defaults to last 30 days
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [syncing, setSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  // Log mount for debugging
  useEffect(() => {
    console.log('[MetaAdsContent] Mounted with projectId:', projectId);
  }, [projectId]);

  // Connect to Meta
  const handleConnectMeta = async () => {
    if (!projectId || !user?.id) {
      toast({
        title: 'Erro',
        description: 'Selecione um projeto primeiro.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get signed state from backend for security
      const { data, error } = await supabase.functions.invoke('meta-oauth-state', {
        body: {
          projectId: projectId,
          redirectUrl: window.location.href.split('?')[0],
        },
      });

      if (error || !data?.state) {
        throw new Error(error?.message || 'Falha ao gerar estado de autenticação');
      }

      const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;
      const scope = 'ads_read,ads_management,business_management,pages_show_list,pages_read_engagement,pages_manage_engagement,instagram_basic,instagram_manage_comments,instagram_manage_insights';
      
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${data.state}&scope=${scope}&auth_type=rerequest&response_type=code`;
      
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error initiating Meta OAuth:', error);
      toast({
        title: 'Erro ao conectar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Fetch Meta credentials
  const { data: metaCredentials, isLoading: credentialsLoading, isError: credentialsError } = useQuery({
    queryKey: ['meta_credentials', projectId],
    queryFn: async () => {
      console.log('Fetching meta credentials for project:', projectId);
      const { data, error } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      console.log('Meta credentials result:', data);
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch ad accounts
  const { data: adAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['meta_ad_accounts', projectId],
    queryFn: async () => {
      console.log('Fetching ad accounts for project:', projectId);
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);
      if (error) throw error;
      console.log('Ad accounts result:', data);
      return data || [];
    },
    enabled: !!metaCredentials,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  });

  // Fetch campaigns - only from active accounts
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['meta_campaigns', projectId, adAccounts?.map(a => a.id).join(',')],
    queryFn: async () => {
      if (!adAccounts || adAccounts.length === 0) return [];
      
      const activeAccountIds = adAccounts.filter(a => a.is_active).map(a => a.account_id);
      if (activeAccountIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .order('campaign_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!metaCredentials && !!adAccounts && adAccounts.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  // Get active account IDs for consistent filtering
  const activeAccountIds = useMemo(() => {
    if (!adAccounts || adAccounts.length === 0) return [];
    return adAccounts.filter(a => a.is_active).map(a => a.account_id).sort();
  }, [adAccounts]);

  // Fetch adsets - only from active accounts
  const { data: adsets, isLoading: adsetsLoading } = useQuery({
    queryKey: ['meta_adsets', projectId, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('meta_adsets')
        .select('*')
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .order('adset_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!metaCredentials && !!adAccounts && adAccounts.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch ads - only from active accounts
  const { data: metaAds, isLoading: adsLoading } = useQuery({
    queryKey: ['meta_ads', projectId, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('meta_ads')
        .select('*')
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .order('ad_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!metaCredentials && !!adAccounts && adAccounts.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch insights - only from active accounts (now all ad-level)
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights, error: insightsError, isFetching } = useQuery({
    queryKey: ['meta_insights', projectId, startDate, endDate, activeAccountIds.join(',')],
    queryFn: async () => {
      console.log('[Insights] Starting fetch for accounts:', activeAccountIds);
      console.log('[Insights] Date range:', startDate, 'to', endDate);
      
      if (activeAccountIds.length === 0) {
        console.log('[Insights] No active accounts');
        return [];
      }
      
      // Fetch ad-level insights (the only level we have now)
      const { data, error, count } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', startDate)
        .lte('date_start', endDate)
        .order('date_start', { ascending: true });
      
      if (error) {
        console.error('[Insights] Query error:', error);
        throw error;
      }
      
      console.log(`[Insights] SUCCESS: Fetched ${data?.length || 0} ad-level records (count: ${count})`);
      console.log('[Insights] First record:', data?.[0]);
      console.log('[Insights] Total spend:', data?.reduce((sum, r) => sum + (r.spend || 0), 0));
      return data || [];
    },
    enabled: !!metaCredentials && activeAccountIds.length > 0,
    staleTime: 5000,
    gcTime: 10000,
    refetchOnWindowFocus: true,
  });

  // Debug: Log insights state changes
  useEffect(() => {
    console.log('[Insights State] Current:', {
      hasData: !!insights,
      count: insights?.length || 0,
      loading: insightsLoading,
      fetching: isFetching,
      error: insightsError?.message,
      totalsSpend: insights?.reduce((sum, r) => sum + (r.spend || 0), 0) || 0,
    });
  }, [insights, insightsLoading, isFetching, insightsError]);

  // Query to get the available date range in the database (now from ad-level insights)
  const { data: availableDateRange } = useQuery({
    queryKey: ['meta_insights_date_range', projectId, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return null;
      
      // Get min and max dates from ad-level insights
      const { data, error } = await supabase
        .from('meta_insights')
        .select('date_start')
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .not('ad_id', 'is', null)
        .order('date_start', { ascending: true });
      
      if (error || !data || data.length === 0) {
        console.log('[DateRange] No data available');
        return null;
      }
      
      const minDate = data[0]?.date_start;
      const maxDate = data[data.length - 1]?.date_start;
      
      console.log(`[DateRange] Available ad-level data: ${minDate} to ${maxDate} (${data.length} records)`);
      return { minDate, maxDate, count: data.length };
    },
    enabled: !!metaCredentials && activeAccountIds.length > 0,
    staleTime: 60000,
  });

  // VERIFICATION: Query to get the exact count from database (now ad-level)
  const { data: dbVerification } = useQuery({
    queryKey: ['meta_insights_verification', projectId, startDate, endDate, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return null;
      
      // Get count - ad-level insights only
      const { count, error } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .not('ad_id', 'is', null)
        .gte('date_start', startDate)
        .lte('date_start', endDate);
      
      if (error) {
        console.error('[Verification] Error:', error);
        return null;
      }
      
      console.log(`[Verification] DB ad-level record count: ${count}`);
      return { recordCount: count || 0 };
    },
    enabled: !!metaCredentials && activeAccountIds.length > 0,
    staleTime: 30000,
  });

  const isMetaExpired = metaCredentials?.expires_at 
    ? new Date(metaCredentials.expires_at) < new Date()
    : false;

  // Calculate estimated sync duration based on date range
  const getEstimatedSyncDuration = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Estimate: ~1 second per day, minimum 30s, maximum 180s
    return Math.max(30, Math.min(180, days));
  };

  const [estimatedDuration, setEstimatedDuration] = useState(30);

  // Sync data with specific accounts
  // Sync with forceRefresh option
  const handleSyncWithAccounts = async (accountIds: string[], forceRefresh: boolean = false) => {
    if (!projectId || !metaCredentials || accountIds.length === 0) return;

    setSyncing(true);
    const syncDuration = getEstimatedSyncDuration();
    setEstimatedDuration(syncDuration);
    
    try {
      console.log('Syncing insights for accounts:', accountIds, 'from', startDate, 'to', endDate, 'forceRefresh:', forceRefresh);
      const { data: insightsData, error: insightsError } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_insights',
          projectId: projectId,
          accountIds: accountIds,
          dateStart: startDate,
          dateStop: endDate,
          forceRefresh: forceRefresh, // Pass force refresh flag
        },
      });

      console.log('Insights sync result:', insightsData);
      if (insightsError) throw insightsError;

      // Calculate polling duration based on period
      const periodDays = insightsData?.periodDays || 30;
      const pollDurationMs = Math.max(30000, Math.min(180000, periodDays * 1000)); // 30s to 3min
      
      toast({
        title: forceRefresh ? 'Sincronização forçada em andamento...' : 'Sincronização em andamento...',
        description: insightsData?.message || `Aguarde até ${Math.ceil(pollDurationMs / 60000)} minuto(s) para os dados aparecerem.`,
      });

      // Poll for data every 15 seconds
      const pollCount = Math.ceil(pollDurationMs / 15000);
      for (let i = 1; i <= pollCount; i++) {
        setTimeout(() => {
          console.log(`[Poll ${i}/${pollCount}] Refreshing data...`);
          queryClient.invalidateQueries({ queryKey: ['meta_ad_accounts'] });
          queryClient.invalidateQueries({ queryKey: ['meta_campaigns'] });
          queryClient.invalidateQueries({ queryKey: ['meta_insights'] });
        }, i * 15000);
      }

      // Keep syncing state for the duration, then do final refresh
      setTimeout(async () => {
        setSyncing(false);
        
        // Force refetch all data
        console.log('[Final refresh] Forcing data reload...');
        await queryClient.invalidateQueries({ queryKey: ['meta_insights'] });
        await refetchInsights();
        
        toast({
          title: 'Sincronização concluída!',
          description: 'Os dados foram atualizados.',
        });
      }, pollDurationMs);

      return; // Don't set syncing false immediately

    } catch (error: any) {
      console.error('Sync error:', error);
      
      // Check if it's a timeout error - the sync might still be running in the background
      if (error.message?.includes('Failed to fetch') || error.message?.includes('timeout')) {
        toast({
          title: 'Sincronização pode estar em andamento',
          description: 'A conexão foi interrompida, mas os dados podem estar sendo processados. Atualize a página em alguns minutos.',
        });
        
        // Still poll for data in case it completes
        const pollIntervals = [30000, 60000, 90000, 120000, 150000, 180000];
        pollIntervals.forEach((delayMs) => {
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['meta_insights'] });
          }, delayMs);
        });
        
        setTimeout(() => {
          setSyncing(false);
          refetchInsights();
        }, 60000);
      } else {
        toast({
          title: 'Erro ao sincronizar',
          description: error.message || 'Não foi possível sincronizar os dados do Meta.',
          variant: 'destructive',
        });
        setSyncing(false);
      }
    }
  };

  // Force refresh - ignores cache
  const handleForceRefresh = async () => {
    if (!projectId || !metaCredentials || !adAccounts || adAccounts.length === 0) return;
    
    const accountIdsToSync = adAccounts.filter(a => a.is_active).map(a => a.account_id);
    setNeedsSync(false);
    await handleSyncWithAccounts(accountIdsToSync, true);
  };

  // Handle date changes - mark as needing sync
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setNeedsSync(true);
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setNeedsSync(true);
  };

  // Helper to format dates in readable format
  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = format(start, "dd MMM", { locale: ptBR });
    const endStr = format(end, "dd MMM", { locale: ptBR });
    return `${startStr} - ${endStr}`;
  };

  // Sync data from Meta API AND Hotmart (uses existing active accounts)
  const handleSyncData = async () => {
    if (!projectId || !metaCredentials) return;

    // If no accounts configured, show selector message
    if (!adAccounts || adAccounts.length === 0) {
      toast({
        title: 'Configure suas contas',
        description: 'Clique em "Contas" para selecionar as contas de anúncios.',
      });
      return;
    }

    setNeedsSync(false); // Clear the needs sync flag
    const accountIdsToSync = adAccounts.filter(a => a.is_active).map(a => a.account_id);
    
    // Sync Meta Ads
    await handleSyncWithAccounts(accountIdsToSync);
    
    // Also sync Hotmart sales
    try {
      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();
      
      const { data, error } = await supabase.functions.invoke('hotmart-api', {
        body: {
          projectId,
          action: 'sync_sales',
          startDate: startMs,
          endDate: endMs,
        },
      });
      
      if (error) {
        console.error('Hotmart sync error:', error);
      } else {
        const total = (data?.synced || 0) + (data?.updated || 0);
        if (total > 0) {
          toast({
            title: 'Hotmart sincronizado',
            description: `${total} vendas processadas`,
          });
        }
      }
    } catch (err) {
      console.error('Hotmart sync error:', err);
    }
  };

  // Calculate totals from insights
  const totals = insights?.reduce((acc, insight) => ({
    spend: acc.spend + (insight.spend || 0),
    impressions: acc.impressions + (insight.impressions || 0),
    clicks: acc.clicks + (insight.clicks || 0),
    reach: acc.reach + (insight.reach || 0),
  }), { spend: 0, impressions: 0, clicks: 0, reach: 0 }) || { spend: 0, impressions: 0, clicks: 0, reach: 0 };

  // Data integrity verification
  const dataIntegrity = useMemo(() => {
    const loadedCount = insights?.length || 0;
    const expectedCount = dbVerification?.recordCount || 0;
    const isComplete = expectedCount > 0 && loadedCount === expectedCount;
    const hasDiscrepancy = expectedCount > 0 && loadedCount !== expectedCount;
    const missingRecords = expectedCount - loadedCount;
    
    console.log(`[Integrity] Loaded: ${loadedCount}, Expected: ${expectedCount}, Complete: ${isComplete}`);
    
    return {
      loadedCount,
      expectedCount,
      isComplete,
      hasDiscrepancy,
      missingRecords,
    };
  }, [insights, dbVerification]);

  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100).toFixed(2) : '0.00';
  const avgCPC = totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0.00';
  const avgCPM = totals.impressions > 0 ? (totals.spend / totals.impressions * 1000).toFixed(2) : '0.00';

  // Prepare chart data - daily spending
  const dailySpendData = insights?.reduce((acc: any[], insight) => {
    const date = insight.date_start;
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.spend += insight.spend || 0;
      existing.clicks += insight.clicks || 0;
      existing.impressions += insight.impressions || 0;
    } else {
      acc.push({
        date,
        dateFormatted: format(new Date(date), 'dd/MM', { locale: ptBR }),
        spend: insight.spend || 0,
        clicks: insight.clicks || 0,
        impressions: insight.impressions || 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.date.localeCompare(b.date)) || [];

  // Show loading while checking credentials or resetting project
  if (credentialsLoading) {
    return <CubeLoader />;
  }

  if (!metaCredentials) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Meta Ads não conectado</CardTitle>
              <CardDescription>
                Conecte sua conta Meta para visualizar métricas de anúncios.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleConnectMeta} className="gap-2">
                <Facebook className="h-4 w-4" />
                Conectar Meta Ads
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-8 space-y-6">
        {/* Unified Filters Card */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {metaCredentials && (
                <Badge variant={isMetaExpired ? "destructive" : "secondary"} className="gap-1">
                  {isMetaExpired ? (
                    <><AlertCircle className="h-3 w-3" /> Token expirado</>
                  ) : (
                    <><CheckCircle className="h-3 w-3" /> Conectado</>
                  )}
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {formatDateRange()}
              </Button>
              <Button onClick={handleSyncData} disabled={syncing || isMetaExpired} variant="outline" size="sm" className="gap-2">
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar
              </Button>
            </div>
          </div>
          
          {/* Expandable Date Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleContent className="pt-4">
              <MetaDateFilters
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
              />
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Needs Sync Indicator - when date changed */}
        {needsSync && !syncing && adAccounts && adAccounts.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-foreground">Período alterado</p>
                  <p className="text-sm text-muted-foreground">Clique em Sincronizar para buscar dados do novo período.</p>
                </div>
              </div>
              <Button onClick={handleSyncData} disabled={syncing} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Sincronizar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">
              <TrendingUp className="h-4 w-4 mr-1" />
              Investimentos
            </TabsTrigger>
            <TabsTrigger value="roi">
              <BarChart3 className="h-4 w-4 mr-1" />
              Análise ROI
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-1">
              <Building2 className="h-4 w-4" />
              Contas Meta
              {adAccounts && adAccounts.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5">
                  {adAccounts.filter(a => a.is_active).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="publicos" className="gap-1">
              <Users className="h-4 w-4" />
              Públicos
            </TabsTrigger>
            <TabsTrigger value="social-listening" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              Social Listening
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Empty State - No accounts configured */}
            {(!adAccounts || adAccounts.length === 0) && !accountsLoading && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma conta configurada</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-md">
                    Selecione as contas de anúncio do Meta que deseja acompanhar neste projeto.
                  </p>
                  <Button onClick={() => setActiveTab('accounts')} className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Ir para Contas Meta
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Content when accounts exist */}
            {adAccounts && adAccounts.length > 0 && (
              <>
                {/* Syncing Indicator */}
                {syncing && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="py-4">
                      <SyncLoader 
                        showProgress={true} 
                        estimatedDuration={estimatedDuration}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className={dataIntegrity.hasDiscrepancy ? 'border-yellow-500/50' : dataIntegrity.isComplete ? 'border-green-500/30' : ''}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
                      <div className="flex items-center gap-2">
                        {dataIntegrity.isComplete && (
                          <UITooltip>
                            <TooltipTrigger>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </TooltipTrigger>
                            <TooltipContent>Dados verificados ({dataIntegrity.loadedCount} registros)</TooltipContent>
                          </UITooltip>
                        )}
                        {dataIntegrity.hasDiscrepancy && (
                          <UITooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>Faltam {dataIntegrity.missingRecords} registros</TooltipContent>
                          </UITooltip>
                        )}
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.spend)}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">CPM: R$ {avgCPM}</p>
                        <p className="text-xs text-muted-foreground">
                          {dataIntegrity.loadedCount}/{dataIntegrity.expectedCount} registros
                        </p>
                      </div>
                      {dataIntegrity.hasDiscrepancy && (
                        <p className="text-xs text-yellow-600 mt-1">
                          ⚠️ Dados incompletos - recarregue a página
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Impressões</CardTitle>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR').format(totals.impressions)}
                      </div>
                      <p className="text-xs text-muted-foreground">Alcance: {new Intl.NumberFormat('pt-BR').format(totals.reach)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cliques</CardTitle>
                      <MousePointer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('pt-BR').format(totals.clicks)}
                      </div>
                      <p className="text-xs text-muted-foreground">CPC: R$ {avgCPC}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">CTR</CardTitle>
                      <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgCTR}%</div>
                      <p className="text-xs text-muted-foreground">Taxa de cliques</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gasto Diário</CardTitle>
                      <CardDescription>Evolução do investimento por dia</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dailySpendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={dailySpendData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="dateFormatted" className="text-xs" />
                            <YAxis tickFormatter={(v) => `R$${v}`} className="text-xs" />
                            <RechartsTooltip 
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Gasto']}
                              labelFormatter={(label) => `Data: ${label}`}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Nenhum dado disponível. Clique em "Sincronizar" para carregar.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Cliques por Dia</CardTitle>
                      <CardDescription>Evolução de cliques no período</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {dailySpendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={dailySpendData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                            <XAxis dataKey="dateFormatted" className="text-xs" />
                            <YAxis className="text-xs" />
                            <RechartsTooltip 
                              formatter={(value: number) => [value, 'Cliques']}
                              labelFormatter={(label) => `Data: ${label}`}
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                            />
                            <Line type="monotone" dataKey="clicks" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ fill: 'hsl(var(--chart-2))' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Nenhum dado disponível.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Hierarchy Analysis */}
                <MetaHierarchyAnalysis
                  insights={insights || []}
                  campaigns={campaigns || []}
                  adsets={adsets || []}
                  ads={metaAds || []}
                  loading={insightsLoading || campaignsLoading || adsetsLoading || adsLoading}
                  onRefresh={handleSyncData}
                />
              </>
            )}

          </TabsContent>

          {/* ROI Analysis Tab */}
          <TabsContent value="roi" className="space-y-6">
            {(!adAccounts || adAccounts.length === 0) && !accountsLoading ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configure suas contas primeiro</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-md">
                    Selecione as contas de anúncio do Meta para visualizar a análise de ROI.
                  </p>
                  <Button onClick={() => setActiveTab('accounts')} variant="outline" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Ir para Contas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <MetaROIDashboard 
                projectId={projectId}
                activeAccountIds={activeAccountIds}
                startDate={startDate}
                endDate={endDate}
              />
            )}
          </TabsContent>

          <TabsContent value="accounts" className="space-y-6">
            <MetaAccountsManager 
              key={projectId}
              projectId={projectId} 
              onAccountsChange={() => {
                queryClient.invalidateQueries({ queryKey: ['meta_ad_accounts'] });
              }}
            />
          </TabsContent>

          <TabsContent value="publicos" className="space-y-6">
            {(!adAccounts || adAccounts.length === 0) && !accountsLoading ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configure suas contas primeiro</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-md">
                    Selecione as contas de anúncio do Meta para criar públicos personalizados.
                  </p>
                  <Button onClick={() => setActiveTab('accounts')} variant="outline" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Ir para Contas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <MetaAudiencesTab 
                projectId={projectId}
                adAccounts={adAccounts || []}
              />
            )}
          </TabsContent>

          <TabsContent value="social-listening" className="space-y-6">
            {(!adAccounts || adAccounts.length === 0) && !accountsLoading ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Configure suas contas primeiro</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-md">
                    Conecte suas contas do Meta para monitorar comentários e interações sociais.
                  </p>
                  <Button onClick={() => setActiveTab('accounts')} variant="outline" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Ir para Contas
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <SocialListeningTab projectId={projectId} />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MetaAds;
