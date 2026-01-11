import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, 
  ChevronDown, ChevronUp, Copy, ExternalLink, Lock, Check
} from 'lucide-react';
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
import { CRMSubNav } from '@/components/crm/CRMSubNav';
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
import { QuizVectorEditor } from '@/components/quiz/QuizVectorEditor';
import { QuizRenderer } from '@/components/quiz/public';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { useProjectModules } from '@/hooks/useProjectModules';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

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
  const { toast } = useToast();
  const { quiz, isLoading, addQuestion, updateQuestion, deleteQuestion, reorderQuestions, addOption, updateOption, deleteOption } = useQuiz(quizId);
  const { updateQuiz } = useQuizzes();
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
  const [startScreen, setStartScreen] = useState<Record<string, any>>({
    headline: '',
    subheadline: '',
    cta_text: 'Começar',
    image_url: '',
  });
  const [endScreen, setEndScreen] = useState<Record<string, any>>({
    headline: 'Obrigado!',
    subheadline: 'Sua participação é muito importante.',
    cta_text: '',
    cta_url: '',
    show_summary: false,
  });

  const insightsEnabled = isModuleEnabled('insights');

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
      if (quiz.start_screen_config) {
        setStartScreen(quiz.start_screen_config as unknown as Record<string, any>);
      }
      if (quiz.end_screen_config) {
        setEndScreen(quiz.end_screen_config as unknown as Record<string, any>);
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
      start_screen_config: startScreen as unknown as Json,
      end_screen_config: endScreen as unknown as Json,
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

  const copyPublicLink = () => {
    if (!quizId) return;
    const url = `${window.location.origin}/q/${quizId}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!' });
  };

  if (!isLoadingModules && !insightsEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Quiz" />
        <CRMSubNav />
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

  if (isLoading || isLoadingModules) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Quiz" />
        <CRMSubNav />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Quiz" />
        <CRMSubNav />
        <div className="container mx-auto px-6 py-12 text-center">
          <p className="text-muted-foreground">Quiz não encontrado</p>
          <Button variant="outline" onClick={() => navigate('/quizzes')} className="mt-4">
            Voltar para Quizzes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Editor de Quiz" />
      <CRMSubNav />
      
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
            <Button variant="outline" size="sm" onClick={() => window.open(`/q/${quizId}`, '_blank')}>
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
          <TabsList>
            <TabsTrigger value="info">1. Informações</TabsTrigger>
            <TabsTrigger value="questions">2. Perguntas</TabsTrigger>
            <TabsTrigger value="options">3. Opções & Vetores</TabsTrigger>
            <TabsTrigger value="screens">4. Telas</TabsTrigger>
            <TabsTrigger value="preview">5. Preview</TabsTrigger>
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

          {/* Step 2: Questions */}
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

          {/* Step 3: Options & Vectors */}
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

          {/* Step 4: Screens */}
          <TabsContent value="screens" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tela Inicial</CardTitle>
                  <CardDescription>Primeira tela que o lead vê antes de começar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={startScreen.headline || ''}
                      onChange={(e) => setStartScreen({ ...startScreen, headline: e.target.value })}
                      placeholder="Título chamativo..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Textarea
                      value={startScreen.subheadline || ''}
                      onChange={(e) => setStartScreen({ ...startScreen, subheadline: e.target.value })}
                      placeholder="Descrição breve..."
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Texto do Botão</Label>
                    <Input
                      value={startScreen.cta_text || ''}
                      onChange={(e) => setStartScreen({ ...startScreen, cta_text: e.target.value })}
                      placeholder="Começar"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL da Imagem (opcional)</Label>
                    <Input
                      value={startScreen.image_url || ''}
                      onChange={(e) => setStartScreen({ ...startScreen, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tela Final</CardTitle>
                  <CardDescription>Tela exibida após completar o quiz</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input
                      value={endScreen.headline || ''}
                      onChange={(e) => setEndScreen({ ...endScreen, headline: e.target.value })}
                      placeholder="Obrigado!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subtítulo</Label>
                    <Textarea
                      value={endScreen.subheadline || ''}
                      onChange={(e) => setEndScreen({ ...endScreen, subheadline: e.target.value })}
                      placeholder="Mensagem de agradecimento..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Texto do CTA (opcional)</Label>
                      <Input
                        value={endScreen.cta_text || ''}
                        onChange={(e) => setEndScreen({ ...endScreen, cta_text: e.target.value })}
                        placeholder="Saiba mais"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL do CTA</Label>
                      <Input
                        value={endScreen.cta_url || ''}
                        onChange={(e) => setEndScreen({ ...endScreen, cta_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={endScreen.show_summary || false}
                      onCheckedChange={(checked) => setEndScreen({ ...endScreen, show_summary: checked })}
                    />
                    <Label>Mostrar resumo do resultado</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Step 5: Preview */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview do Quiz</CardTitle>
                <CardDescription>
                  Visualize como o quiz aparecerá para o lead. Salve as alterações antes de visualizar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-4">
                  <Button onClick={() => window.open(`/q/${quizId}`, '_blank')}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir em Nova Aba
                  </Button>
                  <Button variant="outline" onClick={copyPublicLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link Público
                  </Button>
                </div>
                <div className="mt-6 border rounded-lg overflow-hidden bg-muted/50" style={{ height: '600px' }}>
                  <iframe
                    src={`/q/${quizId}`}
                    className="w-full h-full"
                    title="Quiz Preview"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
