import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Globe, AlertCircle } from 'lucide-react';

export const HttpRequestNode = memo(({ data, selected }: NodeProps) => {
  const isConfigured = data.url && data.method;

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
        <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600">
          <Globe className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">HTTP Request</div>
          <div className="text-xs text-muted-foreground truncate">
            {isConfigured ? `${data.method} ${data.url}` : 'Não configurado'}
          </div>
        </div>
        {!isConfigured && (
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !bg-primary !border-2 !border-background"
      />
    </div>
  );
});

HttpRequestNode.displayName = 'HttpRequestNode';
