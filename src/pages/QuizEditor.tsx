import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, 
  ChevronDown, ChevronUp, Copy, ExternalLink, Lock, Check,
  Brain, Activity, Play, Loader2
} from 'lucide-react';
import { QuizArchitecture } from '@/lib/quizCopilotEngine';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppHeader } from '@/components/AppHeader';
import { InsightsSubNav } from '@/components/insights/InsightsSubNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useQuiz, useQuizzes, QUIZ_TYPES, QUESTION_TYPES, QuizQuestion, QuizOption } from '@/hooks/useQuizzes';
import { useQuizOutcomes } from '@/hooks/useQuizOutcomes';
import { QuizVectorEditor } from '@/components/quiz/QuizVectorEditor';
import { QuizOutcomeEditor } from '@/components/quiz/QuizOutcomeEditor';
import { QuizCognitiveHealth, QuizSimulator } from '@/components/quiz/copilot';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useProject } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

// Experience Engine unified components
import {
  ExperienceAppearanceSettings,
  ExperienceStartScreenSettings,
  ExperienceEndScreenSettings,
  ExperienceSlugSettings,
  ExperiencePreview,
  ExperienceTheme,
  ExperienceStartScreen,
  ExperienceEndScreen,
  DEFAULT_THEME,
  DEFAULT_START_SCREEN,
  DEFAULT_END_SCREEN,
} from '@/components/experience';

