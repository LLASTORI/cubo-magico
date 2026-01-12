// Cognitive Rebuild Engine
// Rebuilds cognitive profiles using only the latest result per quiz (no inflation)

import { supabase } from '@/integrations/supabase/client';

export interface RebuildResult {
  success: boolean;
  profileId: string | null;
  contactId: string;
  quizzesProcessed: number;
  traits: Record<string, number>;
  intents: Record<string, number>;
  confidence: number;
  errors: string[];
}

export interface QuizLatestResult {
  result_id: string;
  session_id: string;
  quiz_id: string;
  contact_id: string;
  project_id: string;
  traits_vector: Record<string, number>;
  intent_vector: Record<string, number>;
  normalized_score: number;
  raw_score: number;
  summary: Record<string, any>;
  result_created_at: string;
  quiz_name: string;
  quiz_type: string;
}

/**
 * Fetch latest results per quiz for a contact using raw RPC approach
 */
export async function getContactLatestQuizResults(contactId: string, projectId: string): Promise<QuizLatestResult[]> {
  // Use raw query to avoid type depth issues with the view
  const { data, error } = await supabase.rpc('get_contact_latest_quiz_results' as any, {
    p_contact_id: contactId,
    p_project_id: projectId
  });

  // If RPC doesn't exist, fall back to direct query
  if (error) {
    // Fallback: query using regular tables with grouping logic
    const { data: sessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select(`
        id,
        quiz_id,
        contact_id,
        project_id,
        quiz:quizzes(name, type),
        quiz_results(id, traits_vector, intent_vector, normalized_score, raw_score, summary, created_at)
      `)
      .eq('contact_id', contactId)
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (sessionsError) throw sessionsError;
    if (!sessions) return [];

    // Group by quiz_id and take only the most recent
    const quizMap = new Map<string, QuizLatestResult>();
    
    for (const session of sessions) {
      const result = (session.quiz_results as any)?.[0];
      if (!result) continue;
      
      const quizId = session.quiz_id;
      if (quizMap.has(quizId)) continue; // Already have a more recent one
      
      const quiz = session.quiz as any;
      quizMap.set(quizId, {
        result_id: result.id,
        session_id: session.id,
        quiz_id: quizId,
        contact_id: session.contact_id!,
        project_id: session.project_id,
        traits_vector: (result.traits_vector as Record<string, number>) || {},
        intent_vector: (result.intent_vector as Record<string, number>) || {},
        normalized_score: result.normalized_score || 0,
        raw_score: result.raw_score || 0,
        summary: (result.summary as Record<string, any>) || {},
        result_created_at: result.created_at,
        quiz_name: quiz?.name || 'Quiz',
        quiz_type: quiz?.type || 'lead',
      });
    }
    
    return Array.from(quizMap.values());
  }
  
  return (data || []).map((row: any) => ({
    result_id: row.result_id,
    session_id: row.session_id,
    quiz_id: row.quiz_id,
    contact_id: row.contact_id,
    project_id: row.project_id,
    traits_vector: (row.traits_vector as Record<string, number>) || {},
    intent_vector: (row.intent_vector as Record<string, number>) || {},
    normalized_score: row.normalized_score || 0,
    raw_score: row.raw_score || 0,
    summary: (row.summary as Record<string, any>) || {},
    result_created_at: row.result_created_at,
    quiz_name: row.quiz_name,
    quiz_type: row.quiz_type,
  }));
}

/**
 * Merge vectors from multiple quizzes into a unified profile
 * Each quiz contributes equally (no inflation from multiple sessions)
 */
function mergeQuizVectors(results: QuizLatestResult[]): { traits: Record<string, number>; intents: Record<string, number> } {
  if (results.length === 0) {
    return { traits: {}, intents: {} };
  }

  const traits: Record<string, number[]> = {};
  const intents: Record<string, number[]> = {};

  // Collect all values per key
  results.forEach(result => {
    Object.entries(result.traits_vector || {}).forEach(([key, value]) => {
      if (!traits[key]) traits[key] = [];
      traits[key].push(value);
    });

    Object.entries(result.intent_vector || {}).forEach(([key, value]) => {
      if (!intents[key]) intents[key] = [];
      intents[key].push(value);
    });
  });

  // Average each key
  const avgTraits: Record<string, number> = {};
  Object.entries(traits).forEach(([key, values]) => {
    avgTraits[key] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  const avgIntents: Record<string, number> = {};
  Object.entries(intents).forEach(([key, values]) => {
    avgIntents[key] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  // Normalize vectors to sum to ~100
  const normalizeVector = (vec: Record<string, number>): Record<string, number> => {
    const total = Object.values(vec).reduce((a, b) => a + Math.abs(b), 0);
    if (total === 0) return vec;
    const normalized: Record<string, number> = {};
    Object.entries(vec).forEach(([key, value]) => {
      normalized[key] = Math.round((value / total) * 100);
    });
    return normalized;
  };

  return {
    traits: normalizeVector(avgTraits),
    intents: normalizeVector(avgIntents),
  };
}

/**
 * Calculate entropy of a vector (measure of uncertainty)
 */
function calculateEntropy(vector: Record<string, number>): number {
  const values = Object.values(vector);
  if (values.length === 0) return 1;
  
  const total = values.reduce((a, b) => a + Math.abs(b), 0);
  if (total === 0) return 1;
  
  const normalized = values.map(v => Math.abs(v) / total);
  const entropy = -normalized
    .filter(p => p > 0)
    .reduce((sum, p) => sum + p * Math.log2(p), 0);
  
  const maxEntropy = Math.log2(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Rebuild cognitive profile for a single contact
 */
export async function rebuildContactProfile(contactId: string, projectId: string): Promise<RebuildResult> {
  try {
    // Get latest quiz results for this contact
    const latestResults = await getContactLatestQuizResults(contactId, projectId);
    
    if (latestResults.length === 0) {
      // No quiz results - delete profile if exists
      await supabase
        .from('contact_profiles')
        .delete()
        .eq('contact_id', contactId)
        .eq('project_id', projectId);
      
      return {
        success: true,
        profileId: null,
        contactId,
        quizzesProcessed: 0,
        traits: {},
        intents: {},
        confidence: 0,
        errors: [],
      };
    }

    // Merge vectors from all quizzes (each quiz = 1 signal)
    const { traits, intents } = mergeQuizVectors(latestResults);
    
    // Calculate metrics
    const entropy = (calculateEntropy(traits) + calculateEntropy(intents)) / 2;
    const quizCount = latestResults.length;
    const confidence = Math.min(0.95, 0.5 + (quizCount * 0.1) + ((1 - entropy) * 0.2));
    
    // Build signal sources
    const signalSources = ['quiz'];
    
    // Upsert profile
    const { data: existing } = await supabase
      .from('contact_profiles')
      .select('id')
      .eq('contact_id', contactId)
      .eq('project_id', projectId)
      .maybeSingle();

    let profileId: string;

    if (existing) {
      // Update existing profile
      await supabase
        .from('contact_profiles')
        .update({
          trait_vector: traits,
          intent_vector: intents,
          confidence_score: confidence,
          entropy_score: entropy,
          volatility_score: 0.1,
          total_signals: quizCount,
          signal_sources: signalSources,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      profileId = existing.id;
    } else {
      // Create new profile
      const { data: newProfile, error } = await supabase
        .from('contact_profiles')
        .insert({
          contact_id: contactId,
          project_id: projectId,
          trait_vector: traits,
          intent_vector: intents,
          confidence_score: confidence,
          entropy_score: entropy,
          volatility_score: 0.1,
          total_signals: quizCount,
          signal_sources: signalSources,
        })
        .select('id')
        .single();
      
      if (error) throw error;
      profileId = newProfile.id;
    }

    return {
      success: true,
      profileId,
      contactId,
      quizzesProcessed: quizCount,
      traits,
      intents,
      confidence,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      profileId: null,
      contactId,
      quizzesProcessed: 0,
      traits: {},
      intents: {},
      confidence: 0,
      errors: [error.message],
    };
  }
}

/**
 * Rebuild all profiles for a project
 */
export async function rebuildAllProfiles(projectId: string): Promise<{
  success: boolean;
  profilesRebuilt: number;
  profilesDeleted: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let profilesRebuilt = 0;
  let profilesDeleted = 0;

  try {
    // Get all contacts with completed quiz sessions
    const { data: sessionsData } = await supabase
      .from('quiz_sessions')
      .select('contact_id')
      .eq('project_id', projectId)
      .eq('status', 'completed')
      .not('contact_id', 'is', null);

    const contactIds = [...new Set((sessionsData || []).map(s => s.contact_id).filter(Boolean))] as string[];

    // Rebuild each contact's profile
    for (const contactId of contactIds) {
      const result = await rebuildContactProfile(contactId, projectId);
      if (result.success) {
        if (result.quizzesProcessed > 0) {
          profilesRebuilt++;
        } else {
          profilesDeleted++;
        }
      } else {
        errors.push(`Contact ${contactId}: ${result.errors.join(', ')}`);
      }
    }

    // Delete orphaned profiles (contacts with no quiz data)
    const { data: allProfiles } = await supabase
      .from('contact_profiles')
      .select('id, contact_id')
      .eq('project_id', projectId);

    const contactIdsWithQuizzes = new Set(contactIds);
    const orphanedProfiles = (allProfiles || []).filter(p => !contactIdsWithQuizzes.has(p.contact_id));

    for (const profile of orphanedProfiles) {
      await supabase
        .from('contact_profiles')
        .delete()
        .eq('id', profile.id);
      profilesDeleted++;
    }

    return { success: true, profilesRebuilt, profilesDeleted, errors };
  } catch (error: any) {
    return { success: false, profilesRebuilt, profilesDeleted, errors: [error.message] };
  }
}

/**
 * Reset quiz data for a specific quiz
 */
export async function resetQuizData(quizId: string, projectId: string): Promise<{
  success: boolean;
  deleted: {
    sessions: number;
    answers: number;
    results: number;
    outcomeLogs: number;
    profileHistory: number;
    predictions: number;
  };
  errors: string[];
}> {
  const deleted = {
    sessions: 0,
    answers: 0,
    results: 0,
    outcomeLogs: 0,
    profileHistory: 0,
    predictions: 0,
  };
  const errors: string[] = [];

  try {
    // Get sessions for this quiz
    const { data: sessions } = await supabase
      .from('quiz_sessions')
      .select('id, contact_id')
      .eq('quiz_id', quizId)
      .eq('project_id', projectId);

    if (!sessions || sessions.length === 0) {
      return { success: true, deleted, errors };
    }

    const contactIds = [...new Set(sessions.filter(s => s.contact_id).map(s => s.contact_id!))] as string[];

    // Delete related data for each session individually to avoid type issues
    for (const session of sessions) {
      const sessionId = session.id;
      
      // Delete quiz_outcome_logs (use type assertion to avoid depth issues)
      const { data: logs } = await (supabase
        .from('quiz_outcome_logs') as any)
        .select('id')
        .eq('session_id', sessionId);
      if (logs?.length) {
        await (supabase.from('quiz_outcome_logs') as any).delete().eq('session_id', sessionId);
        deleted.outcomeLogs += logs.length;
      }

      // Delete quiz_results
      const { data: results } = await (supabase
        .from('quiz_results') as any)
        .select('id')
        .eq('session_id', sessionId);
      if (results?.length) {
        await (supabase.from('quiz_results') as any).delete().eq('session_id', sessionId);
        deleted.results += results.length;
      }

      // Delete quiz_answers
      const { data: answers } = await (supabase
        .from('quiz_answers') as any)
        .select('id')
        .eq('session_id', sessionId);
      if (answers?.length) {
        await (supabase.from('quiz_answers') as any).delete().eq('session_id', sessionId);
        deleted.answers += answers.length;
      }

      // Delete contact_profile_history for this session
      const { data: history } = await (supabase
        .from('contact_profile_history') as any)
        .select('id')
        .eq('source', 'quiz')
        .eq('source_id', sessionId);
      if (history?.length) {
        for (const h of history) {
          await (supabase.from('contact_profile_history') as any).delete().eq('id', h.id);
        }
        deleted.profileHistory += history.length;
      }

      // Delete the session
      await (supabase.from('quiz_sessions') as any).delete().eq('id', sessionId);
      deleted.sessions++;
    }

    // Delete predictions for affected contacts
    for (const contactId of contactIds) {
      const { data: predictions } = await (supabase
        .from('contact_predictions') as any)
        .select('id')
        .eq('contact_id', contactId)
        .eq('project_id', projectId);
      if (predictions?.length) {
        for (const p of predictions) {
          await (supabase.from('contact_predictions') as any).delete().eq('id', p.id);
        }
        deleted.predictions += predictions.length;
      }
    }

    // Rebuild profiles for affected contacts
    for (const contactId of contactIds) {
      await rebuildContactProfile(contactId, projectId);
    }

    return { success: true, deleted, errors };
  } catch (error: any) {
    return { success: false, deleted, errors: [error.message] };
  }
}

/**
 * Delete quiz and all its data completely
 */
export async function deleteQuizComplete(quizId: string, projectId: string): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // First reset all quiz data
    const resetResult = await resetQuizData(quizId, projectId);
    if (!resetResult.success) {
      errors.push(...resetResult.errors);
    }

    // Delete quiz_outcomes
    await (supabase.from('quiz_outcomes') as any).delete().eq('quiz_id', quizId);

    // Delete quiz_options (via questions)
    const { data: questions } = await (supabase
      .from('quiz_questions') as any)
      .select('id')
      .eq('quiz_id', quizId);
    
    if (questions?.length) {
      for (const q of questions) {
        await (supabase.from('quiz_options') as any).delete().eq('question_id', q.id);
      }
    }

    // Delete quiz_questions
    await (supabase.from('quiz_questions') as any).delete().eq('quiz_id', quizId);

    // Delete the quiz itself
    await (supabase.from('quizzes') as any).delete().eq('id', quizId);

    return { success: true, errors };
  } catch (error: any) {
    return { success: false, errors: [error.message, ...errors] };
  }
}
