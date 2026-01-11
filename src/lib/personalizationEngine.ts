// Personalization Engine
// Generates real-time personalization directives based on contact context

import type { Memory, MemoryType } from './memoryExtractionEngine';

// Types
export type PersonalizationChannel = 'quiz' | 'site' | 'email' | 'whatsapp' | 'ads' | 'landing' | 'survey';
export type PersonalizationDepth = 'minimal' | 'standard' | 'deep';
export type ToneStyle = 'educational' | 'inspirational' | 'direct' | 'empathetic' | 'playful' | 'professional' | 'urgent';
export type CtaStyle = 'soft' | 'moderate' | 'strong' | 'urgent';
export type ContentBlock = 'social_proof' | 'case_study' | 'testimonial' | 'statistics' | 'guarantee' | 'scarcity' | 'bonus' | 'faq' | 'comparison' | 'story';

export interface CognitiveProfile {
  trait_vector: Record<string, number>;
  intent_vector: Record<string, number>;
  confidence_score: number;
  entropy_score: number;
}

export interface Prediction {
  prediction_type: string;
  confidence: number;
  risk_level: string;
  urgency_score: number;
  recommended_actions: Array<{ action: string; priority: number }>;
}

export interface PersonalizationContext {
  contact_id?: string;
  session_id: string;
  channel: PersonalizationChannel;
  profile?: CognitiveProfile;
  memories: Memory[];
  predictions: Prediction[];
  depth: PersonalizationDepth;
  excluded_memory_types: MemoryType[];
  human_override?: Partial<PersonalizationDirectives>;
}

export interface PersonalizationDirectives {
  tone: ToneStyle;
  urgency: 'low' | 'medium' | 'high';
  angle: string;
  cta_style: CtaStyle;
  content_blocks: ContentBlock[];
  avoid: string[];
  language_adaptations: {
    formality: 'formal' | 'neutral' | 'informal';
    emoji_usage: boolean;
    message_length: 'short' | 'medium' | 'long';
  };
  personalized_elements: {
    greeting?: string;
    pain_point_reference?: string;
    goal_reference?: string;
    social_proof_type?: string;
  };
  confidence: number;
  reasoning: string[];
}

export interface TokenValues {
  'intent.primary': string;
  'intent.secondary': string;
  'trait.dominant': string;
  'trait.secondary': string;
  'memory.pain_point': string;
  'memory.desire': string;
  'memory.objection': string;
  'memory.preference': string;
  'memory.goal': string;
  'memory.fear': string;
  'prediction.next_action': string;
  'prediction.risk': string;
  'language.style': string;
  'language.formality': string;
  'context.channel': string;
  'contact.name': string;
  'contact.first_name': string;
}

// Default directives when no data available
const DEFAULT_DIRECTIVES: PersonalizationDirectives = {
  tone: 'professional',
  urgency: 'medium',
  angle: 'value',
  cta_style: 'moderate',
  content_blocks: ['social_proof', 'faq'],
  avoid: [],
  language_adaptations: {
    formality: 'neutral',
    emoji_usage: false,
    message_length: 'medium'
  },
  personalized_elements: {},
  confidence: 0.3,
  reasoning: ['Usando configurações padrão - dados insuficientes']
};

// Main personalization function
export function generatePersonalizationDirectives(
  context: PersonalizationContext
): PersonalizationDirectives {
  const reasoning: string[] = [];
  let confidence = 0.5;

  // Start with defaults
  let directives: PersonalizationDirectives = { ...DEFAULT_DIRECTIVES, reasoning: [] };

  // Apply profile-based personalization
  if (context.profile && context.profile.confidence_score > 0.4) {
    const profileDirectives = applyProfilePersonalization(context.profile);
    directives = mergeDirectives(directives, profileDirectives);
    reasoning.push(...profileDirectives.reasoning);
    confidence += 0.1;
  }

  // Apply memory-based personalization
  const filteredMemories = context.memories.filter(
    m => !context.excluded_memory_types.includes(m.memory_type)
  );
  
  if (filteredMemories.length > 0) {
    const memoryDirectives = applyMemoryPersonalization(filteredMemories);
    directives = mergeDirectives(directives, memoryDirectives);
    reasoning.push(...memoryDirectives.reasoning);
    confidence += Math.min(0.2, filteredMemories.length * 0.05);
  }

  // Apply prediction-based personalization
  if (context.predictions.length > 0) {
    const predictionDirectives = applyPredictionPersonalization(context.predictions);
    directives = mergeDirectives(directives, predictionDirectives);
    reasoning.push(...predictionDirectives.reasoning);
    confidence += 0.1;
  }

  // Apply channel-specific adjustments
  const channelDirectives = applyChannelAdjustments(context.channel);
  directives = mergeDirectives(directives, channelDirectives);

  // Apply depth constraints
  directives = applyDepthConstraints(directives, context.depth);

  // Apply human overrides
  if (context.human_override) {
    directives = { ...directives, ...context.human_override };
    reasoning.push('Ajustes manuais aplicados');
  }

  directives.confidence = Math.min(0.95, confidence);
  directives.reasoning = reasoning;

  return directives;
}

