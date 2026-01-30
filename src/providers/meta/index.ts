/**
 * Meta Paid Media Provider
 * 
 * Adapter that exposes Meta Ads data in the provider-agnostic
 * PaidMediaProvider interface format.
 * 
 * @see /docs/contracts/paid-media-provider-interface.md
 */

import { getMetrics } from "./getMetrics";
import { getHierarchy } from "./getHierarchy";
import { getDataHealth } from "./getDataHealth";
import type { PaidMediaProviderInterface } from "./types";

export const MetaPaidMediaProvider: PaidMediaProviderInterface = {
  provider: 'meta',
  getMetrics,
  getHierarchy,
  getDataHealth,
};

// Re-export types for external use
export * from "./types";
