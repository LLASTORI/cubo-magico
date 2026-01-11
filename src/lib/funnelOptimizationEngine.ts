// Funnel Optimization Engine
// Detects underperforming paths, compares similar paths, suggests adjustments

import { Json } from '@/integrations/supabase/types';

// ============================================
// Types
// ============================================

export interface PathSignature {
  type: 'quiz_outcome' | 'automation_chain' | 'agent_decision' | 'campaign_flow' | 'custom';
  source_id?: string;
  source_name?: string;
  steps: PathStep[];
  traits?: string[];
  intents?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PathStep {
  order: number;
  type: string;
  id?: string;
  name?: string;
  config?: Record<string, unknown>;
}

export interface FunnelPerformance {
  id: string;
  project_id: string;
  funnel_id?: string;
  path_signature: PathSignature;
  path_type: string;
  path_name?: string;
  conversion_rate: number;
  avg_time_to_convert?: string;
  churn_rate: number;
  revenue_per_user: number;
  confidence: number;
  sample_size: number;
  total_entries: number;
  total_conversions: number;
  total_churns: number;
  performance_score: number;
  trend: 'improving' | 'declining' | 'stable';
  last_updated_at: string;
  created_at: string;
}

export interface OptimizationSuggestion {
  id?: string;
  project_id: string;
  funnel_performance_id?: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  impact_estimate: number;
  confidence: number;
  evidence: SuggestionEvidence;
  recommended_action: RecommendedAction;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'rolled_back';
}

export type SuggestionType = 
  | 'cta_optimization'
  | 'timing_adjustment'
  | 'content_personalization'
  | 'path_simplification'
  | 'segment_targeting'
  | 'urgency_modulation'
  | 'social_proof_addition'
  | 'friction_removal'
  | 'offer_positioning';

export interface SuggestionEvidence {
  compared_paths?: string[];
  sample_sizes?: number[];
  conversion_diff?: number;
  statistical_significance?: number;
  supporting_data?: Record<string, unknown>;
}

export interface RecommendedAction {
  action_type: string;
  target: string;
  current_value?: unknown;
  suggested_value?: unknown;
  implementation_steps?: string[];
}

export interface PathComparison {
  path_a: FunnelPerformance;
  path_b: FunnelPerformance;
  similarity_score: number;
  performance_diff: number;
  key_differences: PathDifference[];
}

export interface PathDifference {
  aspect: string;
  path_a_value: unknown;
  path_b_value: unknown;
  impact_estimate: number;
}

export interface OptimizationConfig {
  min_sample_size: number;
  confidence_threshold: number;
  max_suggestions_per_path: number;
  enable_auto_experiments: boolean;
  human_approval_required: boolean;
}

export interface SimulationResult {
  original_metrics: PathMetrics;
  simulated_metrics: PathMetrics;
  improvement_estimate: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high';
}

export interface PathMetrics {
  conversion_rate: number;
  churn_rate: number;
  revenue_per_user: number;
  time_to_convert: number;
}

// ============================================
// Path Signature Generation
// ============================================

export function generatePathSignature(
  type: PathSignature['type'],
  steps: PathStep[],
  context?: {
    source_id?: string;
    source_name?: string;
    traits?: string[];
    intents?: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
  }
): PathSignature {
  return {
    type,
    source_id: context?.source_id,
    source_name: context?.source_name,
    steps: steps.map((step, index) => ({
      ...step,
      order: index + 1
    })),
    traits: context?.traits,
    intents: context?.intents,
    tags: context?.tags,
    metadata: context?.metadata
  };
}

export function generateQuizOutcomeSignature(
  quizId: string,
  quizName: string,
  outcomeId: string,
  outcomeName: string,
  actions: { type: string; config?: Record<string, unknown> }[]
): PathSignature {
  const steps: PathStep[] = [
    { order: 1, type: 'quiz_complete', id: quizId, name: quizName },
    { order: 2, type: 'outcome_triggered', id: outcomeId, name: outcomeName },
    ...actions.map((action, index) => ({
      order: index + 3,
      type: `action_${action.type}`,
      config: action.config
    }))
  ];

  return generatePathSignature('quiz_outcome', steps, {
    source_id: quizId,
    source_name: quizName
  });
}

export function generateAutomationChainSignature(
  flowId: string,
  flowName: string,
  nodes: { id: string; type: string; config?: Record<string, unknown> }[]
): PathSignature {
  const steps: PathStep[] = nodes.map((node, index) => ({
    order: index + 1,
    type: node.type,
    id: node.id,
    config: node.config
  }));

  return generatePathSignature('automation_chain', steps, {
    source_id: flowId,
    source_name: flowName
  });
}

export function signatureToHash(signature: PathSignature): string {
  const normalized = {
    type: signature.type,
    steps: signature.steps.map(s => ({ type: s.type, order: s.order }))
  };
  return btoa(JSON.stringify(normalized)).slice(0, 32);
}

// ============================================
// Performance Analysis
// ============================================

export function calculatePerformanceScore(metrics: {
  conversion_rate: number;
  churn_rate: number;
  revenue_per_user: number;
  sample_size: number;
}): number {
  const { conversion_rate, churn_rate, revenue_per_user, sample_size } = metrics;
  
  // Weighted score calculation
  const conversionWeight = 0.4;
  const churnWeight = 0.2;
  const revenueWeight = 0.3;
  const confidenceWeight = 0.1;
  
  // Normalize values (0-100)
  const conversionScore = Math.min(conversion_rate * 100, 100) * conversionWeight;
  const churnScore = Math.max(0, (1 - churn_rate) * 100) * churnWeight;
  const revenueScore = Math.min(revenue_per_user / 10, 100) * revenueWeight; // Assuming $1000 is max
  const confidenceScore = Math.min(sample_size / 1000, 1) * 100 * confidenceWeight;
  
  return Math.round(conversionScore + churnScore + revenueScore + confidenceScore);
}

export function detectTrend(
  currentMetrics: PathMetrics,
  previousMetrics: PathMetrics
): 'improving' | 'declining' | 'stable' {
  const improvementThreshold = 0.05; // 5% change
  
  const conversionChange = (currentMetrics.conversion_rate - previousMetrics.conversion_rate) / 
    (previousMetrics.conversion_rate || 0.01);
  
  if (conversionChange > improvementThreshold) return 'improving';
  if (conversionChange < -improvementThreshold) return 'declining';
  return 'stable';
}

export function calculateConfidence(
  sample_size: number,
  conversion_rate: number
): number {
  // Wilson score interval approximation
  const z = 1.96; // 95% confidence
  const n = sample_size;
  const p = conversion_rate;
  
  if (n === 0) return 0;
  
  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const spread = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  
  const lower = (center - spread) / denominator;
  const upper = (center + spread) / denominator;
  
  // Confidence based on interval width
  const intervalWidth = upper - lower;
  const confidence = Math.max(0, 1 - intervalWidth);
  
  return Math.round(confidence * 10000) / 10000;
}

// ============================================
// Path Comparison
// ============================================

export function comparePaths(
  pathA: FunnelPerformance,
  pathB: FunnelPerformance
): PathComparison {
  const similarity = calculatePathSimilarity(pathA.path_signature, pathB.path_signature);
  const performanceDiff = pathA.performance_score - pathB.performance_score;
  
  const differences: PathDifference[] = [];
  
  // Compare conversion rates
  if (Math.abs(pathA.conversion_rate - pathB.conversion_rate) > 0.01) {
    differences.push({
      aspect: 'conversion_rate',
      path_a_value: pathA.conversion_rate,
      path_b_value: pathB.conversion_rate,
      impact_estimate: (pathA.conversion_rate - pathB.conversion_rate) * 100
    });
  }
  
  // Compare churn rates
  if (Math.abs(pathA.churn_rate - pathB.churn_rate) > 0.01) {
    differences.push({
      aspect: 'churn_rate',
      path_a_value: pathA.churn_rate,
      path_b_value: pathB.churn_rate,
      impact_estimate: (pathB.churn_rate - pathA.churn_rate) * 100 // Lower churn is better
    });
  }
  
  // Compare revenue
  if (Math.abs(pathA.revenue_per_user - pathB.revenue_per_user) > 1) {
    differences.push({
      aspect: 'revenue_per_user',
      path_a_value: pathA.revenue_per_user,
      path_b_value: pathB.revenue_per_user,
      impact_estimate: pathA.revenue_per_user - pathB.revenue_per_user
    });
  }
  
  // Compare step differences
  const stepDiffs = findStepDifferences(pathA.path_signature, pathB.path_signature);
  differences.push(...stepDiffs);
  
  return {
    path_a: pathA,
    path_b: pathB,
    similarity_score: similarity,
    performance_diff: performanceDiff,
    key_differences: differences
  };
}

function calculatePathSimilarity(
  sigA: PathSignature,
  sigB: PathSignature
): number {
  if (sigA.type !== sigB.type) return 0;
  
  const stepsA = sigA.steps;
  const stepsB = sigB.steps;
  
  // Calculate step type overlap
  const typesA = new Set(stepsA.map(s => s.type));
  const typesB = new Set(stepsB.map(s => s.type));
  const intersection = new Set([...typesA].filter(x => typesB.has(x)));
  const union = new Set([...typesA, ...typesB]);
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Length similarity
  const lengthSimilarity = 1 - Math.abs(stepsA.length - stepsB.length) / 
    Math.max(stepsA.length, stepsB.length, 1);
  
  return (jaccardSimilarity * 0.7 + lengthSimilarity * 0.3);
}

function findStepDifferences(
  sigA: PathSignature,
  sigB: PathSignature
): PathDifference[] {
  const differences: PathDifference[] = [];
  const maxSteps = Math.max(sigA.steps.length, sigB.steps.length);
  
  for (let i = 0; i < maxSteps; i++) {
    const stepA = sigA.steps[i];
    const stepB = sigB.steps[i];
    
    if (!stepA || !stepB) {
      differences.push({
        aspect: `step_${i + 1}`,
        path_a_value: stepA?.type || 'missing',
        path_b_value: stepB?.type || 'missing',
        impact_estimate: 0
      });
    } else if (stepA.type !== stepB.type) {
      differences.push({
        aspect: `step_${i + 1}_type`,
        path_a_value: stepA.type,
        path_b_value: stepB.type,
        impact_estimate: 0
      });
    }
  }
  
  return differences;
}

// ============================================
// Optimization Suggestions
// ============================================

export function generateOptimizationSuggestions(
  performance: FunnelPerformance,
  comparisons: PathComparison[],
  config: OptimizationConfig
): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  // Skip if insufficient sample size
  if (performance.sample_size < config.min_sample_size) {
    return [];
  }
  