// Apply profile-based personalization
function applyProfilePersonalization(profile: CognitiveProfile): Partial<PersonalizationDirectives> & { reasoning: string[] } {
  const reasoning: string[] = [];
  const directives: Partial<PersonalizationDirectives> = {};

  // Find dominant trait
  const traits = Object.entries(profile.trait_vector).sort((a, b) => b[1] - a[1]);
  const dominantTrait = traits[0];

  if (dominantTrait && dominantTrait[1] > 0.4) {
    const traitName = dominantTrait[0];
    reasoning.push(`Traço dominante: ${traitName} (${Math.round(dominantTrait[1] * 100)}%)`);

    // Adjust tone based on trait
    const traitTones: Record<string, ToneStyle> = {
      analytical: 'educational',
      creative: 'inspirational',
      practical: 'direct',
      social: 'empathetic',
      ambitious: 'inspirational',
      cautious: 'educational',
      spontaneous: 'playful',
      methodical: 'professional'
    };
    
    if (traitTones[traitName]) {
      directives.tone = traitTones[traitName];
    }

    // Adjust content blocks based on trait
    const traitContent: Record<string, ContentBlock[]> = {
      analytical: ['statistics', 'comparison', 'faq'],
      creative: ['story', 'testimonial', 'bonus'],
      practical: ['case_study', 'guarantee', 'comparison'],
      social: ['testimonial', 'social_proof', 'story'],
      ambitious: ['case_study', 'statistics', 'bonus'],
      cautious: ['guarantee', 'faq', 'testimonial'],
      spontaneous: ['scarcity', 'bonus', 'social_proof'],
      methodical: ['comparison', 'statistics', 'faq']
    };

    if (traitContent[traitName]) {
      directives.content_blocks = traitContent[traitName];
    }
  }

  // Find dominant intent
  const intents = Object.entries(profile.intent_vector).sort((a, b) => b[1] - a[1]);
  const dominantIntent = intents[0];

  if (dominantIntent && dominantIntent[1] > 0.4) {
    const intentName = dominantIntent[0];
    reasoning.push(`Intenção dominante: ${intentName} (${Math.round(dominantIntent[1] * 100)}%)`);

    // Adjust angle and CTA based on intent
    const intentAngles: Record<string, { angle: string; cta: CtaStyle }> = {
      buy: { angle: 'value', cta: 'strong' },
      learn: { angle: 'education', cta: 'soft' },
      compare: { angle: 'differentiation', cta: 'moderate' },
      explore: { angle: 'discovery', cta: 'soft' },
      solve: { angle: 'solution', cta: 'strong' },
      upgrade: { angle: 'growth', cta: 'moderate' },
      start: { angle: 'opportunity', cta: 'moderate' }
    };

    if (intentAngles[intentName]) {
      directives.angle = intentAngles[intentName].angle;
      directives.cta_style = intentAngles[intentName].cta;
    }
  }

  return { ...directives, reasoning };
}

