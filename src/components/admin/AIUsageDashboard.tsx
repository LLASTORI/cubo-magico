import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CubeLoader } from '@/components/CubeLoader';
import { Brain, TrendingUp, DollarSign, Activity, RefreshCw, AlertTriangle, CheckCircle2, Settings, RotateCcw, Infinity } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface AIUsageDashboardProps {
  projectId?: string;
}

export function AIUsageDashboard({ projectId }: AIUsageDashboardProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    daily_limit: 100,
    monthly_limit: 3000,
    is_unlimited: false,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  const { data: quotaData, isLoading: quotaLoading, refetch: refetchQuota } = useQuery({
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

  // Update quota mutation
  const updateQuotaMutation = useMutation({
    mutationFn: async (values: { daily_limit: number; monthly_limit: number; is_unlimited: boolean }) => {
      if (!selectedProjectId) throw new Error('Projeto não selecionado');

      const { data: existing } = await supabase
        .from('ai_project_quotas')
        .select('id')
        .eq('project_id', selectedProjectId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('ai_project_quotas')
          .update({
            daily_limit: values.daily_limit,
            monthly_limit: values.monthly_limit,
            is_unlimited: values.is_unlimited,
            updated_at: new Date().toISOString(),
          })
          .eq('project_id', selectedProjectId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_project_quotas')
          .insert({
            project_id: selectedProjectId,
            daily_limit: values.daily_limit,
            monthly_limit: values.monthly_limit,
            is_unlimited: values.is_unlimited,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Cota atualizada com sucesso!' });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['ai-quota', selectedProjectId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar cota', description: error.message, variant: 'destructive' });
    },
  });

  // Reset daily usage mutation
  const resetDailyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Projeto não selecionado');
      
      const { error } = await supabase
        .from('ai_project_quotas')
        .update({
          current_daily_usage: 0,
          last_daily_reset: new Date().toISOString(),
        })
        .eq('project_id', selectedProjectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Uso diário resetado!' });
      queryClient.invalidateQueries({ queryKey: ['ai-quota', selectedProjectId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao resetar', description: error.message, variant: 'destructive' });
    },
  });

  // Reset monthly usage mutation
  const resetMonthlyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProjectId) throw new Error('Projeto não selecionado');
      
      const { error } = await supabase
        .from('ai_project_quotas')
        .update({
          current_monthly_usage: 0,
          last_monthly_reset: new Date().toISOString(),
        })
        .eq('project_id', selectedProjectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Uso mensal resetado!' });
      queryClient.invalidateQueries({ queryKey: ['ai-quota', selectedProjectId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao resetar', description: error.message, variant: 'destructive' });
    },
  });

  const openEditDialog = () => {
    if (quotaData) {
      setEditForm({
        daily_limit: quotaData.daily_limit || 100,
        monthly_limit: quotaData.monthly_limit || 3000,
        is_unlimited: quotaData.is_unlimited || false,
      });
    }
    setEditDialogOpen(true);
  };

  const handleSaveQuota = () => {
    updateQuotaMutation.mutate(editForm);
  };

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
          <Button variant="outline" size="icon" onClick={() => { refetchUsage(); refetchQuota(); }}>
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
          {/* Quota Management Card */}
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Gerenciar Cotas de IA
                </CardTitle>
                <CardDescription>
                  Configure os limites de uso de IA para este projeto
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => resetDailyMutation.mutate()} disabled={resetDailyMutation.isPending}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Diário
                </Button>
                <Button variant="outline" size="sm" onClick={() => resetMonthlyMutation.mutate()} disabled={resetMonthlyMutation.isPending}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset Mensal
                </Button>
                <Button size="sm" onClick={openEditDialog}>
                  <Settings className="h-4 w-4 mr-1" />
                  Editar Limites
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Limite Diário:</span>
                  <span className="ml-2 font-medium">
                    {quotaData?.is_unlimited ? (
                      <Badge variant="secondary" className="gap-1"><Infinity className="h-3 w-3" />Ilimitado</Badge>
                    ) : (
                      quotaData?.daily_limit || 100
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Limite Mensal:</span>
                  <span className="ml-2 font-medium">
                    {quotaData?.is_unlimited ? (
                      <Badge variant="secondary" className="gap-1"><Infinity className="h-3 w-3" />Ilimitado</Badge>
                    ) : (
                      quotaData?.monthly_limit || 3000
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2">
                    {quotaData?.is_unlimited ? (
                      <Badge className="bg-green-500">Sem Limites</Badge>
                    ) : dailyProgress >= 100 ? (
                      <Badge variant="destructive">Cota Excedida</Badge>
                    ) : dailyProgress >= 80 ? (
                      <Badge variant="secondary" className="bg-yellow-500 text-white">Quase no Limite</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">Normal</Badge>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

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

      {/* Edit Quota Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Limites de Cota IA</DialogTitle>
            <DialogDescription>
              Configure os limites diários e mensais de chamadas de IA para este projeto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Uso Ilimitado</Label>
                <p className="text-sm text-muted-foreground">
                  Remover todos os limites de uso
                </p>
              </div>
              <Switch
                checked={editForm.is_unlimited}
                onCheckedChange={(checked) => setEditForm({ ...editForm, is_unlimited: checked })}
              />
            </div>
            
            {!editForm.is_unlimited && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="daily_limit">Limite Diário</Label>
                  <Input
                    id="daily_limit"
                    type="number"
                    value={editForm.daily_limit}
                    onChange={(e) => setEditForm({ ...editForm, daily_limit: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número máximo de chamadas de IA por dia
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_limit">Limite Mensal</Label>
                  <Input
                    id="monthly_limit"
                    type="number"
                    value={editForm.monthly_limit}
                    onChange={(e) => setEditForm({ ...editForm, monthly_limit: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Número máximo de chamadas de IA por mês
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveQuota} disabled={updateQuotaMutation.isPending}>
              {updateQuotaMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
