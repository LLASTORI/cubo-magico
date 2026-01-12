// Semantic Profile Engine
// Translates raw vectors and scores into human-readable profiles and narratives

export interface VectorData {
  intent_vector?: Record<string, number>;
  trait_vector?: Record<string, number>;
  traits_vector?: Record<string, number>; // alias
}

export interface SemanticProfileInput {
  vectors: VectorData;
  entropy?: number;
  confidence?: number;
  normalized_score?: number;
}

export interface SemanticProfile {
  profile_name: string;
  description: string;
  buying_style: string;
  emotional_driver: string;
  risk_profile: string;
  copy_angle: string;
  primary_intent_label: string;
  primary_trait_label: string;
  compatibility_score: number;
  reasoning: string[];
}

// Human-readable labels for intent dimensions
const INTENT_LABELS: Record<string, { name: string; description: string; driver: string }> = {
  purchase: { 
    name: 'Compradora', 
    description: 'pronta para agir e investir em soluções', 
    driver: 'resultados tangíveis' 
  },
  curiosity: { 
    name: 'Exploradora', 
    description: 'em busca de conhecimento e descobertas', 
    driver: 'aprendizado e novidades' 
  },
  learn: { 
    name: 'Aprendiz', 
    description: 'focada em entender antes de decidir', 
    driver: 'educação e clareza' 
  },
  research: { 
    name: 'Pesquisadora', 
    description: 'analítica e detalhista nas decisões', 
    driver: 'informação completa' 
  },
  awareness: { 
    name: 'Consciente', 
    description: 'atenta às necessidades e soluções', 
    driver: 'autoconhecimento' 
  },
  trust: { 
    name: 'Conectora', 
    description: 'valoriza relacionamento e confiança', 
    driver: 'segurança e vínculo' 
  },
  urgency: { 
    name: 'Decidida', 
    description: 'com senso de urgência para mudanças', 
    driver: 'transformação rápida' 
  },
  buy: { 
    name: 'Investidora', 
    description: 'disposta a investir em si mesma', 
    driver: 'valor e retorno' 
  },
  compare: { 
    name: 'Avaliadora', 
    description: 'que pondera opções cuidadosamente', 
    driver: 'melhor escolha' 
  },
  explore: { 
    name: 'Descobridora', 
    description: 'aberta a novas possibilidades', 
    driver: 'oportunidades' 
  },
  solve: { 
    name: 'Solucionadora', 
    description: 'focada em resolver desafios', 
    driver: 'resultados práticos' 
  },
};

// Human-readable labels for trait dimensions
const TRAIT_LABELS: Record<string, { name: string; style: string; approach: string }> = {
  analytical: { 
    name: 'Analítica', 
    style: 'racional e baseada em dados', 
    approach: 'lógica e evidências' 
  },
  emotional: { 
    name: 'Emocional', 
    style: 'guiada por intuição e sentimentos', 
    approach: 'conexão e empatia' 
  },
  creative: { 
    name: 'Criativa', 
    style: 'inovadora e original', 
    approach: 'inspiração e possibilidades' 
  },
  practical: { 
    name: 'Prática', 
    style: 'objetiva e eficiente', 
    approach: 'ação direta' 
  },
  social: { 
    name: 'Social', 
    style: 'colaborativa e comunicativa', 
    approach: 'comunidade e validação' 
  },
  ambitious: { 
    name: 'Ambiciosa', 
    style: 'orientada a resultados', 
    approach: 'crescimento e conquistas' 
  },
  cautious: { 
    name: 'Cautelosa', 
    style: 'ponderada e segura', 
    approach: 'garantias e provas' 
  },
  spontaneous: { 
    name: 'Espontânea', 
    style: 'impulsiva e entusiasta', 
    approach: 'novidades e experiências' 
  },
  methodical: { 
    name: 'Metódica', 
    style: 'organizada e sistemática', 
    approach: 'processo e estrutura' 
  },
  dominance: { 
    name: 'Determinada', 
    style: 'assertiva e decisiva', 
    approach: 'controle e liderança' 
  },
  influence: { 
    name: 'Influenciadora', 
    style: 'persuasiva e carismática', 
    approach: 'inspiração e exemplo' 
  },
  stability: { 
    name: 'Estável', 
    style: 'consistente e confiável', 
    approach: 'equilíbrio e harmonia' 
  },
  conscientiousness: { 
    name: 'Conscienciosa', 
    style: 'detalhista e precisa', 
    approach: 'qualidade e excelência' 
  },
  racional: { 
    name: 'Racional', 
    style: 'lógica e objetiva', 
    approach: 'análise e razão' 
  },
  intuitivo: { 
    name: 'Intuitiva', 
    style: 'guiada pelo feeling', 
    approach: 'instinto e percepção' 
  },
  conservative: { 
    name: 'Conservadora', 
    style: 'tradicional e segura', 
    approach: 'estabilidade e tradição' 
  },
};

