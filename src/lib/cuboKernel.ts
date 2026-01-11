/**
 * Cubo Kernel - The Unified Contract Layer
 * 
 * This is the conceptual core of Cubo OS.
 * It defines the unified interfaces that all system components must implement.
 * Every entity in the system follows these contracts.
 */

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

/**
 * Base interface for all identifiable entities in Cubo
 */
export interface CuboEntity {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Contact - The central entity around which everything revolves
 */
export interface Contact extends CuboEntity {
  email: string;
  name?: string;
  phone?: string;
  status: ContactStatus;
  source: string;
  tags?: string[];
  totalRevenue?: number;
  totalPurchases?: number;
  lastActivityAt: string;
}

export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned' | 'recovered';

/**
 * Memory - Extracted and stored knowledge about a contact
 */
export interface Memory extends CuboEntity {
  contactId: string;
  memoryType: MemoryType;
  content: MemoryContent;
  source: MemorySource;
  sourceId?: string;
  sourceName?: string;
  confidence: number;
  isLocked: boolean;
  isContradicted: boolean;
  contradictedBy?: string;
  reinforcementCount: number;
  lastReinforcedAt: string;
}

export type MemoryType = 
  | 'pain_point'
  | 'goal'
  | 'objection'
  | 'preference'
  | 'behavior_pattern'
  | 'interest'
  | 'demographic'
  | 'sentiment';

export type MemorySource = 
  | 'quiz'
  | 'survey'
  | 'whatsapp'
  | 'social'
  | 'transaction'
  | 'manual'
  | 'inference';

export interface MemoryContent {
  summary: string;
  details?: string;
  evidence?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * CognitiveProfile - The computed understanding of a contact
 */
export interface CognitiveProfile extends CuboEntity {
  contactId: string;
  traitVector: TraitVector;
  intentVector: IntentVector;
  confidenceScore: number;
  entropyScore: number;
  volatilityScore: number;
  totalSignals: number;
  signalSources: SignalSources;
  lastUpdatedAt: string;
}

export interface TraitVector {
  analytical: number;
  emotional: number;
  impulsive: number;
  methodical: number;
  social: number;
  autonomous: number;
  risk_taker: number;
  conservative: number;
}

export interface IntentVector {
  purchase: number;
  learn: number;
  compare: number;
  support: number;
  churn: number;
  upgrade: number;
  refer: number;
}

export interface SignalSources {
  quiz: number;
  survey: number;
  whatsapp: number;
  social: number;
  transaction: number;
}

/**
 * Prediction - What we believe will happen
 */
export interface Prediction extends CuboEntity {
  contactId: string;
  predictionType: PredictionType;
  confidence: number;
  riskLevel: RiskLevel;
  urgencyScore: number;
  explanation: PredictionExplanation;
  recommendedActions: RecommendedAction[];
  isActive: boolean;
  expiresAt?: string;
}

export type PredictionType = 
  | 'conversion'
  | 'churn'
  | 'upsell'
  | 'engagement'
  | 'recovery'
  | 'ltv';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PredictionExplanation {
  summary: string;
  factors: ExplanationFactor[];
  confidenceBreakdown: Record<string, number>;
}

export interface ExplanationFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

/**
 * Recommendation - What we suggest doing
 */
export interface RecommendedAction {
  actionType: ActionType;
  priority: number;
  title: string;
  description: string;
  config: ActionConfig;
}

export type ActionType = 
  | 'send_message'
  | 'trigger_automation'
  | 'schedule_call'
  | 'add_tag'
  | 'move_stage'
  | 'create_task'
  | 'offer_discount'
  | 'send_content'
  | 'wait'
  | 'escalate';

export interface ActionConfig {
  channel?: string;
  templateId?: string;
  automationId?: string;
  delay?: number;
  condition?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent - Autonomous decision-making entity
 */
export interface Agent extends CuboEntity {
  name: string;
  description?: string;
  objective: AgentObjective;
  triggerOn: TriggerConfig[];
  allowedActions: ActionType[];
  boundaries: AgentBoundaries;
  confidenceThreshold: number;
  maxActionsPerDay?: number;
  requireHumanApproval: boolean;
  isActive: boolean;
  createdBy?: string;
}

export type AgentObjective = 
  | 'maximize_conversion'
  | 'prevent_churn'
  | 'increase_engagement'
  | 'optimize_ltv'
  | 'accelerate_recovery'
  | 'personalize_experience';

export interface TriggerConfig {
  type: TriggerType;
  config: Record<string, unknown>;
}

export type TriggerType = 
  | 'prediction_threshold'
  | 'event_occurred'
  | 'time_based'
  | 'stage_change'
  | 'memory_added'
  | 'profile_change';

export interface AgentBoundaries {
  maxConfidenceRequired: number;
  minConfidenceRequired: number;
  excludeTags?: string[];
  includeTags?: string[];
  excludeStages?: string[];
  contactFilters?: Record<string, unknown>;
}

/**
 * Funnel - The path a contact travels
 */
export interface Funnel extends CuboEntity {
  name: string;
  description?: string;
  type: FunnelType;
  stages: FunnelStage[];
  isActive: boolean;
  metaCampaignIds?: string[];
}

export type FunnelType = 'perpetuo' | 'lancamento' | 'webinar' | 'custom';

export interface FunnelStage {
  id: string;
  name: string;
  order: number;
  type: StageType;
  config?: Record<string, unknown>;
}

export type StageType = 
  | 'awareness'
  | 'interest'
  | 'consideration'
  | 'intent'
  | 'purchase'
  | 'retention'
  | 'advocacy';

/**
 * Event - Something that happened in the system
 */
export interface SystemEvent extends CuboEntity {
  contactId?: string;
  eventType: EventType;
  eventName: string;
  eventSource: EventSource;
  sourceId?: string;
  payload: Record<string, unknown>;
  contextSnapshot: Record<string, unknown>;
  status: EventStatus;
  processedAt?: string;
  processedBy?: string;
  triggeredEvents?: string[];
  parentEventId?: string;
  priority: number;
}

export type EventType = 
  | 'contact_created'
  | 'contact_updated'
  | 'transaction_completed'
  | 'message_received'
  | 'quiz_completed'
  | 'survey_completed'
  | 'stage_changed'
  | 'prediction_generated'
  | 'agent_decision'
  | 'memory_extracted'
  | 'profile_updated'
  | 'funnel_entered'
  | 'funnel_progressed'
  | 'automation_triggered';

export type EventSource = 'agent' | 'funnel' | 'prediction' | 'user' | 'system' | 'webhook';

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Personalization - How we customize the experience
 */
export interface PersonalizationDirective extends CuboEntity {
  contactId: string;
  channel: PersonalizationChannel;
  depth: PersonalizationDepth;
  tone: ToneStyle;
  urgency: UrgencyLevel;
  ctaStyle: CtaStyle;
  contentBlocks: ContentBlock[];
  avoidTopics: string[];
  emphasizeTopics: string[];
  tokenValues: TokenValues;
}

export type PersonalizationChannel = 'whatsapp' | 'email' | 'sms' | 'web' | 'push';

export type PersonalizationDepth = 'light' | 'moderate' | 'deep';

export type ToneStyle = 
  | 'professional'
  | 'friendly'
  | 'urgent'
  | 'empathetic'
  | 'casual'
  | 'authoritative';

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high';

export type CtaStyle = 'soft' | 'direct' | 'urgent' | 'none';

export type ContentBlock = 
  | 'social_proof'
  | 'scarcity'
  | 'authority'
  | 'reciprocity'
  | 'commitment'
  | 'liking'
  | 'education'
  | 'faq';

export interface TokenValues {
  first_name?: string;
  product_name?: string;
  offer_name?: string;
  pain_point?: string;
  goal?: string;
  benefit?: string;
  deadline?: string;
  discount?: string;
  custom?: Record<string, string>;
}

/**
 * Outcome - The result of an action or prediction
 */
export interface Outcome extends CuboEntity {
  sourceType: OutcomeSourceType;
  sourceId: string;
  contactId: string;
  outcomeType: OutcomeType;
  success: boolean;
  value?: number;
  metadata: Record<string, unknown>;
  measuredAt: string;
}

export type OutcomeSourceType = 'agent' | 'prediction' | 'automation' | 'experiment';

export type OutcomeType = 
  | 'conversion'
  | 'churn_prevented'
  | 'upsell_completed'
  | 'engagement_increased'
  | 'no_change'
  | 'negative_impact';

// ============================================================================
// UNIFIED CONTEXT
// ============================================================================

/**
 * CuboContext - The unified context object that every engine receives
 * This is the single source of truth for any decision-making process
 */
export interface CuboContext {
  // Core entities
  contact: Contact;
  profile: CognitiveProfile | null;
  memories: Memory[];
  predictions: Prediction[];
  
