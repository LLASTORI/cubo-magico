// Audience Mode Engine
// Controls what data is visible based on who is viewing

export type AudienceMode = 'lead' | 'operator' | 'system';

export interface AudienceModeConfig {
  showVectors: boolean;
  showPercentages: boolean;
  showTechnicalLabels: boolean;
  showSemanticProfile: boolean;
  showNarrative: boolean;
  showDecisionStyle: boolean;
  showMotivation: boolean;
  showCTA: boolean;
  showConfidence: boolean;
  showEntropy: boolean;
  showVolatility: boolean;
  showSignals: boolean;
  showRecommendations: boolean;
  showAdvancedSection: boolean;
}

// Configuration per audience mode
const AUDIENCE_CONFIGS: Record<AudienceMode, AudienceModeConfig> = {
  // Lead (Public Quiz)
  // Never show: Vectors, Percentages, Technical labels like Learn, Purchase, Conservative
  // Only show: Semantic profile, Narrative, Decision style, Motivation, CTA
  lead: {
    showVectors: false,
    showPercentages: false,
    showTechnicalLabels: false,
    showSemanticProfile: true,
    showNarrative: true,
    showDecisionStyle: true,
    showMotivation: true,
    showCTA: true,
    showConfidence: false,
    showEntropy: false,
    showVolatility: false,
    showSignals: false,
    showRecommendations: false,
    showAdvancedSection: false,
  },

  // Operator (CRM)
  // Show: Semantic profile, Drivers, Style, Readiness, Recommendations
  // Move to collapsed tab: Advanced Cognitive Data (Vectors, Scores, Entropy)
  operator: {
    showVectors: false, // In collapsed section
    showPercentages: false, // In collapsed section
    showTechnicalLabels: false, // In collapsed section
    showSemanticProfile: true,
    showNarrative: true,
    showDecisionStyle: true,
    showMotivation: true,
    showCTA: false,
    showConfidence: true,
    showEntropy: false, // In collapsed section
    showVolatility: false, // In collapsed section
    showSignals: true,
    showRecommendations: true,
    showAdvancedSection: true, // Can expand to see vectors/percentages
  },

  // System (Admin/AI)
  // Show everything
  system: {
    showVectors: true,
    showPercentages: true,
    showTechnicalLabels: true,
    showSemanticProfile: true,
    showNarrative: true,
    showDecisionStyle: true,
    showMotivation: true,
    showCTA: true,
    showConfidence: true,
    showEntropy: true,
    showVolatility: true,
    showSignals: true,
    showRecommendations: true,
    showAdvancedSection: true,
  },
};

// Get configuration for an audience mode
export function getAudienceConfig(mode: AudienceMode): AudienceModeConfig {
  return AUDIENCE_CONFIGS[mode];
}

// Check if a specific feature should be shown
export function shouldShow(mode: AudienceMode, feature: keyof AudienceModeConfig): boolean {
  return AUDIENCE_CONFIGS[mode][feature];
}

// Determine audience mode based on context
export function detectAudienceMode(context: {
  isPublicQuiz?: boolean;
  isCRM?: boolean;
  isAdmin?: boolean;
}): AudienceMode {
  if (context.isAdmin) return 'system';
  if (context.isPublicQuiz) return 'lead';
  if (context.isCRM) return 'operator';
  return 'operator'; // Default to operator for logged-in users
}

// Format data based on audience mode
export function formatForAudience<T>(
  data: T,
  mode: AudienceMode,
  formatters: {
    lead?: (data: T) => Partial<T>;
    operator?: (data: T) => Partial<T>;
    system?: (data: T) => T;
  }
): Partial<T> | T {
  const formatter = formatters[mode];
  if (formatter) {
    return formatter(data);
  }
  return data;
}

// Technical labels that should never be shown to leads
export const TECHNICAL_LABELS = [
  'Learn',
  'Purchase',
  'Conservative',
  'Dominance',
  'Influence',
  'Stability',
  'Conscientiousness',
  'Analytical',
  'Emotional',
  'Racional',
  'Intuitivo',
  'curiosity',
  'research',
  'awareness',
  'trust',
  'urgency',
  'buy',
  'compare',
  'explore',
  'solve',
];

// Check if a label is technical
export function isTechnicalLabel(label: string): boolean {
  return TECHNICAL_LABELS.some(
    tech => label.toLowerCase().includes(tech.toLowerCase())
  );
}

// Sanitize output for lead mode (removes any technical content)
export function sanitizeForLead(text: string): string {
  let sanitized = text;
  
  // Remove percentages like "45%"
  sanitized = sanitized.replace(/\d+(\.\d+)?%/g, '');
  
  // Remove technical labels
  TECHNICAL_LABELS.forEach(label => {
    const regex = new RegExp(label, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Clean up extra spaces and punctuation
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  sanitized = sanitized.replace(/,\s*,/g, ',');
  sanitized = sanitized.replace(/\s+,/g, ',');
  
  return sanitized;
}
