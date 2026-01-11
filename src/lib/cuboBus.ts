/**
 * Cubo Bus - The Internal Nervous System
 * 
 * This is the event routing and decision propagation layer.
 * It handles:
 * - Event routing
 * - Decision propagation
 * - Agent wake-ups
 * - Recommendation triggers
 * - Funnel updates
 * - Personalization updates
 */

import type {
  CuboContext,
  SystemEvent,
  EventType,
  EventSource,
  EventStatus,
  Agent,
  Prediction,
  Memory,
  ExplainabilityLog,
  ExplainabilitySource,
} from './cuboKernel';

// ============================================================================
// BUS EVENT TYPES
// ============================================================================

export type BusEventType = 
  | 'event.created'
  | 'event.processed'
  | 'agent.triggered'
  | 'agent.decision'
  | 'prediction.generated'
  | 'prediction.expired'
  | 'memory.extracted'
  | 'memory.reinforced'
  | 'memory.contradicted'
  | 'funnel.entered'
  | 'funnel.progressed'
  | 'funnel.exited'
  | 'personalization.updated'
  | 'learning.discovered'
  | 'learning.applied';

export interface BusEvent<T = unknown> {
  id: string;
  type: BusEventType;
  timestamp: string;
  projectId: string;
  contactId?: string;
  payload: T;
  metadata: BusEventMetadata;
}

