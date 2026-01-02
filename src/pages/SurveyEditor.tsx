import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, Settings, Link2, 
  Type, ListChecks, Hash, UserCircle, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
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
import { useSurvey, SURVEY_OBJECTIVES, IDENTITY_FIELD_TARGETS, SurveyQuestion } from '@/hooks/useSurveys';
import { useSurveyWebhookKeys } from '@/hooks/useSurveyWebhookKeys';
import { useToast } from '@/hooks/use-toast';
import { CubeLoader } from '@/components/CubeLoader';
import { supabase } from '@/integrations/supabase/client';

const QUESTION_TYPES = [
  { value: 'text', label: 'Texto Livre', icon: Type },
  { value: 'multiple_choice', label: 'Múltipla Escolha', icon: ListChecks },
  { value: 'scale', label: 'Escala Numérica', icon: Hash },
  { value: 'identity_field', label: 'Campo de Identidade', icon: UserCircle },
];

export default function SurveyEditor() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { survey, isLoading, addQuestion, updateQuestion, deleteQuestion } = useSurvey(surveyId);
  const { webhookKeys, createWebhookKey, deleteWebhookKey } = useSurveyWebhookKeys(surveyId);
  
  const [surveyData, setSurveyData] = useState({ name: '', description: '', objective: 'general', slug: '', status: 'draft' });
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [newWebhookName, setNewWebhookName] = useState('');

  useEffect(() => {
    if (survey) {
      setSurveyData({
        name: survey.name,
        description: survey.description || '',
        objective: survey.objective,
        slug: survey.slug || '',
        status: survey.status,
      });
    }
  }, [survey]);

  const saveSurvey = async () => {
    if (!surveyId) return;
    const { error } = await supabase
      .from('surveys')
      .update(surveyData)
      .eq('id', surveyId);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pesquisa salva com sucesso' });
    }
  };

  const handleAddQuestion = async (type: string) => {
    const position = (survey?.survey_questions?.length || 0);
    await addQuestion.mutateAsync({
      question_type: type as SurveyQuestion['question_type'],
      question_text: type === 'identity_field' ? 'Campo de identidade' : 'Nova pergunta',
      position,
    });
  };

  const handleUpdateQuestion = async (id: string, data: Partial<SurveyQuestion>) => {
    await updateQuestion.mutateAsync({ id, ...data });
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Excluir esta pergunta?')) {
      await deleteQuestion.mutateAsync(id);
    }
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

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }
    await createWebhookKey.mutateAsync({ name: newWebhookName });
    setNewWebhookName('');
  };

  const copyWebhookUrl = (apiKey: string) => {
    const url = `${window.location.origin}/functions/v1/survey-webhook`;
    navigator.clipboard.writeText(url);
    toast({ title: 'URL copiada!', description: 'Use o header x-api-key com sua chave' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Pesquisa" />
        <div className="flex items-center justify-center h-64">
          <CubeLoader size="lg" />
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Pesquisa" />
        <div className="container mx-auto px-6 py-12 text-center">
          <p className="text-muted-foreground">Pesquisa não encontrada</p>
          <Button variant="outline" onClick={() => navigate('/surveys')} className="mt-4">
            Voltar para Pesquisas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="Editor de Pesquisa" />
      
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/surveys')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{survey.name}</span>
            <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
              {survey.status === 'active' ? 'Ativa' : survey.status === 'draft' ? 'Rascunho' : 'Arquivada'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/surveys/${surveyId}/responses`)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Respostas
            </Button>
            <Button onClick={saveSurvey}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-6">
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">Perguntas</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Perguntas ({survey.survey_questions?.length || 0})</h2>
              <div className="flex items-center gap-2">
                {QUESTION_TYPES.map((type) => (
                  <Button
                    key={type.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddQuestion(type.value)}
                    disabled={addQuestion.isPending}
                  >
                    <type.icon className="h-4 w-4 mr-2" />
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {survey.survey_questions?.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground mb-4">Nenhuma pergunta adicionada</p>
                  <p className="text-sm text-muted-foreground">
                    Clique em um dos botões acima para adicionar sua primeira pergunta.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {survey.survey_questions?.map((question, index) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={index}
                    isExpanded={expandedQuestions.has(question.id)}
                    onToggle={() => toggleQuestionExpanded(question.id)}
                    onUpdate={(data) => handleUpdateQuestion(question.id, data)}
                    onDelete={() => handleDeleteQuestion(question.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Pesquisa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={surveyData.name}
                      onChange={(e) => setSurveyData({ ...surveyData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Objetivo</Label>
                    <Select
                      value={surveyData.objective}
                      onValueChange={(value) => setSurveyData({ ...surveyData, objective: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SURVEY_OBJECTIVES.map((obj) => (
                          <SelectItem key={obj.value} value={obj.value}>
                            {obj.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={surveyData.description}
                    onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Slug (URL pública)</Label>
                    <div className="flex gap-2">
                      <span className="flex items-center text-sm text-muted-foreground">/s/</span>
                      <Input
                        value={surveyData.slug}
                        onChange={(e) => setSurveyData({ ...surveyData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                        placeholder="minha-pesquisa"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={surveyData.status}
                      onValueChange={(value) => setSurveyData({ ...surveyData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="archived">Arquivada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Webhooks
                </CardTitle>
                <CardDescription>
                  Receba respostas de sistemas externos via API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do webhook"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                  />
                  <Button onClick={handleCreateWebhook} disabled={createWebhookKey.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar
                  </Button>
                </div>

                {webhookKeys && webhookKeys.length > 0 && (
                  <div className="space-y-2">
                    {webhookKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{key.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{key.api_key}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {key.usage_count} requisições
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => copyWebhookUrl(key.api_key)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteWebhookKey.mutateAsync(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium mb-2">Exemplo de Payload</p>
                    <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto">
{`POST /functions/v1/survey-webhook
Headers: x-api-key: {sua_api_key}

{
  "email": "usuario@email.com",
  "answers": {
    "pergunta_1": "Resposta",
    "nome": "João Silva"
  }
}`}
                    </pre>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

interface QuestionCardProps {
  question: SurveyQuestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<SurveyQuestion>) => void;
  onDelete: () => void;
}

function QuestionCard({ question, index, isExpanded, onToggle, onUpdate, onDelete }: QuestionCardProps) {
  const questionType = QUESTION_TYPES.find(t => t.value === question.question_type);
  const Icon = questionType?.icon || Type;

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="flex items-center gap-3 p-4">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Input
              value={question.question_text}
              onChange={(e) => onUpdate({ question_text: e.target.value })}
              className="border-0 p-0 h-auto font-medium focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            {question.is_required && <Badge variant="outline">Obrigatória</Badge>}
            <Badge variant="secondary">{questionType?.label}</Badge>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={question.description || ''}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Texto de ajuda para a pergunta"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Obrigatória</Label>
                  <Switch
                    checked={question.is_required}
                    onCheckedChange={(checked) => onUpdate({ is_required: checked })}
                  />
                </div>

                {question.question_type === 'identity_field' && (
                  <>
                    <div className="space-y-2">
                      <Label>Campo de Destino</Label>
                      <Select
                        value={question.identity_field_target || ''}
                        onValueChange={(value) => onUpdate({ identity_field_target: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {IDENTITY_FIELD_TARGETS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Peso de Confiança (0.0 - 1.0)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={question.identity_confidence_weight}
                        onChange={(e) => onUpdate({ identity_confidence_weight: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>
                  </>
                )}

                {question.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Opções (uma por linha)</Label>
                    <Textarea
                      value={(question.options as string[])?.join('\n') || ''}
                      onChange={(e) => onUpdate({ options: e.target.value.split('\n').filter(Boolean) })}
                      placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                    />
                  </div>
                )}

                {question.question_type === 'scale' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Mínimo</Label>
                      <Input
                        type="number"
                        value={(question.settings as any)?.min || 1}
                        onChange={(e) => onUpdate({ 
                          settings: { ...question.settings, min: parseInt(e.target.value) } 
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Máximo</Label>
                      <Input
                        type="number"
                        value={(question.settings as any)?.max || 10}
                        onChange={(e) => onUpdate({ 
                          settings: { ...question.settings, max: parseInt(e.target.value) } 
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
