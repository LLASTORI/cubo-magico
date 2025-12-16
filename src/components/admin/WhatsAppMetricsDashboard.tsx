import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  TrendingUp,
  RefreshCw,
  Zap,
  Server
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface WebhookStats {
  webhook_type: string;
  total_count: number;
  success_count: number;
  error_count: number;
  avg_processing_time_ms: number;
  requests_per_minute: number;
}

interface ProjectMetrics {
  project_id: string;
  project_name: string;
  total_webhooks: number;
  success_rate: number;
  avg_processing_time: number;
  active_conversations: number;
  queued_conversations: number;
  online_agents: number;
  total_agents: number;
}

interface Alert {
  id: string;
  severity: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  project_name?: string;
  timestamp: Date;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export function WhatsAppMetricsDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24');
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalWebhooks: 0,
    successRate: 0,
    avgProcessingTime: 0,
    activeConversations: 0,
    queuedConversations: 0,
    onlineAgents: 0,
    totalAgents: 0
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [webhookTrend, setWebhookTrend] = useState<any[]>([]);

  const fetchMetrics = async () => {
    try {
      const hoursAgo = new Date();
      hoursAgo.setHours(hoursAgo.getHours() - parseInt(timeRange));

      // Fetch webhook metrics grouped by project
      const { data: webhookData, error: webhookError } = await supabase
        .from('webhook_metrics')
        .select(`
          project_id,
          webhook_type,
          success,
          processing_time_ms,
          processed_at,
          error_message
        `)
        .gte('processed_at', hoursAgo.toISOString())
        .order('processed_at', { ascending: false });

      if (webhookError) throw webhookError;

      // Fetch projects for names
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name');

      const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

      // Fetch conversations
      const { data: conversations } = await supabase
        .from('whatsapp_conversations')
        .select('project_id, status, queue_position');

      // Fetch agents
      const { data: agents } = await supabase
        .from('whatsapp_agents')
        .select('project_id, status, is_active');

      // Process metrics per project
      const projectStatsMap = new Map<string, {
        webhooks: any[];
        conversations: any[];
        agents: any[];
      }>();

      webhookData?.forEach(w => {
        if (!projectStatsMap.has(w.project_id)) {
          projectStatsMap.set(w.project_id, { webhooks: [], conversations: [], agents: [] });
        }
        projectStatsMap.get(w.project_id)!.webhooks.push(w);
      });

      conversations?.forEach(c => {
        if (!projectStatsMap.has(c.project_id)) {
          projectStatsMap.set(c.project_id, { webhooks: [], conversations: [], agents: [] });
        }
        projectStatsMap.get(c.project_id)!.conversations.push(c);
      });

      agents?.forEach(a => {
        if (!projectStatsMap.has(a.project_id)) {
          projectStatsMap.set(a.project_id, { webhooks: [], conversations: [], agents: [] });
        }
        projectStatsMap.get(a.project_id)!.agents.push(a);
      });

      // Calculate metrics per project
      const metricsArray: ProjectMetrics[] = [];
      const newAlerts: Alert[] = [];

      let globalTotalWebhooks = 0;
      let globalSuccessCount = 0;
      let globalTotalProcessingTime = 0;
      let globalActiveConversations = 0;
      let globalQueuedConversations = 0;
      let globalOnlineAgents = 0;
      let globalTotalAgents = 0;

      projectStatsMap.forEach((stats, projectId) => {
        const projectName = projectMap.get(projectId) || 'Projeto Desconhecido';
        
        const totalWebhooks = stats.webhooks.length;
        const successCount = stats.webhooks.filter(w => w.success).length;
        const successRate = totalWebhooks > 0 ? (successCount / totalWebhooks) * 100 : 100;
        const avgProcessingTime = totalWebhooks > 0 
          ? stats.webhooks.reduce((acc, w) => acc + (w.processing_time_ms || 0), 0) / totalWebhooks 
          : 0;

        const activeConversations = stats.conversations.filter(c => c.status === 'open').length;
        const queuedConversations = stats.conversations.filter(c => c.status === 'pending').length;
        const onlineAgents = stats.agents.filter(a => a.is_active && a.status === 'online').length;
        const totalAgents = stats.agents.filter(a => a.is_active).length;

        // Update global stats
        globalTotalWebhooks += totalWebhooks;
        globalSuccessCount += successCount;
        globalTotalProcessingTime += stats.webhooks.reduce((acc, w) => acc + (w.processing_time_ms || 0), 0);
        globalActiveConversations += activeConversations;
        globalQueuedConversations += queuedConversations;
        globalOnlineAgents += onlineAgents;
        globalTotalAgents += totalAgents;

        metricsArray.push({
          project_id: projectId,
          project_name: projectName,
          total_webhooks: totalWebhooks,
          success_rate: successRate,
          avg_processing_time: avgProcessingTime,
          active_conversations: activeConversations,
          queued_conversations: queuedConversations,
          online_agents: onlineAgents,
          total_agents: totalAgents
        });

        // Generate alerts
        if (successRate < 90 && totalWebhooks > 10) {
          newAlerts.push({
            id: `error-${projectId}`,
            severity: 'error',
            title: 'Alta taxa de erros',
            message: `Taxa de sucesso de apenas ${successRate.toFixed(1)}% nos webhooks`,
            project_name: projectName,
            timestamp: new Date()
          });
        }

        if (avgProcessingTime > 2000) {
          newAlerts.push({
            id: `slow-${projectId}`,
            severity: 'warning',
            title: 'Processamento lento',
            message: `Tempo médio de ${avgProcessingTime.toFixed(0)}ms (esperado < 2000ms)`,
            project_name: projectName,
            timestamp: new Date()
          });
        }

        if (queuedConversations > 10 && onlineAgents === 0) {
          newAlerts.push({
            id: `queue-${projectId}`,
            severity: 'error',
            title: 'Fila sem atendentes',
            message: `${queuedConversations} conversas na fila e nenhum atendente online`,
            project_name: projectName,
            timestamp: new Date()
          });
        }

        if (queuedConversations > 5 && onlineAgents > 0) {
          newAlerts.push({
            id: `queue-high-${projectId}`,
            severity: 'warning',
            title: 'Fila alta',
            message: `${queuedConversations} conversas aguardando com ${onlineAgents} atendentes`,
            project_name: projectName,
            timestamp: new Date()
          });
        }
      });

      setProjectMetrics(metricsArray.sort((a, b) => b.total_webhooks - a.total_webhooks));
      setAlerts(newAlerts.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }));

