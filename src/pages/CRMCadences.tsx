import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useCRMCadences, useCadenceSteps } from '@/hooks/useCRMCadences';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  Lock, 
  Plus, 
  Trash2, 
  Play,
  Pause,
  Clock,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  Bell,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  LayoutList
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeatureGate, FeatureUpgradeButton, FeatureLockedBadge } from '@/components/FeatureGate';

const activityTypes = [
  { value: 'task', label: 'Tarefa', icon: CheckSquare },
  { value: 'call', label: 'Ligação', icon: Phone },
  { value: 'meeting', label: 'Reunião', icon: Calendar },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { value: 'reminder', label: 'Lembrete', icon: Bell },
];

const triggerTypes = [
  { value: 'stage_change', label: 'Quando entrar em uma etapa' },
  { value: 'new_contact', label: 'Quando novo contato for criado' },
  { value: 'manual', label: 'Aplicar manualmente' },
];

interface CadenceStep {
  delay_days: number;
  delay_hours: number;
  activity_type: string;
  title: string;
  description: string;
  priority: string;
}

export default function CRMCadences() {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { cadences, isLoading: cadencesLoading, createCadence, deleteCadence, toggleCadence } = useCRMCadences();
  const { stages } = usePipelineStages();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [expandedCadence, setExpandedCadence] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerOn, setTriggerOn] = useState('stage_change');
  const [triggerStageId, setTriggerStageId] = useState<string>('');
  const [steps, setSteps] = useState<CadenceStep[]>([
    { delay_days: 0, delay_hours: 1, activity_type: 'call', title: 'Primeira ligação', description: '', priority: 'high' },
  ]);

  const crmEnabled = isModuleEnabled('crm');
  const isLoading = modulesLoading || cadencesLoading;

  const addStep = () => {
    const lastStep = steps[steps.length - 1];
    setSteps([...steps, {
      delay_days: (lastStep?.delay_days || 0) + 1,
      delay_hours: 0,
      activity_type: 'call',
      title: `Passo ${steps.length + 1}`,
      description: '',
      priority: 'medium',
    }]);
  };

  const updateStep = (index: number, field: keyof CadenceStep, value: any) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim() || steps.length === 0) return;

    await createCadence.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      trigger_on: triggerOn,
      trigger_stage_id: triggerOn === 'stage_change' ? triggerStageId : undefined,
      steps: steps.map(s => ({
        step_order: 0,
        delay_days: s.delay_days,
        delay_hours: s.delay_hours,
        activity_type: s.activity_type,
        title: s.title,
        description: s.description || null,
        priority: s.priority,
      })),
    });

    // Reset form
    setName('');
    setDescription('');
    setTriggerOn('stage_change');
    setTriggerStageId('');
    setSteps([{ delay_days: 0, delay_hours: 1, activity_type: 'call', title: 'Primeira ligação', description: '', priority: 'high' }]);
    setShowCreateDialog(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Cadências de Follow-up" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!crmEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Cadências de Follow-up" />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-muted">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>Módulo CRM</CardTitle>
                <CardDescription>Este módulo não está habilitado.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader pageSubtitle="CRM - Cadências" />
      
      <CRMSubNav 
        rightContent={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/crm/activities')}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              Ver Atividades
            </Button>
            <FeatureUpgradeButton featureKey="crm.cadences">
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Cadência
              </Button>
            </FeatureUpgradeButton>
          </>
        }
      />
      
      <main className="container mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Cadências de Follow-up</h1>
          <p className="text-muted-foreground">
            Crie sequências automáticas de atividades para seus leads
          </p>
        </div>

        {cadences.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Nenhuma cadência criada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira cadência de follow-up para automatizar suas atividades
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Cadência
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cadences.map((cadence) => (
              <CadenceCard
                key={cadence.id}
                cadence={cadence}
                stages={stages}
                isExpanded={expandedCadence === cadence.id}
                onToggleExpand={() => setExpandedCadence(expandedCadence === cadence.id ? null : cadence.id)}
                onToggleActive={(isActive) => toggleCadence.mutate({ cadenceId: cadence.id, isActive })}
                onDelete={() => deleteCadence.mutate(cadence.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Cadência de Follow-up</DialogTitle>
            <DialogDescription>
              Crie uma sequência de atividades que serão criadas automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Cadência *</Label>
                <Input
                  placeholder="Ex: Follow-up Novos Leads"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gatilho</Label>
                <Select value={triggerOn} onValueChange={setTriggerOn}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {triggerOn === 'stage_change' && (
              <div className="space-y-2">
                <Label>Etapa do Pipeline</Label>
                <Select value={triggerStageId} onValueChange={setTriggerStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o objetivo desta cadência..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Passos da Cadência</Label>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Passo
                </Button>
              </div>

              {steps.map((step, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Após (dias)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={step.delay_days}
                            onChange={(e) => updateStep(index, 'delay_days', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Horas</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={step.delay_hours}
                            onChange={(e) => updateStep(index, 'delay_hours', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tipo</Label>
                          <Select 
                            value={step.activity_type} 
                            onValueChange={(v) => updateStep(index, 'activity_type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {activityTypes.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  <div className="flex items-center gap-2">
                                    <t.icon className="h-4 w-4" />
                                    {t.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs">Título da Atividade</Label>
                          <Input
                            placeholder="Ex: Ligar para qualificar"
                            value={step.title}
                            onChange={(e) => updateStep(index, 'title', e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Prioridade</Label>
                          <Select 
                            value={step.priority} 
                            onValueChange={(v) => updateStep(index, 'priority', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="low">Baixa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {steps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(index)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createCadence.isPending || !name.trim()}>
              {createCadence.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Cadência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CadenceCardProps {
  cadence: any;
  stages: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (isActive: boolean) => void;
  onDelete: () => void;
}

function CadenceCard({ cadence, stages, isExpanded, onToggleExpand, onToggleActive, onDelete }: CadenceCardProps) {
  const { steps } = useCadenceSteps(isExpanded ? cadence.id : undefined);
  const triggerStage = stages.find(s => s.id === cadence.trigger_stage_id);

  const triggerLabels: Record<string, string> = {
    stage_change: 'Mudança de etapa',
    new_contact: 'Novo contato',
    manual: 'Manual',
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${cadence.is_active ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                {cadence.is_active ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </div>
              <div>
                <CardTitle className="text-base">{cadence.name}</CardTitle>
                <CardDescription>
                  {triggerLabels[cadence.trigger_on]}
                  {triggerStage && (
                    <span className="ml-1">
                      → <span style={{ color: triggerStage.color }}>{triggerStage.name}</span>
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={cadence.is_active}
                onCheckedChange={onToggleActive}
              />
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carregando passos...</p>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <Badge variant="outline" className="min-w-[24px] justify-center">{index + 1}</Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Após {step.delay_days}d {step.delay_hours}h • {step.activity_type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
