import { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { CubeLoader } from '@/components/CubeLoader';

// ============= FORENSIC DEBUG =============
const BOOTSTRAP_GATE_ID = `gate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * ProjectBootstrapGate - Garante que usuário autenticado sempre tenha um projeto na URL.
 * 
 * Este componente:
 * 1. Aguarda auth e projetos carregarem
 * 2. Se a rota atual NÃO contém projectCode, redireciona para um projeto válido
 * 3. Prioridade de seleção:
 *    - Último projeto usado (last_used_project de user_metadata)
 *    - Primeiro projeto ativo
 * 
 * REGRA DE OURO: Depois do bootstrap, a URL manda em tudo.
 */
export function ProjectBootstrapGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { projects, loading: projectsLoading } = useProject();
  const location = useLocation();
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const mountedRef = useRef(false);
  
  // FORENSIC: Track mount/unmount
  useEffect(() => {
    if (!mountedRef.current) {
      console.log(`%c[FORENSIC] ProjectBootstrapGate MOUNTED - ID: ${BOOTSTRAP_GATE_ID}`, 'background: #00cc99; color: white; font-size: 14px; padding: 4px;');
      console.log(`[FORENSIC] BootstrapGate - location: ${location.pathname}`);
      mountedRef.current = true;
    }
    
    return () => {
      console.log(`%c[FORENSIC] ProjectBootstrapGate UNMOUNTING - ID: ${BOOTSTRAP_GATE_ID}`, 'background: #cc0099; color: white; font-size: 14px; padding: 4px;');
    };
  }, []);

  // Rotas que precisam de redirect automático para projeto
  const routesNeedingProject = ['/', '/projects', '/dashboard'];
  const currentPath = location.pathname;
  
  // Se já está em uma rota de projeto, não precisa fazer nada
  const isProjectRoute = currentPath.startsWith('/app/');
  
  // Rotas públicas que não precisam de projeto
  const publicRoutes = [
    '/auth',
    '/forgot-password',
    '/reset-password',
    '/privacy-policy',
    '/terms-of-service',
    '/data-deletion',
    '/no-access',
    '/activate',
    '/accept-invite',
    '/s/',
    '/q/',
    '/onboarding',
    '/admin',
    '/agencia',
    '/notifications',
  ];
  
  const isPublicOrExemptRoute = publicRoutes.some(route => currentPath.startsWith(route));

  useEffect(() => {
    // Se não está autenticado ou está em rota pública, não precisa bootstrap
    if (!user || isPublicOrExemptRoute || isProjectRoute) {
      setBootstrapComplete(true);
      return;
    }

    // Aguardar projetos carregarem
    if (projectsLoading) {
      return;
    }

    // Se tem projetos e está em uma rota que precisa de redirect
    if (projects.length > 0 && routesNeedingProject.includes(currentPath)) {
      setBootstrapComplete(true);
      return;
    }

    setBootstrapComplete(true);
  }, [user, projects, projectsLoading, currentPath, isPublicOrExemptRoute, isProjectRoute]);

  // Ainda carregando auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Verificando autenticação..." />
      </div>
    );
  }

  // Não autenticado - deixa o ProtectedRoute lidar
  if (!user) {
    return <>{children}</>;
  }

  // Aguardando projetos
  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Carregando projetos..." />
      </div>
    );
  }

  // Rotas públicas/isentas - deixa passar
  if (isPublicOrExemptRoute || isProjectRoute) {
    return <>{children}</>;
  }

  // Se estiver em / ou /projects ou /dashboard E tiver projetos, redireciona automaticamente
  if (routesNeedingProject.includes(currentPath) && projects.length > 0) {
    // Prioridade: último usado ou primeiro da lista
    const lastUsedCode = user.user_metadata?.last_used_project;
    const targetProject = lastUsedCode 
      ? projects.find(p => p.public_code === lastUsedCode) ?? projects[0]
      : projects[0];
    
    console.log('[ProjectBootstrapGate] Auto-redirecting to project:', targetProject.public_code);
    return <Navigate to={`/app/${targetProject.public_code}/dashboard`} replace />;
  }

  // Se está em / ou /projects mas não tem projetos, mostra a tela de projetos
  if (routesNeedingProject.includes(currentPath) && projects.length === 0) {
    // Deixa renderizar a página de projetos para criar um novo
    return <>{children}</>;
  }

  // Bootstrap completo
  if (!bootstrapComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Inicializando..." />
      </div>
    );
  }

  return <>{children}</>;
}
