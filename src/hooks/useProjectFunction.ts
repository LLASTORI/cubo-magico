/**
 * USE PROJECT FUNCTION HOOK
 * ==========================
 * React hook for invoking edge functions with project context.
 * Automatically gets the project code from the current URL.
 */

import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { invokeProjectFunction, projectQueryKey } from '@/lib/projectApi';

interface UseProjectFunctionResult {
  /**
   * The current project code from the URL
   */
  projectCode: string | undefined;
  
  /**
   * Invoke an edge function with the current project context
   */
  invoke: <T = any>(functionName: string, body?: Record<string, any>) => Promise<{ data: T | null; error: Error | null }>;
  
  /**
   * Build a query key that includes the current project code
   */
  queryKey: (...rest: any[]) => any[];
  
  /**
   * Whether a project is currently selected (code exists in URL)
   */
  hasProject: boolean;
}

/**
 * Hook for invoking edge functions with automatic project context.
 * 
 * Usage:
 * ```tsx
 * const { invoke, projectCode, queryKey } = useProjectFunction();
 * 
 * // Invoke an edge function
 * const { data, error } = await invoke('hotmart-api', { action: 'sync_sales' });
 * 
 * // Build a query key
 * useQuery({
 *   queryKey: queryKey('sales', filters),
 *   queryFn: () => fetchSales(),
 * });
 * ```
 */
export function useProjectFunction(): UseProjectFunctionResult {
  const { projectCode } = useParams<{ projectCode: string }>();

  const invoke = useCallback(
    async <T = any>(functionName: string, body: Record<string, any> = {}) => {
      if (!projectCode) {
        console.error('[useProjectFunction] No project code in URL');
        return {
          data: null,
          error: new Error('Nenhum projeto selecionado. Navegue para um projeto primeiro.')
        };
      }
      
      return invokeProjectFunction<T>(projectCode, functionName, { body });
    },
    [projectCode]
  );

  const queryKey = useCallback(
    (...rest: any[]) => projectQueryKey(projectCode, ...rest),
    [projectCode]
  );

  return {
    projectCode,
    invoke,
    queryKey,
    hasProject: !!projectCode,
  };
}

/**
 * Hook that returns just the project code from URL.
 * Simpler alternative when you don't need the invoke function.
 */
export function useProjectCode(): string | undefined {
  const { projectCode } = useParams<{ projectCode: string }>();
  return projectCode;
}
