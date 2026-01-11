// Memory Extraction Engine
// Extracts semantic memories from various signals

export type MemoryType = 
  | 'preference'
  | 'objection'
  | 'desire'
  | 'trigger'
  | 'pain_point'
  | 'habit'
  | 'belief'
  | 'language_style'
  | 'goal'
  | 'fear'
  | 'value'
  | 'constraint'
  | 'context';

export type MemorySource = 
  | 'quiz'
  | 'chat'
  | 'social'
  | 'agent'
  | 'manual'
  | 'survey'
  | 'purchase'
  | 'behavior'
  | 'inference';

export interface MemoryContent {
  summary: string;
  details?: string;
  keywords?: string[];
  intensity?: number; // 0-1 scale
  polarity?: 'positive' | 'negative' | 'neutral';
  context?: string;
  raw_data?: Record<string, unknown>;
}

export interface Memory {
  id?: string;
  contact_id: string;
  project_id: string;
  memory_type: MemoryType;
  content: MemoryContent;
  confidence: number;
  source: MemorySource;
  source_id?: string;
  source_name?: string;
  is_locked?: boolean;
  is_contradicted?: boolean;
  contradicted_by?: string;
  last_reinforced_at?: string;
  reinforcement_count?: number;
}

export interface MemoryCandidate {
  memory_type: MemoryType;
  content: MemoryContent;
  confidence: number;
  source: MemorySource;
  source_id?: string;
  source_name?: string;
}

export interface ExtractionContext {
  contact_id: string;
  project_id: string;
  existing_memories: Memory[];
}

export interface ExtractionResult {
  new_memories: MemoryCandidate[];
  reinforcements: {
    memory_id: string;
    confidence_boost: number;
    new_evidence: string;
  }[];
  contradictions: {
    existing_memory_id: string;
    new_memory: MemoryCandidate;
    conflict_reason: string;
  }[];
}

// Memory type patterns for extraction
const MEMORY_PATTERNS: Record<MemoryType, {
  keywords: string[];
  indicators: string[];
  weight: number;
}> = {
  preference: {
    keywords: ['prefiro', 'gosto', 'adoro', 'escolho', 'favoreço', 'opto', 'melhor', 'ideal'],
    indicators: ['prefer', 'like', 'love', 'choose', 'favorite', 'best'],
    weight: 0.8
  },
  objection: {
    keywords: ['não gosto', 'odeio', 'contra', 'recuso', 'discordo', 'problema', 'difícil', 'caro'],
    indicators: ['hate', 'against', 'refuse', 'disagree', 'problem', 'difficult', 'expensive'],
    weight: 0.85
  },
  desire: {
    keywords: ['quero', 'desejo', 'sonho', 'preciso', 'busco', 'almejo', 'gostaria'],
    indicators: ['want', 'wish', 'dream', 'need', 'seek', 'would like'],
    weight: 0.9
  },
  trigger: {
    keywords: ['quando', 'sempre que', 'toda vez', 'me faz', 'me leva', 'motiva'],
    indicators: ['when', 'whenever', 'every time', 'makes me', 'leads me', 'motivates'],
    weight: 0.75
  },
  pain_point: {
    keywords: ['dor', 'frustração', 'raiva', 'irritação', 'problema', 'dificuldade', 'sofro'],
    indicators: ['pain', 'frustration', 'anger', 'irritation', 'struggle', 'suffer'],
    weight: 0.9
  },
  habit: {
    keywords: ['sempre', 'normalmente', 'costumo', 'rotina', 'diariamente', 'regularmente'],
    indicators: ['always', 'usually', 'habit', 'routine', 'daily', 'regularly'],
    weight: 0.7
  },
  belief: {
    keywords: ['acredito', 'penso', 'acho', 'considero', 'na minha opinião', 'certeza'],
    indicators: ['believe', 'think', 'consider', 'opinion', 'certain', 'sure'],
    weight: 0.8
  },
  language_style: {
    keywords: [],
    indicators: [],
    weight: 0.6
  },
  goal: {
    keywords: ['objetivo', 'meta', 'alcançar', 'conquistar', 'atingir', 'realizar'],
    indicators: ['goal', 'target', 'achieve', 'accomplish', 'reach', 'realize'],
    weight: 0.9
  },
  fear: {
    keywords: ['medo', 'receio', 'preocupação', 'ansiedade', 'temor', 'pavor'],
    indicators: ['fear', 'worry', 'concern', 'anxiety', 'afraid', 'scared'],
    weight: 0.85
  },
  value: {
    keywords: ['importante', 'valorizo', 'prioridade', 'essencial', 'fundamental', 'base'],
    indicators: ['important', 'value', 'priority', 'essential', 'fundamental', 'core'],
    weight: 0.85
  },
  constraint: {
    keywords: ['não posso', 'impossível', 'limitação', 'restrição', 'barreira', 'obstáculo'],
    indicators: ['cannot', 'impossible', 'limitation', 'restriction', 'barrier', 'obstacle'],
    weight: 0.8
  },
  context: {
    keywords: ['trabalho', 'família', 'casa', 'empresa', 'negócio', 'vida'],
    indicators: ['work', 'family', 'home', 'business', 'company', 'life'],
    weight: 0.6
  }
};

