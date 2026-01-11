// Agent Engine - Autonomous AI Agent Logic
// Goal-driven agents that evaluate predictions and take actions

export type AgentObjective = 
  | 'increase_conversion'
  | 'reduce_churn'
  | 'maximize_ltv'
  | 'reactivate_leads'
  | 'accelerate_pipeline'
  | 'optimize_engagement';

export type AgentActionType =
  | 'send_whatsapp'
  | 'send_email'
  | 'change_lifecycle_stage'
  | 'assign_sales_rep'
  | 'trigger_quiz'
  | 'change_offer'
  | 'delay_action'
  | 'request_human_approval'
  | 'add_tag'
  | 'remove_tag'
  | 'move_to_pipeline_stage'
  | 'start_cadence'
  | 'update_contact_field';

export type TriggerType =
  | 'prediction_created'
  | 'recommendation_generated'
  | 'profile_shift'
  | 'high_risk_signal'
  | 'funnel_outcome'
  | 'purchase_completed'
  | 'quiz_completed';

export interface AgentBoundaries {
  maxActionsPerContact?: number;
  maxActionsPerDay?: number;
  minTimeBetweenActions?: number; // in hours
  excludedTags?: string[];
  requiredTags?: string[];
  excludedStages?: string[];
  workingHoursOnly?: boolean;
  workingHoursStart?: number;
  workingHoursEnd?: number;
  excludeWeekends?: boolean;
}

export interface Agent {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  objective: AgentObjective;
  allowedActions: AgentActionType[];
  boundaries: AgentBoundaries;
  confidenceThreshold: number;
  isActive: boolean;
  triggerOn: TriggerType[];
  maxActionsPerDay: number;
  requireHumanApproval: boolean;
}

// Local prediction type for agent engine
export interface AgentPrediction {
  id: string;
  predictionType: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  urgencyScore: number;
  recommendedActions: Array<{ suggestedCopy?: string }>;
}

// Local context type for agent engine
export interface AgentContactContext {
  contactId: string;
  tags?: string[];
  profile?: {
    entropy_score: number;
    confidence_score: number;
  };
  lastOfferCode?: string;
}

export interface AgentDecision {
  agentId: string;
  contactId: string;
  projectId: string;
  predictionId?: string;
  decisionType: AgentActionType;
  decisionData: Record<string, unknown>;
  explanation: DecisionExplanation;
  confidence: number;
  riskScore: number;
  rewardScore: number;
}

export interface DecisionExplanation {
  reasoning: string;
  factors: ExplanationFactor[];
  alternativesConsidered: AlternativeAction[];
  expectedOutcome: string;
  potentialRisks: string[];
}

