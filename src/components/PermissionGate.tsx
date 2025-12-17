import { ReactNode } from 'react';
import { useHasPermission, PermissionArea, PermissionLevel } from '@/hooks/useMemberPermissions';
import { Lock } from 'lucide-react';

interface PermissionGateProps {
  area: PermissionArea;
  minLevel?: PermissionLevel;
  children: ReactNode;
  fallback?: ReactNode;
  showLocked?: boolean;
}

export const PermissionGate = ({ 
  area, 
  minLevel = 'view', 
  children, 
  fallback,
  showLocked = false,
}: PermissionGateProps) => {
  const { hasPermission, isLoading } = useHasPermission(area, minLevel);

  if (isLoading) {
    return null;
  }

  if (!hasPermission) {
    if (showLocked) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Lock className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Acesso Restrito</p>
          <p className="text-sm">Você não tem permissão para acessar esta área.</p>
        </div>
      );
    }
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

// Hook for conditional rendering in menus
export const useCanAccessArea = (area: PermissionArea, minLevel: PermissionLevel = 'view') => {
  const { hasPermission, isLoading } = useHasPermission(area, minLevel);
  return { canAccess: hasPermission, isLoading };
};
