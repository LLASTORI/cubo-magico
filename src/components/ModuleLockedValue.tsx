import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ModuleLockedValueProps {
  /** Whether the module is locked (disabled) */
  isLocked: boolean;
  /** The actual value to display when unlocked */
  value: React.ReactNode;
  /** Tooltip message when locked */
  tooltip?: string;
  /** Additional class names */
  className?: string;
  /** Display variant */
  variant?: 'cell' | 'card' | 'inline';
  /** Whether to show the lock icon */
  showLockIcon?: boolean;
}

/**
 * Reusable component to display module-locked values.
 * Shows the actual value when unlocked, or a locked state with tooltip when locked.
 * 
 * @example
 * // In a table cell
 * <ModuleLockedValue 
 *   isLocked={!isMetaAdsEnabled} 
 *   value={formatCurrency(metrics.investimento)}
 *   variant="cell"
 * />
 * 
 * @example
 * // In a card
 * <ModuleLockedValue 
 *   isLocked={!isHotmartEnabled} 
 *   value={<span className="text-green-600">{formatCurrency(revenue)}</span>}
 *   variant="card"
 * />
 */
export function ModuleLockedValue({
  isLocked,
  value,
  tooltip = 'Módulo bloqueado. Entre em contato com o suporte.',
  className,
  variant = 'cell',
  showLockIcon = true,
}: ModuleLockedValueProps) {
  if (!isLocked) {
    return <>{value}</>;
  }

  const content = (
    <span
      className={cn(
        'flex items-center gap-1 text-muted-foreground',
        variant === 'cell' && 'justify-end opacity-60',
        variant === 'card' && 'text-xl font-bold',
        variant === 'inline' && 'opacity-60',
        className
      )}
    >
      {showLockIcon && <Lock className="w-3 h-3" />}
      <span>-</span>
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger className={cn(
        variant === 'cell' && 'flex items-center justify-end gap-1',
        variant === 'card' && 'w-full',
        variant === 'inline' && ''
      )}>
        {content}
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ModuleLockedHeaderProps {
  /** Whether the module is locked (disabled) */
  isLocked: boolean;
  /** The header label */
  label: string;
  /** Tooltip for the header when locked */
  lockedTooltip?: string;
  /** Tooltip for the header when unlocked */
  unlockedTooltip?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Reusable component for table headers that may be locked.
 * Shows a lock icon when the module is disabled.
 * 
 * @example
 * <ModuleLockedHeader
 *   isLocked={!isMetaAdsEnabled}
 *   label="Investimento"
 *   lockedTooltip="Módulo bloqueado"
 *   unlockedTooltip="Gasto em anúncios atribuído ao funil"
 * />
 */
export function ModuleLockedHeader({
  isLocked,
  label,
  lockedTooltip = 'Módulo bloqueado. Entre em contato com o suporte para ativar.',
  unlockedTooltip,
  className,
}: ModuleLockedHeaderProps) {
  return (
    <Tooltip>
      <TooltipTrigger className={cn('cursor-help flex items-center justify-end gap-1', className)}>
        {isLocked && <Lock className="w-3 h-3 text-muted-foreground" />}
        {label}
      </TooltipTrigger>
      <TooltipContent>
        {isLocked ? lockedTooltip : unlockedTooltip}
      </TooltipContent>
    </Tooltip>
  );
}
