import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LaunchLot,
  LaunchLotInsert,
  LaunchLotOffer,
  LaunchLotWithOffers,
  LotOfferRole,
} from '@/types/launch-lots';

export const useLaunchLots = (editionId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: lots = [], isLoading } = useQuery({
    queryKey: ['launch-lots', editionId],
    queryFn: async () => {
      if (!editionId) return [];

      const { data: lotsData, error } = await supabase
        .from('launch_lots')
        .select('*')
        .eq('edition_id', editionId)
        .order('lot_number');
      if (error) throw error;

      if (!lotsData?.length) return [];

      const lotIds = lotsData.map(l => l.id);
      const { data: offersData, error: offersError } = await supabase
        .from('launch_lot_offers')
        .select(`
          id,
          lot_id,
          offer_mapping_id,
          role,
          created_at,
          offer_mappings (
            nome_oferta,
            codigo_oferta,
            nome_produto,
            valor,
            tipo_posicao
          )
        `)
        .in('lot_id', lotIds);
      if (offersError) throw offersError;

      const offersByLot = new Map<string, LaunchLotOffer[]>();
      for (const o of (offersData || [])) {
        const om = (o as any).offer_mappings;
        const offer: LaunchLotOffer = {
          id: o.id,
          lot_id: o.lot_id,
          offer_mapping_id: o.offer_mapping_id,
          role: o.role as LotOfferRole,
          created_at: o.created_at,
          nome_oferta: om?.nome_oferta ?? null,
          codigo_oferta: om?.codigo_oferta ?? null,
          nome_produto: om?.nome_produto ?? '',
          valor: om?.valor ? Number(om.valor) : null,
          tipo_posicao: om?.tipo_posicao ?? null,
        };
        const existing = offersByLot.get(o.lot_id) || [];
        existing.push(offer);
        offersByLot.set(o.lot_id, existing);
      }

      return lotsData.map(lot => ({
        ...lot,
        offers: offersByLot.get(lot.id) || [],
      })) as LaunchLotWithOffers[];
    },
    enabled: !!editionId,
  });

  const createLot = useMutation({
    mutationFn: async (input: Omit<LaunchLotInsert, 'lot_number'>) => {
      const { data: existing } = await supabase
        .from('launch_lots')
        .select('lot_number')
        .eq('edition_id', input.edition_id)
        .order('lot_number', { ascending: false })
        .limit(1);

      const nextNumber = existing?.length ? existing[0].lot_number + 1 : 1;

      const { data, error } = await supabase
        .from('launch_lots')
        .insert({
          ...input,
          lot_number: nextNumber,
          name: input.name || `Lote ${nextNumber}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data as LaunchLot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-lots', editionId] });
      toast.success('Lote criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar lote: ' + error.message);
    },
  });

  const copyLot = useMutation({
    mutationFn: async (sourceLotId: string) => {
      const sourceLot = lots.find(l => l.id === sourceLotId);
      if (!sourceLot) throw new Error('Lote não encontrado');

      const { data: existing } = await supabase
        .from('launch_lots')
        .select('lot_number')
        .eq('edition_id', sourceLot.edition_id)
        .order('lot_number', { ascending: false })
        .limit(1);

      const nextNumber = existing?.length ? existing[0].lot_number + 1 : 1;

      const { data: newLot, error } = await supabase
        .from('launch_lots')
        .insert({
          edition_id: sourceLot.edition_id,
          funnel_id: sourceLot.funnel_id,
          project_id: sourceLot.project_id,
          lot_number: nextNumber,
          name: `Lote ${nextNumber}`,
          start_datetime: sourceLot.end_datetime || sourceLot.start_datetime,
          status: 'planned' as const,
          notes: sourceLot.notes,
        })
        .select()
        .single();
      if (error) throw error;

      if (sourceLot.offers.length > 0) {
        const offersToInsert = sourceLot.offers.map(o => ({
          lot_id: newLot.id,
          offer_mapping_id: o.offer_mapping_id,
          role: o.role,
        }));
        await supabase.from('launch_lot_offers').insert(offersToInsert);
      }

      return newLot as LaunchLot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-lots', editionId] });
      toast.success('Lote copiado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao copiar lote: ' + error.message);
    },
  });

  const updateLot = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaunchLot> & { id: string }) => {
      const { data, error } = await supabase
        .from('launch_lots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LaunchLot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-lots', editionId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar lote: ' + error.message);
    },
  });

  const deleteLot = useMutation({
    mutationFn: async (lotId: string) => {
      const { error } = await supabase
        .from('launch_lots')
        .delete()
        .eq('id', lotId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-lots', editionId] });
      toast.success('Lote removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover lote: ' + error.message);
    },
  });

  const addOfferToLot = useMutation({
    mutationFn: async ({
      lotId,
      offerMappingId,
      role,
    }: {
      lotId: string;
      offerMappingId: string;
      role: LotOfferRole;
    }) => {
      const { data, error } = await supabase
        .from('launch_lot_offers')
        .insert({ lot_id: lotId, offer_mapping_id: offerMappingId, role })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-lots', editionId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar oferta: ' + error.message);
    },
  });

  const removeOfferFromLot = useMutation({
    mutationFn: async (lotOfferId: string) => {
      const { error } = await supabase
        .from('launch_lot_offers')
        .delete()
        .eq('id', lotOfferId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-lots', editionId] });
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover oferta: ' + error.message);
    },
  });

  return {
    lots,
    isLoading,
    createLot,
    copyLot,
    updateLot,
    deleteLot,
    addOfferToLot,
    removeOfferFromLot,
  };
};
