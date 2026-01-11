/**
 * Cubo OS Hooks - Simplified version for type compatibility
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export function useSystemEvents(options?: { 
  contactId?: string; 
  limit?: number;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['system-events', currentProject?.id, options],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      let query = supabase
        .from('system_events')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (options?.contactId) {
        query = query.eq('contact_id', options.contactId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        projectId: e.project_id as string,
        contactId: e.contact_id as string | undefined,
        eventType: (e.event_type || e.source) as string,
        eventName: e.event_name as string,
        eventSource: (e.event_source || e.source) as string,
        payload: e.payload as Record<string, unknown>,
        status: (e.status || 'completed') as string,
        priority: (e.priority || 5) as number,
        createdAt: e.created_at as string,
      }));
    },
    enabled: !!currentProject?.id,
  });
}

// ============================================================================
// SYSTEM LEARNINGS
// ============================================================================

export function useSystemLearnings(options?: { 
  status?: string; 
  category?: string;
  limit?: number;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['system-learnings', currentProject?.id, options],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      let query = supabase
        .from('system_learnings')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((l: Record<string, unknown>) => ({
        id: l.id as string,
        projectId: l.project_id as string,
        learningType: l.learning_type as string,
        category: l.category as string,
        title: l.title as string,
        description: l.description as string,
        evidence: l.evidence as unknown[],
        confidence: l.confidence as number,
        impactScore: l.impact_score as number,
        affectedContactsCount: l.affected_contacts_count as number,
        status: l.status as string,
        createdAt: l.created_at as string,
      }));
    },
    enabled: !!currentProject?.id,
  });
}

export function useUpdateLearningStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };

      if (status === 'validated') {
        updates.validated_at = new Date().toISOString();
      } else if (status === 'applied') {
        updates.applied_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('system_learnings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-learnings'] });
    },
  });
}

// ============================================================================
// EXPLAINABILITY LOGS (using agent_decisions_log as proxy)
// ============================================================================

export function useExplainabilityLogs(options?: { 
  contactId?: string; 
  source?: string;
  limit?: number;
}) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['explainability-logs', currentProject?.id, options],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      let query = supabase
        .from('agent_decisions_log')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100);

      if (options?.contactId) {
        query = query.eq('contact_id', options.contactId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        projectId: d.project_id as string,
        contactId: d.contact_id as string | undefined,
        source: 'agent' as string,
        sourceId: d.agent_id as string,
        sourceName: 'AI Agent',
        decisionType: d.decision_type as string,
        decision: JSON.stringify(d.decision_data || {}),
        reasoning: (d.explanation as Record<string, unknown>)?.summary as string || '',
        confidence: d.confidence as number,
        humanOverride: d.status === 'rejected',
        createdAt: d.created_at as string,
      }));
    },
    enabled: !!currentProject?.id,
  });
}

// ============================================================================
// CUBO OS DASHBOARD STATS
// ============================================================================

export function useCuboOSStats() {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['cubo-os-stats', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return null;

      const [eventsCount, learningsCount, decisionsToday, activeAgents, pendingApprovals] = await Promise.all([
        supabase
          .from('system_events')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('system_learnings')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject.id)
          .in('status', ['discovered', 'validated']),
        
        supabase
          .from('agent_decisions_log')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        
        supabase
          .from('ai_agents')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject.id)
          .eq('is_active', true),
        
        supabase
          .from('agent_decisions_log')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', currentProject.id)
          .eq('status', 'pending'),
      ]);

      return {
        eventsToday: eventsCount.count || 0,
        activeLearnings: learningsCount.count || 0,
        decisionsToday: decisionsToday.count || 0,
        activeAgents: activeAgents.count || 0,
        pendingApprovals: pendingApprovals.count || 0,
      };
    },
    enabled: !!currentProject?.id,
    refetchInterval: 30000,
  });
}

// ============================================================================
// SYSTEM BELIEFS
// ============================================================================

export function useSystemBeliefs(limit = 10) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['system-beliefs', currentProject?.id, limit],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('contact_predictions')
        .select(`prediction_type, confidence, risk_level, contact_id, crm_contacts!inner(name, email)`)
        .eq('project_id', currentProject.id)
        .eq('is_active', true)
        .gte('confidence', 0.7)
        .order('confidence', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((p: Record<string, unknown>) => {
        const contact = p.crm_contacts as Record<string, unknown>;
        return {
          type: p.prediction_type as string,
          confidence: p.confidence as number,
          riskLevel: p.risk_level as string,
          contactId: p.contact_id as string,
          contactName: (contact?.name || contact?.email || 'Unknown') as string,
        };
      });
    },
    enabled: !!currentProject?.id,
  });
}

// ============================================================================
// SYSTEM PLANS
// ============================================================================

export function useSystemPlans(limit = 10) {
  const { currentProject } = useProject();

  return useQuery({
    queryKey: ['system-plans', currentProject?.id, limit],
    queryFn: async () => {
      if (!currentProject?.id) return [];

      const { data, error } = await supabase
        .from('agent_decisions_log')
        .select(`id, decision_type, decision_data, confidence, status, created_at, ai_agents!inner(name, objective)`)
        .eq('project_id', currentProject.id)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((d: Record<string, unknown>) => {
        const agent = d.ai_agents as Record<string, unknown>;
        return {
          id: d.id as string,
          decisionType: d.decision_type as string,
          decisionData: d.decision_data,
          confidence: d.confidence as number,
          status: d.status as string,
          createdAt: d.created_at as string,
          agentName: (agent?.name || 'Unknown Agent') as string,
          agentObjective: agent?.objective as string,
        };
      });
    },
    enabled: !!currentProject?.id,
  });
}
