import { useParams } from 'react-router-dom';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { format, formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, 
  Brain, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp,
  User,
  FileText,
  Activity,
  Monitor,
  MapPin,
  CheckCircle,
  AlertCircle,
  Play,
  Eye
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CubeLoader } from '@/components/CubeLoader';
import { QuizVectorBars } from '@/components/crm/QuizVectorBars';
import { 
  useQuizSessionDetail, 
  calculateSessionDuration, 
  getEventDisplayName,
  getStatusInfo 
} from '@/hooks/useQuizSessionIntelligence';

export default function QuizSessionViewer() {
  const { quizId, sessionId } = useParams();
  const { navigateTo, navigate } = useProjectNavigation();
  const { data, isLoading, error } = useQuizSessionDetail(quizId, sessionId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Sessão do Quiz" />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Sessão do Quiz" />
        <main className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-muted-foreground">Sessão não encontrada</p>
              {/* CORRIGIDO PROMPT 22: Back seguro com fallback */}
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigateTo('/quizzes');
                  }
                }}
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

  const { session, result, events } = data;
  const statusInfo = getStatusInfo(session.status);
  const duration = calculateSessionDuration(session.started_at, session.completed_at);

  // Get primary intent and trait from result
  const primaryIntent = result?.summary?.primary_intent || 
    (result?.intent_vector && Object.entries(result.intent_vector)
      .sort(([,a], [,b]) => b - a)[0]?.[0]);
  
  const primaryTrait = result?.summary?.primary_trait ||
    (result?.traits_vector && Object.entries(result.traits_vector)
      .sort(([,a], [,b]) => b - a)[0]?.[0]);

  // Get semantic interpretation
  const semanticProfile = result?.semantic_interpretation || result?.summary?.semantic_profile;
  const decisionStyle = semanticProfile?.decision_style || result?.summary?.decision_style;
  const motivation = semanticProfile?.motivation || result?.summary?.motivation;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Sessão do Quiz" />
      
      {/* Header bar */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* CORRIGIDO PROMPT 22: Back seguro com fallback */}
            <Button variant="ghost" size="sm" onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigateTo(`/quizzes/${quizId}`);
              }
            }}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{session.quiz?.name || 'Quiz'}</span>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigateTo(`/quizzes/${quizId}/sessions/${sessionId}/answers`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver Respostas
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Session Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Session Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Informações da Sessão
              </CardTitle>
              <CardDescription>{statusInfo.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Info */}
              {session.contact && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{session.contact.name || 'Lead'}</p>
                    <p className="text-sm text-muted-foreground">{session.contact.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => navigateTo(`/crm/contact/${session.contact_id}`)}
                  >
                    Ver no CRM →
                  </Button>
                </div>
              )}

              {/* Time Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs">Iniciado em</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(session.started_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Duração</span>
                  </div>
                  <p className="font-medium">{duration}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs">Perguntas respondidas</span>
                  </div>
                  <p className="font-medium">{result?.questions_answered || 0}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs">Score</span>
                  </div>
                  <p className="font-medium">
                    {result ? `${Math.round((result.normalized_score || 0) * 100)}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Device Info */}
              {session.user_agent && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Monitor className="h-4 w-4" />
                    <span className="text-xs">Dispositivo</span>
                  </div>
                  <p className="text-sm font-medium truncate">{session.user_agent}</p>
                </div>
              )}

              {/* UTM Data */}
              {session.utm_data && Object.keys(session.utm_data as object).length > 0 && (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Origem (UTM)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(session.utm_data as Record<string, string>).map(([key, value]) => (
                      value && (
                        <Badge key={key} variant="outline" className="text-xs">
                          {key}: {value}
                        </Badge>
                      )
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Cognitive Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Perfil Cognitivo
              </CardTitle>
              <CardDescription>
                Como este lead pensa e decide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Intent & Trait */}
              <div className="space-y-2">
                {primaryIntent && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Intenção:</span>
                    <Badge variant="default">{primaryIntent}</Badge>
                  </div>
                )}
                {primaryTrait && (
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Traço:</span>
                    <Badge variant="secondary">{primaryTrait}</Badge>
                  </div>
                )}
              </div>

              {/* Decision Style & Motivation */}
              {(decisionStyle || motivation) && (
                <>
                  <Separator />
                  <div className="space-y-3 text-sm">
                    {decisionStyle && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Estilo de decisão</p>
                        <p className="font-medium">{decisionStyle}</p>
                      </div>
                    )}
                    {motivation && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Motivação</p>
                        <p className="font-medium">{motivation}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Vectors */}
              {result && (
                <>
                  <Separator />
                  {Object.keys(result.intent_vector).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Vetor de Intenção
                      </p>
                      <QuizVectorBars vector={result.intent_vector} type="intent" />
                    </div>
                  )}
                  {Object.keys(result.traits_vector).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Vetor de Traços
                      </p>
                      <QuizVectorBars vector={result.traits_vector} type="traits" />
                    </div>
                  )}
                </>
              )}

              {/* Confidence & Entropy (for AI) */}
              {(result?.confidence_score !== null || result?.entropy_score !== null) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {result?.confidence_score !== null && (
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Confiança</p>
                        <p className="font-medium">{Math.round((result.confidence_score || 0) * 100)}%</p>
                      </div>
                    )}
                    {result?.entropy_score !== null && (
                      <div className="p-2 bg-muted/50 rounded">
                        <p className="text-muted-foreground">Entropia</p>
                        <p className="font-medium">{(result.entropy_score || 0).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Events Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Linha do Tempo
            </CardTitle>
            <CardDescription>
              Eventos registrados durante a sessão ({events.length} eventos)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum evento registrado
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {events.map((event, index) => {
                    const isFirst = index === 0;
                    const isLast = index === events.length - 1;
                    const EventIcon = event.event_name.includes('complete') ? CheckCircle :
                      event.event_name.includes('start') ? Play :
                      event.event_name.includes('view') ? Eye : Activity;
                    
                    return (
                      <div key={event.id} className="relative pl-10">
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-background ${
                          isFirst ? 'bg-green-500' : isLast ? 'bg-primary' : 'bg-muted-foreground'
                        }`} />
                        <div className="p-3 border rounded-lg bg-card">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <EventIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
                                {getEventDisplayName(event.event_name)}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), "HH:mm:ss", { locale: ptBR })}
                              {index > 0 && (
                                <span className="ml-2 text-muted-foreground/60">
                                  +{formatDistance(
                                    new Date(event.created_at), 
                                    new Date(events[0].created_at),
                                    { locale: ptBR }
                                  )}
                                </span>
                              )}
                            </span>
                          </div>
                          {/* Event Payload Preview (for debugging/AI) */}
                          {event.payload && Object.keys(event.payload as object).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded overflow-x-auto">
                              <code className="whitespace-pre-wrap">
                                {JSON.stringify(event.payload, null, 2)}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applied Outcome (if exists) */}
        {result?.summary?.outcome && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Resultado Aplicado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">{result.summary.outcome.name || 'Outcome'}</p>
                {result.summary.outcome.description && (
                  <p className="text-sm text-muted-foreground">
                    {result.summary.outcome.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
