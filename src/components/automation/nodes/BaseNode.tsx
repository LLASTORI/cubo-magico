import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

interface BaseNodeProps {
  data: {
    label?: string;
    subtitle?: string;
    type: string;
    isConfigured?: boolean;
  };
  selected: boolean;
  icon: React.ReactNode;
  color: string;
  handles?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    conditionalOutputs?: boolean;
  };
}

export const BaseNode = memo(({ data, selected, icon, color, handles = { top: true, bottom: true } }: BaseNodeProps) => {
  return (
    <div className={cn(
      "px-4 py-3 rounded-lg border-2 min-w-[200px] bg-card shadow-lg transition-all",
      selected ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border hover:border-primary/50",
      !data.isConfigured && data.type !== 'start' && "border-dashed border-yellow-500/50"
    )}>
      {handles.top && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      )}
      
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg text-white", color)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm block">{data.label}</span>
          {data.subtitle && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{data.subtitle}</p>
          )}
        </div>
      </div>

      {handles.bottom && !handles.conditionalOutputs && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      )}

      {handles.conditionalOutputs && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background !left-[30%]"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background !left-[70%]"
          />
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground px-2">
            <span>Sim</span>
            <span>Não</span>
          </div>
        </>
      )}
    </div>
  );
});

BaseNode.displayName = 'BaseNode';
