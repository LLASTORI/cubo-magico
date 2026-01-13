import { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { CubeLoader } from '@/components/CubeLoader';

// ============= FORENSIC DEBUG =============
const PROTECTED_ROUTE_ID = `protected_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute com arquitetura estável.
 * 
 * REGRA CRÍTICA: Este componente NUNCA pode substituir children por loader
 * após o primeiro mount. O loading deve ser overlay, não gate destrutivo.
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { 
    loading: accessLoading, 
    hasAccess, 
    needsActivation,
    isAdmin 
  } = useAccessControl();
  
  const mountedRef = useRef(false);
  const hasRenderedChildrenOnce = useRef(false);
  
  // FORENSIC: Track mount/unmount
  useEffect(() => {
    if (!mountedRef.current) {
      console.log(`%c[FORENSIC] ProtectedRoute MOUNTED - ID: ${PROTECTED_ROUTE_ID}`, 'background: #6699cc; color: white; font-size: 12px; padding: 2px;');
      console.log(`[FORENSIC] ProtectedRoute - path: ${location.pathname}`);
      mountedRef.current = true;
    }
    
    return () => {
      console.log(`%c[FORENSIC] ProtectedRoute UNMOUNTING - ID: ${PROTECTED_ROUTE_ID}`, 'background: #cc9966; color: white; font-size: 12px; padding: 2px;');
    };
  }, []);

  // Log gate state for debugging
  console.log('[GATE] authLoading:', authLoading, 'accessLoading:', accessLoading, 'hasRenderedChildrenOnce:', hasRenderedChildrenOnce.current);

  // FIRST TIME ONLY: Show loading while checking auth (before any children rendered)
  if (authLoading && !hasRenderedChildrenOnce.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Carregando..." />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // FIRST TIME ONLY: Show loading while checking access control
  if (accessLoading && !hasRenderedChildrenOnce.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Verificando acesso..." />
      </div>
    );
  }

  // User needs to activate account (Hotmart user who hasn't set password)
  if (needsActivation && location.pathname !== '/activate') {
    return <Navigate to="/activate" replace />;
  }

  // User doesn't have access - redirect to no-access page
  // But allow access to admin panel for admins
  if (!hasAccess && !isAdmin && location.pathname !== '/no-access') {
    return <Navigate to="/no-access" replace />;
  }

  // Mark that we've rendered children at least once
  hasRenderedChildrenOnce.current = true;

  // CRITICAL: After first render, NEVER replace children with loader.
  // Use overlay instead to preserve React tree and UI state.
  return (
    <>
      {children}
      {accessLoading && (
        <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <CubeLoader message="Verificando acesso..." />
        </div>
      )}
    </>
  );
};

export default ProtectedRoute;