// Sortable Question Card Component
function SortableQuestionCard({
  question,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  options,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
}: {
  question: QuizQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<QuizQuestion>) => void;
  onDelete: () => void;
  options: QuizOption[];
  onAddOption: () => void;
  onUpdateOption: (id: string, data: Partial<QuizOption>) => void;
  onDeleteOption: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeLabel = QUESTION_TYPES.find(t => t.value === question.type)?.label || question.type;

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card className="border">
          <CardHeader className="p-4">
            <div className="flex items-center gap-3">
              <div {...attributes} {...listeners} className="cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="font-normal">
                {index + 1}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{question.title || 'Sem título'}</p>
                <p className="text-xs text-muted-foreground">{typeLabel}</p>
              </div>
              <Badge variant={question.is_required ? 'default' : 'secondary'}>
                {question.is_required ? 'Obrigatória' : 'Opcional'}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título da Pergunta</Label>
                  <Input
                    value={question.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="Digite sua pergunta..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={question.type}
                    onValueChange={(value) => onUpdate({ type: value as QuizQuestion['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subtítulo (opcional)</Label>
                <Input
                  value={question.subtitle || ''}
                  onChange={(e) => onUpdate({ subtitle: e.target.value })}
                  placeholder="Texto adicional de ajuda..."
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={question.is_required}
                    onCheckedChange={(checked) => onUpdate({ is_required: checked })}
                  />
                  <Label>Obrigatória</Label>
                </div>
              </div>

              {/* Options for choice questions */}
              {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Opções</Label>
                    <Button variant="outline" size="sm" onClick={onAddOption}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  
                  {options.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma opção adicionada
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {options.map((option, optIdx) => (
                        <OptionEditor
                          key={option.id}
                          option={option}
                          index={optIdx}
                          onUpdate={(data) => onUpdateOption(option.id, data)}
                          onDelete={() => onDeleteOption(option.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// Option Editor Component
function OptionEditor({
  option,
  index,
  onUpdate,
  onDelete,
}: {
  option: QuizOption;
  index: number;
  onUpdate: (data: Partial<QuizOption>) => void;
  onDelete: () => void;
}) {
  const [showVectors, setShowVectors] = useState(false);

  return (
    <Card className="bg-muted/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-normal">
            {index + 1}
          </Badge>
          <div className="flex-1 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input
                value={option.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Texto da opção..."
              />
            </div>
            <div>
              <Input
                type="number"
                value={option.weight}
                onChange={(e) => onUpdate({ weight: parseFloat(e.target.value) || 1 })}
                placeholder="Peso"
                step="0.1"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowVectors(!showVectors)}
          >
            {showVectors ? 'Ocultar Vetores' : 'Vetores'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {showVectors && (
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <QuizVectorEditor
              type="traits"
              vector={option.traits_vector || {}}
              onChange={(v) => onUpdate({ traits_vector: v })}
            />
            <QuizVectorEditor
              type="intent"
              vector={option.intent_vector || {}}
              onChange={(v) => onUpdate({ intent_vector: v })}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function QuizEditor() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { selectedProject } = useProject();
  const { quiz, isLoading, error: quizError, refetch, addQuestion, updateQuestion, deleteQuestion, reorderQuestions, addOption, updateOption, deleteOption } = useQuiz(quizId);
  const { updateQuiz } = useQuizzes();
  const { outcomes } = useQuizOutcomes(quizId);
  const { isModuleEnabled, isLoading: isLoadingModules } = useProjectModules();

  const [activeTab, setActiveTab] = useState('info');
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [quizData, setQuizData] = useState({
    name: '',
    description: '',
    type: 'lead',
    requires_identification: true,
    allow_anonymous: false,
    is_active: false,
  });
  
  // Experience Engine unified state
  const [slug, setSlug] = useState('');
  const [theme, setTheme] = useState<ExperienceTheme>(DEFAULT_THEME);
  const [startScreen, setStartScreen] = useState<ExperienceStartScreen>(DEFAULT_START_SCREEN);
  const [endScreen, setEndScreen] = useState<ExperienceEndScreen>(DEFAULT_END_SCREEN);
  
  const [isCreatingFromArchitecture, setIsCreatingFromArchitecture] = useState(false);
  const architectureProcessed = useRef(false);

  const insightsEnabled = isModuleEnabled('insights');

  // Process architecture from Co-Pilot if provided
  useEffect(() => {
    const processArchitecture = async () => {
      const architecture = location.state?.architecture as QuizArchitecture | undefined;
      
      if (!architecture || !quiz || !quizId || architectureProcessed.current) return;
      if (quiz.quiz_questions && quiz.quiz_questions.length > 0) return; // Already has questions
      
      architectureProcessed.current = true;
      setIsCreatingFromArchitecture(true);
      
      try {
        console.log('[QuizEditor] Processing Co-Pilot architecture:', architecture);
        
        // Create questions from architecture
        for (let i = 0; i < architecture.questions.length; i++) {
          const q = architecture.questions[i];
          
          // Add question
          const questionResult = await addQuestion.mutateAsync({
            type: q.type as QuizQuestion['type'],
            title: q.suggestedTitle || `Pergunta ${i + 1}`,
            subtitle: q.suggestedSubtitle || q.purpose,
            order_index: i,
            is_required: q.isRequired,
          });
          
          // Add options for choice questions
          if ((q.type === 'single_choice' || q.type === 'multiple_choice') && questionResult?.id) {
            // Use suggested options if available
            if (q.suggestedOptions && q.suggestedOptions.length > 0) {
              for (let j = 0; j < q.suggestedOptions.length; j++) {
                const opt = q.suggestedOptions[j];
                await addOption.mutateAsync({
                  questionId: questionResult.id,
                  label: opt.label,
                  value: opt.value || `option_${j + 1}`,
                  order_index: j,
                  weight: opt.weight || q.weight || 1,
                  traits_vector: opt.traitsVector || {},
                  intent_vector: opt.intentVector || {},
                });
              }
            } else {
              // Generate default options based on traits/intents impact
              const defaultOptions = [
                { label: 'Sim, com certeza', weight: 1 },
                { label: 'Talvez, estou avaliando', weight: 0.5 },
                { label: 'Não, ainda não', weight: 0 },
                { label: 'Preciso de mais informações', weight: 0.25 },
              ];
              
              for (let j = 0; j < defaultOptions.length; j++) {
                const traitsVector: Record<string, number> = {};
                const intentVector: Record<string, number> = {};
                
                // Apply weights from archetype
                Object.entries(q.traitsImpact || {}).forEach(([key, val]) => {
                  traitsVector[key] = (val as number) * defaultOptions[j].weight;
                });
                Object.entries(q.intentsImpact || {}).forEach(([key, val]) => {
                  intentVector[key] = (val as number) * defaultOptions[j].weight;
                });
                
                await addOption.mutateAsync({
                  questionId: questionResult.id,
                  label: defaultOptions[j].label,
                  value: `option_${j + 1}`,
                  order_index: j,
                  weight: q.weight || 1,
                  traits_vector: traitsVector,
                  intent_vector: intentVector,
                });
              }
            }
          }
        }
        
        toast({ 
          title: 'Perguntas criadas com sucesso!', 
          description: `${architecture.questions.length} perguntas foram adicionadas automaticamente.` 
        });
        
        // Clear the state to prevent re-processing
        window.history.replaceState({}, document.title);
        
        // Switch to questions tab
        setActiveTab('questions');
        
      } catch (error: any) {
        console.error('[QuizEditor] Error processing architecture:', error);
        toast({ 
          title: 'Erro ao criar perguntas', 
          description: error.message,
          variant: 'destructive' 
        });
      } finally {
        setIsCreatingFromArchitecture(false);
      }
    };
    
    processArchitecture();
  }, [quiz, quizId, location.state, addQuestion, addOption, toast]);

  // Load quiz data into state
  useEffect(() => {
    if (quiz) {
      setQuizData({
        name: quiz.name,
        description: quiz.description || '',
        type: quiz.type,
        requires_identification: quiz.requires_identification,
        allow_anonymous: quiz.allow_anonymous,
        is_active: quiz.is_active,
      });
      
      // Load slug
      setSlug(quiz.slug || '');
      
      // Load theme from theme_config
      if (quiz.theme_config) {
        const tc = quiz.theme_config as Record<string, any>;
        setTheme({
          primary_color: tc.primary_color || DEFAULT_THEME.primary_color,
          text_color: tc.text_color || DEFAULT_THEME.text_color,
          secondary_text_color: tc.secondary_text_color || DEFAULT_THEME.secondary_text_color,
          input_text_color: tc.input_text_color || DEFAULT_THEME.input_text_color,
          background_color: tc.background_color || DEFAULT_THEME.background_color,
          background_image: tc.background_image,
          logo_url: tc.logo_url,
          show_progress: tc.show_progress !== false,
          one_question_per_page: tc.one_question_per_page !== false,
        });
      }
      
      // Load start screen
      if (quiz.start_screen_config) {
        const ssc = quiz.start_screen_config as Record<string, any>;
        setStartScreen({
          headline: ssc.headline || '',
          subheadline: ssc.subheadline || '',
          description: ssc.description || '',
          image_url: ssc.image_url || '',
          cta_text: ssc.cta_text || 'Começar',
          estimated_time: ssc.estimated_time || '2 minutos',
          benefits: ssc.benefits || [],
        });
      }
      
      // Load end screen
      if (quiz.end_screen_config) {
        const esc = quiz.end_screen_config as Record<string, any>;
        setEndScreen({
          headline: esc.headline || 'Obrigado!',
          subheadline: esc.subheadline || 'Sua participação é muito importante.',
          image_url: esc.image_url || '',
          cta_text: esc.cta_text || '',
          cta_url: esc.cta_url || '',
          show_results: esc.show_results || esc.show_summary || false,
          show_share: esc.show_share !== false,
        });
      }
    }
  }, [quiz]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && quiz?.quiz_questions) {
      const oldIndex = quiz.quiz_questions.findIndex(q => q.id === active.id);
      const newIndex = quiz.quiz_questions.findIndex(q => q.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(quiz.quiz_questions, oldIndex, newIndex);
        const updates = reordered.map((q, idx) => ({ id: q.id, order_index: idx }));
        reorderQuestions.mutate(updates);
      }
    }
  };

  const saveQuiz = async () => {
    if (!quizId) return;
    
    await updateQuiz.mutateAsync({
      id: quizId,
      ...quizData,
      slug: slug || null,
      theme_config: theme as Record<string, unknown>,
      start_screen_config: startScreen as Record<string, unknown>,
      end_screen_config: endScreen as Record<string, unknown>,
    });
    toast({ title: 'Quiz salvo com sucesso' });
  };

  const handleAddQuestion = async (type: string) => {
    const order_index = quiz?.quiz_questions?.length || 0;
    await addQuestion.mutateAsync({
      type: type as QuizQuestion['type'],
      title: 'Nova pergunta',
      order_index,
      is_required: true,
    });
  };

  const handleAddOption = async (questionId: string) => {
    const question = quiz?.quiz_questions?.find(q => q.id === questionId);
    const order_index = question?.quiz_options?.length || 0;
    await addOption.mutateAsync({
      questionId,
      label: 'Nova opção',
      value: `option_${order_index + 1}`,
      order_index,
      weight: 1,
      traits_vector: {},
      intent_vector: {},
    });
  };

  const toggleQuestionExpanded = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate public URL based on project code and slug
  const getPublicUrl = useCallback(() => {
    if (!quizId) return '';
    const code = selectedProject?.code || '';
    const slugPart = slug || quizId;
    return code ? `/q/${code}/${slugPart}` : `/q/${quizId}`;
  }, [quizId, slug, selectedProject?.code]);

  const copyPublicLink = () => {
    const url = `${window.location.origin}${getPublicUrl()}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  // Preview data - memoized to prevent re-renders
  const previewConfig = useMemo(() => ({
    theme,
    startScreen,
    endScreen,
    name: quizData.name || 'Quiz',
    questions: quiz?.quiz_questions?.map(q => ({
      id: q.id,
      title: q.title,
      subtitle: q.subtitle,
      type: q.type,
      options: q.quiz_options?.map(o => ({
        id: o.id,
        label: o.label,
      })) || [],
    })) || [],
  }), [theme, startScreen, endScreen, quizData.name, quiz?.quiz_questions]);

  if (!isLoadingModules && !insightsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Quiz" />
        <InsightsSubNav />
        <main className="container mx-auto px-6 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Módulo não habilitado</h3>
              <p className="text-muted-foreground">
                O módulo de Insights não está ativo para este projeto.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading || isLoadingModules || isCreatingFromArchitecture) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Quiz" />
        <InsightsSubNav />
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <CubeLoader size="lg" />
          {isCreatingFromArchitecture && (
            <div className="text-center">
              <p className="text-lg font-medium">Criando perguntas do Co-Pilot...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Quiz" />
        <InsightsSubNav />
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="max-w-md mx-auto">
            <p className="text-lg font-medium text-foreground mb-2">Quiz não encontrado</p>
            <p className="text-muted-foreground mb-4">
              {quizError?.message || 'O quiz pode ter sido excluído ou você não tem acesso a ele.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
              <Button onClick={() => navigate('/quizzes')}>
                Voltar para Quizzes
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Editor de Quiz" />
      <InsightsSubNav />
      
      {/* Header bar */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/quizzes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{quiz.name}</span>
            <Badge variant={quiz.is_active ? 'default' : 'secondary'}>
              {quiz.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyPublicLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(getPublicUrl(), '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/quizzes/${quizId}/results`)}>
              <Eye className="h-4 w-4 mr-2" />
              Resultados
            </Button>
            <Button onClick={saveQuiz} disabled={updateQuiz.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="info">1. Informações</TabsTrigger>
            <TabsTrigger value="appearance">2. Aparência</TabsTrigger>
            <TabsTrigger value="screens">3. Telas</TabsTrigger>
            <TabsTrigger value="questions">4. Perguntas</TabsTrigger>
            <TabsTrigger value="options">5. Opções & Vetores</TabsTrigger>
            <TabsTrigger value="outcomes">6. Outcomes</TabsTrigger>
            <TabsTrigger value="cognitive" className="flex items-center gap-1">
              <Brain className="h-3 w-3" />
              7. Saúde Cognitiva
            </TabsTrigger>
            <TabsTrigger value="simulator" className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              8. Simulador
            </TabsTrigger>
            <TabsTrigger value="preview">9. Preview</TabsTrigger>
          </TabsList>

          {/* Step 1: General Info */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>Configure as informações básicas do quiz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Quiz *</Label>
                    <Input
                      id="name"
                      value={quizData.name}
                      onChange={(e) => setQuizData({ ...quizData, name: e.target.value })}
                      placeholder="Ex: Quiz de Qualificação"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={quizData.type}
                      onValueChange={(value) => setQuizData({ ...quizData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUIZ_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    placeholder="Descreva o objetivo deste quiz..."
                    rows={3}
                  />
                </div>

                {/* Slug Settings - Experience Engine unified */}
                <ExperienceSlugSettings
                  experienceType="quiz"
                  experienceId={quizId!}
                  projectId={selectedProject?.id || ''}
                  slug={slug}
                  onSlugChange={setSlug}
                />

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Ativo</Label>
                      <p className="text-xs text-muted-foreground">Quiz disponível ao público</p>
                    </div>
                    <Switch
                      checked={quizData.is_active}
                      onCheckedChange={(checked) => setQuizData({ ...quizData, is_active: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Requer Identificação</Label>
                      <p className="text-xs text-muted-foreground">Solicitar dados do lead</p>
                    </div>
                    <Switch
                      checked={quizData.requires_identification}
                      onCheckedChange={(checked) => setQuizData({ ...quizData, requires_identification: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Permitir Anônimo</Label>
                      <p className="text-xs text-muted-foreground">Responder sem se identificar</p>
                    </div>
                    <Switch
                      checked={quizData.allow_anonymous}
                      onCheckedChange={(checked) => setQuizData({ ...quizData, allow_anonymous: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 2: Appearance - Experience Engine unified */}
          <TabsContent value="appearance" className="space-y-6">
            <ExperienceAppearanceSettings
              theme={theme}
              onThemeChange={setTheme}
              projectId={selectedProject?.id || ''}
            />
          </TabsContent>

          {/* Step 3: Screens - Experience Engine unified */}
          <TabsContent value="screens" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExperienceStartScreenSettings
                config={startScreen}
                onChange={setStartScreen}
                projectId={selectedProject?.id || ''}
              />
              <ExperienceEndScreenSettings
                config={endScreen}
                onChange={setEndScreen}
                projectId={selectedProject?.id || ''}
              />
            </div>
          </TabsContent>

          {/* Step 4: Questions */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Perguntas ({quiz.quiz_questions?.length || 0})</h2>
              <div className="flex items-center gap-2">
                {QUESTION_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddQuestion(type.value)}
                    disabled={addQuestion.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {quiz.quiz_questions?.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">Nenhuma pergunta adicionada</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em um dos botões acima para adicionar sua primeira pergunta.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={quiz.quiz_questions?.map(q => q.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {quiz.quiz_questions?.map((question, index) => (
                      <SortableQuestionCard
                        key={question.id}
                        question={question}
                        index={index}
                        isExpanded={expandedQuestions.has(question.id)}
                        onToggle={() => toggleQuestionExpanded(question.id)}
                        onUpdate={(data) => updateQuestion.mutate({ id: question.id, ...data })}
                        onDelete={() => deleteQuestion.mutate(question.id)}
                        options={question.quiz_options || []}
                        onAddOption={() => handleAddOption(question.id)}
                        onUpdateOption={(id, data) => updateOption.mutate({ id, ...data })}
                        onDeleteOption={(id) => deleteOption.mutate(id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </TabsContent>

          {/* Step 5: Options & Vectors */}
          <TabsContent value="options" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Opções e Vetores</CardTitle>
                <CardDescription>
                  Configure os vetores de traços e intenção para cada opção de resposta.
                  Os valores somados devem totalizar 100% para normalização correta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quiz.quiz_questions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Adicione perguntas primeiro</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {quiz.quiz_questions?.filter(q => q.type === 'single_choice' || q.type === 'multiple_choice').map((question, qIdx) => (
                      <div key={question.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{qIdx + 1}</Badge>
                          <span className="font-medium">{question.title}</span>
                        </div>
                        <div className="pl-6 space-y-3">
                          {question.quiz_options?.map((option, oIdx) => (
                            <OptionEditor
                              key={option.id}
                              option={option}
                              index={oIdx}
                              onUpdate={(data) => updateOption.mutate({ id: option.id, ...data })}
                              onDelete={() => deleteOption.mutate(option.id)}
                            />
                          ))}
                          {(!question.quiz_options || question.quiz_options.length === 0) && (
                            <p className="text-sm text-muted-foreground">Nenhuma opção adicionada</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {quiz.quiz_questions?.filter(q => q.type === 'single_choice' || q.type === 'multiple_choice').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Adicione perguntas de escolha única ou múltipla para configurar vetores</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 6: Outcomes (Funnel Brain) */}
          <TabsContent value="outcomes" className="space-y-4">
            <QuizOutcomeEditor quizId={quizId!} />
          </TabsContent>

          {/* Step 7: Cognitive Health */}
          <TabsContent value="cognitive" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Saúde Cognitiva
                </CardTitle>
                <CardDescription>
                  Análise da qualidade cognitiva do quiz: cobertura, sinais, discriminação e ambiguidade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quiz && (
                  <QuizCognitiveHealth 
                    quiz={quiz} 
                    outcomes={outcomes.map(o => ({
                      id: o.id,
                      name: o.name,
                      conditions: o.conditions,
                    }))} 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 8: Simulator */}
          <TabsContent value="simulator" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Simulador de Personas
                </CardTitle>
                <CardDescription>
                  Simule como diferentes perfis responderiam ao quiz para validar outcomes e vetores.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {quiz && (
                  <QuizSimulator 
                    quiz={quiz} 
                    outcomes={outcomes.map(o => ({
                      id: o.id,
                      name: o.name,
                      priority: o.priority,
                      conditions: o.conditions,
                    }))} 
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Step 9: Preview - Experience Engine unified */}
          <TabsContent value="preview" className="space-y-4">
            <ExperiencePreview
              experienceType="quiz"
              config={previewConfig}
              publicUrl={getPublicUrl()}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
