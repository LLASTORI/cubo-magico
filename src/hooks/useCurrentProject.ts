import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  public_code: string;
  created_at: string;
  updated_at: string;
}

interface UseCurrentProjectResult {
  project: Project | null;
  projectCode: string | null;
  isLoading: boolean;
  error: Error | null;
  hasAccess: boolean;
}

/**
 * Hook canônico para obter o projeto ativo a partir da URL.
 * 
 * REGRA DE OURO: O projeto ativo SEMPRE vem da URL (/app/:projectCode/*)
 * Nunca de localStorage, React state, ou heurísticas.
 * 
 * Este hook:
 * 1. Lê o projectCode do useParams()
 * 2. Busca o projeto no banco por public_code
 * 3. Valida que o usuário tem acesso
 * 4. Redireciona para /projects se não tiver acesso
 */
export function useCurrentProject(): UseCurrentProjectResult {
  const { projectCode } = useParams<{ projectCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: projectData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project-by-code', projectCode],
    queryFn: async () => {
      if (!projectCode) {
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
      if (project.user_id === user?.id) {
        return { project, hasAccess: true };
      }

      // Verificar se o usuário é membro
      const { data: membership } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', user?.id)
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

  // Redirecionar se não tiver acesso
  useEffect(() => {
    if (!isLoading && projectCode && !projectData?.hasAccess) {
      console.warn('[useCurrentProject] No access to project, redirecting to /projects');
      navigate('/projects', { replace: true });
    }
  }, [isLoading, projectCode, projectData?.hasAccess, navigate]);

  return {
    project: projectData?.project ?? null,
    projectCode: projectCode ?? null,
    isLoading,
    error: error as Error | null,
    hasAccess: projectData?.hasAccess ?? false,
  };
}

/**
 * Hook para navegar entre rotas mantendo o projectCode atual.
 * 
 * Uso:
 * const { navigateToProject } = useProjectNavigation();
 * navigateToProject('/busca-rapida'); // Navega para /app/{currentProjectCode}/busca-rapida
 */
export function useProjectNavigation() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const navigate = useNavigate();

  const navigateToProject = (path: string, options?: { replace?: boolean }) => {
    if (!projectCode) {
      console.warn('[useProjectNavigation] No projectCode in URL, cannot navigate');
      navigate('/projects', { replace: true });
      return;
    }

    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    navigate(`/app/${projectCode}/${cleanPath}`, options);
  };

  const navigateToProjectRoot = (newProjectCode: string, path: string = 'dashboard') => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    navigate(`/app/${newProjectCode}/${cleanPath}`);
  };

  return {
    projectCode,
    navigateToProject,
    navigateToProjectRoot,
  };
}
