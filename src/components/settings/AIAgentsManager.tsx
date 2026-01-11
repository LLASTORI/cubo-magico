import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Bot, 
  Plus, 
  Pencil, 
  Trash2, 
  Power, 
  PowerOff,
  Target,
  Shield,
  Zap,
  Settings2
} from 'lucide-react';
import { useAIAgents } from '@/hooks/useAIAgents';
import { 
  Agent, 
  AgentObjective, 
  AgentActionType, 
  TriggerType,
  formatAgentObjective,
  formatAgentAction,
  formatTriggerType,
  getObjectiveIcon,
  getActionIcon
} from '@/lib/agentEngine';

const ALL_OBJECTIVES: AgentObjective[] = [
  'increase_conversion',
  'reduce_churn',
  'maximize_ltv',
  'reactivate_leads',
  'accelerate_pipeline',
  'optimize_engagement'
];

const ALL_ACTIONS: AgentActionType[] = [
  'send_whatsapp',
  'send_email',
  'change_lifecycle_stage',
  'assign_sales_rep',
  'trigger_quiz',
  'change_offer',
  'delay_action',
  'request_human_approval',
  'add_tag',
  'remove_tag',
  'move_to_pipeline_stage',
  'start_cadence',
  'update_contact_field'
];

const ALL_TRIGGERS: TriggerType[] = [
  'prediction_created',
  'recommendation_generated',
  'profile_shift',
  'high_risk_signal',
  'funnel_outcome',
  'purchase_completed',
  'quiz_completed'
];

interface AgentFormData {
  name: string;
  description: string;
  objective: AgentObjective;
  allowedActions: AgentActionType[];
  confidenceThreshold: number;
  triggerOn: TriggerType[];
  maxActionsPerDay: number;
  requireHumanApproval: boolean;
  workingHoursOnly: boolean;
  workingHoursStart: number;
  workingHoursEnd: number;
  excludeWeekends: boolean;
}

const defaultFormData: AgentFormData = {
  name: '',
  description: '',
  objective: 'increase_conversion',
  allowedActions: ['send_whatsapp', 'send_email', 'request_human_approval'],
  confidenceThreshold: 0.7,
  triggerOn: ['prediction_created', 'high_risk_signal'],
  maxActionsPerDay: 100,
  requireHumanApproval: true,
  workingHoursOnly: true,
  workingHoursStart: 9,
  workingHoursEnd: 18,
  excludeWeekends: true
};

