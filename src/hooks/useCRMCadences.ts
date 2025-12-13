import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CRMCadence {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_on: 'stage_change' | 'new_contact' | 'manual';
  trigger_stage_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMCadenceStep {
  id: string;
  cadence_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  activity_type: string;
  title: string;
  description: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface CRMCadenceWithSteps extends CRMCadence {
  steps: CRMCadenceStep[];
}

export function useCRMCadences() {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cadences = [], isLoading } = useQuery({
    queryKey: ['crm-cadences', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('crm_cadences')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CRMCadence[];
    },
    enabled: !!currentProject?.id,
  });

  const createCadence = useMutation({
    mutationFn: async (input: { 
      name: string; 
      description?: string; 
      trigger_on: string; 
      trigger_stage_id?: string;
      steps: Omit<CRMCadenceStep, 'id' | 'cadence_id' | 'created_at' | 'updated_at'>[];
    }) => {
      if (!currentProject?.id) throw new Error('No project selected');

      // Create cadence
      const { data: cadence, error: cadenceError } = await supabase
        .from('crm_cadences')
        .insert({
          project_id: currentProject.id,
          name: input.name,
          description: input.description,
          trigger_on: input.trigger_on,
          trigger_stage_id: input.trigger_stage_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (cadenceError) throw cadenceError;

      // Create steps
      if (input.steps.length > 0) {
        const stepsToInsert = input.steps.map((step, index) => ({
          ...step,
          cadence_id: cadence.id,
          step_order: index,
        }));

        const { error: stepsError } = await supabase
          .from('crm_cadence_steps')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }

      return cadence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadences', currentProject?.id] });
      toast.success('Cadência criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating cadence:', error);
      toast.error('Erro ao criar cadência');
    },
  });

  const updateCadence = useMutation({
    mutationFn: async (input: Partial<CRMCadence> & { id: string }) => {
      const { error } = await supabase
        .from('crm_cadences')
        .update(input)
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadences', currentProject?.id] });
    },
  });

  const deleteCadence = useMutation({
    mutationFn: async (cadenceId: string) => {
      const { error } = await supabase
        .from('crm_cadences')
        .delete()
        .eq('id', cadenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadences', currentProject?.id] });
      toast.success('Cadência removida');
    },
  });

  const toggleCadence = useMutation({
    mutationFn: async ({ cadenceId, isActive }: { cadenceId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('crm_cadences')
        .update({ is_active: isActive })
        .eq('id', cadenceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadences', currentProject?.id] });
    },
  });

  return {
    cadences,
    isLoading,
    createCadence,
    updateCadence,
    deleteCadence,
    toggleCadence,
  };
}

export function useCadenceSteps(cadenceId?: string) {
  const queryClient = useQueryClient();

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['crm-cadence-steps', cadenceId],
    queryFn: async () => {
      if (!cadenceId) return [];

      const { data, error } = await supabase
        .from('crm_cadence_steps')
        .select('*')
        .eq('cadence_id', cadenceId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data as CRMCadenceStep[];
    },
    enabled: !!cadenceId,
  });

  const addStep = useMutation({
    mutationFn: async (step: Omit<CRMCadenceStep, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase.from('crm_cadence_steps').insert(step);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-steps', cadenceId] });
    },
  });

  const updateStep = useMutation({
    mutationFn: async (step: Partial<CRMCadenceStep> & { id: string }) => {
      const { error } = await supabase
        .from('crm_cadence_steps')
        .update(step)
        .eq('id', step.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-steps', cadenceId] });
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('crm_cadence_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-cadence-steps', cadenceId] });
    },
  });

  return {
    steps,
    isLoading,
    addStep,
    updateStep,
    deleteStep,
  };
}
