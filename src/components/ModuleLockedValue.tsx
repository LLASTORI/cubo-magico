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
  variant?: 'cell' | 'card' | 'inline' | 'badge' | 'status';
  /** Whether to show the lock icon */
  showLockIcon?: boolean;
  /** Placeholder text when locked (default: "-") */
  placeholder?: string;
}

/**
 * Reusable component to display module-locked values.
 * Shows the actual value when unlocked, or a locked state with tooltip when locked.
 * 
 * Variants:
 * - cell: For table cells (right-aligned, opacity)
 * - card: For card values (larger text, bold)
 * - inline: For inline text
 * - badge: For badge-style locked indicators
 * - status: For status indicators with background
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
 * // In a card with custom placeholder
 * <ModuleLockedValue 
 *   isLocked={!isHotmartEnabled} 
 *   value={<span className="text-green-600">{formatCurrency(revenue)}</span>}
 *   variant="card"
 *   placeholder="--"
 * />
 */
export function ModuleLockedValue({
  isLocked,
  value,
  tooltip = 'Módulo bloqueado. Entre em contato com o suporte.',
  className,
  variant = 'cell',
  showLockIcon = true,
  placeholder = '-',
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
        variant === 'badge' && 'px-2 py-0.5 rounded-md bg-muted/50 text-xs',
        variant === 'status' && 'px-2 py-1 rounded-md bg-muted/30 border border-muted-foreground/20',
        className
      )}
    >
      {showLockIcon && <Lock className={cn(
        variant === 'badge' ? 'w-2.5 h-2.5' : 'w-3 h-3',
        variant === 'status' && 'w-4 h-4'
      )} />}
      <span>{placeholder}</span>
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger className={cn(
        variant === 'cell' && 'flex items-center justify-end gap-1',
        variant === 'card' && 'w-full',
        variant === 'inline' && '',
        variant === 'badge' && 'inline-flex',
        variant === 'status' && 'inline-flex'
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

interface ModuleLockedCardProps {
  /** Whether the module is locked */
  isLocked: boolean;
  /** Card content when unlocked */
  children: React.ReactNode;
  /** Tooltip when locked */
  tooltip?: string;
  /** Additional class names for the wrapper */
  className?: string;
}

/**
 * Wrapper component for cards that should be dimmed/locked when module is disabled.
 */
export function ModuleLockedCard({
  isLocked,
  children,
  tooltip = 'Módulo bloqueado. Entre em contato com o suporte.',
  className,
}: ModuleLockedCardProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('opacity-60 cursor-help', className)}>
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
