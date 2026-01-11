import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Zap, Target, Settings2 } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  useSortable, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuizOutcomes, QuizOutcome } from '@/hooks/useQuizOutcomes';
import { 
  CONDITION_TYPES, 
  CONDITION_OPERATORS, 
  ACTION_TYPES,
  OutcomeCondition,
  OutcomeAction
} from '@/lib/quizOutcomeEngine';

interface QuizOutcomeEditorProps {
  quizId: string;
}

// Sortable Outcome Card
function SortableOutcomeCard({
  outcome,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  outcome: QuizOutcome;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<QuizOutcome>) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: outcome.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card className={`border ${outcome.is_active ? '' : 'opacity-60'}`}>
          <CardHeader className="p-4">
            <div className="flex items-center gap-3">
              <div {...attributes} {...listeners} className="cursor-grab">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              <Badge variant="outline" className="font-mono">
                P{outcome.priority}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{outcome.name || 'Sem nome'}</p>
                <p className="text-xs text-muted-foreground">
                  {outcome.conditions.length} condições • {outcome.actions.length} ações
                </p>
              </div>
              <Badge variant={outcome.is_active ? 'default' : 'secondary'}>
                {outcome.is_active ? 'Ativo' : 'Inativo'}
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
            <CardContent className="pt-0 space-y-6">
              <OutcomeDetailEditor outcome={outcome} onUpdate={onUpdate} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}

