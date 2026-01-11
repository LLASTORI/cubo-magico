/**
 * Quiz Co-Pilot Engine
 * 
 * Translates cognitive objectives into quiz architectures.
 * This is the intelligence layer that helps design quizzes
 * as cognitive instruments, not just forms.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface QuizObjective {
  primary: ObjectiveType;
  secondary?: ObjectiveType[];
  decisionType: DecisionType;
  channel: ChannelType;
  duration: DurationType;
  audienceType?: string;
  context?: string;
}

export type ObjectiveType =
  | 'classify_intent'
  | 'measure_maturity'
  | 'profile_emotional'
  | 'detect_objections'
  | 'assess_awareness'
  | 'qualify_lead'
  | 'segment_audience'
  | 'understand_pain_points';

export type DecisionType =
  | 'segmentation'
  | 'routing'
  | 'qualification'
  | 'personalization'
  | 'scoring'
  | 'recommendation';

export type ChannelType =
  | 'whatsapp'
  | 'ads'
  | 'landing'
  | 'diagnostic'
  | 'onboarding'
  | 'email';

export type DurationType = 'quick' | 'medium' | 'deep';

export interface QuestionArchetype {
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'text';
  purpose: QuestionPurpose;
  cognitiveTarget: string[];
  suggestedTitle: string;
  suggestedSubtitle?: string;
  suggestedOptions?: SuggestedOption[];
  traitsImpact: Record<string, number>;
  intentsImpact: Record<string, number>;
  weight: number;
  isRequired: boolean;
  order: number;
}

export type QuestionPurpose =
  | 'intent_signal'
  | 'objection_detection'
  | 'urgency_measure'
  | 'profile_trait'
  | 'context_gather'
  | 'pain_point_discovery'
  | 'awareness_level'
  | 'trust_signal'
  | 'decision_factor';

export interface SuggestedOption {
  label: string;
  value: string;
  traitsVector: Record<string, number>;
  intentVector: Record<string, number>;
  weight: number;
}

export interface QuizArchitecture {
  name: string;
  description: string;
  type: string;
  questions: QuestionArchetype[];
  suggestedOutcomes: SuggestedOutcome[];
  cognitiveProfile: {
    targetTraits: string[];
    targetIntents: string[];
    expectedCoverage: number;
    discriminationPower: number;
  };
  estimatedDuration: number; // minutes
  branchingSuggestions: BranchingSuggestion[];
}

export interface SuggestedOutcome {
  name: string;
  description: string;
  priority: number;
  conditions: OutcomeConditionSuggestion[];
  actions: OutcomeActionSuggestion[];
}

export interface OutcomeConditionSuggestion {
  type: string;
  field: string;
  operator: string;
  value: any;
  rationale: string;
}

export interface OutcomeActionSuggestion {
  type: string;
  config: Record<string, any>;
  rationale: string;
}

export interface BranchingSuggestion {
  afterQuestion: number;
  condition: string;
  targetQuestion: number | 'end';
  rationale: string;
}

// ============================================================================
// COGNITIVE DIMENSION DEFINITIONS
// ============================================================================

const TRAIT_DIMENSIONS = {
  analytical: 'Perfil que analisa dados e fatos antes de decidir',
  emotional: 'Decide com base em sentimentos e conexões',
  impulsive: 'Toma decisões rápidas, sem muita deliberação',
  methodical: 'Segue processos estruturados e organizados',
  social: 'Influenciado por opiniões e validação social',
  autonomous: 'Prefere decidir de forma independente',
  risk_taker: 'Aberto a novidades e riscos calculados',
  conservative: 'Prefere segurança e estabilidade',
};

const INTENT_DIMENSIONS = {
  purchase: 'Intenção de compra',
  learn: 'Deseja aprender mais',
  compare: 'Está comparando opções',
  support: 'Busca suporte ou ajuda',
  churn: 'Risco de abandono',
  upgrade: 'Interesse em upgrade',
  refer: 'Potencial de indicação',
};

// ============================================================================
// QUESTION TEMPLATES BY OBJECTIVE
// ============================================================================

const QUESTION_TEMPLATES: Record<ObjectiveType, Partial<QuestionArchetype>[]> = {
  classify_intent: [
    {
      type: 'single_choice',
      purpose: 'intent_signal',
      suggestedTitle: 'O que te trouxe aqui hoje?',
      suggestedOptions: [
        { label: 'Estou pronto para comprar', value: 'ready_buy', traitsVector: { impulsive: 0.3 }, intentVector: { purchase: 0.9 }, weight: 1.5 },
        { label: 'Quero conhecer melhor', value: 'explore', traitsVector: { analytical: 0.3 }, intentVector: { learn: 0.7, compare: 0.3 }, weight: 1 },
        { label: 'Estou comparando opções', value: 'comparing', traitsVector: { methodical: 0.4 }, intentVector: { compare: 0.8 }, weight: 1.2 },
        { label: 'Só curiosidade', value: 'curious', traitsVector: { conservative: 0.2 }, intentVector: { learn: 0.4 }, weight: 0.5 },
      ],
      cognitiveTarget: ['purchase', 'learn', 'compare'],
      traitsImpact: { analytical: 0.3, impulsive: 0.3 },
      intentsImpact: { purchase: 0.5, learn: 0.3, compare: 0.2 },
      weight: 1.5,
      isRequired: true,
    },
    {
      type: 'scale',
      purpose: 'urgency_measure',
      suggestedTitle: 'Qual a urgência para resolver isso?',
      suggestedSubtitle: '1 = Sem pressa, 10 = Urgente',
      cognitiveTarget: ['purchase', 'urgency'],
      traitsImpact: { impulsive: 0.4 },
      intentsImpact: { purchase: 0.6 },
      weight: 1.3,
      isRequired: true,
    },
  ],
  measure_maturity: [
    {
      type: 'single_choice',
      purpose: 'awareness_level',
      suggestedTitle: 'Qual seu nível de conhecimento sobre [tema]?',
      suggestedOptions: [
        { label: 'Sou iniciante, estou começando', value: 'beginner', traitsVector: { conservative: 0.3 }, intentVector: { learn: 0.8 }, weight: 0.8 },
        { label: 'Tenho noções básicas', value: 'basic', traitsVector: { methodical: 0.2 }, intentVector: { learn: 0.5 }, weight: 1 },
        { label: 'Conheço bem o assunto', value: 'intermediate', traitsVector: { analytical: 0.3 }, intentVector: { compare: 0.4 }, weight: 1.2 },
        { label: 'Sou especialista', value: 'expert', traitsVector: { autonomous: 0.4 }, intentVector: { upgrade: 0.5 }, weight: 1.4 },
      ],
      cognitiveTarget: ['awareness', 'experience'],
      traitsImpact: { analytical: 0.3, methodical: 0.2 },
      intentsImpact: { learn: 0.4, upgrade: 0.3 },
      weight: 1.2,
      isRequired: true,
    },
    {
      type: 'single_choice',
      purpose: 'context_gather',
      suggestedTitle: 'Você já tentou resolver isso antes?',
      suggestedOptions: [
        { label: 'Nunca tentei', value: 'never', traitsVector: { conservative: 0.3 }, intentVector: { learn: 0.6 }, weight: 0.8 },
        { label: 'Sim, sem sucesso', value: 'failed', traitsVector: { risk_taker: 0.3 }, intentVector: { purchase: 0.6 }, weight: 1.3 },
        { label: 'Sim, com resultados parciais', value: 'partial', traitsVector: { methodical: 0.3 }, intentVector: { upgrade: 0.5 }, weight: 1.2 },
        { label: 'Sim, com sucesso', value: 'success', traitsVector: { autonomous: 0.4 }, intentVector: { refer: 0.3 }, weight: 1 },
      ],
      cognitiveTarget: ['experience', 'frustration'],
      traitsImpact: { risk_taker: 0.2, methodical: 0.3 },
      intentsImpact: { purchase: 0.3, upgrade: 0.3 },
      weight: 1.1,
      isRequired: true,
    },
  ],
  profile_emotional: [
    {
      type: 'single_choice',
      purpose: 'profile_trait',
      suggestedTitle: 'Como você costuma tomar decisões importantes?',
      suggestedOptions: [
        { label: 'Analiso todos os dados disponíveis', value: 'data_driven', traitsVector: { analytical: 0.8, methodical: 0.3 }, intentVector: { compare: 0.4 }, weight: 1 },
        { label: 'Confio na minha intuição', value: 'intuitive', traitsVector: { emotional: 0.7, impulsive: 0.3 }, intentVector: { purchase: 0.3 }, weight: 1 },
        { label: 'Peço opinião de pessoas próximas', value: 'social', traitsVector: { social: 0.8 }, intentVector: { compare: 0.3 }, weight: 1 },
        { label: 'Decido rápido e ajusto depois', value: 'fast', traitsVector: { impulsive: 0.7, risk_taker: 0.4 }, intentVector: { purchase: 0.5 }, weight: 1.2 },
      ],
      cognitiveTarget: ['decision_style', 'personality'],
      traitsImpact: { analytical: 0.5, emotional: 0.5, social: 0.3, impulsive: 0.3 },
      intentsImpact: { purchase: 0.2 },
      weight: 1.3,
      isRequired: true,
    },
    {
      type: 'single_choice',
      purpose: 'trust_signal',
      suggestedTitle: 'O que mais importa para você ao escolher uma solução?',
      suggestedOptions: [
        { label: 'Preço e custo-benefício', value: 'price', traitsVector: { analytical: 0.5, conservative: 0.4 }, intentVector: { compare: 0.5 }, weight: 1 },
        { label: 'Resultados comprovados', value: 'results', traitsVector: { methodical: 0.5, analytical: 0.3 }, intentVector: { purchase: 0.4 }, weight: 1.2 },
        { label: 'Facilidade e rapidez', value: 'ease', traitsVector: { impulsive: 0.4 }, intentVector: { purchase: 0.5 }, weight: 1.1 },
        { label: 'Suporte e atendimento', value: 'support', traitsVector: { conservative: 0.3, social: 0.3 }, intentVector: { support: 0.4 }, weight: 1 },
      ],
      cognitiveTarget: ['values', 'priorities'],
      traitsImpact: { analytical: 0.3, conservative: 0.3 },
      intentsImpact: { purchase: 0.3, compare: 0.3 },
      weight: 1.2,
      isRequired: true,
    },
  ],
  detect_objections: [
    {
      type: 'multiple_choice',
      purpose: 'objection_detection',
      suggestedTitle: 'O que te impede de avançar hoje?',
      suggestedSubtitle: 'Selecione todas as opções que se aplicam',
      suggestedOptions: [
        { label: 'Preciso de mais informações', value: 'info', traitsVector: { analytical: 0.4 }, intentVector: { learn: 0.6 }, weight: 1 },
        { label: 'O preço está alto', value: 'price', traitsVector: { conservative: 0.5 }, intentVector: { compare: 0.5 }, weight: 1 },
        { label: 'Preciso consultar alguém', value: 'consult', traitsVector: { social: 0.6 }, intentVector: { purchase: -0.2 }, weight: 0.9 },
        { label: 'Não tenho tempo agora', value: 'time', traitsVector: { methodical: 0.3 }, intentVector: { purchase: -0.3 }, weight: 0.8 },
        { label: 'Não sei se é pra mim', value: 'fit', traitsVector: { conservative: 0.4 }, intentVector: { learn: 0.4 }, weight: 0.9 },
        { label: 'Nada, estou pronto!', value: 'ready', traitsVector: { impulsive: 0.4, risk_taker: 0.3 }, intentVector: { purchase: 0.9 }, weight: 1.5 },
      ],
      cognitiveTarget: ['objections', 'blockers'],
      traitsImpact: { conservative: 0.3, analytical: 0.2 },
      intentsImpact: { purchase: 0.4 },
      weight: 1.4,
      isRequired: true,
    },
  ],
  assess_awareness: [
    {
      type: 'single_choice',
      purpose: 'awareness_level',
      suggestedTitle: 'Você já conhece [produto/serviço]?',
      suggestedOptions: [
        { label: 'Nunca ouvi falar', value: 'unaware', traitsVector: {}, intentVector: { learn: 0.8 }, weight: 0.7 },
        { label: 'Já ouvi falar, mas não conheço bem', value: 'aware', traitsVector: {}, intentVector: { learn: 0.6, compare: 0.2 }, weight: 0.9 },
        { label: 'Conheço e estou considerando', value: 'considering', traitsVector: { methodical: 0.3 }, intentVector: { purchase: 0.5, compare: 0.4 }, weight: 1.2 },
        { label: 'Já uso ou já comprei', value: 'customer', traitsVector: { autonomous: 0.3 }, intentVector: { upgrade: 0.5, refer: 0.3 }, weight: 1.3 },
      ],
      cognitiveTarget: ['awareness', 'familiarity'],
      traitsImpact: {},
      intentsImpact: { learn: 0.3, purchase: 0.3 },
      weight: 1.2,
      isRequired: true,
    },
  ],
  qualify_lead: [
    {
      type: 'single_choice',
      purpose: 'decision_factor',
      suggestedTitle: 'Você é a pessoa que toma a decisão final?',
      suggestedOptions: [
        { label: 'Sim, decido sozinho(a)', value: 'sole_decider', traitsVector: { autonomous: 0.7 }, intentVector: { purchase: 0.6 }, weight: 1.5 },
        { label: 'Decido junto com outras pessoas', value: 'shared', traitsVector: { social: 0.5 }, intentVector: { compare: 0.3 }, weight: 1.2 },
        { label: 'Influencio, mas não decido', value: 'influencer', traitsVector: { social: 0.4 }, intentVector: { learn: 0.4 }, weight: 0.9 },
        { label: 'Estou pesquisando para outra pessoa', value: 'researcher', traitsVector: { methodical: 0.4 }, intentVector: { learn: 0.5 }, weight: 0.7 },
      ],
      cognitiveTarget: ['authority', 'role'],
      traitsImpact: { autonomous: 0.4, social: 0.3 },
      intentsImpact: { purchase: 0.4 },
      weight: 1.4,
      isRequired: true,
    },
    {
      type: 'single_choice',
      purpose: 'urgency_measure',
      suggestedTitle: 'Quando você pretende tomar uma decisão?',
      suggestedOptions: [
        { label: 'Imediatamente', value: 'now', traitsVector: { impulsive: 0.5 }, intentVector: { purchase: 0.9 }, weight: 1.6 },
        { label: 'Esta semana', value: 'week', traitsVector: { methodical: 0.3 }, intentVector: { purchase: 0.7 }, weight: 1.4 },
        { label: 'Este mês', value: 'month', traitsVector: { methodical: 0.4 }, intentVector: { purchase: 0.5, compare: 0.3 }, weight: 1.1 },
        { label: 'Sem prazo definido', value: 'undefined', traitsVector: { conservative: 0.3 }, intentVector: { learn: 0.5 }, weight: 0.7 },
      ],
      cognitiveTarget: ['timeline', 'urgency'],
      traitsImpact: { impulsive: 0.3, methodical: 0.3 },
      intentsImpact: { purchase: 0.5 },
      weight: 1.3,
      isRequired: true,
    },
  ],
  segment_audience: [
    {
      type: 'single_choice',
      purpose: 'context_gather',
      suggestedTitle: 'Qual melhor descreve sua situação atual?',
      suggestedOptions: [
        { label: 'Iniciante buscando começar', value: 'starter', traitsVector: { conservative: 0.3 }, intentVector: { learn: 0.7 }, weight: 1 },
        { label: 'Em crescimento, buscando escalar', value: 'growing', traitsVector: { risk_taker: 0.4 }, intentVector: { upgrade: 0.6 }, weight: 1.2 },
        { label: 'Estabelecido, buscando otimizar', value: 'established', traitsVector: { methodical: 0.4 }, intentVector: { upgrade: 0.5 }, weight: 1.3 },
        { label: 'Expert, buscando inovação', value: 'expert', traitsVector: { autonomous: 0.5, risk_taker: 0.4 }, intentVector: { upgrade: 0.4 }, weight: 1.4 },
      ],
      cognitiveTarget: ['segment', 'stage'],
      traitsImpact: { risk_taker: 0.3, methodical: 0.2 },
      intentsImpact: { learn: 0.3, upgrade: 0.4 },
      weight: 1.2,
      isRequired: true,
    },
  ],
  understand_pain_points: [
    {
      type: 'multiple_choice',
      purpose: 'pain_point_discovery',
      suggestedTitle: 'Quais são seus maiores desafios hoje?',
      suggestedSubtitle: 'Selecione até 3 opções',
      suggestedOptions: [
        { label: 'Falta de tempo', value: 'time', traitsVector: { impulsive: 0.3 }, intentVector: { purchase: 0.4 }, weight: 1 },
        { label: 'Falta de conhecimento', value: 'knowledge', traitsVector: { analytical: 0.3 }, intentVector: { learn: 0.6 }, weight: 1 },
        { label: 'Falta de recursos/orçamento', value: 'budget', traitsVector: { conservative: 0.4 }, intentVector: { compare: 0.4 }, weight: 0.9 },
        { label: 'Falta de resultados', value: 'results', traitsVector: { risk_taker: 0.3 }, intentVector: { purchase: 0.5 }, weight: 1.2 },
        { label: 'Falta de suporte', value: 'support', traitsVector: { social: 0.4 }, intentVector: { support: 0.5 }, weight: 1 },
      ],
      cognitiveTarget: ['pain_points', 'needs'],
      traitsImpact: { conservative: 0.2, analytical: 0.2 },
      intentsImpact: { purchase: 0.3, learn: 0.3 },
      weight: 1.3,
      isRequired: true,
    },
    {
      type: 'text',
      purpose: 'pain_point_discovery',
      suggestedTitle: 'Em uma frase, qual seu maior desafio agora?',
      cognitiveTarget: ['pain_point', 'context'],
      traitsImpact: {},
      intentsImpact: {},
      weight: 1,
      isRequired: false,
    },
  ],
};

// ============================================================================
// DURATION CONFIGURATIONS
// ============================================================================

const DURATION_CONFIG: Record<DurationType, { minQuestions: number; maxQuestions: number; idealQuestions: number }> = {
  quick: { minQuestions: 3, maxQuestions: 5, idealQuestions: 4 },
  medium: { minQuestions: 5, maxQuestions: 8, idealQuestions: 6 },
  deep: { minQuestions: 8, maxQuestions: 15, idealQuestions: 10 },
};

// ============================================================================
// MAIN ENGINE FUNCTIONS
// ============================================================================

/**
 * Generate a complete quiz architecture from cognitive objectives
 */
