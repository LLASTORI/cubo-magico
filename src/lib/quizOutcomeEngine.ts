/**
 * Quiz Outcome Engine
 * 
 * Evaluates outcome conditions and determines which actions to execute
 * based on quiz results, profile vectors, and contact data.
 */

// ===== TYPES =====

export interface OutcomeCondition {
  type: 'vector_threshold' | 'trait_percentage' | 'intent_percentage' | 
        'confidence_score' | 'entropy_score' | 'specific_answer' | 
        'profile_delta' | 'tag_exists' | 'custom_field';
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'exists';
  field: string;
  value: any;
  group?: string;
  logic?: 'and' | 'or';
}

export interface OutcomeAction {
  type: 'add_tag' | 'remove_tag' | 'set_lifecycle_stage' | 
        'trigger_automation' | 'trigger_whatsapp_flow' | 'trigger_email_sequence' |
        'fire_webhook' | 'fire_pixel_event' | 'redirect_url' | 
        'dynamic_end_screen' | 'update_custom_field';
  config: Record<string, any>;
}

export interface QuizOutcome {
  id: string;
  quiz_id: string;
  name: string;
  description?: string;
  priority: number;
  is_active: boolean;
  conditions: OutcomeCondition[];
  actions: OutcomeAction[];
  end_screen_override?: Record<string, any>;
}

export interface EvaluationContext {
  // Quiz result data
  traitsVector: Record<string, number>;
  intentVector: Record<string, number>;
  normalizedScore: Record<string, any>;
  rawScore: Record<string, any>;
  
  // Profile data (if available)
  profile?: {
    confidenceScore: number;
    entropyScore: number;
    volatilityScore: number;
    totalSignals: number;
  };
  
  // Contact data
  contact?: {
    id: string;
    tags?: string[];
    customFields?: Record<string, any>;
    lifecycleStage?: string;
  };
  
  // Answers map (question_id -> answer)
  answers: Record<string, {
    optionId?: string;
    optionValue?: string;
    answerText?: string;
    answerValue?: number;
  }>;
}

export interface ConditionResult {
  condition: OutcomeCondition;
  passed: boolean;
  actualValue: any;
  reason: string;
}

export interface OutcomeEvaluationResult {
  outcome: QuizOutcome;
  passed: boolean;
  conditionResults: ConditionResult[];
  evaluationTimeMs: number;
}

export interface OutcomeResolutionResult {
  selectedOutcome: QuizOutcome | null;
  allEvaluations: OutcomeEvaluationResult[];
  decisionTrace: {
    evaluatedCount: number;
    passedCount: number;
    selectedName: string | null;
    selectedPriority: number | null;
    evaluationOrder: string[];
    totalTimeMs: number;
  };
}

// ===== CONDITION EVALUATORS =====

function evaluateVectorThreshold(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const vector = condition.field.startsWith('intent') 
    ? context.intentVector 
    : context.traitsVector;
  
  const key = condition.field.replace(/^(intent_|trait_)/, '');
  const actualValue = vector[key] || 0;
  const passed = compareValues(actualValue, condition.operator, condition.value);
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `${condition.field} (${actualValue}) ${condition.operator} ${condition.value}` 
      : `${condition.field} (${actualValue}) failed ${condition.operator} ${condition.value}`,
  };
}

function evaluateTraitPercentage(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const normalized = context.normalizedScore?.traits || {};
  const actualValue = (normalized[condition.field] || 0) * 100;
  const passed = compareValues(actualValue, condition.operator, condition.value);
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `Trait ${condition.field} at ${actualValue.toFixed(1)}%` 
      : `Trait ${condition.field} (${actualValue.toFixed(1)}%) failed threshold`,
  };
}

function evaluateIntentPercentage(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const normalized = context.normalizedScore?.intents || {};
  const actualValue = (normalized[condition.field] || 0) * 100;
  const passed = compareValues(actualValue, condition.operator, condition.value);
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `Intent ${condition.field} at ${actualValue.toFixed(1)}%` 
      : `Intent ${condition.field} (${actualValue.toFixed(1)}%) failed threshold`,
  };
}

