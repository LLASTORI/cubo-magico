import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CubeLoader } from '@/components/CubeLoader';
import { Brain, TrendingUp, DollarSign, Activity, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AIUsageDashboardProps {
  projectId?: string;
}

export function AIUsageDashboard({ projectId }: AIUsageDashboardProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId);

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['admin-projects-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !projectId,
  });

  // Fetch AI usage data
  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ['ai-usage', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [dailyRes, monthlyRes, recentRes] = await Promise.all([
        supabase
          .from('ai_usage_tracking')
          .select('items_processed, cost_estimate, provider')
          .eq('project_id', selectedProjectId)
          .gte('created_at', startOfDay),
        supabase
          .from('ai_usage_tracking')
          .select('items_processed, cost_estimate, provider, feature')
          .eq('project_id', selectedProjectId)
          .gte('created_at', startOfMonth),
        supabase
          .from('ai_usage_tracking')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      const dailyItems = (dailyRes.data || []).reduce((sum, r) => sum + (r.items_processed || 0), 0);
      const dailyCost = (dailyRes.data || []).reduce((sum, r) => sum + parseFloat(String(r.cost_estimate) || '0'), 0);
      const monthlyItems = (monthlyRes.data || []).reduce((sum, r) => sum + (r.items_processed || 0), 0);
      const monthlyCost = (monthlyRes.data || []).reduce((sum, r) => sum + parseFloat(String(r.cost_estimate) || '0'), 0);

      // Provider breakdown
      const providerBreakdown: Record<string, number> = {};
      for (const r of monthlyRes.data || []) {
        providerBreakdown[r.provider] = (providerBreakdown[r.provider] || 0) + (r.items_processed || 0);
      }

      // Feature breakdown
      const featureBreakdown: Record<string, number> = {};
      for (const r of monthlyRes.data || []) {
        featureBreakdown[r.feature] = (featureBreakdown[r.feature] || 0) + (r.items_processed || 0);
      }

      return {
        daily: { items: dailyItems, cost: dailyCost },
        monthly: { items: monthlyItems, cost: monthlyCost },
        providerBreakdown,
        featureBreakdown,
        recent: recentRes.data || [],
      };
    },
    enabled: !!selectedProjectId,
  });

  // Fetch AI quota
  const { data: quotaData, isLoading: quotaLoading } = useQuery({
    queryKey: ['ai-quota', selectedProjectId],
    queryFn: async () => {
      if (!selectedProjectId) return null;

      const { data, error } = await supabase
        .from('ai_project_quotas')
        .select('*')
        .eq('project_id', selectedProjectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      return data || {
        daily_limit: 100,
        monthly_limit: 3000,
        current_daily_usage: 0,
        current_monthly_usage: 0,
        is_unlimited: false,
        provider_preference: 'openai'
      };
    },
    enabled: !!selectedProjectId,
  });

  const isLoading = usageLoading || quotaLoading;

  const dailyProgress = quotaData && !quotaData.is_unlimited
    ? Math.min(100, (quotaData.current_daily_usage / quotaData.daily_limit) * 100)
    : 0;

  const monthlyProgress = quotaData && !quotaData.is_unlimited
    ? Math.min(100, (quotaData.current_monthly_usage / quotaData.monthly_limit) * 100)
    : 0;

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      social_listening: 'Social Listening',
      survey_analysis: 'Análise de Pesquisas',
      funnel_analysis: 'Análise de Funil',
      chat: 'Chat/Atendimento',
    };
    return labels[feature] || feature;
  };

  const getProviderColor = (provider: string) => {
    return provider === 'openai' ? 'bg-green-500' : 'bg-purple-500';
  };

  return (
    <div className="space-y-6">
      {/* Project Selector (if not passed as prop) */}
      {!projectId && (
        <div className="flex items-center gap-4">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Selecione um projeto" />
            </SelectTrigger>
            <SelectContent>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetchUsage()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!selectedProjectId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecione um projeto para ver o uso de IA</p>
          </CardContent>
        </Card>
      )}

      {selectedProjectId && isLoading && <CubeLoader />}

      {selectedProjectId && !isLoading && (
        <>
          {/* Quota Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uso Diário</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quotaData?.current_daily_usage || 0}
                  {!quotaData?.is_unlimited && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {' '}/ {quotaData?.daily_limit || 100}
                    </span>
                  )}
                </div>
                {!quotaData?.is_unlimited && (
                  <Progress value={dailyProgress} className="mt-2" />
                )}
                {quotaData?.is_unlimited && (
                  <Badge variant="secondary" className="mt-2">Ilimitado</Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uso Mensal</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quotaData?.current_monthly_usage || 0}
                  {!quotaData?.is_unlimited && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {' '}/ {quotaData?.monthly_limit || 3000}
                    </span>
                  )}
                </div>
                {!quotaData?.is_unlimited && (
                  <Progress value={monthlyProgress} className="mt-2" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Hoje</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(usageData?.daily.cost || 0).toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usageData?.daily.items || 0} itens processados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Custo Mensal</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(usageData?.monthly.cost || 0).toFixed(4)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {usageData?.monthly.items || 0} itens processados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {dailyProgress >= 80 && !quotaData?.is_unlimited && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardContent className="flex items-center gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Quota diária quase esgotada
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Você usou {dailyProgress.toFixed(0)}% da sua quota diária de IA.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider and Feature Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por Provedor (Mês)</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(usageData?.providerBreakdown || {}).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum uso registrado</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(usageData?.providerBreakdown || {}).map(([provider, count]) => (
                      <div key={provider} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getProviderColor(provider)}`} />
                          <span className="capitalize">{provider}</span>
                        </div>
                        <Badge variant="outline">{count} itens</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Por Feature (Mês)</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(usageData?.featureBreakdown || {}).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum uso registrado</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(usageData?.featureBreakdown || {}).map(([feature, count]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <span>{getFeatureLabel(feature)}</span>
                        <Badge variant="outline">{count} itens</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso Recente</CardTitle>
              <CardDescription>Últimas 20 chamadas de IA</CardDescription>
            </CardHeader>
            <CardContent>
              {(usageData?.recent || []).length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum uso registrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Provedor</TableHead>
                      <TableHead className="text-right">Itens</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageData?.recent.map((usage: any) => (
                      <TableRow key={usage.id}>
                        <TableCell className="text-sm">
                          {format(new Date(usage.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getFeatureLabel(usage.feature)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {usage.action}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {usage.provider}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{usage.items_processed}</TableCell>
                        <TableCell className="text-right text-sm">
                          ${parseFloat(usage.cost_estimate || 0).toFixed(5)}
                        </TableCell>
                        <TableCell>
                          {usage.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
