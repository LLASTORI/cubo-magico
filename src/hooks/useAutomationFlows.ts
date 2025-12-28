import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';

export interface AutomationFlow {
  id: string;
  project_id: string;
  folder_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  viewport: { x: number; y: number; zoom: number };
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationFlowNode {
  id: string;
  flow_id: string;
  node_type: string;
  position_x: number;
  position_y: number;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AutomationFlowEdge {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_handle: string | null;
  target_handle: string | null;
  label: string | null;
  created_at: string;
}

export interface AutomationFolder {
  id: string;
  project_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutomationFlows() {
  const { currentProject } = useProject();
  const queryClient = useQueryClient();

  const { data: flows = [], isLoading, error } = useQuery({
    queryKey: ['automation-flows', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const { data, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AutomationFlow[];
    },
    enabled: !!currentProject?.id,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['automation-folders', currentProject?.id],
    queryFn: async () => {
      if (!currentProject?.id) return [];
      
      const { data, error } = await supabase
        .from('automation_folders')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('name');
      
      if (error) throw error;
      return data as AutomationFolder[];
    },
    enabled: !!currentProject?.id,
  });

  const createFlow = useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      trigger_type: string;
      trigger_config?: Record<string, any>;
      folder_id?: string;
    }) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('automation_flows')
        .insert({
          project_id: currentProject.id,
          name: params.name,
          description: params.description || null,
          trigger_type: params.trigger_type,
          trigger_config: params.trigger_config || {},
          folder_id: params.folder_id || null,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default start node
      const { error: nodeError } = await supabase
        .from('automation_flow_nodes')
        .insert({
          flow_id: data.id,
          node_type: 'start',
          position_x: 250,
          position_y: 50,
          config: { trigger_type: params.trigger_type, ...params.trigger_config },
        });

      if (nodeError) console.error('Error creating start node:', nodeError);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Fluxo criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating flow:', error);
      toast.error('Erro ao criar fluxo');
    },
  });

  const updateFlow = useMutation({
    mutationFn: async (params: { 
      flowId: string; 
      updates: Partial<Omit<AutomationFlow, 'id' | 'project_id' | 'created_at' | 'updated_at'>>
    }) => {
      const { data, error } = await supabase
        .from('automation_flows')
        .update(params.updates)
        .eq('id', params.flowId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
    },
    onError: (error) => {
      console.error('Error updating flow:', error);
      toast.error('Erro ao atualizar fluxo');
    },
  });

  const deleteFlow = useMutation({
    mutationFn: async (flowId: string) => {
      const { error } = await supabase
        .from('automation_flows')
        .delete()
        .eq('id', flowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Fluxo excluído');
    },
    onError: (error) => {
      console.error('Error deleting flow:', error);
      toast.error('Erro ao excluir fluxo');
    },
  });

  const toggleFlow = useMutation({
    mutationFn: async (params: { flowId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('automation_flows')
        .update({ is_active: params.isActive })
        .eq('id', params.flowId);

      if (error) throw error;
      return params;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-flow', vars.flowId] });
      toast.success(vars.isActive ? 'Fluxo ativado' : 'Fluxo desativado');
    },
    onError: (error) => {
      console.error('Error toggling flow:', error);
      toast.error('Erro ao alterar status do fluxo');
    },
  });

  const duplicateFlow = useMutation({
    mutationFn: async (flowId: string) => {
      if (!currentProject?.id) throw new Error('No project selected');

      // Get original flow
      const { data: originalFlow, error: flowError } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (flowError) throw flowError;

      // Get nodes
      const { data: nodes, error: nodesError } = await supabase
        .from('automation_flow_nodes')
        .select('*')
        .eq('flow_id', flowId);

      if (nodesError) throw nodesError;

      // Get edges
      const { data: edges, error: edgesError } = await supabase
        .from('automation_flow_edges')
        .select('*')
        .eq('flow_id', flowId);

      if (edgesError) throw edgesError;

      const { data: userData } = await supabase.auth.getUser();

      // Create new flow
      const { data: newFlow, error: createError } = await supabase
        .from('automation_flows')
        .insert({
          project_id: currentProject.id,
          folder_id: originalFlow.folder_id,
          name: `${originalFlow.name} (cópia)`,
          description: originalFlow.description,
          trigger_type: originalFlow.trigger_type,
          trigger_config: originalFlow.trigger_config,
          viewport: originalFlow.viewport,
          created_by: userData.user?.id,
          is_active: false,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create node mapping
      const nodeMapping: Record<string, string> = {};

      // Duplicate nodes
      for (const node of nodes || []) {
        const { data: newNode, error: nodeError } = await supabase
          .from('automation_flow_nodes')
          .insert({
            flow_id: newFlow.id,
            node_type: node.node_type,
            position_x: node.position_x,
            position_y: node.position_y,
            config: node.config,
          })
          .select()
          .single();

        if (nodeError) console.error('Error duplicating node:', nodeError);
        if (newNode) nodeMapping[node.id] = newNode.id;
      }

      // Duplicate edges with new node IDs
      for (const edge of edges || []) {
        const newSourceId = nodeMapping[edge.source_node_id];
        const newTargetId = nodeMapping[edge.target_node_id];

        if (newSourceId && newTargetId) {
          await supabase
            .from('automation_flow_edges')
            .insert({
              flow_id: newFlow.id,
              source_node_id: newSourceId,
              target_node_id: newTargetId,
              source_handle: edge.source_handle,
              target_handle: edge.target_handle,
              label: edge.label,
            });
        }
      }

      return newFlow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Fluxo duplicado com sucesso!');
    },
    onError: (error) => {
      console.error('Error duplicating flow:', error);
      toast.error('Erro ao duplicar fluxo');
    },
  });

  // Folder management
  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      if (!currentProject?.id) throw new Error('No project selected');

      const { data, error } = await supabase
        .from('automation_folders')
        .insert({
          project_id: currentProject.id,
          name,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-folders'] });
      toast.success('Pasta criada');
    },
    onError: (error) => {
      console.error('Error creating folder:', error);
      toast.error('Erro ao criar pasta');
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      // Move flows from folder to root
      await supabase
        .from('automation_flows')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      const { error } = await supabase
        .from('automation_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-folders'] });
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      toast.success('Pasta excluída');
    },
    onError: (error) => {
      console.error('Error deleting folder:', error);
      toast.error('Erro ao excluir pasta');
    },
  });

  const moveFlowToFolder = useMutation({
    mutationFn: async (params: { flowId: string; folderId: string | null }) => {
      const { error } = await supabase
        .from('automation_flows')
        .update({ folder_id: params.folderId })
        .eq('id', params.flowId);

      if (error) throw error;
      return params;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['automation-flows'] });
      const folderName = vars.folderId 
        ? folders.find(f => f.id === vars.folderId)?.name || 'pasta'
        : 'raiz';
      toast.success(`Fluxo movido para ${folderName}`);
    },
    onError: (error) => {
      console.error('Error moving flow:', error);
      toast.error('Erro ao mover fluxo');
    },
  });

  return {
    flows,
    folders,
    isLoading,
    error,
    createFlow,
    updateFlow,
    deleteFlow,
    toggleFlow,
    duplicateFlow,
    createFolder,
    deleteFolder,
    moveFlowToFolder,
  };
}

// Hook for getting flow details with nodes and edges
export function useAutomationFlowDetails(flowId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: flow, isLoading: flowLoading } = useQuery({
    queryKey: ['automation-flow', flowId],
    queryFn: async () => {
      if (!flowId) return null;
      
      const { data, error } = await supabase
        .from('automation_flows')
        .select('*')
        .eq('id', flowId)
        .single();
      
      if (error) throw error;
      return data as AutomationFlow;
    },
    enabled: !!flowId,
  });