export interface ExplanationFactor {
  factor: string;
  weight: number;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface AlternativeAction {
  action: AgentActionType;
  confidence: number;
  reason: string;
}

export interface SimulatedOutcome {
  action: AgentActionType;
  successProbability: number;
  expectedReward: number;
  expectedRisk: number;
  netValue: number;
}

// Main agent brain - evaluates context and makes decisions
export function evaluateAgent(
  agent: Agent,
  predictions: AgentPrediction[],
  context: AgentContactContext
): AgentDecision | null {
  // Check if agent should act
  if (!shouldAgentAct(agent, context)) {
    return null;
  }

  // Filter relevant predictions
  const relevantPredictions = filterRelevantPredictions(agent, predictions);
  if (relevantPredictions.length === 0) {
    return null;
  }

  // Evaluate risk vs reward for each possible action
  const simulatedOutcomes = simulateOutcomes(agent, relevantPredictions, context);
  
  // Select best action
  const bestOutcome = selectBestAction(simulatedOutcomes, agent.confidenceThreshold);
  if (!bestOutcome) {
    return null;
  }

  // Generate decision
  return generateDecision(agent, bestOutcome, relevantPredictions[0], context);
}

function shouldAgentAct(agent: Agent, context: AgentContactContext): boolean {
  const boundaries = agent.boundaries;
  
  // Check working hours
  if (boundaries.workingHoursOnly) {
    const now = new Date();
    const hour = now.getHours();
    const start = boundaries.workingHoursStart ?? 9;
    const end = boundaries.workingHoursEnd ?? 18;
    
    if (hour < start || hour >= end) {
      return false;
    }
    
    if (boundaries.excludeWeekends) {
      const day = now.getDay();
      if (day === 0 || day === 6) {
        return false;
      }
    }
  }
  
  // Check excluded tags
  if (boundaries.excludedTags?.length) {
    const contactTags = context.tags || [];
    if (boundaries.excludedTags.some(tag => contactTags.includes(tag))) {
      return false;
    }
  }
  
  // Check required tags
  if (boundaries.requiredTags?.length) {
    const contactTags = context.tags || [];
    if (!boundaries.requiredTags.every(tag => contactTags.includes(tag))) {
      return false;
    }
  }
  
  return true;
}

function filterRelevantPredictions(agent: Agent, predictions: AgentPrediction[]): AgentPrediction[] {
  return predictions.filter(prediction => {
    // Match prediction type to agent objective
    switch (agent.objective) {
      case 'increase_conversion':
        return prediction.predictionType === 'conversion';
      case 'reduce_churn':
        return prediction.predictionType === 'churn';
      case 'maximize_ltv':
        return prediction.predictionType === 'upsell';
      case 'reactivate_leads':
        return prediction.predictionType === 'engagement';
      case 'accelerate_pipeline':
        return prediction.predictionType === 'conversion';
      case 'optimize_engagement':
        return prediction.predictionType === 'engagement' || prediction.predictionType === 'interest_shift';
      default:
        return true;
    }
  }).filter(p => p.confidence >= agent.confidenceThreshold);
}

function simulateOutcomes(
  agent: Agent,
  predictions: AgentPrediction[],
  context: AgentContactContext
): SimulatedOutcome[] {
  const outcomes: SimulatedOutcome[] = [];
  
  for (const action of agent.allowedActions) {
    const outcome = simulateAction(action, predictions, context, agent);
    outcomes.push(outcome);
  }
  
  return outcomes.sort((a, b) => b.netValue - a.netValue);
}

function simulateAction(
  action: AgentActionType,
  predictions: AgentPrediction[],
  context: AgentContactContext,
  agent: Agent
): SimulatedOutcome {
  const prediction = predictions[0];
  const profile = context.profile;
  
  // Base probabilities based on action type
  const actionProbabilities: Record<AgentActionType, number> = {
    send_whatsapp: 0.65,
    send_email: 0.45,
    change_lifecycle_stage: 0.80,
    assign_sales_rep: 0.70,
    trigger_quiz: 0.55,
    change_offer: 0.60,
    delay_action: 0.90,
    request_human_approval: 0.95,
    add_tag: 0.95,
    remove_tag: 0.95,
    move_to_pipeline_stage: 0.85,
    start_cadence: 0.60,
    update_contact_field: 0.90
  };
  
  let successProbability = actionProbabilities[action] || 0.5;
  
  // Adjust based on prediction confidence
  successProbability *= prediction.confidence;
  
  // Adjust based on profile entropy (lower entropy = more predictable = higher success)
  if (profile) {
    const entropyFactor = 1 - (profile.entropy_score * 0.3);
    successProbability *= entropyFactor;
    
    // Adjust based on confidence score
    successProbability *= (0.7 + profile.confidence_score * 0.3);
  }
  
  // Calculate risk based on action type
  const actionRisks: Record<AgentActionType, number> = {
    send_whatsapp: 0.3,
    send_email: 0.2,
    change_lifecycle_stage: 0.1,
    assign_sales_rep: 0.1,
    trigger_quiz: 0.15,
    change_offer: 0.4,
    delay_action: 0.05,
    request_human_approval: 0.02,
    add_tag: 0.05,
    remove_tag: 0.05,
    move_to_pipeline_stage: 0.1,
    start_cadence: 0.25,
    update_contact_field: 0.05
  };
  
  const baseRisk = actionRisks[action] || 0.2;
  
  // Calculate expected reward based on objective alignment
  const rewardMultipliers = calculateRewardMultiplier(action, agent.objective, prediction);
  const expectedReward = successProbability * rewardMultipliers;
  
  // Calculate risk with prediction risk level
  const riskMultiplier = prediction.riskLevel === 'high' ? 1.5 : 
                        prediction.riskLevel === 'medium' ? 1.0 : 0.7;
  const expectedRisk = baseRisk * riskMultiplier;
  
  // Net value = reward - risk, weighted by success probability
  const netValue = (expectedReward * successProbability) - (expectedRisk * (1 - successProbability));
  
  return {
    action,
    successProbability,
    expectedReward,
    expectedRisk,
    netValue
  };
}

function calculateRewardMultiplier(
  action: AgentActionType,
  objective: AgentObjective,
  prediction: AgentPrediction
): number {
  // Action-objective alignment matrix
  const alignmentMatrix: Record<AgentObjective, Record<AgentActionType, number>> = {
    increase_conversion: {
      send_whatsapp: 0.8,
      send_email: 0.6,
      change_lifecycle_stage: 0.5,
      assign_sales_rep: 0.9,
      trigger_quiz: 0.7,
      change_offer: 0.9,
      delay_action: 0.2,
      request_human_approval: 0.4,
      add_tag: 0.3,
      remove_tag: 0.2,
      move_to_pipeline_stage: 0.7,
      start_cadence: 0.8,
      update_contact_field: 0.3
    },
    reduce_churn: {
      send_whatsapp: 0.9,
      send_email: 0.7,
      change_lifecycle_stage: 0.4,
      assign_sales_rep: 0.7,
      trigger_quiz: 0.5,
      change_offer: 0.8,
      delay_action: 0.3,
      request_human_approval: 0.5,
      add_tag: 0.3,
      remove_tag: 0.2,
      move_to_pipeline_stage: 0.4,
      start_cadence: 0.6,
      update_contact_field: 0.3
    },
    maximize_ltv: {
      send_whatsapp: 0.6,
      send_email: 0.5,
      change_lifecycle_stage: 0.6,
      assign_sales_rep: 0.8,
      trigger_quiz: 0.7,
      change_offer: 0.95,
      delay_action: 0.4,
      request_human_approval: 0.5,
      add_tag: 0.4,
      remove_tag: 0.3,
      move_to_pipeline_stage: 0.5,
      start_cadence: 0.7,
      update_contact_field: 0.4
    },
    reactivate_leads: {
      send_whatsapp: 0.85,
      send_email: 0.75,
      change_lifecycle_stage: 0.5,
      assign_sales_rep: 0.6,
      trigger_quiz: 0.8,
      change_offer: 0.7,
      delay_action: 0.2,
      request_human_approval: 0.4,
      add_tag: 0.4,
      remove_tag: 0.3,
      move_to_pipeline_stage: 0.5,
      start_cadence: 0.85,
      update_contact_field: 0.3
    },
    accelerate_pipeline: {
      send_whatsapp: 0.7,
      send_email: 0.6,
      change_lifecycle_stage: 0.8,
      assign_sales_rep: 0.9,
      trigger_quiz: 0.5,
      change_offer: 0.7,
      delay_action: 0.1,
      request_human_approval: 0.3,
      add_tag: 0.4,
      remove_tag: 0.3,
      move_to_pipeline_stage: 0.9,
      start_cadence: 0.8,
      update_contact_field: 0.4
    },
    optimize_engagement: {
      send_whatsapp: 0.85,
      send_email: 0.7,
      change_lifecycle_stage: 0.5,
      assign_sales_rep: 0.5,
      trigger_quiz: 0.9,
      change_offer: 0.6,
      delay_action: 0.4,
      request_human_approval: 0.4,
      add_tag: 0.5,
      remove_tag: 0.3,
      move_to_pipeline_stage: 0.4,
      start_cadence: 0.7,
      update_contact_field: 0.4
    }
  };
  
  const multiplier = alignmentMatrix[objective]?.[action] ?? 0.5;
  
  // Boost multiplier based on prediction urgency
  return multiplier * (0.8 + prediction.urgencyScore * 0.4);
}

function selectBestAction(
  outcomes: SimulatedOutcome[],
  confidenceThreshold: number
): SimulatedOutcome | null {
  // Filter by confidence threshold
  const viableOutcomes = outcomes.filter(o => o.successProbability >= confidenceThreshold);
  
  if (viableOutcomes.length === 0) {
    return null;
  }
  
  // Return highest net value action
  return viableOutcomes[0];
}

function generateDecision(
  agent: Agent,
  outcome: SimulatedOutcome,
  prediction: AgentPrediction,
  context: AgentContactContext
): AgentDecision {
  const factors: ExplanationFactor[] = [
    {
      factor: 'Prediction Confidence',
      weight: 0.3,
      value: `${(prediction.confidence * 100).toFixed(0)}%`,
      impact: prediction.confidence > 0.7 ? 'positive' : prediction.confidence > 0.5 ? 'neutral' : 'negative'
    },
    {
      factor: 'Success Probability',
      weight: 0.25,
      value: `${(outcome.successProbability * 100).toFixed(0)}%`,
      impact: outcome.successProbability > 0.6 ? 'positive' : outcome.successProbability > 0.4 ? 'neutral' : 'negative'
    },
    {
      factor: 'Expected Reward',
      weight: 0.25,
      value: `${(outcome.expectedReward * 100).toFixed(0)}%`,
      impact: outcome.expectedReward > 0.5 ? 'positive' : outcome.expectedReward > 0.3 ? 'neutral' : 'negative'
    },
    {
      factor: 'Risk Level',
      weight: 0.2,
      value: prediction.riskLevel,
      impact: prediction.riskLevel === 'low' ? 'positive' : prediction.riskLevel === 'medium' ? 'neutral' : 'negative'
    }
  ];
  
  // Add profile factors if available
  if (context.profile) {
    factors.push({
      factor: 'Profile Confidence',
      weight: 0.15,
      value: `${(context.profile.confidence_score * 100).toFixed(0)}%`,
      impact: context.profile.confidence_score > 0.6 ? 'positive' : 'neutral'
    });
  }
  
  const explanation: DecisionExplanation = {
    reasoning: generateReasoning(agent, outcome, prediction),
    factors,
    alternativesConsidered: [],
    expectedOutcome: generateExpectedOutcome(outcome, agent.objective),
    potentialRisks: generatePotentialRisks(outcome, prediction)
  };
  
  const decisionData = generateDecisionData(outcome.action, context, prediction);
  
  return {
    agentId: agent.id,
    contactId: context.contactId,
    projectId: agent.projectId,
    predictionId: prediction.id,
    decisionType: outcome.action,
    decisionData,
    explanation,
    confidence: outcome.successProbability,
    riskScore: outcome.expectedRisk,
    rewardScore: outcome.expectedReward
  };
}

function generateReasoning(agent: Agent, outcome: SimulatedOutcome, prediction: Prediction): string {
  const actionDescriptions: Record<AgentActionType, string> = {
    send_whatsapp: 'enviar mensagem WhatsApp',
    send_email: 'enviar email',
    change_lifecycle_stage: 'alterar estágio do ciclo de vida',
    assign_sales_rep: 'atribuir representante de vendas',
    trigger_quiz: 'disparar quiz',
    change_offer: 'alterar oferta',
    delay_action: 'aguardar momento ideal',
    request_human_approval: 'solicitar aprovação humana',
    add_tag: 'adicionar tag',
    remove_tag: 'remover tag',
    move_to_pipeline_stage: 'mover estágio do pipeline',
    start_cadence: 'iniciar cadência',
    update_contact_field: 'atualizar campo do contato'
  };
  
  const objectiveDescriptions: Record<AgentObjective, string> = {
    increase_conversion: 'aumentar conversão',
    reduce_churn: 'reduzir churn',
    maximize_ltv: 'maximizar LTV',
    reactivate_leads: 'reativar leads',
    accelerate_pipeline: 'acelerar pipeline',
    optimize_engagement: 'otimizar engajamento'
  };
  
  return `Com base no objetivo de ${objectiveDescriptions[agent.objective]}, recomendo ${actionDescriptions[outcome.action]}. ` +
    `A predição indica ${prediction.predictionType || 'análise'} com ${(prediction.confidence * 100).toFixed(0)}% de confiança e ` +
    `risco ${prediction.riskLevel}. Esta ação tem ${(outcome.successProbability * 100).toFixed(0)}% de probabilidade de sucesso ` +
    `com valor líquido esperado de ${(outcome.netValue * 100).toFixed(0)}%.`;
}

function generateExpectedOutcome(outcome: SimulatedOutcome, objective: AgentObjective): string {
  const outcomes: Record<AgentObjective, string> = {
    increase_conversion: 'Aumento na probabilidade de conversão',
    reduce_churn: 'Redução no risco de cancelamento',
    maximize_ltv: 'Incremento no valor do ciclo de vida',
    reactivate_leads: 'Reengajamento do lead inativo',
    accelerate_pipeline: 'Aceleração no funil de vendas',
    optimize_engagement: 'Melhoria no engajamento geral'
  };
  
  return `${outcomes[objective]} com ${(outcome.successProbability * 100).toFixed(0)}% de probabilidade.`;
}

function generatePotentialRisks(outcome: SimulatedOutcome, prediction: AgentPrediction): string[] {
  const risks: string[] = [];
  
  if (outcome.expectedRisk > 0.3) {
    risks.push('Risco de reação negativa do contato');
  }
  
  if (prediction.riskLevel === 'high') {
    risks.push('Contato em situação crítica - ação pode ser tarde demais');
  }
  
  if (outcome.successProbability < 0.5) {
    risks.push('Probabilidade de sucesso abaixo do ideal');
  }
  
  if (outcome.action === 'send_whatsapp' || outcome.action === 'send_email') {
    risks.push('Potencial fadiga de comunicação se muito frequente');
  }
  
  if (outcome.action === 'change_offer') {
    risks.push('Mudança de oferta pode confundir o contato');
  }
  
  return risks;
}

function generateDecisionData(
  action: AgentActionType,
  context: AgentContactContext,
  prediction: AgentPrediction
): Record<string, unknown> {
  switch (action) {
    case 'send_whatsapp':
    case 'send_email':
      return {
        suggestedMessage: prediction.recommendedActions?.[0]?.suggestedCopy || '',
        channel: action === 'send_whatsapp' ? 'whatsapp' : 'email',
        urgency: prediction.urgencyScore > 0.7 ? 'high' : 'normal'
      };
    case 'change_offer':
      return {
        currentOffer: context.lastOfferCode || '',
        suggestedOffer: '',
        reason: 'Baseado no perfil cognitivo do contato'
      };
    case 'assign_sales_rep':
      return {
        priority: prediction.urgencyScore > 0.7 ? 'high' : 'normal',
        reason: `${prediction.predictionType || 'análise'} com ${(prediction.confidence * 100).toFixed(0)}% confiança`
      };
    case 'trigger_quiz':
      return {
        quizType: 'engagement',
        reason: 'Coletar mais sinais para refinar perfil'
      };
    case 'start_cadence':
      return {
        cadenceType: (prediction.predictionType || '') === 'churn' ? 'retention' : 'nurturing',
        duration: prediction.urgencyScore > 0.7 ? 'short' : 'standard'
      };
    default:
      return {};
  }
}

// Format functions for UI
export function formatAgentObjective(objective: AgentObjective): string {
  const labels: Record<AgentObjective, string> = {
    increase_conversion: 'Aumentar Conversão',
    reduce_churn: 'Reduzir Churn',
    maximize_ltv: 'Maximizar LTV',
    reactivate_leads: 'Reativar Leads',
    accelerate_pipeline: 'Acelerar Pipeline',
    optimize_engagement: 'Otimizar Engajamento'
  };
  return labels[objective] || objective;
}

export function formatAgentAction(action: AgentActionType): string {
  const labels: Record<AgentActionType, string> = {
    send_whatsapp: 'Enviar WhatsApp',
    send_email: 'Enviar Email',
    change_lifecycle_stage: 'Alterar Estágio',
    assign_sales_rep: 'Atribuir Vendedor',
    trigger_quiz: 'Disparar Quiz',
    change_offer: 'Alterar Oferta',
    delay_action: 'Aguardar',
    request_human_approval: 'Aprovação Humana',
    add_tag: 'Adicionar Tag',
    remove_tag: 'Remover Tag',
    move_to_pipeline_stage: 'Mover Pipeline',
    start_cadence: 'Iniciar Cadência',
    update_contact_field: 'Atualizar Campo'
  };
  return labels[action] || action;
}

export function formatTriggerType(trigger: TriggerType): string {
  const labels: Record<TriggerType, string> = {
    prediction_created: 'Predição Criada',
    recommendation_generated: 'Recomendação Gerada',
    profile_shift: 'Mudança de Perfil',
    high_risk_signal: 'Sinal de Alto Risco',
    funnel_outcome: 'Resultado de Funil',
    purchase_completed: 'Compra Realizada',
    quiz_completed: 'Quiz Completado'
  };
  return labels[trigger] || trigger;
}

export function getObjectiveIcon(objective: AgentObjective): string {
  const icons: Record<AgentObjective, string> = {
    increase_conversion: '🎯',
    reduce_churn: '🛡️',
    maximize_ltv: '💎',
    reactivate_leads: '🔄',
    accelerate_pipeline: '⚡',
    optimize_engagement: '💬'
  };
  return icons[objective] || '🤖';
}

export function getActionIcon(action: AgentActionType): string {
  const icons: Record<AgentActionType, string> = {
    send_whatsapp: '💬',
    send_email: '📧',
    change_lifecycle_stage: '📊',
    assign_sales_rep: '👤',
    trigger_quiz: '❓',
    change_offer: '🎁',
    delay_action: '⏳',
    request_human_approval: '✋',
    add_tag: '🏷️',
    remove_tag: '🗑️',
    move_to_pipeline_stage: '➡️',
    start_cadence: '🔄',
    update_contact_field: '✏️'
  };
  return icons[action] || '⚙️';
}
