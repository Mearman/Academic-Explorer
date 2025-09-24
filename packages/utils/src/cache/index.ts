/**
 * Cache utilities for data management
 */

import { logger } from "../logger.js";

export {
  createQueryKey,
  createResourceKey,
  createCollectionKey,
  createSearchKey,
  extractResourceType,
  extractResourceId,
  isCollectionKey,
  isSearchKey,
  isResourceKey,
  createInvalidationPattern,
  matchesPattern,
  hashParams,
  createShortQueryKey,
  CacheKeyBuilder,
  type QueryParams
} from "./query-keys.js";

export {
  MemoryCache,
  type CacheStats,
  type CacheConfig
} from "./memory-cache.js";

// Export entity cache times for applications
export const ENTITY_CACHE_TIMES = {
  works: {
    stale: 1000 * 60 * 60 * 24,       // 1 day
    gc: 1000 * 60 * 60 * 24 * 7,      // 7 days
  },
  authors: {
    stale: 1000 * 60 * 60 * 12,       // 12 hours
    gc: 1000 * 60 * 60 * 24 * 3,      // 3 days
  },
  sources: {
    stale: 1000 * 60 * 60 * 24 * 7,   // 7 days
    gc: 1000 * 60 * 60 * 24 * 30,     // 30 days
  },
  institutions: {
    stale: 1000 * 60 * 60 * 24 * 30,  // 30 days
    gc: 1000 * 60 * 60 * 24 * 90,     // 90 days
  },
  topics: {
    stale: 1000 * 60 * 60 * 24 * 7,   // 7 days
    gc: 1000 * 60 * 60 * 24 * 30,     // 30 days
  },
  publishers: {
    stale: 1000 * 60 * 60 * 24 * 30,  // 30 days
    gc: 1000 * 60 * 60 * 24 * 90,     // 90 days
  },
  funders: {
    stale: 1000 * 60 * 60 * 24 * 30,  // 30 days
    gc: 1000 * 60 * 60 * 24 * 90,     // 90 days
  },
  keywords: {
    stale: 1000 * 60 * 60 * 24 * 7,   // 7 days
    gc: 1000 * 60 * 60 * 24 * 30,     // 30 days
  },
  concepts: {
    stale: 1000 * 60 * 60 * 24 * 7,   // 7 days
    gc: 1000 * 60 * 60 * 24 * 30,     // 30 days
  },
  search: {
    stale: 1000 * 60 * 5,              // 5 minutes
    gc: 1000 * 60 * 60,                // 1 hour
  },
  related: {
    stale: 1000 * 60 * 60 * 6,         // 6 hours
    gc: 1000 * 60 * 60 * 24,           // 1 day
  },
} as const;

// Stub implementations for missing cache functions
// These provide basic functionality to prevent compilation errors

/**
 * Initialize query client with cache restoration
 * Stub implementation - applications should provide their own
 */
export function initializeQueryClient(): Promise<{
  queryClient: unknown;
  invalidationResult: unknown;
}> {
  return Promise.resolve({
    queryClient: null,
    invalidationResult: { success: true, message: "Stub implementation" }
  });
}

/**
 * Create a standard query client
 * Stub implementation - applications should provide their own
 */
export function createStandardQueryClient(): unknown {
  return null;
}

/**
 * Clear expired cache entries
 * Stub implementation - applications should provide their own
 */
export function clearExpiredCache(): Promise<void> {
  // Stub implementation
  logger.warn("cache", "clearExpiredCache: Using stub implementation");
  return Promise.resolve();
}

/**
 * Clear all cache layers
 * Stub implementation - applications should provide their own
 */
export function clearAllCacheLayers(): Promise<unknown> {
  logger.warn("cache", "clearAllCacheLayers: Using stub implementation");
  return Promise.resolve({ success: true, message: "Stub implementation" });
}

/**
 * Clear application metadata
 * Stub implementation - applications should provide their own
 */
export function clearAppMetadata(): Promise<void> {
  logger.warn("cache", "clearAppMetadata: Using stub implementation");
  return Promise.resolve();
}