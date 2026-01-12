import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  MessageSquare, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Hash,
  Type
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CubeLoader } from '@/components/CubeLoader';
import { QuizVectorBars } from '@/components/crm/QuizVectorBars';
import { 
  useQuizSessionAnswers, 
  useQuizSessionDetail,
  QuizAnswer 
} from '@/hooks/useQuizSessionIntelligence';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: 'Escolha única',
  multiple_choice: 'Múltipla escolha',
  text: 'Texto livre',
  scale: 'Escala',
  number: 'Numérico',
  date: 'Data',
  email: 'Email',
  phone: 'Telefone',
  name: 'Nome',
};

export default function QuizAnswersViewer() {
  const { quizId, sessionId } = useParams();
  const navigate = useNavigate();
  const { data: sessionData, isLoading: isLoadingSession } = useQuizSessionDetail(quizId, sessionId);
  const { data: answers, isLoading: isLoadingAnswers } = useQuizSessionAnswers(sessionId, quizId);

  const isLoading = isLoadingSession || isLoadingAnswers;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Respostas do Quiz" />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Respostas do Quiz" />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground">Sessão não encontrada</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { session, result } = sessionData;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Respostas do Quiz" />
      
      {/* Header bar */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(`/quizzes/${quizId}/sessions/${sessionId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Sessão
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{session.quiz?.name || 'Quiz'}</span>
            <Badge variant="secondary">{answers?.length || 0} respostas</Badge>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Session Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Respostas da Sessão
            </CardTitle>
            <CardDescription>
              {session.contact?.name || 'Lead anônimo'} • {' '}
              {format(new Date(session.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {result && ` • Score: ${Math.round((result.normalized_score || 0) * 100)}%`}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Answers List */}
        {!answers || answers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma resposta registrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {answers.map((answer, index) => (
              <AnswerCard key={answer.id} answer={answer} index={index} />
            ))}
          </div>
        )}

        {/* Aggregated Vectors Summary */}
        {result && (Object.keys(result.intent_vector).length > 0 || Object.keys(result.traits_vector).length > 0) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Vetores Acumulados
              </CardTitle>
              <CardDescription>
                Resultado final após todas as respostas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.keys(result.intent_vector).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Vetor de Intenção Final
                    </p>
                    <QuizVectorBars vector={result.intent_vector} type="intent" />
                  </div>
                )}
                {Object.keys(result.traits_vector).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Vetor de Traços Final
                    </p>
                    <QuizVectorBars vector={result.traits_vector} type="traits" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

interface AnswerCardProps {
  answer: QuizAnswer;
  index: number;
}

function AnswerCard({ answer, index }: AnswerCardProps) {
  const hasVectors = answer.option && (
    Object.keys(answer.option.traits_vector || {}).length > 0 ||
    Object.keys(answer.option.intent_vector || {}).length > 0
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Question Number */}
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">{index + 1}</span>
          </div>

          <div className="flex-1 space-y-4">
            {/* Question */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{answer.question?.title || 'Pergunta'}</span>
                {answer.question?.type && (
                  <Badge variant="outline" className="text-xs">
                    {QUESTION_TYPE_LABELS[answer.question.type] || answer.question.type}
                  </Badge>
                )}
              </div>
              {answer.question?.subtitle && (
                <p className="text-sm text-muted-foreground">{answer.question.subtitle}</p>
              )}
            </div>

            <Separator />

            {/* Answer */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">Resposta selecionada:</p>
                  <p className="font-medium">
                    {answer.option?.label || answer.answer_text || '-'}
                  </p>
                  
                  {/* Answer Metadata */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {answer.option?.weight !== undefined && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Hash className="h-3 w-3" />
                        Peso: {answer.option.weight}
                      </Badge>
                    )}
                    {answer.answer_value !== null && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Type className="h-3 w-3" />
                        Valor: {answer.answer_value}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Vectors from this answer (for AI) */}
            {hasVectors && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-dashed rounded-lg bg-background">
                <div className="text-xs text-muted-foreground mb-2 col-span-full flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Vetores desta resposta (dados para IA)
                </div>
                {Object.keys(answer.option?.intent_vector || {}).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Intenção</p>
                    <QuizVectorBars 
                      vector={answer.option!.intent_vector} 
                      type="intent" 
                    />
                  </div>
                )}
                {Object.keys(answer.option?.traits_vector || {}).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Traços</p>
                    <QuizVectorBars 
                      vector={answer.option!.traits_vector} 
                      type="traits" 
                    />
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground">
              Respondido em {format(new Date(answer.created_at), "HH:mm:ss", { locale: ptBR })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
