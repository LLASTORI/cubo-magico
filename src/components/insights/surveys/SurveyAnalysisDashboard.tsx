import { 
  BarChart3, 
  Users, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  Smile,
  Lightbulb,
  Brain,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useSurveyAnalysisStats, useProcessSurveyAI } from '@/hooks/useSurveyAnalysis';
import { FeatureLockedButton } from '@/components/FeatureGate';

interface SurveyAnalysisDashboardProps {
  projectId: string;
}

export function SurveyAnalysisDashboard({ projectId }: SurveyAnalysisDashboardProps) {
  const { data: stats, isLoading } = useSurveyAnalysisStats(projectId);
  const processAI = useProcessSurveyAI(projectId);
  
  // Fetch surveys count directly
  const { data: surveysData } = useQuery({
    queryKey: ['surveys-count', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveys')
        .select('id, status')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const handleProcessAI = () => {
    processAI.mutate(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  const activeSurveys = surveysData?.filter(s => s.status === 'active').length || 0;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Análise</h2>
          <p className="text-muted-foreground">
            Visão consolidada de todas as pesquisas do projeto
          </p>
        </div>
        <FeatureLockedButton 
          featureKey="ai_analysis.surveys"
          lockedMessage="Análise de Pesquisas com IA está desabilitada para este projeto/plano."
          onClick={handleProcessAI} 
          disabled={processAI.isPending}
          className="gap-2"
        >
          {processAI.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {processAI.isPending ? 'Processando...' : 'Classificar com IA'}
        </FeatureLockedButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Total de Respostas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalResponses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {activeSurveys} pesquisas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Respondentes Únicos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueRespondents || 0}</div>
            <p className="text-xs text-muted-foreground">
              contatos identificados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Target className="h-4 w-4 text-green-500" />
              % Alta Intenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats?.highIntentPercentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Intent Score ≥ 70
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Dores Detectadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {stats?.painPointsDetected || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              classificadas por IA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Smile className="h-4 w-4 text-blue-500" />
              Satisfação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats?.satisfactionCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              feedbacks positivos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Oportunidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {stats?.opportunitiesIdentified || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              leads quentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Resumo Inteligente
          </CardTitle>
          <CardDescription>
            Análise consolidada gerada por IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats && stats.totalResponses > 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Nas últimas <strong>{stats.totalResponses} respostas</strong>, 
                {stats.painPointsDetected > 0 && (
                  <> <strong>{stats.painPointsDetected} dores</strong> foram identificadas. </>
                )}
                {stats.highIntentPercentage > 0 && (
                  <><strong>{stats.highIntentPercentage}%</strong> demonstraram alta intenção de compra. </>
                )}
                {stats.satisfactionCount > 0 && (
                  <><strong>{stats.satisfactionCount}</strong> expressaram satisfação. </>
                )}
                {stats.opportunitiesIdentified > 0 && (
                  <>Existem <strong>{stats.opportunitiesIdentified} oportunidades</strong> identificadas para follow-up.</>
                )}
              </p>

              {/* Classification Distribution */}
              {Object.keys(stats.classificationDistribution).length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Distribuição de Classificações</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.classificationDistribution).map(([key, value]) => (
                      <Badge key={key} variant="secondary">
                        {getClassificationLabel(key)}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sentiment Distribution */}
              {Object.keys(stats.sentimentDistribution).length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Distribuição de Sentimento</h4>
                  <div className="flex gap-4">
                    {stats.sentimentDistribution.positive && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Positivo: {stats.sentimentDistribution.positive}</span>
                      </div>
                    )}
                    {stats.sentimentDistribution.neutral && (
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full bg-gray-400" />
                        <span className="text-sm">Neutro: {stats.sentimentDistribution.neutral}</span>
                      </div>
                    )}
                    {stats.sentimentDistribution.negative && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Negativo: {stats.sentimentDistribution.negative}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma resposta analisada ainda.</p>
              <p className="text-sm">Clique em "Classificar com IA" para processar as respostas.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getClassificationLabel(key: string): string {
  const labels: Record<string, string> = {
    high_intent: 'Alta Intenção',
    pain_point: 'Dor do Cliente',
    price_objection: 'Objeção de Preço',
    confusion: 'Dúvida/Confusão',
    feature_request: 'Pedido de Funcionalidade',
    satisfaction: 'Satisfação',
    neutral: 'Neutro',
  };
  return labels[key] || key;
}
