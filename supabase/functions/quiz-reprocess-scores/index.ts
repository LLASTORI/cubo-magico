import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReprocessRequest {
  session_id?: string;
  result_id?: string;
  quiz_id?: string;
  project_id?: string;
  dry_run?: boolean; // Se true, não persiste - apenas retorna cálculo
}

// ===== SCORING ENGINE (mesmo do quiz-public-complete) =====

function calculateWeightedVector(
  baseVector: Record<string, number>,
  weight: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(baseVector)) {
    if (typeof value === 'number') {
      result[key] = value * weight;
    }
  }
  return result;
}

function aggregateVectors(
  vectors: Array<Record<string, number>>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const vector of vectors) {
    for (const [key, value] of Object.entries(vector)) {
      result[key] = (result[key] || 0) + value;
    }
  }
  return result;
}

function normalizeVector(vector: Record<string, number>): Record<string, number> {
  const total = Object.values(vector).reduce((sum, val) => sum + Math.abs(val), 0);
  if (total === 0) return {};
  
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(vector)) {
    result[key] = Math.round((value / total) * 100) / 100;
  }
  return result;
}

function generateSummaryStub(
  normalizedTraits: Record<string, number>,
  normalizedIntents: Record<string, number>,
  quizName: string
): Record<string, any> {
  const sortedTraits = Object.entries(normalizedTraits).sort(([, a], [, b]) => b - a);
  const sortedIntents = Object.entries(normalizedIntents).sort(([, a], [, b]) => b - a);

  const topTrait = sortedTraits[0];
  const topIntent = sortedIntents[0];

  let message = 'Análise de perfil do quiz.';
  
  if (topTrait && topIntent) {
    const traitLabel = topTrait[0].charAt(0).toUpperCase() + topTrait[0].slice(1);
    const intentLabel = topIntent[0].charAt(0).toUpperCase() + topIntent[0].slice(1);
    const intentPercentage = Math.round(topIntent[1] * 100);
    
    message = `Este lead demonstra perfil "${traitLabel}" predominante com ${intentPercentage}% de intenção de "${intentLabel}".`;
  }

  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    type: 'stub',
    quiz_name: quizName,
    message,
    profile: {
      primary_trait: topTrait ? { name: topTrait[0], score: topTrait[1] } : null,
      secondary_trait: sortedTraits[1] ? { name: sortedTraits[1][0], score: sortedTraits[1][1] } : null,
      primary_intent: topIntent ? { name: topIntent[0], score: topIntent[1] } : null,
    },
    top_traits: sortedTraits.slice(0, 5).map(([name, score]) => ({ name, score })),
    top_intents: sortedIntents.slice(0, 5).map(([name, score]) => ({ name, score })),
    recommendations: [],
    ai_ready: true,
    reprocessed: true,
    reprocessed_at: new Date().toISOString(),
  };
}

