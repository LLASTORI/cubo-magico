import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, Pencil, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useMetaAudiences, MetaAdAudience, AvailableTag } from '@/hooks/useMetaAudiences';

interface MetaAudienceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: MetaAdAudience;
  projectId: string;
  availableTags: AvailableTag[];
  tagsLoading?: boolean;
  onRefreshTags?: () => void;
}

export function MetaAudienceEditDialog({
  open,
  onOpenChange,
  audience,
  projectId,
  availableTags,
  tagsLoading,
  onRefreshTags,
}: MetaAudienceEditDialogProps) {
  const [name, setName] = useState(audience.name);
  const [syncFrequency, setSyncFrequency] = useState<string>(audience.sync_frequency);
  const [selectedTags, setSelectedTags] = useState<string[]>(audience.segment_config.tags);
  const [operator, setOperator] = useState<'AND' | 'OR'>(audience.segment_config.operator);
  const [tagSearch, setTagSearch] = useState('');
  const [estimatedSize, setEstimatedSize] = useState<number | null>(audience.estimated_size || null);
  const [loadingSize, setLoadingSize] = useState(false);

  const { updateAudience, syncAudience, getEstimatedSize } = useMetaAudiences(projectId);

  // Reset form when audience changes
  useEffect(() => {
    setName(audience.name);
    setSyncFrequency(audience.sync_frequency);
    setSelectedTags(audience.segment_config.tags);
    setOperator(audience.segment_config.operator);
    setTagSearch('');
    setEstimatedSize(audience.estimated_size || null);
  }, [audience]);

  // Recalculate estimated size when tags/operator changes
  const fetchSize = useCallback(async () => {
    if (selectedTags.length === 0) {
      setEstimatedSize(null);
      return;
    }
    setLoadingSize(true);
    try {
      const size = await getEstimatedSize({ tags: selectedTags, operator });
      setEstimatedSize(size);
    } catch {
      // ignore
    } finally {
      setLoadingSize(false);
    }
  }, [selectedTags, operator, getEstimatedSize]);

  useEffect(() => {
    const timer = setTimeout(fetchSize, 300);
    return () => clearTimeout(timer);
  }, [fetchSize]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredTags = availableTags.filter(t =>
    t.tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!name) return;

    const tagsChanged =
      JSON.stringify([...selectedTags].sort()) !==
      JSON.stringify([...audience.segment_config.tags].sort()) ||
      operator !== audience.segment_config.operator;

    await updateAudience.mutateAsync({
      audienceId: audience.id,
      name: name !== audience.name ? name : undefined,
      syncFrequency: syncFrequency !== audience.sync_frequency ? syncFrequency : undefined,
      segmentConfig: tagsChanged ? { tags: selectedTags, operator } : undefined,
    });

    // Auto-sync when tags changed so Meta audience reflects new segment immediately
    if (tagsChanged) {
      await syncAudience.mutateAsync(audience.id);
    }

    onOpenChange(false);
  };

  const hasChanges =
    name !== audience.name ||
    syncFrequency !== audience.sync_frequency ||
    JSON.stringify([...selectedTags].sort()) !==
      JSON.stringify([...audience.segment_config.tags].sort()) ||
    operator !== audience.segment_config.operator;

  const isValid = name.trim().length > 0 && selectedTags.length > 0;
  const isPending = updateAudience.isPending || syncAudience.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Público
          </DialogTitle>
          <DialogDescription>
            Edite as configurações do público "{audience.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 flex-1 overflow-y-auto pr-1">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Público</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Tags Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Tags do Segmento</Label>
                <span className="text-xs text-muted-foreground">
                  ({availableTags.length} disponíveis)
                </span>
                {onRefreshTags && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onRefreshTags}
                    disabled={tagsLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${tagsLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
              {selectedTags.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedTags.length} selecionada(s)
                </span>
              )}
            </div>

            {/* Selected tags */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/50">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => handleToggleTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}

            {/* Search */}
            <Input
              placeholder="Buscar tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />

            {/* Add/Remove All Buttons */}
            {filteredTags.length > 0 && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const names = filteredTags.map(t => t.tag);
                    setSelectedTags(prev => Array.from(new Set([...prev, ...names])));
                  }}
                >
                  Adicionar Todas ({filteredTags.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const names = filteredTags.map(t => t.tag);
                    setSelectedTags(prev => prev.filter(tag => !names.includes(tag)));
                  }}
                >
                  Remover Todas
                </Button>
              </div>
            )}

            {/* Available tags */}
            <ScrollArea className="h-48 border rounded-md p-2">
              <div className="space-y-1">
                {filteredTags.map((item) => (
                  <div
                    key={item.tag}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleTag(item.tag)}
                  >
                    <Checkbox
                      checked={selectedTags.includes(item.tag)}
                      onCheckedChange={() => handleToggleTag(item.tag)}
                    />
                    <span className="flex-1 text-sm">{item.tag}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.count.toLocaleString('pt-BR')} contatos
                    </span>
                  </div>
                ))}
                {filteredTags.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma tag encontrada
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Operator (only if multiple tags) */}
          {selectedTags.length > 1 && (
            <div className="space-y-3">
              <Label>Combinação de Tags</Label>
              <RadioGroup
                value={operator}
                onValueChange={(v) => setOperator(v as 'AND' | 'OR')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="AND" id="edit-and" />
                  <Label htmlFor="edit-and" className="cursor-pointer">
                    <span className="font-medium">E (AND)</span>
                    <span className="text-muted-foreground ml-1">— contato deve ter TODAS as tags</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OR" id="edit-or" />
                  <Label htmlFor="edit-or" className="cursor-pointer">
                    <span className="font-medium">OU (OR)</span>
                    <span className="text-muted-foreground ml-1">— contato deve ter PELO MENOS UMA tag</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Estimated Size */}
          {selectedTags.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Tamanho Estimado</p>
                {loadingSize ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <p className="text-2xl font-bold">
                    {(estimatedSize ?? 0).toLocaleString('pt-BR')} contatos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Sync Frequency */}
          <div className="space-y-2">
            <Label>Frequência de Sincronização</Label>
            <Select value={syncFrequency} onValueChange={setSyncFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="6h">A cada 6 horas</SelectItem>
                <SelectItem value="24h">Diária (recomendado)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || !hasChanges || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {syncAudience.isPending ? 'Sincronizando...' : 'Salvando...'}
              </>
            ) : (
              'Salvar e Sincronizar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
