import { useState } from 'react';
import { Loader2, Users, Copy } from 'lucide-react';

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
import { Slider } from '@/components/ui/slider';

import { useMetaAudiences, MetaAdAudience } from '@/hooks/useMetaAudiences';

interface MetaLookalikeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceAudience: MetaAdAudience;
  projectId: string;
}

const COUNTRIES = [
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'PT', label: 'Portugal' },
  { value: 'ES', label: 'Espanha' },
  { value: 'AR', label: 'Argentina' },
  { value: 'MX', label: 'México' },
  { value: 'CO', label: 'Colômbia' },
  { value: 'CL', label: 'Chile' },
];

export function MetaLookalikeDialog({
  open,
  onOpenChange,
  sourceAudience,
  projectId,
}: MetaLookalikeDialogProps) {
  const [name, setName] = useState(`Lookalike - ${sourceAudience.name}`);
  const [country, setCountry] = useState('BR');
  const [percentage, setPercentage] = useState(1);

  const { createLookalike } = useMetaAudiences(projectId);

  const handleSubmit = async () => {
    if (!name) return;

    await createLookalike.mutateAsync({
      sourceAudienceId: sourceAudience.id,
      name,
      country,
      percentage,
    });

    onOpenChange(false);
  };

  // Estimate lookalike size (rough approximation)
  const getEstimatedLookalikeSize = () => {
    // Brazil has ~100 million Facebook users
    // Other countries vary, but we'll use a simplified approach
    const countryPopulations: Record<string, number> = {
      BR: 100000000,
      US: 250000000,
      PT: 6000000,
      ES: 25000000,
      AR: 25000000,
      MX: 85000000,
      CO: 35000000,
      CL: 12000000,
    };
    
    const population = countryPopulations[country] || 50000000;
    return Math.floor(population * (percentage / 100));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Criar Público Semelhante
          </DialogTitle>
          <DialogDescription>
            Crie um Lookalike Audience baseado no público "{sourceAudience.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Source audience info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Público Base</p>
              <p className="text-lg font-bold">
                {(sourceAudience.estimated_size || 0).toLocaleString('pt-BR')} contatos
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Lookalike *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label>País *</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Percentage */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Percentual de Semelhança</Label>
              <span className="text-sm font-medium">{percentage}%</span>
            </div>
            <Slider
              value={[percentage]}
              onValueChange={([value]) => setPercentage(value)}
              min={1}
              max={10}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1% (mais similar)</span>
              <span>10% (maior alcance)</span>
            </div>
          </div>

          {/* Estimated size */}
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Tamanho Estimado do Lookalike</p>
              <p className="text-2xl font-bold text-primary">
                ~{getEstimatedLookalikeSize().toLocaleString('pt-BR')} pessoas
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || createLookalike.isPending}
          >
            {createLookalike.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Lookalike'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