export interface BusEventMetadata {
  source: string;
  sourceId?: string;
  priority: number;
  correlationId?: string;
  parentEventId?: string;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

export type EventHandler<T = unknown> = (event: BusEvent<T>) => Promise<void>;

interface HandlerRegistration {
  id: string;
  type: BusEventType | '*';
  handler: EventHandler;
  priority: number;
}

// ============================================================================
// CUBO BUS CLASS
// ============================================================================

class CuboBusImpl {
  private handlers: Map<string, HandlerRegistration[]> = new Map();
  private eventQueue: BusEvent[] = [];
  private isProcessing = false;
  private eventHistory: BusEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Register an event handler
   */
  subscribe<T = unknown>(
    type: BusEventType | '*',
    handler: EventHandler<T>,
    priority = 5
  ): () => void {
    const id = this.generateId();
    const registration: HandlerRegistration = {
      id,
      type,
      handler: handler as EventHandler,
      priority,
    };

    const key = type === '*' ? '*' : type;
    const existing = this.handlers.get(key) || [];
    existing.push(registration);
    existing.sort((a, b) => a.priority - b.priority);
    this.handlers.set(key, existing);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(key);
      if (handlers) {
        const index = handlers.findIndex((h) => h.id === id);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Publish an event to the bus
   */
  async publish<T = unknown>(
    type: BusEventType,
    payload: T,
    metadata: Partial<BusEventMetadata> & { projectId: string; contactId?: string }
  ): Promise<string> {
    const event: BusEvent<T> = {
      id: this.generateId(),
      type,
      timestamp: new Date().toISOString(),
      projectId: metadata.projectId,
      contactId: metadata.contactId,
      payload,
      metadata: {
        source: metadata.source || 'system',
        sourceId: metadata.sourceId,
        priority: metadata.priority || 5,
        correlationId: metadata.correlationId || this.generateId(),
        parentEventId: metadata.parentEventId,
      },
    };

    this.eventQueue.push(event as BusEvent);
    this.addToHistory(event as BusEvent);

    if (!this.isProcessing) {
      await this.processQueue();
    }

    return event.id;
  }

  /**
   * Process the event queue
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      // Sort by priority
      this.eventQueue.sort((a, b) => a.metadata.priority - b.metadata.priority);

      const event = this.eventQueue.shift();
      if (!event) continue;

      await this.dispatchEvent(event);
    }

    this.isProcessing = false;
  }

  /**
   * Dispatch an event to all registered handlers
   */
  private async dispatchEvent(event: BusEvent): Promise<void> {
    const specificHandlers = this.handlers.get(event.type) || [];
    const wildcardHandlers = this.handlers.get('*') || [];

    const allHandlers = [...specificHandlers, ...wildcardHandlers];
    allHandlers.sort((a, b) => a.priority - b.priority);

    for (const registration of allHandlers) {
      try {
        await registration.handler(event);
      } catch (error) {
        console.error(`[CuboBus] Handler error for ${event.type}:`, error);
      }
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: BusEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get recent events from history
   */
  getRecentEvents(count = 100, filter?: { type?: BusEventType; projectId?: string; contactId?: string }): BusEvent[] {
    let events = [...this.eventHistory];

    if (filter?.type) {
      events = events.filter((e) => e.type === filter.type);
    }
    if (filter?.projectId) {
      events = events.filter((e) => e.projectId === filter.projectId);
    }
    if (filter?.contactId) {
      events = events.filter((e) => e.contactId === filter.contactId);
    }

    return events.slice(-count);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Clear all handlers (for testing)
   */
  clear(): void {
    this.handlers.clear();
    this.eventQueue = [];
    this.eventHistory = [];
  }
}

// Singleton instance
export const CuboBus = new CuboBusImpl();

// ============================================================================
// BUS UTILITIES
// ============================================================================

/**
 * Create a system event from a bus event
 */
export function busEventToSystemEvent(
  busEvent: BusEvent,
  eventType: EventType,
  eventName: string,
  eventSource: EventSource
): Omit<SystemEvent, 'id' | 'createdAt'> {
  return {
    projectId: busEvent.projectId,
    contactId: busEvent.contactId,
    eventType,
    eventName,
    eventSource,
    sourceId: busEvent.metadata.sourceId,
    payload: busEvent.payload as Record<string, unknown>,
    contextSnapshot: {},
    status: 'pending' as EventStatus,
    priority: busEvent.metadata.priority,
    parentEventId: busEvent.metadata.parentEventId,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create an explainability log entry
 */
export function createExplainabilityLog(
  projectId: string,
  source: ExplainabilitySource,
  decision: {
    type: string;
    decision: string;
    reasoning: string;
    confidence: number;
  },
  context: Partial<CuboContext>,
  options?: {
    contactId?: string;
    sourceId?: string;
    sourceName?: string;
  }
): Omit<ExplainabilityLog, 'id' | 'createdAt'> {
  return {
    projectId,
    contactId: options?.contactId,
    source,
    sourceId: options?.sourceId,
    sourceName: options?.sourceName,
    decisionType: decision.type,
    decision: decision.decision,
    reasoning: decision.reasoning,
    confidence: decision.confidence,
    inputSnapshot: context.contact ? { contact: context.contact } : {},
    pastState: (context.temporalContext?.pastState || {}) as Record<string, unknown>,
    presentContext: (context.temporalContext?.presentState || {}) as Record<string, unknown>,
    futureHypotheses: (context.temporalContext?.futureHypotheses || []) as unknown as Record<string, unknown>,
    humanOverride: false,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// SPECIALIZED PUBLISHERS
// ============================================================================

/**
 * Publish an agent decision event
 */
export async function publishAgentDecision(
  projectId: string,
  agent: Agent,
  decision: {
    decisionType: string;
    action: string;
    confidence: number;
    reasoning: string;
  },
  contactId?: string
): Promise<string> {
  return CuboBus.publish(
    'agent.decision',
    {
      agentId: agent.id,
      agentName: agent.name,
      objective: agent.objective,
      ...decision,
    },
    {
      projectId,
      contactId,
      source: 'agent',
      sourceId: agent.id,
      priority: 3,
    }
  );
}

/**
 * Publish a prediction generated event
 */
export async function publishPredictionGenerated(
  projectId: string,
  prediction: Prediction,
  contactId: string
): Promise<string> {
  return CuboBus.publish(
    'prediction.generated',
    {
      predictionId: prediction.id,
      predictionType: prediction.predictionType,
      confidence: prediction.confidence,
      riskLevel: prediction.riskLevel,
      urgencyScore: prediction.urgencyScore,
    },
    {
      projectId,
      contactId,
      source: 'prediction',
      sourceId: prediction.id,
      priority: 4,
    }
  );
}

/**
 * Publish a memory extracted event
 */
export async function publishMemoryExtracted(
  projectId: string,
  memory: Memory,
  contactId: string
): Promise<string> {
  return CuboBus.publish(
    'memory.extracted',
    {
      memoryId: memory.id,
      memoryType: memory.memoryType,
      source: memory.source,
      confidence: memory.confidence,
      summary: memory.content.summary,
    },
    {
      projectId,
      contactId,
      source: 'memory',
      sourceId: memory.id,
      priority: 5,
    }
  );
}

/**
 * Publish a funnel progression event
 */
export async function publishFunnelProgression(
  projectId: string,
  funnelId: string,
  fromStage: string,
  toStage: string,
  contactId: string
): Promise<string> {
  return CuboBus.publish(
    'funnel.progressed',
    {
      funnelId,
      fromStage,
      toStage,
    },
    {
      projectId,
      contactId,
      source: 'funnel',
      sourceId: funnelId,
      priority: 4,
    }
  );
}

/**
 * Publish a learning discovered event
 */
export async function publishLearningDiscovered(
  projectId: string,
  learning: {
    id: string;
    type: string;
    category: string;
    title: string;
    confidence: number;
  }
): Promise<string> {
  return CuboBus.publish(
    'learning.discovered',
    learning,
    {
      projectId,
      source: 'optimization',
      sourceId: learning.id,
      priority: 6,
    }
  );
}

// ============================================================================
// AGENT WAKE-UP SYSTEM
// ============================================================================

interface AgentWakeUpConfig {
  agent: Agent;
  context: CuboContext;
  onDecision: (decision: unknown) => Promise<void>;
}

const agentWakeUpQueue: Map<string, AgentWakeUpConfig[]> = new Map();

/**
 * Queue an agent for wake-up
 */
export function queueAgentWakeUp(
  projectId: string,
  config: AgentWakeUpConfig
): void {
  const existing = agentWakeUpQueue.get(projectId) || [];
  existing.push(config);
  agentWakeUpQueue.set(projectId, existing);
}

/**
 * Process agent wake-ups for a project
 */
export async function processAgentWakeUps(projectId: string): Promise<void> {
  const configs = agentWakeUpQueue.get(projectId) || [];
  agentWakeUpQueue.delete(projectId);

  for (const config of configs) {
    try {
      // This would call the agent evaluation engine
      console.log(`[CuboBus] Processing wake-up for agent: ${config.agent.name}`);
      // The actual evaluation would be done by the agent engine
    } catch (error) {
      console.error(`[CuboBus] Agent wake-up error:`, error);
    }
  }
}

// ============================================================================
// BUS STATISTICS
// ============================================================================

export interface BusStatistics {
  totalEventsPublished: number;
  eventsInQueue: number;
  handlersRegistered: number;
  recentEventsByType: Record<string, number>;
}

export function getBusStatistics(): BusStatistics {
  const recentEvents = CuboBus.getRecentEvents(100);
  const eventsByType: Record<string, number> = {};

  for (const event of recentEvents) {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
  }

  return {
    totalEventsPublished: recentEvents.length,
    eventsInQueue: 0, // Queue is processed immediately
    handlersRegistered: 0, // Would need to expose this from the class
    recentEventsByType: eventsByType,
  };
}
