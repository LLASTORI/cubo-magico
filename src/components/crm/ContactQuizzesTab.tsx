import { useNavigate } from 'react-router-dom';
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CubeLoader } from '@/components/CubeLoader';
import { useContactQuizzes, ContactQuizData } from '@/hooks/useContactQuizzes';
import { QuizVectorBars } from './QuizVectorBars';

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
  const navigate = useNavigate();
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
              Média de {completedQuizzes} quizzes completados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {aggregatedProfile.primaryTrait && (
                <Badge variant="outline" className="gap-1">
                  <Target className="h-3 w-3" />
                  Traço: {aggregatedProfile.primaryTrait}
                </Badge>
              )}
              {aggregatedProfile.primaryIntent && (
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Intenção: {aggregatedProfile.primaryIntent}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(aggregatedProfile.avgTraitsVector).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Traços Médios</p>
                  <QuizVectorBars vector={aggregatedProfile.avgTraitsVector} type="traits" />
                </div>
              )}
              {Object.keys(aggregatedProfile.avgIntentVector).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Intenção Média</p>
                  <QuizVectorBars vector={aggregatedProfile.avgIntentVector} type="intent" />
                </div>
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
  const { session, result, answersCount } = data;
  const statusConfig = STATUS_CONFIG[session.status] || STATUS_CONFIG.started;
  const StatusIcon = statusConfig.icon;

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

      {/* Summary (if completed) */}
      {result && result.summary && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm">
            {typeof result.summary === 'object' && result.summary.description 
              ? result.summary.description 
              : 'Este lead demonstra características distintas baseadas nas respostas do quiz.'}
          </p>
        </div>
      )}

      {/* Score and Progress */}
      {result && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Score Normalizado</p>
            <div className="flex items-center gap-2">
              <Progress value={result.normalized_score * 100} className="flex-1 h-2" />
              <span className="text-sm font-medium">{Math.round(result.normalized_score * 100)}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Respostas</p>
            <p className="text-sm font-medium">{answersCount} perguntas respondidas</p>
          </div>
        </div>
      )}

      {/* Intent Vector */}
      {result && Object.keys(result.intent_vector).length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Vetor de Intenção
          </p>
          <QuizVectorBars vector={result.intent_vector} type="intent" />
        </div>
      )}

      {/* Traits Vector */}
      {result && Object.keys(result.traits_vector).length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Target className="h-3 w-3" />
            Vetor de Traços
          </p>
          <QuizVectorBars vector={result.traits_vector} type="traits" />
        </div>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="text-xs">
          Ver respostas
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs">
          Ver sessão completa
          <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
