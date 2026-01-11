/**
 * Profile Merge Engine
 * 
 * Implements weighted merge strategies for evolving cognitive profiles.
 * Supports multiple signal sources: quiz, survey, social, purchase, etc.
 */

export interface VectorData {
  intent_vector: Record<string, number>;
  trait_vector: Record<string, number>;
}

export interface ProfileSignal extends VectorData {
  source: 'quiz' | 'survey' | 'social' | 'purchase' | 'manual' | 'webhook' | 'import';
  source_id?: string;
  source_name?: string;
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CognitiveProfile extends VectorData {
  confidence_score: number;
  volatility_score: number;
  entropy_score: number;
  total_signals: number;
  signal_sources: string[];
  last_updated_at: Date;
}

export interface MergeResult {
  profile: CognitiveProfile;
  delta_intent_vector: Record<string, number>;
  delta_trait_vector: Record<string, number>;
  confidence_delta: number;
  entropy_delta: number;
}

export interface MergeConfig {
  // Weight multiplier for recency (0-1, higher = more recent bias)
  recencyWeight: number;
  // Weight multiplier for confidence (0-1)
  confidenceWeight: number;
  // Decay factor for old signals (0-1)
  decayFactor: number;
  // Max age in days for full weight
  maxAgeFullWeight: number;
}

const DEFAULT_MERGE_CONFIG: MergeConfig = {
  recencyWeight: 0.3,
  confidenceWeight: 0.4,
  decayFactor: 0.95,
  maxAgeFullWeight: 30,
};

/**
 * Calculate recency weight based on signal age
 */
function calculateRecencyWeight(signalDate: Date, config: MergeConfig): number {
  const now = new Date();
  const ageInDays = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (ageInDays <= config.maxAgeFullWeight) {
    return 1.0;
  }
  
  // Exponential decay after max age
  const excessDays = ageInDays - config.maxAgeFullWeight;
  return Math.pow(config.decayFactor, excessDays / 30);
}

/**
 * Calculate the effective weight of a signal
 */
function calculateSignalWeight(signal: ProfileSignal, config: MergeConfig): number {
  const recencyWeight = calculateRecencyWeight(signal.timestamp, config);
  const confidenceWeight = signal.confidence;
  
  // Combine weights with config multipliers
  return (
    (recencyWeight * config.recencyWeight) +
    (confidenceWeight * config.confidenceWeight) +
    (1 - config.recencyWeight - config.confidenceWeight)
  );
}

/**
 * Merge two vectors with weighted averaging
 */
export function mergeVectors(
  existing: Record<string, number>,
  incoming: Record<string, number>,
  incomingWeight: number
): Record<string, number> {
  const result: Record<string, number> = { ...existing };
  const existingWeight = 1 - incomingWeight;
  
  // Get all unique keys
  const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  
  for (const key of allKeys) {
    const existingValue = existing[key] || 0;
    const incomingValue = incoming[key] || 0;
    
    result[key] = (existingValue * existingWeight) + (incomingValue * incomingWeight);
  }
  
  return result;
}

/**
 * Normalize a vector so values sum to 1
 */
export function normalizeVector(vector: Record<string, number>): Record<string, number> {
  const total = Object.values(vector).reduce((sum, val) => sum + Math.abs(val), 0);
  if (total === 0) return {};
  
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(vector)) {
    result[key] = Math.round((value / total) * 10000) / 10000;
  }
  return result;
}

/**
 * Calculate delta between two vectors
 */
export function calculateVectorDelta(
  before: Record<string, number>,
  after: Record<string, number>
): Record<string, number> {
  const delta: Record<string, number> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    const beforeVal = before[key] || 0;
    const afterVal = after[key] || 0;
    const diff = afterVal - beforeVal;
    
    if (Math.abs(diff) > 0.0001) {
      delta[key] = Math.round(diff * 10000) / 10000;
    }
  }
  
  return delta;
}

/**
 * Calculate entropy (measure of uncertainty/randomness in distribution)
 * Lower entropy = more confident/focused profile
 */
