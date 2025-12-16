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

  // Failover: obter próximo número disponível
  const getNextAvailableNumber = (): WhatsAppNumber | undefined => {
    if (!numbers || numbers.length === 0) return undefined;
    
    // Ordenar por prioridade
    const sortedNumbers = [...numbers].sort((a, b) => a.priority - b.priority);
    
    // Primeiro: buscar número conectado e ativo
    const connected = sortedNumbers.find(
      n => n.instance?.status === 'connected' && n.status === 'active'
    );
    if (connected) return connected;
    
    // Segundo: buscar número ativo (pode estar desconectado temporariamente)
    const active = sortedNumbers.find(n => n.status === 'active');
    if (active) return active;
    
    // Terceiro: buscar número pendente (reserva)
    const pending = sortedNumbers.find(n => n.status === 'pending');
    return pending;
  };

  // Promover número reserva para ativo
  const promoteNumber = useMutation({
    mutationFn: async (numberId: string) => {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .update({ status: 'active' })
        .eq('id', numberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers', projectId] });
      toast({
        title: 'Número promovido',
        description: 'O número reserva foi ativado.',
      });
    },
  });

  // Desativar número com problema
  const disableNumber = useMutation({
    mutationFn: async (numberId: string) => {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .update({ status: 'offline' })
        .eq('id', numberId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers', projectId] });
      toast({
        title: 'Número desativado',
        description: 'O número foi marcado como offline.',
        variant: 'destructive',
      });
    },
  });

  // Reordenar prioridades
  const reorderPriorities = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('whatsapp_numbers')
          .update({ priority: index })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-numbers', projectId] });
      toast({
        title: 'Prioridades atualizadas',
        description: 'A ordem dos números foi salva.',
      });
    },
  });

  return {
    numbers,
    isLoading,
    error,
    createNumber: createNumber.mutate,
    updateNumber: updateNumber.mutate,
    deleteNumber: deleteNumber.mutate,
    promoteNumber: promoteNumber.mutate,
    disableNumber: disableNumber.mutate,
    reorderPriorities: reorderPriorities.mutate,
    isCreating: createNumber.isPending,
    isUpdating: updateNumber.isPending,
    isDeleting: deleteNumber.isPending,
    getPrimaryNumber,
    getActiveNumbers,
    getNextAvailableNumber,
  };
}
