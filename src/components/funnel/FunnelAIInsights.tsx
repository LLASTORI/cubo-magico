import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertOctagon,
  Info,
  Sparkles,
  Clock,
  CreditCard,
} from 'lucide-react';
import { useFunnelAIAnalysis, type FunnelAIAnalysisResponse } from '@/hooks/useFunnelAIAnalysis';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FunnelAIInsightsProps {
  funnelId: string;
  funnelName: string;
  startDate?: Date;
  endDate?: Date;
}

const healthStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ComponentType<any> }> = {
  excellent: { label: 'Excelente', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200', icon: CheckCircle2 },
  good: { label: 'Bom', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200', icon: CheckCircle2 },
  attention: { label: 'Atenção', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200', icon: AlertTriangle },
  danger: { label: 'Perigo', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
  'no-return': { label: 'Sem Retorno', color: 'text-red-700', bgColor: 'bg-red-100 border-red-300', icon: AlertOctagon },
  inactive: { label: 'Inativo', color: 'text-muted-foreground', bgColor: 'bg-muted border-muted', icon: Minus },
};

const changeTypeConfig: Record<string, { label: string; icon: React.ComponentType<any>; color: string }> = {
  melhoria: { label: 'Melhoria', icon: TrendingUp, color: 'text-green-600' },
  piora: { label: 'Piora', icon: TrendingDown, color: 'text-red-600' },
  estavel: { label: 'Estável', icon: Minus, color: 'text-muted-foreground' },
};

const riskSeverityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  baixa: { label: 'Baixa', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  media: { label: 'Média', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  alta: { label: 'Alta', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export function FunnelAIInsights({ funnelId, funnelName, startDate, endDate }: FunnelAIInsightsProps) {
  const { analyzeRunnel, analysis, isLoading, error, clearAnalysis } = useFunnelAIAnalysis();
  const [hasRequested, setHasRequested] = useState(false);

  // Reset when funnel changes
  useEffect(() => {
    setHasRequested(false);
    clearAnalysis();
  }, [funnelId, clearAnalysis]);

  const handleAnalyze = async () => {
    setHasRequested(true);
    await analyzeRunnel(
      funnelId,
      startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate ? format(endDate, 'yyyy-MM-dd') : undefined
    );
  };

  // Initial state - invitation to analyze
  if (!hasRequested && !analysis) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-primary/10 p-4">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <h3 className="mb-2 text-lg font-semibold">Análise Inteligente do Funil</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            Obtenha uma leitura executiva do seu funil com interpretação contextualizada dos dados.
            A IA analisa as métricas consolidadas e explica o que está acontecendo.
          </p>
          <Button onClick={handleAnalyze} size="lg">
            <Sparkles className="mr-2 h-4 w-4" />
            Gerar Análise
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            A análise é descritiva e baseada exclusivamente nos dados existentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 animate-pulse text-primary" />
            <CardTitle>Analisando Funil...</CardTitle>
          </div>
          <CardDescription>A IA está interpretando os dados do seu funil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-destructive/10 p-4">
            <AlertOctagon className="h-10 w-10 text-destructive" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-destructive">Erro na Análise</h3>
          <p className="mb-6 max-w-md text-sm text-muted-foreground">
            {error === 'rate_limit'
              ? 'Limite de requisições excedido. Aguarde alguns minutos e tente novamente.'
              : error === 'insufficient_credits'
              ? 'Créditos insuficientes para análise por IA. Entre em contato com o suporte.'
              : 'Ocorreu um erro ao gerar a análise. Por favor, tente novamente.'}
          </p>
          <Button onClick={handleAnalyze} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No analysis yet (shouldn't happen but safety)
  if (!analysis?.analysis) {
    return null;
  }

  const { analysis: ai, period, analysis_date } = analysis;
  const healthConfig = healthStatusConfig[ai.health_status] || healthStatusConfig.inactive;
  const HealthIcon = healthConfig.icon;

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-6 pr-4">
        {/* Header with status */}
        <Card className={cn('border', healthConfig.bgColor)}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('rounded-full p-2', healthConfig.bgColor)}>
                  <HealthIcon className={cn('h-6 w-6', healthConfig.color)} />
                </div>
                <div>
                  <CardTitle className="text-lg">Status: {healthConfig.label}</CardTitle>
                  <CardDescription className="text-xs">
                    Análise gerada em {format(new Date(analysis_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleAnalyze}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{ai.health_explanation}</p>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Resumo Executivo</CardTitle>
            </div>
            {period && (
              <CardDescription className="text-xs">
                Período: {format(new Date(period.start), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
                {format(new Date(period.end), 'dd/MM/yyyy', { locale: ptBR })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{ai.resumo_executivo}</p>
          </CardContent>
        </Card>

        {/* Strengths */}
        {ai.pontos_fortes && ai.pontos_fortes.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Pontos Fortes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ai.pontos_fortes.map((ponto, idx) => (
                <div key={idx} className="rounded-lg border border-green-200 bg-green-50/50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">{ponto.metrica}</span>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      {ponto.valor}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{ponto.explicacao}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Concerns */}
        {ai.pontos_atencao && ai.pontos_atencao.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-base">Pontos de Atenção</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ai.pontos_atencao.map((ponto, idx) => (
                <div key={idx} className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">{ponto.metrica}</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                      {ponto.valor}
                    </Badge>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">{ponto.explicacao}</p>
                  <p className="text-xs font-medium text-yellow-700">
                    Impacto: {ponto.impacto}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Period Changes */}
        {ai.mudancas_periodo && ai.mudancas_periodo.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Mudanças no Período</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ai.mudancas_periodo.map((mudanca, idx) => {
                const config = changeTypeConfig[mudanca.tipo] || changeTypeConfig.estavel;
                const ChangeIcon = config.icon;
                return (
                  <div key={idx} className="flex items-start gap-3 rounded-lg border p-3">
                    <ChangeIcon className={cn('mt-0.5 h-4 w-4', config.color)} />
                    <div>
                      <Badge variant="outline" className="mb-1 text-xs">
                        {config.label}
                      </Badge>
                      <p className="text-sm">{mudanca.descricao}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Risk Alerts */}
        {ai.alertas_risco && ai.alertas_risco.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base text-red-700">Alertas de Risco</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {ai.alertas_risco.map((alerta, idx) => {
                const severityConfig = riskSeverityConfig[alerta.severidade] || riskSeverityConfig.baixa;
                return (
                  <Alert key={idx} variant="destructive" className="border-red-200 bg-red-50">
                    <AlertOctagon className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      <span className="capitalize">{alerta.tipo}</span>
                      <Badge className={cn('text-xs', severityConfig.bgColor, severityConfig.color)}>
                        Severidade: {severityConfig.label}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-1">{alerta.descricao}</AlertDescription>
                  </Alert>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Additional Observations */}
        {ai.observacoes_adicionais && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Observações Adicionais</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{ai.observacoes_adicionais}</p>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Esta análise é estritamente descritiva. Os valores exibidos são baseados exclusivamente nos dados consolidados do sistema.
            A IA não recalcula métricas nem faz recomendações.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
