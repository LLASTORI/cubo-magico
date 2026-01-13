import { Outlet, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CubeLoader } from '@/components/CubeLoader';
import { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, Project } from '@/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';

interface ProjectLayoutContextType {
  project: Project;
  projectCode: string;
}

const ProjectLayoutContext = createContext<ProjectLayoutContextType | null>(null);

/**
 * Hook para acessar o projeto atual dentro do layout /app/:projectCode/*
 * 
 * Este hook é a forma canônica de acessar o projeto atual.
 * Só funciona dentro de rotas que usam ProjectLayout.
 */
export function useProjectLayout(): ProjectLayoutContextType {
  const context = useContext(ProjectLayoutContext);
  if (!context) {
    throw new Error('useProjectLayout must be used within ProjectLayout routes (/app/:projectCode/*)');
  }
  return context;
}

/**
 * Layout wrapper para todas as rotas que precisam de um projeto ativo.
 * 
 * Este componente:
 * 1. Lê o projectCode da URL
 * 2. Valida que o projeto existe e o usuário tem acesso
 * 3. Sincroniza o projeto ativo com o ProjectContext
 * 4. Provê o projeto via context para todos os filhos
 * 5. Redireciona para /projects se não tiver acesso
 */
export function ProjectLayout() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const { user } = useAuth();
  const { setActiveProjectCode, projects, loading: projectsLoading } = useProject();

  // Buscar e validar acesso ao projeto
  const {
    data: projectData,
    isLoading: queryLoading,
    error,
  } = useQuery({
    queryKey: ['project-access', projectCode, user?.id],
    queryFn: async () => {
      if (!projectCode || !user) {
        return { project: null, hasAccess: false };
      }

      // Buscar projeto por public_code
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('public_code', projectCode)
        .maybeSingle();

      if (projectError) {
        throw projectError;
      }

      if (!project) {
        return { project: null, hasAccess: false };
      }

      // Verificar se o usuário é owner
      if (project.user_id === user.id) {
        return { project, hasAccess: true };
      }

      // Verificar se o usuário é membro
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .maybeSingle();

      return {
        project,
        hasAccess: !!membership,
      };
    },
    enabled: !!projectCode && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Sincronizar o código do projeto ativo com o contexto
  useEffect(() => {
    if (projectCode && projectData?.hasAccess) {
      console.log('[ProjectLayout] Setting active project code:', projectCode);
      setActiveProjectCode(projectCode);
    }
    
    // Limpar quando sair do layout
    return () => {
      // Não limpar imediatamente para evitar flicker durante navegação
    };
  }, [projectCode, projectData?.hasAccess, setActiveProjectCode]);

  const isLoading = queryLoading || projectsLoading;

  // Se não tiver projectCode na URL, redirecionar
  if (!projectCode) {
    console.warn('[ProjectLayout] No projectCode in URL');
    return <Navigate to="/projects" replace />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CubeLoader message="Carregando projeto..." />
      </div>
    );
  }

  // Se não tiver projeto ou não tiver acesso, redirecionar
  if (!projectData?.project || !projectData?.hasAccess) {
    console.warn('[ProjectLayout] No access to project:', projectCode);
    return <Navigate to="/projects" replace />;
  }

  // Render children com o projeto no context
  return (
    <ProjectLayoutContext.Provider value={{ 
      project: projectData.project, 
      projectCode 
    }}>
      <Outlet />
    </ProjectLayoutContext.Provider>
  );
}
