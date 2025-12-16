import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppNumber {
  id: string;
  project_id: string;
  phone_number: string;
  label: string;
  priority: number;
  status: 'pending' | 'active' | 'offline' | 'banned';
  provider: string;
  webhook_secret: string | null;
  created_at: string;
  updated_at: string;
  instance?: WhatsAppInstance | null;
}

export interface WhatsAppInstance {
  id: string;
  whatsapp_number_id: string;
  instance_name: string;
  instance_key: string | null;
  api_url: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'qr_pending';
  qr_code: string | null;
  qr_expires_at: string | null;
  last_heartbeat: string | null;
  error_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWhatsAppNumberInput {
  phone_number: string;
  label?: string;
  priority?: number;
}

export interface UpdateWhatsAppNumberInput {
  id: string;
  phone_number?: string;
  label?: string;
  priority?: number;
  status?: WhatsAppNumber['status'];
}

export function useWhatsAppNumbers() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: numbers, isLoading, error } = useQuery({
    queryKey: ['whatsapp-numbers', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select(`
          *,
          instance:whatsapp_instances(*)
        `)
        .eq('project_id', projectId)
        .order('priority', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(num => ({
        ...num,
        instance: num.instance?.[0] || null,
      })) as WhatsAppNumber[];
    },
    enabled: !!projectId,
  });

  const createNumber = useMutation({
    mutationFn: async (input: CreateWhatsAppNumberInput) => {
      if (!projectId) throw new Error('Projeto não selecionado');

      // Determinar próxima prioridade
      const nextPriority = input.priority ?? (numbers?.length ?? 0);

      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .insert({
          project_id: projectId,
          phone_number: input.phone_number,
          label: input.label || 'Principal',
          priority: nextPriority,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers', projectId] });
      toast({
        title: 'Número adicionado',
        description: 'O número WhatsApp foi cadastrado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar número',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const updateNumber = useMutation({
    mutationFn: async (input: UpdateWhatsAppNumberInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers', projectId] });
      toast({
        title: 'Número atualizado',
        description: 'As informações foram salvas.',
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

  const deleteNumber = useMutation({
    mutationFn: async (numberId: string) => {
      const { error } = await supabase
        .from('whatsapp_numbers')
        .delete()
        .eq('id', numberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers', projectId] });
      toast({
        title: 'Número removido',
        description: 'O número foi excluído com sucesso.',
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

  // Helpers
  const getPrimaryNumber = (): WhatsAppNumber | undefined => {
    return numbers?.find(n => n.priority === 0 && n.status === 'active') 
      || numbers?.find(n => n.status === 'active');
  };

  const getActiveNumbers = (): WhatsAppNumber[] => {
    return numbers?.filter(n => n.status === 'active') || [];
  };

  return {
    numbers,
    isLoading,
    error,
    createNumber: createNumber.mutate,
    updateNumber: updateNumber.mutate,
    deleteNumber: deleteNumber.mutate,
    isCreating: createNumber.isPending,
    isUpdating: updateNumber.isPending,
    isDeleting: deleteNumber.isPending,
    getPrimaryNumber,
    getActiveNumbers,
  };
}