// Apply memory-based personalization
function applyMemoryPersonalization(memories: Memory[]): Partial<PersonalizationDirectives> & { reasoning: string[] } {
  const reasoning: string[] = [];
  const directives: Partial<PersonalizationDirectives> = {
    personalized_elements: {},
    avoid: []
  };

  // Group memories by type
  const memoryByType = memories.reduce((acc, m) => {
    if (!acc[m.memory_type]) acc[m.memory_type] = [];
    acc[m.memory_type].push(m);
    return acc;
  }, {} as Record<MemoryType, Memory[]>);

  // Apply pain point references
  if (memoryByType.pain_point?.length) {
    const topPainPoint = memoryByType.pain_point.sort((a, b) => b.confidence - a.confidence)[0];
    directives.personalized_elements!.pain_point_reference = topPainPoint.content.summary;
    reasoning.push(`Ponto de dor identificado: ${topPainPoint.content.summary.substring(0, 50)}...`);
    
    // Adjust tone for empathy
    directives.tone = 'empathetic';
  }

  // Apply goal references
  if (memoryByType.goal?.length) {
    const topGoal = memoryByType.goal.sort((a, b) => b.confidence - a.confidence)[0];
    directives.personalized_elements!.goal_reference = topGoal.content.summary;
    reasoning.push(`Objetivo identificado: ${topGoal.content.summary.substring(0, 50)}...`);
  }

  // Apply objection awareness
  if (memoryByType.objection?.length) {
    const objections = memoryByType.objection;
    objections.forEach(obj => {
      const summary = obj.content.summary.toLowerCase();
      
      if (summary.includes('caro') || summary.includes('preço')) {
        directives.avoid!.push('price_pressure');
        directives.content_blocks = ['guarantee', 'testimonial', 'case_study'];
        reasoning.push('Evitando pressão de preço devido a objeção anterior');
      }
      
      if (summary.includes('tempo') || summary.includes('ocupado')) {
        directives.language_adaptations = {
          ...directives.language_adaptations!,
          message_length: 'short'
        };
        reasoning.push('Mensagens curtas devido a restrição de tempo');
      }
    });
  }

  // Apply language style
  if (memoryByType.language_style?.length) {
    const styleMemory = memoryByType.language_style[0];
    const details = styleMemory.content.details?.toLowerCase() || '';
    
    if (details.includes('formal')) {
      directives.language_adaptations = {
        ...directives.language_adaptations!,
        formality: 'formal'
      };
    } else if (details.includes('informal')) {
      directives.language_adaptations = {
        ...directives.language_adaptations!,
        formality: 'informal',
        emoji_usage: true
      };
    }

    if (details.includes('detalhista')) {
      directives.language_adaptations = {
        ...directives.language_adaptations!,
        message_length: 'long'
      };
    } else if (details.includes('direto')) {
      directives.language_adaptations = {
        ...directives.language_adaptations!,
        message_length: 'short'
      };
    }

    reasoning.push(`Estilo de comunicação ajustado: ${styleMemory.content.summary}`);
  }

  // Apply fear awareness
  if (memoryByType.fear?.length) {
    const topFear = memoryByType.fear.sort((a, b) => b.confidence - a.confidence)[0];
    directives.content_blocks = [...(directives.content_blocks || []), 'guarantee', 'testimonial'];
    directives.avoid = [...(directives.avoid || []), 'high_pressure'];
    reasoning.push(`Medo identificado: adaptando abordagem para tranquilizar`);
  }

  return { ...directives, reasoning };
}

// Apply prediction-based personalization
function applyPredictionPersonalization(predictions: Prediction[]): Partial<PersonalizationDirectives> & { reasoning: string[] } {
  const reasoning: string[] = [];
  const directives: Partial<PersonalizationDirectives> = {};

  // Sort by urgency
  const sortedPredictions = predictions.sort((a, b) => b.urgency_score - a.urgency_score);
  const topPrediction = sortedPredictions[0];

  if (topPrediction) {
    reasoning.push(`Previsão ativa: ${topPrediction.prediction_type} (urgência: ${Math.round(topPrediction.urgency_score * 100)}%)`);

    // Adjust urgency based on prediction
    if (topPrediction.urgency_score > 0.7) {
      directives.urgency = 'high';
      directives.cta_style = 'urgent';
    } else if (topPrediction.urgency_score > 0.4) {
      directives.urgency = 'medium';
    } else {
      directives.urgency = 'low';
    }

    // Adjust based on risk level
    if (topPrediction.risk_level === 'high') {
      directives.tone = 'empathetic';
      directives.content_blocks = ['guarantee', 'testimonial', 'case_study'];
      reasoning.push('Abordagem cautelosa devido a alto risco');
    }

    // Include recommended actions in angle
    if (topPrediction.recommended_actions?.length) {
      const topAction = topPrediction.recommended_actions[0];
      directives.angle = topAction.action.replace(/_/g, ' ');
    }
  }

  return { ...directives, reasoning };
}

