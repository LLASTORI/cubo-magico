import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitFork, AlertCircle } from 'lucide-react';

const variantColors = [
  { bg: '!bg-green-500', label: 'A' },
  { bg: '!bg-blue-500', label: 'B' },
  { bg: '!bg-purple-500', label: 'C' },
  { bg: '!bg-orange-500', label: 'D' },
  { bg: '!bg-pink-500', label: 'E' },
];

export const SplitNode = memo(({ data, selected }: NodeProps) => {
  const variants = (data.variants as { name: string; percentage: number }[]) || [
    { name: 'A', percentage: 50 },
    { name: 'B', percentage: 50 }
  ];
  const variantCount = variants.length;
  const isConfigured = variantCount >= 2 && variants.reduce((sum, v) => sum + v.percentage, 0) === 100;

  // Calculate positions for handles based on variant count
  const getHandlePosition = (index: number, total: number) => {
    const spacing = 100 / (total + 1);
    return `${spacing * (index + 1)}%`;
  };

  return (
    <div 
      className={`
        relative p-4 rounded-xl border-2 transition-all min-w-[220px]
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
          <div className="font-medium text-sm">Randomizar</div>
          <div className="text-xs text-muted-foreground truncate">
            {isConfigured 
              ? `${variantCount} variantes`
              : 'Não configurado'
            }
          </div>
        </div>
        {!isConfigured && (
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        )}
      </div>

      {/* Dynamic outputs for split */}
      {variants.map((variant, index) => (
        <Handle
          key={`variant-${index}`}
          type="source"
          position={Position.Bottom}
          id={`variant-${variant.name.toLowerCase()}`}
          className={`!w-4 !h-4 ${variantColors[index]?.bg || '!bg-gray-500'} !border-2 !border-background`}
          style={{ left: getHandlePosition(index, variantCount) }}
        />
      ))}
      
      {/* Labels for outputs */}
      <div className="flex justify-between mt-4 px-1">
        {variants.map((variant, index) => (
          <div key={index} className="text-center">
            <span 
              className="text-xs font-medium"
              style={{ 
                color: index === 0 ? '#22c55e' : 
                       index === 1 ? '#3b82f6' : 
                       index === 2 ? '#a855f7' : 
                       index === 3 ? '#f97316' : '#ec4899' 
              }}
            >
              {variant.name}
            </span>
            <span className="text-[10px] text-muted-foreground block">
              {variant.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

SplitNode.displayName = 'SplitNode';
