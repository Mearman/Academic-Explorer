/**
 * OpenAlex API Client Library
 * Complete implementation for interacting with OpenAlex API
 * Works in both browser and Node.js environments
 */

export * from './client';
export * from './types';
export * from './utils';

// Re-export commonly used items for convenience
export { OpenAlexClient, openAlex, OpenAlexError } from './client';

// Export cached client
export { 
  cachedClient, 
  createCachedClient, 
  clearCache, 
  getCacheStats, 
  warmupCache,
  // Cache warming functionality
  cacheWarmingService,
  prefetchEntity,
  warmCacheEntities,
  warmRelatedEntities,
  getCacheWarmingStats,
  setCacheWarmingConfig,
  CacheWarmingStrategy,
  type CacheWarmingConfig,
  type PrefetchOptions,
  type WarmCacheOptions,
  type CacheWarmingResult,
  type CacheWarmingStats,
} from './cached-client';
export { CachedOpenAlexClient, cachedOpenAlex } from './client-with-cache';
export { CacheInterceptor, withCache } from './utils/cache-interceptor';
export { RequestManager } from './utils/request-manager';
export { query, filters, combineFilters } from './utils/query-builder';
export { paginate, Paginator, BatchProcessor } from './utils/pagination';
export { 
  reconstructAbstract,
  extractAuthorNames,
  getBestAccessUrl,
  formatCitation,
  calculateCollaborationMetrics,
  buildCoAuthorshipNetwork,
  entitiesToCSV,
} from './utils/transformers';
export { CacheManager, defaultCache, cached } from './utils/cache';

// Export types for convenience
export type {
  Work,
  Author,
  Source,
  Institution,
  Publisher,
  Funder,
  Topic,
  Concept,
  Keyword,
  ApiResponse,
  WorksParams,
  AuthorsParams,
  SourcesParams,
  InstitutionsParams,
  AutocompleteResponse,
} from './types';