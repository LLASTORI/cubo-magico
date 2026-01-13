import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { useProjectModules } from '@/hooks/useProjectModules';
import { useRecoveryStages, RecoveryStage } from '@/hooks/useRecoveryStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Loader2,
  Lock,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  CheckCircle2,
  XCircle,
  Flag,
  Kanban,
} from 'lucide-react';

const COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#22c55e', // green
  '#ef4444', // red
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
];

export default function CRMRecoverySettings() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { stages, isLoading, createStage, updateStage, deleteStage } = useRecoveryStages();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<RecoveryStage | null>(null);
  const [deletingStage, setDeletingStage] = useState<RecoveryStage | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formIsInitial, setFormIsInitial] = useState(false);
  const [formIsRecovered, setFormIsRecovered] = useState(false);
  const [formIsLost, setFormIsLost] = useState(false);

  const resetForm = () => {
    setFormName('');
    setFormColor(COLORS[0]);
    setFormIsInitial(false);
    setFormIsRecovered(false);
    setFormIsLost(false);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (stage: RecoveryStage) => {
    setFormName(stage.name);
    setFormColor(stage.color);
    setFormIsInitial(stage.is_initial);
    setFormIsRecovered(stage.is_recovered);
    setFormIsLost(stage.is_lost);
    setEditingStage(stage);
  };

  const handleCreate = () => {
    createStage.mutate(
      {
        name: formName,
        color: formColor,
        is_initial: formIsInitial,
        is_recovered: formIsRecovered,
        is_lost: formIsLost,
      },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingStage) return;
    updateStage.mutate(
      {
        id: editingStage.id,
        name: formName,
        color: formColor,
        is_initial: formIsInitial,
        is_recovered: formIsRecovered,
        is_lost: formIsLost,
      },
      {
        onSuccess: () => {
          setEditingStage(null);
          resetForm();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingStage) return;
    deleteStage.mutate(deletingStage.id, {
      onSuccess: () => {
        setDeletingStage(null);
      },
    });
  };

  // Check if CRM module is enabled
  if (!modulesLoading && !isModuleEnabled('crm')) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <CardTitle>Módulo CRM não habilitado</CardTitle>
              <CardDescription>O módulo CRM não está habilitado para este projeto.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader pageSubtitle="CRM - Configurar Recuperação" />

      <CRMSubNav 
        rightContent={
          <>
            <Button variant="outline" size="sm" onClick={() => navigateTo('crm/recovery/kanban')}>
              <Kanban className="h-4 w-4 mr-2" />
              Ver Kanban
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Etapa
            </Button>
          </>
        }
      />

      <main className="flex-1 container px-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configurar Etapas de Recuperação</h1>
          <p className="text-muted-foreground">Personalize as etapas do fluxo de recuperação de clientes</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <Card key={stage.id} className="transition-all hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                      <span className="text-sm font-medium w-6">{index + 1}</span>
                    </div>

                    <div
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stage.name}</span>
                        {stage.is_initial && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Flag className="h-3 w-3" />
                            Inicial
                          </Badge>
                        )}
                        {stage.is_recovered && (
                          <Badge variant="outline" className="text-xs gap-1 text-green-500 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Recuperado
                          </Badge>
                        )}
                        {stage.is_lost && (
                          <Badge variant="outline" className="text-xs gap-1 text-red-500 border-red-500/30">
                            <XCircle className="h-3 w-3" />
                            Perdido
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(stage)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingStage(stage)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {stages.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Nenhuma etapa configurada. Clique em "Nova Etapa" para começar.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
            <DialogDescription>Crie uma nova etapa para o fluxo de recuperação</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etapa</Label>
              <Input
                placeholder="Ex: Em Negociação"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Etapa Inicial</Label>
                  <p className="text-xs text-muted-foreground">Novos contatos entram nesta etapa</p>
                </div>
                <Switch checked={formIsInitial} onCheckedChange={setFormIsInitial} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Etapa de Sucesso</Label>
                  <p className="text-xs text-muted-foreground">Cliente foi recuperado com sucesso</p>
                </div>
                <Switch checked={formIsRecovered} onCheckedChange={setFormIsRecovered} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Etapa de Perda</Label>
                  <p className="text-xs text-muted-foreground">Cliente não será mais contatado</p>
                </div>
                <Switch checked={formIsLost} onCheckedChange={setFormIsLost} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || createStage.isPending}>
              {createStage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Etapa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
            <DialogDescription>Atualize as informações da etapa</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Etapa</Label>
              <Input
                placeholder="Ex: Em Negociação"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Etapa Inicial</Label>
                  <p className="text-xs text-muted-foreground">Novos contatos entram nesta etapa</p>
                </div>
                <Switch checked={formIsInitial} onCheckedChange={setFormIsInitial} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Etapa de Sucesso</Label>
                  <p className="text-xs text-muted-foreground">Cliente foi recuperado com sucesso</p>
                </div>
                <Switch checked={formIsRecovered} onCheckedChange={setFormIsRecovered} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Etapa de Perda</Label>
                  <p className="text-xs text-muted-foreground">Cliente não será mais contatado</p>
                </div>
                <Switch checked={formIsLost} onCheckedChange={setFormIsLost} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={!formName.trim() || updateStage.isPending}>
              {updateStage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingStage} onOpenChange={(open) => !open && setDeletingStage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a etapa "{deletingStage?.name}"? Os contatos nesta etapa
              serão movidos para "Não Iniciados".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