      setGlobalStats({
        totalWebhooks: globalTotalWebhooks,
        successRate: globalTotalWebhooks > 0 ? (globalSuccessCount / globalTotalWebhooks) * 100 : 100,
        avgProcessingTime: globalTotalWebhooks > 0 ? globalTotalProcessingTime / globalTotalWebhooks : 0,
        activeConversations: globalActiveConversations,
        queuedConversations: globalQueuedConversations,
        onlineAgents: globalOnlineAgents,
        totalAgents: globalTotalAgents
      });

      // Calculate webhook trend (hourly)
      const trendMap = new Map<string, { hour: string; total: number; success: number; errors: number }>();
      webhookData?.forEach(w => {
        const hour = new Date(w.processed_at).toLocaleTimeString('pt-BR', { hour: '2-digit' });
        if (!trendMap.has(hour)) {
          trendMap.set(hour, { hour, total: 0, success: 0, errors: 0 });
        }
        const entry = trendMap.get(hour)!;
        entry.total++;
        if (w.success) {
          entry.success++;
        } else {
          entry.errors++;
        }
      });

      setWebhookTrend(Array.from(trendMap.values()).slice(-12));

    } catch (error: any) {
      console.error('Error fetching metrics:', error);
      toast({ title: 'Erro ao carregar métricas', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const chartConfig = {
    success: { label: 'Sucesso', color: 'hsl(var(--chart-1))' },
    errors: { label: 'Erros', color: 'hsl(var(--destructive))' },
    total: { label: 'Total', color: 'hsl(var(--primary))' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold">WhatsApp Metrics</h2>
            <p className="text-sm text-muted-foreground">Monitoramento em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Última hora</SelectItem>
              <SelectItem value="6">Últimas 6 horas</SelectItem>
              <SelectItem value="24">Últimas 24 horas</SelectItem>
              <SelectItem value="72">Últimos 3 dias</SelectItem>
              <SelectItem value="168">Última semana</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <div 
                key={alert.id} 
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === 'error' ? 'bg-destructive/10' : 
                  alert.severity === 'warning' ? 'bg-amber-500/10' : 
                  'bg-blue-500/10'
                }`}
              >
                {alert.severity === 'error' ? (
                  <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                ) : alert.severity === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                ) : (
                  <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.title}</span>
                    {alert.project_name && (
                      <Badge variant="outline" className="text-xs">{alert.project_name}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalWebhooks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Webhooks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${globalStats.successRate >= 95 ? 'bg-green-500/10' : globalStats.successRate >= 90 ? 'bg-amber-500/10' : 'bg-destructive/10'}`}>
                {globalStats.successRate >= 95 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : globalStats.successRate >= 90 ? (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.successRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${globalStats.avgProcessingTime < 1000 ? 'bg-green-500/10' : globalStats.avgProcessingTime < 2000 ? 'bg-amber-500/10' : 'bg-destructive/10'}`}>
                <Clock className={`w-5 h-5 ${globalStats.avgProcessingTime < 1000 ? 'text-green-500' : globalStats.avgProcessingTime < 2000 ? 'text-amber-500' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.avgProcessingTime.toFixed(0)}ms</p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <MessageCircle className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.activeConversations}</p>
                <p className="text-xs text-muted-foreground">Conversas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${globalStats.queuedConversations === 0 ? 'bg-green-500/10' : globalStats.queuedConversations < 5 ? 'bg-amber-500/10' : 'bg-destructive/10'}`}>
                <Server className={`w-5 h-5 ${globalStats.queuedConversations === 0 ? 'text-green-500' : globalStats.queuedConversations < 5 ? 'text-amber-500' : 'text-destructive'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.queuedConversations}</p>
                <p className="text-xs text-muted-foreground">Na Fila</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.onlineAgents}</p>
                <p className="text-xs text-muted-foreground">Atendentes Online</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalAgents}</p>
                <p className="text-xs text-muted-foreground">Total Atendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tendência de Webhooks</CardTitle>
            <CardDescription>Webhooks processados por hora</CardDescription>
          </CardHeader>
          <CardContent>
            {webhookTrend.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={webhookTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="success" name="Sucesso" fill="hsl(var(--chart-1))" stackId="a" />
                    <Bar dataKey="errors" name="Erros" fill="hsl(var(--destructive))" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados no período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Rate by Project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Taxa de Sucesso por Projeto</CardTitle>
            <CardDescription>Top 5 projetos com mais webhooks</CardDescription>
          </CardHeader>
          <CardContent>
            {projectMetrics.length > 0 ? (
              <div className="space-y-4">
                {projectMetrics.slice(0, 5).map((pm) => (
                  <div key={pm.project_id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate max-w-[200px]">{pm.project_name}</span>
                      <span className={pm.success_rate >= 95 ? 'text-green-500' : pm.success_rate >= 90 ? 'text-amber-500' : 'text-destructive'}>
                        {pm.success_rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={pm.success_rate} 
                      className={`h-2 ${pm.success_rate >= 95 ? '[&>div]:bg-green-500' : pm.success_rate >= 90 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive'}`}
                    />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{pm.total_webhooks} webhooks</span>
                      <span>{pm.avg_processing_time.toFixed(0)}ms avg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados no período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas por Projeto</CardTitle>
          <CardDescription>Visão detalhada de cada projeto</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead className="text-right">Webhooks</TableHead>
                <TableHead className="text-right">Taxa Sucesso</TableHead>
                <TableHead className="text-right">Tempo Médio</TableHead>
                <TableHead className="text-right">Conversas</TableHead>
                <TableHead className="text-right">Fila</TableHead>
                <TableHead className="text-right">Atendentes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectMetrics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nenhum projeto com dados de WhatsApp no período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                projectMetrics.map((pm) => {
                  const hasIssues = pm.success_rate < 90 || pm.avg_processing_time > 2000 || (pm.queued_conversations > 5 && pm.online_agents === 0);
                  const hasWarnings = pm.success_rate < 95 || pm.avg_processing_time > 1000 || pm.queued_conversations > 3;
                  
                  return (
                    <TableRow key={pm.project_id}>
                      <TableCell className="font-medium">{pm.project_name}</TableCell>
                      <TableCell className="text-right">{pm.total_webhooks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={pm.success_rate >= 95 ? 'text-green-500' : pm.success_rate >= 90 ? 'text-amber-500' : 'text-destructive'}>
                          {pm.success_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={pm.avg_processing_time < 1000 ? 'text-green-500' : pm.avg_processing_time < 2000 ? 'text-amber-500' : 'text-destructive'}>
                          {pm.avg_processing_time.toFixed(0)}ms
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{pm.active_conversations}</TableCell>
                      <TableCell className="text-right">
                        <span className={pm.queued_conversations === 0 ? '' : pm.queued_conversations < 5 ? 'text-amber-500' : 'text-destructive'}>
                          {pm.queued_conversations}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={pm.online_agents > 0 ? 'text-green-500' : 'text-muted-foreground'}>
                          {pm.online_agents}/{pm.total_agents}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasIssues ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Crítico
                          </Badge>
                        ) : hasWarnings ? (
                          <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-500">
                            <AlertTriangle className="w-3 h-3" />
                            Atenção
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-green-500/50 text-green-500">
                            <CheckCircle className="w-3 h-3" />
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
