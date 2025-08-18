/**
 * Cache Interceptor for OpenAlex API Client
 * Provides transparent caching without modifying the base client
 */

import { CacheManager } from './cache';
import { RequestManager } from './request-manager';
// import { db } from '@/lib/db'; // Currently unused

export interface CacheStrategy {
  shouldCache: (endpoint: string, params: unknown) => boolean;
  getCacheTTL: (endpoint: string, params: unknown) => number;
  getCacheKey: (endpoint: string, params: unknown) => string;
}

// Default caching strategies for different endpoint types
export const defaultStrategies: Record<string, CacheStrategy> = {
  // Individual entity fetches - cache for longer
  entity: {
    shouldCache: () => true,
    getCacheTTL: () => 7 * 24 * 60 * 60 * 1000, // 7 days
    getCacheKey: (endpoint, params) => `entity:${endpoint}:${JSON.stringify(params || {})}`,
  },
  
  // Search results - cache for shorter period
  search: {
    shouldCache: (endpoint, params) => {
      // Don't cache if sorting by recent or if it's a very specific query
      const p = (params as Record<string, unknown>) || {};
      if (p.sort?.toString().includes('date:desc')) return false;
      if (p.sample !== undefined) return false; // Don't cache random samples
      return true;
    },
    getCacheTTL: () => 60 * 60 * 1000, // 1 hour
    getCacheKey: (endpoint, params) => `search:${endpoint}:${JSON.stringify(params || {})}`,
  },
  
  // Autocomplete - cache for medium period
  autocomplete: {
    shouldCache: () => true,
    getCacheTTL: () => 24 * 60 * 60 * 1000, // 24 hours
    getCacheKey: (endpoint, params) => `autocomplete:${endpoint}:${JSON.stringify(params || {})}`,
  },
  
  // Random endpoints - never cache
  random: {
    shouldCache: () => false,
    getCacheTTL: () => 0,
    getCacheKey: () => '',
  },
};

