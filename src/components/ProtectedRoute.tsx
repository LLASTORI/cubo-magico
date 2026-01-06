import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { CubeLoader } from '@/components/CubeLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { 
    loading: accessLoading, 
    hasAccess, 
    needsActivation,
    isAdmin 
  } = useAccessControl();

  // Show loading while checking auth or access
  if (authLoading || (user && accessLoading)) {
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

  // User needs to activate account (Hotmart user who hasn't set password)
  if (needsActivation && location.pathname !== '/activate') {
    return <Navigate to="/activate" replace />;
  }

  // User doesn't have access - redirect to no-access page
  // But allow access to admin panel for admins
  if (!hasAccess && !isAdmin && location.pathname !== '/no-access') {
    return <Navigate to="/no-access" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