// Extract memories from quiz results
export function extractFromQuizResult(
  quizResult: {
    quiz_id: string;
    quiz_name: string;
    answers: Array<{
      question_text: string;
      answer_text: string;
      answer_value?: number;
    }>;
    outcome?: {
      name: string;
      description?: string;
    };
    trait_vector?: Record<string, number>;
    intent_vector?: Record<string, number>;
  },
  context: ExtractionContext
): ExtractionResult {
  const candidates: MemoryCandidate[] = [];
  const reinforcements: ExtractionResult['reinforcements'] = [];
  const contradictions: ExtractionResult['contradictions'] = [];

  // Extract from answers
  for (const answer of quizResult.answers) {
    const extracted = analyzeTextForMemories(
      `${answer.question_text}: ${answer.answer_text}`,
      'quiz',
      quizResult.quiz_id,
      quizResult.quiz_name
    );
    candidates.push(...extracted);
  }

  // Extract from trait vector
  if (quizResult.trait_vector) {
    const dominantTraits = Object.entries(quizResult.trait_vector)
      .filter(([_, value]) => value > 0.6)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [trait, value] of dominantTraits) {
      candidates.push({
        memory_type: 'belief',
        content: {
          summary: `Perfil de personalidade: ${formatTraitName(trait)}`,
          details: `Identificado como ${formatTraitName(trait)} com ${Math.round(value * 100)}% de intensidade`,
          intensity: value,
          polarity: 'neutral',
          raw_data: { trait, value }
        },
        confidence: value * 0.9,
        source: 'quiz',
        source_id: quizResult.quiz_id,
        source_name: quizResult.quiz_name
      });
    }
  }

  // Extract from intent vector
  if (quizResult.intent_vector) {
    const dominantIntents = Object.entries(quizResult.intent_vector)
      .filter(([_, value]) => value > 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    for (const [intent, value] of dominantIntents) {
      candidates.push({
        memory_type: 'desire',
        content: {
          summary: `Intenção de ${formatIntentName(intent)}`,
          details: `Demonstra interesse em ${formatIntentName(intent)}`,
          intensity: value,
          polarity: 'positive',
          raw_data: { intent, value }
        },
        confidence: value * 0.85,
        source: 'quiz',
        source_id: quizResult.quiz_id,
        source_name: quizResult.quiz_name
      });
    }
  }

  // Check for reinforcements and contradictions
  return processExtractionResults(candidates, context, reinforcements, contradictions);
}

