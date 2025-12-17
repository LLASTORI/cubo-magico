import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useRef, useEffect, DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAutomationFlowDetails, useAutomationFlows } from '@/hooks/useAutomationFlows';
import { useProjectModules } from '@/hooks/useProjectModules';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Play, Pause, Settings2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { nodeTypes } from '@/components/automation/nodes';
import { NodePalette } from '@/components/automation/NodePalette';
import { NodeConfigPanel } from '@/components/automation/NodeConfigPanel';

function FlowEditor() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();
  const { flow, nodes: dbNodes, edges: dbEdges, isLoading, addNode, updateNode, deleteNode, addEdge: addDbEdge, deleteEdge: deleteDbEdge, saveViewport } = useAutomationFlowDetails(flowId);
  const { toggleFlow } = useAutomationFlows();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const automationEnabled = isModuleEnabled('automation');

  // Convert DB nodes/edges to React Flow format
  useEffect(() => {
    if (dbNodes.length > 0) {
      const rfNodes: Node[] = dbNodes.map(n => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.position_x, y: n.position_y },
        data: { 
          type: n.node_type, 
          ...n.config 
        },
      }));
      setNodes(rfNodes);
    }
  }, [dbNodes, setNodes]);

  useEffect(() => {
    if (dbEdges.length > 0) {
      const rfEdges: Edge[] = dbEdges.map(e => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle: e.source_handle || undefined,
        targetHandle: e.target_handle || undefined,
        label: e.label || undefined,
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, cursor: 'pointer' },
        type: 'smoothstep',
        interactionWidth: 20,
      }));
      setEdges(rfEdges);
    }
  }, [dbEdges, setEdges]);

  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target) return;
    
    try {
      const result = await addDbEdge.mutateAsync({
        source_node_id: params.source,
        target_node_id: params.target,
        source_handle: params.sourceHandle || undefined,
        target_handle: params.targetHandle || undefined,
      });
      
      setEdges((eds) => addEdge({
        ...params,
        id: result.id,
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, cursor: 'pointer' },
        type: 'smoothstep',
        interactionWidth: 20,
      }, eds));
    } catch (error) {
      console.error('Error adding edge:', error);
    }
  }, [addDbEdge, setEdges]);

  const onNodeDragStop = useCallback(async (_: any, node: Node) => {
    await updateNode.mutateAsync({
      nodeId: node.id,
      updates: { position_x: node.position.x, position_y: node.position.y },
    });
  }, [updateNode]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    setShowConfigPanel(true);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowConfigPanel(false);
  }, []);

  const onEdgeClick = useCallback(async (_: any, edge: Edge) => {
    try {
      await deleteDbEdge.mutateAsync(edge.id);
      setEdges((eds) => eds.filter(e => e.id !== edge.id));
      toast.success('Conexão removida');
    } catch (error) {
      console.error('Error deleting edge:', error);
      toast.error('Erro ao remover conexão');
    }
  }, [deleteDbEdge, setEdges]);

  const handleAddNode = async (type: string, position?: { x: number; y: number }) => {
    // Calculate position
    let x = 250;
    let y = 150;

    if (position) {
      x = position.x;
      y = position.y;
    } else if (nodes.length > 0) {
      // Find a good position below the last node
      const lastNode = nodes[nodes.length - 1];
      x = lastNode.position.x;
      y = lastNode.position.y + 120;
    }

    try {
      const result = await addNode.mutateAsync({
        node_type: type,
        position_x: x,
        position_y: y,
        config: {},
      });

      const newNode: Node = {
        id: result.id,
        type: type,
        position: { x, y },
        data: { type },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success('Componente adicionado');
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode || selectedNode.data?.type === 'start') {
      toast.error('Não é possível excluir o nó inicial');
      return;
    }

    try {
      await deleteNode.mutateAsync(selectedNode.id);
      setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setShowConfigPanel(false);
      toast.success('Componente excluído');
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleUpdateNodeConfig = async (config: Record<string, any>) => {
    if (!selectedNode) return;

    try {
      await updateNode.mutateAsync({
        nodeId: selectedNode.id,
        updates: { config },
      });

      setNodes((nds) => nds.map(n => 
        n.id === selectedNode.id 
          ? { ...n, data: { ...n.data, ...config } }
          : n
      ));

      toast.success('Configuração salva');
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  // Handle drag and drop from palette
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      await handleAddNode(type, position);
    },
    [reactFlowInstance, handleAddNode]
  );

  if (modulesLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!automationEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b bg-card px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Editor de Fluxo</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md border-muted">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>Módulo de Automações</CardTitle>
              <CardDescription>Este módulo não está habilitado para o projeto atual.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Fluxo não encontrado</p>
          <Button onClick={() => navigate('/automations')}>Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{flow.name}</h1>
              <p className="text-xs text-muted-foreground">
                Gatilho: {flow.trigger_type === 'keyword' ? 'Palavra-chave' : flow.trigger_type}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {flow.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <Switch
                checked={flow.is_active}
                onCheckedChange={(checked) => toggleFlow.mutate({ flowId: flow.id, isActive: checked })}
              />
            </div>
            <Badge variant={flow.is_active ? 'default' : 'secondary'} className="gap-1">
              {flow.is_active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {flow.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onAddNode={handleAddNode} />

        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultViewport={flow.viewport}
            deleteKeyCode={['Backspace', 'Delete']}
            connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--muted-foreground))" className="opacity-30" />
            <Controls className="bg-card border rounded-lg" />
            <MiniMap 
              className="!bg-card border rounded-lg"
              nodeColor={() => 'hsl(var(--primary))'}
              maskColor="hsl(var(--background) / 0.8)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Config Panel */}
      <NodeConfigPanel
        node={selectedNode}
        open={showConfigPanel}
        onOpenChange={setShowConfigPanel}
        onSave={handleUpdateNodeConfig}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}

export default function AutomationFlowEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
