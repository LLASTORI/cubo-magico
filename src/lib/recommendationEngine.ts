/**
 * Recommendation Engine
 * 
 * Generates Next Best Action (NBA) recommendations based on:
 * - Cognitive Profile (intent & trait vectors)
 * - Quiz/Survey results
 * - Purchase history
 * - Event patterns
 * - Funnel outcomes
 * 
 * IMPORTANT: All financial data MUST come from Financial Core.
 * Legacy data (before financial_core_start_date) is ignored.
 */

import { ContactProfile } from '@/hooks/useContactProfile';

// ==========================================
// Types
// ==========================================

export type PredictionType = 
  | 'conversion' 
  | 'churn' 
  | 'upsell' 
  | 'cross_sell'
  | 'interest_shift' 
  | 'engagement'
  | 'reactivation'
  | 'nurture';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ActionType = 
  | 'send_message'
  | 'send_offer'
  | 'add_to_sequence'
  | 'assign_tag'
  | 'move_stage'
  | 'schedule_call'
  | 'send_survey'
  | 'wait_and_observe';

export interface RecommendedAction {
  type: ActionType;
  priority: number; // 1-10
  title: string;
  description: string;
  config: Record<string, any>;
  suggestedCopy?: string;
  suggestedChannel?: 'whatsapp' | 'email' | 'sms' | 'push';
}

export interface PredictionExplanation {
  summary: string;
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
    value: string;
  }[];
  confidence_breakdown: {
    data_quality: number;
    pattern_match: number;
    recency: number;
  };
}

export interface Prediction {
  type: PredictionType;
  confidence: number;
  riskLevel: RiskLevel;
  urgencyScore: number;
  explanation: PredictionExplanation;
  recommendedActions: RecommendedAction[];
  expiresAt?: Date;
}

export interface ContactContext {
  contactId: string;
  projectId: string;
  profile?: ContactProfile | null;
  quizResults?: QuizResultContext[];
  surveyResponses?: SurveyResponseContext[];
  transactions?: TransactionContext[];
  events?: EventContext[];
  funnelOutcomes?: FunnelOutcomeContext[];
  lastInteractionAt?: Date;
  daysSinceLastPurchase?: number;
  totalRevenue?: number;
  purchaseCount?: number;
  status?: 'lead' | 'prospect' | 'customer';
  tags?: string[];
}

interface QuizResultContext {
  quizId: string;
  quizName: string;
  outcomeId?: string;
  outcomeName?: string;
  vectors: Record<string, number>;
  completedAt: Date;
}

interface SurveyResponseContext {
  surveyId: string;
  surveyName: string;
  score?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  completedAt: Date;
}

interface TransactionContext {
  productName: string;
  status: string;
  value: number;
  date: Date;
}

interface EventContext {
  eventName: string;
  source: string;
  createdAt: Date;
  payload?: Record<string, any>;
}

interface FunnelOutcomeContext {
  outcomeId: string;
  outcomeName: string;
  funnelName: string;
  selectedAt: Date;
}

// ==========================================
// Core Engine
// ==========================================

/**
 * Generate predictions for a contact
 */
export function generatePredictions(context: ContactContext): Prediction[] {
  const predictions: Prediction[] = [];

  // Run all prediction algorithms
  const conversionPrediction = predictConversion(context);
  if (conversionPrediction) predictions.push(conversionPrediction);

  const churnPrediction = predictChurn(context);
  if (churnPrediction) predictions.push(churnPrediction);

  const upsellPrediction = predictUpsell(context);
  if (upsellPrediction) predictions.push(upsellPrediction);

  const engagementPrediction = predictEngagement(context);
  if (engagementPrediction) predictions.push(engagementPrediction);

  // Sort by urgency and confidence
  return predictions.sort((a, b) => {
    const aScore = a.urgencyScore * 0.6 + a.confidence * 0.4;
    const bScore = b.urgencyScore * 0.6 + b.confidence * 0.4;
    return bScore - aScore;
  });
}