// Extract memories from survey responses
export function extractFromSurveyResponse(
  surveyResponse: {
    survey_id: string;
    survey_name: string;
    responses: Array<{
      question_text: string;
      question_type: string;
      answer: string | number | string[];
    }>;
  },
  context: ExtractionContext
): ExtractionResult {
  const candidates: MemoryCandidate[] = [];
  const reinforcements: ExtractionResult['reinforcements'] = [];
  const contradictions: ExtractionResult['contradictions'] = [];

  for (const response of surveyResponse.responses) {
    const answerText = Array.isArray(response.answer) 
      ? response.answer.join(', ')
      : String(response.answer);

    // Scale questions indicate preferences or pain points
    if (response.question_type === 'scale' && typeof response.answer === 'number') {
      const value = response.answer / 10;
      if (value >= 0.7) {
        candidates.push({
          memory_type: 'preference',
          content: {
            summary: `Alta satisfação: ${response.question_text}`,
            intensity: value,
            polarity: 'positive',
            raw_data: { question: response.question_text, score: response.answer }
          },
          confidence: value * 0.8,
          source: 'survey',
          source_id: surveyResponse.survey_id,
          source_name: surveyResponse.survey_name
        });
      } else if (value <= 0.3) {
        candidates.push({
          memory_type: 'pain_point',
          content: {
            summary: `Insatisfação: ${response.question_text}`,
            intensity: 1 - value,
            polarity: 'negative',
            raw_data: { question: response.question_text, score: response.answer }
          },
          confidence: (1 - value) * 0.8,
          source: 'survey',
          source_id: surveyResponse.survey_id,
          source_name: surveyResponse.survey_name
        });
      }
    }

    // Text responses
    if (response.question_type === 'text' && answerText.length > 10) {
      const extracted = analyzeTextForMemories(
        `${response.question_text}: ${answerText}`,
        'survey',
        surveyResponse.survey_id,
        surveyResponse.survey_name
      );
      candidates.push(...extracted);
    }
  }

  return processExtractionResults(candidates, context, reinforcements, contradictions);
}

// Extract memories from social comments
export function extractFromSocialComment(
  comment: {
    comment_id: string;
    post_id: string;
    text: string;
    sentiment_score?: number;
    intent_score?: number;
    category?: string;
  },
  context: ExtractionContext
): ExtractionResult {
  const candidates: MemoryCandidate[] = [];
  const reinforcements: ExtractionResult['reinforcements'] = [];
  const contradictions: ExtractionResult['contradictions'] = [];

  // Extract from text
  const extracted = analyzeTextForMemories(
    comment.text,
    'social',
    comment.comment_id,
    `Comentário em post`
  );
  candidates.push(...extracted);

  // Use sentiment for additional insights
  if (comment.sentiment_score !== undefined) {
    if (comment.sentiment_score > 0.7) {
      candidates.push({
        memory_type: 'preference',
        content: {
          summary: 'Demonstra satisfação com conteúdo/marca',
          details: comment.text.substring(0, 200),
          polarity: 'positive',
          intensity: comment.sentiment_score
        },
        confidence: comment.sentiment_score * 0.6,
        source: 'social',
        source_id: comment.comment_id
      });
    } else if (comment.sentiment_score < 0.3) {
      candidates.push({
        memory_type: 'objection',
        content: {
          summary: 'Expressa insatisfação ou crítica',
          details: comment.text.substring(0, 200),
          polarity: 'negative',
          intensity: 1 - comment.sentiment_score
        },
        confidence: (1 - comment.sentiment_score) * 0.6,
        source: 'social',
        source_id: comment.comment_id
      });
    }
  }

  // High intent indicates desire
  if (comment.intent_score && comment.intent_score > 0.7) {
    candidates.push({
      memory_type: 'desire',
      content: {
        summary: 'Demonstra interesse comercial',
        details: comment.text.substring(0, 200),
        polarity: 'positive',
        intensity: comment.intent_score
      },
      confidence: comment.intent_score * 0.7,
      source: 'social',
      source_id: comment.comment_id
    });
  }

  return processExtractionResults(candidates, context, reinforcements, contradictions);
}

