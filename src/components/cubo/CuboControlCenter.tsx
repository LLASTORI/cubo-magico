/**
 * Cubo Control Center - The OS Dashboard
 * 
 * Shows:
 * - What the system believes
 * - What it predicts
 * - What it plans
 * - What it is optimizing
 * - What agents are doing
 * - What it learned today
 */

import { useState } from 'react';
import { 
  Brain, 
  Lightbulb, 
  Target, 
  Activity, 
  Bot, 
  GraduationCap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Eye,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useCuboOSStats, 
  useSystemBeliefs, 
  useSystemPlans,
  useSystemLearnings,
  useExplainabilityLogs,
  useSystemEvents,
} from '@/hooks/useCuboOS';
import { useFunnelOptimizationStats, usePendingSuggestions } from '@/hooks/useFunnelOptimization';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function CuboControlCenter() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useCuboOSStats();
  const { data: beliefs, isLoading: beliefsLoading } = useSystemBeliefs(8);
  const { data: plans, isLoading: plansLoading } = useSystemPlans(8);
  const { data: learnings, isLoading: learningsLoading } = useSystemLearnings({ limit: 10 });
  const { data: recentDecisions, isLoading: decisionsLoading } = useExplainabilityLogs({ limit: 10 });
  const { data: recentEvents, isLoading: eventsLoading } = useSystemEvents({ limit: 20 });
  const { data: optimizationStats } = useFunnelOptimizationStats();
  const { data: pendingSuggestions } = usePendingSuggestions();

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-green-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-600';
      case 'approved': return 'bg-blue-500/20 text-blue-600';
      case 'executed': return 'bg-green-500/20 text-green-600';
      case 'rejected': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getLearningIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <Activity className="h-4 w-4" />;
      case 'correlation': return <TrendingUp className="h-4 w-4" />;
      case 'optimization': return <Target className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Cubo OS
          </h1>
          <p className="text-muted-foreground mt-1">
            Sistema operacional para intenção humana
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Hoje</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.eventsToday || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Decisões Hoje</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.decisionsToday || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeAgents || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprendizados</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats?.activeLearnings || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.pendingApprovals || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="beliefs" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Crenças
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Otimização
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Agentes
          </TabsTrigger>
          <TabsTrigger value="learnings" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Aprendizados
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* What the System Believes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  O que o Sistema Acredita
                </CardTitle>
                <CardDescription>
                  Predições de alta confiança sobre contatos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {beliefsLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : beliefs && beliefs.length > 0 ? (
                    <div className="space-y-3">
                      {beliefs.map((belief, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{belief.contactName}</p>
                            <p className="text-xs text-muted-foreground">
                              {belief.type} • {Math.round(belief.confidence * 100)}% confiança
                            </p>
                          </div>
                          <Badge className={getRiskColor(belief.riskLevel)}>
                            {belief.riskLevel}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhuma crença de alta confiança
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* What the System Plans */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  O que o Sistema Planeja
                </CardTitle>
                <CardDescription>
                  Decisões dos agentes aguardando execução
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {plansLoading ? (
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : plans && plans.length > 0 ? (
                    <div className="space-y-3">
                      {plans.map((plan) => (
                        <div 
                          key={plan.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{plan.agentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {plan.decisionType} • {Math.round(plan.confidence * 100)}%
                            </p>
                          </div>
                          <Badge className={getStatusColor(plan.status)}>
                            {plan.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum plano pendente
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Últimos eventos no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {eventsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : recentEvents && recentEvents.length > 0 ? (
                  <div className="space-y-2">
                    {recentEvents.slice(0, 10).map((event) => (
                      <div 
                        key={event.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm">{event.eventName}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.eventSource} • {event.eventType}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.createdAt), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum evento recente
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Beliefs Tab */}
        <TabsContent value="beliefs">
          <Card>
            <CardHeader>
              <CardTitle>Crenças do Sistema</CardTitle>
              <CardDescription>
                O que o sistema acredita sobre cada contato com base em dados e análises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {beliefsLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : beliefs && beliefs.length > 0 ? (
                  <div className="space-y-4">
                    {beliefs.map((belief, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Brain className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{belief.contactName}</p>
                            <p className="text-sm text-muted-foreground">
                              Previsão: <span className="font-medium">{belief.type}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getRiskColor(belief.riskLevel)}>
                            {belief.riskLevel}
                          </Badge>
                          <p className="text-sm mt-1">
                            {Math.round(belief.confidence * 100)}% confiança
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma crença registrada ainda</p>
                    <p className="text-sm">O sistema aprenderá com o tempo</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Planos de Ação</CardTitle>
              <CardDescription>
                Decisões que os agentes planejam executar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {plansLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : plans && plans.length > 0 ? (
                  <div className="space-y-4">
                    {plans.map((plan) => (
                      <div 
                        key={plan.id}
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5 text-primary" />
                            <span className="font-medium">{plan.agentName}</span>
                          </div>
                          <Badge className={getStatusColor(plan.status)}>
                            {plan.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Objetivo: {plan.agentObjective}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span>Tipo: {plan.decisionType}</span>
                          <span>{Math.round(plan.confidence * 100)}% confiança</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum plano pendente</p>
                    <p className="text-sm">Agentes estão monitorando</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Status de Otimização</CardTitle>
                <CardDescription>
                  Métricas do motor de otimização de funis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {optimizationStats ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span>Caminhos Rastreados</span>
                      <span className="font-bold">{optimizationStats.totalPaths}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span>Sugestões Pendentes</span>
                      <span className="font-bold text-yellow-600">
                        {optimizationStats.pendingSuggestions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span>Experimentos Ativos</span>
                      <span className="font-bold text-blue-600">
                        {optimizationStats.runningExperiments}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span>Score Médio</span>
                      <span className="font-bold text-green-600">
                        {(optimizationStats.avgPerformanceScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Carregando estatísticas...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sugestões de Otimização</CardTitle>
                <CardDescription>
                  Recomendações do motor de otimização
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  {pendingSuggestions && pendingSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {pendingSuggestions.map((suggestion) => (
                        <div 
                          key={suggestion.id}
                          className="p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-sm">
                              {suggestion.suggestion_type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.description}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-xs">
                            <span>Impacto: {suggestion.impact_estimate}%</span>
                            <span>{Math.round(suggestion.confidence * 100)}% confiança</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma sugestão pendente</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Atividade dos Agentes</CardTitle>
              <CardDescription>
                O que os agentes autônomos estão fazendo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {decisionsLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : recentDecisions && recentDecisions.length > 0 ? (
                  <div className="space-y-4">
                    {recentDecisions.map((decision) => (
                      <div 
                        key={decision.id}
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {decision.sourceName || decision.source}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {decision.decisionType}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={decision.humanOverride ? 'destructive' : 'default'}>
                              {decision.humanOverride ? 'Overridden' : 'Automated'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm">{decision.decision}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {decision.reasoning}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span>{Math.round(decision.confidence * 100)}% confiança</span>
                          <span>
                            {formatDistanceToNow(new Date(decision.createdAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma decisão registrada ainda</p>
                    <p className="text-sm">Configure agentes para começar</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learnings Tab */}
        <TabsContent value="learnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                O que o Sistema Aprendeu
              </CardTitle>
              <CardDescription>
                Padrões, correlações e insights descobertos pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {learningsLoading ? (
                  <div className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : learnings && learnings.length > 0 ? (
                  <div className="space-y-4">
                    {learnings.map((learning) => (
                      <div 
                        key={learning.id}
                        className="p-4 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getLearningIcon(learning.learningType)}
                            <Badge variant="outline">{learning.learningType}</Badge>
                            <Badge variant="secondary">{learning.category}</Badge>
                          </div>
                          <Badge 
                            className={
                              learning.status === 'applied' 
                                ? 'bg-green-500/20 text-green-600'
                                : learning.status === 'validated'
                                ? 'bg-blue-500/20 text-blue-600'
                                : 'bg-yellow-500/20 text-yellow-600'
                            }
                          >
                            {learning.status}
                          </Badge>
                        </div>
                        <h4 className="font-medium">{learning.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {learning.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {Math.round(learning.confidence * 100)}% confiança
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Impacto: {learning.impactScore}
                          </span>
                          <span>
                            {learning.affectedContactsCount} contatos afetados
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>O sistema ainda está aprendendo</p>
                    <p className="text-sm">
                      Insights aparecerão conforme mais dados são coletados
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
