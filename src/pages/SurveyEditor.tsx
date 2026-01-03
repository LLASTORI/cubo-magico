import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Plus, Trash2, GripVertical, Eye, Settings, Link2, 
  Type, ListChecks, Hash, UserCircle, ChevronDown, ChevronUp, Copy, FileSpreadsheet,
  Palette, Gift
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
import { SurveyCSVImportLocal } from '@/components/surveys/SurveyCSVImportLocal';
import { SurveyAppearanceSettings, SurveyTheme, SurveyMessages } from '@/components/surveys/SurveyAppearanceSettings';
import { SurveyCompletionSettings, CompletionSettings } from '@/components/surveys/SurveyCompletionSettings';
import { SurveyPreview } from '@/components/surveys/SurveyPreview';

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
  const [surveySettings, setSurveySettings] = useState<{
    welcome_message?: string;
    thank_you_message?: string;
    theme?: SurveyTheme;
    completion?: CompletionSettings;
  }>({});
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
      // Parse settings for theme, messages and completion
      const settings = (survey.settings as any) || {};
      setSurveySettings({
        welcome_message: settings.welcome_message,
        thank_you_message: settings.thank_you_message,
        theme: settings.theme,
        completion: settings.completion,
      });
    }
  }, [survey]);

  const saveSurvey = async () => {
    if (!surveyId) return;
    
    // Merge settings with theme and messages
    const currentSettings = (survey?.settings as any) || {};
    const mergedSettings = {
      ...currentSettings,
      ...surveySettings,
    };
    
    const { error } = await supabase
      .from('surveys')
      .update({ 
        ...surveyData,
        settings: mergedSettings,
      })
      .eq('id', surveyId);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pesquisa salva com sucesso' });
    }
  };

  const handleThemeChange = (theme: SurveyTheme) => {
    setSurveySettings(prev => ({ ...prev, theme }));
  };

  const handleMessagesChange = (messages: SurveyMessages) => {
    setSurveySettings(prev => ({
      ...prev,
      welcome_message: messages.welcome_message,
      thank_you_message: messages.thank_you_message,
    }));
  };

  const handleCompletionChange = (completion: CompletionSettings) => {
    setSurveySettings(prev => ({ ...prev, completion }));
  };

  const previewUrl = surveyData.slug
    ? `${window.location.origin}/s/${surveyData.slug}`
    : undefined;

  // Use production URL when we're in the preview/sandbox.
  const getBaseUrl = () => {
    const origin = window.location.origin;
    if (origin.includes('lovable.app') || origin.includes('lovableproject.com')) {
      return 'https://cubomagico.leandrolastori.com.br';
    }
    return origin;
  };

  const publicUrl = surveyData.slug
    ? `${getBaseUrl()}/s/${surveyData.slug}`
    : undefined;

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
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="completion">
              <Gift className="h-4 w-4 mr-2" />
              Conclusão
            </TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="import">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar CSV
            </TabsTrigger>
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

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Settings Column */}
              <div>
                <SurveyAppearanceSettings
                  theme={surveySettings.theme || {
                    primary_color: '#6366f1',
                    text_color: '#1e293b',
                    secondary_text_color: '#64748b',
                    input_text_color: '#1e293b',
                    background_color: '#f8fafc',
                    show_progress: true,
                    one_question_per_page: true,
                  }}
                  messages={{
                    welcome_message: surveySettings.welcome_message,
                    thank_you_message: surveySettings.thank_you_message,
                  }}
                  onThemeChange={handleThemeChange}
                  onMessagesChange={handleMessagesChange}
                />
              </div>

              {/* Preview Column */}
              <div className="lg:sticky lg:top-6 lg:self-start">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Preview
                    </CardTitle>
                    <CardDescription>
                      Visualize como a pesquisa ficará para os respondentes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SurveyPreview
                      surveyName={surveyData.name}
                      surveyDescription={surveyData.description}
                      welcomeMessage={surveySettings.welcome_message}
                      thankYouMessage={surveySettings.thank_you_message}
                      theme={surveySettings.theme || {
                        primary_color: '#6366f1',
                        background_color: '#f8fafc',
                        show_progress: true,
                        one_question_per_page: true,
                      }}
                      questions={(survey?.survey_questions || []).map(q => ({
                        id: q.id,
                        question_text: q.question_text,
                        question_type: q.question_type,
                        options: q.options as string[] | undefined,
                      }))}
                      previewUrl={previewUrl}
                      publicUrl={publicUrl}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Completion Tab */}
          <TabsContent value="completion" className="space-y-6">
            <div className="max-w-3xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Ações de Conclusão</h2>
                <p className="text-muted-foreground text-sm">
                  Configure o que acontece quando o usuário finaliza a pesquisa: botões de ação, redirecionamento automático e mensagens de recompensa.
                </p>
              </div>
              <SurveyCompletionSettings
                settings={surveySettings.completion || {
                  enable_auto_redirect: false,
                  redirect_delay_seconds: 5,
                  cta_buttons: [],
                }}
                onChange={handleCompletionChange}
              />
            </div>
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
            <IntegrationsDocumentation 
              webhookKeys={webhookKeys || []}
              newWebhookName={newWebhookName}
              setNewWebhookName={setNewWebhookName}
              onCreateWebhook={handleCreateWebhook}
              onDeleteWebhook={(id) => deleteWebhookKey.mutateAsync(id)}
              onCopyUrl={copyWebhookUrl}
              isCreating={createWebhookKey.isPending}
              questions={survey.survey_questions || []}
            />
          </TabsContent>

          {/* CSV Import Tab */}
          <TabsContent value="import" className="space-y-6">
            <SurveyCSVImportLocal 
              surveyId={surveyId!} 
              questions={survey.survey_questions || []} 
            />
            <CSVImportDocumentation questions={survey.survey_questions || []} />
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
  
  // Local state for smooth typing - only updates DB on blur
  const [localText, setLocalText] = useState(question.question_text);
  const [localDescription, setLocalDescription] = useState(question.description || '');
  const [localOptions, setLocalOptions] = useState((question.options as string[])?.join('\n') || '');
  
  // Sync local state when question changes from server
  useEffect(() => {
    setLocalText(question.question_text);
    setLocalDescription(question.description || '');
    setLocalOptions((question.options as string[])?.join('\n') || '');
  }, [question.id, question.question_text, question.description, question.options]);

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <div className="flex items-center gap-3 p-4">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
          <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Input
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={() => {
                if (localText !== question.question_text) {
                  onUpdate({ question_text: localText });
                }
              }}
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
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => {
                    if (localDescription !== (question.description || '')) {
                      onUpdate({ description: localDescription });
                    }
                  }}
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
                      value={localOptions}
                      onChange={(e) => setLocalOptions(e.target.value)}
                      onBlur={() => {
                        const newOptions = localOptions.split('\n').filter(Boolean);
                        const currentOptions = (question.options as string[]) || [];
                        if (JSON.stringify(newOptions) !== JSON.stringify(currentOptions)) {
                          onUpdate({ options: newOptions });
                        }
                      }}
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

