/**
 * Paid Media Domain - Metrics Aggregator
 * 
 * Aggregates metrics from all registered providers.
 * Does NOT calculate derived metrics (CTR, CPC, CPM) - that is consumer responsibility.
 * 
 * @see /docs/contracts/paid-media-domain.md
 */

import { getRegisteredProviders } from "./registry";
import type { 
  DateRange, 
  PaidMediaDailyMetrics,
  DomainMetricsResult,
  AggregatedDailyMetrics,
} from "./types";

/**
 * Fetch metrics from all providers, returned separately by provider
 */
export async function getMetricsByProvider(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<DomainMetricsResult[]> {
  const providers = getRegisteredProviders();
  
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const metrics = await provider.getMetrics(projectId, dateRange, accountIds);
        return {
          provider: provider.provider,
          metrics,
        };
      } catch (error) {
        console.error(`[PaidMediaDomain.getMetrics] Error from ${provider.provider}:`, error);
        return {
          provider: provider.provider,
          metrics: [],
        };
      }
    })
  );

  return results;
}

/**
 * Fetch metrics from all providers, aggregated by date
 * 
 * Returns a single timeline with metrics summed across all providers,
 * plus a breakdown by provider for each date.
 */
export async function getAggregatedMetrics(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<AggregatedDailyMetrics[]> {
  const providerResults = await getMetricsByProvider(projectId, dateRange, accountIds);
  
  // Aggregate by date
  const dateMap = new Map<string, AggregatedDailyMetrics>();

  for (const result of providerResults) {
    for (const metric of result.metrics) {
      const existing = dateMap.get(metric.date);

      if (existing) {
        existing.spend += metric.spend;
        existing.impressions += metric.impressions;
        existing.clicks += metric.clicks;
        existing.reach += metric.reach;
        existing.by_provider[result.provider] = metric;
      } else {
        dateMap.set(metric.date, {
          date: metric.date,
          spend: metric.spend,
          impressions: metric.impressions,
          clicks: metric.clicks,
          reach: metric.reach,
          by_provider: {
            [result.provider]: metric,
          },
        });
      }
    }
  }

  // Sort by date and return
  return Array.from(dateMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
}

/**
 * Fetch metrics from a single provider
 */
export async function getMetricsFromProvider(
  providerName: string,
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<PaidMediaDailyMetrics[]> {
  const providers = getRegisteredProviders();
  const provider = providers.find(p => p.provider === providerName);

  if (!provider) {
    console.warn(`[PaidMediaDomain.getMetrics] Provider not found: ${providerName}`);
    return [];
  }

  return provider.getMetrics(projectId, dateRange, accountIds);
}