// Profile archetypes combining intent + trait
const PROFILE_ARCHETYPES: Array<{
  name: string;
  intents: string[];
  traits: string[];
  description: string;
  buying_style: string;
  emotional_driver: string;
  risk_profile: string;
  copy_angle: string;
}> = [
  {
    name: 'Exploradora Cautelosa',
    intents: ['curiosity', 'learn', 'research'],
    traits: ['cautious', 'analytical', 'methodical'],
    description: 'Você é uma pessoa que valoriza conhecimento profundo antes de tomar decisões.',
    buying_style: 'Pesquisa extensivamente e decide com segurança',
    emotional_driver: 'Segurança através do conhecimento',
    risk_profile: 'Baixo - precisa de muita informação',
    copy_angle: 'educacional_garantia'
  },
  {
    name: 'Compradora Emocional',
    intents: ['purchase', 'buy', 'urgency'],
    traits: ['emotional', 'spontaneous', 'social'],
    description: 'Você toma decisões guiada pelo coração e pela conexão.',
    buying_style: 'Decide rapidamente quando sente conexão',
    emotional_driver: 'Transformação e pertencimento',
    risk_profile: 'Alto - responde bem a urgência',
    copy_angle: 'emocional_escassez'
  },
  {
    name: 'Analítica de Resultados',
    intents: ['compare', 'research', 'solve'],
    traits: ['analytical', 'practical', 'methodical'],
    description: 'Você é orientada por dados e resultados mensuráveis.',
    buying_style: 'Compara opções e busca ROI claro',
    emotional_driver: 'Eficiência e resultados comprovados',
    risk_profile: 'Médio - precisa de provas',
    copy_angle: 'dados_comparacao'
  },
  {
    name: 'Buscadora de Segurança',
    intents: ['trust', 'awareness'],
    traits: ['cautious', 'stability', 'conservative'],
    description: 'Você valoriza confiança e relacionamentos duradouros.',
    buying_style: 'Constrói confiança antes de investir',
    emotional_driver: 'Segurança e suporte contínuo',
    risk_profile: 'Muito baixo - precisa de garantias',
    copy_angle: 'garantia_suporte'
  },
  {
    name: 'Impulsiva Estética',
    intents: ['purchase', 'explore', 'curiosity'],
    traits: ['creative', 'spontaneous', 'emotional'],
    description: 'Você é atraída por novidades e experiências únicas.',
    buying_style: 'Decide rápido por produtos únicos',
    emotional_driver: 'Exclusividade e experiência',
    risk_profile: 'Alto - responde a novidades',
    copy_angle: 'exclusividade_experiencia'
  },
  {
    name: 'Líder Determinada',
    intents: ['solve', 'urgency', 'purchase'],
    traits: ['dominance', 'ambitious', 'practical'],
    description: 'Você busca soluções eficazes e toma decisões assertivas.',
    buying_style: 'Decide rápido quando vê valor claro',
    emotional_driver: 'Resultados e liderança',
    risk_profile: 'Alto - orientada a ação',
    copy_angle: 'autoridade_resultados'
  },
  {
    name: 'Influenciadora Social',
    intents: ['explore', 'curiosity', 'trust'],
    traits: ['influence', 'social', 'creative'],
    description: 'Você valoriza comunidade e compartilhar descobertas.',
    buying_style: 'Influenciada por recomendações e comunidade',
    emotional_driver: 'Pertencimento e reconhecimento',
    risk_profile: 'Médio - precisa de validação social',
    copy_angle: 'comunidade_prova_social'
  },
  {
    name: 'Investidora Consciente',
    intents: ['buy', 'awareness', 'compare'],
    traits: ['conscientiousness', 'analytical', 'stability'],
    description: 'Você investe com consciência e visão de longo prazo.',
    buying_style: 'Analisa custo-benefício cuidadosamente',
    emotional_driver: 'Valor duradouro e qualidade',
    risk_profile: 'Baixo - precisa de justificativa',
    copy_angle: 'valor_qualidade'
  },
];

// Find the best matching archetype
function findBestArchetype(
  intentVector: Record<string, number>,
  traitVector: Record<string, number>
): { archetype: typeof PROFILE_ARCHETYPES[0]; score: number } | null {
  if (!intentVector || !traitVector) return null;

  let bestMatch: { archetype: typeof PROFILE_ARCHETYPES[0]; score: number } | null = null;

  for (const archetype of PROFILE_ARCHETYPES) {
    let score = 0;
    let matchCount = 0;

    // Score intent matches
    for (const intent of archetype.intents) {
      if (intentVector[intent]) {
        score += intentVector[intent] * 2; // Weight intents higher
        matchCount++;
      }
    }

    // Score trait matches
    for (const trait of archetype.traits) {
      if (traitVector[trait]) {
        score += traitVector[trait];
        matchCount++;
      }
    }

    // Normalize by match count
    const normalizedScore = matchCount > 0 ? score / (archetype.intents.length + archetype.traits.length) : 0;

    if (!bestMatch || normalizedScore > bestMatch.score) {
      bestMatch = { archetype, score: normalizedScore };
    }
  }

  return bestMatch;
}

