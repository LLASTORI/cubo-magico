// Quiz Result Narrative Generator
// Transforms technical quiz results into human-readable copy

import { 
  interpretProfile, 
  generateProfileSummary, 
  type SemanticProfile,
  type SemanticProfileInput 
} from './semanticProfileEngine';

export interface QuizContext {
  quiz_name?: string;
  quiz_type?: string;
  total_questions?: number;
  completion_time?: number;
  normalized_score?: number;
}

export interface ResultNarrative {
  title: string;
  subtitle: string;
  explanation: string;
  bullet_points: string[];
  cta_text: string;
  tone: 'empowering' | 'educational' | 'celebratory' | 'supportive';
  semantic_profile: SemanticProfile;
}

export interface QuizResultData {
  summary?: {
    text?: string;
    primary_trait?: string;
    primary_intent?: string;
  };
  traits_vector?: Record<string, number>;
  intent_vector?: Record<string, number>;
  normalized_score?: number;
  confidence?: number;
  entropy?: number;
}

// Generate complete narrative from quiz result
export function generateQuizResultCopy(
  result: QuizResultData,
  context: QuizContext = {}
): ResultNarrative {
  // Build semantic profile
  const profileInput: SemanticProfileInput = {
    vectors: {
      intent_vector: result.intent_vector || {},
      traits_vector: result.traits_vector || {}
    },
    entropy: result.entropy || 0.5,
    confidence: result.confidence || 0.5,
    normalized_score: result.normalized_score
  };

  const semanticProfile = interpretProfile(profileInput);

  // Determine tone based on profile
  let tone: ResultNarrative['tone'] = 'empowering';
  if (semanticProfile.risk_profile.includes('Baixo')) {
    tone = 'supportive';
  } else if (semanticProfile.primary_intent_label.includes('Aprendiz') || 
             semanticProfile.primary_intent_label.includes('Pesquisadora')) {
    tone = 'educational';
  } else if (semanticProfile.risk_profile.includes('Alto')) {
    tone = 'celebratory';
  }

  // Generate title
  const title = generateTitle(semanticProfile, tone);

  // Generate subtitle
  const subtitle = generateSubtitle(semanticProfile, context);

  // Generate explanation
  const explanation = generateExplanation(semanticProfile, result);

  // Generate bullet points
  const bullet_points = generateBulletPoints(semanticProfile, result);

  // Generate CTA text
  const cta_text = generateCtaText(semanticProfile, tone);

  return {
    title,
    subtitle,
    explanation,
    bullet_points,
    cta_text,
    tone,
    semantic_profile: semanticProfile
  };
}

// Generate empowering title
function generateTitle(profile: SemanticProfile, tone: ResultNarrative['tone']): string {
  const titles: Record<ResultNarrative['tone'], string[]> = {
    empowering: [
      `Você é ${profile.profile_name}!`,
      `Seu perfil: ${profile.profile_name}`,
      `Descobrimos seu perfil: ${profile.profile_name}`,
    ],
    educational: [
      `Seu perfil de aprendizado: ${profile.profile_name}`,
      `Entenda seu perfil: ${profile.profile_name}`,
      `${profile.profile_name} - Seu estilo único`,
    ],
    celebratory: [
      `Parabéns! Você é ${profile.profile_name}!`,
      `Incrível! Seu perfil: ${profile.profile_name}`,
      `${profile.profile_name} - Um perfil especial!`,
    ],
    supportive: [
      `Descobrimos seu perfil`,
      `Seu perfil é ${profile.profile_name}`,
      `Entenda melhor quem você é`,
    ],
  };

  const options = titles[tone];
  return options[Math.floor(Math.random() * options.length)];
}

// Generate contextual subtitle
function generateSubtitle(profile: SemanticProfile, context: QuizContext): string {
  const quizName = context.quiz_name || 'o quiz';
  
  return `Baseado nas suas ${context.total_questions || 'respostas'} respostas em ${quizName}, identificamos características únicas sobre você.`;
}