export function generateQuizArchitecture(objective: QuizObjective): QuizArchitecture {
  const durationConfig = DURATION_CONFIG[objective.duration];
  
  // Collect question templates based on objectives
  const primaryQuestions = QUESTION_TEMPLATES[objective.primary] || [];
  const secondaryQuestions = objective.secondary?.flatMap(obj => QUESTION_TEMPLATES[obj] || []) || [];
  
  // Combine and deduplicate
  const allTemplates = [...primaryQuestions, ...secondaryQuestions];
  
  // Select questions based on duration
  const selectedQuestions = selectQuestions(allTemplates, durationConfig.idealQuestions);
  
  // Build architecture
  const questions: QuestionArchetype[] = selectedQuestions.map((template, index) => ({
    type: template.type || 'single_choice',
    purpose: template.purpose || 'intent_signal',
    cognitiveTarget: template.cognitiveTarget || [],
    suggestedTitle: template.suggestedTitle || 'Nova pergunta',
    suggestedSubtitle: template.suggestedSubtitle,
    suggestedOptions: template.suggestedOptions,
    traitsImpact: template.traitsImpact || {},
    intentsImpact: template.intentsImpact || {},
    weight: template.weight || 1,
    isRequired: template.isRequired ?? true,
    order: index,
  }));

  // Calculate cognitive coverage
  const targetTraits = new Set<string>();
  const targetIntents = new Set<string>();
  
  questions.forEach(q => {
    Object.keys(q.traitsImpact).forEach(t => targetTraits.add(t));
    Object.keys(q.intentsImpact).forEach(i => targetIntents.add(i));
  });

  // Generate suggested outcomes
  const suggestedOutcomes = generateSuggestedOutcomes(objective, questions);
  
  // Generate branching suggestions
  const branchingSuggestions = generateBranchingSuggestions(questions);

  return {
    name: generateQuizName(objective),
    description: generateQuizDescription(objective),
    type: mapObjectiveToQuizType(objective.primary),
    questions,
    suggestedOutcomes,
    cognitiveProfile: {
      targetTraits: Array.from(targetTraits),
      targetIntents: Array.from(targetIntents),
      expectedCoverage: calculateExpectedCoverage(questions),
      discriminationPower: calculateDiscriminationPower(questions),
    },
    estimatedDuration: Math.ceil(questions.length * 0.75), // ~45 seconds per question
    branchingSuggestions,
  };
}