// Get primary dimension from vector
function getPrimaryDimension(vector: Record<string, number>): { key: string; value: number } | null {
  const entries = Object.entries(vector).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? { key: entries[0][0], value: entries[0][1] } : null;
}

// Main interpretation function
export function interpretProfile(input: SemanticProfileInput): SemanticProfile {
  const { vectors, entropy = 0.5, confidence = 0.5 } = input;
  const reasoning: string[] = [];

  // Normalize vector names
  const intentVector = vectors.intent_vector || {};
  const traitVector = vectors.trait_vector || vectors.traits_vector || {};

  // Get primary dimensions
  const primaryIntent = getPrimaryDimension(intentVector);
  const primaryTrait = getPrimaryDimension(traitVector);

  // Get labels
  const intentLabel = primaryIntent 
    ? INTENT_LABELS[primaryIntent.key]?.name || capitalize(primaryIntent.key)
    : 'Exploradora';
  
  const traitLabel = primaryTrait 
    ? TRAIT_LABELS[primaryTrait.key]?.name || capitalize(primaryTrait.key)
    : 'Equilibrada';

  // Try to find matching archetype
  const archetypeMatch = findBestArchetype(intentVector, traitVector);

  if (archetypeMatch && archetypeMatch.score > 0.3) {
    const { archetype, score } = archetypeMatch;
    reasoning.push(`Arquétipo identificado: ${archetype.name} (compatibilidade: ${Math.round(score * 100)}%)`);

    return {
      profile_name: archetype.name,
      description: archetype.description,
      buying_style: archetype.buying_style,
      emotional_driver: archetype.emotional_driver,
      risk_profile: archetype.risk_profile,
      copy_angle: archetype.copy_angle,
      primary_intent_label: intentLabel,
      primary_trait_label: traitLabel,
      compatibility_score: score,
      reasoning
    };
  }

  // Generate dynamic profile if no archetype matches
  reasoning.push('Perfil gerado dinamicamente baseado nos vetores');

  const intentInfo = primaryIntent && INTENT_LABELS[primaryIntent.key];
  const traitInfo = primaryTrait && TRAIT_LABELS[primaryTrait.key];

  const dynamicName = `${intentLabel} ${traitLabel}`;
  const dynamicDescription = `Você é uma pessoa ${traitInfo?.style || 'equilibrada'}, ${intentInfo?.description || 'em busca de evolução'}.`;
  const dynamicBuyingStyle = `Decisões ${traitInfo?.style || 'equilibradas'} focadas em ${intentInfo?.driver || 'valor'}`;
  const dynamicDriver = intentInfo?.driver || 'crescimento pessoal';
  
  // Calculate risk based on entropy and confidence
  let riskProfile = 'Médio';
  if (entropy < 0.3 && confidence > 0.7) {
    riskProfile = 'Alto - perfil definido e consistente';
  } else if (entropy > 0.7 || confidence < 0.3) {
    riskProfile = 'Baixo - perfil em formação';
  }

  return {
    profile_name: dynamicName,
    description: dynamicDescription,
    buying_style: dynamicBuyingStyle,
    emotional_driver: dynamicDriver,
    risk_profile: riskProfile,
    copy_angle: `${traitInfo?.approach || 'valor'}_${intentInfo?.driver?.replace(/\s/g, '_') || 'geral'}`,
    primary_intent_label: intentLabel,
    primary_trait_label: traitLabel,
    compatibility_score: 0.5,
    reasoning
  };
}

// Generate human-readable summary text
export function generateProfileSummary(profile: SemanticProfile): string {
  return `${profile.description} Seu estilo de decisão é ${profile.buying_style.toLowerCase()}, motivada por ${profile.emotional_driver.toLowerCase()}.`;
}

// Get semantic label for a vector key
export function getSemanticLabel(key: string, type: 'intent' | 'trait'): string {
  if (type === 'intent') {
    return INTENT_LABELS[key]?.name || capitalize(key);
  }
  return TRAIT_LABELS[key]?.name || capitalize(key);
}

// Get all labels for a vector
export function getSemanticLabels(
  vector: Record<string, number>,
  type: 'intent' | 'trait',
  maxItems: number = 3
): Array<{ key: string; label: string; value: number }> {
  return Object.entries(vector)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([key, value]) => ({
      key,
      label: getSemanticLabel(key, type),
      value
    }));
}

// Helper
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Export labels for external use
export { INTENT_LABELS, TRAIT_LABELS, PROFILE_ARCHETYPES };
