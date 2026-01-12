/**
 * FinancialTimeBadge
 * 
 * UI component for displaying financial data source indicators.
 * Shows whether data is from Core (consolidated) or Live (real-time).
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Activity, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FinancialDataMode, TrustLevel } from '@/lib/financialTimeModel';

interface FinancialTimeBadgeProps {
  mode: FinancialDataMode;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const modeConfig = {
  core: {
    icon: CheckCircle,
    label: 'Consolidado',
    emoji: '🟢',
    tooltip: 'Dados históricos já estão consolidados e são usados pela IA',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  live: {
    icon: Activity,
    label: 'Live',
    emoji: '🔵',
    tooltip: 'Dados do dia atual vêm direto das plataformas e podem mudar',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  mixed: {
    icon: AlertCircle,
    label: 'Misto',
    emoji: '🟡',
    tooltip: 'Período inclui dados consolidados e tempo real de hoje',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

export function FinancialTimeBadge({ 
  mode, 
  className, 
  showLabel = true,
  size = 'sm' 
}: FinancialTimeBadgeProps) {
  const config = modeConfig[mode];
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              'font-medium border cursor-help',
              config.className,
              sizeClasses[size],
              className
            )}
          >
            <Icon className={cn(
              size === 'sm' && 'w-3 h-3',
              size === 'md' && 'w-3.5 h-3.5',
              size === 'lg' && 'w-4 h-4'
            )} />
            {showLabel && <span>{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-start gap-2">
            <span className="text-lg">{config.emoji}</span>
            <p className="text-sm">{config.tooltip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline version for use within text
interface FinancialTimeIndicatorProps {
  mode: FinancialDataMode;
  className?: string;
}

export function FinancialTimeIndicator({ mode, className }: FinancialTimeIndicatorProps) {
  const config = modeConfig[mode];
  const Icon = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex items-center gap-1 cursor-help', className)}>
            <Icon className={cn('w-3 h-3', 
              mode === 'core' && 'text-green-600',
              mode === 'live' && 'text-blue-600',
              mode === 'mixed' && 'text-yellow-600'
            )} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Data trust indicator
interface DataTrustBadgeProps {
  trustLevel: TrustLevel;
  showAIWarning?: boolean;
  className?: string;
}

export function DataTrustBadge({ trustLevel, showAIWarning = false, className }: DataTrustBadgeProps) {
  const isCore = trustLevel === 'core';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium',
              isCore 
                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400',
              className
            )}
          >
            {isCore ? '✓ Core' : '⚠ Live'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {isCore ? (
            <p className="text-xs">Dados consolidados - seguros para IA</p>
          ) : (
            <div className="text-xs space-y-1">
              <p>Dados em tempo real - sujeitos a ajuste</p>
              {showAIWarning && (
                <p className="text-orange-600 font-medium">
                  ⚠ Não usar para análise de IA
                </p>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Live data warning banner
interface LiveDataWarningProps {
  className?: string;
  compact?: boolean;
}

export function LiveDataWarning({ className, compact = false }: LiveDataWarningProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg border',
      'bg-blue-50 border-blue-200 text-blue-700',
      'dark:bg-blue-950/30 dark:border-blue-900 dark:text-blue-300',
      compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs',
      className
    )}>
      <Activity className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>
        {compact 
          ? 'Dados de hoje em tempo real'
          : 'Dados do dia atual vêm direto das plataformas e podem mudar ao longo do dia'
        }
      </span>
    </div>
  );
}

// Core data badge for AI contexts
interface CoreDataBadgeProps {
  className?: string;
}

export function CoreDataBadge({ className }: CoreDataBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-medium gap-1',
              'bg-green-50 text-green-700 border-green-200',
              'dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
              className
            )}
          >
            <CheckCircle className="w-3 h-3" />
            Core Data
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Dados consolidados do Financial Core</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Period indicator showing which days are live
interface PeriodLiveIndicatorProps {
  liveDataDays: string[];
  className?: string;
}

export function PeriodLiveIndicator({ liveDataDays, className }: PeriodLiveIndicatorProps) {
  if (liveDataDays.length === 0) return null;
  
  return (
    <div className={cn(
      'flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400',
      className
    )}>
      <Activity className="w-3 h-3" />
      <span>
        Hoje ainda em tempo real
      </span>
    </div>
  );
}