// Extract memories from purchase behavior
export function extractFromPurchase(
  purchase: {
    transaction_id: string;
    product_name: string;
    offer_name?: string;
    payment_method?: string;
    total_price: number;
    is_first_purchase: boolean;
    is_recurring: boolean;
  },
  context: ExtractionContext
): ExtractionResult {
  const candidates: MemoryCandidate[] = [];
  const reinforcements: ExtractionResult['reinforcements'] = [];
  const contradictions: ExtractionResult['contradictions'] = [];

  // Product preference
  candidates.push({
    memory_type: 'preference',
    content: {
      summary: `Interesse em: ${purchase.product_name}`,
      details: purchase.offer_name 
        ? `Comprou via oferta: ${purchase.offer_name}`
        : `Adquiriu produto: ${purchase.product_name}`,
      polarity: 'positive',
      raw_data: { product: purchase.product_name, offer: purchase.offer_name }
    },
    confidence: 0.9,
    source: 'purchase',
    source_id: purchase.transaction_id,
    source_name: purchase.product_name
  });

  // Payment method preference
  if (purchase.payment_method) {
    candidates.push({
      memory_type: 'habit',
      content: {
        summary: `Prefere pagar via ${formatPaymentMethod(purchase.payment_method)}`,
        raw_data: { payment_method: purchase.payment_method }
      },
      confidence: 0.7,
      source: 'purchase',
      source_id: purchase.transaction_id
    });
  }

  // Price range context
  candidates.push({
    memory_type: 'context',
    content: {
      summary: `Investimento: ${formatCurrency(purchase.total_price)}`,
      details: purchase.is_recurring 
        ? 'Cliente recorrente/assinante'
        : purchase.is_first_purchase 
          ? 'Primeira compra'
          : 'Compra adicional',
      raw_data: { 
        price: purchase.total_price, 
        is_recurring: purchase.is_recurring,
        is_first: purchase.is_first_purchase 
      }
    },
    confidence: 0.85,
    source: 'purchase',
    source_id: purchase.transaction_id
  });

  return processExtractionResults(candidates, context, reinforcements, contradictions);
}

// Extract memories from chat/WhatsApp interaction
export function extractFromChat(
  message: {
    message_id: string;
    text: string;
    is_from_contact: boolean;
    conversation_context?: string;
  },
  context: ExtractionContext
): ExtractionResult {
  const candidates: MemoryCandidate[] = [];
  const reinforcements: ExtractionResult['reinforcements'] = [];
  const contradictions: ExtractionResult['contradictions'] = [];

  if (!message.is_from_contact) {
    return { new_memories: [], reinforcements: [], contradictions: [] };
  }

  // Extract from text
  const extracted = analyzeTextForMemories(
    message.text,
    'chat',
    message.message_id,
    'Conversa WhatsApp'
  );
  candidates.push(...extracted);

  // Analyze language style
  const style = analyzeLanguageStyle(message.text);
  if (style) {
    candidates.push({
      memory_type: 'language_style',
      content: {
        summary: style.description,
        details: style.characteristics.join(', '),
        raw_data: style
      },
      confidence: style.confidence,
      source: 'chat',
      source_id: message.message_id
    });
  }

  return processExtractionResults(candidates, context, reinforcements, contradictions);
}

// Analyze text for memory patterns
function analyzeTextForMemories(
  text: string,
  source: MemorySource,
  sourceId?: string,
  sourceName?: string
): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  const normalizedText = text.toLowerCase();

  for (const [memoryType, patterns] of Object.entries(MEMORY_PATTERNS)) {
    const allKeywords = [...patterns.keywords, ...patterns.indicators];
    
    for (const keyword of allKeywords) {
      if (normalizedText.includes(keyword)) {
        // Extract the context around the keyword
        const keywordIndex = normalizedText.indexOf(keyword);
        const start = Math.max(0, keywordIndex - 50);
        const end = Math.min(text.length, keywordIndex + keyword.length + 100);
        const context = text.substring(start, end).trim();

        candidates.push({
          memory_type: memoryType as MemoryType,
          content: {
            summary: context.length > 100 ? context.substring(0, 100) + '...' : context,
            details: text,
            keywords: [keyword],
            polarity: determinePolarity(context)
          },
          confidence: patterns.weight * 0.7,
          source,
          source_id: sourceId,
          source_name: sourceName
        });
        break; // Only one memory per type per text
      }
    }
  }

  return candidates;
}