export function AIAgentsManager() {
  const { agents, isLoading, createAgent, updateAgent, deleteAgent, toggleAgentActive } = useAIAgents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);

  const openCreateDialog = () => {
    setEditingAgent(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      description: agent.description || '',
      objective: agent.objective,
      allowedActions: agent.allowedActions,
      confidenceThreshold: agent.confidenceThreshold,
      triggerOn: agent.triggerOn,
      maxActionsPerDay: agent.maxActionsPerDay,
      requireHumanApproval: agent.requireHumanApproval,
      workingHoursOnly: agent.boundaries.workingHoursOnly || false,
      workingHoursStart: agent.boundaries.workingHoursStart || 9,
      workingHoursEnd: agent.boundaries.workingHoursEnd || 18,
      excludeWeekends: agent.boundaries.excludeWeekends || false
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const agentData = {
      name: formData.name,
      description: formData.description || undefined,
      objective: formData.objective,
      allowedActions: formData.allowedActions,
      boundaries: {
        workingHoursOnly: formData.workingHoursOnly,
        workingHoursStart: formData.workingHoursStart,
        workingHoursEnd: formData.workingHoursEnd,
        excludeWeekends: formData.excludeWeekends
      },
      confidenceThreshold: formData.confidenceThreshold,
      isActive: false,
      triggerOn: formData.triggerOn,
      maxActionsPerDay: formData.maxActionsPerDay,
      requireHumanApproval: formData.requireHumanApproval
    };

    if (editingAgent) {
      await updateAgent.mutateAsync({ id: editingAgent.id, ...agentData });
    } else {
      await createAgent.mutateAsync(agentData);
    }
    setIsDialogOpen(false);
  };

  const toggleAction = (action: AgentActionType) => {
    setFormData(prev => ({
      ...prev,
      allowedActions: prev.allowedActions.includes(action)
        ? prev.allowedActions.filter(a => a !== action)
        : [...prev.allowedActions, action]
    }));
  };

  const toggleTrigger = (trigger: TriggerType) => {
    setFormData(prev => ({
      ...prev,
      triggerOn: prev.triggerOn.includes(trigger)
        ? prev.triggerOn.filter(t => t !== trigger)
        : [...prev.triggerOn, trigger]
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Agentes IA Autônomos</h3>
          <p className="text-sm text-muted-foreground">
            Configure agentes que tomam decisões e executam ações automaticamente
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? 'Editar Agente' : 'Criar Novo Agente'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Agente</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Agente de Conversão"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o propósito deste agente..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Objective */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Objetivo Principal
                </Label>
                <Select
                  value={formData.objective}
                  onValueChange={(value: AgentObjective) => 
                    setFormData(prev => ({ ...prev, objective: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_OBJECTIVES.map(obj => (
                      <SelectItem key={obj} value={obj}>
                        {getObjectiveIcon(obj)} {formatAgentObjective(obj)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Triggers */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Gatilhos de Ativação
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_TRIGGERS.map(trigger => (
                    <div
                      key={trigger}
                      className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                        formData.triggerOn.includes(trigger) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => toggleTrigger(trigger)}
                    >
                      <Checkbox checked={formData.triggerOn.includes(trigger)} />
                      <span className="text-sm">{formatTriggerType(trigger)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Allowed Actions */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Ações Permitidas
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ACTIONS.map(action => (
                    <div
                      key={action}
                      className={`flex items-center space-x-2 p-2 rounded border cursor-pointer transition-colors ${
                        formData.allowedActions.includes(action) 
                          ? 'border-primary bg-primary/5' 
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => toggleAction(action)}
                    >
                      <Checkbox checked={formData.allowedActions.includes(action)} />
                      <span className="text-sm">{getActionIcon(action)} {formatAgentAction(action)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <Label>
                  Limiar de Confiança: {(formData.confidenceThreshold * 100).toFixed(0)}%
                </Label>
                <Slider
                  value={[formData.confidenceThreshold * 100]}
                  onValueChange={([value]) => 
                    setFormData(prev => ({ ...prev, confidenceThreshold: value / 100 }))
                  }
                  min={30}
                  max={95}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Agente só age quando confiança da predição for maior que este valor
                </p>
              </div>

              {/* Safety Settings */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Configurações de Segurança
                </Label>
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Aprovação Humana</div>
                    <div className="text-xs text-muted-foreground">Requer aprovação antes de executar</div>
                  </div>
                  <Switch
                    checked={formData.requireHumanApproval}
                    onCheckedChange={checked => 
                      setFormData(prev => ({ ...prev, requireHumanApproval: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Horário Comercial</div>
                    <div className="text-xs text-muted-foreground">Agir apenas em horário comercial</div>
                  </div>
                  <Switch
                    checked={formData.workingHoursOnly}
                    onCheckedChange={checked => 
                      setFormData(prev => ({ ...prev, workingHoursOnly: checked }))
                    }
                  />
                </div>

                {formData.workingHoursOnly && (
                  <div className="flex gap-4 pl-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Início</Label>
                      <Select
                        value={String(formData.workingHoursStart)}
                        onValueChange={value => 
                          setFormData(prev => ({ ...prev, workingHoursStart: Number(value) }))
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{i}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fim</Label>
                      <Select
                        value={String(formData.workingHoursEnd)}
                        onValueChange={value => 
                          setFormData(prev => ({ ...prev, workingHoursEnd: Number(value) }))
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>{i}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Excluir Finais de Semana</div>
                    <div className="text-xs text-muted-foreground">Não agir sábado e domingo</div>
                  </div>
                  <Switch
                    checked={formData.excludeWeekends}
                    onCheckedChange={checked => 
                      setFormData(prev => ({ ...prev, excludeWeekends: checked }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Máximo de Ações por Dia</Label>
                  <Input
                    type="number"
                    value={formData.maxActionsPerDay}
                    onChange={e => 
                      setFormData(prev => ({ ...prev, maxActionsPerDay: Number(e.target.value) }))
                    }
                    min={1}
                    max={1000}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!formData.name || formData.allowedActions.length === 0}
                >
                  {editingAgent ? 'Salvar Alterações' : 'Criar Agente'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-1">Nenhum agente configurado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie agentes IA autônomos para automatizar decisões e ações
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Agente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {agents.map(agent => (
            <Card key={agent.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getObjectiveIcon(agent.objective)}</div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {agent.name}
                        <Badge variant={agent.isActive ? 'default' : 'secondary'}>
                          {agent.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {formatAgentObjective(agent.objective)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAgentActive.mutate({ 
                        id: agent.id, 
                        isActive: !agent.isActive 
                      })}
                    >
                      {agent.isActive ? (
                        <PowerOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Power className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(agent)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteAgentId(agent.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {agent.description && (
                  <p className="text-sm text-muted-foreground mb-3">{agent.description}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Ações:</span>
                  {agent.allowedActions.slice(0, 4).map(action => (
                    <Badge key={action} variant="outline" className="text-xs">
                      {getActionIcon(action)} {formatAgentAction(action)}
                    </Badge>
                  ))}
                  {agent.allowedActions.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{agent.allowedActions.length - 4}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Confiança mín: {(agent.confidenceThreshold * 100).toFixed(0)}%</span>
                  <span>Máx ações/dia: {agent.maxActionsPerDay}</span>
                  <span>{agent.requireHumanApproval ? '✋ Requer aprovação' : '⚡ Automático'}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteAgentId} onOpenChange={() => setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente e todo seu histórico de decisões serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteAgentId) {
                  deleteAgent.mutate(deleteAgentId);
                  setDeleteAgentId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
