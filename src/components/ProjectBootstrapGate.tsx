import { useEffect, useState, useRef, useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { CubeLoader } from '@/components/CubeLoader';

// ============= FORENSIC DEBUG =============
const BOOTSTRAP_GATE_ID = `gate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Rotas públicas que não precisam de projeto nem auth
const PUBLIC_ROUTES = [
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
];

// Rotas que precisam de auth mas não de projeto
const AUTH_ONLY_ROUTES = [
  '/onboarding',
  '/admin',
  '/agencia',
  '/notifications',
];

// Rotas que disparam redirect para projeto
// NOTA: /projects NÃO está aqui - é uma rota global de gestão, não de bootstrap
const BOOTSTRAP_ROUTES = ['/', '/dashboard'];

/**
 * ProjectBootstrapGate - Garante que usuário autenticado sempre tenha um projeto na URL.
 * 
 * ARQUITETURA CRÍTICA:
 * Este componente NÃO pode causar unmount de children durante:
 * - Token refresh
 * - Mudança de visibilidade da aba
 * - Qualquer evento do Supabase Auth
 * 
 * Ele apenas:
 * 1. Aguarda auth e projetos carregarem na PRIMEIRA renderização
 * 2. Redireciona para projeto se necessário
 * 3. Depois do bootstrap inicial, apenas passa children
 */
export function ProjectBootstrapGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { projects, loading: projectsLoading } = useProject();
  const location = useLocation();
  const mountedRef = useRef(false);
  const bootstrapCompleteRef = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
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

  const currentPath = location.pathname;
  
  // Calcular tipo de rota de forma memoizada
  const routeType = useMemo(() => {
    if (currentPath.startsWith('/app/')) return 'project';
    if (PUBLIC_ROUTES.some(route => currentPath.startsWith(route))) return 'public';
    if (AUTH_ONLY_ROUTES.some(route => currentPath.startsWith(route))) return 'auth-only';
    if (BOOTSTRAP_ROUTES.includes(currentPath)) return 'bootstrap';
    return 'other';
  }, [currentPath]);

  // Controlar inicialização - só roda UMA VEZ
  useEffect(() => {
    // Se já completou bootstrap, não fazer nada
    if (bootstrapCompleteRef.current) return;
    
    // Rota pública ou de projeto não precisa esperar
    if (routeType === 'public' || routeType === 'project') {
      bootstrapCompleteRef.current = true;
      setIsInitializing(false);
      return;
    }
    
    // Se não tem user e auth terminou de carregar, pode liberar (vai para /auth)
    if (!authLoading && !user) {
      bootstrapCompleteRef.current = true;
      setIsInitializing(false);
      return;
    }
    
    // Se tem user e projetos carregados, pode liberar
    if (user && !projectsLoading) {
      bootstrapCompleteRef.current = true;
      setIsInitializing(false);
      return;
    }
  }, [authLoading, user, projectsLoading, routeType]);

  // ==================== RENDER LOGIC ====================

  // 1. Durante inicialização, mostrar loader
  if (isInitializing) {
    // Rota pública - pode passar direto
    if (routeType === 'public') {
      return <>{children}</>;
    }
    
    // Aguardar auth
    if (authLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <CubeLoader message="Verificando autenticação..." />
        </div>
      );
    }
    
    // Não autenticado - deixar passar para ProtectedRoute redirecionar
    if (!user) {
      return <>{children}</>;
    }
    
    // Aguardar projetos
    if (projectsLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <CubeLoader message="Carregando projetos..." />
        </div>
      );
    }
  }

  // 2. Rota pública - sempre passa
  if (routeType === 'public') {
    return <>{children}</>;
  }

  // 3. Rota de projeto - sempre passa (validação é no ProjectLayout)
  if (routeType === 'project') {
    return <>{children}</>;
  }

  // 4. Não autenticado - deixar passar para ProtectedRoute redirecionar
  if (!user) {
    return <>{children}</>;
  }

  // 5. Rota que só precisa de auth - passa
  if (routeType === 'auth-only') {
    return <>{children}</>;
  }

  // 6. Rota de bootstrap (/, /projects, /dashboard) com projetos - redirecionar
  if (routeType === 'bootstrap' && projects.length > 0) {
    // Prioridade: último usado ou primeiro da lista
    const lastUsedCode = user.user_metadata?.last_used_project;
    const targetProject = lastUsedCode 
      ? projects.find(p => p.public_code === lastUsedCode) ?? projects[0]
      : projects[0];
    
    console.log('[ProjectBootstrapGate] Auto-redirecting to project:', targetProject.public_code);
    return <Navigate to={`/app/${targetProject.public_code}/dashboard`} replace />;
  }

  // 7. Rota de bootstrap sem projetos - mostrar tela de projetos
  if (routeType === 'bootstrap' && projects.length === 0) {
    return <>{children}</>;
  }

  // 8. Default - passar children
  return <>{children}</>;
}