// Outcome Detail Editor
function OutcomeDetailEditor({
  outcome,
  onUpdate,
}: {
  outcome: QuizOutcome;
  onUpdate: (data: Partial<QuizOutcome>) => void;
}) {
  const [activeTab, setActiveTab] = useState('info');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="info">Informações</TabsTrigger>
        <TabsTrigger value="conditions">
          Condições ({outcome.conditions.length})
        </TabsTrigger>
        <TabsTrigger value="actions">
          Ações ({outcome.actions.length})
        </TabsTrigger>
        <TabsTrigger value="screen">Tela Final</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              value={outcome.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Nome do outcome..."
            />
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Input
              type="number"
              value={outcome.priority}
              onChange={(e) => onUpdate({ priority: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea
            value={outcome.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Descreva quando este outcome deve ser ativado..."
            rows={2}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={outcome.is_active}
            onCheckedChange={(checked) => onUpdate({ is_active: checked })}
          />
          <Label>Ativo</Label>
        </div>
      </TabsContent>

      <TabsContent value="conditions" className="space-y-4 mt-4">
        <ConditionsEditor
          conditions={outcome.conditions}
          onChange={(conditions) => onUpdate({ conditions })}
        />
      </TabsContent>

      <TabsContent value="actions" className="space-y-4 mt-4">
        <ActionsEditor
          actions={outcome.actions}
          onChange={(actions) => onUpdate({ actions })}
        />
      </TabsContent>

      <TabsContent value="screen" className="space-y-4 mt-4">
        <EndScreenOverrideEditor
          config={outcome.end_screen_override}
          onChange={(config) => onUpdate({ end_screen_override: config })}
        />
      </TabsContent>
    </Tabs>
  );
}

// Conditions Editor
function ConditionsEditor({
  conditions,
  onChange,
}: {
  conditions: OutcomeCondition[];
  onChange: (conditions: OutcomeCondition[]) => void;
}) {
  const addCondition = () => {
    onChange([
      ...conditions,
      {
        type: 'intent_percentage',
        operator: 'gte',
        field: '',
        value: 50,
        group: 'default',
        logic: 'and',
      },
    ]);
  };

  const updateCondition = (index: number, data: Partial<OutcomeCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...data };
    onChange(updated);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Condições de Ativação</p>
          <p className="text-xs text-muted-foreground">
            Todas as condições devem ser verdadeiras para o outcome ser ativado
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addCondition}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {conditions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma condição definida</p>
          <p className="text-xs">Outcome sempre será ativado se nenhuma condição for definida</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <Card key={index} className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">{index + 1}</Badge>
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <Select
                      value={condition.type}
                      onValueChange={(value) => updateCondition(index, { type: value as OutcomeCondition['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Input
                      value={condition.field}
                      onChange={(e) => updateCondition(index, { field: e.target.value })}
                      placeholder="Campo (ex: compra)"
                    />
                    
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, { operator: value as OutcomeCondition['operator'] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITION_OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { 
                        value: isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)
                      })}
                      placeholder="Valor"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeCondition(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Actions Editor
function ActionsEditor({
  actions,
  onChange,
}: {
  actions: OutcomeAction[];
  onChange: (actions: OutcomeAction[]) => void;
}) {
  const addAction = () => {
    onChange([
      ...actions,
      {
        type: 'add_tag',
        config: { tag: '' },
      },
    ]);
  };

  const updateAction = (index: number, data: Partial<OutcomeAction>) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], ...data };
    onChange(updated);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const getActionConfigFields = (type: string) => {
    switch (type) {
      case 'add_tag':
      case 'remove_tag':
        return [{ key: 'tag', label: 'Tag', type: 'text' }];
      case 'set_lifecycle_stage':
        return [{ key: 'stage_id', label: 'ID do Estágio', type: 'text' }];
      case 'trigger_automation':
        return [{ key: 'automation_id', label: 'ID da Automação', type: 'text' }];
      case 'trigger_whatsapp_flow':
        return [
          { key: 'flow_id', label: 'ID do Fluxo', type: 'text' },
          { key: 'message', label: 'Mensagem Inicial', type: 'textarea' },
        ];
      case 'trigger_email_sequence':
        return [{ key: 'sequence_id', label: 'ID da Sequência', type: 'text' }];
      case 'fire_webhook':
        return [
          { key: 'url', label: 'URL do Webhook', type: 'text' },
          { key: 'method', label: 'Método', type: 'select', options: ['POST', 'PUT', 'GET'] },
        ];
      case 'fire_pixel_event':
        return [
          { key: 'event_name', label: 'Nome do Evento', type: 'text' },
          { key: 'pixel_id', label: 'ID do Pixel (opcional)', type: 'text' },
        ];
      case 'redirect_url':
        return [{ key: 'url', label: 'URL de Redirecionamento', type: 'text' }];
      case 'update_custom_field':
        return [
          { key: 'field', label: 'Nome do Campo', type: 'text' },
          { key: 'value', label: 'Valor', type: 'text' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Ações a Executar</p>
          <p className="text-xs text-muted-foreground">
            Ações são executadas em ordem quando o outcome é ativado
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addAction}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma ação definida</p>
          <p className="text-xs">Adicione ações para executar quando o outcome for ativado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <Card key={index} className="bg-muted/30">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <Select
                    value={action.type}
                    onValueChange={(value) => updateAction(index, { 
                      type: value as OutcomeAction['type'],
                      config: {} 
                    })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Tipo de ação" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => removeAction(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                {/* Action config fields */}
                <div className="grid grid-cols-2 gap-3 pl-8">
                  {getActionConfigFields(action.type).map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs">{field.label}</Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          value={action.config[field.key] || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, [field.key]: e.target.value }
                          })}
                          rows={2}
                          className="text-sm"
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={action.config[field.key] || ''}
                          onValueChange={(value) => updateAction(index, {
                            config: { ...action.config, [field.key]: value }
                          })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={action.config[field.key] || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, [field.key]: e.target.value }
                          })}
                          className="text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// End Screen Override Editor
function EndScreenOverrideEditor({
  config,
  onChange,
}: {
  config: Record<string, any> | null;
  onChange: (config: Record<string, any> | null) => void;
}) {
  const [enabled, setEnabled] = useState(!!config);
  
  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onChange(null);
    } else {
      onChange({
        headline: '',
        subheadline: '',
        cta_text: '',
        cta_url: '',
        show_results: true,
      });
    }
  };

  const updateField = (field: string, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium">Tela Final Personalizada</p>
          <p className="text-xs text-muted-foreground">
            Substitui a tela final padrão quando este outcome é ativado
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
      </div>

      {enabled && config && (
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={config.headline || ''}
                onChange={(e) => updateField('headline', e.target.value)}
                placeholder="Parabéns!"
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem (URL)</Label>
              <Input
                value={config.image_url || ''}
                onChange={(e) => updateField('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subtítulo</Label>
            <Textarea
              value={config.subheadline || ''}
              onChange={(e) => updateField('subheadline', e.target.value)}
              placeholder="Mensagem personalizada para este resultado..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Texto do CTA</Label>
              <Input
                value={config.cta_text || ''}
                onChange={(e) => updateField('cta_text', e.target.value)}
                placeholder="Próximo passo"
              />
            </div>
            <div className="space-y-2">
              <Label>URL do CTA</Label>
              <Input
                value={config.cta_url || ''}
                onChange={(e) => updateField('cta_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.show_results !== false}
              onCheckedChange={(checked) => updateField('show_results', checked)}
            />
            <Label>Mostrar resultados do quiz</Label>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export function QuizOutcomeEditor({ quizId }: QuizOutcomeEditorProps) {
  const { outcomes, isLoading, createOutcome, updateOutcome, deleteOutcome, reorderOutcomes } = useQuizOutcomes(quizId);
  const [expandedOutcomes, setExpandedOutcomes] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = outcomes.findIndex(o => o.id === active.id);
      const newIndex = outcomes.findIndex(o => o.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(outcomes, oldIndex, newIndex);
        const updates = reordered.map((o, idx) => ({ 
          id: o.id, 
          priority: reordered.length - idx // Higher index = higher priority
        }));
        reorderOutcomes.mutate(updates);
      }
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedOutcomes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    const newPriority = outcomes.length > 0 ? Math.max(...outcomes.map(o => o.priority)) + 1 : 1;
    await createOutcome.mutateAsync({
      name: `Outcome ${outcomes.length + 1}`,
      priority: newPriority,
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando outcomes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Funnel Brain — Outcomes
              </CardTitle>
              <CardDescription>
                Configure resultados dinâmicos baseados nos vetores e respostas do quiz
              </CardDescription>
            </div>
            <Button onClick={handleCreate} disabled={createOutcome.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Outcome
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum outcome configurado</h3>
              <p className="text-muted-foreground mb-4">
                Outcomes permitem personalizar a experiência final do quiz com base nos resultados
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro outcome
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={outcomes.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {outcomes.map((outcome) => (
                    <SortableOutcomeCard
                      key={outcome.id}
                      outcome={outcome}
                      isExpanded={expandedOutcomes.has(outcome.id)}
                      onToggle={() => toggleExpanded(outcome.id)}
                      onUpdate={(data) => updateOutcome.mutate({ id: outcome.id, ...data })}
                      onDelete={() => {
                        if (confirm('Remover este outcome?')) {
                          deleteOutcome.mutate(outcome.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Como funciona o Funnel Brain?</p>
              <p className="text-muted-foreground mt-1">
                Outcomes são avaliados em ordem de prioridade ao finalizar o quiz. 
                O primeiro outcome cujas condições são satisfeitas é ativado, executando suas ações 
                e (opcionalmente) exibindo uma tela final personalizada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
