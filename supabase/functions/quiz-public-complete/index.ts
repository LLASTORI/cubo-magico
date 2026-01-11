import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteQuizRequest {
  session_id: string;
  contact_data?: {
    name?: string;
    email?: string;
    phone?: string;
    instagram?: string;
  };
}

interface ScoringResult {
  traitsVector: Record<string, number>;
  intentVector: Record<string, number>;
  rawScore: Record<string, any>;
  normalizedScore: Record<string, any>;
  summary: Record<string, any>;
}

// ===== SCORING ENGINE =====

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
  // Normalização por soma total (cada valor / soma de todos os valores)
  const total = Object.values(vector).reduce((sum, val) => sum + Math.abs(val), 0);
  if (total === 0) return {};
  
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(vector)) {
    // Arredondar para 2 casas decimais
    result[key] = Math.round((value / total) * 100) / 100;
  }
  return result;
}

function generateSummaryStub(
  normalizedTraits: Record<string, number>,
  normalizedIntents: Record<string, number>,
  quizName: string
): Record<string, any> {
  // Ordenar traits e intents por valor
  const sortedTraits = Object.entries(normalizedTraits)
    .sort(([, a], [, b]) => b - a);
  const sortedIntents = Object.entries(normalizedIntents)
    .sort(([, a], [, b]) => b - a);

  const topTrait = sortedTraits[0];
  const topIntent = sortedIntents[0];

  // Gerar mensagem stub baseada nos resultados
  let message = 'Análise de perfil do quiz.';
  
  if (topTrait && topIntent) {
    const traitLabel = topTrait[0].charAt(0).toUpperCase() + topTrait[0].slice(1);
    const intentLabel = topIntent[0].charAt(0).toUpperCase() + topIntent[0].slice(1);
    const intentPercentage = Math.round(topIntent[1] * 100);
    
    message = `Este lead demonstra perfil "${traitLabel}" predominante com ${intentPercentage}% de intenção de "${intentLabel}".`;
  } else if (topTrait) {
    const traitLabel = topTrait[0].charAt(0).toUpperCase() + topTrait[0].slice(1);
    message = `Este lead demonstra perfil "${traitLabel}" predominante.`;
  } else if (topIntent) {
    const intentLabel = topIntent[0].charAt(0).toUpperCase() + topIntent[0].slice(1);
    message = `Este lead demonstra alta intenção de "${intentLabel}".`;
  }

  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    type: 'stub', // Será 'ai' quando IA for implementada
    quiz_name: quizName,
    message,
    profile: {
      primary_trait: topTrait ? { name: topTrait[0], score: topTrait[1] } : null,
      secondary_trait: sortedTraits[1] ? { name: sortedTraits[1][0], score: sortedTraits[1][1] } : null,
      primary_intent: topIntent ? { name: topIntent[0], score: topIntent[1] } : null,
    },
    top_traits: sortedTraits.slice(0, 5).map(([name, score]) => ({ name, score })),
    top_intents: sortedIntents.slice(0, 5).map(([name, score]) => ({ name, score })),
    recommendations: [], // Será preenchido por IA futuramente
    ai_ready: true, // Flag para indicar que pode ser reprocessado por IA
  };
}

function calculateScores(
  answers: any[],
  quizName: string
): ScoringResult {
  const traitsVectors: Array<Record<string, number>> = [];
  const intentVectors: Array<Record<string, number>> = [];
  const rawScoreData: Record<string, any> = {
    version: '1.0.0',
    calculated_at: new Date().toISOString(),
    total_answers: answers.length,
    answers_with_options: 0,
    answers_with_text: 0,
    weights_applied: [],
    question_scores: [],
  };

  for (const answer of answers) {
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

      // Aplicar peso aos vetores
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
    } else if (answer.answer_text) {
      rawScoreData.answers_with_text++;
      questionScore.answer_text = answer.answer_text;
    } else if (answer.answer_value !== null) {
      questionScore.answer_value = answer.answer_value;
    }

    rawScoreData.question_scores.push(questionScore);
  }

  // Agregar vetores
  const traitsVector = aggregateVectors(traitsVectors);
  const intentVector = aggregateVectors(intentVectors);

  // Normalizar (soma = 1)
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

  // Gerar summary stub
  const summary = generateSummaryStub(normalizedTraits, normalizedIntents, quizName);

  return {
    traitsVector,
    intentVector,
    rawScore: rawScoreData,
    normalizedScore,
    summary,
  };
}