// Generate detailed explanation
function generateExplanation(profile: SemanticProfile, result: QuizResultData): string {
  // Start with the semantic profile summary
  let explanation = generateProfileSummary(profile);

  // Add context based on score
  if (result.normalized_score !== undefined) {
    const scoreLevel = result.normalized_score > 0.7 ? 'alto' : 
                       result.normalized_score > 0.4 ? 'moderado' : 'inicial';
    explanation += ` Seu nível de engajamento é ${scoreLevel}.`;
  }

  return explanation;
}

// Generate insight bullet points
function generateBulletPoints(profile: SemanticProfile, result: QuizResultData): string[] {
  const bullets: string[] = [];

  // Buying style insight
  bullets.push(`💡 **Estilo de decisão:** ${profile.buying_style}`);

  // Emotional driver insight
  bullets.push(`❤️ **O que te motiva:** ${capitalizeFirst(profile.emotional_driver)}`);

  // Primary trait insight
  bullets.push(`✨ **Característica principal:** ${profile.primary_trait_label}`);

  // Intent insight
  bullets.push(`🎯 **Momento atual:** ${profile.primary_intent_label}`);

  return bullets;
}

// Generate CTA text based on profile
function generateCtaText(profile: SemanticProfile, tone: ResultNarrative['tone']): string {
  const copyAngle = profile.copy_angle.split('_')[0];
  
  const ctaOptions: Record<string, string[]> = {
    educacional: ['Aprender mais', 'Explorar conteúdo', 'Continuar descobrindo'],
    emocional: ['Quero transformar', 'Começar agora', 'Dar o próximo passo'],
    dados: ['Ver mais detalhes', 'Analisar resultados', 'Comparar opções'],
    garantia: ['Ver garantias', 'Conhecer o suporte', 'Falar com especialista'],
    exclusividade: ['Acessar exclusivo', 'Garantir minha vaga', 'Quero ser VIP'],
    autoridade: ['Falar com expert', 'Ver cases de sucesso', 'Agendar consultoria'],
    comunidade: ['Entrar na comunidade', 'Conhecer outros', 'Fazer parte'],
    valor: ['Ver investimento', 'Conhecer opções', 'Avaliar benefícios'],
  };

  const options = ctaOptions[copyAngle] || ctaOptions.valor;
  return options[Math.floor(Math.random() * options.length)];
}

// Format profile for display (replaces technical labels)
export function formatProfileForDisplay(result: QuizResultData): {
  primaryTraitLabel: string;
  primaryIntentLabel: string;
  traits: Array<{ label: string; value: number }>;
  intents: Array<{ label: string; value: number }>;
} {
  const profileInput: SemanticProfileInput = {
    vectors: {
      intent_vector: result.intent_vector || {},
      traits_vector: result.traits_vector || {}
    }
  };

  const profile = interpretProfile(profileInput);

  // Import semantic labels
  const { getSemanticLabels } = require('./semanticProfileEngine');

  return {
    primaryTraitLabel: profile.primary_trait_label,
    primaryIntentLabel: profile.primary_intent_label,
    traits: getSemanticLabels(result.traits_vector || {}, 'trait', 4),
    intents: getSemanticLabels(result.intent_vector || {}, 'intent', 4)
  };
}

// Helper
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Export for use in outcomes
export function getProfileTokens(result: QuizResultData): Record<string, string> {
  const narrative = generateQuizResultCopy(result);
  
  return {
    'profile.name': narrative.semantic_profile.profile_name,
    'profile.buying_style': narrative.semantic_profile.buying_style,
    'profile.emotional_driver': narrative.semantic_profile.emotional_driver,
    'profile.copy_angle': narrative.semantic_profile.copy_angle,
    'profile.risk_profile': narrative.semantic_profile.risk_profile,
    'profile.description': narrative.semantic_profile.description,
    'profile.primary_trait': narrative.semantic_profile.primary_trait_label,
    'profile.primary_intent': narrative.semantic_profile.primary_intent_label,
    'result.title': narrative.title,
    'result.subtitle': narrative.subtitle,
    'result.explanation': narrative.explanation,
    'result.cta_text': narrative.cta_text,
  };
}
