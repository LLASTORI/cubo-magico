/**
 * Paid Media Provider Registry
 * 
 * Central registry for all paid media providers.
 * Providers are registered here and consumed by domain functions.
 * 
 * @see /docs/contracts/paid-media-domain.md
 */

import { MetaPaidMediaProvider } from "@/providers/meta";
import type { PaidMediaProviderInterface } from "@/providers/meta/types";

// Registry of all available providers
const providers: Map<string, PaidMediaProviderInterface> = new Map();

// Register Meta provider by default
providers.set('meta', MetaPaidMediaProvider);

/**
 * Get all registered providers
 */
export function getRegisteredProviders(): PaidMediaProviderInterface[] {
  return Array.from(providers.values());
}

/**
 * Get provider by name
 */
export function getProvider(name: string): PaidMediaProviderInterface | undefined {
  return providers.get(name);
}

/**
 * Get list of registered provider names
 */
export function getProviderNames(): string[] {
  return Array.from(providers.keys());
}

/**
 * Register a new provider
 * (Used for future providers: Google, TikTok)
 */
export function registerProvider(provider: PaidMediaProviderInterface): void {
  providers.set(provider.provider, provider);
}

/**
 * Check if a provider is registered
 */
export function hasProvider(name: string): boolean {
  return providers.has(name);
}
