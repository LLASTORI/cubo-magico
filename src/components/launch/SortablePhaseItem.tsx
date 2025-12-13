import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Trash2, GripVertical, Settings2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LaunchPhase, PHASE_TYPES, PhaseCampaign } from "@/hooks/useLaunchPhases";
import { PhaseCampaignsManager } from "./PhaseCampaignsManager";

interface SortablePhaseItemProps {
  phase: LaunchPhase;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdate: (updates: Partial<LaunchPhase> & { id: string }) => void;
  onDelete: () => void;
  editingPhase: LaunchPhase | null;
  setEditingPhase: (phase: LaunchPhase | null) => void;
  onSaveEdit: () => void;
  phaseCampaigns: PhaseCampaign[];
  projectId: string;
  funnelId: string;
}

const getPhaseColor = (phaseType: string) => {
  const colors: Record<string, string> = {
    distribuicao: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    captacao: 'bg-green-500/20 text-green-600 border-green-500/30',
    aquecimento: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    lembrete: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
    remarketing: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
    vendas: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    ultima_oportunidade: 'bg-red-500/20 text-red-600 border-red-500/30',
    flash_open: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
    downsell: 'bg-pink-500/20 text-pink-600 border-pink-500/30',
  };
  return colors[phaseType] || 'bg-muted text-muted-foreground';
};

export const SortablePhaseItem = ({
  phase,
  isExpanded,
  onToggleExpanded,
  onUpdate,
  onDelete,
  editingPhase,
  setEditingPhase,
  onSaveEdit,
  phaseCampaigns,
  projectId,
  funnelId,
}: SortablePhaseItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const phaseLinkedCampaigns = phaseCampaigns.filter(pc => pc.phase_id === phase.id);

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggleExpanded}
    >
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "transition-all",
          !phase.is_active && "opacity-50",
          isDragging && "shadow-lg ring-2 ring-primary/20 bg-background"
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="flex-1 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4 flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Badge className={cn("border", getPhaseColor(phase.phase_type))}>
                  {PHASE_TYPES.find(t => t.value === phase.phase_type)?.label || phase.phase_type}
                </Badge>
                <span className="font-medium">{phase.name}</span>
                {phaseLinkedCampaigns.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {phaseLinkedCampaigns.length} campanha(s)
                  </Badge>
                )}
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

              <div className="col-span-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={phase.is_active}
                  onCheckedChange={(checked) => onUpdate({ id: phase.id, is_active: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {phase.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="col-span-1 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                    {editingPhase && editingPhase.id === phase.id && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={editingPhase.name}
                            onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
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
                                  onSelect={(date) =>
                                    setEditingPhase({ ...editingPhase, start_date: date ? format(date, 'yyyy-MM-dd') : null })
                                  }
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
                                  onSelect={(date) =>
                                    setEditingPhase({ ...editingPhase, end_date: date ? format(date, 'yyyy-MM-dd') : null })
                                  }
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
                            onChange={(e) => setEditingPhase({ ...editingPhase, notes: e.target.value })}
                            placeholder="Anotações sobre esta fase..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setEditingPhase(null)}>
                            Cancelar
                          </Button>
                          <Button onClick={onSaveEdit}>
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
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t border-border/50 ml-12">
            <PhaseCampaignsManager
              projectId={projectId}
              funnelId={funnelId}
              phase={phase}
              phaseCampaigns={phaseCampaigns}
            />
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};