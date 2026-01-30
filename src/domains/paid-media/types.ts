/**
 * Paid Media Domain Types
 * 
 * Provider-agnostic types for the Paid Media domain.
 * These types are consumed by analysis modules (Funnels, Dashboards).
 * 
 * @see /docs/contracts/paid-media-domain.md
 */

import type {
  PaidMediaDailyMetrics,
  PaidMediaHierarchy,
  PaidMediaDataHealth,
  DateRange,
} from "@/providers/meta/types";

// Re-export provider types as domain types
export type { PaidMediaDailyMetrics, PaidMediaHierarchy, PaidMediaDataHealth, DateRange };

// Domain-specific aggregated types
export interface DomainMetricsResult {
  provider: string;
  metrics: PaidMediaDailyMetrics[];
}

export interface DomainHierarchyResult {
  provider: string;
  hierarchy: PaidMediaHierarchy;
}

export interface DomainDataHealthResult {
  provider: string;
  health: PaidMediaDataHealth;
}

// Aggregated metrics by date (merged from all providers)
export interface AggregatedDailyMetrics {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  by_provider: Record<string, PaidMediaDailyMetrics>;
}