  // Active systems
  activeAgents: Agent[];
  personalizationContext: PersonalizationDirective | null;
  
  // Journey state
  currentFunnelPath: FunnelPathState | null;
  
  // Recent activity
  systemEvents: SystemEvent[];
  
  // Project configuration
  projectSettings: ProjectSettings;
  
  // Temporal context
  temporalContext: TemporalContext;
}

export interface FunnelPathState {
  funnelId: string;
  funnelName: string;
  currentStage: FunnelStage;
  enteredAt: string;
  stageHistory: StageHistoryEntry[];
  pathSignature: string;
}

export interface StageHistoryEntry {
  stageId: string;
  stageName: string;
  enteredAt: string;
  exitedAt?: string;
  duration?: number;
}

export interface ProjectSettings {
  projectId: string;
  projectName: string;
  timezone: string;
  enabledModules: string[];
  agentDefaults: AgentDefaults;
  personalizationDefaults: PersonalizationDefaults;
}

export interface AgentDefaults {
  requireApproval: boolean;
  defaultConfidenceThreshold: number;
  maxDailyActions: number;
}

export interface PersonalizationDefaults {
  defaultTone: ToneStyle;
  defaultDepth: PersonalizationDepth;
  defaultChannel: PersonalizationChannel;
}

/**
 * TemporalContext - Past, Present, Future awareness
 */
export interface TemporalContext {
  // Past state - What happened
  pastState: PastState;
  