  const { data: nodes = [], isLoading: nodesLoading } = useQuery({
    queryKey: ['automation-flow-nodes', flowId],
    queryFn: async () => {
      if (!flowId) return [];
      
      const { data, error } = await supabase
        .from('automation_flow_nodes')
        .select('*')
        .eq('flow_id', flowId);
      
      if (error) throw error;
      return data as AutomationFlowNode[];
    },
    enabled: !!flowId,
  });

  const { data: edges = [], isLoading: edgesLoading } = useQuery({
    queryKey: ['automation-flow-edges', flowId],
    queryFn: async () => {
      if (!flowId) return [];
      
      const { data, error } = await supabase
        .from('automation_flow_edges')
        .select('*')
        .eq('flow_id', flowId);
      
      if (error) throw error;
      return data as AutomationFlowEdge[];
    },
    enabled: !!flowId,
  });

  // Mutations for nodes
  const addNode = useMutation({
    mutationFn: async (params: {
      node_type: string;
      position_x: number;
      position_y: number;
      config?: Record<string, any>;
    }) => {
      if (!flowId) throw new Error('No flow selected');

      const { data, error } = await supabase
        .from('automation_flow_nodes')
        .insert({
          flow_id: flowId,
          node_type: params.node_type,
          position_x: params.position_x,
          position_y: params.position_y,
          config: params.config || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flow-nodes', flowId] });
    },
  });

  const updateNode = useMutation({
    mutationFn: async (params: {
      nodeId: string;
      updates: Partial<Omit<AutomationFlowNode, 'id' | 'flow_id' | 'created_at' | 'updated_at'>>;
    }) => {
      const { data, error } = await supabase
        .from('automation_flow_nodes')
        .update(params.updates)
        .eq('id', params.nodeId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flow-nodes', flowId] });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await supabase
        .from('automation_flow_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flow-nodes', flowId] });
      queryClient.invalidateQueries({ queryKey: ['automation-flow-edges', flowId] });
    },
  });

  // Mutations for edges
  const addEdge = useMutation({
    mutationFn: async (params: {
      source_node_id: string;
      target_node_id: string;
      source_handle?: string;
      target_handle?: string;
      label?: string;
    }) => {
      if (!flowId) throw new Error('No flow selected');

      const { data, error } = await supabase
        .from('automation_flow_edges')
        .insert({
          flow_id: flowId,
          source_node_id: params.source_node_id,
          target_node_id: params.target_node_id,
          source_handle: params.source_handle || null,
          target_handle: params.target_handle || null,
          label: params.label || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flow-edges', flowId] });
    },
  });

  const deleteEdge = useMutation({
    mutationFn: async (edgeId: string) => {
      const { error } = await supabase
        .from('automation_flow_edges')
        .delete()
        .eq('id', edgeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-flow-edges', flowId] });
    },
  });

  // Save viewport
  const saveViewport = useMutation({
    mutationFn: async (viewport: { x: number; y: number; zoom: number }) => {
      if (!flowId) throw new Error('No flow selected');

      const { error } = await supabase
        .from('automation_flows')
        .update({ viewport })
        .eq('id', flowId);

      if (error) throw error;
    },
  });

  return {
    flow,
    nodes,
    edges,
    isLoading: flowLoading || nodesLoading || edgesLoading,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge,
    saveViewport,
  };
}
