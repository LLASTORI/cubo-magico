import { useState } from 'react';
import { Copy, Plus, Tag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LaunchLot,
  LaunchLotWithOffers,
  LotOfferRole,
  LotStatus,
} from '@/types/launch-lots';
import { AddOfferToLotDialog } from './AddOfferToLotDialog';
import { isoToDatetimeLocal, datetimeLocalToIso } from '@/lib/datetimeHelpers';

interface OfferMapping {
  id: string;
  nome_oferta: string | null;
  nome_produto: string;
  codigo_oferta: string | null;
  tipo_posicao: string | null;
  valor: number | null;
}

interface Props {
  lot: LaunchLotWithOffers;
  offerMappings: OfferMapping[];
  onCopy: (lotId: string) => void;
  onDelete: (lotId: string) => void;
  onUpdate: (data: Partial<LaunchLot> & { id: string }) => void;
  onAddOffer: (data: {
    lotId: string;
    offerMappingId: string;
    role: LotOfferRole;
  }) => void;
  onRemoveOffer: (lotOfferId: string) => void;
}

const STATUS_CONFIG: Record<
  LotStatus,
  { label: string; className: string }
> = {
  planned: {
    label: 'Planejado',
    className:
      'border-muted-foreground/50 text-muted-foreground bg-transparent',
  },
  active: {
    label: 'Ativo',
    className: 'bg-green-500 hover:bg-green-500 text-white border-0',
  },
  finished: {
    label: 'Finalizado',
    className:
      'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
};

function getRoleConfig(role: string): { label: string; className: string } {
  if (role === 'front') {
    return { label: 'Principal', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
  }
  if (role.startsWith('bump_')) {
    return { label: `OB${role.slice(5)}`, className: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
  }
  if (role.startsWith('upsell_')) {
    return { label: `US${role.slice(7)}`, className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
  }
  if (role.startsWith('downsell_')) {
    return { label: `DS${role.slice(9)}`, className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
  }
  return { label: role, className: 'bg-muted text-muted-foreground' };
}

/**
 * Convert an ISO timestamptz string to a datetime-local input value
 * in the user's local timezone (São Paulo UTC-3).
 */
// isoToDatetimeLocal and datetimeLocalToIso imported from @/lib/datetimeHelpers

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export const LaunchLotCard = ({
  lot,
  offerMappings,
  onCopy,
  onDelete,
  onUpdate,
  onAddOffer,
  onRemoveOffer,
}: Props) => {
  const [addOfferOpen, setAddOfferOpen] = useState(false);

  const sc = STATUS_CONFIG[lot.status];
  const existingOfferIds = lot.offers.map(
    (o) => o.offer_mapping_id
  );

  const handleDateChange = (
    field: 'start_datetime' | 'end_datetime',
    value: string
  ) => {
    if (!value) {
      if (field === 'end_datetime') {
        onUpdate({ id: lot.id, [field]: null });
      }
      return;
    }
    onUpdate({ id: lot.id, [field]: datetimeLocalToIso(value) });
  };

  return (
    <>
      <div className="p-4 rounded-xl border border-border bg-card space-y-3 hover:border-cyan-500/40 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm truncate">
              {lot.name}
            </span>
            <Badge
              variant="outline"
              className="text-xs font-mono shrink-0"
            >
              #{lot.lot_number}
            </Badge>
            <Select
              value={lot.status}
              onValueChange={(v) => onUpdate({ id: lot.id, status: v as LotStatus })}
            >
              <SelectTrigger className={`h-6 w-auto text-xs border px-2 gap-1 ${sc.className}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planejado</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="finished">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onCopy(lot.id)}
              title="Copiar lote"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-400 hover:text-red-300"
              onClick={() => onDelete(lot.id)}
              title="Remover lote"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Datetime inputs */}
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs text-muted-foreground">
              Início
            </Label>
            <Input
              type="datetime-local"
              className="text-sm h-8"
              value={isoToDatetimeLocal(lot.start_datetime)}
              onChange={(e) =>
                handleDateChange(
                  'start_datetime',
                  e.target.value
                )
              }
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs text-muted-foreground">
              Fim
            </Label>
            <Input
              type="datetime-local"
              className="text-sm h-8"
              value={isoToDatetimeLocal(lot.end_datetime)}
              onChange={(e) =>
                handleDateChange(
                  'end_datetime',
                  e.target.value
                )
              }
            />
          </div>
        </div>

        {/* Offers list */}
        <div className="space-y-1">
          {lot.offers.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              Nenhuma oferta vinculada
            </p>
          ) : (
            lot.offers.map((offer) => {
              const rc = getRoleConfig(offer.role);
              return (
                <div
                  key={offer.id}
                  className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 shrink-0 ${rc.className}`}
                    >
                      {rc.label}
                    </Badge>
                    <span className="text-sm truncate font-medium">
                      {offer.nome_produto || '—'}
                    </span>
                    {offer.nome_oferta && offer.nome_oferta !== offer.nome_produto && (
                      <span className="text-xs text-muted-foreground truncate">
                        {offer.nome_oferta}
                      </span>
                    )}
                    {offer.codigo_oferta && (
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        {offer.codigo_oferta}
                      </span>
                    )}
                    {offer.valor != null && offer.valor > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatCurrency(offer.valor)}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => onRemoveOffer(offer.id)}
                    title="Remover oferta"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Add offer button */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setAddOfferOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Oferta
        </Button>
      </div>

      <AddOfferToLotDialog
        open={addOfferOpen}
        onOpenChange={setAddOfferOpen}
        offerMappings={offerMappings}
        existingOfferIds={existingOfferIds}
        onAdd={(offerMappingId, role) => {
          onAddOffer({
            lotId: lot.id,
            offerMappingId,
            role,
          });
          setAddOfferOpen(false);
        }}
      />
    </>
  );
};
