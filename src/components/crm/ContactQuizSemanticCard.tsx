import { useState } from 'react';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  ChevronDown,
  ChevronRight,
  Sparkles,
  Heart,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { 
  interpretProfile, 
  getSemanticLabel,
  type SemanticProfile 
} from '@/lib/semanticProfileEngine';
import { QuizVectorBars } from './QuizVectorBars';

interface ContactQuizSemanticCardProps {
  traitsVector: Record<string, number>;
  intentVector: Record<string, number>;
  normalizedScore?: number;
  entropy?: number;
  volatility?: number;
  flowType?: string;
  showAIData?: boolean;
}

export function ContactQuizSemanticCard({
  traitsVector,
  intentVector,
  normalizedScore = 0.5,
  entropy = 0.5,
  volatility = 0,
  flowType,
  showAIData = true
}: ContactQuizSemanticCardProps) {
  const [aiDataOpen, setAiDataOpen] = useState(false);

  // Generate semantic profile
  const semanticProfile = interpretProfile({
    vectors: {
      intent_vector: intentVector,
      traits_vector: traitsVector
    },
    entropy,
    normalized_score: normalizedScore
  });

  // Get primary dimensions
  const sortedTraits = Object.entries(traitsVector || {})
    .sort((a, b) => b[1] - a[1]);
  const sortedIntents = Object.entries(intentVector || {})
    .sort((a, b) => b[1] - a[1]);

  const primaryTrait = sortedTraits[0];
  const secondaryTrait = sortedTraits[1];
  const primaryIntent = sortedIntents[0];

  return (
    <div className="space-y-4">
      {/* Human-Readable Profile Section */}
      <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-lg bg-primary/20">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-base text-primary">
              Perfil neste Quiz
            </h4>
            <p className="text-xl font-bold mt-1">
              {semanticProfile.profile_name}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Decision Style */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">Estilo de decisão:</span>
            <span className="text-sm font-medium">{semanticProfile.buying_style}</span>
          </div>

          {/* Motivation */}
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            <span className="text-sm text-muted-foreground">Motivação:</span>
            <span className="text-sm font-medium">{semanticProfile.emotional_driver}</span>
          </div>

          <Separator className="my-3" />

          {/* Primary Intent */}
          {primaryIntent && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Intenção principal:</span>
              <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700">
                {getSemanticLabel(primaryIntent[0], 'intent')}
              </Badge>
            </div>
          )}

          {/* Primary Trait */}
          {primaryTrait && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Traço dominante:</span>
              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                {getSemanticLabel(primaryTrait[0], 'trait')}
              </Badge>
            </div>
          )}

          {/* Secondary Trait */}
          {secondaryTrait && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Traço secundário:</span>
              <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700">
                {getSemanticLabel(secondaryTrait[0], 'trait')}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* AI Data Section - Collapsible */}
      {showAIData && (
        <Collapsible open={aiDataOpen} onOpenChange={setAiDataOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-dashed hover:bg-muted/70 transition-colors">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Brain className="h-4 w-4" />
                Dados Cognitivos Avançados (para IA)
              </span>
              {aiDataOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="p-4 bg-muted/30 rounded-lg border border-dashed space-y-4">
              {/* Normalized Vectors */}
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(traitsVector || {}).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Vetor de Traços (normalizado)
                    </p>
                    <QuizVectorBars vector={normalizeVector(traitsVector)} type="traits" />
                  </div>
                )}
                {Object.keys(intentVector || {}).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Vetor de Intenção (normalizado)
                    </p>
                    <QuizVectorBars vector={normalizeVector(intentVector)} type="intent" />
                  </div>
                )}
              </div>

              <Separator />

              {/* Technical Metrics */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-2 bg-background rounded-lg">
                  <p className="text-xs text-muted-foreground">Entropia</p>
                  <p className="text-lg font-mono font-medium">
                    {entropy?.toFixed(2) || '-'}
                  </p>
                </div>
                <div className="p-2 bg-background rounded-lg">
                  <p className="text-xs text-muted-foreground">Volatilidade</p>
                  <p className="text-lg font-mono font-medium">
                    {volatility?.toFixed(2) || '-'}
                  </p>
                </div>
                <div className="p-2 bg-background rounded-lg">
                  <p className="text-xs text-muted-foreground">Flow Type</p>
                  <p className="text-lg font-mono font-medium truncate">
                    {flowType || '-'}
                  </p>
                </div>
              </div>

              {/* Raw Data */}
              <div className="text-xs">
                <p className="text-muted-foreground mb-1">Dados brutos (JSON):</p>
                <pre className="bg-background p-2 rounded-lg overflow-x-auto text-[10px]">
{JSON.stringify({
  traits: traitsVector,
  intents: intentVector,
  normalized_score: normalizedScore,
  entropy,
  volatility,
  flow_type: flowType
}, null, 2)}
                </pre>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// Normalize vector to sum to 1
function normalizeVector(vector: Record<string, number>): Record<string, number> {
  const total = Object.values(vector).reduce((a, b) => a + Math.abs(b), 0);
  if (total === 0) return vector;
  
  const normalized: Record<string, number> = {};
  Object.entries(vector).forEach(([key, value]) => {
    normalized[key] = value / total;
  });
  return normalized;
}
