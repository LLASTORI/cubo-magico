import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Brain, 
  Sparkles,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Clock,
  FlaskConical,
  Loader2,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  Gift,
  Phone,
  FileText,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import { useContactPredictions, useGeneratePredictions, ContactPrediction } from '@/hooks/useContactPredictions';
import { formatRiskLevel, formatPredictionType, formatActionType, RecommendedAction } from '@/lib/recommendationEngine';
import { toast } from 'sonner';

interface ContactAIRecommendationsProps {
  contactId: string;
}

export function ContactAIRecommendations({ contactId }: ContactAIRecommendationsProps) {
  const { 
    predictions, 
    primaryPrediction, 
    isLoading, 
    logAction, 
    dismissPrediction 
  } = useContactPredictions(contactId);
  const { generate, isGenerating } = useGeneratePredictions(contactId);
  const [expandedPrediction, setExpandedPrediction] = useState<string | null>(null);

  const handleApplyAction = async (prediction: ContactPrediction, action: RecommendedAction) => {
    await logAction.mutateAsync({
      predictionId: prediction.id,
      actionType: 'apply',
      actionData: { 
        action_type: action.type,
        title: action.title,
        config: action.config 
      },
    });
    toast.success(`Ação "${action.title}" aplicada`);
  };

  const handleScheduleAction = async (prediction: ContactPrediction, action: RecommendedAction) => {
    await logAction.mutateAsync({
      predictionId: prediction.id,
      actionType: 'schedule',
      actionData: { 
        action_type: action.type,
        title: action.title,
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
    });
    toast.success(`Ação "${action.title}" agendada para amanhã`);
  };

  const ActionIcon = ({ type }: { type: RecommendedAction['type'] }) => {
    switch (type) {
      case 'send_message': return <MessageCircle className="h-4 w-4" />;
      case 'send_offer': return <Gift className="h-4 w-4" />;
      case 'schedule_call': return <Phone className="h-4 w-4" />;
      case 'send_survey': return <FileText className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Recomendações IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Recomendações IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Lightbulb className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhuma recomendação ativa no momento.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generate({})}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Recomendações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 dark:border-purple-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Recomendações IA
            <Badge variant="secondary" className="ml-1 text-xs">
              {predictions.length}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={() => generate({})}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictions.map((prediction, index) => {
          const isExpanded = expandedPrediction === prediction.id;
          const predictionMeta = formatPredictionType(prediction.prediction_type);
          const riskMeta = formatRiskLevel(prediction.risk_level);
          const explanation = prediction.explanation as any;

          return (
            <Collapsible
              key={prediction.id}
              open={isExpanded}
              onOpenChange={() => setExpandedPrediction(isExpanded ? null : prediction.id)}
            >
              <div className={`rounded-lg border p-3 ${index === 0 ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800' : ''}`}>
                {/* Header */}
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{predictionMeta.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{predictionMeta.label}</span>
                          <Badge className={`text-[10px] ${riskMeta.color}`}>
                            {riskMeta.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {explanation?.summary || 'Análise em progresso...'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {Math.round(prediction.confidence * 100)}%
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                        <Progress 
                          value={prediction.confidence * 100} 
                          className="h-1 w-16" 
                        />
                      </div>
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-4 space-y-4">
                    {/* Factors */}
                    {explanation?.factors && explanation.factors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Fatores:</p>
                        <div className="space-y-1.5">
                          {explanation.factors.map((factor: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              {factor.impact === 'positive' ? (
                                <TrendingUp className="h-3 w-3 text-green-500" />
                              ) : factor.impact === 'negative' ? (
                                <AlertTriangle className="h-3 w-3 text-orange-500" />
                              ) : (
                                <span className="h-3 w-3" />
                              )}
                              <span className="flex-1">{factor.name}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {factor.value}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Recommended Actions */}
                    {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Ações Recomendadas:</p>
                        <div className="space-y-2">
                          {prediction.recommended_actions.slice(0, 3).map((action, i) => (
                            <div 
                              key={i} 
                              className="flex items-center gap-2 p-2 rounded-lg bg-background border"
                            >
                              <div className="p-1.5 rounded bg-muted">
                                <ActionIcon type={action.type} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{action.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {action.description}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => handleScheduleAction(prediction, action)}
                                >
                                  <Clock className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => handleApplyAction(prediction, action)}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-7"
                      >
                        <FlaskConical className="h-3 w-3 mr-1" />
                        Testar Variante
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs h-7 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Descartar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Descartar recomendação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta recomendação será removida. Você poderá gerar novas recomendações a qualquer momento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => dismissPrediction.mutate(prediction.id)}
                            >
                              Descartar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
