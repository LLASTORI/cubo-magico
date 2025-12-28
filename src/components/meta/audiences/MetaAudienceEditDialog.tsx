import { useState, useEffect } from 'react';
import { Loader2, Users, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useMetaAudiences, MetaAdAudience } from '@/hooks/useMetaAudiences';

interface MetaAudienceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audience: MetaAdAudience;
  projectId: string;
}

export function MetaAudienceEditDialog({
  open,
  onOpenChange,
  audience,
  projectId,
}: MetaAudienceEditDialogProps) {
  const [name, setName] = useState(audience.name);
  const [syncFrequency, setSyncFrequency] = useState<string>(audience.sync_frequency);

  const { updateAudience } = useMetaAudiences(projectId);

  // Reset form when audience changes
  useEffect(() => {
    setName(audience.name);
    setSyncFrequency(audience.sync_frequency);
  }, [audience]);

  const handleSubmit = async () => {
    if (!name) return;

    await updateAudience.mutateAsync({
      audienceId: audience.id,
      name: name !== audience.name ? name : undefined,
      syncFrequency: syncFrequency !== audience.sync_frequency ? syncFrequency : undefined,
    });

    onOpenChange(false);
  };

  const hasChanges = name !== audience.name || syncFrequency !== audience.sync_frequency;
  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Público
          </DialogTitle>
          <DialogDescription>
            Edite as configurações do público "{audience.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Público</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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

          {/* Segment Info (read-only) */}
          <div className="space-y-2">
            <Label>Segmento Configurado</Label>
            <div className="p-3 bg-muted rounded-md text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{audience.segment_config.tags.length} tag(s)</span>
                {audience.segment_config.tags.length > 1 && (
                  <span className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {audience.segment_config.operator}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Para alterar as tags, exclua e recrie o público.
              </p>
            </div>
          </div>

          {/* Current Size */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
            <span className="text-sm text-muted-foreground">Tamanho atual:</span>
            <span className="font-bold">
              {(audience.estimated_size || 0).toLocaleString('pt-BR')} contatos
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || !hasChanges || updateAudience.isPending}
          >
            {updateAudience.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