function evaluateConfidenceScore(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const actualValue = context.profile?.confidenceScore || 0;
  const passed = compareValues(actualValue, condition.operator, condition.value);
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `Confidence score ${actualValue} meets threshold` 
      : `Confidence score ${actualValue} below threshold`,
  };
}

function evaluateEntropyScore(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const actualValue = context.profile?.entropyScore || 0;
  const passed = compareValues(actualValue, condition.operator, condition.value);
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `Entropy score ${actualValue} meets threshold` 
      : `Entropy score ${actualValue} failed threshold`,
  };
}

function evaluateSpecificAnswer(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const answer = context.answers[condition.field];
  let actualValue: any = null;
  let passed = false;
  
  if (answer) {
    actualValue = answer.optionValue || answer.answerText || answer.answerValue;
    passed = compareValues(actualValue, condition.operator, condition.value);
  }
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `Answer to ${condition.field} matches condition` 
      : `Answer to ${condition.field} does not match`,
  };
}

function evaluateTagExists(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const tags = context.contact?.tags || [];
  const tagExists = tags.includes(condition.value);
  const passed = condition.operator === 'exists' ? tagExists : !tagExists;
  
  return {
    condition,
    passed,
    actualValue: tags,
    reason: passed 
      ? `Tag "${condition.value}" ${condition.operator === 'exists' ? 'exists' : 'does not exist'}` 
      : `Tag condition failed`,
  };
}

function evaluateCustomField(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  const customFields = context.contact?.customFields || {};
  const actualValue = customFields[condition.field];
  const passed = compareValues(actualValue, condition.operator, condition.value);
  
  return {
    condition,
    passed,
    actualValue,
    reason: passed 
      ? `Custom field ${condition.field} matches` 
      : `Custom field ${condition.field} does not match`,
  };
}

// ===== HELPERS =====

function compareValues(actual: any, operator: string, expected: any): boolean {
  switch (operator) {
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'eq':
      return actual === expected || String(actual) === String(expected);
    case 'neq':
      return actual !== expected && String(actual) !== String(expected);
    case 'contains':
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case 'exists':
      return actual !== null && actual !== undefined;
    default:
      return false;
  }
}

// ===== MAIN EVALUATION FUNCTIONS =====

/**
 * Evaluate a single condition against the context
 */
export function evaluateCondition(
  condition: OutcomeCondition,
  context: EvaluationContext
): ConditionResult {
  switch (condition.type) {
    case 'vector_threshold':
      return evaluateVectorThreshold(condition, context);
    case 'trait_percentage':
      return evaluateTraitPercentage(condition, context);
    case 'intent_percentage':
      return evaluateIntentPercentage(condition, context);
    case 'confidence_score':
      return evaluateConfidenceScore(condition, context);
    case 'entropy_score':
      return evaluateEntropyScore(condition, context);
    case 'specific_answer':
      return evaluateSpecificAnswer(condition, context);
    case 'tag_exists':
      return evaluateTagExists(condition, context);
    case 'custom_field':
      return evaluateCustomField(condition, context);
    case 'profile_delta':
      // Profile delta evaluation - check if a vector changed significantly
      return {
        condition,
        passed: true, // Placeholder - would need history data
        actualValue: null,
        reason: 'Profile delta evaluation not yet implemented',
      };
    default:
      return {
        condition,
        passed: false,
        actualValue: null,
        reason: `Unknown condition type: ${condition.type}`,
      };
  }
}

/**
 * Evaluate all conditions for an outcome
 * Groups conditions by group ID and applies AND/OR logic
 */
