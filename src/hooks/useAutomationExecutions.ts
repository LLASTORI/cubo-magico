import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export interface AutomationExecution {
  id: string;
  flow_id: string;
  contact_id: string;
  conversation_id: string | null;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  current_node_id: string | null;
  execution_log: any[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  next_execution_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  flow?: {
    id: string;
    name: string;
    trigger_type: string;
  };
  contact?: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

export function useAutomationExecutions(flowId?: string) {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const executionsQuery = useQuery({
    queryKey: ['automation-executions', currentProject?.id, flowId],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      let query = supabase
        .from('automation_executions')
        .select(`
          *,
          flow:automation_flows!flow_id(id, name, trigger_type),
          contact:crm_contacts!contact_id(id, name, email, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (flowId) {
        query = query.eq('flow_id', flowId);
      } else {
        // Filter by project through the flow
        query = query.eq('flow.project_id', currentProject.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching executions:', error);
        throw error;
      }

      return (data || []) as AutomationExecution[];
    },
    enabled: !!currentProject?.id,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const statsQuery = useQuery({
    queryKey: ['automation-stats', currentProject?.id, flowId],
    queryFn: async () => {
      if (!currentProject?.id) return null;

      let query = supabase
        .from('automation_executions')
        .select('status, flow:automation_flows!inner(project_id)');

      if (flowId) {
        query = query.eq('flow_id', flowId);
      } else {
        query = query.eq('flow.project_id', currentProject.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stats:', error);
        return null;
      }

      const stats = {
        total: data?.length || 0,
        running: data?.filter(e => e.status === 'running').length || 0,
        completed: data?.filter(e => e.status === 'completed').length || 0,
        failed: data?.filter(e => e.status === 'failed').length || 0,
        paused: data?.filter(e => e.status === 'paused').length || 0,
      };

      return stats;
    },
    enabled: !!currentProject?.id,
  });

  const cancelExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from('automation_executions')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Execução cancelada' });
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao cancelar', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const retryExecution = useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from('automation_executions')
        .update({ 
          status: 'running',
          error_message: null,
          completed_at: null,
        })
        .eq('id', executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Execução reiniciada' });
      queryClient.invalidateQueries({ queryKey: ['automation-executions'] });
      queryClient.invalidateQueries({ queryKey: ['automation-stats'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao reiniciar', 
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    executions: executionsQuery.data || [],
    stats: statsQuery.data,
    isLoading: executionsQuery.isLoading,
    cancelExecution,
    retryExecution,
  };
}
