import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Brain, 
  Plus, 
  Lock, 
  Unlock, 
  Trash2, 
  Edit2, 
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useContactMemories, 
  useDeleteMemory, 
  useLockMemory,
  useUpdateMemory,
  useCreateManualMemory
} from '@/hooks/useContactMemory';
import { 
  getMemoryTypeIcon, 
  getMemoryTypeLabel, 
  getSourceLabel,
  getConfidenceColor,
  type MemoryType,
  type Memory
} from '@/lib/memoryExtractionEngine';
import { useProject } from '@/contexts/ProjectContext';

interface ContactMemoryCardProps {
  contactId: string;
}

const MEMORY_TYPES: MemoryType[] = [
  'preference', 'objection', 'desire', 'trigger', 'pain_point',
  'habit', 'belief', 'language_style', 'goal', 'fear', 'value', 'constraint', 'context'
];

export function ContactMemoryCard({ contactId }: ContactMemoryCardProps) {
  const { currentProject } = useProject();
  const { data: memories, isLoading } = useContactMemories(contactId);
  const deleteMemory = useDeleteMemory();
  const lockMemory = useLockMemory();
  const updateMemory = useUpdateMemory();
  const createManualMemory = useCreateManualMemory();

  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({
    type: 'preference' as MemoryType,
    summary: '',
    details: '',
    confidence: 0.8
  });

  const activeMemories = memories?.filter(m => !m.is_contradicted) || [];
  const displayMemories = showAll ? activeMemories : activeMemories.slice(0, 5);

  const handleDelete = async (memory: Memory) => {
    if (memory.is_locked) {
      return;
    }
    if (confirm('Tem certeza que deseja remover esta memória?')) {
      await deleteMemory.mutateAsync({ id: memory.id!, contactId });
    }
  };

  const handleToggleLock = async (memory: Memory) => {
    await lockMemory.mutateAsync({ id: memory.id!, isLocked: !memory.is_locked });
  };

  const handleSaveEdit = async () => {
    if (!editingMemory) return;
    await updateMemory.mutateAsync({
      id: editingMemory.id!,
      updates: {
        content: editingMemory.content,
        confidence: editingMemory.confidence,
        memory_type: editingMemory.memory_type
      }
    });
    setEditingMemory(null);
  };

  const handleCreateMemory = async () => {
    if (!currentProject || !newMemory.summary.trim()) return;
    
    await createManualMemory.mutateAsync({
      contactId,
      projectId: currentProject.id,
      memoryType: newMemory.type,
      summary: newMemory.summary,
      details: newMemory.details,
      confidence: newMemory.confidence
    });

    setNewMemory({ type: 'preference', summary: '', details: '', confidence: 0.8 });
    setIsAddDialogOpen(false);
  };

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <Skeleton className="h-5 w-40" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle 
              className="text-lg flex items-center gap-2 cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <Brain className="h-5 w-5 text-primary" />
              Memória de Longo Prazo
              <Badge variant="secondary" className="ml-2">
                {activeMemories.length}
              </Badge>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent>
            {activeMemories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhuma memória registrada ainda</p>
                <p className="text-xs mt-1">
                  Memórias são extraídas automaticamente de quizzes, pesquisas e interações
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayMemories.map(memory => (
                  <div 
                    key={memory.id}
                    className={`p-3 rounded-lg border ${
                      memory.is_contradicted 
                        ? 'border-destructive/30 bg-destructive/5' 
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <span className="text-xl">{getMemoryTypeIcon(memory.memory_type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {getMemoryTypeLabel(memory.memory_type)}
                            </Badge>
                            <span className={`text-xs font-medium ${getConfidenceColor(memory.confidence)}`}>
                              {Math.round(memory.confidence * 100)}% confiança
                            </span>
                            {memory.is_locked && (
                              <Lock className="h-3 w-3 text-muted-foreground" />
                            )}
                            {memory.is_contradicted && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                          <p className="text-sm mt-1">{memory.content.summary}</p>
                          {memory.content.details && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {memory.content.details}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {getSourceLabel(memory.source)}
                              {memory.source_name && `: ${memory.source_name}`}
                            </span>
                            {memory.reinforcement_count > 1 && (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {memory.reinforcement_count}x reforçada
                              </span>
                            )}
                            <span>
                              Atualizada {format(new Date(memory.last_reinforced_at!), "dd/MM/yy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleLock(memory)}
                          title={memory.is_locked ? 'Desbloquear' : 'Bloquear'}
                        >
                          {memory.is_locked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <Unlock className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingMemory(memory)}
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(memory)}
                          disabled={memory.is_locked}
                          title="Remover"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeMemories.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Mostrar menos' : `Ver mais ${activeMemories.length - 5} memórias`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Edit Memory Dialog */}
      <Dialog open={!!editingMemory} onOpenChange={() => setEditingMemory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Memória</DialogTitle>
          </DialogHeader>
          {editingMemory && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={editingMemory.memory_type}
                  onValueChange={(value) => 
                    setEditingMemory({ ...editingMemory, memory_type: value as MemoryType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {getMemoryTypeIcon(type)} {getMemoryTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Resumo</label>
                <Input
                  value={editingMemory.content.summary}
                  onChange={(e) => 
                    setEditingMemory({
                      ...editingMemory,
                      content: { ...editingMemory.content, summary: e.target.value }
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Detalhes</label>
                <Textarea
                  value={editingMemory.content.details || ''}
                  onChange={(e) => 
                    setEditingMemory({
                      ...editingMemory,
                      content: { ...editingMemory.content, details: e.target.value }
                    })
                  }
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Confiança: {Math.round(editingMemory.confidence * 100)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={editingMemory.confidence * 100}
                  onChange={(e) => 
                    setEditingMemory({
                      ...editingMemory,
                      confidence: parseInt(e.target.value) / 100
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMemory(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Memory Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Memória Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={newMemory.type}
                onValueChange={(value) => 
                  setNewMemory({ ...newMemory, type: value as MemoryType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {getMemoryTypeIcon(type)} {getMemoryTypeLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Resumo *</label>
              <Input
                value={newMemory.summary}
                onChange={(e) => setNewMemory({ ...newMemory, summary: e.target.value })}
                placeholder="O que você sabe sobre este contato?"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Detalhes</label>
              <Textarea
                value={newMemory.details}
                onChange={(e) => setNewMemory({ ...newMemory, details: e.target.value })}
                placeholder="Contexto adicional..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Confiança: {Math.round(newMemory.confidence * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={newMemory.confidence * 100}
                onChange={(e) => 
                  setNewMemory({ ...newMemory, confidence: parseInt(e.target.value) / 100 })
                }
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateMemory}
              disabled={!newMemory.summary.trim()}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