export function evaluateOutcome(
  outcome: QuizOutcome,
  context: EvaluationContext
): OutcomeEvaluationResult {
  const startTime = performance.now();
  
  if (!outcome.is_active) {
    return {
      outcome,
      passed: false,
      conditionResults: [],
      evaluationTimeMs: performance.now() - startTime,
    };
  }
  
  const conditions = outcome.conditions;
  
  // If no conditions, outcome always passes
  if (!conditions || conditions.length === 0) {
    return {
      outcome,
      passed: true,
      conditionResults: [],
      evaluationTimeMs: performance.now() - startTime,
    };
  }
  
  const conditionResults: ConditionResult[] = [];
  
  // Group conditions by group ID
  const groups: Record<string, OutcomeCondition[]> = {};
  conditions.forEach(c => {
    const groupId = c.group || 'default';
    if (!groups[groupId]) groups[groupId] = [];
    groups[groupId].push(c);
  });
  
  // Evaluate each group (conditions within a group use AND logic)
  // Groups are combined with OR logic (any group passing = outcome passes)
  const groupResults: boolean[] = [];
  
  for (const [groupId, groupConditions] of Object.entries(groups)) {
    let groupPassed = true;
    
    for (const condition of groupConditions) {
      const result = evaluateCondition(condition, context);
      conditionResults.push(result);
      
      // Within a group, all conditions must pass (AND logic)
      if (!result.passed) {
        groupPassed = false;
        // Don't break - we want to evaluate all for the trace
      }
    }
    
    groupResults.push(groupPassed);
  }
  
  // Any group passing means the outcome passes (OR between groups)
  const passed = groupResults.some(g => g);
  
  return {
    outcome,
    passed,
    conditionResults,
    evaluationTimeMs: performance.now() - startTime,
  };
}

/**
 * Resolve outcomes - evaluate all and select the highest priority passing outcome
 */
export function resolveOutcomes(
  outcomes: QuizOutcome[],
  context: EvaluationContext
): OutcomeResolutionResult {
  const startTime = performance.now();
  
  // Sort by priority (highest first)
  const sortedOutcomes = [...outcomes].sort((a, b) => b.priority - a.priority);
  
  const allEvaluations: OutcomeEvaluationResult[] = [];
  let selectedOutcome: QuizOutcome | null = null;
  const evaluationOrder: string[] = [];
  let passedCount = 0;
  
  for (const outcome of sortedOutcomes) {
    evaluationOrder.push(outcome.name);
    const evaluation = evaluateOutcome(outcome, context);
    allEvaluations.push(evaluation);
    
    if (evaluation.passed) {
      passedCount++;
      // Select first passing outcome (highest priority due to sort)
      if (!selectedOutcome) {
        selectedOutcome = outcome;
      }
    }
  }
  
  return {
    selectedOutcome,
    allEvaluations,
    decisionTrace: {
      evaluatedCount: sortedOutcomes.length,
      passedCount,
      selectedName: selectedOutcome?.name || null,
      selectedPriority: selectedOutcome?.priority || null,
      evaluationOrder,
      totalTimeMs: performance.now() - startTime,
    },
  };
}

/**
 * Prepare evaluation context from quiz completion data
 */
export function prepareEvaluationContext(
  quizResult: {
    traitsVector: Record<string, number>;
    intentVector: Record<string, number>;
    normalizedScore: Record<string, any>;
    rawScore: Record<string, any>;
  },
  answers: Array<{
    question_id: string;
    option_id?: string;
    option_value?: string;
    answer_text?: string;
    answer_value?: number;
  }>,
  profile?: {
    confidence_score: number;
    entropy_score: number;
    volatility_score: number;
    total_signals: number;
  },
  contact?: {
    id: string;
    tags?: string[];
    custom_fields?: Record<string, any>;
    pipeline_stage_id?: string;
  }
): EvaluationContext {
  const answersMap: EvaluationContext['answers'] = {};
  
  for (const answer of answers) {
    answersMap[answer.question_id] = {
      optionId: answer.option_id,
      optionValue: answer.option_value,
      answerText: answer.answer_text,
      answerValue: answer.answer_value,
    };
  }
  
  return {
    traitsVector: quizResult.traitsVector,
    intentVector: quizResult.intentVector,
    normalizedScore: quizResult.normalizedScore,
    rawScore: quizResult.rawScore,
    profile: profile ? {
      confidenceScore: profile.confidence_score,
      entropyScore: profile.entropy_score,
      volatilityScore: profile.volatility_score,
      totalSignals: profile.total_signals,
    } : undefined,
    contact: contact ? {
      id: contact.id,
      tags: contact.tags || [],
      customFields: contact.custom_fields || {},
      lifecycleStage: contact.pipeline_stage_id,
    } : undefined,
    answers: answersMap,
  };
}

