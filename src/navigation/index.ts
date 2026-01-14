/**
 * @fileoverview Módulo canônico de navegação multi-tenant do Cubo Mágico.
 * 
 * ⚠️ ATENÇÃO: Este é o ÚNICO ponto de entrada válido para navegação em páginas internas.
 * 
 * NUNCA use diretamente:
 * - useNavigate() de react-router-dom
 * - <Link to="/..."> com paths absolutos
 * - navigate("/...") com paths absolutos
 * 
 * SEMPRE use:
 * - useTenantNavigation() deste módulo
 * - navigateTo() para navegar dentro do tenant
 * - navigateToProject() para trocar de projeto
 * 
 * @see ARCHITECTURE_NAVIGATION.md para documentação completa
 */

import { useProjectNavigation } from '@/hooks/useProjectNavigation';

/**
 * Hook canônico para navegação multi-tenant.
 * 
 * Este hook garante que todas as navegações mantenham o contexto do projeto
 * ativo, evitando escapes para rotas absolutas que quebram o tenant.
 * 
 * @example
 * ```tsx
 * const { navigateTo, navigateToProject, projectCode } = useTenantNavigation();
 * 
 * // ✅ Correto - navega para /app/{projectCode}/crm
 * navigateTo('/crm');
 * 
 * // ✅ Correto - navega para /app/{projectCode}/crm/contact/123
 * navigateTo('/crm/contact/123');
 * 
 * // ✅ Correto - troca de projeto
 * navigateToProject('outro_projeto', '/dashboard');
 * 
 * // ❌ ERRADO - nunca faça isso em páginas internas
 * // navigate('/crm'); // Quebra o tenant!
 * ```
 * 
 * @returns Objeto com funções de navegação seguras
 */
export function useTenantNavigation() {
  const { 
    projectCode, 
    navigateTo, 
    navigateToProject, 
    getProjectUrl,
    navigate 
  } = useProjectNavigation();

  return {
    /** Código do projeto atual */
    projectCode,
    
    /** 
     * Navega para uma rota dentro do projeto atual.
     * O path é relativo ao projeto (não inclua /app/:projectCode).
     */
    navigateTo,
    
    /** 
     * Navega para outro projeto.
     * @param newProjectCode - Código do novo projeto
     * @param path - Rota inicial (default: 'dashboard')
     */
    navigateToProject,
    
    /** 
     * Gera URL absoluta para o projeto atual.
     * Útil para links externos ou comparações.
     */
    getProjectUrl,
    
    /**
     * Navegação de fallback para rotas absolutas FORA do tenant.
     * Use APENAS para: /auth, /projects, /privacy, /terms, etc.
     * 
     * ⚠️ NUNCA use para rotas internas como /crm, /surveys, /quizzes!
     */
    navigateAbsolute: navigate,
  };
}

// Re-export types for convenience
export type TenantNavigationReturn = ReturnType<typeof useTenantNavigation>;

/**
 * Lista de rotas que são seguras para navegação absoluta (fora do tenant).
 * Qualquer outra rota deve usar navigateTo().
 */
export const SAFE_ABSOLUTE_ROUTES = [
  '/auth',
  '/projects',
  '/privacy-policy',
  '/terms-of-service',
  '/data-deletion',
  '/reset-password',
  '/forgot-password',
  '/accept-invite',
  '/activate-account',
  '/onboarding',
] as const;

/**
 * Verifica se uma rota é segura para navegação absoluta.
 */
export function isSafeAbsoluteRoute(path: string): boolean {
  return SAFE_ABSOLUTE_ROUTES.some(route => path.startsWith(route));
}
