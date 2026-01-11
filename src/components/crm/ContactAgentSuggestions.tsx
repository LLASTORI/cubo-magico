import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Bot, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Play,
  MessageSquare,
  Zap
} from 'lucide-react';
import { useAgentDecisions, AgentDecisionLog } from '@/hooks/useAIAgents';
import { formatAgentAction, getActionIcon } from '@/lib/agentEngine';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContactAgentSuggestionsProps {
  contactId: string;
}

export function ContactAgentSuggestions({ contactId }: ContactAgentSuggestionsProps) {
  const { 
    decisions, 
    pendingDecisions,
    isLoading,
    approveDecision,
    rejectDecision,
    executeDecision
  } = useAgentDecisions(contactId);
  
  const [expandedDecisions, setExpandedDecisions] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedDecisions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Sugestões do Agente IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (decisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Sugestões do Agente IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bot className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhuma sugestão de agente ainda</p>
            <p className="text-sm">Agentes avaliarão este contato automaticamente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Sugestões do Agente IA
          </div>
          {pendingDecisions.length > 0 && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">
              {pendingDecisions.length} pendente{pendingDecisions.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {decisions.slice(0, 5).map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              isExpanded={expandedDecisions.has(decision.id)}
              onToggle={() => toggleExpanded(decision.id)}
              onApprove={() => approveDecision.mutate(decision.id)}
              onReject={() => rejectDecision.mutate({ decisionId: decision.id })}
              onExecute={() => executeDecision.mutate(decision.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DecisionCardProps {
  decision: AgentDecisionLog;
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onExecute: () => void;
}

function DecisionCard({ 
  decision, 
  isExpanded, 
  onToggle, 
  onApprove, 
  onReject,
  onExecute 
}: DecisionCardProps) {
  const explanation = decision.explanation as { 
    reasoning?: string; 
    factors?: Array<{ factor: string; value: string; impact: string }>;
    expectedOutcome?: string;
    potentialRisks?: string[];
  };

  const getStatusBadge = () => {
    switch (decision.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600"><Check className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case 'executed':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600"><Play className="h-3 w-3 mr-1" /> Executado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600"><X className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{decision.status}</Badge>;
    }
  };

  const getRiskColor = () => {
    if (decision.riskScore > 0.6) return 'text-red-500';
    if (decision.riskScore > 0.3) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getActionIcon(decision.decisionType as any)}</div>
            <div>
              <div className="font-medium flex items-center gap-2">
                {formatAgentAction(decision.decisionType as any)}
                {getStatusBadge()}
              </div>
              {decision.agent && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Bot className="h-3 w-3" />
                  {decision.agent.name}
                </div>
              )}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 text-xs">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-blue-500" />
                  {(decision.confidence * 100).toFixed(0)}% confiança
                </span>
              </TooltipTrigger>
              <TooltipContent>Probabilidade de sucesso</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className={`flex items-center gap-1 ${getRiskColor()}`}>
                  <AlertTriangle className="h-3 w-3" />
                  {(decision.riskScore * 100).toFixed(0)}% risco
                </span>
              </TooltipTrigger>
              <TooltipContent>Nível de risco da ação</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <CollapsibleContent className="space-y-3 pt-2">
          {/* Reasoning */}
          {explanation.reasoning && (
            <div className="bg-muted/50 p-3 rounded-lg text-sm">
              <div className="font-medium mb-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                Raciocínio
              </div>
              <p className="text-muted-foreground">{explanation.reasoning}</p>
            </div>
          )}

          {/* Factors */}
          {explanation.factors && explanation.factors.length > 0 && (
            <div>
              <div className="font-medium text-sm mb-2">Fatores Considerados</div>
              <div className="grid grid-cols-2 gap-2">
                {explanation.factors.map((factor, i) => (
                  <div 
                    key={i} 
                    className={`text-xs p-2 rounded border ${
                      factor.impact === 'positive' ? 'border-green-500/30 bg-green-500/5' :
                      factor.impact === 'negative' ? 'border-red-500/30 bg-red-500/5' :
                      'border-muted'
                    }`}
                  >
                    <div className="font-medium">{factor.factor}</div>
                    <div className="text-muted-foreground">{factor.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected outcome */}
          {explanation.expectedOutcome && (
            <div className="text-sm">
              <span className="font-medium">Resultado Esperado: </span>
              <span className="text-muted-foreground">{explanation.expectedOutcome}</span>
            </div>
          )}

          {/* Potential risks */}
          {explanation.potentialRisks && explanation.potentialRisks.length > 0 && (
            <div className="text-sm">
              <div className="font-medium text-amber-600 flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3" />
                Riscos Potenciais
              </div>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
                {explanation.potentialRisks.map((risk, i) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {decision.status === 'pending' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button 
                size="sm" 
                onClick={onApprove}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" />
                Aprovar
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onReject}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Rejeitar
              </Button>
            </div>
          )}

          {decision.status === 'approved' && (
            <div className="pt-2 border-t">
              <Button 
                size="sm" 
                onClick={onExecute}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-1" />
                Executar Ação
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
