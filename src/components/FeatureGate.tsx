import React from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  /** The feature key to check (e.g., 'meta_ads.create_audience') */
  featureKey: string;
  /** Content to show when feature is accessible */
  children: React.ReactNode;
  /** Content to show when feature is not accessible */
  fallback?: React.ReactNode;
  /** Show a locked indicator instead of hiding content */
  showLocked?: boolean;
  /** Custom message for the locked state */
  lockedMessage?: string;
  /** Callback when upgrade is requested */
  onUpgradeClick?: () => void;
  /** Additional class name for the wrapper */
  className?: string;
}

/**
 * FeatureGate component that conditionally renders content based on feature access.
 * 
 * Usage:
 * ```tsx
 * <FeatureGate featureKey="meta_ads.create_audience">
 *   <Button>Criar Público</Button>
 * </FeatureGate>
 * 
 * <FeatureGate 
 *   featureKey="crm.segments" 
 *   showLocked 
 *   lockedMessage="Segmentação disponível no plano Pro"
 * >
 *   <SegmentManager />
 * </FeatureGate>
 * ```
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureKey,
  children,
  fallback = null,
  showLocked = false,
  lockedMessage,
  onUpgradeClick,
  className
}) => {
  const { canUse, isLoading, features } = useFeatureAccess();

  // While loading, show nothing or a skeleton
  if (isLoading) {
    return null;
  }

  const hasAccess = canUse(featureKey);

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access
  if (showLocked) {
    // Find feature name for better messaging
    const feature = features.find(f => f.feature_key === featureKey);
    const featureName = feature?.name || 'Esta funcionalidade';
    const message = lockedMessage || `${featureName} requer upgrade do plano`;

    return (
      <div className={cn('relative', className)}>
        {/* Blurred/disabled content */}
        <div className="pointer-events-none opacity-50 blur-[1px] select-none">
          {children}
        </div>
        
        {/* Overlay with lock icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded-lg">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="h-5 w-5" />
                    <span className="text-sm font-medium">Recurso bloqueado</span>
                  </div>
                  {onUpgradeClick && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={onUpgradeClick}
                      className="gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Fazer Upgrade
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{message}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }

  // Default: render fallback (or nothing)
  return <>{fallback}</>;
};

/**
 * FeatureLockedBadge - Small badge to indicate a feature is locked
 */
interface FeatureLockedBadgeProps {
  featureKey: string;
  className?: string;
}

export const FeatureLockedBadge: React.FC<FeatureLockedBadgeProps> = ({ 
  featureKey,
  className 
}) => {
  const { canUse, isLoading } = useFeatureAccess();

  if (isLoading || canUse(featureKey)) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
            'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
            className
          )}>
            <Lock className="h-3 w-3" />
            PRO
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Disponível no plano Pro</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * FeatureUpgradeButton - Button that shows when a feature requires upgrade
 */
interface FeatureUpgradeButtonProps {
  featureKey: string;
  children: React.ReactNode;
  upgradeChildren?: React.ReactNode;
  onUpgrade?: () => void;
  className?: string;
}

export const FeatureUpgradeButton: React.FC<FeatureUpgradeButtonProps> = ({
  featureKey,
  children,
  upgradeChildren,
  onUpgrade,
  className
}) => {
  const { canUse, isLoading } = useFeatureAccess();

  if (isLoading) {
    return null;
  }

  if (canUse(featureKey)) {
    return <>{children}</>;
  }

  // Show upgrade version
  if (upgradeChildren) {
    return <>{upgradeChildren}</>;
  }

  // Default upgrade button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            className={cn('gap-2 opacity-75', className)}
            onClick={onUpgrade}
          >
            <Lock className="h-4 w-4" />
            <Sparkles className="h-4 w-4 text-amber-500" />
            Upgrade
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Esta funcionalidade requer upgrade do plano</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * useFeatureGate - Hook for programmatic feature checking
 * Useful when you need to check features in event handlers or effects
 */
export const useFeatureGate = (featureKey: string) => {
  const { canUse, isLoading, features } = useFeatureAccess();
  
  const hasAccess = canUse(featureKey);
  const feature = features.find(f => f.feature_key === featureKey);
  
  return {
    hasAccess,
    isLoading,
    feature,
    featureName: feature?.name || featureKey
  };
};

export default FeatureGate;
