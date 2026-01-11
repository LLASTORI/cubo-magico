import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { 
  Agent, 
  AgentDecision, 
  AgentObjective, 
  AgentActionType, 
  TriggerType,
  AgentBoundaries,
  AgentPrediction,
  AgentContactContext,
  evaluateAgent
} from '@/lib/agentEngine';

interface AgentRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  objective: string;
  allowed_actions: unknown;
  boundaries: unknown;
  confidence_threshold: number;
  is_active: boolean;
  trigger_on: unknown;
  max_actions_per_day: number | null;
  require_human_approval: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface DecisionRow {
  id: string;
  agent_id: string;
  contact_id: string | null;
  project_id: string;
  prediction_id: string | null;
  decision_type: string;
  decision_data: unknown;
  explanation: unknown;
  confidence: number;
  risk_score: number | null;
  reward_score: number | null;
  status: string;
  executed_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  outcome: string | null;
  outcome_data: unknown;
  created_at: string;
  updated_at: string;
}

function parseAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description || undefined,
    objective: row.objective as AgentObjective,
    allowedActions: (row.allowed_actions as AgentActionType[]) || [],
    boundaries: (row.boundaries as AgentBoundaries) || {},
    confidenceThreshold: row.confidence_threshold,
    isActive: row.is_active,
    triggerOn: (row.trigger_on as TriggerType[]) || [],
    maxActionsPerDay: row.max_actions_per_day || 100,
    requireHumanApproval: row.require_human_approval
  };
}

export interface AgentDecisionLog {
  id: string;
  agentId: string;
  contactId: string | null;
  projectId: string;
  predictionId: string | null;
  decisionType: string;
  decisionData: Record<string, unknown>;
  explanation: Record<string, unknown>;
  confidence: number;
  riskScore: number;
  rewardScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  executedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  outcome: string | null;
  outcomeData: Record<string, unknown> | null;
  createdAt: string;
  agent?: Agent;
}

function parseDecisionLog(row: DecisionRow, agent?: Agent): AgentDecisionLog {
  return {
    id: row.id,
    agentId: row.agent_id,
    contactId: row.contact_id,
    projectId: row.project_id,
    predictionId: row.prediction_id,
    decisionType: row.decision_type,
    decisionData: (row.decision_data as Record<string, unknown>) || {},
    explanation: (row.explanation as Record<string, unknown>) || {},
    confidence: row.confidence,
    riskScore: row.risk_score || 0,
    rewardScore: row.reward_score || 0,
    status: row.status as AgentDecisionLog['status'],
    executedAt: row.executed_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedReason: row.rejected_reason,
    outcome: row.outcome,
    outcomeData: row.outcome_data as Record<string, unknown> | null,
    createdAt: row.created_at,
    agent
  };
}

export function useAIAgents() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['ai-agents', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as AgentRow[]).map(parseAgent);
    },
    enabled: !!currentProject?.id
  });

  const createAgent = useMutation({
    mutationFn: async (agent: Omit<Agent, 'id' | 'projectId'>) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const insertData = {
        project_id: currentProject.id,
        name: agent.name,
        description: agent.description,
        objective: agent.objective,
        allowed_actions: agent.allowedActions as unknown,
        boundaries: agent.boundaries as unknown,
        confidence_threshold: agent.confidenceThreshold,
        is_active: agent.isActive,
        trigger_on: agent.triggerOn as unknown,
        max_actions_per_day: agent.maxActionsPerDay,
        require_human_approval: agent.requireHumanApproval
      };

      const { data, error } = await supabase
        .from('ai_agents')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return parseAgent(data as AgentRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente criado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating agent:', error);
      toast.error('Erro ao criar agente');
    }
  });

  const updateAgent = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Agent> & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.objective !== undefined) updateData.objective = updates.objective;
      if (updates.allowedActions !== undefined) updateData.allowed_actions = updates.allowedActions;
      if (updates.boundaries !== undefined) updateData.boundaries = updates.boundaries;
      if (updates.confidenceThreshold !== undefined) updateData.confidence_threshold = updates.confidenceThreshold;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.triggerOn !== undefined) updateData.trigger_on = updates.triggerOn;
      if (updates.maxActionsPerDay !== undefined) updateData.max_actions_per_day = updates.maxActionsPerDay;
      if (updates.requireHumanApproval !== undefined) updateData.require_human_approval = updates.requireHumanApproval;

      const { error } = await supabase
        .from('ai_agents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente atualizado');
    },
    onError: (error) => {
      console.error('Error updating agent:', error);
      toast.error('Erro ao atualizar agente');
    }
  });

  const deleteAgent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_agents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success('Agente excluído');
    },
    onError: (error) => {
      console.error('Error deleting agent:', error);
      toast.error('Erro ao excluir agente');
    }
  });

  const toggleAgentActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('ai_agents')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-agents'] });
      toast.success(isActive ? 'Agente ativado' : 'Agente desativado');
    },
    onError: (error) => {
      console.error('Error toggling agent:', error);
      toast.error('Erro ao alterar status do agente');
    }
  });

  return {
    agents,
    isLoading,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentActive
  };
}

