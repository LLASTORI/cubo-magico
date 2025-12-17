import { DragEvent } from 'react';
import { 
  MessageSquare, 
  Clock, 
  GitBranch, 
  Tag, 
  Image,
  Globe,
  GitFork,
  MessageCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeDefinition {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'basic' | 'advanced';
}

const nodeDefinitions: NodeDefinition[] = [
  // Basic Nodes
  {
    type: 'message',
    label: 'Mensagem',
    description: 'Enviar texto',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'bg-blue-500',
    category: 'basic',
  },
  {
    type: 'media',
    label: 'Mídia',
    description: 'Imagem, áudio ou vídeo',
    icon: <Image className="h-5 w-5" />,
    color: 'bg-pink-500',
    category: 'basic',
  },
  {
    type: 'delay',
    label: 'Espera',
    description: 'Aguardar tempo',
    icon: <Clock className="h-5 w-5" />,
    color: 'bg-amber-500',
    category: 'basic',
  },
  {
    type: 'condition',
    label: 'Condição',
    description: 'Verificar dados',
    icon: <GitBranch className="h-5 w-5" />,
    color: 'bg-purple-500',
    category: 'basic',
  },
  {
    type: 'action',
    label: 'Ação CRM',
    description: 'Tags, etapas, etc.',
    icon: <Tag className="h-5 w-5" />,
    color: 'bg-orange-500',
    category: 'basic',
  },
  // Advanced Nodes
  {
    type: 'wait_reply',
    label: 'Aguardar Resposta',
    description: 'Esperar mensagem do cliente',
    icon: <MessageCircle className="h-5 w-5" />,
    color: 'bg-indigo-500',
    category: 'advanced',
  },
  {
    type: 'split',
    label: 'Split Test',
    description: 'Teste A/B',
    icon: <GitFork className="h-5 w-5" />,
    color: 'bg-pink-500',
    category: 'advanced',
  },
  {
    type: 'http_request',
    label: 'HTTP Request',
    description: 'Chamar API externa',
    icon: <Globe className="h-5 w-5" />,
    color: 'bg-cyan-500',
    category: 'advanced',
  },
  {
    type: 'tag',
    label: 'Tag Rápida',
    description: 'Adicionar/remover tag',
    icon: <Tag className="h-5 w-5" />,
    color: 'bg-emerald-500',
    category: 'advanced',
  },
];

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const basicNodes = nodeDefinitions.filter(n => n.category === 'basic');
  const advancedNodes = nodeDefinitions.filter(n => n.category === 'advanced');

  return (
    <div className="w-60 border-r bg-card/50 backdrop-blur-sm flex flex-col h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Componentes</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste para o canvas ou clique
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Basic Nodes */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Básico</p>
          <div className="space-y-2">
            {basicNodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                onClick={() => onAddNode(node.type)}
                className={cn(
                  "p-3 rounded-lg border bg-background cursor-grab active:cursor-grabbing",
                  "hover:bg-accent hover:border-primary/50 transition-all",
                  "flex items-center gap-3 group"
                )}
              >
                <div className={cn("p-2 rounded-lg text-white", node.color)}>
                  {node.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block">{node.label}</span>
                  <span className="text-xs text-muted-foreground">{node.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Nodes */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Avançado</p>
          <div className="space-y-2">
            {advancedNodes.map((node) => (
              <div
                key={node.type}
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
                onClick={() => onAddNode(node.type)}
                className={cn(
                  "p-3 rounded-lg border bg-background cursor-grab active:cursor-grabbing",
                  "hover:bg-accent hover:border-primary/50 transition-all",
                  "flex items-center gap-3 group"
                )}
              >
                <div className={cn("p-2 rounded-lg text-white", node.color)}>
                  {node.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block">{node.label}</span>
                  <span className="text-xs text-muted-foreground">{node.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Conecte os nós arrastando as alças
        </p>
      </div>
    </div>
  );
}