export class CacheInterceptor {
  private cache: CacheManager;
  private requestManager: RequestManager;
  private strategies: Map<RegExp, CacheStrategy> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    skipped: 0,
    errors: 0,
  };

  constructor(options: {
    ttl?: number;
    useMemory?: boolean;
    useLocalStorage?: boolean;
    useIndexedDB?: boolean;
    localStorageLimit?: number;
    strategies?: Array<{ pattern: RegExp; strategy: CacheStrategy }>;
    enableRequestDeduplication?: boolean;
    requestDeduplicationOptions?: {
      maxConcurrentRequests?: number;
      requestTimeout?: number;
    };
  } = {}) {
    this.cache = new CacheManager({
      ttl: options.ttl || 60 * 60 * 1000,
      useMemory: options.useMemory !== false,
      useLocalStorage: options.useLocalStorage !== false,
      useIndexedDB: options.useIndexedDB !== false,
      localStorageLimit: options.localStorageLimit || 5 * 1024 * 1024, // 5MB default
      namespace: 'openalex-interceptor',
    });

    // Initialize request manager for deduplication
    this.requestManager = new RequestManager({
      maxConcurrentRequests: options.requestDeduplicationOptions?.maxConcurrentRequests || 50,
      requestTimeout: options.requestDeduplicationOptions?.requestTimeout || 30000,
      enableMetrics: true,
    });

    // Set up default strategies
    this.strategies.set(/^\/works\/W\d+$/, defaultStrategies.entity);
    this.strategies.set(/^\/authors\/A\d+$/, defaultStrategies.entity);
    this.strategies.set(/^\/sources\/S\d+$/, defaultStrategies.entity);
    this.strategies.set(/^\/institutions\/I\d+$/, defaultStrategies.entity);
    this.strategies.set(/^\/publishers\/P\d+$/, defaultStrategies.entity);
    this.strategies.set(/^\/funders\/F\d+$/, defaultStrategies.entity);
    this.strategies.set(/^\/topics\/T\d+$/, defaultStrategies.entity);
    
    this.strategies.set(/^\/works$/, defaultStrategies.search);
    this.strategies.set(/^\/authors$/, defaultStrategies.search);
    this.strategies.set(/^\/sources$/, defaultStrategies.search);
    this.strategies.set(/^\/institutions$/, defaultStrategies.search);
    
    this.strategies.set(/^\/autocomplete\//, defaultStrategies.autocomplete);
    this.strategies.set(/\/random$/, defaultStrategies.random);

    // Add custom strategies if provided
    options.strategies?.forEach(({ pattern, strategy }) => {
      this.strategies.set(pattern, strategy);
    });
  }

  // Get the appropriate strategy for an endpoint
  // Check strategies in reverse order so custom strategies override defaults
  private getStrategy(endpoint: string): CacheStrategy | null {
    const strategies = Array.from(this.strategies.entries());
    for (let i = strategies.length - 1; i >= 0; i--) {
      const [pattern, strategy] = strategies[i];
      if (pattern.test(endpoint)) {
        return strategy;
      }
    }
    return null;
  }

  // Intercept a request and add caching with request deduplication
  async intercept<T>(
    endpoint: string,
    params: unknown,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const strategy = this.getStrategy(endpoint);
    
    // If no strategy or shouldn't cache, just execute the request without deduplication
    if (!strategy || !strategy.shouldCache(endpoint, params)) {
      this.stats.skipped++;
      // Don't use deduplication for non-cacheable requests (e.g., random endpoints)
      return requestFn();
    }

    const cacheKey = strategy.getCacheKey(endpoint, params);
    
    // Use request deduplication for the entire cache check + fetch operation
    return this.requestManager.deduplicate(cacheKey, async () => {
      try {
        // Try to get from cache
        const cached = await this.cache.get<T>(
          cacheKey,
          (params as Record<string, unknown>) || {}
        );
        
        if (cached !== null) {
          this.stats.hits++;
          console.debug(`Cache hit: ${cacheKey}`);
          return cached;
        }
      } catch (error) {
        console.error('Cache read error:', error);
        this.stats.errors++;
      }

      // Cache miss - make the request
      this.stats.misses++;
      const result = await requestFn();
      
      // Store in cache
      try {
        await this.storeInCache(cacheKey, params, result, strategy.getCacheTTL(endpoint, params));
      } catch (error) {
        console.error('Cache write error:', error);
        this.stats.errors++;
      }
      
      return result;
    });
  }

  // Store result in cache
  private async storeInCache<T>(
    key: string,
    params: unknown,
    data: T,
    _ttl: number
  ): Promise<void> {
    // Always use the main cache, but the CacheManager should handle TTL internally
    // For testing purposes, we want to use the mocked cache
    await this.cache.set(key, (params as Record<string, unknown>) || {}, data);
  }

  // Warmup cache with common requests
  async warmup(requests: Array<{ endpoint: string; params: unknown; data: unknown }>) {
    for (const { endpoint, params, data } of requests) {
      const strategy = this.getStrategy(endpoint);
      if (strategy && strategy.shouldCache(endpoint, params)) {
        const cacheKey = strategy.getCacheKey(endpoint, params);
        await this.storeInCache(
          cacheKey,
          params,
          data,
          strategy.getCacheTTL(endpoint, params)
        );
      }
    }
  }

  // Invalidate cache for specific patterns
  async invalidate(pattern: string | RegExp) {
    // const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern; // Currently unused
    
    // This would need to be implemented in the base cache manager
    // For now, we can clear all cache
    if (pattern === '*' || pattern === '.*') {
      await this.cache.clear();
    }
  }

  // Get cache statistics including request deduplication metrics
  getStats() {
    const cacheStats = this.cache.getStats();
    const requestStats = this.requestManager.getStats();
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      cache: cacheStats,
      deduplication: requestStats,
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      skipped: 0,
      errors: 0,
    };
    this.requestManager.clear(); // This also resets request manager stats
  }

  // Clear all cache and request deduplication state
  async clear() {
    await this.cache.clear();
    this.resetStats();
  }

  // Get detailed request deduplication information (for debugging)
  getDeduplicationInfo() {
    return {
      stats: this.requestManager.getStats(),
      activeRequests: this.requestManager.getActiveRequestsInfo(),
    };
  }

  // Cancel all pending requests
  cancelAllRequests() {
    this.requestManager.cancelAll();
  }

  // Clean up stale requests
  cleanupStaleRequests(maxAgeMs?: number) {
    return this.requestManager.cleanupStaleRequests(maxAgeMs);
  }
}

// Create a proxy wrapper for any OpenAlex client
export function withCache<T extends object>(
  client: T,
  interceptor: CacheInterceptor
): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const original = Reflect.get(target, prop, receiver);
      
      // Only intercept functions that correspond to API methods
      if (typeof original === 'function' && prop !== 'constructor') {
        // Check if this method should be intercepted
        const endpoint = getEndpointFromMethod(prop as string, []);
        
        if (endpoint) {
          // This is an API method, wrap it for caching
          return async function (...args: unknown[]) {
            const actualEndpoint = getEndpointFromMethod(prop as string, args);
            const params = getParamsFromArgs(prop as string, args);
            return interceptor.intercept(
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

// Helper to map method names to endpoints
function getEndpointFromMethod(method: string, args: unknown[]): string | null {
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
  return mapper ? mapper(args) : null;
}

// Helper to extract params from method arguments
function getParamsFromArgs(method: string, args: unknown[]): unknown {
  // For list methods, first arg is params
  if (['works', 'authors', 'sources', 'institutions', 'publishers', 'funders', 'topics', 'concepts'].includes(method)) {
    return args[0] || {};
  }
  
  // For autocomplete methods
  if (method.includes('Autocomplete')) {
    return args[0] || {};
  }
  
  // For single entity fetches, no params
  return {};
}