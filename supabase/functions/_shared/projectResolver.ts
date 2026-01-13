/**
 * SHARED: Project Resolution Helper for Edge Functions
 * =====================================================
 * This file provides a standard way to resolve project_id from X-Project-Code header.
 * 
 * Usage in edge functions:
 *   import { resolveProjectFromRequest } from '../_shared/projectResolver.ts';
 *   const { projectId, projectCode, error } = await resolveProjectFromRequest(req, supabase);
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ProjectResolutionResult {
  projectId: string | null;
  projectCode: string | null;
  error: string | null;
}

/**
 * Resolves project_id from X-Project-Code header or body.projectId fallback.
 * 
 * Priority:
 * 1. X-Project-Code header (preferred, canonical)
 * 2. body.projectId (legacy fallback)
 * 
 * @param req - The incoming request
 * @param supabase - Supabase client with service role
 * @param body - Parsed request body (optional, for fallback)
 */
export async function resolveProjectFromRequest(
  req: Request,
  supabase: SupabaseClient,
  body?: { projectId?: string }
): Promise<ProjectResolutionResult> {
  // Try X-Project-Code header first (canonical)
  const projectCode = req.headers.get('X-Project-Code');
  
  if (projectCode) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('public_code', projectCode)
      .maybeSingle();
    
    if (error || !project) {
      console.error('[projectResolver] Invalid project code:', projectCode, error);
      return {
        projectId: null,
        projectCode,
        error: `Invalid project code: ${projectCode}`
      };
    }
    
    console.log(`[projectResolver] Resolved "${projectCode}" → "${project.id}"`);
    return {
      projectId: project.id,
      projectCode,
      error: null
    };
  }
  
  // Fallback to body.projectId (legacy)
  if (body?.projectId) {
    console.warn('[projectResolver] Using legacy body.projectId - migrate to X-Project-Code header');
    return {
      projectId: body.projectId,
      projectCode: null,
      error: null
    };
  }
  
  return {
    projectId: null,
    projectCode: null,
    error: 'Project identification required. Pass X-Project-Code header or projectId in body.'
  };
}

/**
 * Validates that the requesting user has access to the project.
 * Use this for authenticated endpoints.
 */
export async function validateProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  // Check if user is project owner
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .maybeSingle();
  
  if (project?.user_id === userId) {
    return true;
  }
  
  // Check if user is project member
  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  
  return !!member;
}
