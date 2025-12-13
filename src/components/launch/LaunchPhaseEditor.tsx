import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, GripVertical, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLaunchPhases, PHASE_TYPES, LaunchPhase } from "@/hooks/useLaunchPhases";

interface LaunchPhaseEditorProps {
  projectId: string;
  funnelId: string;
  funnelName: string;
}

const getPhaseColor = (phaseType: string) => {
  const colors: Record<string, string> = {
    distribuicao: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    captacao: 'bg-green-500/20 text-green-600 border-green-500/30',
    aquecimento: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    remarketing: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    vendas: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    ultima_oportunidade: 'bg-red-500/20 text-red-600 border-red-500/30',
    flash_open: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    downsell: 'bg-pink-500/20 text-pink-600 border-pink-500/30',
  };
  return colors[phaseType] || 'bg-muted text-muted-foreground';
};

export const LaunchPhaseEditor = ({ projectId, funnelId, funnelName }: LaunchPhaseEditorProps) => {
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<LaunchPhase | null>(null);
  const [newPhase, setNewPhase] = useState({
    phase_type: '',
    name: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    notes: '',
  });

  const { 
    phases, 
    isLoading, 
    createPhase, 
    updatePhase, 
    deletePhase 
  } = useLaunchPhases(projectId, funnelId);

  const handleAddPhase = () => {
    if (!newPhase.phase_type || !newPhase.name) return;

    const phaseType = PHASE_TYPES.find(p => p.value === newPhase.phase_type);
    createPhase.mutate({
      funnel_id: funnelId,
      project_id: projectId,
      phase_type: newPhase.phase_type,
      name: newPhase.name,
      start_date: newPhase.start_date ? format(newPhase.start_date, 'yyyy-MM-dd') : null,
      end_date: newPhase.end_date ? format(newPhase.end_date, 'yyyy-MM-dd') : null,
      primary_metric: phaseType?.metric || 'spend',
      is_active: true,
      phase_order: phases.length,
      notes: newPhase.notes || null,
    });

    setNewPhase({ phase_type: '', name: '', start_date: null, end_date: null, notes: '' });
    setShowAddPhase(false);
  };

  const handleUpdatePhase = () => {
    if (!editingPhase) return;
    updatePhase.mutate({
      id: editingPhase.id,
      name: editingPhase.name,
      start_date: editingPhase.start_date,
      end_date: editingPhase.end_date,
      is_active: editingPhase.is_active,
      notes: editingPhase.notes,
    });
    setEditingPhase(null);
  };

  const handleDeletePhase = (phaseId: string) => {
    if (confirm('Tem certeza que deseja remover esta fase?')) {
      deletePhase.mutate(phaseId);
    }
  };

  const handlePhaseTypeChange = (value: string) => {
    const phaseType = PHASE_TYPES.find(p => p.value === value);
    setNewPhase(prev => ({
      ...prev,
      phase_type: value,
      name: prev.name || phaseType?.label || '',
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Fases do Lançamento</h3>
        <Button size="sm" onClick={() => setShowAddPhase(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Fase
        </Button>
      </div>

      {/* Phases Timeline */}
      <div className="space-y-2">
        {phases.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">
              Nenhuma fase configurada. Adicione fases para organizar seu lançamento.
            </p>
          </Card>
        ) : (
          phases.map((phase, index) => (
            <Card 
              key={phase.id} 
              className={cn(
                "p-4 transition-all",
                !phase.is_active && "opacity-50"
              )}
            >
              <div className="flex items-center gap-4">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 flex items-center gap-3">
                    <Badge className={cn("border", getPhaseColor(phase.phase_type))}>
                      {PHASE_TYPES.find(t => t.value === phase.phase_type)?.label || phase.phase_type}
                    </Badge>
                    <span className="font-medium">{phase.name}</span>
                  </div>

                  <div className="col-span-3 text-sm text-muted-foreground">
                    {phase.start_date && phase.end_date ? (
                      <>
                        {format(new Date(phase.start_date), 'dd/MM', { locale: ptBR })} -{' '}
                        {format(new Date(phase.end_date), 'dd/MM', { locale: ptBR })}
                      </>
                    ) : phase.start_date ? (
                      <>A partir de {format(new Date(phase.start_date), 'dd/MM', { locale: ptBR })}</>
                    ) : (
                      <span className="text-muted-foreground/50">Sem datas</span>
                    )}
                  </div>

                  <div className="col-span-2 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {PHASE_TYPES.find(t => t.value === phase.phase_type)?.description || phase.primary_metric}
                    </Badge>
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <Switch
                      checked={phase.is_active}
                      onCheckedChange={(checked) => 
                        updatePhase.mutate({ id: phase.id, is_active: checked })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {phase.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setEditingPhase(phase)}
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Fase</DialogTitle>
                        </DialogHeader>
                        {editingPhase && (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Nome</Label>
                              <Input
                                value={editingPhase.name}
                                onChange={(e) => setEditingPhase(prev => 
                                  prev ? { ...prev, name: e.target.value } : null
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Data Início</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                      <CalendarIcon className="w-4 h-4 mr-2" />
                                      {editingPhase.start_date 
                                        ? format(new Date(editingPhase.start_date), 'dd/MM/yyyy', { locale: ptBR })
                                        : 'Selecionar'
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={editingPhase.start_date ? new Date(editingPhase.start_date) : undefined}
                                      onSelect={(date) => setEditingPhase(prev => 
                                        prev ? { ...prev, start_date: date ? format(date, 'yyyy-MM-dd') : null } : null
                                      )}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="space-y-2">
                                <Label>Data Fim</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                      <CalendarIcon className="w-4 h-4 mr-2" />
                                      {editingPhase.end_date 
                                        ? format(new Date(editingPhase.end_date), 'dd/MM/yyyy', { locale: ptBR })
                                        : 'Selecionar'
                                      }
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                    <Calendar
                                      mode="single"
                                      selected={editingPhase.end_date ? new Date(editingPhase.end_date) : undefined}
                                      onSelect={(date) => setEditingPhase(prev => 
                                        prev ? { ...prev, end_date: date ? format(date, 'yyyy-MM-dd') : null } : null
                                      )}
                                      locale={ptBR}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Observações</Label>
                              <Textarea
                                value={editingPhase.notes || ''}
                                onChange={(e) => setEditingPhase(prev => 
                                  prev ? { ...prev, notes: e.target.value } : null
                                )}
                                placeholder="Anotações sobre esta fase..."
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setEditingPhase(null)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleUpdatePhase}>
                                Salvar
                              </Button>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePhase(phase.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add Phase Dialog */}
      <Dialog open={showAddPhase} onOpenChange={setShowAddPhase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Fase</Label>
              <Select value={newPhase.phase_type} onValueChange={handlePhaseTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">({type.description})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Fase</Label>
              <Input
                value={newPhase.name}
                onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Captação Principal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {newPhase.start_date 
                        ? format(newPhase.start_date, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPhase.start_date || undefined}
                      onSelect={(date) => setNewPhase(prev => ({ ...prev, start_date: date || null }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Fim (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {newPhase.end_date 
                        ? format(newPhase.end_date, 'dd/MM/yyyy', { locale: ptBR })
                        : 'Selecionar'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={newPhase.end_date || undefined}
                      onSelect={(date) => setNewPhase(prev => ({ ...prev, end_date: date || null }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={newPhase.notes}
                onChange={(e) => setNewPhase(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Anotações sobre esta fase..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddPhase(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddPhase}
                disabled={!newPhase.phase_type || !newPhase.name}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