/**
 * Get the primary recommendation for a contact
 */
export function getPrimaryRecommendation(context: ContactContext): Prediction | null {
  const predictions = generatePredictions(context);
  return predictions[0] || null;
}

// ==========================================
// Prediction Algorithms
// ==========================================

function predictConversion(context: ContactContext): Prediction | null {
  const { profile, status, quizResults, events, transactions } = context;

  // Already a customer with purchases
  if (status === 'customer' && transactions && transactions.length > 0) {
    return null;
  }

  const factors: PredictionExplanation['factors'] = [];
  let score = 0.5; // Base score

  // Factor 1: Intent vector analysis
  if (profile?.intent_vector) {
    const buyIntent = profile.intent_vector['buy'] || profile.intent_vector['purchase'] || 0;
    const interestIntent = profile.intent_vector['interest'] || profile.intent_vector['curious'] || 0;
    
    if (buyIntent > 0.6) {
      score += 0.25;
      factors.push({
        name: 'Alta intenção de compra',
        impact: 'positive',
        weight: 0.25,
        value: `${Math.round(buyIntent * 100)}%`
      });
    } else if (interestIntent > 0.5) {
      score += 0.1;
      factors.push({
        name: 'Interesse demonstrado',
        impact: 'positive',
        weight: 0.1,
        value: `${Math.round(interestIntent * 100)}%`
      });
    }
  }

  // Factor 2: Quiz completion with outcome
  if (quizResults && quizResults.length > 0) {
    const recentQuiz = quizResults[0];
    if (recentQuiz.outcomeId) {
      score += 0.15;
      factors.push({
        name: 'Quiz completado com resultado',
        impact: 'positive',
        weight: 0.15,
        value: recentQuiz.outcomeName || 'Sim'
      });
    }
  }

  // Factor 3: Engagement recency
  if (context.lastInteractionAt) {
    const daysSince = Math.floor((Date.now() - context.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 1) {
      score += 0.15;
      factors.push({
        name: 'Interação recente',
        impact: 'positive',
        weight: 0.15,
        value: 'Hoje'
      });
    } else if (daysSince <= 3) {
      score += 0.08;
      factors.push({
        name: 'Interação recente',
        impact: 'positive',
        weight: 0.08,
        value: `${daysSince} dias`
      });
    } else if (daysSince > 14) {
      score -= 0.1;
      factors.push({
        name: 'Sem interação recente',
        impact: 'negative',
        weight: -0.1,
        value: `${daysSince} dias`
      });
    }
  }

  // Factor 4: Profile confidence
  if (profile) {
    if (profile.confidence_score > 0.7) {
      score += 0.1;
      factors.push({
        name: 'Perfil bem definido',
        impact: 'positive',
        weight: 0.1,
        value: `${Math.round(profile.confidence_score * 100)}%`
      });
    }
  }

  // Factor 5: Previous failed transactions (high intent)
  if (transactions) {
    const pendingTx = transactions.filter(t => 
      t.status.toLowerCase().includes('pending') || 
      t.status.toLowerCase().includes('abandoned')
    );
    if (pendingTx.length > 0) {
      score += 0.2;
      factors.push({
        name: 'Tentativa de compra anterior',
        impact: 'positive',
        weight: 0.2,
        value: `${pendingTx.length} tentativa(s)`
      });
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(1, score));

  if (score < 0.3 || factors.length < 2) {
    return null;
  }

  // Generate recommended actions based on score
  const actions = generateConversionActions(context, score);

  return {
    type: 'conversion',
    confidence: score,
    riskLevel: score > 0.7 ? 'low' : score > 0.5 ? 'medium' : 'high',
    urgencyScore: Math.min(1, score + 0.1),
    explanation: {
      summary: score > 0.7 
        ? 'Este lead tem alta probabilidade de conversão. Ação imediata recomendada.'
        : score > 0.5
        ? 'Sinais moderados de intenção de compra detectados.'
        : 'Lead em fase inicial. Nurturing recomendado.',
      factors,
      confidence_breakdown: {
        data_quality: profile ? profile.confidence_score : 0.3,
        pattern_match: factors.length / 5,
        recency: context.lastInteractionAt 
          ? Math.max(0, 1 - (Date.now() - context.lastInteractionAt.getTime()) / (14 * 24 * 60 * 60 * 1000))
          : 0.2
      }
    },
    recommendedActions: actions,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };
}

function predictChurn(context: ContactContext): Prediction | null {
  const { status, transactions, lastInteractionAt, profile, daysSinceLastPurchase } = context;

  // Only for customers
  if (status !== 'customer' || !transactions || transactions.length === 0) {
    return null;
  }

  const factors: PredictionExplanation['factors'] = [];
  let churnRisk = 0.3; // Base risk

  // Factor 1: Days since last purchase
  if (daysSinceLastPurchase !== undefined) {
    if (daysSinceLastPurchase > 90) {
      churnRisk += 0.3;
      factors.push({
        name: 'Muito tempo sem compra',
        impact: 'negative',
        weight: 0.3,
        value: `${daysSinceLastPurchase} dias`
      });
    } else if (daysSinceLastPurchase > 60) {
      churnRisk += 0.15;
      factors.push({
        name: 'Tempo moderado sem compra',
        impact: 'negative',
        weight: 0.15,
        value: `${daysSinceLastPurchase} dias`
      });
    }
  }

  // Factor 2: Engagement drop
  if (lastInteractionAt) {
    const daysSinceInteraction = Math.floor((Date.now() - lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceInteraction > 30) {
      churnRisk += 0.2;
      factors.push({
        name: 'Sem engajamento recente',
        impact: 'negative',
        weight: 0.2,
        value: `${daysSinceInteraction} dias`
      });
    }
  }

  // Factor 3: Profile volatility
  if (profile && profile.volatility_score > 0.7) {
    churnRisk += 0.1;
    factors.push({
      name: 'Alta volatilidade comportamental',
      impact: 'negative',
      weight: 0.1,
      value: `${Math.round(profile.volatility_score * 100)}%`
    });
  }

  // Factor 4: Low intent in profile
  if (profile?.intent_vector) {
    const buyIntent = profile.intent_vector['buy'] || profile.intent_vector['purchase'] || 0;
    if (buyIntent < 0.2) {
      churnRisk += 0.1;
      factors.push({
        name: 'Baixa intenção de recompra',
        impact: 'negative',
        weight: 0.1,
        value: `${Math.round(buyIntent * 100)}%`
      });
    }
  }

  churnRisk = Math.max(0, Math.min(1, churnRisk));

  if (churnRisk < 0.4 || factors.length < 2) {
    return null;
  }

  const actions = generateChurnPreventionActions(context, churnRisk);

  return {
    type: 'churn',
    confidence: churnRisk,
    riskLevel: churnRisk > 0.7 ? 'critical' : churnRisk > 0.5 ? 'high' : 'medium',
    urgencyScore: churnRisk,
    explanation: {
      summary: churnRisk > 0.7
        ? '⚠️ Risco crítico de churn. Ação imediata necessária.'
        : churnRisk > 0.5
        ? 'Sinais de desengajamento detectados. Atenção recomendada.'
        : 'Monitorar comportamento nos próximos dias.',
      factors,
      confidence_breakdown: {
        data_quality: profile ? profile.confidence_score : 0.5,
        pattern_match: factors.length / 4,
        recency: 0.8
      }
    },
    recommendedActions: actions,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
  };
}

function predictUpsell(context: ContactContext): Prediction | null {
  const { status, transactions, profile, totalRevenue } = context;

  // Only for customers with purchases
  if (status !== 'customer' || !transactions || transactions.length === 0) {
    return null;
  }

  const factors: PredictionExplanation['factors'] = [];
  let upsellPotential = 0.3;

  // Factor 1: Multiple purchases = engaged customer
  if (transactions.length >= 2) {
    upsellPotential += 0.2;
    factors.push({
      name: 'Cliente recorrente',
      impact: 'positive',
      weight: 0.2,
      value: `${transactions.length} compras`
    });
  }

  // Factor 2: High total revenue
  if (totalRevenue && totalRevenue > 500) {
    upsellPotential += 0.15;
    factors.push({
      name: 'Alto LTV',
      impact: 'positive',
      weight: 0.15,
      value: `R$ ${totalRevenue.toFixed(2)}`
    });
  }

  // Factor 3: Profile traits suggesting premium interest
  if (profile?.trait_vector) {
    const premiumTrait = profile.trait_vector['premium'] || profile.trait_vector['high_value'] || 0;
    if (premiumTrait > 0.5) {
      upsellPotential += 0.2;
      factors.push({
        name: 'Perfil premium',
        impact: 'positive',
        weight: 0.2,
        value: `${Math.round(premiumTrait * 100)}%`
      });
    }
  }

  // Factor 4: Recent engagement
  if (context.lastInteractionAt) {
    const daysSince = Math.floor((Date.now() - context.lastInteractionAt.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) {
      upsellPotential += 0.1;
      factors.push({
        name: 'Engajamento ativo',
        impact: 'positive',
        weight: 0.1,
        value: 'Última semana'
      });
    }
  }

  upsellPotential = Math.max(0, Math.min(1, upsellPotential));

  if (upsellPotential < 0.4 || factors.length < 2) {
    return null;
  }

  const actions = generateUpsellActions(context, upsellPotential);

  return {
    type: 'upsell',
    confidence: upsellPotential,
    riskLevel: 'low',
    urgencyScore: upsellPotential * 0.7, // Less urgent than conversion
    explanation: {
      summary: upsellPotential > 0.7
        ? 'Excelente candidato para upgrade ou produtos complementares.'
        : 'Potencial para oferta de produtos adicionais.',
      factors,
      confidence_breakdown: {
        data_quality: profile ? profile.confidence_score : 0.6,
        pattern_match: factors.length / 4,
        recency: 0.7
      }
    },
    recommendedActions: actions,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };
}

function predictEngagement(context: ContactContext): Prediction | null {
  const { profile, events, status, lastInteractionAt } = context;

  if (status === 'customer') {
    return null; // Handle in churn/upsell
  }

  const factors: PredictionExplanation['factors'] = [];
  let engagementScore = 0.5;

  // Factor 1: Event frequency
  if (events && events.length > 0) {
    const recentEvents = events.filter(e => 
      Date.now() - e.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000
    );
    if (recentEvents.length >= 3) {
      engagementScore += 0.2;
      factors.push({
        name: 'Alta frequência de eventos',
        impact: 'positive',
        weight: 0.2,
        value: `${recentEvents.length} esta semana`
      });
    }
  }

  // Factor 2: Profile entropy (diversity of interests)
  if (profile) {
    if (profile.entropy_score > 0.7) {
      engagementScore += 0.1;
      factors.push({
        name: 'Interesses diversos',
        impact: 'positive',
        weight: 0.1,
        value: 'Alto'
      });
    }
  }

  // Factor 3: Signal count
  if (profile && profile.total_signals > 5) {
    engagementScore += 0.15;
    factors.push({
      name: 'Múltiplos sinais coletados',
      impact: 'positive',
      weight: 0.15,
      value: `${profile.total_signals} sinais`
    });
  }

  engagementScore = Math.max(0, Math.min(1, engagementScore));

  if (factors.length < 2) {
    return null;
  }

  return {
    type: 'engagement',
    confidence: engagementScore,
    riskLevel: engagementScore > 0.6 ? 'low' : 'medium',
    urgencyScore: engagementScore * 0.5,
    explanation: {
      summary: engagementScore > 0.7
        ? 'Lead altamente engajado. Pronto para próximo passo.'
        : 'Engajamento moderado. Continue nutrindo.',
      factors,
      confidence_breakdown: {
        data_quality: profile ? profile.confidence_score : 0.4,
        pattern_match: factors.length / 3,
        recency: 0.6
      }
    },
    recommendedActions: [
      {
        type: 'send_survey',
        priority: 7,
        title: 'Enviar pesquisa de interesse',
        description: 'Coletar mais dados para refinar perfil',
        config: {}
      },
      {
        type: 'add_to_sequence',
        priority: 6,
        title: 'Adicionar à sequência de nurturing',
        description: 'Manter engajamento consistente',
        config: {}
      }
    ],
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  };
}

// ==========================================
// Action Generators
// ==========================================

function generateConversionActions(context: ContactContext, score: number): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (score > 0.7) {
    // High intent - direct approach
    actions.push({
      type: 'send_message',
      priority: 10,
      title: 'Enviar mensagem de fechamento',
      description: 'Abordagem direta com oferta personalizada',
      suggestedChannel: 'whatsapp',
      suggestedCopy: generatePersonalizedCopy(context, 'closing'),
      config: { urgency: 'high' }
    });

    actions.push({
      type: 'send_offer',
      priority: 9,
      title: 'Apresentar oferta exclusiva',
      description: 'Criar senso de urgência com benefício limitado',
      config: { discount_type: 'time_limited' }
    });
  } else if (score > 0.5) {
    // Medium intent - nurture with value
    actions.push({
      type: 'send_message',
      priority: 8,
      title: 'Enviar conteúdo de valor',
      description: 'Educar e construir confiança',
      suggestedChannel: 'whatsapp',
      suggestedCopy: generatePersonalizedCopy(context, 'nurture'),
      config: {}
    });

    actions.push({
      type: 'schedule_call',
      priority: 7,
      title: 'Agendar ligação consultiva',
      description: 'Entender objeções e personalizar solução',
      config: {}
    });
  } else {
    // Low intent - long nurture
    actions.push({
      type: 'add_to_sequence',
      priority: 6,
      title: 'Adicionar à sequência de aquecimento',
      description: 'Nurturing de longo prazo com conteúdo educativo',
      config: { sequence_type: 'awareness' }
    });
  }

  return actions;
}

function generateChurnPreventionActions(context: ContactContext, risk: number): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  if (risk > 0.7) {
    // Critical - immediate intervention
    actions.push({
      type: 'send_message',
      priority: 10,
      title: 'Reativação urgente',
      description: 'Mensagem personalizada com oferta especial',
      suggestedChannel: 'whatsapp',
      suggestedCopy: 'Oi! Sentimos sua falta. Preparamos algo especial para você...',
      config: { urgency: 'critical' }
    });

    actions.push({
      type: 'schedule_call',
      priority: 9,
      title: 'Ligação de relacionamento',
      description: 'Entender insatisfação e recuperar',
      config: {}
    });
  } else {
    // Medium risk - re-engagement
    actions.push({
      type: 'send_survey',
      priority: 8,
      title: 'Pesquisa de satisfação',
      description: 'Identificar pontos de atrito',
      config: {}
    });

    actions.push({
      type: 'send_offer',
      priority: 7,
      title: 'Oferta de recompra',
      description: 'Incentivo para nova compra',
      config: { discount_type: 'loyalty' }
    });
  }

  return actions;
}

function generateUpsellActions(context: ContactContext, potential: number): RecommendedAction[] {
  return [
    {
      type: 'send_offer',
      priority: 8,
      title: 'Apresentar produto complementar',
      description: 'Cross-sell baseado em compras anteriores',
      config: { offer_type: 'cross_sell' }
    },
    {
      type: 'send_message',
      priority: 7,
      title: 'Convite para programa VIP',
      description: 'Exclusividade e benefícios especiais',
      suggestedChannel: 'whatsapp',
      suggestedCopy: 'Como cliente especial, você tem acesso antecipado a...',
      config: {}
    }
  ];
}

function generatePersonalizedCopy(context: ContactContext, type: 'closing' | 'nurture'): string {
  const { profile, quizResults } = context;

  // Base templates
  const closingTemplates = [
    'Oi! Vi que você se interessou por {product}. Posso te ajudar a tomar a melhor decisão?',
    'Preparamos uma condição especial pra você. Posso te contar mais?',
    'Tudo certo? Vi que você ficou perto de uma decisão importante. Quer conversar?'
  ];

  const nurtureTemplates = [
    'Oi! Separei um conteúdo que combina muito com o que você busca...',
    'Pensei em você quando vi isso. Acho que pode te ajudar:',
    'Uma dica rápida que pode fazer diferença pra você:'
  ];

  const templates = type === 'closing' ? closingTemplates : nurtureTemplates;
  
  // Select based on profile characteristics
  let templateIndex = 0;
  if (profile?.trait_vector) {
    const directTrait = profile.trait_vector['direct'] || profile.trait_vector['assertive'] || 0;
    if (directTrait > 0.6) {
      templateIndex = 0; // Direct approach
    } else {
      templateIndex = 1; // Softer approach
    }
  }

  let copy = templates[templateIndex % templates.length];

  // Replace placeholders
  if (quizResults && quizResults.length > 0) {
    copy = copy.replace('{product}', quizResults[0].outcomeName || 'nossos produtos');
  } else {
    copy = copy.replace('{product}', 'nossa solução');
  }

  return copy;
}

// ==========================================
// Utility Functions
// ==========================================

/**
 * Format risk level for display
 */
export function formatRiskLevel(level: RiskLevel): { label: string; color: string } {
  const config: Record<RiskLevel, { label: string; color: string }> = {
    low: { label: 'Baixo', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
    medium: { label: 'Médio', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400' },
    high: { label: 'Alto', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400' },
    critical: { label: 'Crítico', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' }
  };
  return config[level];
}

/**
 * Format prediction type for display
 */
export function formatPredictionType(type: PredictionType): { label: string; icon: string } {
  const config: Record<PredictionType, { label: string; icon: string }> = {
    conversion: { label: 'Conversão', icon: '🎯' },
    churn: { label: 'Risco de Churn', icon: '⚠️' },
    upsell: { label: 'Upsell', icon: '📈' },
    cross_sell: { label: 'Cross-sell', icon: '🔄' },
    interest_shift: { label: 'Mudança de Interesse', icon: '🔀' },
    engagement: { label: 'Engajamento', icon: '💬' },
    reactivation: { label: 'Reativação', icon: '🔄' },
    nurture: { label: 'Nurturing', icon: '🌱' }
  };
  return config[type];
}

/**
 * Format action type for display
 */
export function formatActionType(type: ActionType): { label: string; icon: string } {
  const config: Record<ActionType, { label: string; icon: string }> = {
    send_message: { label: 'Enviar Mensagem', icon: '💬' },
    send_offer: { label: 'Enviar Oferta', icon: '🎁' },
    add_to_sequence: { label: 'Adicionar à Sequência', icon: '📋' },
    assign_tag: { label: 'Atribuir Tag', icon: '🏷️' },
    move_stage: { label: 'Mover Etapa', icon: '➡️' },
    schedule_call: { label: 'Agendar Ligação', icon: '📞' },
    send_survey: { label: 'Enviar Pesquisa', icon: '📝' },
    wait_and_observe: { label: 'Aguardar', icon: '👀' }
  };
  return config[type];
}