// Analyze language style
function analyzeLanguageStyle(text: string): {
  description: string;
  characteristics: string[];
  confidence: number;
} | null {
  if (text.length < 20) return null;

  const characteristics: string[] = [];
  let confidence = 0.5;

  // Check formality
  const formalIndicators = ['prezado', 'atenciosamente', 'cordialmente', 'senhor', 'senhora'];
  const informalIndicators = ['oi', 'opa', 'e aí', 'blz', 'vlw', 'tmj'];
  
  const hasFormal = formalIndicators.some(i => text.toLowerCase().includes(i));
  const hasInformal = informalIndicators.some(i => text.toLowerCase().includes(i));

  if (hasFormal) {
    characteristics.push('formal');
    confidence += 0.1;
  } else if (hasInformal) {
    characteristics.push('informal');
    confidence += 0.1;
  }

  // Check emoji usage
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
  if (emojiRegex.test(text)) {
    characteristics.push('usa emojis');
    confidence += 0.05;
  }

  // Check message length preference
  if (text.length > 200) {
    characteristics.push('detalhista');
    confidence += 0.1;
  } else if (text.length < 50) {
    characteristics.push('direto');
    confidence += 0.1;
  }

  // Check for questions
  if (text.includes('?')) {
    characteristics.push('inquisitivo');
    confidence += 0.05;
  }

  if (characteristics.length === 0) return null;

  return {
    description: `Estilo de comunicação: ${characteristics.join(', ')}`,
    characteristics,
    confidence: Math.min(confidence, 0.9)
  };
}

// Process extraction results - check for reinforcements and contradictions
function processExtractionResults(
  candidates: MemoryCandidate[],
  context: ExtractionContext,
  reinforcements: ExtractionResult['reinforcements'],
  contradictions: ExtractionResult['contradictions']
): ExtractionResult {
  const newMemories: MemoryCandidate[] = [];

  for (const candidate of candidates) {
    // Check for existing similar memories
    const similar = findSimilarMemory(candidate, context.existing_memories);

    if (similar) {
      // Check if it reinforces or contradicts
      const isContradiction = checkContradiction(candidate, similar);
      
      if (isContradiction) {
        contradictions.push({
          existing_memory_id: similar.id!,
          new_memory: candidate,
          conflict_reason: `Contradição detectada: ${candidate.content.summary} vs ${similar.content.summary}`
        });
      } else {
        reinforcements.push({
          memory_id: similar.id!,
          confidence_boost: candidate.confidence * 0.2,
          new_evidence: candidate.content.summary
        });
      }
    } else {
      newMemories.push(candidate);
    }
  }

  // Deduplicate new memories
  const uniqueMemories = deduplicateMemories(newMemories);

  return {
    new_memories: uniqueMemories,
    reinforcements,
    contradictions
  };
}

// Find similar existing memory
function findSimilarMemory(candidate: MemoryCandidate, existingMemories: Memory[]): Memory | null {
  for (const memory of existingMemories) {
    if (memory.memory_type !== candidate.memory_type) continue;

    // Simple similarity check based on keywords
    const candidateKeywords = candidate.content.keywords || [];
    const memoryKeywords = memory.content.keywords || [];
    
    const overlap = candidateKeywords.filter(k => 
      memoryKeywords.some(mk => mk.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(mk.toLowerCase()))
    );

    if (overlap.length > 0) return memory;

    // Check content summary similarity (simple approach)
    const candidateSummary = candidate.content.summary.toLowerCase();
    const memorySummary = memory.content.summary.toLowerCase();
    
    if (candidateSummary.includes(memorySummary.substring(0, 20)) || 
        memorySummary.includes(candidateSummary.substring(0, 20))) {
      return memory;
    }
  }

  return null;
}

// Check if new memory contradicts existing
function checkContradiction(candidate: MemoryCandidate, existing: Memory): boolean {
  // Different polarities suggest contradiction
  if (candidate.content.polarity && existing.content.polarity) {
    if (candidate.content.polarity !== existing.content.polarity) {
      return true;
    }
  }

  // Check for negative keywords in same topic
  const negativeIndicators = ['não', 'nunca', 'contra', 'odeio', 'detesto'];
  const candidateHasNegative = negativeIndicators.some(n => 
    candidate.content.summary.toLowerCase().includes(n)
  );
  const existingHasNegative = negativeIndicators.some(n => 
    existing.content.summary.toLowerCase().includes(n)
  );

  if (candidateHasNegative !== existingHasNegative) {
    return true;
  }

  return false;
}