function selectQuestions(templates: Partial<QuestionArchetype>[], targetCount: number): Partial<QuestionArchetype>[] {
  // Sort by weight/importance and take top N
  const sorted = [...templates].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  
  // Ensure diversity in question purposes
  const purposeMap = new Map<string, Partial<QuestionArchetype>[]>();
  sorted.forEach(q => {
    const purpose = q.purpose || 'general';
    if (!purposeMap.has(purpose)) purposeMap.set(purpose, []);
    purposeMap.get(purpose)!.push(q);
  });
  
  const selected: Partial<QuestionArchetype>[] = [];
  let index = 0;
  
  while (selected.length < targetCount && selected.length < templates.length) {
    for (const [_, questions] of purposeMap) {
      if (selected.length >= targetCount) break;
      if (questions[index]) {
        selected.push(questions[index]);
      }
    }
    index++;
  }
  
  return selected;
}

function generateSuggestedOutcomes(objective: QuizObjective, questions: QuestionArchetype[]): SuggestedOutcome[] {
  const outcomes: SuggestedOutcome[] = [];
  
  // High intent outcome
  outcomes.push({
    name: 'Alta Intenção de Compra',
    description: 'Lead demonstrou forte intenção de compra',
    priority: 100,
    conditions: [
      {
        type: 'intent_percentage',
        field: 'purchase',
        operator: 'gte',
        value: 60,
        rationale: 'Intenção de compra acima de 60% indica lead quente',
      },
    ],
    actions: [
      {
        type: 'add_tag',
        config: { tag: 'lead-quente' },
        rationale: 'Marcar para priorização',
      },
      {
        type: 'trigger_automation',
        config: { automation: 'fast-track-vendas' },
        rationale: 'Iniciar fluxo de venda acelerado',
      },
    ],
  });

  // Medium intent outcome
  outcomes.push({
    name: 'Interesse em Aprender',
    description: 'Lead está em fase de pesquisa e aprendizado',
    priority: 50,
    conditions: [
      {
        type: 'intent_percentage',
        field: 'learn',
        operator: 'gte',
        value: 50,
        rationale: 'Forte interesse em aprender indica lead em nutrição',
      },
      {
        type: 'intent_percentage',
        field: 'purchase',
        operator: 'lt',
        value: 40,
        rationale: 'Baixa intenção de compra imediata',
      },
    ],
    actions: [
      {
        type: 'add_tag',
        config: { tag: 'nutrição' },
        rationale: 'Marcar para fluxo de nutrição',
      },
      {
        type: 'trigger_automation',
        config: { automation: 'sequencia-educacional' },
        rationale: 'Iniciar conteúdo educacional',
      },
    ],
  });

  // Low engagement outcome
  outcomes.push({
    name: 'Curioso/Baixo Engajamento',
    description: 'Lead com baixo engajamento, apenas curiosidade',
    priority: 10,
    conditions: [
      {
        type: 'intent_percentage',
        field: 'purchase',
        operator: 'lt',
        value: 30,
        rationale: 'Intenção de compra muito baixa',
      },
      {
        type: 'intent_percentage',
        field: 'learn',
        operator: 'lt',
        value: 40,
        rationale: 'Interesse em aprender também baixo',
      },
    ],
    actions: [
      {
        type: 'add_tag',
        config: { tag: 'frio' },
        rationale: 'Marcar como lead frio',
      },
    ],
  });

  return outcomes;
}

