import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useFunnelOptimizationStats,
  useTopPerformingPaths,
  useUnderperformingPaths,
  useOptimizationSuggestions,
  useFunnelExperiments,
  useGenerateSuggestions,
  useUpdateSuggestionStatus,
  useUpdateExperimentStatus
} from '@/hooks/useFunnelOptimization';
import { useAuth } from '@/contexts/AuthContext';
import { SUGGESTION_TYPE_LABELS, TREND_LABELS } from '@/lib/funnelOptimizationEngine';

export function FunnelIntelligencePanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: stats, isLoading: statsLoading } = useFunnelOptimizationStats();
  const { data: topPaths } = useTopPerformingPaths(5);
  const { data: worstPaths } = useUnderperformingPaths(5);
  const { data: suggestions } = useOptimizationSuggestions();
  const { data: experiments } = useFunnelExperiments();
  
  const generateSuggestions = useGenerateSuggestions();
  const updateSuggestionStatus = useUpdateSuggestionStatus();
  const updateExperimentStatus = useUpdateExperimentStatus();
  
  const handleGenerateSuggestions = async () => {
    try {
      const result = await generateSuggestions.mutateAsync({});
      toast.success(`Generated ${result.length} optimization suggestions`);
    } catch (error) {
      toast.error('Failed to generate suggestions');
    }
  };
  
  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      await updateSuggestionStatus.mutateAsync({
        suggestionId,
        status: 'approved',
        reviewedBy: user?.id
      });
      toast.success('Suggestion approved');
    } catch (error) {
      toast.error('Failed to approve suggestion');
    }
  };
  
  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      await updateSuggestionStatus.mutateAsync({
        suggestionId,
        status: 'rejected',
        reviewedBy: user?.id
      });
      toast.success('Suggestion rejected');
    } catch (error) {
      toast.error('Failed to reject suggestion');
    }
  };
  
  const handleStartExperiment = async (experimentId: string) => {
    try {
      await updateExperimentStatus.mutateAsync({
        experimentId,
        status: 'running'
      });
      toast.success('Experiment started');
    } catch (error) {
      toast.error('Failed to start experiment');
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getRiskBadge = (confidence: number) => {
    if (confidence >= 0.9) return <Badge variant="default" className="bg-green-500">Low Risk</Badge>;
    if (confidence >= 0.7) return <Badge variant="secondary">Medium Risk</Badge>;
    return <Badge variant="destructive">High Risk</Badge>;
  };

  if (statsLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading intelligence data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className="text-2xl font-bold">{stats?.avgPerformanceScore || 0}</p>
              </div>
              <Target className="h-8 w-8 text-primary/20" />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-green-500">{stats?.improvingPaths || 0} improving</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-red-500">{stats?.decliningPaths || 0} declining</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Suggestions</p>
                <p className="text-2xl font-bold">{stats?.pendingSuggestions || 0}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-yellow-500/20" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              +{stats?.totalPotentialImpact || 0}% potential impact
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Experiments</p>
                <p className="text-2xl font-bold">{stats?.runningExperiments || 0}</p>
              </div>
              <FlaskConical className="h-8 w-8 text-purple-500/20" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.completedExperiments || 0} completed
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{stats?.experimentWinRate || 0}%</p>
              </div>
              <Zap className="h-8 w-8 text-green-500/20" />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {stats?.successfulExperiments || 0} successful variants
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>Funnel Intelligence</CardTitle>
            </div>
            <Button 
              onClick={handleGenerateSuggestions}
              disabled={generateSuggestions.isPending}
              size="sm"
            >
              {generateSuggestions.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
              )}
              Generate Insights
            </Button>
          </div>
          <CardDescription>
            AI-powered analysis of your funnel performance with actionable optimization suggestions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="suggestions">
                Suggestions
                {(stats?.pendingSuggestions || 0) > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {stats?.pendingSuggestions}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="experiments">Experiments</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4 space-y-6">
              {/* Best Performing Paths */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top Performing Paths
                </h3>
                <div className="space-y-2">
                  {topPaths?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No path data yet. Paths will appear as users complete quiz outcomes and automations.
                    </p>
                  ) : (
                    topPaths?.map((path) => (
                      <div 
                        key={path.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-green-500">
                              {path.performance_score}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{path.path_name || `Path ${path.id.slice(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {path.path_type} • {path.sample_size} users
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {(path.conversion_rate * 100).toFixed(1)}% CVR
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ${path.revenue_per_user?.toFixed(2)} RPU
                            </p>
                          </div>
                          {getTrendIcon(path.trend)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <Separator />
              
              {/* Underperforming Paths */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Needs Attention
                </h3>
                <div className="space-y-2">
                  {worstPaths?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No underperforming paths detected.
                    </p>
                  ) : (
                    worstPaths?.map((path) => (
                      <div 
                        key={path.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-orange-500/20 bg-orange-500/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-orange-500">
                              {path.performance_score}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{path.path_name || `Path ${path.id.slice(0, 8)}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {path.path_type} • {path.sample_size} users
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-orange-500">
                              {(path.conversion_rate * 100).toFixed(1)}% CVR
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(path.churn_rate * 100).toFixed(1)}% churn
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Optimize
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="suggestions" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {suggestions?.length === 0 ? (
                    <div className="text-center py-8">
                      <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2 text-muted-foreground">
                        No optimization suggestions yet.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Click "Generate Insights" to analyze your funnels.
                      </p>
                    </div>
                  ) : (
                    suggestions?.map((suggestion) => (
                      <Card key={suggestion.id} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">
                                  {SUGGESTION_TYPE_LABELS[suggestion.suggestion_type as keyof typeof SUGGESTION_TYPE_LABELS] || suggestion.suggestion_type}
                                </Badge>
                                {getRiskBadge(suggestion.confidence || 0)}
                                <Badge 
                                  variant={suggestion.status === 'pending' ? 'secondary' : 
                                    suggestion.status === 'approved' ? 'default' : 'outline'}
                                >
                                  {suggestion.status}
                                </Badge>
                              </div>
                              <h4 className="font-semibold">{suggestion.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {suggestion.description}
                              </p>
                              
                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-1 text-sm">
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                  <span className="text-green-500 font-medium">
                                    +{suggestion.impact_estimate?.toFixed(1)}%
                                  </span>
                                  <span className="text-muted-foreground">estimated impact</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {((suggestion.confidence || 0) * 100).toFixed(0)}% confidence
                                </div>
                              </div>
                              
                              {suggestion.recommended_action && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    RECOMMENDED ACTION
                                  </p>
                                  <p className="text-sm">
                                    {(suggestion.recommended_action as { implementation_steps?: string[] })
                                      ?.implementation_steps?.[0] || 'Review and optimize this path'}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {suggestion.status === 'pending' && (
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleApproveSuggestion(suggestion.id!)}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleRejectSuggestion(suggestion.id!)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="experiments" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {experiments?.length === 0 ? (
                    <div className="text-center py-8">
                      <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground/50" />
                      <p className="mt-2 text-muted-foreground">
                        No experiments yet.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Create experiments from approved suggestions.
                      </p>
                    </div>
                  ) : (
                    experiments?.map((experiment) => (
                      <Card key={experiment.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant={
                                    experiment.status === 'running' ? 'default' :
                                    experiment.status === 'completed' ? 'secondary' :
                                    'outline'
                                  }
                                >
                                  {experiment.status}
                                </Badge>
                                {experiment.winner && (
                                  <Badge variant="default" className="bg-green-500">
                                    Winner: {experiment.winner}
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-semibold">{experiment.name}</h4>
                              {experiment.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {experiment.description}
                                </p>
                              )}
                              
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    CONTROL
                                  </p>
                                  <p className="text-sm">Original path</p>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-lg">
                                  <p className="text-xs font-medium text-primary mb-1">
                                    VARIANT
                                  </p>
                                  <p className="text-sm">Optimized path</p>
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span>Traffic split</span>
                                  <span>{((experiment.traffic_split || 0.5) * 100).toFixed(0)}%</span>
                                </div>
                                <Progress value={(experiment.traffic_split || 0.5) * 100} />
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {experiment.status === 'draft' && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleStartExperiment(experiment.id)}
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Start
                                </Button>
                              )}
                              {experiment.status === 'running' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateExperimentStatus.mutateAsync({
                                    experimentId: experiment.id,
                                    status: 'paused'
                                  })}
                                >
                                  <Pause className="h-3 w-3 mr-1" />
                                  Pause
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="patterns" className="mt-4">
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-2 font-medium">Emerging Patterns</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-detected patterns will appear here as more data is collected.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                  <div className="p-4 rounded-lg border border-dashed">
                    <p className="text-sm font-medium">High-Intent Indicators</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Traits and behaviors that predict conversion
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-dashed">
                    <p className="text-sm font-medium">Churn Signals</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Early warning signs of user drop-off
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-dashed">
                    <p className="text-sm font-medium">Optimal Timing</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Best times to engage different segments
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border border-dashed">
                    <p className="text-sm font-medium">Content Preferences</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      What resonates with each profile type
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default FunnelIntelligencePanel;
