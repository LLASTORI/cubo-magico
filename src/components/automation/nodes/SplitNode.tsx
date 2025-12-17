import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitFork, AlertCircle } from 'lucide-react';

export const SplitNode = memo(({ data, selected }: NodeProps) => {
  const isConfigured = data.splitType && (data.splitPercentage || (data.variants as any[])?.length > 0);

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
        <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600">
          <GitFork className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Split Test</div>
          <div className="text-xs text-muted-foreground truncate">
            {isConfigured 
              ? `${data.splitType === 'percentage' ? `${data.splitPercentage}% / ${100 - (Number(data.splitPercentage) || 50)}%` : 'A/B/n'}`
              : 'Não configurado'
            }
          </div>
        </div>
        {!isConfigured && (
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        )}
      </div>

      {/* Multiple outputs for split */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="variant-a"
        className="!w-4 !h-4 !bg-green-500 !border-2 !border-background"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="variant-b"
        className="!w-4 !h-4 !bg-blue-500 !border-2 !border-background"
        style={{ left: '70%' }}
      />
      
      {/* Labels for outputs */}
      <div className="flex justify-between mt-3 px-2 text-xs text-muted-foreground">
        <span>A</span>
        <span>B</span>
      </div>
    </div>
  );
});

SplitNode.displayName = 'SplitNode';
