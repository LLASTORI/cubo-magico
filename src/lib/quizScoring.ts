/**
 * Quiz Scoring Engine - Funções utilitárias para cálculo e interpretação de scores
 * 
 * Este módulo pode ser usado tanto no frontend quanto para validação/preview
 * O cálculo oficial é feito na Edge Function quiz-public-complete
 */

export interface TraitScore {
  name: string;
  score: number;
  percentage: number;
}

export interface IntentScore {
  name: string;
  score: number;
  percentage: number;
}

export interface QuizProfile {
  primaryTrait: TraitScore | null;
  secondaryTrait: TraitScore | null;
  primaryIntent: IntentScore | null;
  traits: TraitScore[];
  intents: IntentScore[];
}

/**
 * Normaliza um vetor para que a soma seja 1
 */
export function normalizeVector(vector: Record<string, number>): Record<string, number> {
  const total = Object.values(vector).reduce((sum, val) => sum + Math.abs(val), 0);
  if (total === 0) return {};
  
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(vector)) {
    result[key] = Math.round((value / total) * 100) / 100;
  }
  return result;
}

/**
 * Aplica peso a um vetor
 */
export function applyWeight(
  vector: Record<string, number>,
  weight: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(vector)) {
    result[key] = value * weight;
  }
  return result;
}

/**
 * Agrega múltiplos vetores
 */
export function aggregateVectors(
  vectors: Array<Record<string, number>>
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const vector of vectors) {
    for (const [key, value] of Object.entries(vector)) {
      result[key] = (result[key] || 0) + value;
    }
  }
  return result;
}

/**
 * Extrai o perfil do quiz a partir de um normalized_score
 */
export function extractProfile(normalizedScore: {
  traits: Record<string, number>;
  intents: Record<string, number>;
}): QuizProfile {
  const traits = Object.entries(normalizedScore.traits || {})
    .map(([name, score]) => ({
      name,
      score,
      percentage: Math.round(score * 100),
    }))
    .sort((a, b) => b.score - a.score);

  const intents = Object.entries(normalizedScore.intents || {})
    .map(([name, score]) => ({
      name,
      score,
      percentage: Math.round(score * 100),
    }))
    .sort((a, b) => b.score - a.score);

  return {
    primaryTrait: traits[0] || null,
    secondaryTrait: traits[1] || null,
    primaryIntent: intents[0] || null,
    traits,
    intents,
  };
}

/**
 * Gera uma descrição textual do perfil
 */
export function generateProfileDescription(profile: QuizProfile): string {
  const parts: string[] = [];

  if (profile.primaryTrait) {
    parts.push(`Perfil ${formatTraitName(profile.primaryTrait.name)} (${profile.primaryTrait.percentage}%)`);
  }

  if (profile.primaryIntent) {
    parts.push(`Intenção de ${formatTraitName(profile.primaryIntent.name)} (${profile.primaryIntent.percentage}%)`);
  }

  if (parts.length === 0) {
    return 'Perfil não determinado';
  }

  return parts.join(' • ');
}

/**
 * Formata o nome de um trait/intent para exibição
 */
export function formatTraitName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Retorna a cor associada a um score (0-1)
 */
export function getScoreColor(score: number): string {
  if (score >= 0.7) return 'text-green-600 dark:text-green-400';
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-muted-foreground';
}

/**
 * Retorna a cor de background associada a um score (0-1)
 */
export function getScoreBgColor(score: number): string {
  if (score >= 0.7) return 'bg-green-100 dark:bg-green-900/20';
  if (score >= 0.4) return 'bg-yellow-100 dark:bg-yellow-900/20';
  return 'bg-muted';
}

/**
 * Calcula a compatibilidade entre dois perfis
 */
export function calculateProfileSimilarity(
  profile1: QuizProfile,
  profile2: QuizProfile
): number {
  if (!profile1.traits.length || !profile2.traits.length) return 0;

  let similarity = 0;
  let count = 0;

  // Comparar traits
  for (const trait1 of profile1.traits) {
    const trait2 = profile2.traits.find(t => t.name === trait1.name);
    if (trait2) {
      similarity += 1 - Math.abs(trait1.score - trait2.score);
      count++;
    }
  }

  // Comparar intents
  for (const intent1 of profile1.intents) {
    const intent2 = profile2.intents.find(i => i.name === intent1.name);
    if (intent2) {
      similarity += 1 - Math.abs(intent1.score - intent2.score);
      count++;
    }
  }

  return count > 0 ? Math.round((similarity / count) * 100) / 100 : 0;
}

/**
 * Agrupa resultados por trait dominante
 */
export function groupByDominantTrait(
  results: Array<{ normalized_score: { meta?: { dominant_trait?: string } } }>
): Record<string, number> {
  const groups: Record<string, number> = {};
  
  for (const result of results) {
    const trait = result.normalized_score?.meta?.dominant_trait;
    if (trait) {
      groups[trait] = (groups[trait] || 0) + 1;
    }
  }
  
  return groups;
}

/**
 * Agrupa resultados por intent dominante
 */
export function groupByDominantIntent(
  results: Array<{ normalized_score: { meta?: { dominant_intent?: string } } }>
): Record<string, number> {
  const groups: Record<string, number> = {};
  
  for (const result of results) {
    const intent = result.normalized_score?.meta?.dominant_intent;
    if (intent) {
      groups[intent] = (groups[intent] || 0) + 1;
    }
  }
  
  return groups;
}

/**
 * Calcula a média dos vetores de um conjunto de resultados
 */
export function calculateAverageVector(
  vectors: Array<Record<string, number>>
): Record<string, number> {
  if (vectors.length === 0) return {};
  
  const sum = aggregateVectors(vectors);
  const result: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(sum)) {
    result[key] = Math.round((value / vectors.length) * 100) / 100;
  }
  
  return result;
}
