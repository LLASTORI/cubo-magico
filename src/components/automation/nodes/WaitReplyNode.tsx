import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MessageCircle, AlertCircle } from 'lucide-react';

export const WaitReplyNode = memo(({ data, selected }: NodeProps) => {
  const isConfigured = data.timeout;

  return (
    <div 
      className={`
        relative p-4 rounded-xl border-2 transition-all min-w-[200px]
        bg-card shadow-lg
        ${selected ? 'border-primary shadow-xl ring-2 ring-primary/20' : 'border-border hover:border-primary/50'}
        ${!isConfigured ? 'border-dashed border-yellow-500/50' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Aguardar Resposta</div>
          <div className="text-xs text-muted-foreground truncate">
            {isConfigured 
              ? `Timeout: ${data.timeout} ${data.timeoutUnit || 'minutos'}`
              : 'Não configurado'
            }
          </div>
        </div>
        {!isConfigured && (
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        )}
      </div>

      {/* Two outputs: replied and timeout */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="replied"
        className="!w-4 !h-4 !bg-green-500 !border-2 !border-background"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="timeout"
        className="!w-4 !h-4 !bg-orange-500 !border-2 !border-background"
        style={{ left: '70%' }}
      />
      
      {/* Labels for outputs */}
      <div className="flex justify-between mt-3 px-2 text-xs text-muted-foreground">
        <span className="text-green-600">Respondeu</span>
        <span className="text-orange-600">Timeout</span>
      </div>
    </div>
  );
});

WaitReplyNode.displayName = 'WaitReplyNode';
