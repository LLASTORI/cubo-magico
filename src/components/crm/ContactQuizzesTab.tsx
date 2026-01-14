import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Brain, 
  Calendar, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Target,
  TrendingUp,
  AlertCircle,
  FileQuestion
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CubeLoader } from '@/components/CubeLoader';
import { useContactQuizzes, ContactQuizData } from '@/hooks/useContactQuizzes';
import { ContactQuizSemanticCard } from './ContactQuizSemanticCard';
import { getSemanticLabel } from '@/lib/semanticProfileEngine';

const QUIZ_TYPE_LABELS: Record<string, string> = {
  lead: 'Lead',
  qualification: 'Qualificação',
  funnel: 'Funil',
  onboarding: 'Onboarding',
  entertainment: 'Entretenimento',
  viral: 'Viral',
  research: 'Pesquisa',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  completed: { label: 'Completo', color: 'bg-green-500', icon: CheckCircle },
  in_progress: { label: 'Em progresso', color: 'bg-amber-500', icon: Clock },
  started: { label: 'Iniciado', color: 'bg-blue-500', icon: Target },
  abandoned: { label: 'Abandonado', color: 'bg-red-500', icon: AlertCircle },
};

interface ContactQuizzesTabProps {
  contactId: string;
}

export function ContactQuizzesTab({ contactId }: ContactQuizzesTabProps) {
  const { navigateTo } = useProjectNavigation();
  const { quizzes, isLoading, totalQuizzes, completedQuizzes, aggregatedProfile } = useContactQuizzes(contactId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <CubeLoader size="sm" />
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum quiz respondido</p>
          <p className="text-sm text-muted-foreground mt-2">
            Quando este contato responder um quiz, os resultados aparecerão aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aggregated Profile Card (if multiple quizzes) */}
      {aggregatedProfile && completedQuizzes > 1 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-primary" />
              Perfil Agregado
            </CardTitle>
            <CardDescription>
              Consolidado de {completedQuizzes} quizzes completados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              {aggregatedProfile.primaryTrait && (
                <Badge variant="outline" className="gap-1 bg-blue-50 border-blue-200 text-blue-700">
                  <Target className="h-3 w-3" />
                  Traço: {getSemanticLabel(aggregatedProfile.primaryTrait, 'trait')}
                </Badge>
              )}
              {aggregatedProfile.primaryIntent && (
                <Badge variant="outline" className="gap-1 bg-green-50 border-green-200 text-green-700">
                  <TrendingUp className="h-3 w-3" />
                  Intenção: {getSemanticLabel(aggregatedProfile.primaryIntent, 'intent')}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Quizzes List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quizzes Respondidos
          </CardTitle>
          <CardDescription>
            {totalQuizzes} {totalQuizzes === 1 ? 'quiz' : 'quizzes'} • {completedQuizzes} {completedQuizzes === 1 ? 'completo' : 'completos'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizzes.map((quizData) => (
            <QuizResultCard key={quizData.session.id} data={quizData} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

interface QuizResultCardProps {
  data: ContactQuizData;
}

function QuizResultCard({ data }: QuizResultCardProps) {
  const { navigateTo } = useProjectNavigation();
  const { session, result, answersCount } = data;
  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.started;
  const StatusIcon = statusConfig.icon;

  // Extract summary meta if available
  const summaryMeta = result?.summary?.meta || {};
  const entropy = typeof summaryMeta.entropy === 'number' ? summaryMeta.entropy : undefined;
  const volatility = typeof summaryMeta.volatility === 'number' ? summaryMeta.volatility : undefined;
  const flowType = typeof summaryMeta.flow_type === 'string' ? summaryMeta.flow_type : undefined;

  return (
    <div className="p-4 border rounded-lg space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            {session.quiz?.name || 'Quiz sem nome'}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(session.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge variant="outline" className="gap-1">
            {QUIZ_TYPE_LABELS[session.quiz?.type || ''] || session.quiz?.type || 'Quiz'}
          </Badge>
          <Badge
            variant="secondary" 
            className={`gap-1 ${session.status === 'completed' ? 'bg-green-100 text-green-800' : ''}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Semantic Profile Card - Human Readable */}
      {result && (
        <ContactQuizSemanticCard
          traitsVector={result.traits_vector}
          intentVector={result.intent_vector}
          normalizedScore={result.normalized_score}
          entropy={entropy}
          volatility={volatility}
          flowType={flowType}
          showAIData={true}
        />
      )}

      {/* Quick Stats */}
      {result && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{answersCount} perguntas respondidas</span>
        </div>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs"
          onClick={() => navigateTo(`/quizzes/${session.quiz_id}/sessions/${session.id}/answers`)}
        >
          Ver respostas
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs"
          onClick={() => navigateTo(`/quizzes/${session.quiz_id}/sessions/${session.id}`)}
        >
          Ver sessão completa
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
