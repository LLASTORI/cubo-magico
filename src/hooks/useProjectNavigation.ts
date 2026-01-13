import { useNavigate, useParams } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook canônico para navegação dentro de rotas de projeto.
 * 
 * REGRA DE OURO: Todas as navegações dentro de /app/:projectCode/* 
 * devem usar este hook para garantir que o projectCode seja mantido.
 * 
 * Uso:
 * const { navigateTo, projectCode } = useProjectNavigation();
 * navigateTo('/busca-rapida'); // Navega para /app/{currentProjectCode}/busca-rapida
 */
export function useProjectNavigation() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const navigate = useNavigate();

  /**
   * Navega para uma rota dentro do projeto atual.
   * O path NÃO deve incluir /app/:projectCode, apenas o path relativo.
   * 
   * @param path - Caminho relativo (ex: '/busca-rapida', 'crm/kanban')
   * @param options - Opções de navegação (replace, state)
   */
  const navigateTo = useCallback((path: string, options?: { replace?: boolean; state?: any }) => {
    if (!projectCode) {
      console.warn('[useProjectNavigation] No projectCode in URL, redirecting to /projects');
      navigate('/projects', { replace: true });
      return;
    }

    // Remove leading slash if present for consistency
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const fullPath = `/app/${projectCode}/${cleanPath}`;
    
    navigate(fullPath, options);
  }, [projectCode, navigate]);

  /**
   * Navega para outro projeto.
   * @param newProjectCode - Código público do novo projeto
   * @param path - Caminho inicial (default: 'dashboard')
   */
  const navigateToProject = useCallback((newProjectCode: string, path: string = 'dashboard') => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    navigate(`/app/${newProjectCode}/${cleanPath}`);
  }, [navigate]);

  /**
   * Gera uma URL absoluta para o projeto atual.
   * Útil para links e comparações.
   */
  const getProjectUrl = useCallback((path: string = '') => {
    if (!projectCode) return '/projects';
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/app/${projectCode}/${cleanPath}`;
  }, [projectCode]);

  return {
    projectCode,
    navigateTo,
    navigateToProject,
    getProjectUrl,
    navigate, // fallback para navegação absoluta
  };
}
