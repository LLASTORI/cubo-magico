/**
 * Quiz Condition Engine
 * Evaluates conditional logic for adaptive quiz flows
 */

export interface QuizCondition {
  id: string;
  question_id: string;
  condition_type: ConditionType;
  condition_payload: Record<string, any>;
  logical_operator: 'AND' | 'OR';
  group_id: string | null;
  order_index: number;
  is_active: boolean;
}

export type ConditionType =
  | 'answer_equals'
  | 'answer_not_equals'
  | 'answer_contains'
  | 'vector_gt'
  | 'vector_lt'
  | 'vector_eq'
  | 'trait_gt'
  | 'trait_lt'
  | 'intent_gt'
  | 'intent_lt'
  | 'intent_range'
  | 'score_gt'
  | 'score_lt'
  | 'session_field'
  | 'is_identified'
  | 'is_anonymous'
  | 'question_answered'
  | 'question_skipped'
  | 'custom';

export interface SessionContext {
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

export interface AnswerContext {
  question_id: string;
  option_id: string | null;
  option_ids: string[];
  answer_text: string | null;
  answer_value: number | null;
}

export interface ConditionResult {
  passed: boolean;
  reason: string;
  condition_type: ConditionType;
}

export interface BranchDecision {
  next_question_id: string | null;
  end_quiz: boolean;
  decision_reason: string;
  conditions_evaluated: ConditionResult[];
}

/**
 * Evaluates a single condition against the session context
 */
export function evaluateCondition(
  condition: QuizCondition,
  context: SessionContext
): ConditionResult {
  const { condition_type, condition_payload } = condition;

  try {
    switch (condition_type) {
      case 'answer_equals':
        return evaluateAnswerEquals(condition_payload, context);

      case 'answer_not_equals':
        return evaluateAnswerNotEquals(condition_payload, context);

      case 'answer_contains':
        return evaluateAnswerContains(condition_payload, context);

      case 'vector_gt':
        return evaluateVectorComparison(condition_payload, context, 'gt');

      case 'vector_lt':
        return evaluateVectorComparison(condition_payload, context, 'lt');

      case 'vector_eq':
        return evaluateVectorComparison(condition_payload, context, 'eq');

      case 'trait_gt':
        return evaluateTraitComparison(condition_payload, context, 'gt');

      case 'trait_lt':
        return evaluateTraitComparison(condition_payload, context, 'lt');

      case 'intent_gt':
        return evaluateIntentComparison(condition_payload, context, 'gt');

      case 'intent_lt':
        return evaluateIntentComparison(condition_payload, context, 'lt');

      case 'intent_range':
        return evaluateIntentRange(condition_payload, context);

      case 'score_gt':
        return evaluateScoreComparison(condition_payload, context, 'gt');

      case 'score_lt':
        return evaluateScoreComparison(condition_payload, context, 'lt');

      case 'session_field':
        return evaluateSessionField(condition_payload, context);

      case 'is_identified':
        return {
          passed: context.contact_id !== null,
          reason: context.contact_id ? 'User is identified' : 'User is not identified',
          condition_type,
        };

      case 'is_anonymous':
        return {
          passed: context.contact_id === null,
          reason: context.contact_id === null ? 'User is anonymous' : 'User is identified',
          condition_type,
        };

      case 'question_answered':
        return evaluateQuestionAnswered(condition_payload, context);

      case 'question_skipped':
        return evaluateQuestionSkipped(condition_payload, context);

      case 'custom':
        return evaluateCustomExpression(condition_payload, context);

      default:
        return {
          passed: false,
          reason: `Unknown condition type: ${condition_type}`,
          condition_type,
        };
    }
  } catch (error) {
    return {
      passed: false,
      reason: `Error evaluating condition: ${error}`,
      condition_type,
    };
  }
}

function evaluateAnswerEquals(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const { question_id, option_id } = payload;
  const answer = context.answers.get(question_id);

  if (!answer) {
    return {
      passed: false,
      reason: `Question ${question_id} not answered`,
      condition_type: 'answer_equals',
    };
  }

  const passed = answer.option_id === option_id || answer.option_ids.includes(option_id);
  return {
    passed,
    reason: passed
      ? `Answer matches option ${option_id}`
      : `Answer does not match option ${option_id}`,
    condition_type: 'answer_equals',
  };
}

function evaluateAnswerNotEquals(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const result = evaluateAnswerEquals(payload, context);
  return {
    passed: !result.passed,
    reason: result.passed
      ? `Answer equals option (condition failed)`
      : `Answer does not equal option (condition passed)`,
    condition_type: 'answer_not_equals',
  };
}

function evaluateAnswerContains(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const { question_id, text } = payload;
  const answer = context.answers.get(question_id);

  if (!answer || !answer.answer_text) {
    return {
      passed: false,
      reason: `Question ${question_id} has no text answer`,
      condition_type: 'answer_contains',
    };
  }

  const passed = answer.answer_text.toLowerCase().includes(text.toLowerCase());
  return {
    passed,
    reason: passed
      ? `Answer contains "${text}"`
      : `Answer does not contain "${text}"`,
    condition_type: 'answer_contains',
  };
}

function evaluateVectorComparison(
  payload: Record<string, any>,
  context: SessionContext,
  operator: 'gt' | 'lt' | 'eq'
): ConditionResult {
  const { vector_name, threshold } = payload;
  const vectorValue =
    context.accumulated_vectors.traits[vector_name] ??
    context.accumulated_vectors.intents[vector_name] ??
    0;

  let passed = false;
  let opSymbol = '';

  switch (operator) {
    case 'gt':
      passed = vectorValue > threshold;
      opSymbol = '>';
      break;
    case 'lt':
      passed = vectorValue < threshold;
      opSymbol = '<';
      break;
    case 'eq':
      passed = Math.abs(vectorValue - threshold) < 0.001;
      opSymbol = '=';
      break;
  }

  return {
    passed,
    reason: `${vector_name} (${vectorValue.toFixed(2)}) ${opSymbol} ${threshold}: ${passed}`,
    condition_type: `vector_${operator}` as ConditionType,
  };
}

function evaluateTraitComparison(
  payload: Record<string, any>,
  context: SessionContext,
  operator: 'gt' | 'lt'
): ConditionResult {
  const { trait_name, threshold } = payload;
  const traitValue = context.accumulated_vectors.traits[trait_name] ?? 0;

  const passed = operator === 'gt' ? traitValue > threshold : traitValue < threshold;
  const opSymbol = operator === 'gt' ? '>' : '<';

  return {
    passed,
    reason: `Trait ${trait_name} (${traitValue.toFixed(2)}) ${opSymbol} ${threshold}: ${passed}`,
    condition_type: `trait_${operator}` as ConditionType,
  };
}

function evaluateIntentComparison(
  payload: Record<string, any>,
  context: SessionContext,
  operator: 'gt' | 'lt'
): ConditionResult {
  const { intent_name, threshold } = payload;
  const intentValue = context.accumulated_vectors.intents[intent_name] ?? 0;

  const passed = operator === 'gt' ? intentValue > threshold : intentValue < threshold;
  const opSymbol = operator === 'gt' ? '>' : '<';

  return {
    passed,
    reason: `Intent ${intent_name} (${intentValue.toFixed(2)}) ${opSymbol} ${threshold}: ${passed}`,
    condition_type: `intent_${operator}` as ConditionType,
  };
}

function evaluateIntentRange(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const { intent_name, min, max } = payload;
  const intentValue = context.accumulated_vectors.intents[intent_name] ?? 0;

  const passed = intentValue >= min && intentValue <= max;

  return {
    passed,
    reason: `Intent ${intent_name} (${intentValue.toFixed(2)}) in range [${min}, ${max}]: ${passed}`,
    condition_type: 'intent_range',
  };
}

function evaluateScoreComparison(
  payload: Record<string, any>,
  context: SessionContext,
  operator: 'gt' | 'lt'
): ConditionResult {
  const { threshold } = payload;
  const passed = operator === 'gt' 
    ? context.current_score > threshold 
    : context.current_score < threshold;
  const opSymbol = operator === 'gt' ? '>' : '<';

  return {
    passed,
    reason: `Score (${context.current_score}) ${opSymbol} ${threshold}: ${passed}`,
    condition_type: `score_${operator}` as ConditionType,
  };
}

function evaluateSessionField(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const { field, operator, value } = payload;

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
      return {
        passed: false,
        reason: `Unknown session field: ${field}`,
        condition_type: 'session_field',
      };
  }