// Apply channel-specific adjustments
function applyChannelAdjustments(channel: PersonalizationChannel): Partial<PersonalizationDirectives> & { reasoning: string[] } {
  const reasoning: string[] = [];
  const directives: Partial<PersonalizationDirectives> = {};

  switch (channel) {
    case 'whatsapp':
      directives.language_adaptations = {
        formality: 'informal',
        emoji_usage: true,
        message_length: 'short'
      };
      reasoning.push('Canal WhatsApp: tom informal e mensagens curtas');
      break;

    case 'email':
      directives.language_adaptations = {
        formality: 'neutral',
        emoji_usage: false,
        message_length: 'medium'
      };
      directives.content_blocks = ['social_proof', 'case_study', 'faq'];
      reasoning.push('Canal Email: formato estruturado');
      break;

    case 'quiz':
      directives.tone = 'playful';
      directives.cta_style = 'soft';
      reasoning.push('Canal Quiz: tom leve e CTAs suaves');
      break;

    case 'landing':
      directives.content_blocks = ['social_proof', 'testimonial', 'guarantee', 'scarcity'];
      directives.cta_style = 'strong';
      reasoning.push('Landing Page: elementos de conversão');
      break;

    case 'ads':
      directives.language_adaptations = {
        formality: 'neutral',
        emoji_usage: true,
        message_length: 'short'
      };
      directives.urgency = 'medium';
      reasoning.push('Canal Ads: copy conciso e urgência moderada');
      break;
  }

  return { ...directives, reasoning };
}

// Apply depth constraints
function applyDepthConstraints(
  directives: PersonalizationDirectives,
  depth: PersonalizationDepth
): PersonalizationDirectives {
  switch (depth) {
    case 'minimal':
      return {
        ...directives,
        personalized_elements: {},
        avoid: [],
        content_blocks: directives.content_blocks.slice(0, 2)
      };

    case 'standard':
      return {
        ...directives,
        content_blocks: directives.content_blocks.slice(0, 4)
      };

    case 'deep':
      return directives;

    default:
      return directives;
  }
}

// Merge two directive objects
function mergeDirectives(
  base: PersonalizationDirectives,
  override: Partial<PersonalizationDirectives>
): PersonalizationDirectives {
  return {
    ...base,
    ...override,
    content_blocks: override.content_blocks || base.content_blocks,
    avoid: [...(base.avoid || []), ...(override.avoid || [])].filter((v, i, a) => a.indexOf(v) === i),
    language_adaptations: {
      ...base.language_adaptations,
      ...(override.language_adaptations || {})
    },
    personalized_elements: {
      ...base.personalized_elements,
      ...(override.personalized_elements || {})
    },
    reasoning: override.reasoning || base.reasoning
  };
}

// Token resolution
export function resolveTokens(
  content: string,
  tokenValues: Partial<TokenValues>
): string {
  let resolved = content;

  for (const [token, value] of Object.entries(tokenValues)) {
    const regex = new RegExp(`\\{\\{${token}\\}\\}`, 'g');
    resolved = resolved.replace(regex, value || '');
  }

  // Clean up unresolved tokens
  resolved = resolved.replace(/\{\{[^}]+\}\}/g, '');

  return resolved.trim();
}

