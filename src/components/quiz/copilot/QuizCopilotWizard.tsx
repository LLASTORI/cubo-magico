/**
 * Quiz Co-Pilot Wizard
 * 
 * Guided wizard for creating quizzes from cognitive objectives.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Target, Zap, MessageSquare, Users, Clock,
  ChevronRight, ChevronLeft, Sparkles, Check, Loader2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  generateQuizArchitecture,
  QuizObjective,
  QuizArchitecture,
  ObjectiveType,
  DecisionType,
  ChannelType,
  DurationType,
} from '@/lib/quizCopilotEngine';

interface QuizCopilotWizardProps {
  onComplete: (architecture: QuizArchitecture) => void;
  onCancel: () => void;
}

const STEPS = ['objective', 'decision', 'channel', 'duration', 'review'] as const;
type Step = typeof STEPS[number];

const OBJECTIVES: { value: ObjectiveType; label: string; description: string; icon: React.ReactNode }[] = [
  { value: 'classify_intent', label: 'Classificar Intenção', description: 'Identificar o momento de compra do lead', icon: <Target className="h-5 w-5" /> },
  { value: 'measure_maturity', label: 'Medir Maturidade', description: 'Avaliar nível de conhecimento e experiência', icon: <Brain className="h-5 w-5" /> },
  { value: 'profile_emotional', label: 'Perfil Comportamental', description: 'Mapear estilo de decisão e personalidade', icon: <Users className="h-5 w-5" /> },
  { value: 'detect_objections', label: 'Detectar Objeções', description: 'Identificar barreiras à compra', icon: <MessageSquare className="h-5 w-5" /> },
  { value: 'qualify_lead', label: 'Qualificar Lead', description: 'Avaliar autoridade, urgência e fit', icon: <Zap className="h-5 w-5" /> },
  { value: 'understand_pain_points', label: 'Descobrir Dores', description: 'Entender principais necessidades', icon: <Brain className="h-5 w-5" /> },
];

const DECISIONS: { value: DecisionType; label: string; description: string }[] = [
  { value: 'segmentation', label: 'Segmentação', description: 'Dividir leads em grupos distintos' },
  { value: 'routing', label: 'Roteamento', description: 'Direcionar para fluxos específicos' },
  { value: 'qualification', label: 'Qualificação', description: 'Classificar qualidade do lead' },
  { value: 'personalization', label: 'Personalização', description: 'Adaptar comunicação e ofertas' },
  { value: 'scoring', label: 'Scoring', description: 'Pontuar e ranquear leads' },
];

const CHANNELS: { value: ChannelType; label: string; icon: React.ReactNode }[] = [
  { value: 'landing', label: 'Landing Page', icon: <span>🖥️</span> },
  { value: 'whatsapp', label: 'WhatsApp', icon: <span>💬</span> },
  { value: 'ads', label: 'Anúncios', icon: <span>📢</span> },
  { value: 'email', label: 'Email', icon: <span>📧</span> },
  { value: 'onboarding', label: 'Onboarding', icon: <span>🚀</span> },
  { value: 'diagnostic', label: 'Diagnóstico', icon: <span>🔍</span> },
];

const DURATIONS: { value: DurationType; label: string; description: string; questions: string }[] = [
  { value: 'quick', label: 'Rápido', description: 'Menos de 2 minutos', questions: '3-5 perguntas' },
  { value: 'medium', label: 'Médio', description: '3-5 minutos', questions: '5-8 perguntas' },
  { value: 'deep', label: 'Profundo', description: '5-10 minutos', questions: '8-15 perguntas' },
];

export function QuizCopilotWizard({ onComplete, onCancel }: QuizCopilotWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('objective');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArchitecture, setGeneratedArchitecture] = useState<QuizArchitecture | null>(null);
  
  const [objective, setObjective] = useState<QuizObjective>({
    primary: 'classify_intent',
    secondary: [],
    decisionType: 'segmentation',
    channel: 'landing',
    duration: 'medium',
  });
  const [context, setContext] = useState('');

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const architecture = generateQuizArchitecture({
      ...objective,
      context,
    });
    
    setGeneratedArchitecture(architecture);
    setIsGenerating(false);
  };

  const handleConfirm = () => {
    if (generatedArchitecture) {
      onComplete(generatedArchitecture);
    }
  };

  const toggleSecondaryObjective = (obj: ObjectiveType) => {
    setObjective(prev => ({
      ...prev,
      secondary: prev.secondary?.includes(obj)
        ? prev.secondary.filter(o => o !== obj)
        : [...(prev.secondary || []), obj],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Passo {currentStepIndex + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}% completo</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 'objective' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Brain className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Qual o objetivo cognitivo deste quiz?</h2>
                <p className="text-muted-foreground">
                  Escolha o objetivo principal e, opcionalmente, objetivos secundários
                </p>
              </div>

              <div className="grid gap-3">
                {OBJECTIVES.map((obj) => (
                  <Card
                    key={obj.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      objective.primary === obj.value && "border-primary bg-primary/5"
                    )}
                    onClick={() => setObjective(prev => ({ ...prev, primary: obj.value }))}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        objective.primary === obj.value ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {obj.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{obj.label}</p>
                        <p className="text-sm text-muted-foreground">{obj.description}</p>
                      </div>
                      {objective.primary === obj.value && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">
                  Objetivos secundários (opcional)
                </Label>
                <div className="flex flex-wrap gap-2">
                  {OBJECTIVES.filter(o => o.value !== objective.primary).map((obj) => (
                    <Badge
                      key={obj.value}
                      variant={objective.secondary?.includes(obj.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSecondaryObjective(obj.value)}
                    >
                      {obj.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentStep === 'decision' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Target className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Que tipo de decisão ele deve gerar?</h2>
                <p className="text-muted-foreground">
                  Como você vai usar os resultados deste quiz
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {DECISIONS.map((dec) => (
                  <Card
                    key={dec.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      objective.decisionType === dec.value && "border-primary bg-primary/5"
                    )}
                    onClick={() => setObjective(prev => ({ ...prev, decisionType: dec.value }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{dec.label}</p>
                        {objective.decisionType === dec.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{dec.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'channel' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <MessageSquare className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Onde este quiz será usado?</h2>
                <p className="text-muted-foreground">
                  O canal influencia a linguagem e estrutura do quiz
                </p>
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                {CHANNELS.map((ch) => (
                  <Card
                    key={ch.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      objective.channel === ch.value && "border-primary bg-primary/5"
                    )}
                    onClick={() => setObjective(prev => ({ ...prev, channel: ch.value }))}
                  >
                    <CardContent className="p-4 text-center">
                      <div className="text-3xl mb-2">{ch.icon}</div>
                      <p className="font-medium text-sm">{ch.label}</p>
                      {objective.channel === ch.value && (
                        <Check className="h-4 w-4 mx-auto mt-2 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Contexto adicional (opcional)</Label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Ex: Curso de marketing digital para iniciantes, público 25-40 anos..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 'duration' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Clock className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Qual a duração desejada?</h2>
                <p className="text-muted-foreground">
                  Quizzes mais curtos têm maior taxa de conclusão
                </p>
              </div>

              <div className="grid gap-4">
                {DURATIONS.map((dur) => (
                  <Card
                    key={dur.value}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      objective.duration === dur.value && "border-primary bg-primary/5"
                    )}
                    onClick={() => setObjective(prev => ({ ...prev, duration: dur.value }))}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{dur.label}</p>
                        <p className="text-sm text-muted-foreground">{dur.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{dur.questions}</Badge>
                        {objective.duration === dur.value && (
                          <Check className="h-4 w-4 mt-2 text-primary ml-auto" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Sparkles className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">Revisar e Gerar</h2>
                <p className="text-muted-foreground">
                  Confirme as configurações e gere a estrutura do quiz
                </p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Objetivo principal:</span>
                      <span className="font-medium">
                        {OBJECTIVES.find(o => o.value === objective.primary)?.label}
                      </span>
                    </div>
                    {objective.secondary && objective.secondary.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Objetivos secundários:</span>
                        <span className="font-medium">
                          {objective.secondary.map(s => OBJECTIVES.find(o => o.value === s)?.label).join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo de decisão:</span>
                      <span className="font-medium">
                        {DECISIONS.find(d => d.value === objective.decisionType)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Canal:</span>
                      <span className="font-medium">
                        {CHANNELS.find(c => c.value === objective.channel)?.label}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duração:</span>
                      <span className="font-medium">
                        {DURATIONS.find(d => d.value === objective.duration)?.label}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!generatedArchitecture && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Gerando estrutura...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Gerar Quiz com Co-Pilot
                    </>
                  )}
                </Button>
              )}

              {generatedArchitecture && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <Card className="border-success bg-success/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Check className="h-5 w-5 text-success" />
                        Estrutura Gerada
                      </CardTitle>
                      <CardDescription>{generatedArchitecture.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm">{generatedArchitecture.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Perguntas:</span>
                          <span className="ml-2 font-medium">{generatedArchitecture.questions.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duração:</span>
                          <span className="ml-2 font-medium">~{generatedArchitecture.estimatedDuration} min</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cobertura:</span>
                          <span className="ml-2 font-medium">{generatedArchitecture.cognitiveProfile.expectedCoverage}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Outcomes:</span>
                          <span className="ml-2 font-medium">{generatedArchitecture.suggestedOutcomes.length}</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-xs text-muted-foreground">Dimensões cobertas:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {generatedArchitecture.cognitiveProfile.targetTraits.slice(0, 4).map(t => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                          {generatedArchitecture.cognitiveProfile.targetIntents.slice(0, 3).map(i => (
                            <Badge key={i} variant="outline" className="text-xs">{i}</Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button className="w-full" size="lg" onClick={handleConfirm}>
                    Criar Quiz com esta Estrutura
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={currentStepIndex === 0 ? onCancel : handleBack}>
          {currentStepIndex === 0 ? 'Cancelar' : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </>
          )}
        </Button>
        
        {currentStep !== 'review' && (
          <Button onClick={handleNext}>
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
