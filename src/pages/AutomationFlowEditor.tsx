import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback, useRef, useEffect } from 'react';
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
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AppHeader } from '@/components/AppHeader';
import { useAutomationFlowDetails, useAutomationFlows } from '@/hooks/useAutomationFlows';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { 
  Loader2, 
  ArrowLeft, 
  Save, 
  Play, 
  Pause,
  MessageSquare,
  Clock,
  GitBranch,
  Zap,
  Plus,
  Settings2,
  Image,
  FileAudio,
  FileText,
  Tag,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

// Node types configuration
const nodeConfig = {
  start: { label: 'Início', icon: Zap, color: 'bg-green-500' },
  message: { label: 'Mensagem', icon: MessageSquare, color: 'bg-blue-500' },
  delay: { label: 'Espera', icon: Clock, color: 'bg-yellow-500' },
  condition: { label: 'Condição', icon: GitBranch, color: 'bg-purple-500' },
  action: { label: 'Ação CRM', icon: Tag, color: 'bg-orange-500' },
  media: { label: 'Mídia', icon: Image, color: 'bg-pink-500' },
};

// Custom node component
function AutomationNode({ data, selected }: { data: any; selected: boolean }) {
  const config = nodeConfig[data.type as keyof typeof nodeConfig] || nodeConfig.message;
  const Icon = config.icon;

  return (
    <div className={`
      px-4 py-3 rounded-lg border-2 min-w-[180px] bg-card shadow-md
      ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
      transition-all
    `}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded ${config.color} text-white`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="font-medium text-sm">{data.label || config.label}</span>
      </div>
      {data.subtitle && (
        <p className="text-xs text-muted-foreground truncate">{data.subtitle}</p>
      )}
    </div>
  );
}

const nodeTypes = {
  automation: AutomationNode,
};

// Available nodes to add
const availableNodes = [
  { type: 'message', label: 'Mensagem de Texto', icon: MessageSquare, description: 'Enviar mensagem de texto' },
  { type: 'media', label: 'Mídia', icon: Image, description: 'Enviar imagem, áudio ou vídeo' },
  { type: 'delay', label: 'Espera', icon: Clock, description: 'Aguardar um tempo' },
  { type: 'condition', label: 'Condição', icon: GitBranch, description: 'Verificar uma condição' },
  { type: 'action', label: 'Ação CRM', icon: Tag, description: 'Adicionar tag, mudar etapa, etc.' },
];

export default function AutomationFlowEditor() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  const { flow, nodes: dbNodes, edges: dbEdges, isLoading, addNode, updateNode, deleteNode, addEdge: addDbEdge, deleteEdge, saveViewport } = useAutomationFlowDetails(flowId);
  const { toggleFlow } = useAutomationFlows();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Convert DB nodes/edges to React Flow format
  useEffect(() => {
    if (dbNodes.length > 0) {
      const rfNodes: Node[] = dbNodes.map(n => ({
        id: n.id,
        type: 'automation',
        position: { x: n.position_x, y: n.position_y },
        data: { 
          type: n.node_type, 
          label: n.config?.label || nodeConfig[n.node_type as keyof typeof nodeConfig]?.label,
          subtitle: getNodeSubtitle(n.node_type, n.config),
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
        style: { stroke: 'hsl(var(--primary))' },
      }));
      setEdges(rfEdges);
    }
  }, [dbEdges, setEdges]);

  const getNodeSubtitle = (type: string, config: any) => {
    switch (type) {
      case 'message':
        return config?.content?.substring(0, 30) + (config?.content?.length > 30 ? '...' : '') || 'Configurar mensagem';
      case 'delay':
        const mins = config?.delay_minutes || 0;
        return mins > 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} minutos`;
      case 'condition':
        return config?.field ? `Se ${config.field} ${config.operator}` : 'Configurar condição';
      case 'action':
        return config?.action_type || 'Configurar ação';
      case 'start':
        return flow?.trigger_type === 'keyword' ? `Palavras: ${flow.trigger_config?.keywords?.join(', ')}` : '';
      default:
        return '';
    }
  };

  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target) return;
    
    // Add to database first
    try {
      const result = await addDbEdge.mutateAsync({
        source_node_id: params.source,
        target_node_id: params.target,
        source_handle: params.sourceHandle || undefined,
        target_handle: params.targetHandle || undefined,
      });
      
      // Then update local state
      setEdges((eds) => addEdge({
        ...params,
        id: result.id,
        animated: true,
        style: { stroke: 'hsl(var(--primary))' },
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
    setShowNodePanel(true);
  }, []);

  const handleAddNode = async (type: string) => {
    // Find a good position for the new node
    const lastNode = nodes[nodes.length - 1];
    const x = lastNode ? lastNode.position.x : 250;
    const y = lastNode ? lastNode.position.y + 120 : 150;

    try {
      const result = await addNode.mutateAsync({
        node_type: type,
        position_x: x,
        position_y: y,
        config: {},
      });

      const newNode: Node = {
        id: result.id,
        type: 'automation',
        position: { x, y },
        data: { 
          type, 
          label: nodeConfig[type as keyof typeof nodeConfig]?.label,
          subtitle: 'Configurar...',
        },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success('Nó adicionado');
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode || selectedNode.data.type === 'start') {
      toast.error('Não é possível excluir o nó inicial');
      return;
    }

    try {
      await deleteNode.mutateAsync(selectedNode.id);
      setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
      setShowNodePanel(false);
      toast.success('Nó excluído');
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleUpdateNodeConfig = async (config: any) => {
    if (!selectedNode) return;

    try {
      await updateNode.mutateAsync({
        nodeId: selectedNode.id,
        updates: { config },
      });

      setNodes((nds) => nds.map(n => 
        n.id === selectedNode.id 
          ? { ...n, data: { ...n.data, ...config, subtitle: getNodeSubtitle(n.data.type, config) } }
          : n
      ));

      toast.success('Configuração salva');
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Fluxo" />
        <main className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader pageSubtitle="Editor de Fluxo" />
        <main className="container mx-auto px-6 py-8">
          <p>Fluxo não encontrado</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/automations')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{flow.name}</h1>
              <p className="text-xs text-muted-foreground">
                {flow.trigger_type === 'keyword' ? 'Gatilho: Palavra-chave' : flow.trigger_type}
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
            <Badge variant={flow.is_active ? 'default' : 'secondary'}>
              {flow.is_active ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
              {flow.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex">
        {/* Sidebar with available nodes */}
        <div className="w-64 border-r bg-card p-4 space-y-4">
          <h3 className="font-medium text-sm">Adicionar Nó</h3>
          <div className="space-y-2">
            {availableNodes.map((node) => (
              <button
                key={node.type}
                onClick={() => handleAddNode(node.type)}
                className="w-full p-3 rounded-lg border bg-background hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <node.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{node.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultViewport={flow.viewport}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
            <MiniMap 
              nodeColor={(n) => {
                const config = nodeConfig[n.data?.type as keyof typeof nodeConfig];
                return config ? 'hsl(var(--primary))' : 'hsl(var(--muted))';
              }}
            />
          </ReactFlow>
        </div>
      </div>

      {/* Node configuration panel */}
      <Sheet open={showNodePanel} onOpenChange={setShowNodePanel}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {selectedNode && (
                <div className="flex items-center gap-2">
                  {nodeConfig[selectedNode.data.type as keyof typeof nodeConfig] && (
                    <>
                      {(() => {
                        const Icon = nodeConfig[selectedNode.data.type as keyof typeof nodeConfig].icon;
                        return <Icon className="h-5 w-5" />;
                      })()}
                    </>
                  )}
                  Configurar {nodeConfig[selectedNode.data.type as keyof typeof nodeConfig]?.label || 'Nó'}
                </div>
              )}
            </SheetTitle>
          </SheetHeader>

          {selectedNode && (
            <div className="mt-6 space-y-4">
              <NodeConfigForm 
                node={selectedNode} 
                onSave={handleUpdateNodeConfig}
                onDelete={handleDeleteNode}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Node configuration form component
function NodeConfigForm({ node, onSave, onDelete }: { node: Node; onSave: (config: any) => void; onDelete: () => void }) {
  const [config, setConfig] = useState(node.data || {});

  const handleSave = () => {
    onSave(config);
  };

  return (
    <div className="space-y-4">
      {node.data.type === 'message' && (
        <div className="space-y-2">
          <Label>Mensagem</Label>
          <textarea
            className="w-full min-h-[100px] p-3 rounded-md border bg-background text-sm"
            placeholder="Digite a mensagem..."
            value={String(config.content || '')}
            onChange={(e) => setConfig({ ...config, content: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Use variáveis como {'{{nome}}'}, {'{{email}}'} para personalizar
          </p>
        </div>
      )}

      {node.data.type === 'delay' && (
        <div className="space-y-2">
          <Label>Tempo de Espera (minutos)</Label>
          <Input
            type="number"
            value={Number(config.delay_minutes || 0)}
            onChange={(e) => setConfig({ ...config, delay_minutes: parseInt(e.target.value) || 0 })}
          />
        </div>
      )}

      {node.data.type === 'condition' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Campo</Label>
            <Input
              placeholder="Ex: tags, status, city"
              value={String(config.field || '')}
              onChange={(e) => setConfig({ ...config, field: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Operador</Label>
            <select 
              className="w-full p-2 rounded-md border bg-background"
              value={String(config.operator || 'equals')}
              onChange={(e) => setConfig({ ...config, operator: e.target.value })}
            >
              <option value="equals">Igual a</option>
              <option value="not_equals">Diferente de</option>
              <option value="contains">Contém</option>
              <option value="not_contains">Não contém</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              placeholder="Valor para comparar"
              value={String(config.value || '')}
              onChange={(e) => setConfig({ ...config, value: e.target.value })}
            />
          </div>
        </div>
      )}

      {node.data.type === 'action' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tipo de Ação</Label>
            <select 
              className="w-full p-2 rounded-md border bg-background"
              value={String(config.action_type || 'add_tag')}
              onChange={(e) => setConfig({ ...config, action_type: e.target.value })}
            >
              <option value="add_tag">Adicionar Tag</option>
              <option value="remove_tag">Remover Tag</option>
              <option value="change_stage">Mudar Etapa do Pipeline</option>
              <option value="change_recovery_stage">Mudar Etapa de Recuperação</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <Input
              placeholder="Nome da tag ou ID da etapa"
              value={String(config.action_value || '')}
              onChange={(e) => setConfig({ ...config, action_value: e.target.value })}
            />
          </div>
        </div>
      )}

      {node.data.type === 'media' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tipo de Mídia</Label>
            <select 
              className="w-full p-2 rounded-md border bg-background"
              value={String(config.media_type || 'image')}
              onChange={(e) => setConfig({ ...config, media_type: e.target.value })}
            >
              <option value="image">Imagem</option>
              <option value="audio">Áudio</option>
              <option value="video">Vídeo</option>
              <option value="document">Documento</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>URL da Mídia</Label>
            <Input
              placeholder="https://..."
              value={String(config.media_url || '')}
              onChange={(e) => setConfig({ ...config, media_url: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Input
              placeholder="Legenda da mídia..."
              value={String(config.caption || '')}
              onChange={(e) => setConfig({ ...config, caption: e.target.value })}
            />
          </div>
        </div>
      )}

      {node.data.type === 'start' && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Este é o nó inicial do fluxo. As configurações de gatilho são definidas nas propriedades do fluxo.
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <Button onClick={handleSave} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
        {node.data.type !== 'start' && (
          <Button variant="destructive" onClick={onDelete}>
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
