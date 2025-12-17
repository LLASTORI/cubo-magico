import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Tag, AlertCircle } from 'lucide-react';

export const TagNode = memo(({ data, selected }: NodeProps) => {
  const isConfigured = data.tags && (data.tags as string[]).length > 0;

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
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
          <Tag className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">
            {data.action === 'remove' ? 'Remover Tag' : 'Adicionar Tag'}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {isConfigured ? (data.tags as string[]).join(', ') : 'Não configurado'}
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

TagNode.displayName = 'TagNode';
