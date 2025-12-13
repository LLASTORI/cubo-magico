import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export interface PipelineStage {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

export function usePipelineStages() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: stages = [], isLoading, error } = useQuery({
    queryKey: ['pipeline-stages', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!currentProject?.id,
  });

  const createDefaultStages = useMutation({
    mutationFn: async () => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { error } = await supabase.rpc('create_default_pipeline_stages', {
        _project_id: currentProject.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', currentProject?.id] });
      toast.success('Etapas do pipeline criadas com sucesso');
    },
    onError: (error) => {
      console.error('Error creating default stages:', error);
      toast.error('Erro ao criar etapas do pipeline');
    },
  });

  const updateStage = useMutation({
    mutationFn: async (stage: Partial<PipelineStage> & { id: string }) => {
      const { error } = await supabase
        .from('crm_pipeline_stages')
        .update(stage)
        .eq('id', stage.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', currentProject?.id] });
    },
  });

  const createStage = useMutation({
    mutationFn: async (stage: Omit<PipelineStage, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('crm_pipeline_stages').insert(stage);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', currentProject?.id] });
      toast.success('Etapa criada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar etapa');
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await supabase.from('crm_pipeline_stages').delete().eq('id', stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages', currentProject?.id] });
      toast.success('Etapa removida com sucesso');
    },
    onError: () => {
      toast.error('Erro ao remover etapa');
    },
  });

  return {
    stages,
    isLoading,
    error,
    createDefaultStages,
    updateStage,
    createStage,
    deleteStage,
  };
}
