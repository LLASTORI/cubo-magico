import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ListOrdered, AlertCircle } from 'lucide-react';

const optionColors = [
  { bg: '!bg-green-500', label: '1' },
  { bg: '!bg-blue-500', label: '2' },
  { bg: '!bg-purple-500', label: '3' },
  { bg: '!bg-orange-500', label: '4' },
  { bg: '!bg-pink-500', label: '5' },
  { bg: '!bg-cyan-500', label: '6' },
];

export const MenuNode = memo(({ data, selected }: NodeProps) => {
  const options = (data.options as { text: string; value: string }[]) || [];
  const optionCount = options.length;
  const isConfigured = optionCount >= 2 && data.message;

  // Calculate positions for handles based on option count
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
        <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600">
          <ListOrdered className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Menu de Escolhas</div>
          <div className="text-xs text-muted-foreground truncate">
            {isConfigured 
              ? `${optionCount} opções`
              : 'Não configurado'
            }
          </div>
        </div>
        {!isConfigured && (
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
        )}
      </div>

      {/* Preview of message */}
      {data.message && (
        <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded truncate">
          {String(data.message).substring(0, 40)}...
        </div>
      )}

      {/* Dynamic outputs for each option */}
      {options.map((option, index) => (
        <Handle
          key={`option-${index}`}
          type="source"
          position={Position.Bottom}
          id={`option-${index}`}
          className={`!w-4 !h-4 ${optionColors[index]?.bg || '!bg-gray-500'} !border-2 !border-background`}
          style={{ left: getHandlePosition(index, optionCount) }}
        />
      ))}
      
      {/* Labels for outputs */}
      {options.length > 0 && (
        <div className="flex justify-between mt-4 px-1">
          {options.map((option, index) => (
            <div key={index} className="text-center max-w-[60px]">
              <span 
                className="text-xs font-medium"
                style={{ 
                  color: index === 0 ? '#22c55e' : 
                         index === 1 ? '#3b82f6' : 
                         index === 2 ? '#a855f7' : 
                         index === 3 ? '#f97316' : 
                         index === 4 ? '#ec4899' : '#06b6d4'
                }}
              >
                {index + 1}
              </span>
              <span className="text-[10px] text-muted-foreground block truncate" title={option.text}>
                {option.text.substring(0, 10)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeout handle */}
      {isConfigured && data.timeout_minutes && (
        <Handle
          type="source"
          position={Position.Right}
          id="timeout"
          className="!w-4 !h-4 !bg-red-500 !border-2 !border-background"
          style={{ top: '50%' }}
        />
      )}
    </div>
  );
});

MenuNode.displayName = 'MenuNode';