// ===== COGNITIVE PROFILE ENGINE =====

function mergeVectors(
  existing: Record<string, number>,
  incoming: Record<string, number>,
  incomingWeight: number
): Record<string, number> {
  const result: Record<string, number> = { ...existing };
  const existingWeight = 1 - incomingWeight;
  
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  
  for (const key of allKeys) {
    const existingValue = existing[key] || 0;
    const incomingValue = incoming[key] || 0;
    result[key] = (existingValue * existingWeight) + (incomingValue * incomingWeight);
  }
  
  return result;
}

function normalizeProfileVector(vector: Record<string, number>): Record<string, number> {
  const total = Object.values(vector).reduce((sum, val) => sum + Math.abs(val), 0);
  if (total === 0) return {};
  
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(vector)) {
    result[key] = Math.round((value / total) * 10000) / 10000;
  }
  return result;
}

function calculateProfileEntropy(vector: Record<string, number>): number {
  const values = Object.values(vector).filter(v => v > 0);
  if (values.length === 0) return 0;
  
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;
  
  let entropy = 0;
  for (const value of values) {
    const p = value / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  const maxEntropy = Math.log2(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

function calculateProfileConfidence(
  totalSignals: number,
  entropy: number
): number {
  const signalConfidence = 1 - Math.exp(-totalSignals / 5);
  const entropyConfidence = 1 - entropy;
  return Math.round((signalConfidence * 0.6 + entropyConfidence * 0.4) * 10000) / 10000;
}

function calculateVectorDelta(
  before: Record<string, number>,
  after: Record<string, number>
): Record<string, number> {
  const delta: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    const beforeVal = before[key] || 0;
    const afterVal = after[key] || 0;
    const diff = afterVal - beforeVal;
    if (Math.abs(diff) > 0.0001) {
      delta[key] = Math.round(diff * 10000) / 10000;
    }
  }
  
  return delta;
}

async function updateCognitiveProfile(
  supabase: any,
  contactId: string,
  projectId: string,
  quizId: string,
  quizName: string,
  normalizedScore: Record<string, any>
) {
  try {
    const intentVector = normalizedScore.intents || {};
    const traitVector = normalizedScore.traits || {};

    // Fetch existing profile
    const { data: existingProfile } = await supabase
      .from('contact_profiles')
      .select('*')
      .eq('contact_id', contactId)
      .maybeSingle();

    let newProfile;
    let profileId: string;
    let deltaIntent: Record<string, number> = {};
    let deltaTrait: Record<string, number> = {};
    let confidenceDelta = 0;
    let entropyDelta = 0;

    if (existingProfile) {
      // Merge with existing profile
      const existingIntent = existingProfile.intent_vector || {};
      const existingTrait = existingProfile.trait_vector || {};
      const totalSignals = (existingProfile.total_signals || 0) + 1;
      
      // Calculate adjusted weight based on existing signals
      const adjustedWeight = Math.min(0.8 / (1 + existingProfile.total_signals * 0.1), 0.5);
      
      // Merge vectors
      const mergedIntent = mergeVectors(existingIntent, intentVector, adjustedWeight);
      const mergedTrait = mergeVectors(existingTrait, traitVector, adjustedWeight);
      
      // Normalize
      const normalizedIntent = normalizeProfileVector(mergedIntent);
      const normalizedTrait = normalizeProfileVector(mergedTrait);
      
      // Calculate deltas
      deltaIntent = calculateVectorDelta(existingIntent, normalizedIntent);
      deltaTrait = calculateVectorDelta(existingTrait, normalizedTrait);
      
      // Calculate new metrics
      const intentEntropy = calculateProfileEntropy(normalizedIntent);
      const traitEntropy = calculateProfileEntropy(normalizedTrait);
      const newEntropy = (intentEntropy + traitEntropy) / 2;
      const newConfidence = calculateProfileConfidence(totalSignals, newEntropy);
      
      // Calculate volatility (change magnitude)
      const intentChange = Object.values(deltaIntent).reduce((sum, v) => sum + Math.abs(v), 0);
      const traitChange = Object.values(deltaTrait).reduce((sum, v) => sum + Math.abs(v), 0);
      const newVolatility = ((intentChange + traitChange) / 2) * adjustedWeight;
      const blendedVolatility = (existingProfile.volatility_score || 0) * 0.7 + newVolatility * 0.3;
      
      confidenceDelta = newConfidence - (existingProfile.confidence_score || 0);
      entropyDelta = newEntropy - (existingProfile.entropy_score || 0);
      
      // Update signal sources
      const existingSources = existingProfile.signal_sources || [];
      const signalSources = [...new Set([...existingSources, 'quiz'])];
      
      // Update profile
      const { data: updated } = await supabase
        .from('contact_profiles')
        .update({
          intent_vector: normalizedIntent,
          trait_vector: normalizedTrait,
          confidence_score: newConfidence,
          volatility_score: Math.round(blendedVolatility * 10000) / 10000,
          entropy_score: Math.round(newEntropy * 10000) / 10000,
          total_signals: totalSignals,
          signal_sources: signalSources,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id)
        .select()
        .single();
      
      newProfile = updated;
      profileId = existingProfile.id;
    } else {
      // Create new profile
      const intentEntropy = calculateProfileEntropy(intentVector);
      const traitEntropy = calculateProfileEntropy(traitVector);
      const entropy = (intentEntropy + traitEntropy) / 2;
      const confidence = calculateProfileConfidence(1, entropy);
      
      const normalizedIntent = normalizeProfileVector(intentVector);
      const normalizedTrait = normalizeProfileVector(traitVector);
      
      deltaIntent = normalizedIntent;
      deltaTrait = normalizedTrait;
      confidenceDelta = confidence;
      entropyDelta = entropy;
      
      const { data: created } = await supabase
        .from('contact_profiles')
        .insert({
          contact_id: contactId,
          project_id: projectId,
          intent_vector: normalizedIntent,
          trait_vector: normalizedTrait,
          confidence_score: confidence,
          volatility_score: 0,
          entropy_score: Math.round(entropy * 10000) / 10000,
          total_signals: 1,
          signal_sources: ['quiz'],
        })
        .select()
        .single();
      
      newProfile = created;
      profileId = created?.id;
    }

    // Record history entry
    if (profileId) {
      await supabase
        .from('contact_profile_history')
        .insert({
          contact_profile_id: profileId,
          project_id: projectId,
          source: 'quiz',
          source_id: quizId,
          source_name: quizName,
          delta_intent_vector: deltaIntent,
          delta_trait_vector: deltaTrait,
          confidence_delta: Math.round(confidenceDelta * 10000) / 10000,
          entropy_delta: Math.round(entropyDelta * 10000) / 10000,
          profile_snapshot: newProfile || {},
          metadata: {
            quiz_id: quizId,
            quiz_name: quizName,
            normalized_score: normalizedScore,
          },
        });

      // Log CRM event
      await supabase
        .from('crm_activities')
        .insert({
          project_id: projectId,
          contact_id: contactId,
          activity_type: 'profile_updated_from_quiz',
          description: `Perfil cognitivo atualizado via quiz: ${quizName}`,
          metadata: {
            quiz_id: quizId,
            quiz_name: quizName,
            delta_intent: deltaIntent,
            delta_trait: deltaTrait,
            new_confidence: newProfile?.confidence_score,
          },
        });
    }

    console.log(`[quiz-public-complete] Perfil cognitivo atualizado para contato ${contactId}`);
    return newProfile;
  } catch (error) {
    console.error('[quiz-public-complete] Erro ao atualizar perfil cognitivo:', error);
    return null;
  }
}

// ===== CRM INTEGRATION =====

async function updateContactWithQuizResult(
  supabase: any,
  contactId: string,
  projectId: string,
  quizId: string,
  quizName: string,
  normalizedScore: Record<string, any>,
  summary: Record<string, any>
) {
  try {
    // Preparar dados de atualização para o contato
    const customFields: Record<string, any> = {};
    
    // Armazenar último resultado de quiz
    customFields.last_quiz_id = quizId;
    customFields.last_quiz_name = quizName;
    customFields.last_quiz_at = new Date().toISOString();
    customFields.quiz_profile = summary.profile;
    
    // Armazenar intent score para automações
    if (normalizedScore.meta?.dominant_intent) {
      customFields.intent_score = {
        dominant: normalizedScore.meta.dominant_intent,
        value: normalizedScore.intents[normalizedScore.meta.dominant_intent] || 0,
        updated_at: new Date().toISOString(),
      };
    }

    // Buscar custom_fields existentes
    const { data: contact } = await supabase
      .from('crm_contacts')
      .select('custom_fields')
      .eq('id', contactId)
      .single();

    const existingFields = contact?.custom_fields || {};
    
    // Merge com campos existentes
    const mergedFields = {
      ...existingFields,
      ...customFields,
      quiz_history: [
        ...(existingFields.quiz_history || []),
        {
          quiz_id: quizId,
          quiz_name: quizName,
          completed_at: new Date().toISOString(),
          profile: summary.profile,
        },
      ].slice(-10), // Manter últimos 10 quizzes
    };

    // Atualizar contato
    await supabase
      .from('crm_contacts')
      .update({
        custom_fields: mergedFields,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    // Atualizar Perfil Cognitivo (Phase 7)
    await updateCognitiveProfile(
      supabase,
      contactId,
      projectId,
      quizId,
      quizName,
      normalizedScore
    );

    console.log(`[quiz-public-complete] CRM atualizado para contato ${contactId}`);
  } catch (error) {
    console.error('[quiz-public-complete] Erro ao atualizar CRM:', error);
    // Não falhar a conclusão do quiz se a atualização do CRM falhar
  }
}

// ===== MAIN HANDLER =====

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { session_id, contact_data } = await req.json() as CompleteQuizRequest;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-public-complete] Finalizando sessão ${session_id}`);

    // 1. Verificar sessão
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select('id, quiz_id, project_id, status, contact_id')
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'abandoned') {
      return new Response(
        JSON.stringify({ error: 'Sessão foi abandonada. Inicie um novo quiz.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'completed') {
      const { data: existingResult } = await supabase
        .from('quiz_results')
        .select('id, traits_vector, intent_vector, normalized_score, summary')
        .eq('session_id', session_id)
        .single();

      const { data: quiz } = await supabase
        .from('quizzes')
        .select('end_screen_config')
        .eq('id', session.quiz_id)
        .single();

      return new Response(
        JSON.stringify({
          session_id,
          already_completed: true,
          result: existingResult,
          end_screen_config: quiz?.end_screen_config || {},
          contact_id: session.contact_id,
          progress: { answered_questions: 0, total_questions: 0, progress_percentage: 100 },
          is_last_question: true,
          requires_identification: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, name, requires_identification, allow_anonymous, end_screen_config')
      .eq('id', session.quiz_id)
      .single();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({ error: 'Quiz não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Verificar identificação obrigatória
    if (quiz.requires_identification && !quiz.allow_anonymous && !session.contact_id && !contact_data?.email) {
      return new Response(
        JSON.stringify({ error: 'Identificação obrigatória', requires_identification: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Buscar todas as respostas com opções
    const { data: answers, error: answersError } = await supabase
      .from('quiz_answers')
      .select(`
        id,
        question_id,
        option_id,
        answer_text,
        answer_value,
        created_at,
        quiz_options (
          id,
          label,
          value,
          weight,
          traits_vector,
          intent_vector
        )
      `)
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (answersError) {
      console.error('[quiz-public-complete] Erro ao buscar respostas:', answersError);
    }

    // 5. CALCULAR SCORES usando o engine
    const { traitsVector, intentVector, rawScore, normalizedScore, summary } = 
      calculateScores(answers || [], quiz.name);

    console.log('[quiz-public-complete] Scores calculados:', {
      traits: Object.keys(traitsVector).length,
      intents: Object.keys(intentVector).length,
    });

    // 6. Criar/atualizar contato
    let contactId = session.contact_id;
    
    if (contact_data && (contact_data.email || contact_data.phone)) {
      if (contact_data.email) {
        const { data: existingContact } = await supabase
          .from('crm_contacts')
          .select('id')
          .eq('project_id', session.project_id)
          .eq('email', contact_data.email)
          .maybeSingle();

        if (existingContact) {
          contactId = existingContact.id;
          await supabase
            .from('crm_contacts')
            .update({
              name: contact_data.name || undefined,
              phone: contact_data.phone || undefined,
              instagram: contact_data.instagram || undefined,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', contactId);
        } else {
          const { data: newContact, error: contactError } = await supabase
            .from('crm_contacts')
            .insert({
              project_id: session.project_id,
              name: contact_data.name || null,
              email: contact_data.email,
              phone: contact_data.phone || null,
              instagram: contact_data.instagram || null,
              source: 'quiz',
              tags: ['quiz'],
            })
            .select('id')
            .single();

          if (!contactError && newContact) {
            contactId = newContact.id;
          }
        }
      }

      if (contactId && contactId !== session.contact_id) {
        await supabase
          .from('quiz_sessions')
          .update({ contact_id: contactId })
          .eq('id', session_id);

        await supabase
          .from('quiz_events')
          .insert({
            project_id: session.project_id,
            session_id: session_id,
            contact_id: contactId,
            event_name: 'quiz_identified',
            payload: {
              quiz_id: session.quiz_id,
              has_email: !!contact_data.email,
              has_phone: !!contact_data.phone,
              has_instagram: !!contact_data.instagram,
            },
          });
      }
    }

    // 7. Criar resultado
    const { data: result, error: resultError } = await supabase
      .from('quiz_results')
      .insert({
        session_id: session_id,
        project_id: session.project_id,
        traits_vector: traitsVector,
        intent_vector: intentVector,
        raw_score: rawScore,
        normalized_score: normalizedScore,
        summary: summary,
      })
      .select('id, traits_vector, intent_vector, normalized_score, summary')
      .single();

    if (resultError) {
      console.error('[quiz-public-complete] Erro ao criar resultado:', resultError);
      return new Response(
        JSON.stringify({ error: 'Erro ao calcular resultado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Atualizar sessão
    await supabase
      .from('quiz_sessions')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        contact_id: contactId,
      })
      .eq('id', session_id);

    // 9. Registrar evento quiz_scored (novo!)
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: session_id,
        contact_id: contactId,
        event_name: 'quiz_scored',
        payload: {
          quiz_id: session.quiz_id,
          quiz_name: quiz.name,
          result_id: result.id,
          traits_vector: traitsVector,
          intent_vector: intentVector,
          normalized_score: normalizedScore,
          summary_type: summary.type,
        },
      });

    // 10. Registrar evento quiz_completed
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id: session_id,
        contact_id: contactId,
        event_name: 'quiz_completed',
        payload: {
          quiz_id: session.quiz_id,
          quiz_name: quiz.name,
          total_answers: answers?.length || 0,
          has_contact: !!contactId,
          dominant_trait: normalizedScore.meta?.dominant_trait,
          dominant_intent: normalizedScore.meta?.dominant_intent,
        },
      });

    // 11. Integração CRM se tiver contato
    if (contactId) {
      await updateContactWithQuizResult(
        supabase,
        contactId,
        session.project_id,
        session.quiz_id,
        quiz.name,
        normalizedScore,
        summary
      );

      // 11.1 Registrar evento quiz_attached_to_contact
      await supabase
        .from('quiz_events')
        .insert({
          project_id: session.project_id,
          session_id: session_id,
          contact_id: contactId,
          event_name: 'quiz_attached_to_contact',
          payload: {
            quiz_id: session.quiz_id,
            quiz_name: quiz.name,
            traits_vector: traitsVector,
            intent_vector: intentVector,
            normalized_score: normalizedScore,
            summary: summary,
          },
        });

      // 11.2 Registrar atividade no CRM
      await supabase
        .from('crm_activities')
        .insert({
          project_id: session.project_id,
          contact_id: contactId,
          activity_type: 'quiz_completed',
          description: `Lead respondeu ao quiz: ${quiz.name}`,
          metadata: {
            quiz_id: session.quiz_id,
            session_id: session_id,
            result_id: result.id,
            dominant_trait: normalizedScore.meta?.dominant_trait,
            dominant_intent: normalizedScore.meta?.dominant_intent,
          },
        });
    }

    console.log(`[quiz-public-complete] Sessão ${session_id} finalizada com sucesso`);

    // 12. Buscar total de perguntas
    const { count: totalQuestions } = await supabase
      .from('quiz_questions')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', session.quiz_id);

    // 13. Retornar estrutura padronizada
    return new Response(
      JSON.stringify({
        session_id,
        result: {
          id: result.id,
          traits_vector: result.traits_vector,
          intent_vector: result.intent_vector,
          normalized_score: result.normalized_score,
          summary: result.summary,
        },
        end_screen_config: quiz.end_screen_config || {},
        contact_id: contactId,
        progress: {
          answered_questions: totalQuestions || 0,
          total_questions: totalQuestions || 0,
          progress_percentage: 100,
        },
        is_last_question: true,
        requires_identification: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[quiz-public-complete] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
