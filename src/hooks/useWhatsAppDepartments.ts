import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppDepartment {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateDepartmentInput {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export function useWhatsAppDepartments() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: departments, isLoading, error } = useQuery({
    queryKey: ['whatsapp-departments', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('whatsapp_departments')
        .select('*')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      return data as WhatsAppDepartment[];
    },
    enabled: !!projectId,
  });

  const createDepartment = useMutation({
    mutationFn: async (input: CreateDepartmentInput) => {
      if (!projectId) throw new Error('Projeto não selecionado');

      const { data, error } = await supabase
        .from('whatsapp_departments')
        .insert({
          project_id: projectId,
          name: input.name,
          description: input.description || null,
          color: input.color || '#6366f1',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-departments', projectId] });
      toast({
        title: 'Departamento criado',
        description: 'O departamento foi criado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar departamento',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async (input: UpdateDepartmentInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('whatsapp_departments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-departments', projectId] });
      toast({
        title: 'Departamento atualizado',
        description: 'As alterações foram salvas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (departmentId: string) => {
      const { error } = await supabase
        .from('whatsapp_departments')
        .delete()
        .eq('id', departmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-departments', projectId] });
      toast({
        title: 'Departamento removido',
        description: 'O departamento foi excluído.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    departments,
    isLoading,
    error,
    createDepartment: createDepartment.mutate,
    updateDepartment: updateDepartment.mutate,
    deleteDepartment: deleteDepartment.mutate,
    isCreating: createDepartment.isPending,
    isUpdating: updateDepartment.isPending,
    isDeleting: deleteDepartment.isPending,
  };
}
