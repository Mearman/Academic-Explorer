/**
 * Ready-to-use cached OpenAlex client
 * Wraps the base client with intelligent caching
 */

import { openAlex, OpenAlexClient } from './client';
import { CacheInterceptor, withCache } from './utils/cache-interceptor';
import { EnhancedCacheInterceptor } from './utils/enhanced-cache-interceptor';

// Create enhanced cache interceptor with advanced features
const enhancedCacheInterceptor = new EnhancedCacheInterceptor({
  ttl: 60 * 60 * 1000, // 1 hour default
  useMemory: true,
  useLocalStorage: true,
  useIndexedDB: true,
  enableAnalytics: true,
  enablePredictivePrefetching: true,
  memoryPressureThreshold: 0.8,
  strategies: [
    // Add custom strategy for works by year (cache for longer)
    {
      pattern: /^\/works$/,
      strategy: {
        shouldCache: ({ endpoint: _endpoint, params }) => {
          const p = params as Record<string, unknown>;
          // Cache works filtered by year for longer
          if (p.filter?.toString().includes('publication_year')) {
            return true;
          }
          return true;
        },
        getCacheTTL: ({ endpoint: _endpoint, params }) => {
          const p = params as Record<string, unknown>;
          // Older years can be cached longer
          if (p.filter?.toString().includes('publication_year')) {
            const match = p.filter.toString().match(/publication_year:(\d{4})/);
            if (match) {
              const year = parseInt(match[1]);
              const currentYear = new Date().getFullYear();
              if (year < currentYear - 1) {
                return 7 * 24 * 60 * 60 * 1000; // 7 days for older years
              }
            }
          }
          return 60 * 60 * 1000; // 1 hour for current year
        },
        getCacheKey: ({ endpoint: _endpoint, params }) => `works:${JSON.stringify(params)}`,
      },
    },
  ],
});

// Fallback cache interceptor for compatibility
const fallbackCacheInterceptor = new CacheInterceptor({
  ttl: 60 * 60 * 1000, // 1 hour default
  useMemory: true,
  useLocalStorage: true, // Enable localStorage for optimal performance
  useIndexedDB: true,
  strategies: [
    // Add custom strategy for works by year (cache for longer)
    {
      pattern: /^\/works$/,
      strategy: {
        shouldCache: ({ endpoint: _endpoint, params }) => {
          const p = params as Record<string, unknown>;
          // Cache works filtered by year for longer
          if (p.filter?.toString().includes('publication_year')) {
            return true;
          }
          return true;
        },
        getCacheTTL: ({ endpoint: _endpoint, params }) => {
          const p = params as Record<string, unknown>;
          // Older years can be cached longer
          if (p.filter?.toString().includes('publication_year')) {
            const match = p.filter.toString().match(/publication_year:(\d{4})/);
            if (match) {
              const year = parseInt(match[1]);
              const currentYear = new Date().getFullYear();
              if (year < currentYear - 1) {
                return 7 * 24 * 60 * 60 * 1000; // 7 days for older years
              }
            }
          }
          return 60 * 60 * 1000; // 1 hour for current year
        },
        getCacheKey: ({ endpoint: _endpoint, params }) => `works:${JSON.stringify(params)}`,
      },
    },
  ],
});

// Create enhanced cached client with intelligent features
function createEnhancedCachedClient<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      
      // Only intercept functions that correspond to API methods
      if (typeof original === 'function' && prop !== 'constructor') {
        // Check if this method should be intercepted
        const endpoint = getEndpointFromMethod(prop as string, []);
        
        if (endpoint) {
          // This is an API method, wrap it for enhanced caching
          return async function (...args: unknown[]) {
            const actualEndpoint = getEndpointFromMethod(prop as string, args);
            const params = getParamsFromArgs(prop as string, args);
            return enhancedCacheInterceptor.intercept(
              actualEndpoint || endpoint,
              params,
              () => original.apply(target, args)
            );
          };
        }
      }
      
      // Not a function or not an API method, return original
      return original;
    },
  });
}

interface GetEndpointParams {
  method: string;
  args: unknown[];
}

// Helper functions (copied from cache-interceptor.ts for consistency)
function getEndpointFromMethod(params: GetEndpointParams): string | null;
// Legacy overload for backwards compatibility
function getEndpointFromMethod(method: string, args: unknown[]): string | null;
function getEndpointFromMethod(
  paramsOrMethod: GetEndpointParams | string,
  args?: unknown[]
): string | null {
  let method: string;
  let methodArgs: unknown[];

  if (typeof paramsOrMethod === 'string') {
    // Legacy overload
    method = paramsOrMethod;
    methodArgs = args!;
  } else {
    // New parameter object style
    method = paramsOrMethod.method;
    methodArgs = paramsOrMethod.args;
  }

  const methodMap: Record<string, (args: unknown[]) => string> = {
    works: () => '/works',
    work: (args) => `/works/${args[0]}`,
    authors: () => '/authors',
    author: (args) => `/authors/${args[0]}`,
    sources: () => '/sources',
    source: (args) => `/sources/${args[0]}`,
    institutions: () => '/institutions',
    institution: (args) => `/institutions/${args[0]}`,
    publishers: () => '/publishers',
    publisher: (args) => `/publishers/${args[0]}`,
    funders: () => '/funders',
    funder: (args) => `/funders/${args[0]}`,
    topics: () => '/topics',
    topic: (args) => `/topics/${args[0]}`,
    concepts: () => '/concepts',
    concept: (args) => `/concepts/${args[0]}`,
    worksAutocomplete: () => '/autocomplete/works',
    authorsAutocomplete: () => '/autocomplete/authors',
    randomWork: () => '/works/random',
    randomAuthor: () => '/authors/random',
  };
  
  const mapper = methodMap[method];
  return mapper ? mapper(methodArgs) : null;
}

