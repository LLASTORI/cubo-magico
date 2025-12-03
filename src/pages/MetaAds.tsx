import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, TrendingUp, DollarSign, Eye, MousePointer, Target, Calendar, Facebook, AlertCircle, CheckCircle, Loader2, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MetaAccountSelector } from '@/components/MetaAccountSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const MetaAds = () => {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState('7');
  const [syncing, setSyncing] = useState(false);

  // Handle accounts selection callback
  const handleAccountsSelected = (accountIds: string[]) => {
    queryClient.invalidateQueries({ queryKey: ['meta_ad_accounts'] });
    // Auto-sync after selection
    handleSyncWithAccounts(accountIds);
  };

  // Fetch Meta credentials
  const { data: metaCredentials, isLoading: credentialsLoading } = useQuery({
    queryKey: ['meta_credentials', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;
      const { data, error } = await supabase
        .from('meta_credentials')
        .select('*')
        .eq('project_id', currentProject.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!currentProject?.id,
  });

  // Fetch ad accounts
  const { data: adAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['meta_ad_accounts', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const { data, error } = await supabase
        .from('meta_ad_accounts')
        .select('*')
        .eq('project_id', currentProject.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id && !!metaCredentials,
  });

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['meta_campaigns', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('campaign_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id && !!metaCredentials,
  });

  // Fetch insights
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['meta_insights', currentProject?.id, dateRange],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('project_id', currentProject.id)
        .gte('date_start', startDate)
        .lte('date_stop', endDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentProject?.id && !!metaCredentials,
  });

  const isMetaExpired = metaCredentials?.expires_at 
    ? new Date(metaCredentials.expires_at) < new Date()
    : false;

  // Sync data with specific accounts
  const handleSyncWithAccounts = async (accountIds: string[]) => {
    if (!currentProject?.id || !metaCredentials || accountIds.length === 0) return;

    setSyncing(true);
    try {
      const startDate = format(subDays(new Date(), parseInt(dateRange)), 'yyyy-MM-dd');
      const endDate = format(new Date(), 'yyyy-MM-dd');

      console.log('Syncing insights for accounts:', accountIds);
      const { data: insightsData, error: insightsError } = await supabase.functions.invoke('meta-api', {
        body: {
          action: 'sync_insights',
          projectId: currentProject.id,
          accountIds: accountIds,
          dateStart: startDate,
          dateStop: endDate,
        },
      });

      console.log('Insights sync result:', insightsData);
      if (insightsError) throw insightsError;

      toast({
        title: 'Sincronização iniciada!',
        description: 'Os dados serão atualizados em alguns segundos. Aguarde e atualize.',
      });

      // Auto-refresh data after a delay
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['meta_ad_accounts'] });
        queryClient.invalidateQueries({ queryKey: ['meta_campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['meta_insights'] });
      }, 5000);

    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Erro ao sincronizar',
        description: error.message || 'Não foi possível sincronizar os dados do Meta.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Sync data from Meta API (uses existing active accounts)
  const handleSyncData = async () => {
    if (!currentProject?.id || !metaCredentials) return;

    // If no accounts configured, show selector message
    if (!adAccounts || adAccounts.length === 0) {
      toast({
        title: 'Configure suas contas',
        description: 'Clique em "Contas" para selecionar as contas de anúncios.',
      });
      return;
    }

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

  // Campaign performance data
  const campaignData = campaigns?.map(campaign => {
    const campaignInsights = insights?.filter(i => i.campaign_id === campaign.campaign_id) || [];
    const totalSpend = campaignInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const totalClicks = campaignInsights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    const totalImpressions = campaignInsights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    
    return {
      name: campaign.campaign_name || 'Sem nome',
      status: campaign.status,
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(2) : '0.00',
    };
  }).sort((a, b) => b.spend - a.spend) || [];

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
              <Button onClick={() => navigate('/settings')} className="gap-2">
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
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimos 14 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="60">Últimos 60 dias</SelectItem>
                </SelectContent>
              </Select>
              <MetaAccountSelector 
                projectId={currentProject?.id || ''} 
                onAccountsSelected={handleAccountsSelected}
              >
                <Button variant="outline" className="gap-2">
                  <Settings2 className="h-4 w-4" />
                  Contas {adAccounts && adAccounts.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{adAccounts.length}</Badge>
                  )}
                </Button>
              </MetaAccountSelector>
              <Button onClick={handleSyncData} disabled={syncing || isMetaExpired} variant="outline" className="gap-2">
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sincronizar
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.spend)}
              </div>
              <p className="text-xs text-muted-foreground">CPM: R$ {avgCPM}</p>
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
                    <Tooltip 
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
                    <Tooltip 
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

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Campanhas</CardTitle>
            <CardDescription>Performance por campanha no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {campaignData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Impressões</TableHead>
                    <TableHead className="text-right">Cliques</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignData.slice(0, 10).map((campaign, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {campaign.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {campaign.status === 'ACTIVE' ? 'Ativo' : campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(campaign.spend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR').format(campaign.impressions)}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat('pt-BR').format(campaign.clicks)}
                      </TableCell>
                      <TableCell className="text-right">{campaign.ctr}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma campanha encontrada. Clique em "Sincronizar" para carregar os dados.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ad Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Contas de Anúncio</CardTitle>
            <CardDescription>Contas conectadas ao projeto</CardDescription>
          </CardHeader>
          <CardContent>
            {adAccounts && adAccounts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {adAccounts.map((account) => (
                  <div key={account.id} className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Facebook className="h-4 w-4 text-[#1877F2]" />
                      <span className="font-medium truncate">{account.account_name || account.account_id}</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>ID: {account.account_id}</p>
                      {account.currency && <p>Moeda: {account.currency}</p>}
                      {account.timezone_name && <p>Fuso: {account.timezone_name}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma conta de anúncio sincronizada. Clique em "Sincronizar" para carregar.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MetaAds;
