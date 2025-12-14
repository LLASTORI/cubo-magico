import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export interface RecoveryStage {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  is_initial: boolean;
  is_recovered: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export function useRecoveryStages() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading, refetch } = useQuery({
    queryKey: ['recovery-stages', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('crm_recovery_stages')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as RecoveryStage[];
    },
    enabled: !!currentProject?.id,
  });

  const initializeStages = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { error } = await supabase.rpc('create_default_recovery_stages', {
        _project_id: currentProject.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-stages', currentProject?.id] });
      toast.success('Etapas de recuperação criadas com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar etapas: ' + error.message);
    },
  });

  const createStage = useMutation({
    mutationFn: async (stage: Partial<RecoveryStage>) => {
      if (!currentProject?.id) throw new Error('No project selected');

      // Get the next position
      const maxPosition = stages.reduce((max, s) => Math.max(max, s.position), -1);

      const { data, error } = await supabase
        .from('crm_recovery_stages')
        .insert({
          project_id: currentProject.id,
          name: stage.name || 'Nova Etapa',
          color: stage.color || '#6366f1',
          position: maxPosition + 1,
          is_initial: stage.is_initial || false,
          is_recovered: stage.is_recovered || false,
          is_lost: stage.is_lost || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-stages', currentProject?.id] });
      toast.success('Etapa criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar etapa: ' + error.message);
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecoveryStage> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_recovery_stages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-stages', currentProject?.id] });
      toast.success('Etapa atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar etapa: ' + error.message);
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_recovery_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-stages', currentProject?.id] });
      toast.success('Etapa removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover etapa: ' + error.message);
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Update positions for all stages
      const updates = orderedIds.map((id, index) => ({
        id,
        position: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('crm_recovery_stages')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recovery-stages', currentProject?.id] });
    },
    onError: (error) => {
      toast.error('Erro ao reordenar etapas: ' + error.message);
    },
  });

  return {
    stages,
    isLoading,
    refetch,
    initializeStages,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
  };
}
