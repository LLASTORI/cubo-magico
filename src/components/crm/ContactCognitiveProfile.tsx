import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Target,
  Clock,
  Zap,
  BarChart3,
  History
} from 'lucide-react';
import { useContactProfile, getPrimaryTrait, getPrimaryIntent, formatSourceName, getSourceColor } from '@/hooks/useContactProfile';
import { formatVectorKeyName } from '@/lib/profileMergeEngine';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactCognitiveProfileProps {
  contactId: string;
}

export function ContactCognitiveProfile({ contactId }: ContactCognitiveProfileProps) {
  const { profile, recentHistory, evolutionTrend, isLoading } = useContactProfile(contactId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Perfil Cognitivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Perfil Cognitivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum perfil cognitivo disponível. Complete quizzes, pesquisas ou interaja para gerar dados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const primaryTrait = getPrimaryTrait(profile);
  const primaryIntent = getPrimaryIntent(profile);

  // Sort vectors by value for display
  const sortedTraits = Object.entries(profile.trait_vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const sortedIntents = Object.entries(profile.intent_vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Perfil Cognitivo
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {profile.total_signals} sinais
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              Confiança
              <TrendIcon trend={evolutionTrend.confidenceTrend} />
            </div>
            <div className="flex items-center gap-2">
              <Progress value={profile.confidence_score * 100} className="h-2 flex-1" />
              <span className="text-xs font-medium">{Math.round(profile.confidence_score * 100)}%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              Volatilidade
            </div>
            <div className="flex items-center gap-2">
              <Progress value={profile.volatility_score * 100} className="h-2 flex-1" />
              <span className="text-xs font-medium">{Math.round(profile.volatility_score * 100)}%</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              Entropia
              <TrendIcon trend={evolutionTrend.entropyTrend} />
            </div>
            <div className="flex items-center gap-2">
              <Progress value={profile.entropy_score * 100} className="h-2 flex-1" />
              <span className="text-xs font-medium">{Math.round(profile.entropy_score * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Intent Vector */}
        {sortedIntents.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              Intenções
            </div>
            <div className="space-y-1.5">
              {sortedIntents.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate">{formatVectorKeyName(key)}</span>
                  <Progress value={value * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trait Vector */}
        {sortedTraits.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Brain className="h-3 w-3" />
              Traits
            </div>
            <div className="space-y-1.5">
              {sortedTraits.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs w-24 truncate">{formatVectorKeyName(key)}</span>
                  <Progress value={value * 100} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Updates */}
        {recentHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <History className="h-3 w-3" />
              Últimas Atualizações
            </div>
            <div className="space-y-2">
              {recentHistory.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 text-xs">
                  <Badge className={`${getSourceColor(entry.source)} text-[10px] px-1.5 py-0`}>
                    {formatSourceName(entry.source)}
                  </Badge>
                  <span className="text-muted-foreground truncate flex-1">
                    {entry.source_name || 'Atualização'}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(entry.created_at), "dd/MM", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signal Sources */}
        <div className="flex flex-wrap gap-1">
          {profile.signal_sources.map((source) => (
            <Badge key={source} variant="outline" className="text-[10px]">
              {formatSourceName(source)}
            </Badge>
          ))}
        </div>

        {/* Last Updated */}
        <p className="text-[10px] text-muted-foreground text-right">
          Atualizado: {format(new Date(profile.last_updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </CardContent>
    </Card>
  );
}