function generateBranchingSuggestions(questions: QuestionArchetype[]): BranchingSuggestion[] {
  const suggestions: BranchingSuggestion[] = [];
  
  // Find objection detection question
  const objectionIndex = questions.findIndex(q => q.purpose === 'objection_detection');
  if (objectionIndex >= 0) {
    suggestions.push({
      afterQuestion: objectionIndex,
      condition: 'Se selecionou "Nada, estou pronto!"',
      targetQuestion: questions.length - 1, // Skip to end
      rationale: 'Lead pronto não precisa de mais perguntas',
    });
  }

  // Find urgency question
  const urgencyIndex = questions.findIndex(q => q.purpose === 'urgency_measure');
  if (urgencyIndex >= 0 && questions[urgencyIndex].type === 'scale') {
    suggestions.push({
      afterQuestion: urgencyIndex,
      condition: 'Se urgência >= 8',
      targetQuestion: 'end',
      rationale: 'Alta urgência indica que devemos conectar rapidamente',
    });
  }

  return suggestions;
}

function generateQuizName(objective: QuizObjective): string {
  const prefixes: Record<ObjectiveType, string> = {
    classify_intent: 'Quiz de Intenção',
    measure_maturity: 'Quiz de Maturidade',
    profile_emotional: 'Quiz de Perfil',
    detect_objections: 'Quiz de Objeções',
    assess_awareness: 'Quiz de Consciência',
    qualify_lead: 'Quiz de Qualificação',
    segment_audience: 'Quiz de Segmentação',
    understand_pain_points: 'Quiz de Diagnóstico',
  };
  
  return prefixes[objective.primary] || 'Novo Quiz';
}

