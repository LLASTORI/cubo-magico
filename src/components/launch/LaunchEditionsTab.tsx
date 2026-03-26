import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Pencil, Trash2, Info, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLaunchEditions } from '@/hooks/useLaunchEditions';
import { LaunchEdition, EditionStatus } from '@/types/launch-editions';

interface Props {
  projectId: string;
  funnelId: string;
}

const STATUS_CONFIG: Record<EditionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  planned:  { label: 'Planejada',  variant: 'outline',    className: 'border-muted-foreground/50 text-muted-foreground' },
  active:   { label: 'Ativa',      variant: 'default',    className: 'bg-green-500 hover:bg-green-500 text-white border-0' },
  finished: { label: 'Finalizada', variant: 'secondary',  className: '' },
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR });
}

interface EditionFormState {
  name: string;
  event_date: Date | undefined;
  start_date: Date | undefined;
  end_date: Date | undefined;
  status: EditionStatus;
  notes: string;
}

const EMPTY_FORM: EditionFormState = {
  name: '',
  event_date: undefined,
  start_date: undefined,
  end_date: undefined,
  status: 'planned',
  notes: '',
};

function editionToForm(e: LaunchEdition): EditionFormState {
  return {
    name: e.name,
    event_date: e.event_date ? parseISO(e.event_date) : undefined,
    start_date: e.start_date ? parseISO(e.start_date) : undefined,
    end_date: e.end_date ? parseISO(e.end_date) : undefined,
    status: e.status,
    notes: e.notes || '',
  };
}

interface DatePickerProps {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}

