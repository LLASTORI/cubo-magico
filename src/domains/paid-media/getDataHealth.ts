/**
 * Paid Media Domain - Data Health Aggregator
 * 
 * Aggregates data health status from all registered providers.
 * Does NOT trigger sync operations.
 * 
 * @see /docs/contracts/paid-media-domain.md
 */

import { getRegisteredProviders } from "./registry";
import type { 
  DateRange,
  PaidMediaDataHealth,
  DomainDataHealthResult,
} from "./types";

/**
 * Fetch data health from all providers, returned separately by provider
 */
export async function getDataHealthByProvider(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<DomainDataHealthResult[]> {
  const providers = getRegisteredProviders();
  
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const health = await provider.getDataHealth(projectId, dateRange, accountIds);
        return {
          provider: provider.provider,
          health,
        };
      } catch (error) {
        console.error(`[PaidMediaDomain.getDataHealth] Error from ${provider.provider}:`, error);
        return {
          provider: provider.provider,
          health: {
            is_complete: false,
            missing_days: [],
            last_sync_at: null,
            credentials_status: 'not_configured' as const,
          },
        };
      }
    })
  );

  return results;
}

/**
 * Get aggregated data health status
 * 
 * Returns overall health considering all providers:
 * - is_complete: true only if ALL providers are complete
 * - missing_days: union of all missing days across providers
 * - credentials_status: worst status among all providers
 */
export async function getAggregatedDataHealth(
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<{
  is_complete: boolean;
  providers_complete: number;
  providers_total: number;
  missing_days: string[];
  worst_credentials_status: PaidMediaDataHealth['credentials_status'];
  by_provider: DomainDataHealthResult[];
}> {
  const providerResults = await getDataHealthByProvider(projectId, dateRange, accountIds);
  
  // Calculate aggregated status
  const allMissingDays = new Set<string>();
  let providersComplete = 0;
  let worstCredentialsStatus: PaidMediaDataHealth['credentials_status'] = 'valid';

  const credentialsPriority: Record<PaidMediaDataHealth['credentials_status'], number> = {
    'valid': 0,
    'expiring_soon': 1,
    'expired': 2,
    'not_configured': 3,
  };

  for (const result of providerResults) {
    // Count complete providers
    if (result.health.is_complete) {
      providersComplete++;
    }

    // Collect all missing days
    for (const day of result.health.missing_days) {
      allMissingDays.add(day);
    }

    // Track worst credentials status
    if (credentialsPriority[result.health.credentials_status] > credentialsPriority[worstCredentialsStatus]) {
      worstCredentialsStatus = result.health.credentials_status;
    }
  }

  return {
    is_complete: providersComplete === providerResults.length && providerResults.length > 0,
    providers_complete: providersComplete,
    providers_total: providerResults.length,
    missing_days: Array.from(allMissingDays).sort(),
    worst_credentials_status: worstCredentialsStatus,
    by_provider: providerResults,
  };
}

/**
 * Fetch data health from a single provider
 */
export async function getDataHealthFromProvider(
  providerName: string,
  projectId: string,
  dateRange: DateRange,
  accountIds?: string[]
): Promise<PaidMediaDataHealth> {
  const providers = getRegisteredProviders();
  const provider = providers.find(p => p.provider === providerName);

  if (!provider) {
    console.warn(`[PaidMediaDomain.getDataHealth] Provider not found: ${providerName}`);
    return {
      is_complete: false,
      missing_days: [],
      last_sync_at: null,
      credentials_status: 'not_configured',
    };
  }

  return provider.getDataHealth(projectId, dateRange, accountIds);
}
