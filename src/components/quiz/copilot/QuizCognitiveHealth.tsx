/**
 * Quiz Cognitive Health Panel
 * 
 * Analyzes quiz structure and provides health diagnostics.
 */
import { useMemo } from 'react';
import { 
  Brain, AlertTriangle, CheckCircle, XCircle, Info,
  BarChart3, Target, Shield, Layers, TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { 
  analyzeQuizCognitiveHealth, 
  CognitiveHealthReport,
  HealthWarning 
} from '@/lib/quizCopilotEngine';
import type { QuizWithQuestions } from '@/hooks/useQuizzes';

interface QuizCognitiveHealthProps {
  quiz: QuizWithQuestions;
  outcomes: Array<{
    id: string;
    name: string;
    conditions: any[];
  }>;
}

export function QuizCognitiveHealth({ quiz, outcomes }: QuizCognitiveHealthProps) {
  const report = useMemo(() => {
    const questionsForAnalysis = quiz.quiz_questions?.map(q => ({
      id: q.id,
      title: q.title,
      type: q.type,
      options: (q.quiz_options || []).map(o => ({
        label: o.label,
        traits_vector: o.traits_vector,
        intent_vector: o.intent_vector,
        weight: o.weight,
      })),
    })) || [];

    const outcomesForAnalysis = outcomes.map(o => ({
      id: o.id,
      name: o.name,
      conditions: o.conditions || [],
    }));

    return analyzeQuizCognitiveHealth(questionsForAnalysis, outcomesForAnalysis);
  }, [quiz, outcomes]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success/10';
    if (score >= 60) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const getWarningIcon = (severity: HealthWarning['severity']) => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-6 pr-4">
        {/* Overall Health Score */}
        <Card className={cn("border-2", getScoreBg(report.overallScore))}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Saúde Cognitiva
              </CardTitle>
              <Badge 
                variant="outline" 
                className={cn("text-lg font-bold", getScoreColor(report.overallScore))}
              >
                {report.overallScore}%
              </Badge>
            </div>
            <CardDescription>
              Análise da qualidade cognitiva do quiz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={report.overallScore} className="h-3" />
          </CardContent>
        </Card>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricCard
            icon={<Target className="h-4 w-4" />}
            title="Cobertura"
            value={report.coverage.score}
            description="Dimensões cobertas"
          />
          <MetricCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="Qualidade do Sinal"
            value={report.signalQuality.score}
            description="Clareza dos dados"
          />
          <MetricCard
            icon={<Shield className="h-4 w-4" />}
            title="Discriminação"
            value={report.discriminationPower.score}
            description="Diferenciação de perfis"
          />
          <MetricCard
            icon={<Layers className="h-4 w-4" />}
            title="Ambiguidade"
            value={report.ambiguity.score}
            description="Clareza das opções"
          />
        </div>

        {/* Warnings */}
        {report.warnings.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas ({report.warnings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {report.warnings.map((warning, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg text-sm",
                    warning.severity === 'error' && "bg-destructive/10",
                    warning.severity === 'warning' && "bg-warning/10",
                    warning.severity === 'info' && "bg-muted"
                  )}
                >
                  {getWarningIcon(warning.severity)}
                  <div>
                    <p>{warning.message}</p>
                    {warning.affectedItems && warning.affectedItems.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {warning.affectedItems.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Detailed Analysis */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="coverage">
            <AccordionTrigger className="text-sm">
              Análise de Cobertura Detalhada
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Traços Cobertos</p>
                  <div className="flex flex-wrap gap-1">
                    {report.coverage.coveredTraits.map(t => (
                      <Badge key={t} variant="default" className="text-xs">{t}</Badge>
                    ))}
                    {report.coverage.coveredTraits.length === 0 && (
                      <span className="text-sm text-muted-foreground">Nenhum</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Traços Não Cobertos</p>
                  <div className="flex flex-wrap gap-1">
                    {report.coverage.missingTraits.map(t => (
                      <Badge key={t} variant="destructive" className="text-xs">{t}</Badge>
                    ))}
                    {report.coverage.missingTraits.length === 0 && (
                      <Badge variant="outline" className="text-xs">Todos cobertos ✓</Badge>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Intenções Cobertas</p>
                  <div className="flex flex-wrap gap-1">
                    {report.coverage.coveredIntents.map(i => (
                      <Badge key={i} variant="default" className="text-xs">{i}</Badge>
                    ))}
                    {report.coverage.coveredIntents.length === 0 && (
                      <span className="text-sm text-muted-foreground">Nenhuma</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Intenções Não Cobertas</p>
                  <div className="flex flex-wrap gap-1">
                    {report.coverage.missingIntents.map(i => (
                      <Badge key={i} variant="destructive" className="text-xs">{i}</Badge>
                    ))}
                    {report.coverage.missingIntents.length === 0 && (
                      <Badge variant="outline" className="text-xs">Todas cobertas ✓</Badge>
                    )}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="discrimination">
            <AccordionTrigger className="text-sm">
              Poder de Discriminação
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {report.discriminationPower.strongQuestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-success mb-2">Perguntas Fortes</p>
                    <ul className="space-y-1">
                      {report.discriminationPower.strongQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-success" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.discriminationPower.weakQuestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-destructive mb-2">Perguntas Fracas</p>
                    <ul className="space-y-1">
                      {report.discriminationPower.weakQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <XCircle className="h-3 w-3 text-destructive" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {report.outcomeConflicts.length > 0 && (
            <AccordionItem value="conflicts">
              <AccordionTrigger className="text-sm">
                Conflitos de Outcome ({report.outcomeConflicts.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {report.outcomeConflicts.map((conflict, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "p-3 rounded-lg text-sm",
                        conflict.severity === 'high' && "bg-destructive/10",
                        conflict.severity === 'medium' && "bg-warning/10",
                        conflict.severity === 'low' && "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{conflict.outcome1}</Badge>
                        <span className="text-muted-foreground">vs</span>
                        <Badge variant="outline" className="text-xs">{conflict.outcome2}</Badge>
                      </div>
                      <p className="text-muted-foreground">{conflict.description}</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </ScrollArea>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
}

function MetricCard({ icon, title, value, description }: MetricCardProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            {icon}
            <span className="text-xs">{title}</span>
          </div>
          <span className={cn("text-lg font-bold", getColor(value))}>
            {value}%
          </span>
        </div>
        <Progress value={value} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