export function calculateEntropy(vector: Record<string, number>): number {
  const values = Object.values(vector).filter(v => v > 0);
  if (values.length === 0) return 0;
  
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total === 0) return 0;
  
  // Normalize and calculate Shannon entropy
  let entropy = 0;
  for (const value of values) {
    const p = value / total;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  // Normalize to 0-1 range (max entropy = log2(n))
  const maxEntropy = Math.log2(values.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/**
 * Calculate volatility (how much the profile changes between updates)
 */
export function calculateVolatility(
  currentProfile: VectorData,
  newSignal: VectorData,
  signalWeight: number
): number {
  // Calculate magnitude of changes
  const intentDelta = calculateVectorDelta(currentProfile.intent_vector, newSignal.intent_vector);
  const traitDelta = calculateVectorDelta(currentProfile.trait_vector, newSignal.trait_vector);
  
  const intentChange = Object.values(intentDelta).reduce((sum, v) => sum + Math.abs(v), 0);
  const traitChange = Object.values(traitDelta).reduce((sum, v) => sum + Math.abs(v), 0);
  
  // Volatility is the weighted average change magnitude
  return ((intentChange + traitChange) / 2) * signalWeight;
}

/**
 * Calculate overall confidence score based on:
 * - Number of signals
 * - Consistency of signals
 * - Recency of signals
 */
export function calculateConfidence(
  totalSignals: number,
  entropy: number,
  avgRecencyWeight: number
): number {
  // More signals = higher base confidence (asymptotic to 1)
  const signalConfidence = 1 - Math.exp(-totalSignals / 5);
  
  // Lower entropy = higher confidence
  const entropyConfidence = 1 - entropy;
  
  // Combine factors
  const confidence = (
    signalConfidence * 0.4 +
    entropyConfidence * 0.4 +
    avgRecencyWeight * 0.2
  );
  
  return Math.round(confidence * 10000) / 10000;
}

/**
 * Create an empty cognitive profile
 */
export function createEmptyProfile(): CognitiveProfile {
  return {
    intent_vector: {},
    trait_vector: {},
    confidence_score: 0,
    volatility_score: 0,
    entropy_score: 1,
    total_signals: 0,
    signal_sources: [],
    last_updated_at: new Date(),
  };
}

/**
 * Main merge function - evolves a profile with a new signal
 * This is the core algorithm: it NEVER overwrites, only evolves
 */
export function mergeSignalIntoProfile(
  currentProfile: CognitiveProfile | null,
  signal: ProfileSignal,
  config: MergeConfig = DEFAULT_MERGE_CONFIG
): MergeResult {
  const profile = currentProfile || createEmptyProfile();
  
  // Calculate signal weight
  const signalWeight = calculateSignalWeight(signal, config);
  
  // Adjust weight based on existing profile strength
  // New profiles get higher signal weight
  const adjustedWeight = profile.total_signals === 0 
    ? 1.0 
    : Math.min(signalWeight / (1 + profile.total_signals * 0.1), 0.5);
  
  // Merge vectors
  const newIntentVector = mergeVectors(
    profile.intent_vector,
    signal.intent_vector,
    adjustedWeight
  );
  const newTraitVector = mergeVectors(
    profile.trait_vector,
    signal.trait_vector,
    adjustedWeight
  );
  
  // Normalize vectors
  const normalizedIntent = normalizeVector(newIntentVector);
  const normalizedTrait = normalizeVector(newTraitVector);
  
  // Calculate deltas
  const deltaIntent = calculateVectorDelta(profile.intent_vector, normalizedIntent);
  const deltaTrait = calculateVectorDelta(profile.trait_vector, normalizedTrait);
  
  // Calculate new metrics
  const intentEntropy = calculateEntropy(normalizedIntent);
  const traitEntropy = calculateEntropy(normalizedTrait);
  const newEntropy = (intentEntropy + traitEntropy) / 2;
  
  const newVolatility = calculateVolatility(
    { intent_vector: profile.intent_vector, trait_vector: profile.trait_vector },
    { intent_vector: normalizedIntent, trait_vector: normalizedTrait },
    adjustedWeight
  );
  
  // Blend volatility with existing (moving average)
  const blendedVolatility = profile.total_signals === 0
    ? newVolatility
    : (profile.volatility_score * 0.7 + newVolatility * 0.3);
  
  // Update signal sources
  const signalSources = [...new Set([...profile.signal_sources, signal.source])];
  
  // Calculate new confidence
  const newConfidence = calculateConfidence(
    profile.total_signals + 1,
    newEntropy,
    calculateRecencyWeight(signal.timestamp, config)
  );
  
  const newProfile: CognitiveProfile = {
    intent_vector: normalizedIntent,
    trait_vector: normalizedTrait,
    confidence_score: newConfidence,
    volatility_score: Math.round(blendedVolatility * 10000) / 10000,
    entropy_score: Math.round(newEntropy * 10000) / 10000,
    total_signals: profile.total_signals + 1,
    signal_sources: signalSources,
    last_updated_at: new Date(),
  };
  
  return {
    profile: newProfile,
    delta_intent_vector: deltaIntent,
    delta_trait_vector: deltaTrait,
    confidence_delta: Math.round((newConfidence - profile.confidence_score) * 10000) / 10000,
    entropy_delta: Math.round((newEntropy - profile.entropy_score) * 10000) / 10000,
  };
}

/**
 * Quick helper to extract vectors from quiz result
 */
export function quizResultToSignal(
  normalizedScore: { traits?: Record<string, number>; intents?: Record<string, number> },
  quizId: string,
  quizName: string
): ProfileSignal {
  return {
    source: 'quiz',
    source_id: quizId,
    source_name: quizName,
    intent_vector: normalizedScore.intents || {},
    trait_vector: normalizedScore.traits || {},
    confidence: 0.8, // Quizzes have high confidence
    timestamp: new Date(),
    metadata: { type: 'quiz_completion' },
  };
}

/**
 * Quick helper to extract vectors from survey response
 */
export function surveyResultToSignal(
  intentScore: number,
  surveyId: string,
  surveyName: string,
  metadata?: Record<string, any>
): ProfileSignal {
  return {
    source: 'survey',
    source_id: surveyId,
    source_name: surveyName,
    intent_vector: { survey_interest: intentScore },
    trait_vector: {},
    confidence: 0.6, // Surveys have moderate confidence
    timestamp: new Date(),
    metadata,
  };
}

/**
 * Quick helper to extract vectors from social listening signal
 */
export function socialSignalToSignal(
  intentScore: number,
  sentiment: 'positive' | 'neutral' | 'negative',
  category: string,
  postId: string
): ProfileSignal {
  const sentimentScore = sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? 0.2 : 0.5;
  
  return {
    source: 'social',
    source_id: postId,
    intent_vector: { 
      commercial_interest: intentScore,
      engagement: sentimentScore 
    },
    trait_vector: { 
      [category]: 1.0 
    },
    confidence: 0.4, // Social signals have lower confidence
    timestamp: new Date(),
  };
}

/**
 * Quick helper to extract vectors from purchase behavior
 */
export function purchaseToSignal(
  productCategory: string,
  orderValue: number,
  isRepeat: boolean,
  transactionId: string
): ProfileSignal {
  // Normalize order value to 0-1 range (assuming max ~1000)
  const normalizedValue = Math.min(orderValue / 1000, 1);
  
  return {
    source: 'purchase',
    source_id: transactionId,
    intent_vector: { 
      purchase_intent: 1.0,
      high_value: normalizedValue 
    },
    trait_vector: { 
      [productCategory]: 1.0,
      repeat_buyer: isRepeat ? 1.0 : 0,
    },
    confidence: 1.0, // Purchases have highest confidence
    timestamp: new Date(),
  };
}

/**
 * Get primary trait/intent from vectors
 */
export function getPrimaryFromVector(vector: Record<string, number>): { name: string; value: number } | null {
  const entries = Object.entries(vector);
  if (entries.length === 0) return null;
  
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  return { name: sorted[0][0], value: sorted[0][1] };
}

/**
 * Format trait/intent name for display
 */
export function formatVectorKeyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