  // Check for low conversion rate
  if (performance.conversion_rate < 0.02) {
    suggestions.push(createLowConversionSuggestion(performance, comparisons));
  }
  
  // Check for high churn
  if (performance.churn_rate > 0.3) {
    suggestions.push(createHighChurnSuggestion(performance));
  }
  
  // Check for underperformance vs similar paths
  const betterPaths = comparisons.filter(c => 
    c.similarity_score > 0.7 && 
    c.performance_diff < -10 &&
    c.path_b.confidence > config.confidence_threshold
  );
  
  for (const comparison of betterPaths.slice(0, 2)) {
    suggestions.push(createComparisonSuggestion(performance, comparison));
  }
  
  // Check for path simplification opportunities
  if (performance.path_signature.steps.length > 5) {
    suggestions.push(createSimplificationSuggestion(performance));
  }
  
  return suggestions.slice(0, config.max_suggestions_per_path);
}

function createLowConversionSuggestion(
  performance: FunnelPerformance,
  comparisons: PathComparison[]
): OptimizationSuggestion {
  const betterPath = comparisons.find(c => 
    c.similarity_score > 0.5 && c.path_b.conversion_rate > performance.conversion_rate * 1.5
  );
  
  return {
    project_id: performance.project_id,
    funnel_performance_id: performance.id,
    suggestion_type: 'cta_optimization',
    title: 'Conversion rate significantly below average',
    description: `This path has a ${(performance.conversion_rate * 100).toFixed(1)}% conversion rate. ` +
      (betterPath 
        ? `Similar paths achieve ${(betterPath.path_b.conversion_rate * 100).toFixed(1)}%.`
        : 'Consider testing alternative CTAs or offer positioning.'),
    impact_estimate: betterPath 
      ? (betterPath.path_b.conversion_rate - performance.conversion_rate) * 100
      : 5,
    confidence: performance.confidence,
    evidence: {
      compared_paths: betterPath ? [betterPath.path_b.id] : [],
      conversion_diff: betterPath 
        ? betterPath.path_b.conversion_rate - performance.conversion_rate 
        : 0,
      sample_sizes: [performance.sample_size, betterPath?.path_b.sample_size || 0]
    },
    recommended_action: {
      action_type: 'modify_cta',
      target: 'cta_style',
      current_value: 'aggressive',
      suggested_value: 'soft',
      implementation_steps: [
        'Review current CTA copy and urgency level',
        'Test softer, benefit-focused language',
        'Monitor conversion rate for 7 days'
      ]
    },
    status: 'pending'
  };
}