function generateQuizDescription(objective: QuizObjective): string {
  const descriptions: Record<ObjectiveType, string> = {
    classify_intent: 'Identifica a intenção do lead e classifica seu momento de compra',
    measure_maturity: 'Avalia o nível de conhecimento e experiência do lead',
    profile_emotional: 'Mapeia o perfil comportamental e estilo de decisão',
    detect_objections: 'Identifica barreiras e objeções à compra',
    assess_awareness: 'Mede o nível de consciência sobre a solução',
    qualify_lead: 'Qualifica leads identificando autoridade e urgência',
    segment_audience: 'Segmenta a audiência em grupos distintos',
    understand_pain_points: 'Descobre as principais dores e necessidades',
  };
  
  return descriptions[objective.primary] || 'Quiz cognitivo para entender melhor seu público';
}

function mapObjectiveToQuizType(objective: ObjectiveType): string {
  // Valid database enum values: lead, qualification, funnel, onboarding, entertainment, viral, research
  const mapping: Record<ObjectiveType, string> = {
    classify_intent: 'lead',
    measure_maturity: 'research',
    profile_emotional: 'lead',
    detect_objections: 'qualification',
    assess_awareness: 'funnel',
    qualify_lead: 'qualification',
    segment_audience: 'lead',
    understand_pain_points: 'research',
  };
  
  return mapping[objective] || 'lead';
}

function calculateExpectedCoverage(questions: QuestionArchetype[]): number {
  const allTraits = new Set<string>();
  const allIntents = new Set<string>();
  
  questions.forEach(q => {
    Object.keys(q.traitsImpact).forEach(t => allTraits.add(t));
    Object.keys(q.intentsImpact).forEach(i => allIntents.add(i));
  });
  
  const totalDimensions = Object.keys(TRAIT_DIMENSIONS).length + Object.keys(INTENT_DIMENSIONS).length;
  const coveredDimensions = allTraits.size + allIntents.size;
  
  return Math.round((coveredDimensions / totalDimensions) * 100);
}

function calculateDiscriminationPower(questions: QuestionArchetype[]): number {
  // Calculate based on option variance within questions
  let totalVariance = 0;
  let questionCount = 0;
  
  questions.forEach(q => {
    if (q.suggestedOptions && q.suggestedOptions.length > 1) {
      const weights = q.suggestedOptions.map(o => o.weight);
      const mean = weights.reduce((a, b) => a + b, 0) / weights.length;
      const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
      totalVariance += variance;
      questionCount++;
    }
  });
  
  const avgVariance = questionCount > 0 ? totalVariance / questionCount : 0;
  return Math.min(100, Math.round(avgVariance * 100));
}

// ============================================================================
// COGNITIVE HEALTH ANALYSIS
// ============================================================================

export interface CognitiveHealthReport {
  overallScore: number;
  coverage: CoverageDiagnosis;
  signalQuality: SignalQualityDiagnosis;
  discriminationPower: DiscriminationDiagnosis;
  ambiguity: AmbiguityDiagnosis;
  outcomeConflicts: OutcomeConflictDiagnosis[];
  warnings: HealthWarning[];
  recommendations: string[];
}

export interface CoverageDiagnosis {
  score: number;
  coveredTraits: string[];
  missingTraits: string[];
  coveredIntents: string[];
  missingIntents: string[];
}

export interface SignalQualityDiagnosis {
  score: number;
  redundantQuestions: string[];
  noisyQuestions: string[];
}

export interface DiscriminationDiagnosis {
  score: number;
  weakQuestions: string[];
  strongQuestions: string[];
}

export interface AmbiguityDiagnosis {
  score: number;
  ambiguousOptions: { questionTitle: string; options: string[] }[];
}