function DatePickerField({ label, value, onChange }: DatePickerProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start font-normal">
            <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
            {value ? format(value, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={onChange} locale={ptBR} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export const LaunchEditionsTab = ({ projectId, funnelId }: Props) => {
  const { editions, isLoading, createEdition, updateEdition, deleteEdition, cloneEdition } = useLaunchEditions(projectId, funnelId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EditionFormState>(EMPTY_FORM);
  const [justCreated, setJustCreated] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Clone dialog state
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [cloneForm, setCloneForm] = useState<EditionFormState>(EMPTY_FORM);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setJustCreated(false);
    setDialogOpen(true);
  };

  const openEdit = (edition: LaunchEdition) => {
    setEditingId(edition.id);
    setForm(editionToForm(edition));
    setJustCreated(false);
    setDialogOpen(true);
  };

  const openClone = (edition: LaunchEdition) => {
    setCloneSourceId(edition.id);
    setCloneForm({
      ...EMPTY_FORM,
      name: `${edition.name} - cópia`,
    });
    setCloneDialogOpen(true);
  };

  const handleClone = () => {
    if (!cloneSourceId || !cloneForm.name.trim() || !cloneForm.start_date || !cloneForm.event_date) return;
    cloneEdition.mutate({
      sourceEditionId: cloneSourceId,
      funnel_id: funnelId,
      project_id: projectId,
      name: cloneForm.name.trim(),
      start_date: format(cloneForm.start_date, 'yyyy-MM-dd'),
      event_date: format(cloneForm.event_date, 'yyyy-MM-dd'),
      end_date: cloneForm.end_date ? format(cloneForm.end_date, 'yyyy-MM-dd') : null,
      status: 'planned',
      notes: null,
    }, {
      onSuccess: () => setCloneDialogOpen(false),
    });
  };

  const handleSave = () => {
    const payload = {
      name: form.name.trim(),
      event_date: form.event_date ? format(form.event_date, 'yyyy-MM-dd') : null,
      start_date: form.start_date ? format(form.start_date, 'yyyy-MM-dd') : null,
      end_date: form.end_date ? format(form.end_date, 'yyyy-MM-dd') : null,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      updateEdition.mutate({ id: editingId, ...payload }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createEdition.mutate({ funnel_id: funnelId, project_id: projectId, ...payload }, {
        onSuccess: () => {
          setJustCreated(true);
          // Keep dialog open briefly to show the "fases copiadas" notice
          setTimeout(() => setDialogOpen(false), 2200);
        },
      });
    }
  };

  const hasPreviousEditions = editions.length > 0;
  const isPending = createEdition.isPending || updateEdition.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Cada edição representa uma turma ou ciclo do lançamento, com suas próprias datas.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nova Edição
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Carregando...</div>
      ) : editions.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
          Nenhuma edição cadastrada ainda.
          <br />
          Clique em "Nova Edição" para começar.
        </div>
      ) : (
        <div className="divide-y rounded-lg border overflow-hidden">
          {editions.map((edition) => {
            const sc = STATUS_CONFIG[edition.status];
            return (
              <div key={edition.id} className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors">
                <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
                  #{edition.edition_number}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{edition.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    {edition.start_date && <span>Início: {formatDate(edition.start_date)}</span>}
                    {edition.event_date && <span>Evento: {formatDate(edition.event_date)}</span>}
                    {edition.end_date && <span>Fim: {formatDate(edition.end_date)}</span>}
                    {!edition.start_date && !edition.event_date && !edition.end_date && (
                      <span>Sem datas definidas</span>
                    )}
                  </div>
                </div>
                <Badge variant={sc.variant} className={`shrink-0 text-xs ${sc.className}`}>
                  {sc.label}
                </Badge>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Clonar edição" onClick={() => openClone(edition)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(edition)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setConfirmDeleteId(edition.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Edição' : 'Nova Edição'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edition-name">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="edition-name"
                placeholder='Ex: Janeiro 2026 ou Turma 3'
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DatePickerField
                label="Início das vendas"
                value={form.start_date}
                onChange={(d) => setForm(f => ({ ...f, start_date: d }))}
              />
              <DatePickerField
                label="Data do evento"
                value={form.event_date}
                onChange={(d) => setForm(f => ({ ...f, event_date: d }))}
              />
            </div>

            <DatePickerField
              label="Encerramento"
              value={form.end_date}
              onChange={(d) => setForm(f => ({ ...f, end_date: d }))}
            />

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as EditionStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejada</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="finished">Finalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edition-notes">Observações</Label>
              <Textarea
                id="edition-notes"
                placeholder="Anotações sobre esta edição..."
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Feedback after creating with copied phases */}
            {justCreated && hasPreviousEditions && (
              <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>As fases da edição anterior foram copiadas como ponto de partida. Ajuste as datas de cada fase quando necessário.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || isPending}>
              {isPending ? 'Salvando...' : editingId ? 'Salvar' : 'Criar Edição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clonar Edição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="clone-name">Nome <span className="text-destructive">*</span></Label>
              <Input
                id="clone-name"
                value={cloneForm.name}
                onChange={(e) => setCloneForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DatePickerField
                label="Início das vendas *"
                value={cloneForm.start_date}
                onChange={(d) => setCloneForm(f => ({ ...f, start_date: d }))}
              />
              <DatePickerField
                label="Data do evento *"
                value={cloneForm.event_date}
                onChange={(d) => setCloneForm(f => ({ ...f, event_date: d }))}
              />
            </div>
            <DatePickerField
              label="Encerramento"
              value={cloneForm.end_date}
              onChange={(d) => setCloneForm(f => ({ ...f, end_date: d }))}
            />
            <div className="flex items-start gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>As fases da edição original serão copiadas sem datas. Ajuste as datas de cada fase depois.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleClone}
              disabled={!cloneForm.name.trim() || !cloneForm.start_date || !cloneForm.event_date || cloneEdition.isPending}
            >
              {cloneEdition.isPending ? 'Clonando...' : 'Clonar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete Dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover edição?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Todas as fases vinculadas a esta edição também serão removidas. Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteEdition.isPending}
              onClick={() => {
                if (confirmDeleteId) {
                  deleteEdition.mutate(confirmDeleteId, {
                    onSuccess: () => setConfirmDeleteId(null),
                  });
                }
              }}
            >
              {deleteEdition.isPending ? 'Removendo...' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
