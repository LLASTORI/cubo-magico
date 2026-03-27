import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LotOfferRole } from '@/types/launch-lots';

interface OfferMapping {
  id: string;
  nome_oferta: string | null;
  nome_produto: string;
  codigo_oferta: string | null;
  tipo_posicao: string | null;
  valor: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerMappings: OfferMapping[];
  existingOfferIds: string[];
  onAdd: (offerMappingId: string, role: LotOfferRole) => void;
}

const ROLE_OPTIONS: {
  value: LotOfferRole;
  label: string;
}[] = [
  { value: 'front', label: 'Principal' },
  { value: 'bump', label: 'Order Bump' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'downsell', label: 'Downsell' },
];

const POSICAO_TO_ROLE: Record<string, LotOfferRole> = {
  FRONT: 'front',
  FE: 'front',
  OB: 'bump',
  US: 'upsell',
  DS: 'downsell',
};

const POSICAO_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  FRONT: {
    label: 'FRONT',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  FE: {
    label: 'FE',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  OB: {
    label: 'OB',
    className:
      'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  US: {
    label: 'US',
    className:
      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  DS: {
    label: 'DS',
    className:
      'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
};

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const AddOfferToLotDialog = ({
  open,
  onOpenChange,
  offerMappings,
  existingOfferIds,
  onAdd,
}: Props) => {
  const [selectedOfferId, setSelectedOfferId] = useState<
    string | undefined
  >(undefined);
  const [role, setRole] = useState<LotOfferRole>('front');

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedOfferId(undefined);
      setRole('front');
    }
  }, [open]);

  // Auto-detect role when offer is selected
  useEffect(() => {
    if (!selectedOfferId) return;
    const offer = offerMappings.find(
      (o) => o.id === selectedOfferId
    );
    if (offer?.tipo_posicao) {
      const detected =
        POSICAO_TO_ROLE[offer.tipo_posicao.toUpperCase()];
      if (detected) {
        setRole(detected);
      }
    }
  }, [selectedOfferId, offerMappings]);

  const availableOffers = offerMappings.filter(
    (o) => !existingOfferIds.includes(o.id)
  );

  const handleAdd = () => {
    if (!selectedOfferId) return;
    onAdd(selectedOfferId, role);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Oferta ao Lote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Offer select */}
          <div className="space-y-1.5">
            <Label>Oferta</Label>
            {availableOffers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Todas as ofertas já estão vinculadas a este lote.
              </p>
            ) : (
              <Select
                value={selectedOfferId}
                onValueChange={setSelectedOfferId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar oferta..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOffers.map((offer) => {
                    const pb = offer.tipo_posicao
                      ? POSICAO_BADGE[
                          offer.tipo_posicao.toUpperCase()
                        ]
                      : null;
                    return (
                      <SelectItem
                        key={offer.id}
                        value={offer.id}
                      >
                        <span className="flex items-center gap-2">
                          <span className="truncate">
                            {offer.nome_oferta ||
                              offer.nome_produto}
                          </span>
                          {offer.codigo_oferta && (
                            <span className="text-xs text-muted-foreground">
                              {offer.codigo_oferta}
                            </span>
                          )}
                          {offer.valor != null &&
                            offer.valor > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(offer.valor)}
                              </span>
                            )}
                          {pb && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 ${pb.className}`}
                            >
                              {pb.label}
                            </Badge>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Role select */}
          <div className="space-y-1.5">
            <Label>Posição no funil</Label>
            <Select
              value={role}
              onValueChange={(v) =>
                setRole(v as LotOfferRole)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedOfferId}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
