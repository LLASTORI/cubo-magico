import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Sparkles, MessageSquare, Target, Users, Zap, 
  Clock, DollarSign, CheckCircle, AlertCircle, RefreshCw,
  ChevronRight, ChevronLeft, Loader2, ArrowRight, Edit3,
  BarChart2, Shield, Lightbulb, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  useQuizCopilot, 
  InterviewAnswers, 
  DesignRationale, 
  GeneratedQuiz,
  ValidationReport 
} from '@/hooks/useQuizCopilot';

interface CognitiveQuizArchitectProps {
  onComplete: (quizId: string) => void;
  onCancel: () => void;
}

// Interview questions configuration
const INTERVIEW_STEPS = [
  {
    id: 'objective',
    title: 'Qual o objetivo principal deste quiz?',
    subtitle: 'Vou usar isso para definir as dimensões cognitivas e o tipo de perguntas',
    field: 'objective',
  },
  {
    id: 'funnel',
    title: 'Onde no funil este quiz será usado?',
    subtitle: 'Isso influencia a profundidade e o tom das perguntas',
    field: 'funnelPosition',
  },
  {
    id: 'persona',
    title: 'Quem é o público-alvo?',
    subtitle: 'Me conte sobre as características, dores e objeções do seu público',
    field: 'persona',
  },
  {
    id: 'decision',
    title: 'Que decisão o sistema deve tomar após o quiz?',
    subtitle: 'Isso define os outcomes e as ações automáticas',
    field: 'postQuizDecision',
  },
  {
    id: 'length',
    title: 'Qual o tamanho ideal do quiz?',
    subtitle: 'Quizzes mais longos capturam mais dados, mas podem ter mais abandono',
    field: 'quizLength',
  },
  {
    id: 'context',
    title: 'Contexto do negócio',
    subtitle: 'Informações adicionais para personalizar as perguntas',
    field: 'businessContext',
  },
];

const OBJECTIVES = [
  { value: 'segmentation', label: 'Segmentação de Audiência', icon: Users, description: 'Classificar leads em grupos distintos' },
  { value: 'diagnosis', label: 'Diagnóstico', icon: Target, description: 'Avaliar situação atual e necessidades' },
  { value: 'qualification', label: 'Qualificação de Leads', icon: CheckCircle, description: 'Determinar fit e prontidão para compra' },
  { value: 'routing', label: 'Roteamento para Ofertas', icon: ArrowRight, description: 'Direcionar para produto/oferta certa' },
  { value: 'onboarding', label: 'Onboarding', icon: Sparkles, description: 'Personalizar experiência inicial' },
  { value: 'profiling', label: 'Perfil de Personalidade', icon: Brain, description: 'Mapear traços e preferências' },
];

const FUNNEL_POSITIONS = [
  { value: 'cold', label: 'Frio (Topo)', description: 'Primeiro contato, não conhece a marca' },
  { value: 'warm', label: 'Morno (Meio)', description: 'Conhece, está considerando opções' },
  { value: 'hot', label: 'Quente (Fundo)', description: 'Pronto para comprar, comparando' },
  { value: 'post_purchase', label: 'Pós-Compra', description: 'Já é cliente, upsell/cross-sell' },
  { value: 'retention', label: 'Retenção', description: 'Cliente ativo, manter engajado' },
  { value: 'churn_prevention', label: 'Prevenção de Churn', description: 'Risco de cancelamento' },
];

const DECISIONS = [
  { value: 'show_content', label: 'Mostrar Conteúdo Personalizado' },
  { value: 'route_offer', label: 'Direcionar para Oferta Específica' },
  { value: 'tag_profile', label: 'Aplicar Tags ao Perfil' },
  { value: 'crm_pipeline', label: 'Mover para Estágio do CRM' },
  { value: 'trigger_automation', label: 'Disparar Automação' },
  { value: 'send_email', label: 'Enviar Email Personalizado' },
];

const QUIZ_LENGTHS = [
  { value: 'ultra_short', label: 'Ultra-curto (3-4 perguntas)', description: 'Máxima conversão, mínimo atrito', questionCount: 4 },
  { value: 'short', label: 'Curto (5-6 perguntas)', description: 'Bom equilíbrio para leads frios', questionCount: 6 },
  { value: 'medium', label: 'Médio (7-9 perguntas)', description: 'Diagnóstico completo', questionCount: 8 },
  { value: 'deep', label: 'Profundo (10+ perguntas)', description: 'Máxima precisão cognitiva', questionCount: 12 },
];