async function reprocessSession(
  supabase: any,
  sessionId: string,
  dryRun: boolean
): Promise<{ success: boolean; result?: any; error?: string }> {
  // Buscar sessão
  const { data: session, error: sessionError } = await supabase
    .from('quiz_sessions')
    .select('id, quiz_id, project_id, status, contact_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return { success: false, error: 'Sessão não encontrada' };
  }

  if (session.status !== 'completed') {
    return { success: false, error: 'Apenas sessões completadas podem ser reprocessadas' };
  }

  // Buscar quiz
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, name')
    .eq('id', session.quiz_id)
    .single();

  if (!quiz) {
    return { success: false, error: 'Quiz não encontrado' };
  }

  // Buscar respostas originais
  const { data: answers } = await supabase
    .from('quiz_answers')
    .select(`
      id,
      question_id,
      option_id,
      answer_text,
      answer_value,
      created_at,
      quiz_options!quiz_answers_option_id_fkey (
        id,
        label,
        value,
        weight,
        traits_vector,
        intent_vector
      )
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  // Recalcular scores
  const traitsVectors: Array<Record<string, number>> = [];
  const intentVectors: Array<Record<string, number>> = [];
  const rawScoreData: Record<string, any> = {
    version: '1.0.0',
    calculated_at: new Date().toISOString(),
    total_answers: answers?.length || 0,
    answers_with_options: 0,
    reprocessed: true,
    weights_applied: [],
    question_scores: [],
  };

  for (const answer of (answers || [])) {
    const option = answer.quiz_options as any;
    const questionScore: Record<string, any> = {
      question_id: answer.question_id,
      option_id: answer.option_id,
      has_option: !!option,
    };

    if (option) {
      rawScoreData.answers_with_options++;
      const weight = option.weight || 1;
      rawScoreData.weights_applied.push(weight);
      questionScore.weight = weight;

      if (option.traits_vector && typeof option.traits_vector === 'object') {
        const weightedTraits = calculateWeightedVector(option.traits_vector, weight);
        traitsVectors.push(weightedTraits);
        questionScore.traits = weightedTraits;
      }

      if (option.intent_vector && typeof option.intent_vector === 'object') {
        const weightedIntents = calculateWeightedVector(option.intent_vector, weight);
        intentVectors.push(weightedIntents);
        questionScore.intents = weightedIntents;
      }
    }

    rawScoreData.question_scores.push(questionScore);
  }

  const traitsVector = aggregateVectors(traitsVectors);
  const intentVector = aggregateVectors(intentVectors);
  const normalizedTraits = normalizeVector(traitsVector);
  const normalizedIntents = normalizeVector(intentVector);

  const normalizedScore = {
    version: '1.0.0',
    traits: normalizedTraits,
    intents: normalizedIntents,
    meta: {
      total_traits: Object.keys(normalizedTraits).length,
      total_intents: Object.keys(normalizedIntents).length,
      dominant_trait: Object.entries(normalizedTraits).sort(([, a], [, b]) => b - a)[0]?.[0] || null,
      dominant_intent: Object.entries(normalizedIntents).sort(([, a], [, b]) => b - a)[0]?.[0] || null,
    },
  };

  const summary = generateSummaryStub(normalizedTraits, normalizedIntents, quiz.name);

  const calculatedResult = {
    traits_vector: traitsVector,
    intent_vector: intentVector,
    raw_score: rawScoreData,
    normalized_score: normalizedScore,
    summary,
  };

  if (dryRun) {
    return { success: true, result: { session_id: sessionId, ...calculatedResult, dry_run: true } };
  }

  // Atualizar resultado existente
  const { data: existingResult } = await supabase
    .from('quiz_results')
    .select('id')
    .eq('session_id', sessionId)
    .single();

  if (existingResult) {
    const { error: updateError } = await supabase
      .from('quiz_results')
      .update({
        traits_vector: traitsVector,
        intent_vector: intentVector,
        raw_score: rawScoreData,
        normalized_score: normalizedScore,
        summary,
      })
      .eq('id', existingResult.id);

    if (updateError) {
      return { success: false, error: 'Erro ao atualizar resultado' };
    }

    // Registrar evento de reprocessamento
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: sessionId,
        contact_id: session.contact_id,
        event_name: 'quiz_reprocessed',
        payload: {
          quiz_id: session.quiz_id,
          result_id: existingResult.id,
          previous_version: existingResult.raw_score?.version,
          new_version: '1.0.0',
        },
      });

    return { success: true, result: { session_id: sessionId, result_id: existingResult.id, ...calculatedResult } };
  } else {
    return { success: false, error: 'Resultado original não encontrado' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id, result_id, quiz_id, project_id, dry_run = false } = await req.json() as ReprocessRequest;

    console.log('[quiz-reprocess-scores] Iniciando reprocessamento', { session_id, result_id, quiz_id, project_id, dry_run });

    const results: any[] = [];

    // Reprocessar por session_id
    if (session_id) {
      const result = await reprocessSession(supabase, session_id, dry_run);
      results.push(result);
    }
    // Reprocessar por result_id
    else if (result_id) {
      const { data: quizResult } = await supabase
        .from('quiz_results')
        .select('session_id')
        .eq('id', result_id)
        .single();

      if (quizResult) {
        const result = await reprocessSession(supabase, quizResult.session_id, dry_run);
        results.push(result);
      } else {
        results.push({ success: false, error: 'Resultado não encontrado' });
      }
    }
    // Reprocessar todas as sessões de um quiz
    else if (quiz_id) {
      const { data: sessions } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('quiz_id', quiz_id)
        .eq('status', 'completed');

      for (const session of (sessions || [])) {
        const result = await reprocessSession(supabase, session.id, dry_run);
        results.push(result);
      }
    }
    // Reprocessar todas as sessões de um projeto
    else if (project_id) {
      const { data: sessions } = await supabase
        .from('quiz_sessions')
        .select('id')
        .eq('project_id', project_id)
        .eq('status', 'completed')
        .limit(100); // Limitar para evitar timeout

      for (const session of (sessions || [])) {
        const result = await reprocessSession(supabase, session.id, dry_run);
        results.push(result);
      }
    }
    else {
      return new Response(
        JSON.stringify({ error: 'session_id, result_id, quiz_id ou project_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[quiz-reprocess-scores] Concluído: ${successCount} sucesso, ${failCount} falhas`);

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        total: results.length,
        success_count: successCount,
        fail_count: failCount,
        dry_run,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[quiz-reprocess-scores] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
