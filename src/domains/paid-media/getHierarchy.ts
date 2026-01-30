/**
 * Paid Media Domain - Hierarchy Aggregator
 * 
 * Aggregates ad hierarchy (accounts, campaigns, adsets, ads) from all providers.
 * 
 * @see /docs/contracts/paid-media-domain.md
 */

import { getRegisteredProviders } from "./registry";
import type { 
  PaidMediaHierarchy,
  DomainHierarchyResult,
} from "./types";

/**
 * Fetch hierarchy from all providers, returned separately by provider
 */
export async function getHierarchyByProvider(
  projectId: string,
  accountIds?: string[]
): Promise<DomainHierarchyResult[]> {
  const providers = getRegisteredProviders();
  
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const hierarchy = await provider.getHierarchy(projectId, accountIds);
        return {
          provider: provider.provider,
          hierarchy,
        };
      } catch (error) {
        console.error(`[PaidMediaDomain.getHierarchy] Error from ${provider.provider}:`, error);
        return {
          provider: provider.provider,
          hierarchy: {
            accounts: [],
            campaigns: [],
            adsets: [],
            ads: [],
          },
        };
      }
    })
  );

  return results;
}

/**
 * Fetch aggregated hierarchy from all providers
 * 
 * Returns a single hierarchy object with all entities from all providers.
 * Each entity includes a provider field for identification.
 */
export async function getAggregatedHierarchy(
  projectId: string,
  accountIds?: string[]
): Promise<PaidMediaHierarchy & { provider_count: number }> {
  const providerResults = await getHierarchyByProvider(projectId, accountIds);
  
  const aggregated: PaidMediaHierarchy & { provider_count: number } = {
    accounts: [],
    campaigns: [],
    adsets: [],
    ads: [],
    provider_count: providerResults.length,
  };

  for (const result of providerResults) {
    // Add provider identifier to each entity for traceability
    aggregated.accounts.push(...result.hierarchy.accounts);
    aggregated.campaigns.push(...result.hierarchy.campaigns);
    aggregated.adsets.push(...result.hierarchy.adsets);
    aggregated.ads.push(...result.hierarchy.ads);
  }

  return aggregated;
}

/**
 * Fetch hierarchy from a single provider
 */
export async function getHierarchyFromProvider(
  providerName: string,
  projectId: string,
  accountIds?: string[]
): Promise<PaidMediaHierarchy> {
  const providers = getRegisteredProviders();
  const provider = providers.find(p => p.provider === providerName);

  if (!provider) {
    console.warn(`[PaidMediaDomain.getHierarchy] Provider not found: ${providerName}`);
    return {
      accounts: [],
      campaigns: [],
      adsets: [],
      ads: [],
    };
  }

  return provider.getHierarchy(projectId, accountIds);
}
