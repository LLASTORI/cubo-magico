import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnswerQuizRequest {
  session_id: string;
  question_id: string;
  option_id?: string;
  option_ids?: string[];
  answer_text?: string;
  answer_value?: number;
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
    weight: number;
    traits_vector: Record<string, number>;
    intent_vector: Record<string, number>;
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

interface SessionContext {
  session_id: string;
  contact_id: string | null;
  answers: Map<string, AnswerContext>;
  accumulated_vectors: {
    traits: Record<string, number>;
    intents: Record<string, number>;
  };
  visited_question_ids: string[];
  skipped_question_ids: string[];
  current_score: number;
}

interface AnswerContext {
  question_id: string;
  option_id: string | null;
  option_ids: string[];
  answer_text: string | null;
  answer_value: number | null;
}

interface BranchDecision {
  next_question_id: string | null;
  end_quiz: boolean;
  decision_reason: string;
  event_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      session_id, 
      question_id, 
      option_id, 
      option_ids,
      answer_text, 
      answer_value 
    } = await req.json() as AnswerQuizRequest;

    if (!session_id || !question_id) {
      return new Response(
        JSON.stringify({ error: 'session_id e question_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[quiz-public-answer] Resposta para sessão ${session_id}, pergunta ${question_id}`);

    // 1. Fetch session with extended fields
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(`
        id, quiz_id, project_id, status, contact_id,
        current_question_id, visited_question_ids, skipped_question_ids,
        injected_question_ids, decision_path, accumulated_vectors, flow_metadata
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      console.error('[quiz-public-answer] Sessão não encontrada:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Sessão não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Quiz já foi finalizado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'abandoned') {
      return new Response(
        JSON.stringify({ error: 'Sessão foi abandonada. Inicie um novo quiz.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch quiz with flow settings
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, is_active, requires_identification, flow_type, adaptive_config')
      .eq('id', session.quiz_id)
      .single();

    if (quizError || !quiz || !quiz.is_active) {
      return new Response(
        JSON.stringify({ error: 'Quiz não está mais disponível' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch all questions with options (including vectors)
    const { data: allQuestions, error: questionsError } = await supabase
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
          weight,
          traits_vector,
          intent_vector,
          next_question_id,
          next_block_id,
          end_quiz
        )
      `)
      .eq('quiz_id', session.quiz_id)
      .order('order_index', { ascending: true });

    if (questionsError || !allQuestions) {
      console.error('[quiz-public-answer] Erro ao buscar perguntas:', questionsError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar quiz' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sortedQuestions: QuizQuestion[] = allQuestions.map(q => ({
      ...q,
      is_hidden: q.is_hidden || false,
      visibility_type: q.visibility_type || 'visible',
      dynamic_weight_rules: q.dynamic_weight_rules || [],
      quiz_options: (q.quiz_options || []).sort((a: any, b: any) => a.order_index - b.order_index).map((opt: any) => ({
        ...opt,
        weight: opt.weight || 0,
        traits_vector: opt.traits_vector || {},
        intent_vector: opt.intent_vector || {},
      }))
    }));

    const visibleQuestions = sortedQuestions.filter(q => !q.is_hidden && q.visibility_type === 'visible');

    // 4. Find current question
    const currentQuestion = sortedQuestions.find(q => q.id === question_id);
    if (!currentQuestion) {
      return new Response(
        JSON.stringify({ error: 'Pergunta não encontrada neste quiz' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get previous answers to build context
    const { data: previousAnswers } = await supabase
      .from('quiz_answers')
      .select('question_id, option_id, answer_text, answer_value')
      .eq('session_id', session_id);

    const answersMap = new Map<string, AnswerContext>();
    for (const ans of (previousAnswers || [])) {
      const existing = answersMap.get(ans.question_id);
      if (existing) {
        if (ans.option_id) existing.option_ids.push(ans.option_id);
      } else {
        answersMap.set(ans.question_id, {
          question_id: ans.question_id,
          option_id: ans.option_id,
          option_ids: ans.option_id ? [ans.option_id] : [],
          answer_text: ans.answer_text,
          answer_value: ans.answer_value,
        });
      }
    }

    // 6. Update session status if needed
    if (session.status === 'started') {
      await supabase
        .from('quiz_sessions')
        .update({ status: 'in_progress' })
        .eq('id', session_id);
    }

    // 7. Delete previous answers for this question (allow corrections)
    await supabase
      .from('quiz_answers')
      .delete()
      .eq('session_id', session_id)
      .eq('question_id', question_id);

    // 8. Insert new answer(s)
    const answersToInsert = [];
    const selectedOptionIds = option_ids && option_ids.length > 0 
      ? option_ids 
      : (option_id ? [option_id] : []);

    if (selectedOptionIds.length > 0) {
      for (const optId of selectedOptionIds) {
        answersToInsert.push({
          session_id,
          question_id,
          option_id: optId,
          answer_text: null,
          answer_value: null,
        });
      }
    } else {
      answersToInsert.push({
        session_id,
        question_id,
        option_id: null,
        answer_text: answer_text || null,
        answer_value: answer_value ?? null,
      });
    }

    const { error: answerError } = await supabase
      .from('quiz_answers')
      .insert(answersToInsert);

    if (answerError) {
      console.error('[quiz-public-answer] Erro ao salvar resposta:', answerError);
      return new Response(
        JSON.stringify({ error: 'Erro ao salvar resposta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Update accumulated vectors with selected options
    const accumulatedVectors = session.accumulated_vectors || { traits: {}, intents: {} };
    const selectedOptions = currentQuestion.quiz_options.filter(opt => selectedOptionIds.includes(opt.id));
    
    for (const opt of selectedOptions) {
      // Apply dynamic weight rules
      let weightMultiplier = 1;
      for (const rule of currentQuestion.dynamic_weight_rules || []) {
        if (evaluateDynamicWeightCondition(rule.condition, answersMap)) {
          weightMultiplier *= rule.weight_multiplier || 1;
        }
      }

      // Accumulate trait vectors
      for (const [trait, value] of Object.entries(opt.traits_vector || {})) {
        accumulatedVectors.traits[trait] = (accumulatedVectors.traits[trait] || 0) + 
          (value as number) * (opt.weight || 1) * weightMultiplier;
      }

      // Accumulate intent vectors
      for (const [intent, value] of Object.entries(opt.intent_vector || {})) {
        accumulatedVectors.intents[intent] = (accumulatedVectors.intents[intent] || 0) + 
          (value as number) * (opt.weight || 1) * weightMultiplier;
      }
    }

    // Update answer context for current question
    answersMap.set(question_id, {
      question_id,
      option_id: option_id || null,
      option_ids: selectedOptionIds,
      answer_text: answer_text || null,
      answer_value: answer_value ?? null,
    });

    // 10. Build session context
    const context: SessionContext = {
      session_id,
      contact_id: session.contact_id,
      answers: answersMap,
      accumulated_vectors: accumulatedVectors,
      visited_question_ids: [...(session.visited_question_ids || []), question_id],
      skipped_question_ids: session.skipped_question_ids || [],
      current_score: calculateCurrentScore(accumulatedVectors),
    };

    // 11. Determine next question based on flow type
    let branchDecision: BranchDecision;

    if (quiz.flow_type === 'linear') {
      branchDecision = determineNextLinear(currentQuestion, visibleQuestions, context);
    } else {
      // Fetch conditions for adaptive/tree flows
      const { data: conditions } = await supabase
        .from('quiz_question_conditions')
        .select('*')
        .in('question_id', sortedQuestions.map(q => q.id))
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      branchDecision = determineNextAdaptive(
        currentQuestion, 
        sortedQuestions, 
        visibleQuestions,
        conditions || [],
        context,
        quiz.adaptive_config || {}
      );
    }

    // 12. Update session with new state
    const decisionPath = session.decision_path || [];
    decisionPath.push({
      question_id,
      decision: branchDecision.event_name,
      reason: branchDecision.decision_reason,
      next_question_id: branchDecision.next_question_id,
      timestamp: new Date().toISOString(),
    });

    await supabase
      .from('quiz_sessions')
      .update({
        current_question_id: branchDecision.next_question_id,
        visited_question_ids: context.visited_question_ids,
        accumulated_vectors: accumulatedVectors,
        decision_path: decisionPath,
      })
      .eq('id', session_id);

    // 13. Calculate progress
    const answeredCount = context.answers.size;
    const totalVisible = visibleQuestions.length;
    const progressPercentage = Math.round((answeredCount / totalVisible) * 100);

    const isLastQuestion = branchDecision.end_quiz || branchDecision.next_question_id === null;
    const nextQuestion = branchDecision.next_question_id 
      ? sortedQuestions.find(q => q.id === branchDecision.next_question_id) 
      : null;

    // 14. Log event
    await supabase
      .from('quiz_events')
      .insert({
        project_id: session.project_id,
        session_id,
        contact_id: session.contact_id,
        event_name: branchDecision.event_name,
        payload: {
          question_id,
          question_type: currentQuestion.type,
          option_ids: selectedOptionIds,
          progress_percentage: progressPercentage,
          answered_questions: answeredCount,
          total_questions: totalVisible,
          next_question_id: branchDecision.next_question_id,
          decision_reason: branchDecision.decision_reason,
          flow_type: quiz.flow_type,
          accumulated_vectors: accumulatedVectors,
        },
      });

    console.log(`[quiz-public-answer] Resposta salva. Flow: ${quiz.flow_type}, Próxima: ${branchDecision.next_question_id || 'FIM'}`);

    // 15. Return response
    return new Response(
      JSON.stringify({
        session_id,
        current_question: nextQuestion || currentQuestion,
        next_question: nextQuestion,
        progress: {
          answered_questions: answeredCount,
          total_questions: totalVisible,
          progress_percentage: progressPercentage,
        },
        is_last_question: isLastQuestion,
        requires_identification: quiz.requires_identification && isLastQuestion,
        branch_decision: {
          next_question_id: branchDecision.next_question_id,
          end_quiz: branchDecision.end_quiz,
          reason: branchDecision.decision_reason,
        },
        accumulated_vectors: accumulatedVectors,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[quiz-public-answer] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Calculate current score from accumulated vectors
 */
function calculateCurrentScore(vectors: { traits: Record<string, number>; intents: Record<string, number> }): number {
  const allValues = [...Object.values(vectors.traits), ...Object.values(vectors.intents)];
  if (allValues.length === 0) return 0;
  return allValues.reduce((sum, val) => sum + Math.abs(val), 0) / allValues.length;
}

/**
 * Evaluate dynamic weight condition
 */
function evaluateDynamicWeightCondition(
  condition: { type: string; question_id?: string; option_id?: string },
  answers: Map<string, AnswerContext>
): boolean {
  if (!condition) return false;

  switch (condition.type) {
    case 'answer_equals': {
      const answer = answers.get(condition.question_id || '');
      if (!answer) return false;
      return answer.option_id === condition.option_id || 
             answer.option_ids.includes(condition.option_id || '');
    }
    default:
      return false;
  }
}

/**
 * Determine next question for linear flow
 */
function determineNextLinear(
  currentQuestion: QuizQuestion,
  visibleQuestions: QuizQuestion[],
  context: SessionContext
): BranchDecision {
  const currentIndex = visibleQuestions.findIndex(q => q.id === currentQuestion.id);
  
  if (currentIndex === -1 || currentIndex === visibleQuestions.length - 1) {
    return {
      next_question_id: null,
      end_quiz: true,
      decision_reason: 'Last question in linear flow',
      event_name: 'quiz_progress',
    };
  }

  const nextQuestion = visibleQuestions[currentIndex + 1];
  return {
    next_question_id: nextQuestion.id,
    end_quiz: false,
    decision_reason: 'Linear progression',
    event_name: 'quiz_progress',
  };
}

/**
 * Determine next question for adaptive/tree flow
 */
function determineNextAdaptive(
  currentQuestion: QuizQuestion,
  allQuestions: QuizQuestion[],
  visibleQuestions: QuizQuestion[],
  conditions: QuizCondition[],
  context: SessionContext,
  adaptiveConfig: Record<string, any>
): BranchDecision {
  // 1. Check if selected option has explicit branching
  const lastAnswer = context.answers.get(currentQuestion.id);
  if (lastAnswer?.option_id) {
    const selectedOption = currentQuestion.quiz_options.find(opt => opt.id === lastAnswer.option_id);
    
    if (selectedOption?.end_quiz) {
      return {
        next_question_id: null,
        end_quiz: true,
        decision_reason: 'Option triggers quiz end',
        event_name: 'quiz_branch_taken',
      };
    }

    if (selectedOption?.next_question_id) {
      const targetQuestion = allQuestions.find(q => q.id === selectedOption.next_question_id);
      if (targetQuestion && !context.visited_question_ids.includes(targetQuestion.id)) {
        return {
          next_question_id: selectedOption.next_question_id,
          end_quiz: false,
          decision_reason: `Branch to question via option selection`,
          event_name: 'quiz_branch_taken',
        };
      }
    }

    if (selectedOption?.next_block_id) {
      const blockStart = allQuestions.find(q => q.id === selectedOption.next_block_id);
      if (blockStart && !context.visited_question_ids.includes(blockStart.id)) {
        return {
          next_question_id: selectedOption.next_block_id,
          end_quiz: false,
          decision_reason: `Jump to block via option selection`,
          event_name: 'quiz_dynamic_jump',
        };
      }
    }
  }

  // 2. Check adaptive stopping conditions
  if (adaptiveConfig.stop_when_confidence_reached) {
    const confidence = calculateConfidence(context.accumulated_vectors.traits);
    const entropy = calculateEntropy(context.accumulated_vectors.intents);
    
    const confThreshold = adaptiveConfig.confidence_threshold || 0.8;
    const entrThreshold = adaptiveConfig.entropy_threshold || 0.3;
    
    if (context.answers.size >= (adaptiveConfig.min_questions || 0)) {
      if (confidence >= confThreshold && entropy <= entrThreshold) {
        return {
          next_question_id: null,
          end_quiz: true,
          decision_reason: `Confidence (${confidence.toFixed(2)}) >= ${confThreshold}, Entropy (${entropy.toFixed(2)}) <= ${entrThreshold}`,
          event_name: 'quiz_confidence_reached',
        };
      }
    }
  }

  // Check max questions
  if (adaptiveConfig.max_questions && context.answers.size >= adaptiveConfig.max_questions) {
    return {
      next_question_id: null,
      end_quiz: true,
      decision_reason: 'Maximum questions reached',
      event_name: 'quiz_progress',
    };
  }

  // 3. Find next question by evaluating conditions
  const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
  
  for (let i = currentIndex + 1; i < allQuestions.length; i++) {
    const candidateQuestion = allQuestions[i];
    
    // Skip already visited
    if (context.visited_question_ids.includes(candidateQuestion.id)) {
      continue;
    }

    // Skip hidden questions (unless injected)
    if (candidateQuestion.is_hidden && 
        !(context as any).injected_question_ids?.includes(candidateQuestion.id)) {
      continue;
    }

    // Get conditions for this question
    const questionConditions = conditions.filter(c => c.question_id === candidateQuestion.id);

    // If no conditions, question is available
    if (questionConditions.length === 0) {
      return {
        next_question_id: candidateQuestion.id,
        end_quiz: false,
        decision_reason: 'No conditions - available by default',
        event_name: 'quiz_progress',
      };
    }

    // Evaluate conditions
    const result = evaluateConditionGroup(questionConditions, context);
    
    if (result.passed) {
      return {
        next_question_id: candidateQuestion.id,
        end_quiz: false,
        decision_reason: `Conditions passed: ${result.reasons.join(', ')}`,
        event_name: 'quiz_condition_passed',
      };
    } else {
      // Log blocked condition
      console.log(`[quiz-public-answer] Question ${candidateQuestion.id} blocked: ${result.reasons.join(', ')}`);
    }
  }

  // 4. No more questions available
  return {
    next_question_id: null,
    end_quiz: true,
    decision_reason: 'No more eligible questions',
    event_name: 'quiz_progress',
  };
}

/**
 * Evaluate a group of conditions
 */
function evaluateConditionGroup(
  conditions: QuizCondition[],
  context: SessionContext
): { passed: boolean; reasons: string[] } {
  if (conditions.length === 0) {
    return { passed: true, reasons: ['No conditions'] };
  }

  const reasons: string[] = [];
  let overallPassed = true;

  // Group by group_id for nested logic
  const groups = new Map<string | null, QuizCondition[]>();
  for (const condition of conditions) {
    const groupId = condition.group_id;
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(condition);
  }

  for (const [groupId, groupConditions] of groups) {
    groupConditions.sort((a, b) => a.order_index - b.order_index);
    
    let groupPassed = groupConditions[0]?.logical_operator === 'OR' ? false : true;
    
    for (const condition of groupConditions) {
      if (!condition.is_active) continue;
      
      const result = evaluateSingleCondition(condition, context);
      reasons.push(`${condition.condition_type}: ${result.passed ? 'PASS' : 'FAIL'}`);
      
      if (condition.logical_operator === 'AND') {
        groupPassed = groupPassed && result.passed;
      } else {
        groupPassed = groupPassed || result.passed;
      }
    }
    
    overallPassed = overallPassed && groupPassed;
  }

  return { passed: overallPassed, reasons };
}

/**
 * Evaluate a single condition
 */
function evaluateSingleCondition(
  condition: QuizCondition,
  context: SessionContext
): { passed: boolean } {
  const { condition_type, condition_payload } = condition;

  switch (condition_type) {
    case 'is_identified':
      return { passed: context.contact_id !== null };

    case 'is_anonymous':
      return { passed: context.contact_id === null };

    case 'question_answered':
      return { passed: context.answers.has(condition_payload.question_id) };

    case 'question_skipped':
      return { passed: context.skipped_question_ids.includes(condition_payload.question_id) };

    case 'answer_equals': {
      const answer = context.answers.get(condition_payload.question_id);
      if (!answer) return { passed: false };
      return { 
        passed: answer.option_id === condition_payload.option_id || 
                answer.option_ids.includes(condition_payload.option_id) 
      };
    }

    case 'answer_not_equals': {
      const answer = context.answers.get(condition_payload.question_id);
      if (!answer) return { passed: true }; // Not answered means not equal
      return { 
        passed: answer.option_id !== condition_payload.option_id && 
                !answer.option_ids.includes(condition_payload.option_id) 
      };
    }

    case 'trait_gt':
      return { 
        passed: (context.accumulated_vectors.traits[condition_payload.trait_name] ?? 0) > condition_payload.threshold 
      };

    case 'trait_lt':
      return { 
        passed: (context.accumulated_vectors.traits[condition_payload.trait_name] ?? 0) < condition_payload.threshold 
      };

    case 'intent_gt':
      return { 
        passed: (context.accumulated_vectors.intents[condition_payload.intent_name] ?? 0) > condition_payload.threshold 
      };

    case 'intent_lt':
      return { 
        passed: (context.accumulated_vectors.intents[condition_payload.intent_name] ?? 0) < condition_payload.threshold 
      };

    case 'intent_range': {
      const intentValue = context.accumulated_vectors.intents[condition_payload.intent_name] ?? 0;
      return { passed: intentValue >= condition_payload.min && intentValue <= condition_payload.max };
    }

    case 'vector_gt': {
      const value = context.accumulated_vectors.traits[condition_payload.vector_name] ?? 
                    context.accumulated_vectors.intents[condition_payload.vector_name] ?? 0;
      return { passed: value > condition_payload.threshold };
    }

    case 'vector_lt': {
      const value = context.accumulated_vectors.traits[condition_payload.vector_name] ?? 
                    context.accumulated_vectors.intents[condition_payload.vector_name] ?? 0;
      return { passed: value < condition_payload.threshold };
    }

    case 'score_gt':
      return { passed: context.current_score > condition_payload.threshold };

    case 'score_lt':
      return { passed: context.current_score < condition_payload.threshold };

    case 'session_field': {
      const { field, operator, value } = condition_payload;
      let fieldValue: any;
      
      switch (field) {
        case 'contact_id':
          fieldValue = context.contact_id;
          break;
        case 'questions_answered':
          fieldValue = context.answers.size;
          break;
        case 'questions_visited':
          fieldValue = context.visited_question_ids.length;
          break;
        default:
          return { passed: false };
      }
      
      switch (operator) {
        case 'is_null':
          return { passed: fieldValue === null || fieldValue === undefined };
        case 'is_not_null':
          return { passed: fieldValue !== null && fieldValue !== undefined };
        case 'equals':
          return { passed: fieldValue === value };
        case 'gt':
          return { passed: fieldValue > value };
        case 'lt':
          return { passed: fieldValue < value };
        default:
          return { passed: false };
      }
    }

    default:
      // Unknown condition types pass by default
      return { passed: true };
  }
}

/**
 * Calculate confidence from trait variance
 */
function calculateConfidence(traits: Record<string, number>): number {
  const values = Object.values(traits);
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.max(0, 1 - Math.sqrt(variance));
}

/**
 * Calculate entropy from intent distribution
 */
function calculateEntropy(intents: Record<string, number>): number {
  const values = Object.values(intents);
  if (values.length === 0) return 0;

  const total = values.reduce((a, b) => a + Math.abs(b), 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const value of values) {
    const p = Math.abs(value) / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  const maxEntropy = Math.log2(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}
