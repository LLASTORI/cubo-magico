import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';

export type AgentStatus = 'online' | 'away' | 'offline' | 'busy';

export interface WhatsAppAgent {
  id: string;
  project_id: string;
  user_id: string;
  display_name: string | null;
  status: AgentStatus;
  max_concurrent_chats: number;
  is_supervisor: boolean;
  is_active: boolean;
  work_hours: Record<string, { start: string; end: string }> | null;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  departments?: { id: string; name: string; color: string; is_primary: boolean }[];
  active_chats_count?: number;
}

export interface CreateAgentInput {
  user_id: string;
  display_name?: string;
  max_concurrent_chats?: number;
  is_supervisor?: boolean;
  department_ids?: string[];
}

export interface UpdateAgentInput {
  id: string;
  display_name?: string;
  status?: AgentStatus;
  max_concurrent_chats?: number;
  is_supervisor?: boolean;
  is_active?: boolean;
  work_hours?: Record<string, { start: string; end: string }>;
  department_ids?: string[];
}

export function useWhatsAppAgents() {
  const { currentProject } = useProject();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const projectId = currentProject?.id;

  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['whatsapp-agents', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      // Get agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('whatsapp_agents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at');

      if (agentsError) throw agentsError;

      // Get user profiles separately
      const userIds = agentsData.map(a => a.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap: Record<string, { email: string; full_name: string | null }> = {};
      profilesData?.forEach(p => {
        profilesMap[p.id] = { email: p.email, full_name: p.full_name };
      });

      // Get department associations
      const agentIds = agentsData.map(a => a.id);
      const { data: deptAssocs, error: deptError } = await supabase
        .from('whatsapp_agent_departments')
        .select(`
          agent_id,
          is_primary,
          department:department_id (
            id,
            name,
            color
          )
        `)
        .in('agent_id', agentIds);

      if (deptError) throw deptError;

      // Get active chats count per agent
      const { data: chatCounts, error: chatError } = await supabase
        .from('whatsapp_conversations')
        .select('assigned_to')
        .eq('project_id', projectId)
        .eq('status', 'open')
        .not('assigned_to', 'is', null);

      if (chatError) throw chatError;

      const chatCountMap: Record<string, number> = {};
      chatCounts?.forEach(c => {
        if (c.assigned_to) {
          chatCountMap[c.assigned_to] = (chatCountMap[c.assigned_to] || 0) + 1;
        }
      });

      // Map departments to agents
      const deptMap: Record<string, { id: string; name: string; color: string; is_primary: boolean }[]> = {};
      deptAssocs?.forEach(assoc => {
        if (!deptMap[assoc.agent_id]) {
          deptMap[assoc.agent_id] = [];
        }
        if (assoc.department) {
          const dept = assoc.department as any;
          deptMap[assoc.agent_id].push({
            id: dept.id,
            name: dept.name,
            color: dept.color,
            is_primary: assoc.is_primary,
          });
        }
      });

      // Cast to correct type
      type AgentRow = typeof agentsData[0];

      return agentsData.map((agent: AgentRow) => ({
        id: agent.id,
        project_id: agent.project_id,
        user_id: agent.user_id,
        display_name: agent.display_name,
        status: agent.status as AgentStatus,
        max_concurrent_chats: agent.max_concurrent_chats,
        is_supervisor: agent.is_supervisor,
        is_active: agent.is_active,
        work_hours: agent.work_hours as Record<string, { start: string; end: string }> | null,
        last_activity_at: agent.last_activity_at,
        created_at: agent.created_at,
        updated_at: agent.updated_at,
        user_email: profilesMap[agent.user_id]?.email,
        user_name: profilesMap[agent.user_id]?.full_name,
        departments: deptMap[agent.id] || [],
        active_chats_count: chatCountMap[agent.user_id] || 0,
      })) as WhatsAppAgent[];
    },
    enabled: !!projectId,
  });

  const createAgent = useMutation({
    mutationFn: async (input: CreateAgentInput) => {
      if (!projectId) throw new Error('Projeto não selecionado');

      const { data: agent, error: agentError } = await supabase
        .from('whatsapp_agents')
        .insert({
          project_id: projectId,
          user_id: input.user_id,
          display_name: input.display_name || null,
          max_concurrent_chats: input.max_concurrent_chats || 5,
          is_supervisor: input.is_supervisor || false,
        })
        .select()
        .single();

      if (agentError) throw agentError;

      // Add department associations
      if (input.department_ids && input.department_ids.length > 0) {
        const deptInserts = input.department_ids.map((deptId, idx) => ({
          agent_id: agent.id,
          department_id: deptId,
          is_primary: idx === 0,
        }));

        const { error: deptError } = await supabase
          .from('whatsapp_agent_departments')
          .insert(deptInserts);

        if (deptError) throw deptError;
      }

      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-agents', projectId] });
      toast({
        title: 'Atendente adicionado',
        description: 'O atendente foi cadastrado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar atendente',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const updateAgent = useMutation({
    mutationFn: async (input: UpdateAgentInput) => {
      const { id, department_ids, ...updates } = input;

      const { data: agent, error: agentError } = await supabase
        .from('whatsapp_agents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (agentError) throw agentError;

      // Update department associations if provided
      if (department_ids !== undefined) {
        // Remove existing
        await supabase
          .from('whatsapp_agent_departments')
          .delete()
          .eq('agent_id', id);

        // Add new
        if (department_ids.length > 0) {
          const deptInserts = department_ids.map((deptId, idx) => ({
            agent_id: id,
            department_id: deptId,
            is_primary: idx === 0,
          }));

          const { error: deptError } = await supabase
            .from('whatsapp_agent_departments')
            .insert(deptInserts);

          if (deptError) throw deptError;
        }
      }

      return agent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-agents', projectId] });
      toast({
        title: 'Atendente atualizado',
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

  const updateMyStatus = useMutation({
    mutationFn: async (status: AgentStatus) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('whatsapp_agents')
        .update({ status, last_activity_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .eq('user_id', userData.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-agents', projectId] });
    },
  });

  const deleteAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('whatsapp_agents')
        .delete()
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-agents', projectId] });
      toast({
        title: 'Atendente removido',
        description: 'O atendente foi excluído.',
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

  // Get current user's agent info (async version)
  const getCurrentAgentByUserId = (userId: string) => {
    return agents?.find(a => a.user_id === userId);
  };

  const getOnlineAgents = () => {
    return agents?.filter(a => a.is_active && a.status === 'online') || [];
  };

  const getAvailableAgents = () => {
    return agents?.filter(a => 
      a.is_active && 
      a.status === 'online' && 
      a.active_chats_count! < a.max_concurrent_chats
    ) || [];
  };

  return {
    agents,
    isLoading,
    error,
    createAgent: createAgent.mutate,
    updateAgent: updateAgent.mutate,
    updateMyStatus: updateMyStatus.mutate,
    deleteAgent: deleteAgent.mutate,
    isCreating: createAgent.isPending,
    isUpdating: updateAgent.isPending,
    isDeleting: deleteAgent.isPending,
    getCurrentAgentByUserId,
    getOnlineAgents,
    getAvailableAgents,
  };
}