  // Present context - What is happening now
  presentState: PresentState;
  
  // Future hypotheses - What we predict will happen
  futureHypotheses: FutureHypothesis[];
}

export interface PastState {
  lastInteraction?: string;
  lastPurchase?: string;
  previousStages: string[];
  historicalPatterns: HistoricalPattern[];
  lifetimeValue: number;
  totalInteractions: number;
}

export interface HistoricalPattern {
  pattern: string;
  frequency: number;
  lastOccurred: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PresentState {
  currentStage: string;
  activeAutomations: string[];
  pendingTasks: number;
  recentEvents: SystemEvent[];
  currentPredictions: Prediction[];
}

export interface FutureHypothesis {
  hypothesis: string;
  probability: number;
  timeframe: string;
  basedOn: string[];
  potentialOutcomes: PotentialOutcome[];
}

export interface PotentialOutcome {
  outcome: string;
  probability: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendedAction?: string;
}

// ============================================================================
// EXPLAINABILITY
// ============================================================================

/**
 * ExplainabilityLog - Every decision must be explainable
 */
export interface ExplainabilityLog extends CuboEntity {
  contactId?: string;
  source: ExplainabilitySource;
  sourceId?: string;
  sourceName?: string;
  decisionType: string;
  decision: string;
  reasoning: string;
  confidence: number;
  inputSnapshot: Record<string, unknown>;
  pastState: Record<string, unknown>;
  presentContext: Record<string, unknown>;
  futureHypotheses: Record<string, unknown>;
  outcome?: string;
  outcomeData?: Record<string, unknown>;
  outcomeRecordedAt?: string;
  humanOverride: boolean;
  overrideBy?: string;
  overrideReason?: string;
  overrideAt?: string;
}

export type ExplainabilitySource = 
  | 'agent'
  | 'engine'
  | 'optimization'
  | 'prediction'
  | 'personalization'
  | 'funnel';

// ============================================================================
// SYSTEM LEARNING
// ============================================================================

/**
 * SystemLearning - What the system has learned
 */
export interface SystemLearning extends CuboEntity {
  learningType: LearningType;
  category: LearningCategory;
  title: string;
  description: string;
  evidence: LearningEvidence[];
  confidence: number;
  impactScore: number;
  affectedContactsCount: number;
  status: LearningStatus;
  validatedAt?: string;
  appliedAt?: string;
}

export type LearningType = 'pattern' | 'correlation' | 'optimization' | 'insight';

export type LearningCategory = 
  | 'conversion'
  | 'churn'
  | 'engagement'
  | 'personalization'
  | 'funnel'
  | 'agent';

export type LearningStatus = 'discovered' | 'validated' | 'applied' | 'deprecated';

export interface LearningEvidence {
  type: string;
  description: string;
  dataPoints: number;
  confidence: number;
  sourceIds: string[];
}

// ============================================================================
// KERNEL UTILITIES
// ============================================================================

/**
 * Check if an entity is valid according to Cubo contracts
 */
export function isValidCuboEntity(entity: unknown): entity is CuboEntity {
  if (!entity || typeof entity !== 'object') return false;
  const e = entity as Record<string, unknown>;
  return typeof e.id === 'string' && 
         typeof e.projectId === 'string' && 
         typeof e.createdAt === 'string';
}

/**
 * Get the entity type from a Cubo entity
 */
export function getCuboEntityType(entity: CuboEntity): string {
  if ('memoryType' in entity) return 'memory';
  if ('predictionType' in entity) return 'prediction';
  if ('objective' in entity) return 'agent';
  if ('eventType' in entity) return 'event';
  if ('traitVector' in entity) return 'profile';
  if ('stages' in entity) return 'funnel';
  if ('email' in entity) return 'contact';
  if ('learningType' in entity) return 'learning';
  if ('source' in entity && 'decision' in entity) return 'explainability';
  return 'unknown';
}

/**
 * Create an empty context for a contact
 */
export function createEmptyContext(
  contact: Contact,
  projectSettings: ProjectSettings
): CuboContext {
  return {
    contact,
    profile: null,
    memories: [],
    predictions: [],
    activeAgents: [],
    personalizationContext: null,
    currentFunnelPath: null,
    systemEvents: [],
    projectSettings,
    temporalContext: {
      pastState: {
        previousStages: [],
        historicalPatterns: [],
        lifetimeValue: contact.totalRevenue || 0,
        totalInteractions: 0,
      },
      presentState: {
        currentStage: 'unknown',
        activeAutomations: [],
        pendingTasks: 0,
        recentEvents: [],
        currentPredictions: [],
      },
      futureHypotheses: [],
    },
  };
}

/**
 * Merge partial context updates
 */
export function mergeContext(
  base: CuboContext,
  updates: Partial<CuboContext>
): CuboContext {
  return {
    ...base,
    ...updates,
    temporalContext: {
      ...base.temporalContext,
      ...(updates.temporalContext || {}),
    },
  };
}
