import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CRMSubNav } from '@/components/crm/CRMSubNav';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectNavigation } from '@/hooks/useProjectNavigation';
import { useProjectModules } from '@/hooks/useProjectModules';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Loader2, 
  Lock, 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Pencil,
  Kanban
} from 'lucide-react';
import { toast } from 'sonner';

export default function CRMPipelineSettings() {
  const { navigateTo } = useProjectNavigation();
  const { currentProject } = useProject();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { stages, isLoading: stagesLoading, createStage, updateStage, deleteStage } = usePipelineStages();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');

  const crmEnabled = isModuleEnabled('crm');
  const isLoading = modulesLoading || stagesLoading;

  const handleCreateStage = async () => {
    if (!newStageName.trim() || !currentProject?.id) return;

    await createStage.mutateAsync({
      project_id: currentProject.id,
      name: newStageName.trim(),
      color: newStageColor,
      position: stages.length,
      is_default: false,
      is_won: false,
      is_lost: false,
    });

    setNewStageName('');
    setNewStageColor('#6366f1');
    setShowCreateDialog(false);
  };

  const handleUpdateStage = async () => {
    if (!editingStage || !editingStage.name.trim()) return;

    await updateStage.mutateAsync({
      id: editingStage.id,
      name: editingStage.name,
      color: editingStage.color,
    });

    setEditingStage(null);
    toast.success('Etapa atualizada');
  };

  const handleDeleteStage = async (stageId: string) => {
    if (confirm('Tem certeza que deseja excluir esta etapa? Os leads nesta etapa ficarão sem etapa definida.')) {
      await deleteStage.mutateAsync(stageId);
    }
  };

  const colorOptions = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#f59e0b', '#eab308', '#84cc16', '#22c55e',
    '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1',
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Configurar Pipeline" />
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
        <AppHeader pageSubtitle="Configurar Pipeline" />
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
      <AppHeader pageSubtitle="CRM - Configurar Pipeline" />
      
      <CRMSubNav 
        rightContent={
          <>
            <Button variant="outline" size="sm" onClick={() => navigateTo('crm/kanban')}>
              <Kanban className="h-4 w-4 mr-2" />
              Ver Pipeline
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Etapa
            </Button>
          </>
        }
      />
      
      <main className="container mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Configurar Etapas do Pipeline</h1>
          <p className="text-muted-foreground">
            Gerencie as etapas do seu funil de vendas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Etapas do Pipeline</CardTitle>
            <CardDescription>
              Arraste para reordenar (em breve) ou clique para editar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={stage.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div 
                    className="w-4 h-4 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{stage.name}</p>
                    <p className="text-xs text-muted-foreground">Posição: {index + 1}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {stage.is_default && (
                      <Badge variant="outline" className="text-xs">Padrão</Badge>
                    )}
                    {stage.is_won && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Ganho</Badge>
                    )}
                    {stage.is_lost && (
                      <Badge className="bg-red-100 text-red-800 text-xs">Perdido</Badge>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setEditingStage({ ...stage })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleDeleteStage(stage.id)}
                      disabled={stage.is_default}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {stages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma etapa configurada
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Etapa</DialogTitle>
            <DialogDescription>Adicione uma nova etapa ao pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Etapa</Label>
              <Input
                placeholder="Ex: Em Negociação"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newStageColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStageColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateStage} disabled={createStage.isPending}>
              {createStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
          </DialogHeader>
          {editingStage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Etapa</Label>
                <Input
                  value={editingStage.name}
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingStage.color === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEditingStage({ ...editingStage, color })}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>Cancelar</Button>
            <Button onClick={handleUpdateStage} disabled={updateStage.isPending}>
              {updateStage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
