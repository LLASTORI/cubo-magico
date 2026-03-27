import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLaunchLots } from '@/hooks/useLaunchLots';
import { LaunchLotCard } from './LaunchLotCard';

interface OfferMapping {
  id: string;
  nome_oferta: string | null;
  nome_produto: string;
  codigo_oferta: string | null;
  tipo_posicao: string | null;
  valor: number | null;
}

interface Props {
  projectId: string;
  funnelId: string;
  editionId: string;
  offerMappings: OfferMapping[];
}

export const LaunchLotsSection = ({
  projectId,
  funnelId,
  editionId,
  offerMappings,
}: Props) => {
  const {
    lots,
    isLoading,
    createLot,
    copyLot,
    updateLot,
    deleteLot,
    addOfferToLot,
    removeOfferFromLot,
  } = useLaunchLots(editionId);

  const handleCreateLot = () => {
    createLot.mutate({
      edition_id: editionId,
      funnel_id: funnelId,
      project_id: projectId,
      name: '',
      start_datetime: new Date().toISOString(),
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">
          Lotes da Edição
        </CardTitle>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={handleCreateLot}
          disabled={createLot.isPending}
        >
          <Plus className="w-4 h-4" />
          Novo Lote
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Carregando...
          </div>
        ) : lots.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground border rounded-lg bg-muted/30">
            Nenhum lote cadastrado ainda.
            <br />
            Clique em "Novo Lote" para definir faixas de preço.
          </div>
        ) : (
          lots.map((lot) => (
            <LaunchLotCard
              key={lot.id}
              lot={lot}
              offerMappings={offerMappings}
              onCopy={(lotId) => copyLot.mutate(lotId)}
              onDelete={(lotId) => deleteLot.mutate(lotId)}
              onUpdate={(data) => updateLot.mutate(data)}
              onAddOffer={(data) => addOfferToLot.mutate(data)}
              onRemoveOffer={(id) => removeOfferFromLot.mutate(id)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};
