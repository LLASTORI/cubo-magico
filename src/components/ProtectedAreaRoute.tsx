import { Navigate } from 'react-router-dom';
import { useHeaderPermissions } from '@/hooks/useHeaderPermissions';
import { useProjectModules, ModuleKey } from '@/hooks/useProjectModules';
import { CubeLoader } from '@/components/CubeLoader';

type PermissionArea = 
  | 'dashboard' 
  | 'analise' 
  | 'crm' 
  | 'automacoes' 
  | 'chat_ao_vivo' 
  | 'meta_ads' 
  | 'ofertas' 
  | 'lancamentos' 
  | 'configuracoes' 
  | 'insights' 
  | 'pesquisas' 
  | 'social_listening';

interface ProtectedAreaRouteProps {
  area: PermissionArea;
  requireModule?: ModuleKey;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Protects routes based on user permissions and module enablement.
 * Use this to wrap routes that require specific area access.
 */
export function ProtectedAreaRoute({ 
  area, 
  requireModule, 
  children, 
  fallbackPath = '/' 
}: ProtectedAreaRouteProps) {
  const { permissions, isLoading: permissionsLoading } = useHeaderPermissions();
  const { isModuleEnabled, isLoading: modulesLoading } = useProjectModules();

  const isLoading = permissionsLoading || modulesLoading;

  if (isLoading) {
    return <CubeLoader message="Verificando permissões..." />;
  }

  // Check area permission
  const hasAreaAccess = permissions[area] || permissions.isOwner || permissions.isSuperAdmin;

  // Check module if required
  const moduleEnabled = !requireModule || isModuleEnabled(requireModule);

  if (!hasAreaAccess || !moduleEnabled) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