  let passed = false;
  switch (operator) {
    case 'is_null':
      passed = fieldValue === null || fieldValue === undefined;
      break;
    case 'is_not_null':
      passed = fieldValue !== null && fieldValue !== undefined;
      break;
    case 'equals':
      passed = fieldValue === value;
      break;
    case 'gt':
      passed = fieldValue > value;
      break;
    case 'lt':
      passed = fieldValue < value;
      break;
    default:
      passed = false;
  }

  return {
    passed,
    reason: `Session ${field} ${operator} ${value ?? ''}: ${passed}`,
    condition_type: 'session_field',
  };
}

function evaluateQuestionAnswered(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const { question_id } = payload;
  const passed = context.answers.has(question_id);

  return {
    passed,
    reason: passed
      ? `Question ${question_id} was answered`
      : `Question ${question_id} was not answered`,
    condition_type: 'question_answered',
  };
}

function evaluateQuestionSkipped(
  payload: Record<string, any>,
  context: SessionContext
): ConditionResult {
  const { question_id } = payload;
  const passed = context.skipped_question_ids.includes(question_id);

  return {
    passed,
    reason: passed
      ? `Question ${question_id} was skipped`
      : `Question ${question_id} was not skipped`,
    condition_type: 'question_skipped',
  };
}

function evaluateCustomExpression(
  payload: Record<string, any>,
  _context: SessionContext
): ConditionResult {
  // Custom expressions are evaluated server-side for security
  // This is a placeholder - actual implementation should be in edge function
  return {
    passed: false,
    reason: 'Custom expressions must be evaluated server-side',
    condition_type: 'custom',
  };
}

