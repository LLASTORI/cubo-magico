import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Users, RefreshCw } from 'lucide-react';

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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { useMetaAudiences, SegmentConfig, AvailableTag } from '@/hooks/useMetaAudiences';

interface MetaAudienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  adAccounts: { id: string; account_id: string; account_name: string | null }[];
  availableTags: AvailableTag[];
  tagsLoading?: boolean;
  onRefreshTags?: () => void;
}

export function MetaAudienceDialog({
  open,
  onOpenChange,
  projectId,
  adAccounts,
  availableTags,
  tagsLoading,
  onRefreshTags,
}: MetaAudienceDialogProps) {
  const [name, setName] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [operator, setOperator] = useState<'AND' | 'OR'>('AND');
  const [syncFrequency, setSyncFrequency] = useState('24h');
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [loadingSize, setLoadingSize] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  const { createAudience, getEstimatedSize } = useMetaAudiences(projectId);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setAdAccountId(adAccounts[0]?.account_id || '');
      setSelectedTags([]);
      setOperator('AND');
      setSyncFrequency('24h');
      setEstimatedSize(null);
      setTagSearch('');
    }
  }, [open, adAccounts]);

  // Fetch estimated size when tags or operator changes
  useEffect(() => {
    const fetchSize = async () => {
      if (selectedTags.length === 0) {
        setEstimatedSize(null);
        return;
      }

      setLoadingSize(true);
      try {
        const size = await getEstimatedSize({ tags: selectedTags, operator });
        setEstimatedSize(size);
      } catch (error) {
        console.error('Error fetching estimated size:', error);
      } finally {
        setLoadingSize(false);
      }
    };

    const debounce = setTimeout(fetchSize, 300);
    return () => clearTimeout(debounce);
  }, [selectedTags, operator, getEstimatedSize]);

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!name || !adAccountId || selectedTags.length === 0) return;

    await createAudience.mutateAsync({
      adAccountId,
      name,
      segmentConfig: { tags: selectedTags, operator },
      syncFrequency,
    });

    onOpenChange(false);
  };

  const filteredTags = availableTags.filter(t =>
    t.tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const isValid = name && adAccountId && selectedTags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Novo Público Automático</DialogTitle>
          <DialogDescription>
            Crie um público personalizado no Meta Ads baseado em tags do CRM
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Público *</Label>
            <Input
              id="name"
              placeholder="Ex: Clientes VIP, Abandonos Carrinho..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Ad Account */}
          <div className="space-y-2">
            <Label>Conta de Anúncios *</Label>
            <Select value={adAccountId} onValueChange={setAdAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {adAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.account_id}>
                    {account.account_name || `act_${account.account_id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label>Tags do Segmento *</Label>
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
                    const filteredTagNames = filteredTags.map(t => t.tag);
                    setSelectedTags(prev => {
                      const newTags = new Set(prev);
                      filteredTagNames.forEach(tag => newTags.add(tag));
                      return Array.from(newTags);
                    });
                  }}
                >
                  Adicionar Todas ({filteredTags.length})
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const filteredTagNames = filteredTags.map(t => t.tag);
                    setSelectedTags(prev => prev.filter(tag => !filteredTagNames.includes(tag)));
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
                  <RadioGroupItem value="AND" id="and" />
                  <Label htmlFor="and" className="cursor-pointer">
                    <span className="font-medium">E (AND)</span>
                    <span className="text-muted-foreground ml-1">- Contato deve ter TODAS as tags</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OR" id="or" />
                  <Label htmlFor="or" className="cursor-pointer">
                    <span className="font-medium">OU (OR)</span>
                    <span className="text-muted-foreground ml-1">- Contato deve ter PELO MENOS UMA tag</span>
                  </Label>
                </div>
              </RadioGroup>
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
                    {estimatedSize?.toLocaleString('pt-BR') || '0'} contatos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* LGPD Warning */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Os dados serão anonimizados por hash SHA-256 antes de serem enviados ao Meta Ads.
              Apenas email, telefone e nome são utilizados para correspondência.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createAudience.isPending}
          >
            {createAudience.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Público'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