function getParamsFromArgs(params: GetEndpointParams): unknown;
// Legacy overload for backwards compatibility
function getParamsFromArgs(method: string, args: unknown[]): unknown;
function getParamsFromArgs(
  paramsOrMethod: GetEndpointParams | string,
  args?: unknown[]
): unknown {
  let method: string;
  let methodArgs: unknown[];

  if (typeof paramsOrMethod === 'string') {
    // Legacy overload
    method = paramsOrMethod;
    methodArgs = args!;
  } else {
    // New parameter object style
    method = paramsOrMethod.method;
    methodArgs = paramsOrMethod.args;
  }

  // For list methods, first arg is params
  if (['works', 'authors', 'sources', 'institutions', 'publishers', 'funders', 'topics', 'concepts'].includes(method)) {
    return methodArgs[0] || {};
  }
  
  // For autocomplete methods
  if (method.includes('Autocomplete')) {
    return methodArgs[0] || {};
  }
  
  // For single entity fetches, no params
  return {};
}

// Create enhanced cached client and fallback
export const cachedClient = createEnhancedCachedClient(openAlex);
export const fallbackCachedClient = withCache(openAlex, fallbackCacheInterceptor);

// Alternative: Create a new cached client instance
export function createCachedClient(config?: {
  mailto?: string;
  apiKey?: string;
  cacheTTL?: number;
  useMemoryCache?: boolean;
  useIndexedDB?: boolean;
}): OpenAlexClient {
  try {
    const client = new OpenAlexClient({
      mailto: config?.mailto,
      apiKey: config?.apiKey,
      polite: true,
    });

    const interceptor = new CacheInterceptor({
      ttl: config?.cacheTTL || 60 * 60 * 1000,
      useMemory: config?.useMemoryCache !== false,
      useLocalStorage: true, // Enable localStorage by default
      useIndexedDB: config?.useIndexedDB !== false,
    });

    return withCache(client, interceptor);
  } catch (error) {
    console.warn('Failed to create cached client, falling back to regular client:', error);
    // Fallback to regular client if cache setup fails
    return new OpenAlexClient({
      mailto: config?.mailto,
      apiKey: config?.apiKey,
      polite: true,
    });
  }
}

// Export enhanced cache management functions
export async function clearCache(): Promise<void> {
  try {
    await enhancedCacheInterceptor.invalidate('*');
  } catch (error) {
    console.warn('Enhanced cache clear failed, falling back:', error);
    await fallbackCacheInterceptor.clear();
  }
}

export function getCacheStats() {
  try {
    return enhancedCacheInterceptor.getAnalytics();
  } catch (error) {
    console.warn('Enhanced cache stats failed, falling back:', error);
    return fallbackCacheInterceptor.getStats();
  }
}

export function getEnhancedCacheAnalytics() {
  return enhancedCacheInterceptor.getAnalytics();
}

export async function warmupCache() {
  // Preload common requests
  const commonRequests = [
    // Top cited works
    cachedClient.works({ 
      sort: 'cited_by_count:desc',
      per_page: 10,
    }),
    
    // Recent open access works
    cachedClient.works({
      filter: 'is_oa:true',
      sort: 'publication_date:desc',
      per_page: 10,
    }),
  ];

  await Promise.all(commonRequests);
  console.log('Cache warmup complete');
}

// Export cache warming functionality
export { 
  cacheWarmingService,
  prefetchEntity,
  warmCache as warmCacheEntities,
  warmRelatedEntities,
  getCacheWarmingStats,
  setCacheWarmingConfig,
  CacheWarmingStrategy,
  type CacheWarmingConfig,
  type PrefetchOptions,
  type WarmCacheOptions,
  type CacheWarmingResult,
  type CacheWarmingStats,
} from './cache-warming';

// Usage examples
export const examples = {
  // Basic usage - automatically cached
  async searchWorks(query: string) {
    // First call will hit the API
    const results1 = await cachedClient.works({ search: query });
    
    // Second call with same params will use cache
    // const results2 = await cachedClient.works({ search: query }); // For demonstration
    
    return results1;
  },

  // Get a specific work - cached for 7 days
  async getWork(id: string) {
    return cachedClient.work(id);
  },

  // Force fresh data (bypass cache)
  async getFreshWork(id: string) {
    // To bypass cache, use the original client
    return openAlex.work(id);
  },

  // Check cache performance
  async checkPerformance() {
    const stats = getCacheStats();
    
    // Handle different stats formats
    if ('hits' in stats) {
      // Fallback interceptor stats
      console.log('Cache Statistics:', {
        hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
        hits: stats.hits,
        misses: stats.misses,
        skipped: stats.skipped,
        errors: stats.errors,
      });
    } else {
      // Enhanced interceptor analytics
      console.log('Cache Analytics:', {
        hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
        cacheHits: stats.performance.cacheHits,
        cacheMisses: stats.performance.cacheMisses,
        cacheErrors: stats.performance.cacheErrors,
        averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
        memoryPressure: `${(stats.memoryPressure * 100).toFixed(1)}%`,
      });
    }
  },

  // Batch requests with caching
  async batchGetWorks(ids: string[]) {
    // Each work will be cached individually
    const works = await Promise.all(
      ids.map(id => cachedClient.work(id))
    );
    return works;
  },

  // Paginated results with caching
  async getAllWorksForTopic(topicId: string) {
    const allWorks = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Each page is cached separately
      const response = await cachedClient.works({
        filter: `topics.id:${topicId}`,
        page,
        per_page: 200,
      });

      allWorks.push(...response.results);
      
      hasMore = response.results.length === 200;
      page++;
    }

    return allWorks;
  },
};