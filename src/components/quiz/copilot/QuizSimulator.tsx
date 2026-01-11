/**
 * Quiz Cognitive Simulator
 * 
 * Simulates different personas going through the quiz
 * to validate outcomes and vectors.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Users, Target, ChevronRight, RotateCcw,
  User, Brain, TrendingUp, CheckCircle, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  simulateQuizPath,
  PRESET_PERSONAS,
  PersonaSimulation,
  SimulationResult,
} from '@/lib/quizCopilotEngine';
import type { QuizWithQuestions } from '@/hooks/useQuizzes';

interface QuizSimulatorProps {
  quiz: QuizWithQuestions;
  outcomes: Array<{
    id: string;
    name: string;
    priority: number;
    conditions: any[];
  }>;
}

export function QuizSimulator({ quiz, outcomes }: QuizSimulatorProps) {
  const [selectedPersona, setSelectedPersona] = useState<PersonaSimulation | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const questionsForSimulation = useMemo(() => {
    return quiz.quiz_questions?.map(q => ({
      id: q.id,
      title: q.title,
      options: (q.quiz_options || []).map(o => ({
        id: o.id,
        label: o.label,
        value: o.value,
        traits_vector: o.traits_vector,
        intent_vector: o.intent_vector,
        weight: o.weight,
      })),
    })) || [];
  }, [quiz]);

  const runSimulation = async (persona: PersonaSimulation) => {
    setIsSimulating(true);
    setSelectedPersona(persona);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const result = simulateQuizPath(persona, questionsForSimulation, outcomes);
    setSimulationResult(result);
    setIsSimulating(false);
  };

  const resetSimulation = () => {
    setSelectedPersona(null);
    setSimulationResult(null);
  };

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="space-y-6 pr-4">
        {/* Persona Selection */}
        {!selectedPersona && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Escolha uma Persona
              </CardTitle>
              <CardDescription>
                Simule como diferentes perfis responderiam ao quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRESET_PERSONAS.map((persona) => (
                <Card
                  key={persona.id}
                  className="cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => runSimulation(persona)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{persona.name}</p>
                        <p className="text-sm text-muted-foreground">{persona.description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      Simular
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Simulation Loading */}
        {isSimulating && (
          <Card className="border-primary">
            <CardContent className="p-8 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 mx-auto mb-4"
              >
                <Brain className="h-12 w-12 text-primary" />
              </motion.div>
              <p className="font-medium">Simulando jornada...</p>
              <p className="text-sm text-muted-foreground">
                Processando respostas de "{selectedPersona?.name}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Simulation Results */}
        {simulationResult && !isSimulating && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-primary text-primary-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{simulationResult.persona.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {simulationResult.persona.description}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetSimulation}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Nova Simulação
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <SummaryCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Tempo Estimado"
                  value={`${Math.round(simulationResult.completionTime / 60)} min`}
                />
                <SummaryCard
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Perguntas"
                  value={`${simulationResult.path.length}`}
                />
                <SummaryCard
                  icon={<Target className="h-4 w-4" />}
                  label="Outcome"
                  value={simulationResult.triggeredOutcome || 'Nenhum'}
                  highlight={!!simulationResult.triggeredOutcome}
                />
              </div>

              {/* Detailed Results */}
              <Tabs defaultValue="path" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="path">Caminho</TabsTrigger>
                  <TabsTrigger value="vectors">Vetores</TabsTrigger>
                  <TabsTrigger value="events">Eventos</TabsTrigger>
                </TabsList>

                <TabsContent value="path" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Jornada Simulada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {simulationResult.path.map((step, idx) => (
                          <div key={idx} className="relative">
                            {idx < simulationResult.path.length - 1 && (
                              <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
                            )}
                            <div className="flex gap-4">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 pb-4">
                                <p className="font-medium text-sm">{step.questionTitle}</p>
                                <Badge variant="secondary" className="mt-1">
                                  {step.selectedOption}
                                </Badge>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                  {Object.entries(step.cumulativeIntents)
                                    .filter(([_, v]) => Math.abs(v) > 0.1)
                                    .slice(0, 3)
                                    .map(([k, v]) => (
                                      <Badge key={k} variant="outline" className="text-xs">
                                        {k}: {Math.round(v * 100)}%
                                      </Badge>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vectors" className="mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Traços Finais</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(simulationResult.finalTraits)
                          .sort(([, a], [, b]) => b - a)
                          .map(([trait, value]) => (
                            <VectorBar 
                              key={trait} 
                              label={trait} 
                              value={value} 
                              type="trait" 
                            />
                          ))}
                        {Object.keys(simulationResult.finalTraits).length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhum traço capturado</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Intenções Finais</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(simulationResult.finalIntents)
                          .sort(([, a], [, b]) => b - a)
                          .map(([intent, value]) => (
                            <VectorBar 
                              key={intent} 
                              label={intent} 
                              value={value} 
                              type="intent" 
                            />
                          ))}
                        {Object.keys(simulationResult.finalIntents).length === 0 && (
                          <p className="text-sm text-muted-foreground">Nenhuma intenção capturada</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="events" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Eventos Disparados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {simulationResult.events.map((event, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center gap-2 p-2 rounded-lg bg-muted text-sm"
                          >
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            {event}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Outcome Match Analysis */}
              {simulationResult.triggeredOutcome && (
                <Card className="border-success bg-success/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium">
                          Outcome acionado: {simulationResult.triggeredOutcome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Este perfil de persona ativou este outcome com base nos vetores acumulados
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </ScrollArea>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}

function SummaryCard({ icon, label, value, highlight }: SummaryCardProps) {
  return (
    <Card className={cn(highlight && "border-success bg-success/5")}>
      <CardContent className="p-4 text-center">
        <div className={cn(
          "inline-flex items-center justify-center p-2 rounded-full mb-2",
          highlight ? "bg-success/20" : "bg-muted"
        )}>
          {icon}
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("font-semibold text-sm", highlight && "text-success")}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface VectorBarProps {
  label: string;
  value: number;
  type: 'trait' | 'intent';
}

function VectorBar({ label, value, type }: VectorBarProps) {
  const percentage = Math.round(Math.abs(value) * 100);
  const isNegative = value < 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className={cn(
          "font-medium",
          isNegative ? "text-destructive" : type === 'intent' ? "text-primary" : "text-success"
        )}>
          {isNegative ? '-' : ''}{percentage}%
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn(
          "h-2",
          isNegative && "[&>div]:bg-destructive"
        )} 
      />
    </div>
  );
}