export interface OutcomeConflictDiagnosis {
  outcome1: string;
  outcome2: string;
  conflictType: 'overlapping_conditions' | 'competing_vectors' | 'priority_collision';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface HealthWarning {
  type: 'coverage_gap' | 'signal_redundancy' | 'weak_discrimination' | 'outcome_unreachable' | 'missing_intent' | 'missing_objection';
  severity: 'info' | 'warning' | 'error';
  message: string;
  affectedItems?: string[];
}

/**
 * Analyze quiz cognitive health
 */
export function analyzeQuizCognitiveHealth(
  questions: Array<{
    id: string;
    title: string;
    type: string;
    options: Array<{
      label: string;
      traits_vector: Record<string, number>;
      intent_vector: Record<string, number>;
      weight: number;
    }>;
  }>,
  outcomes: Array<{
    id: string;
    name: string;
    conditions: Array<{
      type: string;
      field: string;
      operator: string;
      value: any;
    }>;
  }>
): CognitiveHealthReport {
  const warnings: HealthWarning[] = [];
  const recommendations: string[] = [];

  // Analyze coverage
  const coverage = analyzeCoverage(questions);
  if (coverage.missingTraits.length > 0) {
    warnings.push({
      type: 'coverage_gap',
      severity: 'warning',
      message: `Dimensões de traço não cobertas: ${coverage.missingTraits.join(', ')}`,
      affectedItems: coverage.missingTraits,
    });
    recommendations.push(`Adicione perguntas que meçam: ${coverage.missingTraits.slice(0, 3).join(', ')}`);
  }
  if (coverage.missingIntents.length > 0) {
    warnings.push({
      type: 'missing_intent',
      severity: 'warning',
      message: `Intenções não medidas: ${coverage.missingIntents.join(', ')}`,
      affectedItems: coverage.missingIntents,
    });
  }

  // Analyze signal quality
  const signalQuality = analyzeSignalQuality(questions);
  if (signalQuality.redundantQuestions.length > 0) {
    warnings.push({
      type: 'signal_redundancy',
      severity: 'info',
      message: `Perguntas potencialmente redundantes detectadas`,
      affectedItems: signalQuality.redundantQuestions,
    });
  }

  // Analyze discrimination power
  const discrimination = analyzeDiscrimination(questions);
  if (discrimination.weakQuestions.length > 0) {
    warnings.push({
      type: 'weak_discrimination',
      severity: 'warning',
      message: `Perguntas com baixo poder de discriminação: as opções têm vetores muito similares`,
      affectedItems: discrimination.weakQuestions,
    });
    recommendations.push('Diferencie mais os vetores das opções para melhor discriminação');
  }

  // Analyze ambiguity
  const ambiguity = analyzeAmbiguity(questions);

  // Analyze outcome conflicts
  const outcomeConflicts = analyzeOutcomeConflicts(outcomes);
  outcomeConflicts.forEach(conflict => {
    if (conflict.severity === 'high') {
      warnings.push({
        type: 'outcome_unreachable',
        severity: 'error',
        message: `Conflito entre outcomes: ${conflict.outcome1} e ${conflict.outcome2} - ${conflict.description}`,
      });
    }
  });

  // Check for unreachable outcomes
  const unreachableOutcomes = checkUnreachableOutcomes(questions, outcomes);
  unreachableOutcomes.forEach(outcomeName => {
    warnings.push({
      type: 'outcome_unreachable',
      severity: 'error',
      message: `Outcome "${outcomeName}" nunca será acionado com a configuração atual`,
    });
    recommendations.push(`Revise as condições do outcome "${outcomeName}" ou ajuste os vetores das opções`);
  });

  // Check if quiz captures objections
  const hasObjectionDetection = questions.some(q =>
    q.options.some(o => o.label.toLowerCase().includes('impede') || o.label.toLowerCase().includes('objeç'))
  );
  if (!hasObjectionDetection) {
    warnings.push({
      type: 'missing_objection',
      severity: 'info',
      message: 'O quiz não coleta sinais de objeção explícitos',
    });
    recommendations.push('Considere adicionar uma pergunta sobre barreiras ou objeções');
  }

  // Calculate overall score
  const overallScore = calculateOverallHealth(coverage, signalQuality, discrimination, ambiguity, outcomeConflicts);

  return {
    overallScore,
    coverage,
    signalQuality,
    discriminationPower: discrimination,
    ambiguity,
    outcomeConflicts,
    warnings,
    recommendations,
  };
}

function analyzeCoverage(questions: any[]): CoverageDiagnosis {
  const coveredTraits = new Set<string>();
  const coveredIntents = new Set<string>();
  
  questions.forEach(q => {
    q.options?.forEach((o: any) => {
      Object.keys(o.traits_vector || {}).forEach(t => {
        if (Math.abs(o.traits_vector[t]) > 0.1) coveredTraits.add(t);
      });
      Object.keys(o.intent_vector || {}).forEach(i => {
        if (Math.abs(o.intent_vector[i]) > 0.1) coveredIntents.add(i);
      });
    });
  });

  const allTraits = Object.keys(TRAIT_DIMENSIONS);
  const allIntents = Object.keys(INTENT_DIMENSIONS);
  
  const missingTraits = allTraits.filter(t => !coveredTraits.has(t));
  const missingIntents = allIntents.filter(i => !coveredIntents.has(i));
  
  const totalDimensions = allTraits.length + allIntents.length;
  const coveredDimensions = coveredTraits.size + coveredIntents.size;
  const score = Math.round((coveredDimensions / totalDimensions) * 100);

  return {
    score,
    coveredTraits: Array.from(coveredTraits),
    missingTraits,
    coveredIntents: Array.from(coveredIntents),
    missingIntents,
  };
}

function analyzeSignalQuality(questions: any[]): SignalQualityDiagnosis {
  const redundantQuestions: string[] = [];
  const noisyQuestions: string[] = [];
  
  // Check for similar vector patterns
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const similarity = calculateQuestionSimilarity(questions[i], questions[j]);
      if (similarity > 0.8) {
        redundantQuestions.push(questions[i].title);
        break;
      }
    }
    
    // Check for noisy questions (low total vector magnitude)
    const magnitude = calculateQuestionMagnitude(questions[i]);
    if (magnitude < 0.3) {
      noisyQuestions.push(questions[i].title);
    }
  }
  
  const score = 100 - (redundantQuestions.length * 10) - (noisyQuestions.length * 15);
  
  return {
    score: Math.max(0, score),
    redundantQuestions,
    noisyQuestions,
  };
}

function analyzeDiscrimination(questions: any[]): DiscriminationDiagnosis {
  const weakQuestions: string[] = [];
  const strongQuestions: string[] = [];
  
  questions.forEach(q => {
    if (!q.options || q.options.length < 2) return;
    
    let totalVariance = 0;
    const vectors = q.options.map((o: any) => ({
      ...o.traits_vector,
      ...o.intent_vector,
    }));
    
    // Calculate variance across all dimensions
    const allDimensions = new Set<string>();
    vectors.forEach((v: any) => Object.keys(v).forEach(k => allDimensions.add(k)));
    
    allDimensions.forEach(dim => {
      const values = vectors.map((v: any) => v[dim] || 0);
      const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const variance = values.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / values.length;
      totalVariance += variance;
    });
    
    if (totalVariance < 0.1) {
      weakQuestions.push(q.title);
    } else if (totalVariance > 0.5) {
      strongQuestions.push(q.title);
    }
  });
  
  const score = Math.min(100, 50 + strongQuestions.length * 20 - weakQuestions.length * 15);
  
  return {
    score: Math.max(0, score),
    weakQuestions,
    strongQuestions,
  };
}

