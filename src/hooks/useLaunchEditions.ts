import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LaunchEdition, LaunchEditionInsert, LaunchEditionWithPhases } from '@/types/launch-editions';
import { LaunchPhase } from '@/hooks/useLaunchPhases';

const PHASES_COPYABLE_FIELDS = [
  'phase_type',
  'name',
  'primary_metric',
  'campaign_name_pattern',
  'notes',
  'phase_order',
  'is_active',
] as const;

const FASES_LANCAMENTO_PAGO = [
  {
    phase_type: 'captacao',
    name: 'Ingressos',
    primary_metric: 'cpa',
    phase_order: 1,
    notes: 'Venda de ingressos por lotes. Acompanhar passing diário vs meta.',
  },
  {
    phase_type: 'aquecimento',
    name: 'Comparecimento',
    primary_metric: 'show_rate',
    phase_order: 2,
    notes: 'Garantir presença no evento. Meta: 70%+ de show rate.',
  },
  {
    phase_type: 'vendas',
    name: 'Evento',
    primary_metric: 'conversao',
    phase_order: 3,
    notes: 'Evento ao vivo com pitch. Dias 1 e 2.',
  },
  {
    phase_type: 'vendas',
    name: 'Vendas',
    primary_metric: 'roas',
    phase_order: 4,
    notes: 'Carrinho aberto pós-evento. OBs, upsell, downsell.',
  },
] as const;

function calcPhaseDatetime(base: string | null, offsetDays: number): string | null {
  if (!base) return null;
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
}

