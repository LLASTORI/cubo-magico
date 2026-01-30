/**
 * Paid Media Domain
 * 
 * Provider-agnostic domain for paid media metrics and hierarchy.
 * Aggregates data from all registered providers (Meta, Google, TikTok).
 * 
 * @see /docs/contracts/paid-media-domain.md
 * 
 * Usage:
 * ```typescript
 * import { PaidMediaDomain } from "@/domains/paid-media";
 * 
 * // Get metrics from all providers
 * const metrics = await PaidMediaDomain.getAggregatedMetrics(projectId, dateRange);
 * 
 * // Get hierarchy from all providers
 * const hierarchy = await PaidMediaDomain.getAggregatedHierarchy(projectId);
 * 
 * // Check data health
 * const health = await PaidMediaDomain.getAggregatedDataHealth(projectId, dateRange);
 * ```
 */

// Registry
export {
  getRegisteredProviders,
  getProvider,
  getProviderNames,
  registerProvider,
  hasProvider,
} from "./registry";

// Metrics
export {
  getMetricsByProvider,
  getAggregatedMetrics,
  getMetricsFromProvider,
} from "./getMetrics";

// Hierarchy
export {
  getHierarchyByProvider,
  getAggregatedHierarchy,
  getHierarchyFromProvider,
} from "./getHierarchy";

// Data Health
export {
  getDataHealthByProvider,
  getAggregatedDataHealth,
  getDataHealthFromProvider,
} from "./getDataHealth";

// Types
export type {
  PaidMediaDailyMetrics,
  PaidMediaHierarchy,
  PaidMediaDataHealth,
  DateRange,
  DomainMetricsResult,
  DomainHierarchyResult,
  DomainDataHealthResult,
  AggregatedDailyMetrics,
} from "./types";

// Convenience namespace export
import * as registry from "./registry";
import * as metrics from "./getMetrics";
import * as hierarchy from "./getHierarchy";
import * as dataHealth from "./getDataHealth";

export const PaidMediaDomain = {
  // Registry
  getRegisteredProviders: registry.getRegisteredProviders,
  getProvider: registry.getProvider,
  getProviderNames: registry.getProviderNames,
  registerProvider: registry.registerProvider,
  hasProvider: registry.hasProvider,
  
  // Metrics
  getMetricsByProvider: metrics.getMetricsByProvider,
  getAggregatedMetrics: metrics.getAggregatedMetrics,
  getMetricsFromProvider: metrics.getMetricsFromProvider,
  
  // Hierarchy
  getHierarchyByProvider: hierarchy.getHierarchyByProvider,
  getAggregatedHierarchy: hierarchy.getAggregatedHierarchy,
  getHierarchyFromProvider: hierarchy.getHierarchyFromProvider,
  
  // Data Health
  getDataHealthByProvider: dataHealth.getDataHealthByProvider,
  getAggregatedDataHealth: dataHealth.getAggregatedDataHealth,
  getDataHealthFromProvider: dataHealth.getDataHealthFromProvider,
};