function createHighChurnSuggestion(
  performance: FunnelPerformance
): OptimizationSuggestion {
  return {
    project_id: performance.project_id,
    funnel_performance_id: performance.id,
    suggestion_type: 'friction_removal',
    title: 'High churn rate detected',
    description: `${(performance.churn_rate * 100).toFixed(1)}% of users abandon this path. ` +
      'Consider reducing friction points or adding engagement elements.',
    impact_estimate: performance.churn_rate * 50,
    confidence: performance.confidence,
    evidence: {
      sample_sizes: [performance.sample_size],
      supporting_data: {
        churn_rate: performance.churn_rate,
        step_count: performance.path_signature.steps.length
      }
    },
    recommended_action: {
      action_type: 'reduce_friction',
      target: 'path_steps',
      implementation_steps: [
        'Identify drop-off points in the path',
        'Simplify or remove unnecessary steps',
        'Add progress indicators',
        'Test micro-commitments before main CTA'
      ]
    },
    status: 'pending'
  };
}

function createComparisonSuggestion(
  performance: FunnelPerformance,
  comparison: PathComparison
): OptimizationSuggestion {
  const keyDiff = comparison.key_differences[0];
  
  return {
    project_id: performance.project_id,
    funnel_performance_id: performance.id,
    suggestion_type: 'content_personalization',
    title: `Similar path performs ${Math.abs(comparison.performance_diff).toFixed(0)}% better`,
    description: `A path with ${(comparison.similarity_score * 100).toFixed(0)}% similarity ` +
      `achieves better results. Key difference: ${keyDiff?.aspect || 'approach'}.`,
    impact_estimate: Math.abs(comparison.performance_diff),
    confidence: Math.min(performance.confidence, comparison.path_b.confidence),
    evidence: {
      compared_paths: [comparison.path_b.id],
      conversion_diff: comparison.path_b.conversion_rate - performance.conversion_rate,
      statistical_significance: comparison.path_b.confidence,
      sample_sizes: [performance.sample_size, comparison.path_b.sample_size]
    },
    recommended_action: {
      action_type: 'adopt_pattern',
      target: keyDiff?.aspect || 'approach',
      current_value: keyDiff?.path_a_value,
      suggested_value: keyDiff?.path_b_value,
      implementation_steps: [
        `Review the better-performing path: ${comparison.path_b.path_name}`,
        `Identify key differences in ${keyDiff?.aspect}`,
        'Create a variant implementing the successful pattern',
        'Run A/B test to validate improvement'
      ]
    },
    status: 'pending'
  };
}