function analyzeAmbiguity(questions: any[]): AmbiguityDiagnosis {
  const ambiguousOptions: { questionTitle: string; options: string[] }[] = [];
  
  questions.forEach(q => {
    if (!q.options || q.options.length < 2) return;
    
    const similarPairs: string[] = [];
    for (let i = 0; i < q.options.length; i++) {
      for (let j = i + 1; j < q.options.length; j++) {
        const o1 = q.options[i];
        const o2 = q.options[j];
        
        // Check if vectors are too similar
        const similarity = calculateVectorSimilarity(
          { ...o1.traits_vector, ...o1.intent_vector },
          { ...o2.traits_vector, ...o2.intent_vector }
        );
        
        if (similarity > 0.9) {
          similarPairs.push(`"${o1.label}" ≈ "${o2.label}"`);
        }
      }
    }
    
    if (similarPairs.length > 0) {
      ambiguousOptions.push({ questionTitle: q.title, options: similarPairs });
    }
  });
  
  const score = 100 - ambiguousOptions.length * 20;
  
  return {
    score: Math.max(0, score),
    ambiguousOptions,
  };
}

function analyzeOutcomeConflicts(outcomes: any[]): OutcomeConflictDiagnosis[] {
  const conflicts: OutcomeConflictDiagnosis[] = [];
  
  for (let i = 0; i < outcomes.length; i++) {
    for (let j = i + 1; j < outcomes.length; j++) {
      const o1 = outcomes[i];
      const o2 = outcomes[j];
      
      // Check for overlapping conditions
      const overlap = calculateConditionOverlap(o1.conditions, o2.conditions);
      if (overlap > 0.8) {
        conflicts.push({
          outcome1: o1.name,
          outcome2: o2.name,
          conflictType: 'overlapping_conditions',
          severity: 'medium',
          description: 'Condições muito similares podem causar resultados inconsistentes',
        });
      }
      
      // Check for competing vectors (same field, opposite directions)
      const competing = checkCompetingConditions(o1.conditions, o2.conditions);
      if (competing) {
        conflicts.push({
          outcome1: o1.name,
          outcome2: o2.name,
          conflictType: 'competing_vectors',
          severity: 'low',
          description: 'Outcomes competem pelos mesmos sinais',
        });
      }
    }
  }
  
  return conflicts;
}

function checkUnreachableOutcomes(questions: any[], outcomes: any[]): string[] {
  const unreachable: string[] = [];
  
  // Get max possible values for each dimension
  const maxValues: Record<string, number> = {};
  
  questions.forEach(q => {
    q.options?.forEach((o: any) => {
      Object.entries(o.traits_vector || {}).forEach(([k, v]) => {
        maxValues[`trait_${k}`] = Math.max(maxValues[`trait_${k}`] || 0, v as number);
      });
      Object.entries(o.intent_vector || {}).forEach(([k, v]) => {
        maxValues[`intent_${k}`] = Math.max(maxValues[`intent_${k}`] || 0, v as number);
      });
    });
  });
  
  // Check each outcome
  outcomes.forEach(outcome => {
    let isReachable = true;
    
    outcome.conditions?.forEach((condition: any) => {
      if (condition.operator === 'gte' || condition.operator === 'gt') {
        const maxPossible = maxValues[condition.field] || 0;
        if (maxPossible < condition.value) {
          isReachable = false;
        }
      }
    });
    
    if (!isReachable) {
      unreachable.push(outcome.name);
    }
  });
  
  return unreachable;
}

function calculateOverallHealth(
  coverage: CoverageDiagnosis,
  signalQuality: SignalQualityDiagnosis,
  discrimination: DiscriminationDiagnosis,
  ambiguity: AmbiguityDiagnosis,
  conflicts: OutcomeConflictDiagnosis[]
): number {
  const weights = {
    coverage: 0.3,
    signalQuality: 0.2,
    discrimination: 0.25,
    ambiguity: 0.15,
    conflicts: 0.1,
  };
  
  const conflictScore = Math.max(0, 100 - conflicts.length * 20);
  
  return Math.round(
    coverage.score * weights.coverage +
    signalQuality.score * weights.signalQuality +
    discrimination.score * weights.discrimination +
    ambiguity.score * weights.ambiguity +
    conflictScore * weights.conflicts
  );
}

function calculateQuestionSimilarity(q1: any, q2: any): number {
  // Simplified similarity based on vector overlap
  const v1 = getQuestionVectorProfile(q1);
  const v2 = getQuestionVectorProfile(q2);
  return calculateVectorSimilarity(v1, v2);
}

function calculateQuestionMagnitude(q: any): number {
  let total = 0;
  q.options?.forEach((o: any) => {
    Object.values(o.traits_vector || {}).forEach((v: any) => total += Math.abs(v));
    Object.values(o.intent_vector || {}).forEach((v: any) => total += Math.abs(v));
  });
  return total / (q.options?.length || 1);
}

function getQuestionVectorProfile(q: any): Record<string, number> {
  const profile: Record<string, number> = {};
  q.options?.forEach((o: any) => {
    Object.entries(o.traits_vector || {}).forEach(([k, v]) => {
      profile[k] = (profile[k] || 0) + (v as number);
    });
    Object.entries(o.intent_vector || {}).forEach(([k, v]) => {
      profile[k] = (profile[k] || 0) + (v as number);
    });
  });
  return profile;
}

function calculateVectorSimilarity(v1: Record<string, number>, v2: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);
  if (allKeys.size === 0) return 1;
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  allKeys.forEach(key => {
    const a = v1[key] || 0;
    const b = v2[key] || 0;
    dotProduct += a * b;
    mag1 += a * a;
    mag2 += b * b;
  });
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

function calculateConditionOverlap(c1: any[], c2: any[]): number {
  if (!c1?.length || !c2?.length) return 0;
  
  let matchCount = 0;
  c1.forEach(cond1 => {
    c2.forEach(cond2 => {
      if (cond1.field === cond2.field && cond1.type === cond2.type) {
        matchCount++;
      }
    });
  });
  
  return matchCount / Math.max(c1.length, c2.length);
}

