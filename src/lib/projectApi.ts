/**
 * PROJECT API LAYER
 * ==================
 * Canonical helper for calling Edge Functions with project context.
 * 
 * CRITICAL: This module ensures ALL edge function calls include the correct project_code
 * via the X-Project-Code header. The backend MUST resolve project_id from this code.
 * 
 * Usage:
 *   import { invokeProjectFunction } from '@/lib/projectApi';
 *   
 *   // In a component with access to projectCode
 *   const result = await invokeProjectFunction(projectCode, 'hotmart-api', { action: 'sync_sales', ... });
 */

import { supabase } from '@/integrations/supabase/client';

interface InvokeFunctionOptions {
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

interface InvokeFunctionResult<T = any> {
  data: T | null;
  error: Error | null;
}

/**
 * Invoke a Supabase Edge Function with project context.
 * 
 * @param projectCode - The project's public_code (from URL)
 * @param functionName - The edge function name (e.g., 'hotmart-api')
 * @param options - Body and optional headers
 * @returns The function response data
 */
export async function invokeProjectFunction<T = any>(
  projectCode: string,
  functionName: string,
  options: InvokeFunctionOptions = {}
): Promise<InvokeFunctionResult<T>> {
  if (!projectCode) {
    console.error('[ProjectAPI] Missing projectCode for function:', functionName);
    return {
      data: null,
      error: new Error('Project code is required for this operation')
    };
  }

  const { body = {}, headers = {} } = options;

  console.log(`[ProjectAPI] Invoking ${functionName} for project: ${projectCode}`);

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      ...headers,
      'X-Project-Code': projectCode,
    },
  });

  if (error) {
    console.error(`[ProjectAPI] Error invoking ${functionName}:`, error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Resolve project_id from project_code (for edge functions).
 * This is used ONLY in the backend. Frontend should never pass project_id directly.
 */
export async function resolveProjectId(projectCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('public_code', projectCode)
    .maybeSingle();

  if (error || !data) {
    console.error('[ProjectAPI] Failed to resolve project_id for code:', projectCode);
    return null;
  }

  return data.id;
}

/**
 * React Query key builder that includes project context.
 * Ensures cache isolation between projects.
 */
export function projectQueryKey(projectCode: string | undefined, ...rest: any[]): any[] {
  return ['project', projectCode || 'none', ...rest];
}

/**
 * Validates that a project code is in the expected format.
 */
export function isValidProjectCode(code: string | undefined): boolean {
  if (!code) return false;
  // Project codes should be lowercase alphanumeric with hyphens
  return /^[a-z0-9-]+$/.test(code);
}

// Legacy helper - for backward compatibility during migration
// DEPRECATED: Use invokeProjectFunction instead
export async function invokeWithProjectId(
  functionName: string,
  projectId: string,
  body: Record<string, any> = {},
  headers: Record<string, string> = {}
): Promise<InvokeFunctionResult> {
  console.warn('[ProjectAPI] DEPRECATED: invokeWithProjectId used. Migrate to invokeProjectFunction with project_code.');
  
  // Still passes projectId in body for backward compatibility
  // But this should be migrated to use project_code headers
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { ...body, projectId },
    headers,
  });

  return { data, error };
}