export function CognitiveQuizArchitect({ onComplete, onCancel }: CognitiveQuizArchitectProps) {
  const { state, isProcessing, analyzeInterview, confirmDesignAndGenerate, refineQuiz, saveQuizToDatabase, reset } = useQuizCopilot();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [interview, setInterview] = useState<Partial<InterviewAnswers>>({
    objective: '',
    funnelPosition: '',
    persona: { demographics: '', painPoints: '', objections: '' },
    postQuizDecision: [],
    quizLength: '',
    businessContext: { ticketSize: '', emotionalVsRational: '', urgency: '' },
    additionalContext: '',
  });
  const [refinementInput, setRefinementInput] = useState('');
  const [showDesignConfirmation, setShowDesignConfirmation] = useState(false);

  const totalInterviewSteps = INTERVIEW_STEPS.length;
  const progress = state.step === 'interview' 
    ? ((currentStep + 1) / totalInterviewSteps) * 40
    : state.step === 'reasoning' ? 50
    : state.step === 'generating' ? 70
    : state.step === 'validating' ? 85
    : state.step === 'review' ? 95
    : 100;

  const handleSelectOption = (field: string, value: string | string[]) => {
    if (field === 'postQuizDecision') {
      const current = interview.postQuizDecision || [];
      const newValue = current.includes(value as string)
        ? current.filter(v => v !== value)
        : [...current, value as string];
      setInterview(prev => ({ ...prev, [field]: newValue }));
    } else {
      setInterview(prev => ({ ...prev, [field]: value }));
    }
  };

  const handlePersonaChange = (subfield: string, value: string) => {
    setInterview(prev => ({
      ...prev,
      persona: { ...prev.persona, [subfield]: value }
    }));
  };

  const handleBusinessContextChange = (subfield: string, value: string) => {
    setInterview(prev => ({
      ...prev,
      businessContext: { ...prev.businessContext, [subfield]: value }
    }));
  };

  const canProceed = () => {
    const step = INTERVIEW_STEPS[currentStep];
    switch (step.field) {
      case 'objective': return !!interview.objective;
      case 'funnelPosition': return !!interview.funnelPosition;
      case 'persona': return !!(interview.persona?.demographics || interview.persona?.painPoints);
      case 'postQuizDecision': return (interview.postQuizDecision?.length || 0) > 0;
      case 'quizLength': return !!interview.quizLength;
      case 'businessContext': return true; // Optional
      default: return true;
    }
  };

  const handleNext = async () => {
    if (currentStep < totalInterviewSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // End of interview - analyze and get design rationale
      const result = await analyzeInterview(interview as InterviewAnswers);
      if (result) {
        setShowDesignConfirmation(true);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleConfirmDesign = async () => {
    setShowDesignConfirmation(false);
    await confirmDesignAndGenerate();
  };

  const handleRefine = async () => {
    if (!refinementInput.trim()) return;
    await refineQuiz(refinementInput);
    setRefinementInput('');
  };

  const handleSave = async () => {
    const quizId = await saveQuizToDatabase();
    if (quizId) {
      onComplete(quizId);
    }
  };

  // Render interview step content
  const renderInterviewStep = () => {
    const step = INTERVIEW_STEPS[currentStep];
    
    switch (step.field) {
      case 'objective':
        return (
          <div className="grid grid-cols-2 gap-3">
            {OBJECTIVES.map(obj => (
              <Card
                key={obj.value}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  interview.objective === obj.value && "border-primary bg-primary/5"
                )}
                onClick={() => handleSelectOption('objective', obj.value)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <obj.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{obj.label}</p>
                    <p className="text-xs text-muted-foreground">{obj.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'funnelPosition':
        return (
          <div className="grid grid-cols-2 gap-3">
            {FUNNEL_POSITIONS.map(pos => (
              <Card
                key={pos.value}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  interview.funnelPosition === pos.value && "border-primary bg-primary/5"
                )}
                onClick={() => handleSelectOption('funnelPosition', pos.value)}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-sm">{pos.label}</p>
                  <p className="text-xs text-muted-foreground">{pos.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'persona':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Demografia e contexto</Label>
              <Textarea
                value={interview.persona?.demographics || ''}
                onChange={(e) => handlePersonaChange('demographics', e.target.value)}
                placeholder="Ex: Empreendedores digitais, 25-45 anos, iniciando no marketing digital..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Principais dores e frustrações</Label>
              <Textarea
                value={interview.persona?.painPoints || ''}
                onChange={(e) => handlePersonaChange('painPoints', e.target.value)}
                placeholder="Ex: Não conseguem vender online, não sabem por onde começar, já tentaram sem sucesso..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Objeções comuns</Label>
              <Textarea
                value={interview.persona?.objections || ''}
                onChange={(e) => handlePersonaChange('objections', e.target.value)}
                placeholder="Ex: Preço alto, não tenho tempo, não sei se funciona pra mim..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'postQuizDecision':
        return (
          <div className="grid grid-cols-2 gap-3">
            {DECISIONS.map(dec => (
              <Card
                key={dec.value}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  interview.postQuizDecision?.includes(dec.value) && "border-primary bg-primary/5"
                )}
                onClick={() => handleSelectOption('postQuizDecision', dec.value)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  {interview.postQuizDecision?.includes(dec.value) ? (
                    <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 border rounded shrink-0" />
                  )}
                  <p className="text-sm">{dec.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'quizLength':
        return (
          <div className="space-y-3">
            {QUIZ_LENGTHS.map(len => (
              <Card
                key={len.value}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary/50",
                  interview.quizLength === len.value && "border-primary bg-primary/5"
                )}
                onClick={() => handleSelectOption('quizLength', len.value)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{len.label}</p>
                    <p className="text-xs text-muted-foreground">{len.description}</p>
                  </div>
                  <Badge variant="outline">{len.questionCount} perguntas</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'businessContext':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ticket médio do produto/serviço</Label>
              <Input
                value={interview.businessContext?.ticketSize || ''}
                onChange={(e) => handleBusinessContextChange('ticketSize', e.target.value)}
                placeholder="Ex: R$ 2.000, Alto ticket, Baixo ticket..."
              />
            </div>
            <div className="space-y-2">
              <Label>A decisão de compra é mais emocional ou racional?</Label>
              <div className="flex gap-3">
                {['Emocional', 'Equilibrado', 'Racional'].map(opt => (
                  <Button
                    key={opt}
                    variant={interview.businessContext?.emotionalVsRational === opt.toLowerCase() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBusinessContextChange('emotionalVsRational', opt.toLowerCase())}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Urgência típica do cliente</Label>
              <div className="flex gap-3">
                {['Baixa', 'Média', 'Alta'].map(opt => (
                  <Button
                    key={opt}
                    variant={interview.businessContext?.urgency === opt.toLowerCase() ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleBusinessContextChange('urgency', opt.toLowerCase())}
                  >
                    {opt}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contexto adicional (opcional)</Label>
              <Textarea
                value={interview.additionalContext || ''}
                onChange={(e) => setInterview(prev => ({ ...prev, additionalContext: e.target.value }))}
                placeholder="Qualquer informação adicional que possa ajudar..."
                rows={2}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render design rationale confirmation
  const renderDesignConfirmation = () => {
    if (!state.designRationale) return null;
    const dr = state.designRationale;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <Brain className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-xl font-semibold">Estratégia de Design</h3>
          <p className="text-muted-foreground">
            Baseado na sua entrevista, vou criar um quiz com as seguintes características:
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-primary">{dr.questionCount}</p>
                <p className="text-sm text-muted-foreground">Perguntas</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-primary">{dr.outcomeCount}</p>
                <p className="text-sm text-muted-foreground">Outcomes</p>
              </div>
              <div>
                <p className="text-lg font-medium text-primary capitalize">{dr.flowType}</p>
                <p className="text-sm text-muted-foreground">Tipo de Fluxo</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Dimensões Cognitivas</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dr.cognitiveDimensions.map(dim => (
                    <Badge key={dim} variant="secondary">{dim}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Sinais Primários</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dr.primarySignals.map(sig => (
                    <Badge key={sig} variant="default">{sig}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Sinais Secundários</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {dr.secondarySignals.map(sig => (
                    <Badge key={sig} variant="outline">{sig}</Badge>
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs text-muted-foreground">Explicação</Label>
              <p className="text-sm mt-1">{dr.explanation}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setShowDesignConfirmation(false); setCurrentStep(0); }}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Refazer Entrevista
          </Button>
          <Button onClick={handleConfirmDesign} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando Quiz...
              </>
            ) : (
              <>
                Confirmar e Gerar Quiz
                <Sparkles className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  };

  // Render processing states
  const renderProcessingState = () => {
    const messages: Record<string, { icon: React.ElementType; title: string; subtitle: string }> = {
      reasoning: { icon: Brain, title: 'Analisando Entrevista', subtitle: 'Definindo estratégia cognitiva...' },
      generating: { icon: Sparkles, title: 'Gerando Quiz', subtitle: 'Criando perguntas, opções e outcomes...' },
      validating: { icon: Shield, title: 'Validando Qualidade', subtitle: 'Verificando coerência cognitiva...' },
      saving: { icon: Save, title: 'Salvando Quiz', subtitle: 'Criando no banco de dados...' },
    };

    const current = messages[state.step];
    if (!current) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 space-y-6"
      >
        <current.icon className="h-16 w-16 mx-auto text-primary animate-pulse" />
        <div>
          <h3 className="text-xl font-semibold">{current.title}</h3>
          <p className="text-muted-foreground">{current.subtitle}</p>
        </div>
        <div className="max-w-xs mx-auto">
          <Progress value={progress} className="h-2" />
        </div>
      </motion.div>
    );
  };

  // Render quiz review
  const renderQuizReview = () => {
    if (!state.generatedQuiz) return null;
    const quiz = state.generatedQuiz;
    const validation = state.validation;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Validation Summary */}
        {validation && (
          <Card className={cn(
            "border-2",
            validation.isStrong ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {validation.isStrong ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {validation.isStrong ? 'Quiz Forte' : 'Quiz Precisa de Ajustes'}
                  </span>
                </div>
                <Badge variant={validation.isStrong ? 'default' : 'secondary'}>
                  Score: {validation.overallScore}/100
                </Badge>
              </div>

              <div className="grid grid-cols-5 gap-2 text-xs">
                {Object.entries(validation.metrics).map(([key, value]) => (
                  <div key={key} className="text-center">
                    <div className="font-medium">{value}</div>
                    <div className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                ))}
              </div>

              {validation.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium mb-2">Recomendações:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {validation.recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quiz Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {quiz.name}
            </CardTitle>
            <CardDescription>{quiz.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Perguntas ({quiz.questions.length})</Label>
                  {quiz.questions.map((q, i) => (
                    <div key={i} className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                        <Badge variant="secondary" className="text-xs">{q.type}</Badge>
                      </div>
                      <p className="text-sm font-medium">{q.title}</p>
                      {q.subtitle && <p className="text-xs text-muted-foreground">{q.subtitle}</p>}
                      {q.options && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, j) => (
                            <div key={j} className="text-xs flex items-center gap-2">
                              <span className="text-muted-foreground">{j + 1}.</span>
                              <span>{opt.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Outcomes ({quiz.outcomes.length})</Label>
                  {quiz.outcomes.map((out, i) => (
                    <div key={i} className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{out.name}</p>
                        <Badge variant="outline" className="text-xs">Prioridade: {out.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{out.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Refinement */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Refinar Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={refinementInput}
              onChange={(e) => setRefinementInput(e.target.value)}
              placeholder="Ex: Torne mais agressivo para vendas, reduza para 5 perguntas, adicione uma pergunta sobre orçamento..."
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              {['Mais curto', 'Mais agressivo', 'Mais diagnóstico', 'Otimizar para vendas', 'Otimizar para retenção'].map(sug => (
                <Badge
                  key={sug}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => setRefinementInput(sug)}
                >
                  {sug}
                </Badge>
              ))}
            </div>
            <Button 
              variant="outline" 
              onClick={handleRefine} 
              disabled={!refinementInput.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Aplicar Refinamento
            </Button>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={reset}>
            Recomeçar
          </Button>
          <Button onClick={handleSave} disabled={isProcessing}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Quiz
          </Button>
        </div>
      </motion.div>
    );
  };

  // Main render
  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {state.step === 'interview' 
              ? `Pergunta ${currentStep + 1} de ${totalInterviewSteps}`
              : state.step === 'review' 
                ? 'Revisão Final'
                : 'Processando...'}
          </span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {state.step === 'interview' && !showDesignConfirmation && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* AI Message */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">{INTERVIEW_STEPS[currentStep].title}</p>
                <p className="text-sm text-muted-foreground">{INTERVIEW_STEPS[currentStep].subtitle}</p>
              </div>
            </div>

            {/* Options */}
            {renderInterviewStep()}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={currentStep === 0 ? onCancel : handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                {currentStep === 0 ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button onClick={handleNext} disabled={!canProceed() || isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : currentStep === totalInterviewSteps - 1 ? (
                  <>
                    Analisar
                    <Brain className="h-4 w-4 ml-2" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {showDesignConfirmation && state.designRationale && (
          <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderDesignConfirmation()}
          </motion.div>
        )}

        {(state.step === 'reasoning' || state.step === 'generating' || state.step === 'validating' || state.step === 'saving') && !showDesignConfirmation && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderProcessingState()}
          </motion.div>
        )}

        {state.step === 'review' && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {renderQuizReview()}
          </motion.div>
        )}

        {state.step === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-4"
          >
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h3 className="text-xl font-semibold">Quiz Criado com Sucesso!</h3>
            <p className="text-muted-foreground">
              Seu quiz está pronto para uso. Você será redirecionado para o editor.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