// ===== ACTION PREPARATION =====

/**
 * Prepare actions for execution based on outcome
 */
export function prepareActions(
  outcome: QuizOutcome,
  context: EvaluationContext
): OutcomeAction[] {
  return outcome.actions.map(action => {
    // Interpolate variables in action config
    const interpolatedConfig = interpolateConfig(action.config, context);
    return {
      ...action,
      config: interpolatedConfig,
    };
  });
}

function interpolateConfig(
  config: Record<string, any>,
  context: EvaluationContext
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      result[key] = interpolateString(value, context);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = interpolateConfig(value, context);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

function interpolateString(template: string, context: EvaluationContext): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return match; // Keep original if path not found
      }
    }
    
    return String(value);
  });
}

// ===== EXPORTS FOR UI =====

export const CONDITION_TYPES = [
  { value: 'vector_threshold', label: 'Limiar de Vetor', description: 'Valor absoluto de trait ou intent' },
  { value: 'trait_percentage', label: 'Percentual de Traço', description: 'Percentual normalizado de traço' },
  { value: 'intent_percentage', label: 'Percentual de Intenção', description: 'Percentual normalizado de intenção' },
  { value: 'confidence_score', label: 'Score de Confiança', description: 'Confiança do perfil cognitivo' },
  { value: 'entropy_score', label: 'Score de Entropia', description: 'Entropia do perfil (dispersão)' },
  { value: 'specific_answer', label: 'Resposta Específica', description: 'Verifica uma resposta específica' },
  { value: 'tag_exists', label: 'Tag Existe', description: 'Verifica se contato tem tag' },
  { value: 'custom_field', label: 'Campo Personalizado', description: 'Verifica campo customizado' },
] as const;

export const CONDITION_OPERATORS = [
  { value: 'gt', label: 'Maior que (>)', numericOnly: true },
  { value: 'gte', label: 'Maior ou igual (>=)', numericOnly: true },
  { value: 'lt', label: 'Menor que (<)', numericOnly: true },
  { value: 'lte', label: 'Menor ou igual (<=)', numericOnly: true },
  { value: 'eq', label: 'Igual (=)', numericOnly: false },
  { value: 'neq', label: 'Diferente (!=)', numericOnly: false },
  { value: 'contains', label: 'Contém', numericOnly: false },
  { value: 'exists', label: 'Existe', numericOnly: false },
] as const;

export const ACTION_TYPES = [
  { value: 'add_tag', label: 'Adicionar Tag', icon: 'tag' },
  { value: 'remove_tag', label: 'Remover Tag', icon: 'tag-off' },
  { value: 'set_lifecycle_stage', label: 'Definir Estágio', icon: 'git-branch' },
  { value: 'trigger_automation', label: 'Disparar Automação', icon: 'zap' },
  { value: 'trigger_whatsapp_flow', label: 'Fluxo WhatsApp', icon: 'message-circle' },
  { value: 'trigger_email_sequence', label: 'Sequência de Email', icon: 'mail' },
  { value: 'fire_webhook', label: 'Webhook', icon: 'webhook' },
  { value: 'fire_pixel_event', label: 'Evento de Pixel', icon: 'activity' },
  { value: 'redirect_url', label: 'Redirecionar URL', icon: 'external-link' },
  { value: 'dynamic_end_screen', label: 'Tela Final Dinâmica', icon: 'layout' },
  { value: 'update_custom_field', label: 'Atualizar Campo', icon: 'edit' },
] as const;
