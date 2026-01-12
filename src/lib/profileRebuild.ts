// Profile Rebuild Engine
// Ensures clean slate after data reset

export interface RebuildResult {
  success: boolean;
  profilesCleared: number;
  predictionsCleared: number;
  errors: string[];
}

export interface ResetResult {
  success: boolean;
  deleted: {
    sessions: number;
    results: number;
    profileHistory: number;
  };
  errors: string[];
}

// Rebuild profiles from clean slate for a project
export async function rebuildProfilesFromCleanSlate(projectId: string): Promise<RebuildResult> {
  // Import dynamically to avoid type depth issues
  const { supabase } = await import('@/integrations/supabase/client');
  const errors: string[] = [];
  let profilesCleared = 0;
  let predictionsCleared = 0;

  try {
    const { data: invalidProfiles } = await supabase
      .from('contact_profiles')
      .select('id')
      .eq('project_id', projectId)
      .eq('total_signals', 0);

    if (invalidProfiles && invalidProfiles.length > 0) {
      await supabase
        .from('contact_profiles')
        .delete()
        .eq('project_id', projectId)
        .eq('total_signals', 0);
      profilesCleared = invalidProfiles.length;
    }

    const { data: stalePredictions } = await supabase
      .from('contact_predictions')
      .select('id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (stalePredictions) {
      predictionsCleared = stalePredictions.length;
    }

    return { success: true, profilesCleared, predictionsCleared, errors };
  } catch (error: any) {
    return { success: false, profilesCleared, predictionsCleared, errors: [error.message] };
  }
}

// Verify clean state after reset
export async function verifyCleanState(projectId: string) {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('project_id', projectId)
    .is('contact_id', null);

  const { data: results } = await supabase
    .from('quiz_results')
    .select('id')
    .eq('project_id', projectId);

  const { data: profiles } = await supabase
    .from('contact_profiles')
    .select('id')
    .eq('project_id', projectId)
    .eq('total_signals', 0);

  return {
    isClean: !(sessions?.length || results?.length || profiles?.length),
    orphanedProfiles: profiles?.length || 0,
    orphanedSessions: sessions?.length || 0,
    orphanedResults: results?.length || 0
  };
}

// Reset quiz test data for a project (safe reset)
export async function resetQuizTestData(projectId: string): Promise<ResetResult> {
  const { supabase } = await import('@/integrations/supabase/client');
  const errors: string[] = [];
  const deleted = { sessions: 0, results: 0, profileHistory: 0 };

  try {
    // Delete quiz_results
    const { data: results } = await supabase
      .from('quiz_results')
      .select('id')
      .eq('project_id', projectId);
    
    if (results?.length) {
      await supabase.from('quiz_results').delete().eq('project_id', projectId);
      deleted.results = results.length;
    }

    // Delete quiz_sessions
    const { data: sessions } = await supabase
      .from('quiz_sessions')
      .select('id')
      .eq('project_id', projectId);
    
    if (sessions?.length) {
      await supabase.from('quiz_sessions').delete().eq('project_id', projectId);
      deleted.sessions = sessions.length;
    }

    // Delete contact_profile_history
    const { data: history } = await supabase
      .from('contact_profile_history')
      .select('id')
      .eq('project_id', projectId);
    
    if (history?.length) {
      await supabase.from('contact_profile_history').delete().eq('project_id', projectId);
      deleted.profileHistory = history.length;
    }

    await rebuildProfilesFromCleanSlate(projectId);
    return { success: true, deleted, errors };
  } catch (error: any) {
    return { success: false, deleted, errors: [error.message] };
  }
}