export const useLaunchEditions = (projectId: string | undefined, funnelId?: string) => {
  const queryClient = useQueryClient();

  // List all editions for a funnel, ordered by edition_number
  const { data: editions = [], isLoading } = useQuery({
    queryKey: ['launch-editions', projectId, funnelId],
    queryFn: async () => {
      if (!projectId || !funnelId) return [];
      const { data, error } = await supabase
        .from('launch_editions')
        .select('*')
        .eq('project_id', projectId)
        .eq('funnel_id', funnelId)
        .order('edition_number');
      if (error) throw error;
      return data as LaunchEdition[];
    },
    enabled: !!projectId && !!funnelId,
  });

  // Fetch a single edition with its phases
  const useEdition = (editionId: string | undefined) =>
    useQuery({
      queryKey: ['launch-edition', editionId],
      queryFn: async () => {
        if (!editionId) return null;
        const [editionResult, phasesResult] = await Promise.all([
          supabase.from('launch_editions').select('*').eq('id', editionId).single(),
          supabase.from('launch_phases').select('*').eq('edition_id', editionId).order('phase_order'),
        ]);
        if (editionResult.error) throw editionResult.error;
        return {
          ...editionResult.data,
          phases: (phasesResult.data || []) as LaunchPhase[],
        } as LaunchEditionWithPhases;
      },
      enabled: !!editionId,
    });

  // Create edition (auto edition_number + copy phases from previous)
  const createEdition = useMutation({
    mutationFn: async (input: Omit<LaunchEditionInsert, 'edition_number'>) => {
      if (!projectId || !funnelId) throw new Error('project_id e funnel_id obrigatórios');

      // Calculate next edition_number
      const { data: existing } = await supabase
        .from('launch_editions')
        .select('edition_number')
        .eq('funnel_id', funnelId)
        .order('edition_number', { ascending: false })
        .limit(1);

      const nextNumber = existing?.length ? existing[0].edition_number + 1 : 1;

      const { data: newEdition, error } = await supabase
        .from('launch_editions')
        .insert({ ...input, project_id: projectId, funnel_id: funnelId, edition_number: nextNumber })
        .select()
        .single();
      if (error) throw error;

      // Primeira edição → criar 4 fases padrão de lançamento pago
      if (!existing?.length) {
        const { event_datetime, start_datetime, end_datetime } = input as LaunchEditionInsert & {
          event_datetime?: string | null;
          start_datetime?: string | null;
          end_datetime?: string | null;
        };
        const phaseDates = [
          { start_datetime: start_datetime ?? null, end_datetime: calcPhaseDatetime(event_datetime ?? null, -1) },
          { start_datetime: calcPhaseDatetime(event_datetime ?? null, -7), end_datetime: event_datetime ?? null },
          { start_datetime: event_datetime ?? null, end_datetime: calcPhaseDatetime(event_datetime ?? null, 1) },
          { start_datetime: calcPhaseDatetime(event_datetime ?? null, 1), end_datetime: end_datetime ?? null },
        ];

        const phasesToInsert = FASES_LANCAMENTO_PAGO.map((fase, i) => ({
          ...fase,
          funnel_id: funnelId,
          project_id: projectId,
          edition_id: newEdition.id,
          is_active: true,
          campaign_name_pattern: null,
          ...phaseDates[i],
        }));

        const { error: phasesError } = await supabase
          .from('launch_phases')
          .insert(phasesToInsert);

        if (phasesError) {
          console.error('[useLaunchEditions] Erro ao criar fases padrão:', phasesError);
        }
      }

      // Copy phases from most recent previous edition (if any)
      if (existing?.length) {
        const prevEditionNumber = existing[0].edition_number;

        // Get the id of the previous edition
        const { data: prevEditions } = await supabase
          .from('launch_editions')
          .select('id')
          .eq('funnel_id', funnelId)
          .eq('edition_number', prevEditionNumber)
          .single();

        if (prevEditions?.id) {
          const { data: prevPhases } = await supabase
            .from('launch_phases')
            .select('*')
            .eq('edition_id', prevEditions.id)
            .order('phase_order');

          if (prevPhases?.length) {
            const phasesToInsert = prevPhases.map((p: LaunchPhase) => ({
              funnel_id: funnelId,
              project_id: projectId,
              edition_id: newEdition.id,
              phase_type: p.phase_type,
              name: p.name,
              primary_metric: p.primary_metric,
              campaign_name_pattern: p.campaign_name_pattern,
              notes: p.notes,
              phase_order: p.phase_order,
              is_active: p.is_active,
              // start_datetime / end_datetime are NOT copied — user defines new dates
            }));

            await supabase.from('launch_phases').insert(phasesToInsert);
          }
        }
      }

      return newEdition as LaunchEdition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['launch-editions', projectId, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['launch-phases'] });
      toast.success(`Edição "${data.name}" criada`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar edição: ' + error.message);
    },
  });

  // Update edition
  const updateEdition = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LaunchEdition> & { id: string }) => {
      const { data, error } = await supabase
        .from('launch_editions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LaunchEdition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['launch-editions', projectId, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['launch-edition', data.id] });
      toast.success('Edição atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar edição: ' + error.message);
    },
  });

  // Delete edition (CASCADE removes its phases)
  const deleteEdition = useMutation({
    mutationFn: async (editionId: string) => {
      const { error } = await supabase
        .from('launch_editions')
        .delete()
        .eq('id', editionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launch-editions', projectId, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['launch-phases'] });
      toast.success('Edição removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover edição: ' + error.message);
    },
  });

  // Clone edition: create new edition + copy phases from a specific source
  const cloneEdition = useMutation({
    mutationFn: async ({
      sourceEditionId,
      ...input
    }: Omit<LaunchEditionInsert, 'edition_number'> & { sourceEditionId: string }) => {
      if (!projectId || !funnelId) throw new Error('project_id e funnel_id obrigatórios');

      // Next edition_number
      const { data: existing } = await supabase
        .from('launch_editions')
        .select('edition_number')
        .eq('funnel_id', funnelId)
        .order('edition_number', { ascending: false })
        .limit(1);

      const nextNumber = existing?.length ? existing[0].edition_number + 1 : 1;

      const { data: newEdition, error } = await supabase
        .from('launch_editions')
        .insert({
          ...input,
          project_id: projectId,
          funnel_id: funnelId,
          edition_number: nextNumber,
        })
        .select()
        .single();
      if (error) throw error;

      // Copy phases from source edition (without dates)
      const { data: sourcePhases } = await supabase
        .from('launch_phases')
        .select('*')
        .eq('edition_id', sourceEditionId)
        .order('phase_order');

      if (sourcePhases?.length) {
        const phasesToInsert = sourcePhases.map((p: LaunchPhase) => ({
          funnel_id: funnelId,
          project_id: projectId,
          edition_id: newEdition.id,
          phase_type: p.phase_type,
          name: p.name,
          primary_metric: p.primary_metric,
          campaign_name_pattern: p.campaign_name_pattern,
          notes: p.notes,
          phase_order: p.phase_order,
          is_active: p.is_active,
        }));
        await supabase.from('launch_phases').insert(phasesToInsert);
      }

      return newEdition as LaunchEdition;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['launch-editions', projectId, funnelId] });
      queryClient.invalidateQueries({ queryKey: ['launch-phases'] });
      toast.success(`Edição "${data.name}" clonada`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao clonar edição: ' + error.message);
    },
  });

  return {
    editions,
    isLoading,
    useEdition,
    createEdition,
    updateEdition,
    deleteEdition,
    cloneEdition,
  };
};

// Standalone hooks para uso em componentes fora do contexto do LaunchConfigDialog
export const useEditions = (projectId: string, funnelId: string) => {
  const { editions, isLoading } = useLaunchEditions(projectId, funnelId);
  return { editions, isLoading };
};

export const useEdition = (editionId: string | undefined) =>
  useQuery({
    queryKey: ['launch-edition', editionId],
    queryFn: async () => {
      if (!editionId) return null;
      const [editionResult, phasesResult] = await Promise.all([
        supabase.from('launch_editions').select('*').eq('id', editionId).single(),
        supabase.from('launch_phases').select('*').eq('edition_id', editionId).order('phase_order'),
      ]);
      if (editionResult.error) throw editionResult.error;
      return {
        ...editionResult.data,
        phases: (phasesResult.data || []) as LaunchPhase[],
      } as LaunchEditionWithPhases;
    },
    enabled: !!editionId,
  });
