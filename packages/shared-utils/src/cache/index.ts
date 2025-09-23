/**
 * Cache utilities for data management
 */

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