// =================== INTEGRATIONS DOCUMENTATION ===================

interface IntegrationsDocProps {
  webhookKeys: any[];
  newWebhookName: string;
  setNewWebhookName: (v: string) => void;
  onCreateWebhook: () => void;
  onDeleteWebhook: (id: string) => void;
  onCopyUrl: (apiKey: string) => void;
  isCreating: boolean;
  questions: SurveyQuestion[];
}

function IntegrationsDocumentation({ 
  webhookKeys, newWebhookName, setNewWebhookName, 
  onCreateWebhook, onDeleteWebhook, onCopyUrl, isCreating, questions 
}: IntegrationsDocProps) {
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/survey-webhook`;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const handleCopyKey = async (apiKey: string, keyId: string) => {
    await navigator.clipboard.writeText(apiKey);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 16) return key;
    return `${key.slice(0, 8)}${'•'.repeat(24)}${key.slice(-8)}`;
  };

  return (
    <div className="space-y-6">
      {/* Webhook Keys Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                API Keys do Webhook
              </CardTitle>
              <CardDescription>
                Gerencie as chaves de API para receber respostas de ferramentas externas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do webhook (ex: Typeform, ActiveCampaign)"
              value={newWebhookName}
              onChange={(e) => setNewWebhookName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCreateWebhook()}
            />
            <Button onClick={onCreateWebhook} disabled={isCreating}>
              <Plus className="h-4 w-4 mr-2" />
              Criar
            </Button>
          </div>

          {webhookKeys && webhookKeys.length > 0 && (
            <div className="space-y-2">
              {webhookKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{key.name}</p>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                        {showKey[key.id] ? key.api_key : maskApiKey(key.api_key)}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                      >
                        {showKey[key.id] ? <Eye className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {key.usage_count} requisições 
                      {key.last_used_at && ` • Última: ${new Date(key.last_used_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleCopyKey(key.api_key, key.id)}
                    >
                      {copiedKey === key.id ? <Save className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onCopyUrl(key.api_key)}>
                      <Link2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteWebhook(key.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Documentação do Webhook
          </CardTitle>
          <CardDescription>
            Guia completo para integrar sistemas externos com esta pesquisa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <h4 className="font-medium mb-2">Endpoint</h4>
            <div className="flex items-center gap-2">
              <Badge>POST</Badge>
              <code className="text-sm bg-background px-3 py-1.5 rounded font-mono flex-1 overflow-x-auto">
                {webhookUrl}
              </code>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Headers */}
          <div className="space-y-3">
            <h4 className="font-medium">Headers Obrigatórios</h4>
            <div className="grid gap-2">
              <div className="p-3 rounded bg-muted/50 flex items-center justify-between">
                <div>
                  <code className="text-sm font-semibold">Content-Type</code>
                  <p className="text-xs text-muted-foreground mt-1">Tipo do conteúdo da requisição</p>
                </div>
                <code className="text-sm bg-background px-2 py-1 rounded">application/json</code>
              </div>
              <div className="p-3 rounded bg-muted/50 flex items-center justify-between">
                <div>
                  <code className="text-sm font-semibold">x-api-key</code>
                  <p className="text-xs text-muted-foreground mt-1">Chave de autenticação da API</p>
                </div>
                <code className="text-sm bg-background px-2 py-1 rounded">sua_api_key_aqui</code>
              </div>
            </div>
          </div>

          {/* Payload Structure */}
          <div className="space-y-3">
            <h4 className="font-medium">Estrutura do Payload</h4>
            <div className="p-4 rounded-lg border">
              <pre className="text-xs overflow-x-auto bg-background p-4 rounded-lg">
{`{
  "email": "usuario@email.com",  // Obrigatório
  "answers": {
    "question_id_1": "Resposta da pergunta 1",
    "question_id_2": "Resposta da pergunta 2",
    // ou usando texto da pergunta:
    "Qual seu nome?": "João Silva",
    "Como conheceu a empresa?": "Indicação de amigo"
  },
  // Campos opcionais:
  "name": "Nome do respondente",
  "phone": "11999999999",
  "metadata": {
    "source": "typeform",
    "campaign": "lancamento-2024"
  }
}`}
              </pre>
            </div>
          </div>

          {/* Questions Reference */}
          {questions.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Perguntas desta Pesquisa</h4>
              <p className="text-sm text-muted-foreground">
                Use os IDs ou textos abaixo como chaves no objeto <code>answers</code>
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={q.id} className="p-3 rounded border bg-card flex items-start gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{q.question_text}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {q.question_type}
                        </Badge>
                        {q.identity_field_target && (
                          <Badge variant="secondary" className="text-xs">
                            → {q.identity_field_target}
                          </Badge>
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground mt-1 block truncate">
                        ID: {q.id}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* cURL Example */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Exemplo cURL</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  const example = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_API_KEY_AQUI" \\
  -d '{
    "email": "respondente@email.com",
    "answers": {
      "Qual seu nome?": "João Silva",
      "Como avalia nosso produto?": "Excelente"
    }
  }'`;
                  navigator.clipboard.writeText(example);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
            <pre className="text-xs overflow-x-auto bg-muted p-4 rounded-lg">
{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SUA_API_KEY_AQUI" \\
  -d '{
    "email": "respondente@email.com",
    "answers": {
      "Qual seu nome?": "João Silva",
      "Como avalia nosso produto?": "Excelente"
    }
  }'`}
            </pre>
          </div>

          {/* Response Codes */}
          <div className="space-y-3">
            <h4 className="font-medium">Códigos de Resposta</h4>
            <div className="grid gap-2">
              <div className="flex items-center gap-3 p-3 rounded bg-green-500/10 border border-green-500/20">
                <Badge className="bg-green-500">200</Badge>
                <span className="text-sm">Resposta registrada com sucesso</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded bg-yellow-500/10 border border-yellow-500/20">
                <Badge className="bg-yellow-500 text-yellow-950">400</Badge>
                <span className="text-sm">Payload inválido ou email ausente</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded bg-red-500/10 border border-red-500/20">
                <Badge className="bg-red-500">401</Badge>
                <span className="text-sm">API Key inválida ou ausente</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded bg-red-500/10 border border-red-500/20">
                <Badge className="bg-red-500">500</Badge>
                <span className="text-sm">Erro interno do servidor</span>
              </div>
            </div>
          </div>

          {/* Identity Fields Info */}
          <div className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/20">
            <h5 className="font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Campos de Identidade
            </h5>
            <p className="text-sm text-muted-foreground">
              Perguntas do tipo "Campo de Identidade" atualizam automaticamente os dados do contato no CRM.
              Por exemplo, uma pergunta mapeada para "name" atualizará o nome do contato quando respondida.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =================== CSV IMPORT DOCUMENTATION ===================

interface CSVDocProps {
  questions: SurveyQuestion[];
}

function CSVImportDocumentation({ questions }: CSVDocProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Documentação da Importação CSV
        </CardTitle>
        <CardDescription>
          Guia completo para preparar seu arquivo CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Required Columns */}
        <div className="space-y-3">
          <h4 className="font-medium">Colunas Obrigatórias</h4>
          <div className="p-3 rounded bg-muted/50">
            <code className="text-sm font-semibold text-primary">email</code>
            <p className="text-sm text-muted-foreground mt-1">
              O email é obrigatório para identificar o contato. Aceita também: <code>e-mail</code>
            </p>
          </div>
        </div>

        {/* Optional Columns */}
        <div className="space-y-3">
          <h4 className="font-medium">Colunas das Perguntas</h4>
          <p className="text-sm text-muted-foreground">
            Cada coluna adicional pode ser mapeada para uma pergunta da pesquisa.
            O sistema tenta fazer o mapeamento automático pelo texto da pergunta.
          </p>
          
          {questions.length > 0 && (
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={q.id} className="p-3 rounded border bg-card">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-medium text-muted-foreground w-6">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.question_text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                        {q.identity_field_target && (
                          <Badge variant="secondary" className="text-xs">
                            Atualiza: {q.identity_field_target}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Example CSV */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Exemplo de CSV</h4>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                const header = ['email', ...questions.slice(0, 3).map(q => q.question_text)].join(';');
                const row1 = ['joao@email.com', 'João Silva', 'Excelente', 'Facebook'].slice(0, questions.length + 1).join(';');
                const row2 = ['maria@email.com', 'Maria Santos', 'Bom', 'Google'].slice(0, questions.length + 1).join(';');
                const csv = `${header}\n${row1}\n${row2}`;
                navigator.clipboard.writeText(csv);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Exemplo
            </Button>
          </div>
          <pre className="text-xs overflow-x-auto bg-muted p-4 rounded-lg">
{`email;${questions.slice(0, 3).map(q => q.question_text).join(';') || 'Pergunta 1;Pergunta 2'}
joao@email.com;Resposta 1;Resposta 2
maria@email.com;Resposta A;Resposta B
pedro@email.com;Resposta X;Resposta Y`}
          </pre>
        </div>

        {/* Separators */}
        <div className="space-y-3">
          <h4 className="font-medium">Separadores Aceitos</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-muted/50 text-center">
              <code className="text-lg">;</code>
              <p className="text-sm text-muted-foreground mt-1">Ponto e vírgula (padrão BR)</p>
            </div>
            <div className="p-3 rounded bg-muted/50 text-center">
              <code className="text-lg">,</code>
              <p className="text-sm text-muted-foreground mt-1">Vírgula (padrão internacional)</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 rounded-lg border bg-amber-500/10 border-amber-500/20">
          <h5 className="font-medium text-amber-700 dark:text-amber-400 mb-2">💡 Dicas Importantes</h5>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• <strong>Encoding:</strong> Salve o arquivo como UTF-8 para evitar problemas com acentos</li>
            <li>• <strong>Duplicados:</strong> Se o email já existir, a resposta será atualizada</li>
            <li>• <strong>Contatos novos:</strong> Contatos não encontrados serão criados automaticamente</li>
            <li>• <strong>Campos de identidade:</strong> Perguntas mapeadas como identidade atualizam os dados do contato</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
