/**
 * Cache warming hooks export file
 * 
 * Re-exports all cache warming hooks for easy access
 */

// Prefetch hooks
export {
  usePrefetchEntity,
  useBatchPrefetch,
  useRelatedPrefetch,
  type UsePrefetchEntityOptions,
  type UsePrefetchEntityReturn,
  type UseBatchPrefetchOptions,
  type UseBatchPrefetchReturn,
  type UseRelatedPrefetchOptions,
  type UseRelatedPrefetchReturn,
} from './use-prefetch-entity';

// Cache warming hooks
export {
  useWarmCache,
  useBackgroundWarming,
  usePredictiveWarming,
  type UseWarmCacheOptions,
  type UseWarmCacheReturn,
  type UseBackgroundWarmingOptions,
  type UseBackgroundWarmingReturn,
  type UsePredictiveWarmingOptions,
  type UsePredictiveWarmingReturn,
} from './use-warm-cache';

// Re-export cache warming service types for convenience
export type {
  CacheWarmingConfig,
  PrefetchOptions,
  WarmCacheOptions,
  CacheWarmingResult,
  CacheWarmingStats,
} from '@/lib/openalex/cache-warming';

export { CacheWarmingStrategy } from '@/lib/openalex/cache-warming';