// Deduplicate memories
function deduplicateMemories(memories: MemoryCandidate[]): MemoryCandidate[] {
  const seen = new Map<string, MemoryCandidate>();

  for (const memory of memories) {
    const key = `${memory.memory_type}:${memory.content.summary.substring(0, 50)}`;
    
    if (!seen.has(key) || (seen.get(key)!.confidence < memory.confidence)) {
      seen.set(key, memory);
    }
  }

  return Array.from(seen.values());
}

// Determine polarity from text
function determinePolarity(text: string): 'positive' | 'negative' | 'neutral' {
  const positiveWords = ['bom', 'ótimo', 'excelente', 'adoro', 'gosto', 'amo', 'maravilhoso', 'perfeito'];
  const negativeWords = ['ruim', 'péssimo', 'horrível', 'odeio', 'detesto', 'terrível', 'não gosto'];

  const normalized = text.toLowerCase();
  const hasPositive = positiveWords.some(w => normalized.includes(w));
  const hasNegative = negativeWords.some(w => normalized.includes(w));

  if (hasPositive && !hasNegative) return 'positive';
  if (hasNegative && !hasPositive) return 'negative';
  return 'neutral';
}

// Helper formatters
function formatTraitName(trait: string): string {
  const names: Record<string, string> = {
    analytical: 'Analítico',
    creative: 'Criativo',
    practical: 'Prático',
    social: 'Social',
    ambitious: 'Ambicioso',
    cautious: 'Cauteloso',
    spontaneous: 'Espontâneo',
    methodical: 'Metódico'
  };
  return names[trait] || trait.charAt(0).toUpperCase() + trait.slice(1);
}

function formatIntentName(intent: string): string {
  const names: Record<string, string> = {
    buy: 'Comprar',
    learn: 'Aprender',
    compare: 'Comparar',
    explore: 'Explorar',
    solve: 'Resolver problema',
    upgrade: 'Fazer upgrade',
    start: 'Começar'
  };
  return names[intent] || intent.charAt(0).toUpperCase() + intent.slice(1);
}

function formatPaymentMethod(method: string): string {
  const names: Record<string, string> = {
    credit_card: 'Cartão de crédito',
    pix: 'PIX',
    boleto: 'Boleto',
    debit: 'Débito'
  };
  return names[method.toLowerCase()] || method;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Get memory type icon
export function getMemoryTypeIcon(type: MemoryType): string {
  const icons: Record<MemoryType, string> = {
    preference: '❤️',
    objection: '🚫',
    desire: '✨',
    trigger: '⚡',
    pain_point: '😣',
    habit: '🔄',
    belief: '💭',
    language_style: '💬',
    goal: '🎯',
    fear: '😰',
    value: '💎',
    constraint: '🔒',
    context: '📍'
  };
  return icons[type] || '🧠';
}

// Get memory type label
export function getMemoryTypeLabel(type: MemoryType): string {
  const labels: Record<MemoryType, string> = {
    preference: 'Preferência',
    objection: 'Objeção',
    desire: 'Desejo',
    trigger: 'Gatilho',
    pain_point: 'Ponto de Dor',
    habit: 'Hábito',
    belief: 'Crença',
    language_style: 'Estilo de Comunicação',
    goal: 'Objetivo',
    fear: 'Medo',
    value: 'Valor',
    constraint: 'Restrição',
    context: 'Contexto'
  };
  return labels[type] || type;
}

// Get source label
export function getSourceLabel(source: MemorySource): string {
  const labels: Record<MemorySource, string> = {
    quiz: 'Quiz',
    chat: 'Chat',
    social: 'Social',
    agent: 'Agente IA',
    manual: 'Manual',
    survey: 'Pesquisa',
    purchase: 'Compra',
    behavior: 'Comportamento',
    inference: 'Inferência'
  };
  return labels[source] || source;
}

// Get confidence color class
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.6) return 'text-yellow-500';
  if (confidence >= 0.4) return 'text-orange-500';
  return 'text-red-500';
}
