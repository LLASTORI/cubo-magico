import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLaunchPhases, PHASE_TYPES, LaunchPhase } from "@/hooks/useLaunchPhases";
import { useLaunchEditions } from "@/hooks/useLaunchEditions";
import { SortablePhaseItem } from "./SortablePhaseItem";

interface LaunchPhaseEditorProps {
  projectId: string;
  funnelId: string;
  funnelName: string;
  funnelModel?: string | null;
}

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  planned: { label: 'Planejada', variant: 'outline' },
  active: { label: 'Ativa', variant: 'default' },
  finished: { label: 'Finalizada', variant: 'secondary' },
};

export const LaunchPhaseEditor = ({ projectId, funnelId, funnelName, funnelModel }: LaunchPhaseEditorProps) => {
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [editingPhase, setEditingPhase] = useState<LaunchPhase | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [newPhase, setNewPhase] = useState({
    phase_type: '',
    name: '',
    edition_id: '' as string,
    start_date: null as Date | null,
    end_date: null as Date | null,
    notes: '',
  });

  const isLancamentoPago = funnelModel === 'lancamento_pago';

  const {
    phases,
    phaseCampaigns,
    isLoading,
    createPhase,
    updatePhase,
    deletePhase,
    reorderPhases,
  } = useLaunchPhases(projectId, funnelId);

  const { editions } = useLaunchEditions(
    isLancamentoPago ? projectId : undefined,
    isLancamentoPago ? funnelId : undefined,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const phaseIds = useMemo(() => phases.map(p => p.id), [phases]);

  // Group phases by edition (only for lancamento_pago)
  const groupedPhases = useMemo(() => {
    if (!isLancamentoPago) return null;

    const editionMap = new Map(editions.map(e => [e.id, e]));
    const groups: {
      editionId: string | null;
      editionName: string;
      editionStatus: string | null;
      editionDates: string | null;
      phases: LaunchPhase[];
    }[] = [];

    const byEdition = new Map<string | null, LaunchPhase[]>();
    for (const phase of phases) {
      const key = phase.edition_id || null;
      if (!byEdition.has(key)) byEdition.set(key, []);
      byEdition.get(key)!.push(phase);
    }

    // Editions sorted by edition_number descending (most recent first)
    const sortedEditions = [...editions].sort(
      (a, b) => b.edition_number - a.edition_number
    );

    for (const edition of sortedEditions) {
      const edPhases = byEdition.get(edition.id) || [];
      if (edPhases.length === 0) continue;
      const dates = [
        edition.start_date ? format(new Date(edition.start_date), 'dd/MM/yy', { locale: ptBR }) : null,
        edition.end_date ? format(new Date(edition.end_date), 'dd/MM/yy', { locale: ptBR }) : null,
      ].filter(Boolean).join(' → ');
      groups.push({
        editionId: edition.id,
        editionName: edition.name,
        editionStatus: edition.status,
        editionDates: dates || null,
        phases: edPhases.sort((a, b) => a.phase_order - b.phase_order),
      });
    }

    // "Sem edição" group at the end
    const unlinked = byEdition.get(null) || [];
    if (unlinked.length > 0) {
      groups.push({
        editionId: null,
        editionName: 'Sem edição',
        editionStatus: null,
        editionDates: null,
        phases: unlinked.sort((a, b) => a.phase_order - b.phase_order),
      });
    }

    return groups;
  }, [isLancamentoPago, phases, editions]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = phases.findIndex(p => p.id === active.id);
      const newIndex = phases.findIndex(p => p.id === over.id);

      const reorderedPhases = arrayMove(phases, oldIndex, newIndex);
      const updates = reorderedPhases.map((phase, idx) => ({
        id: phase.id,
        phase_order: idx,
      }));

      reorderPhases.mutate(updates);
    }
  }, [phases, reorderPhases]);

  const togglePhaseExpanded = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const handleAddPhase = () => {
    if (!newPhase.phase_type || !newPhase.name) return;

    const phaseType = PHASE_TYPES.find(p => p.value === newPhase.phase_type);
    const editionId = newPhase.edition_id && newPhase.edition_id !== 'none'
      ? newPhase.edition_id
      : null;

    createPhase.mutate({
      funnel_id: funnelId,
      project_id: projectId,
      edition_id: editionId,
      phase_type: newPhase.phase_type,
      name: newPhase.name,
      start_date: newPhase.start_date ? format(newPhase.start_date, 'yyyy-MM-dd') : null,
      end_date: newPhase.end_date ? format(newPhase.end_date, 'yyyy-MM-dd') : null,
      primary_metric: phaseType?.metric || 'spend',
      is_active: true,
      phase_order: phases.length,
      notes: newPhase.notes || null,
      campaign_name_pattern: null,
    });

    setNewPhase({ phase_type: '', name: '', edition_id: '', start_date: null, end_date: null, notes: '' });
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

  const renderPhaseList = (phasesToRender: LaunchPhase[]) => {
    const ids = phasesToRender.map(p => p.id);
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {phasesToRender.map((phase) => (
            <SortablePhaseItem
              key={phase.id}
              phase={phase}
              isExpanded={expandedPhases.has(phase.id)}
              onToggleExpanded={() => togglePhaseExpanded(phase.id)}
              onUpdate={(updates) => updatePhase.mutate(updates)}
              onDelete={() => handleDeletePhase(phase.id)}
              editingPhase={editingPhase}
              setEditingPhase={setEditingPhase}
              onSaveEdit={handleUpdatePhase}
              phaseCampaigns={phaseCampaigns}
              projectId={projectId}
              funnelId={funnelId}
            />
          ))}
        </SortableContext>
      </DndContext>
    );
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
        ) : isLancamentoPago && groupedPhases ? (
          /* Grouped by edition for lancamento_pago */
          <div className="space-y-4">
            {groupedPhases.map((group) => {
              const statusBadge = group.editionStatus
                ? STATUS_BADGES[group.editionStatus]
                : null;
              return (
                <div key={group.editionId || '__none__'} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <h4 className="text-sm font-semibold text-muted-foreground">
                      {group.editionName}
                    </h4>
                    {statusBadge && (
                      <Badge variant={statusBadge.variant} className="text-xs">
                        {statusBadge.label}
                      </Badge>
                    )}
                    {group.editionDates && (
                      <span className="text-xs text-muted-foreground">
                        {group.editionDates}
                      </span>
                    )}
                  </div>
                  {renderPhaseList(group.phases)}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat list for classic launches */
          renderPhaseList(phases)
        )}
      </div>

      {/* Add Phase Dialog */}
      <Dialog open={showAddPhase} onOpenChange={setShowAddPhase}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Edition selector — only for lancamento_pago */}
            {isLancamentoPago && editions.length > 0 && (
              <div className="space-y-2">
                <Label>Edição</Label>
                <Select
                  value={newPhase.edition_id || 'none'}
                  onValueChange={(value) =>
                    setNewPhase(prev => ({ ...prev, edition_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a edição" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem edição</SelectItem>
                    {editions.map((ed) => (
                      <SelectItem key={ed.id} value={ed.id}>
                        {ed.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
              <Button onClick={handleAddPhase} disabled={!newPhase.phase_type || !newPhase.name}>
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
