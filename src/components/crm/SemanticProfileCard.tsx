import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  Heart, 
  Target,
  ShoppingBag,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { 
  interpretProfile, 
  generateProfileSummary,
  getSemanticLabels,
  type SemanticProfileInput 
} from '@/lib/semanticProfileEngine';

interface SemanticProfileCardProps {
  intentVector?: Record<string, number>;
  traitVector?: Record<string, number>;
  entropy?: number;
  confidence?: number;
  isLoading?: boolean;
}

export function SemanticProfileCard({ 
  intentVector, 
  traitVector, 
  entropy,
  confidence,
  isLoading 
}: SemanticProfileCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Perfil Semântico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  // Check if we have enough data
  const hasIntentData = intentVector && Object.keys(intentVector).length > 0;
  const hasTraitData = traitVector && Object.keys(traitVector).length > 0;

  if (!hasIntentData && !hasTraitData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Perfil Semântico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dados insuficientes para gerar perfil. Complete quizzes ou pesquisas para enriquecer.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Generate semantic profile
  const profileInput: SemanticProfileInput = {
    vectors: {
      intent_vector: intentVector || {},
      trait_vector: traitVector || {}
    },
    entropy: entropy || 0.5,
    confidence: confidence || 0.5
  };

  const profile = interpretProfile(profileInput);
  const summary = generateProfileSummary(profile);

  // Get semantic labels for display
  const intentLabels = getSemanticLabels(intentVector || {}, 'intent', 3);
  const traitLabels = getSemanticLabels(traitVector || {}, 'trait', 3);

  // Determine risk badge color
  const getRiskColor = () => {
    if (profile.risk_profile.includes('Alto')) return 'bg-green-500/10 text-green-600';
    if (profile.risk_profile.includes('Baixo') || profile.risk_profile.includes('Muito baixo')) 
      return 'bg-amber-500/10 text-amber-600';
    return 'bg-blue-500/10 text-blue-600';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            Perfil Semântico
          </CardTitle>
          <Badge variant="outline" className="text-xs font-medium">
            {Math.round(profile.compatibility_score * 100)}% compatível
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Name */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            {profile.profile_name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {summary}
          </p>
        </div>

        {/* Key Insights Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Buying Style */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShoppingBag className="h-3 w-3" />
              Estilo de Decisão
            </div>
            <p className="text-xs">{profile.buying_style}</p>
          </div>

          {/* Emotional Driver */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Heart className="h-3 w-3" />
              Motivação Principal
            </div>
            <p className="text-xs capitalize">{profile.emotional_driver}</p>
          </div>

          {/* Risk Profile */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Prontidão
            </div>
            <Badge className={`text-[10px] ${getRiskColor()}`}>
              {profile.risk_profile.split(' - ')[0]}
            </Badge>
          </div>

          {/* Copy Angle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Abordagem Ideal
            </div>
            <p className="text-xs capitalize">
              {profile.copy_angle.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Semantic Labels */}
        <div className="space-y-3 pt-2 border-t">
          {/* Intent Labels */}
          {intentLabels.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Target className="h-3 w-3" />
                Intenções
              </div>
              <div className="flex flex-wrap gap-1.5">
                {intentLabels.map(({ key, label, value }) => (
                  <Badge 
                    key={key} 
                    variant="secondary" 
                    className="text-[10px] font-normal"
                  >
                    {label} • {Math.round(value * 100)}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Trait Labels */}
          {traitLabels.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                Características
              </div>
              <div className="flex flex-wrap gap-1.5">
                {traitLabels.map(({ key, label, value }) => (
                  <Badge 
                    key={key} 
                    variant="outline" 
                    className="text-[10px] font-normal"
                  >
                    {label} • {Math.round(value * 100)}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
