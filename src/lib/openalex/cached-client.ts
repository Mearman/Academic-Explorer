/**
 * Ready-to-use cached OpenAlex client
 * Wraps the base client with intelligent caching
 */

import { openAlex, OpenAlexClient } from './client';
import { CacheInterceptor, withCache } from './utils/cache-interceptor';

// Create cache interceptor with custom configuration
const cacheInterceptor = new CacheInterceptor({
  ttl: 60 * 60 * 1000, // 1 hour default
  useMemory: true,
  useLocalStorage: true, // Enable localStorage for optimal performance
  useIndexedDB: true,
  strategies: [
    // Add custom strategy for works by year (cache for longer)
    {
      pattern: /^\/works$/,
      strategy: {
        shouldCache: (endpoint, params) => {
          const p = params as Record<string, unknown>;
          // Cache works filtered by year for longer
          if (p.filter?.toString().includes('publication_year')) {
            return true;
          }
          return true;
        },
        getCacheTTL: (endpoint, params) => {
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
        getCacheKey: (endpoint, params) => `works:${JSON.stringify(params)}`,
      },
    },
  ],
});

// Create cached client by wrapping the singleton
export const cachedClient = withCache(openAlex, cacheInterceptor);

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

// Export cache management functions
export async function clearCache(): Promise<void> {
  await cacheInterceptor.clear();
}

export function getCacheStats() {
  return cacheInterceptor.getStats();
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
    console.log('Cache Statistics:', {
      hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
      hits: stats.hits,
      misses: stats.misses,
      skipped: stats.skipped,
      errors: stats.errors,
    });
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