export function useAgentDecisions(contactId?: string) {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['agent-decisions', currentProject?.id, contactId],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      let query = supabase
        .from('agent_decisions_log')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });

      if (contactId) {
        query = query.eq('contact_id', contactId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      // Fetch agents for the decisions
      const agentIds = [...new Set((data as DecisionRow[]).map(d => d.agent_id))];
      const { data: agentsData } = await supabase
        .from('ai_agents')
        .select('*')
        .in('id', agentIds);

      const agentsMap = new Map((agentsData as AgentRow[] || []).map(a => [a.id, parseAgent(a)]));

      return (data as DecisionRow[]).map(row => parseDecisionLog(row, agentsMap.get(row.agent_id)));
    },
    enabled: !!currentProject?.id
  });

  const pendingDecisions = decisions.filter(d => d.status === 'pending');

  const approveDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('agent_decisions_log')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', decisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-decisions'] });
      toast.success('Decisão aprovada');
    },
    onError: (error) => {
      console.error('Error approving decision:', error);
      toast.error('Erro ao aprovar decisão');
    }
  });

  const rejectDecision = useMutation({
    mutationFn: async ({ decisionId, reason }: { decisionId: string; reason?: string }) => {
      const { error } = await supabase
        .from('agent_decisions_log')
        .update({
          status: 'rejected',
          rejected_reason: reason || 'Rejeitado pelo usuário'
        })
        .eq('id', decisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-decisions'] });
      toast.success('Decisão rejeitada');
    },
    onError: (error) => {
      console.error('Error rejecting decision:', error);
      toast.error('Erro ao rejeitar decisão');
    }
  });

  const executeDecision = useMutation({
    mutationFn: async (decisionId: string) => {
      const { error } = await supabase
        .from('agent_decisions_log')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', decisionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-decisions'] });
      toast.success('Ação executada');
    },
    onError: (error) => {
      console.error('Error executing decision:', error);
      toast.error('Erro ao executar ação');
    }
  });

  const logDecision = useMutation({
    mutationFn: async (decision: AgentDecision) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const insertData = {
        agent_id: decision.agentId,
        contact_id: decision.contactId,
        project_id: currentProject.id,
        prediction_id: decision.predictionId,
        decision_type: decision.decisionType,
        decision_data: decision.decisionData as unknown,
        explanation: decision.explanation as unknown,
        confidence: decision.confidence,
        risk_score: decision.riskScore,
        reward_score: decision.rewardScore,
        status: 'pending'
      };

      const { error } = await supabase
        .from('agent_decisions_log')
        .insert(insertData as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-decisions'] });
    }
  });

  return {
    decisions,
    pendingDecisions,
    isLoading,
    approveDecision,
    rejectDecision,
    executeDecision,
    logDecision
  };
}

export function useEvaluateAgents() {
  const { agents } = useAIAgents();
  const { logDecision } = useAgentDecisions();

  const evaluateForContact = async (
    contactId: string,
    predictions: AgentPrediction[],
    context: AgentContactContext
  ) => {
    const activeAgents = agents.filter(a => a.isActive);
    const decisions: AgentDecision[] = [];

    for (const agent of activeAgents) {
      const decision = evaluateAgent(agent, predictions, context);
      if (decision) {
        decisions.push(decision);
        await logDecision.mutateAsync(decision);
      }
    }

    return decisions;
  };

  return { evaluateForContact };
}
