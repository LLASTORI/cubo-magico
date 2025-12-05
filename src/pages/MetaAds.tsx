import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, TrendingUp, DollarSign, Eye, MousePointer, Target, Calendar, Facebook, AlertCircle, CheckCircle, Loader2, Settings2, Filter, Building2, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const META_APP_ID = '845927421602166';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { SyncLoader } from '@/components/SyncLoader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MetaAccountSelector } from '@/components/MetaAccountSelector';
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
import { MetaCampaignSync } from '@/components/meta/MetaCampaignSync';
import { CuboMagicoDashboard } from '@/components/funnel/CuboMagicoDashboard';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

// Wrapper component to handle OAuth callback and project switching
const MetaAds = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentProject, loading: projectLoading } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Show loading while project context is loading
  if (projectLoading || !currentProject?.id) {
    return <CubeLoader />;
  }

  // Key forces complete remount when project changes
  return <MetaAdsContent key={currentProject.id} projectId={currentProject.id} />;
};

// Main content component - completely remounts on project change
const MetaAdsContent = ({ projectId }: { projectId: string }) => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Date range state
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [syncing, setSyncing] = useState(false);
  const [needsSync, setNeedsSync] = useState(false); // Track if date changed and needs sync

  // CRITICAL: Clear ALL meta queries on mount to ensure fresh data for this project
  useEffect(() => {
    console.log('[MetaAdsContent] Mounting with projectId:', projectId, '- clearing all meta caches');
    
    // Remove all meta queries to force completely fresh fetch
    queryClient.removeQueries({ queryKey: ['meta_credentials'] });
    queryClient.removeQueries({ queryKey: ['meta_ad_accounts'] });
    queryClient.removeQueries({ queryKey: ['meta_campaigns'] });
    queryClient.removeQueries({ queryKey: ['meta_insights'] });
    
    // Small delay to ensure queries are cleared before they start
    return () => {
      console.log('[MetaAdsContent] Unmounting projectId:', projectId);
    };
  }, [projectId, queryClient]);

  // Connect to Meta
  const handleConnectMeta = () => {
    if (!projectId || !user?.id) {
      toast({
        title: 'Erro',
        description: 'Selecione um projeto primeiro.',
        variant: 'destructive',
      });
      return;
    }

    const state = btoa(JSON.stringify({
      projectId: projectId,
      userId: user.id,
      redirectUrl: window.location.href.split('?')[0],
    }));

    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;
    const scope = 'ads_read,ads_management,business_management';
    
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
    
    window.location.href = authUrl;
  };

  // Handle accounts selection callback
  const handleAccountsSelected = (accountIds: string[]) => {
    queryClient.invalidateQueries({ queryKey: ['meta_ad_accounts'] });
    // Auto-sync after selection
    handleSyncWithAccounts(accountIds);
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

  // Fetch insights - only from active accounts (with pagination to get ALL data)
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    // CRITICAL: queryKey must match EXACTLY what we filter by
    queryKey: ['meta_insights', projectId, startDate, endDate, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return [];
      
      // Fetch ALL insights using pagination (Supabase default limit is 1000)
      const PAGE_SIZE = 1000;
      const MAX_PAGES = 20; // Safety limit to prevent infinite loops
      let allInsights: any[] = [];
      let page = 0;
      
      while (page < MAX_PAGES) {
        // Filter insights that OVERLAP with the selected period
        // date_start >= startDate AND date_start <= endDate (simpler and more accurate)
        const { data, error, count } = await supabase
          .from('meta_insights')
          .select('*', { count: 'exact' })
          .eq('project_id', projectId)
          .in('ad_account_id', activeAccountIds)
          .gte('date_start', startDate)
          .lte('date_start', endDate)
          .order('date_start', { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allInsights = [...allInsights, ...data];
          console.log(`[Insights] Page ${page + 1}: fetched ${data.length} records (total so far: ${allInsights.length}${count ? `, expected: ${count}` : ''})`);
          
          // Stop if we got less than PAGE_SIZE (no more data) or reached expected count
          if (data.length < PAGE_SIZE || (count && allInsights.length >= count)) {
            break;
          }
          page++;
        } else {
          break;
        }
      }
      
      console.log(`[Insights] TOTAL: ${allInsights.length} records across ${page + 1} pages`);
      return allInsights;
    },
    enabled: !!metaCredentials && !!adAccounts && adAccounts.length > 0,
    staleTime: 0,
    gcTime: 0,
  });

  // VERIFICATION: Query to get the exact SUM from database for comparison
  const { data: dbVerification } = useQuery({
    queryKey: ['meta_insights_verification', projectId, startDate, endDate, activeAccountIds.join(',')],
    queryFn: async () => {
      if (activeAccountIds.length === 0) return null;
      
      // Get count and we'll calculate sum from fetched data
      const { count, error } = await supabase
        .from('meta_insights')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .in('ad_account_id', activeAccountIds)
        .gte('date_start', startDate)
        .lte('date_start', endDate);
      
      if (error) {
        console.error('[Verification] Error:', error);
        return null;
      }
      
      console.log(`[Verification] DB record count: ${count}`);
      return { recordCount: count || 0 };
    },
    enabled: !!metaCredentials && activeAccountIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
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

  // Sync data from Meta API (uses existing active accounts)
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
    await handleSyncWithAccounts(accountIdsToSync);
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
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Link>
                <div className="flex items-center gap-2">
                  <Facebook className="h-6 w-6 text-[#1877F2]" />
                  <h1 className="text-xl font-bold text-foreground">Meta Ads</h1>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

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
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
              <div className="flex items-center gap-2">
                <Facebook className="h-6 w-6 text-[#1877F2]" />
                <h1 className="text-xl font-bold text-foreground">Meta Ads Dashboard</h1>
              </div>
              {metaCredentials && (
                <Badge variant={isMetaExpired ? "destructive" : "secondary"} className="gap-1">
                  {isMetaExpired ? (
                    <><AlertCircle className="h-3 w-3" /> Token expirado</>
                  ) : (
                    <><CheckCircle className="h-3 w-3" /> Conectado</>
                  )}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
                {startDate} - {endDate}
              </Button>
              <MetaAccountSelector 
                projectId={projectId} 
                onAccountsSelected={handleAccountsSelected}
              >
                <Button variant="outline" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Contas {adAccounts && adAccounts.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{adAccounts.length}</Badge>
                  )}
                </Button>
              </MetaAccountSelector>
              <div className="flex items-center gap-1">
                <Button onClick={handleSyncData} disabled={syncing || isMetaExpired} variant="outline" className="gap-2">
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar
                </Button>
                <Button 
                  onClick={handleForceRefresh} 
                  disabled={syncing || isMetaExpired || !adAccounts || adAccounts.length === 0} 
                  variant="ghost" 
                  size="icon"
                  title="Forçar refresh completo (ignora cache)"
                  className="h-9 w-9"
                >
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">
              <TrendingUp className="h-4 w-4 mr-1" />
              Investimentos
            </TabsTrigger>
            <TabsTrigger value="cubo-magico">
              <Target className="h-4 w-4 mr-1" />
              Cubo Mágico
            </TabsTrigger>
            <TabsTrigger value="roi">
              <BarChart3 className="h-4 w-4 mr-1" />
              Análise ROI
            </TabsTrigger>
            <TabsTrigger value="accounts">
              <Building2 className="h-4 w-4 mr-1" />
              Contas Meta
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
                  <MetaAccountSelector 
                    projectId={projectId} 
                    onAccountsSelected={handleAccountsSelected}
                  >
                    <Button className="gap-2">
                      <Settings2 className="h-4 w-4" />
                      Selecionar Contas
                    </Button>
                  </MetaAccountSelector>
                </CardContent>
              </Card>
            )}

            {/* Date Filters - only show when accounts exist */}
            {adAccounts && adAccounts.length > 0 && (
              <>
                <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                  <CollapsibleContent>
                    <Card className="p-4 mb-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Filter className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold text-foreground">Filtros de Data</h2>
                      </div>
                      <MetaDateFilters
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={handleStartDateChange}
                        onEndDateChange={handleEndDateChange}
                      />
                    </Card>
                  </CollapsibleContent>
                </Collapsible>

                {/* Needs Sync Indicator - when date changed */}
                {needsSync && !syncing && (
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
              <div className="space-y-4">
                <MetaCampaignSync 
                  projectId={projectId}
                  accountIds={activeAccountIds}
                />
                <MetaROIDashboard 
                  projectId={projectId}
                  activeAccountIds={activeAccountIds}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="cubo-magico" className="space-y-6">
            <CuboMagicoDashboard projectId={projectId} />
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
        </Tabs>
      </main>
    </div>
  );
};

export default MetaAds;