/**
 * Evaluates a group of conditions with AND/OR logic
 */
export function evaluateConditionGroup(
  conditions: QuizCondition[],
  context: SessionContext
): { passed: boolean; results: ConditionResult[] } {
  if (conditions.length === 0) {
    return { passed: true, results: [] };
  }

  const results: ConditionResult[] = [];
  
  // Group conditions by group_id
  const groups = new Map<string | null, QuizCondition[]>();
  for (const condition of conditions) {
    const groupId = condition.group_id;
    if (!groups.has(groupId)) {
      groups.set(groupId, []);
    }
    groups.get(groupId)!.push(condition);
  }

  // Evaluate each group
  let overallPassed = true;

  for (const [_groupId, groupConditions] of groups) {
    // Sort by order_index
    groupConditions.sort((a, b) => a.order_index - b.order_index);

    let groupPassed = true;
    const firstOperator = groupConditions[0]?.logical_operator || 'AND';

    for (const condition of groupConditions) {
      if (!condition.is_active) continue;

      const result = evaluateCondition(condition, context);
      results.push(result);

      if (condition.logical_operator === 'AND') {
        groupPassed = groupPassed && result.passed;
      } else {
        // OR logic
        if (result.passed) {
          groupPassed = true;
          break;
        }
      }
    }

    // Combine group results based on first operator
    if (firstOperator === 'AND') {
      overallPassed = overallPassed && groupPassed;
    } else {
      overallPassed = overallPassed || groupPassed;
    }
  }

  return { passed: overallPassed, results };
}

/**
 * Calculates confidence score based on vector variance
 */
export function calculateConfidence(vectors: Record<string, number>): number {
  const values = Object.values(vectors);
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  // Lower variance = higher confidence
  // Normalize to 0-1 range (assuming variance is typically < 1)
  return Math.max(0, 1 - Math.sqrt(variance));
}

/**
 * Calculates entropy of intent distribution
 */
export function calculateEntropy(intents: Record<string, number>): number {
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

  // Normalize by max entropy (log2 of number of intents)
  const maxEntropy = Math.log2(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Checks if adaptive stop conditions are met
 */
export function shouldStopAdaptive(
  config: {
    stop_when_confidence_reached?: boolean;
    confidence_threshold?: number;
    entropy_threshold?: number;
    min_questions?: number;
    max_questions?: number;
  },
  context: SessionContext
): { should_stop: boolean; reason: string } {
  const questionsAnswered = context.answers.size;

  // Check min questions
  if (config.min_questions && questionsAnswered < config.min_questions) {
    return { should_stop: false, reason: 'Minimum questions not reached' };
  }

  // Check max questions
  if (config.max_questions && questionsAnswered >= config.max_questions) {
    return { should_stop: true, reason: 'Maximum questions reached' };
  }

  // Check confidence-based stopping
  if (config.stop_when_confidence_reached) {
    const confidence = calculateConfidence(context.accumulated_vectors.traits);
    const entropy = calculateEntropy(context.accumulated_vectors.intents);

    const confidenceThreshold = config.confidence_threshold ?? 0.8;
    const entropyThreshold = config.entropy_threshold ?? 0.3;

    if (confidence >= confidenceThreshold && entropy <= entropyThreshold) {
      return {
        should_stop: true,
        reason: `Confidence (${confidence.toFixed(2)}) >= ${confidenceThreshold} and Entropy (${entropy.toFixed(2)}) <= ${entropyThreshold}`,
      };
    }
  }

  return { should_stop: false, reason: 'Continue quiz' };
}