function createSimplificationSuggestion(
  performance: FunnelPerformance
): OptimizationSuggestion {
  return {
    project_id: performance.project_id,
    funnel_performance_id: performance.id,
    suggestion_type: 'path_simplification',
    title: 'Path may be too complex',
    description: `This path has ${performance.path_signature.steps.length} steps. ` +
      'Simpler paths often perform better.',
    impact_estimate: 10,
    confidence: 0.6,
    evidence: {
      supporting_data: {
        step_count: performance.path_signature.steps.length,
        optimal_range: '3-5 steps'
      }
    },
    recommended_action: {
      action_type: 'simplify_path',
      target: 'step_count',
      current_value: performance.path_signature.steps.length,
      suggested_value: 4,
      implementation_steps: [
        'Identify which steps can be combined',
        'Remove steps with low completion rates',
        'Test simplified version with subset of traffic'
      ]
    },
    status: 'pending'
  };
}

// ============================================
// Simulation
// ============================================

export function simulatePathChange(
  currentMetrics: PathMetrics,
  proposedChange: RecommendedAction,
  historicalData?: { similar_changes: { change: RecommendedAction; outcome: PathMetrics }[] }
): SimulationResult {
  // Base simulation - estimate based on action type
  const impactMultipliers: Record<string, number> = {
    modify_cta: 0.15,
    reduce_friction: 0.20,
    adopt_pattern: 0.25,
    simplify_path: 0.10,
    add_social_proof: 0.12,
    timing_adjustment: 0.08
  };
  
  const baseImpact = impactMultipliers[proposedChange.action_type] || 0.10;
  
  // If we have historical data, use it to refine estimate
  let refinedImpact = baseImpact;
  if (historicalData?.similar_changes.length) {
    const avgImprovement = historicalData.similar_changes.reduce((sum, change) => {
      return sum + (change.outcome.conversion_rate - currentMetrics.conversion_rate);
    }, 0) / historicalData.similar_changes.length;
    
    refinedImpact = avgImprovement > 0 ? avgImprovement : baseImpact;
  }
  
  const simulatedMetrics: PathMetrics = {
    conversion_rate: Math.min(1, currentMetrics.conversion_rate * (1 + refinedImpact)),
    churn_rate: Math.max(0, currentMetrics.churn_rate * (1 - refinedImpact * 0.5)),
    revenue_per_user: currentMetrics.revenue_per_user * (1 + refinedImpact * 0.3),
    time_to_convert: currentMetrics.time_to_convert * (1 - refinedImpact * 0.2)
  };
  
  const improvement = (simulatedMetrics.conversion_rate - currentMetrics.conversion_rate) / 
    (currentMetrics.conversion_rate || 0.01) * 100;
  
  return {
    original_metrics: currentMetrics,
    simulated_metrics: simulatedMetrics,
    improvement_estimate: Math.round(improvement * 10) / 10,
    confidence: historicalData?.similar_changes.length ? 0.75 : 0.5,
    risk_level: refinedImpact > 0.2 ? 'low' : refinedImpact > 0.1 ? 'medium' : 'high'
  };
}

// ============================================
// Exports for UI
// ============================================

export const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  cta_optimization: 'CTA Optimization',
  timing_adjustment: 'Timing Adjustment',
  content_personalization: 'Content Personalization',
  path_simplification: 'Path Simplification',
  segment_targeting: 'Segment Targeting',
  urgency_modulation: 'Urgency Modulation',
  social_proof_addition: 'Social Proof',
  friction_removal: 'Friction Removal',
  offer_positioning: 'Offer Positioning'
};

export const TREND_LABELS: Record<string, { label: string; color: string }> = {
  improving: { label: 'Improving', color: 'text-green-500' },
  declining: { label: 'Declining', color: 'text-red-500' },
  stable: { label: 'Stable', color: 'text-muted-foreground' }
};

export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  min_sample_size: 100,
  confidence_threshold: 0.8,
  max_suggestions_per_path: 3,
  enable_auto_experiments: false,
  human_approval_required: true
};
