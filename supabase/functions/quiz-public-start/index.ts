import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartQuizRequest {
  quiz_id: string;
  utm_data?: Record<string, string>;
  contact_id?: string;
}

interface QuizQuestion {
  id: string;
  order_index: number;
  type: string;
  title: string;
  subtitle: string | null;
  is_required: boolean;
  is_hidden: boolean;
  visibility_type: string;
  config: Record<string, any> | null;
  dynamic_weight_rules: any[];
  quiz_options: Array<{
    id: string;
    label: string;
    value: string;
    order_index: number;
    next_question_id: string | null;
    next_block_id: string | null;
    end_quiz: boolean;
  }>;
}

interface QuizCondition {
  id: string;
  question_id: string;
  condition_type: string;
  condition_payload: Record<string, any>;
  logical_operator: string;
  group_id: string | null;
  order_index: number;
  is_active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { quiz_id, utm_data, contact_id } = await req.json() as StartQuizRequest;

    if (!quiz_id) {
      return new Response(
        JSON.stringify({ error: 'quiz_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-public-start] Iniciando quiz ${quiz_id}`);

    // 1. Verificar se o quiz existe e está ativo
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        id, project_id, name, is_active, 
        requires_identification, allow_anonymous, 
        theme_config, start_screen_config, end_screen_config,
        flow_type, adaptive_config, enable_pixel_events
      `)
      .eq('id', quiz_id)
      .eq('is_active', true)
      .single();

    if (quizError || !quiz) {
      console.error('[quiz-public-start] Quiz não encontrado ou inativo:', quizError);
      return new Response(
        JSON.stringify({ error: 'Quiz não encontrado ou inativo' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Capturar user-agent e IP hash
    const userAgent = req.headers.get('user-agent') || '';
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Hash do IP para privacidade
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

    // 3. Buscar perguntas do quiz (ordenadas)
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select(`
        id,
        order_index,
        type,
        title,
        subtitle,
        is_required,
        is_hidden,
        visibility_type,
        config,
        dynamic_weight_rules,
        quiz_options!quiz_options_question_id_fkey (
          id,
          label,
          value,
          order_index,
          next_question_id,
          next_block_id,
          end_quiz
        )
      `)
      .eq('quiz_id', quiz_id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('[quiz-public-start] Erro ao buscar perguntas:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allQuestions: QuizQuestion[] = (questions || []).map(q => ({
      ...q,
      is_hidden: q.is_hidden || false,
      visibility_type: q.visibility_type || 'visible',
      dynamic_weight_rules: q.dynamic_weight_rules || [],
      quiz_options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index)
    }));

    // Filter visible questions for public display
    const visibleQuestions = allQuestions.filter(q => !q.is_hidden && q.visibility_type === 'visible');
    const totalQuestions = visibleQuestions.length;

    if (totalQuestions === 0) {
      return new Response(
        JSON.stringify({ error: 'Quiz não possui perguntas visíveis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Buscar condições das perguntas (para fluxos adaptativos)
    let conditions: QuizCondition[] = [];
    if (quiz.flow_type !== 'linear') {
      const questionIds = allQuestions.map(q => q.id);
      const { data: conditionsData } = await supabase
        .from('quiz_question_conditions')
        .select('*')
        .in('question_id', questionIds)
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      
      conditions = conditionsData || [];
    }

    // 5. Determinar primeira pergunta
    const firstQuestion = findFirstVisibleQuestion(visibleQuestions, conditions, {
      contact_id: contact_id || null,
      answers: new Map(),
      accumulated_vectors: { traits: {}, intents: {} },
      visited_question_ids: [],
      skipped_question_ids: [],
    });

    // 6. Criar sessão com status = started
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id: quiz.id,
        project_id: quiz.project_id,
        contact_id: contact_id || null,
        status: 'started',
        user_agent: userAgent,
        ip_hash: ipHash,
        utm_data: utm_data || {},
        started_at: new Date().toISOString(),
        current_question_id: firstQuestion?.id || null,
        visited_question_ids: [],
        skipped_question_ids: [],
        injected_question_ids: [],
        decision_path: [],
        accumulated_vectors: { traits: {}, intents: {} },
        flow_metadata: {
          flow_type: quiz.flow_type,
          adaptive_config: quiz.adaptive_config,
        },
      })
      .select('id, status, started_at')
      .single();

    if (sessionError) {
      console.error('[quiz-public-start] Erro ao criar sessão:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Erro ao iniciar quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Registrar evento quiz_started
    await supabase
      .from('quiz_events')
      .insert({
        project_id: quiz.project_id,
        session_id: session.id,
        contact_id: contact_id || null,
        event_name: 'quiz_started',
        payload: {
          quiz_id: quiz.id,
          quiz_name: quiz.name,
          flow_type: quiz.flow_type,
          utm_data: utm_data || {},
          total_questions: totalQuestions,
          first_question_id: firstQuestion?.id,
        },
      });

    console.log(`[quiz-public-start] Sessão ${session.id} criada. Flow: ${quiz.flow_type}, ${totalQuestions} perguntas visíveis`);

    // 8. Retornar estrutura padronizada
    return new Response(
      JSON.stringify({
        session_id: session.id,
        quiz: {
          id: quiz.id,
          name: quiz.name,
          project_id: quiz.project_id,
          requires_identification: quiz.requires_identification,
          allow_anonymous: quiz.allow_anonymous,
          theme_config: quiz.theme_config,
          start_screen_config: quiz.start_screen_config,
          end_screen_config: quiz.end_screen_config,
          flow_type: quiz.flow_type,
          adaptive_config: quiz.adaptive_config,
          enable_pixel_events: quiz.enable_pixel_events,
        },
        first_question_id: firstQuestion?.id || null,
        current_question: firstQuestion,
        progress: {
          answered_questions: 0,
          total_questions: totalQuestions,
          progress_percentage: 0,
        },
        is_last_question: totalQuestions === 1,
        requires_identification: quiz.requires_identification,
        // Return visible questions for linear flows, or just first for adaptive
        questions: quiz.flow_type === 'linear' ? visibleQuestions : [firstQuestion].filter(Boolean),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-public-start] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Find the first visible question that passes all conditions
 */
function findFirstVisibleQuestion(
  questions: QuizQuestion[],
  conditions: QuizCondition[],
  context: {
    contact_id: string | null;
    answers: Map<string, any>;
    accumulated_vectors: { traits: Record<string, number>; intents: Record<string, number> };
    visited_question_ids: string[];
    skipped_question_ids: string[];
  }
): QuizQuestion | null {
  for (const question of questions) {
    const questionConditions = conditions.filter(c => c.question_id === question.id);
    
    // If no conditions, question is always available
    if (questionConditions.length === 0) {
      return question;
    }

    // Evaluate conditions
    const passed = evaluateConditions(questionConditions, context);
    if (passed) {
      return question;
    }
  }
  
  // Fallback to first question if all conditions fail
  return questions[0] || null;
}

/**
 * Simplified condition evaluation for start (full evaluation in answer endpoint)
 */
function evaluateConditions(
  conditions: QuizCondition[],
  context: {
    contact_id: string | null;
    answers: Map<string, any>;
    accumulated_vectors: { traits: Record<string, number>; intents: Record<string, number> };
    visited_question_ids: string[];
    skipped_question_ids: string[];
  }
): boolean {
  if (conditions.length === 0) return true;

  for (const condition of conditions) {
    if (!condition.is_active) continue;

    const passed = evaluateSingleCondition(condition, context);
    
    // For AND logic, all must pass
    if (condition.logical_operator === 'AND' && !passed) {
      return false;
    }
    
    // For OR logic, at least one must pass
    if (condition.logical_operator === 'OR' && passed) {
      return true;
    }
  }

  // Default to true for AND (all passed), false for OR (none passed)
  return conditions[0]?.logical_operator === 'AND';
}

function evaluateSingleCondition(
  condition: QuizCondition,
  context: {
    contact_id: string | null;
    answers: Map<string, any>;
    accumulated_vectors: { traits: Record<string, number>; intents: Record<string, number> };
    visited_question_ids: string[];
    skipped_question_ids: string[];
  }
): boolean {
  const { condition_type, condition_payload } = condition;

  switch (condition_type) {
    case 'is_identified':
      return context.contact_id !== null;

    case 'is_anonymous':
      return context.contact_id === null;

    case 'question_answered':
      return context.answers.has(condition_payload.question_id);

    case 'question_skipped':
      return context.skipped_question_ids.includes(condition_payload.question_id);

    case 'trait_gt':
      return (context.accumulated_vectors.traits[condition_payload.trait_name] ?? 0) > condition_payload.threshold;

    case 'trait_lt':
      return (context.accumulated_vectors.traits[condition_payload.trait_name] ?? 0) < condition_payload.threshold;

    case 'intent_gt':
      return (context.accumulated_vectors.intents[condition_payload.intent_name] ?? 0) > condition_payload.threshold;

    case 'intent_lt':
      return (context.accumulated_vectors.intents[condition_payload.intent_name] ?? 0) < condition_payload.threshold;

    case 'intent_range': {
      const intentValue = context.accumulated_vectors.intents[condition_payload.intent_name] ?? 0;
      return intentValue >= condition_payload.min && intentValue <= condition_payload.max;
    }

    case 'answer_equals': {
      const answer = context.answers.get(condition_payload.question_id);
      if (!answer) return false;
      return answer.option_id === condition_payload.option_id || 
             (answer.option_ids || []).includes(condition_payload.option_id);
    }

    default:
      // Unknown conditions pass by default (fail-open for start)
      return true;
  }
}