function checkCompetingConditions(c1: any[], c2: any[]): boolean {
  if (!c1?.length || !c2?.length) return false;
  
  for (const cond1 of c1) {
    for (const cond2 of c2) {
      if (cond1.field === cond2.field) {
        // Check if they require opposite values
        if (
          (cond1.operator === 'gte' && cond2.operator === 'lt') ||
          (cond1.operator === 'gt' && cond2.operator === 'lte')
        ) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

export interface PersonaSimulation {
  id: string;
  name: string;
  description: string;
  answers: Record<string, string | number>;
  expectedTraits: Record<string, number>;
  expectedIntents: Record<string, number>;
}

export interface SimulationResult {
  persona: PersonaSimulation;
  path: SimulationStep[];
  finalTraits: Record<string, number>;
  finalIntents: Record<string, number>;
  triggeredOutcome: string | null;
  completionTime: number;
  events: string[];
}

export interface SimulationStep {
  questionId: string;
  questionTitle: string;
  selectedOption: string;
  cumulativeTraits: Record<string, number>;
  cumulativeIntents: Record<string, number>;
}

export const PRESET_PERSONAS: PersonaSimulation[] = [
  {
    id: 'ready_buyer',
    name: 'Comprador Pronto',
    description: 'Lead com alta intenção de compra e urgência',
    answers: {},
    expectedTraits: { impulsive: 0.6, risk_taker: 0.5 },
    expectedIntents: { purchase: 0.9, compare: 0.2 },
  },
  {
    id: 'researcher',
    name: 'Pesquisador',
    description: 'Analisa muito antes de decidir',
    answers: {},
    expectedTraits: { analytical: 0.7, methodical: 0.6 },
    expectedIntents: { learn: 0.7, compare: 0.6 },
  },
  {
    id: 'skeptic',
    name: 'Cético/Resistente',
    description: 'Tem muitas objeções e dúvidas',
    answers: {},
    expectedTraits: { conservative: 0.7, analytical: 0.5 },
    expectedIntents: { compare: 0.5, churn: 0.4 },
  },
  {
    id: 'social_decider',
    name: 'Influenciado Social',
    description: 'Depende de validação de terceiros',
    answers: {},
    expectedTraits: { social: 0.8, conservative: 0.4 },
    expectedIntents: { compare: 0.6, learn: 0.4 },
  },
  {
    id: 'curious',
    name: 'Curioso',
    description: 'Está explorando sem compromisso',
    answers: {},
    expectedTraits: { emotional: 0.4 },
    expectedIntents: { learn: 0.6 },
  },
];

/**
 * Simulate a persona going through the quiz
 */
export function simulateQuizPath(
  persona: PersonaSimulation,
  questions: Array<{
    id: string;
    title: string;
    options: Array<{
      id: string;
      label: string;
      value: string;
      traits_vector: Record<string, number>;
      intent_vector: Record<string, number>;
      weight: number;
    }>;
  }>,
  outcomes: Array<{
    id: string;
    name: string;
    priority: number;
    conditions: any[];
  }>
): SimulationResult {
  const path: SimulationStep[] = [];
  const cumulativeTraits: Record<string, number> = {};
  const cumulativeIntents: Record<string, number> = {};
  const events: string[] = [];
  
  questions.forEach(question => {
    // Select best matching option for this persona
    const selectedOption = selectBestOptionForPersona(question.options, persona);
    
    if (selectedOption) {
      // Accumulate vectors
      Object.entries(selectedOption.traits_vector || {}).forEach(([k, v]) => {
        cumulativeTraits[k] = (cumulativeTraits[k] || 0) + (v as number) * selectedOption.weight;
      });
      Object.entries(selectedOption.intent_vector || {}).forEach(([k, v]) => {
        cumulativeIntents[k] = (cumulativeIntents[k] || 0) + (v as number) * selectedOption.weight;
      });
      
      path.push({
        questionId: question.id,
        questionTitle: question.title,
        selectedOption: selectedOption.label,
        cumulativeTraits: { ...cumulativeTraits },
        cumulativeIntents: { ...cumulativeIntents },
      });
      
      events.push(`Respondeu "${selectedOption.label}" na pergunta "${question.title}"`);
    }
  });
  
  // Normalize vectors
  const totalTraitWeight = Object.values(cumulativeTraits).reduce((a, b) => a + Math.abs(b), 0) || 1;
  const totalIntentWeight = Object.values(cumulativeIntents).reduce((a, b) => a + Math.abs(b), 0) || 1;
  
  Object.keys(cumulativeTraits).forEach(k => {
    cumulativeTraits[k] = cumulativeTraits[k] / totalTraitWeight;
  });
  Object.keys(cumulativeIntents).forEach(k => {
    cumulativeIntents[k] = cumulativeIntents[k] / totalIntentWeight;
  });
  
  // Determine triggered outcome
  const triggeredOutcome = determineOutcome(cumulativeTraits, cumulativeIntents, outcomes);
  if (triggeredOutcome) {
    events.push(`Outcome acionado: ${triggeredOutcome}`);
  }
  
  return {
    persona,
    path,
    finalTraits: cumulativeTraits,
    finalIntents: cumulativeIntents,
    triggeredOutcome,
    completionTime: questions.length * 45, // 45s per question
    events,
  };
}

function selectBestOptionForPersona(options: any[], persona: PersonaSimulation): any | null {
  if (!options || options.length === 0) return null;
  
  let bestOption = options[0];
  let bestScore = -Infinity;
  
  options.forEach(option => {
    let score = 0;
    
    // Score based on trait alignment
    Object.entries(persona.expectedTraits).forEach(([trait, expected]) => {
      const optionValue = option.traits_vector?.[trait] || 0;
      score += optionValue * expected;
    });
    
    // Score based on intent alignment
    Object.entries(persona.expectedIntents).forEach(([intent, expected]) => {
      const optionValue = option.intent_vector?.[intent] || 0;
      score += optionValue * expected;
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  });
  
  return bestOption;
}

function determineOutcome(
  traits: Record<string, number>,
  intents: Record<string, number>,
  outcomes: any[]
): string | null {
  // Sort by priority
  const sorted = [...outcomes].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  for (const outcome of sorted) {
    let allConditionsMet = true;
    
    for (const condition of (outcome.conditions || [])) {
      const value = condition.field?.startsWith('intent')
        ? intents[condition.field.replace('intent_', '')] || 0
        : traits[condition.field?.replace('trait_', '')] || 0;
      
      const percentage = value * 100;
      
      switch (condition.operator) {
        case 'gte':
          if (percentage < condition.value) allConditionsMet = false;
          break;
        case 'gt':
          if (percentage <= condition.value) allConditionsMet = false;
          break;
        case 'lte':
          if (percentage > condition.value) allConditionsMet = false;
          break;
        case 'lt':
          if (percentage >= condition.value) allConditionsMet = false;
          break;
      }
    }
    
    if (allConditionsMet) {
      return outcome.name;
    }
  }
  
  return null;
}