// Build token values from context
export function buildTokenValues(
  context: PersonalizationContext,
  contactName?: string
): Partial<TokenValues> {
  const tokens: Partial<TokenValues> = {
    'context.channel': context.channel
  };

  // Contact info
  if (contactName) {
    tokens['contact.name'] = contactName;
    tokens['contact.first_name'] = contactName.split(' ')[0];
  }

  // Profile tokens
  if (context.profile) {
    const traits = Object.entries(context.profile.trait_vector).sort((a, b) => b[1] - a[1]);
    if (traits[0]) tokens['trait.dominant'] = formatKeyName(traits[0][0]);
    if (traits[1]) tokens['trait.secondary'] = formatKeyName(traits[1][0]);

    const intents = Object.entries(context.profile.intent_vector).sort((a, b) => b[1] - a[1]);
    if (intents[0]) tokens['intent.primary'] = formatKeyName(intents[0][0]);
    if (intents[1]) tokens['intent.secondary'] = formatKeyName(intents[1][0]);
  }

  // Memory tokens
  const memoryByType = context.memories.reduce((acc, m) => {
    if (!acc[m.memory_type]) acc[m.memory_type] = m;
    return acc;
  }, {} as Record<MemoryType, Memory>);

  if (memoryByType.pain_point) {
    tokens['memory.pain_point'] = memoryByType.pain_point.content.summary;
  }
  if (memoryByType.desire) {
    tokens['memory.desire'] = memoryByType.desire.content.summary;
  }
  if (memoryByType.objection) {
    tokens['memory.objection'] = memoryByType.objection.content.summary;
  }
  if (memoryByType.preference) {
    tokens['memory.preference'] = memoryByType.preference.content.summary;
  }
  if (memoryByType.goal) {
    tokens['memory.goal'] = memoryByType.goal.content.summary;
  }
  if (memoryByType.fear) {
    tokens['memory.fear'] = memoryByType.fear.content.summary;
  }
  if (memoryByType.language_style) {
    tokens['language.style'] = memoryByType.language_style.content.summary;
  }

  // Prediction tokens
  if (context.predictions.length > 0) {
    const topPrediction = context.predictions.sort((a, b) => b.urgency_score - a.urgency_score)[0];
    tokens['prediction.next_action'] = topPrediction.recommended_actions?.[0]?.action || '';
    tokens['prediction.risk'] = topPrediction.risk_level;
  }

  return tokens;
}

// Get available tokens for a channel
export function getAvailableTokens(channel: PersonalizationChannel): string[] {
  const baseTokens = [
    '{{contact.name}}',
    '{{contact.first_name}}',
    '{{context.channel}}'
  ];

  const profileTokens = [
    '{{intent.primary}}',
    '{{intent.secondary}}',
    '{{trait.dominant}}',
    '{{trait.secondary}}'
  ];

  const memoryTokens = [
    '{{memory.pain_point}}',
    '{{memory.desire}}',
    '{{memory.objection}}',
    '{{memory.preference}}',
    '{{memory.goal}}',
    '{{memory.fear}}',
    '{{language.style}}'
  ];

  const predictionTokens = [
    '{{prediction.next_action}}',
    '{{prediction.risk}}'
  ];

  switch (channel) {
    case 'email':
    case 'whatsapp':
      return [...baseTokens, ...profileTokens, ...memoryTokens, ...predictionTokens];
    case 'quiz':
    case 'survey':
      return [...baseTokens, ...profileTokens];
    case 'landing':
    case 'ads':
      return [...baseTokens, ...profileTokens, ...memoryTokens];
    default:
      return baseTokens;
  }
}

// Helper function
function formatKeyName(key: string): string {
  const names: Record<string, string> = {
    analytical: 'analítico',
    creative: 'criativo',
    practical: 'prático',
    social: 'social',
    ambitious: 'ambicioso',
    cautious: 'cauteloso',
    spontaneous: 'espontâneo',
    methodical: 'metódico',
    buy: 'compra',
    learn: 'aprendizado',
    compare: 'comparação',
    explore: 'exploração',
    solve: 'solução',
    upgrade: 'upgrade',
    start: 'início'
  };
  return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

// Get tone label
export function getToneLabel(tone: ToneStyle): string {
  const labels: Record<ToneStyle, string> = {
    educational: 'Educativo',
    inspirational: 'Inspirador',
    direct: 'Direto',
    empathetic: 'Empático',
    playful: 'Descontraído',
    professional: 'Profissional',
    urgent: 'Urgente'
  };
  return labels[tone] || tone;
}

// Get CTA style label
export function getCtaStyleLabel(style: CtaStyle): string {
  const labels: Record<CtaStyle, string> = {
    soft: 'Suave',
    moderate: 'Moderado',
    strong: 'Forte',
    urgent: 'Urgente'
  };
  return labels[style] || style;
}

// Get content block label
export function getContentBlockLabel(block: ContentBlock): string {
  const labels: Record<ContentBlock, string> = {
    social_proof: 'Prova Social',
    case_study: 'Estudo de Caso',
    testimonial: 'Depoimento',
    statistics: 'Estatísticas',
    guarantee: 'Garantia',
    scarcity: 'Escassez',
    bonus: 'Bônus',
    faq: 'FAQ',
    comparison: 'Comparação',
    story: 'História'
  };
  return labels[block] || block;
}
