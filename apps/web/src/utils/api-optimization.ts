import { QueryClient, QueryKey } from "@tanstack/react-query";
import { logger } from "@academic-explorer/utils/logger";

/**
 * Request deduplication cache
 */
class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      logger.debug("api", "Deduplicating request", { key });
      return this.pendingRequests.get(key) as Promise<T>;
    }

    const request = requestFn()
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, request);
    return request;
  }

  clear(): void {
    this.pendingRequests.clear();
  }

  size(): number {
    return this.pendingRequests.size;
  }
}

/**
 * Request batching utility
 */
class RequestBatcher {
  private batchQueue = new Map<string, {
    requests: Array<{ resolve: Function; reject: Function; params: any[] }>;
    timer: NodeJS.Timeout;
  }>();

  constructor(private batchDelay: number = 50) {}

  async batch<T>(
    batchKey: string,
    params: any[],
    batchFn: (allParams: any[][]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, {
          requests: [],
          timer: setTimeout(() => this.processBatch(batchKey, batchFn), this.batchDelay),
        });
      }

      const batch = this.batchQueue.get(batchKey)!;
      batch.requests.push({ resolve, reject, params });
    });
  }

  private async processBatch<T>(
    batchKey: string,
    batchFn: (allParams: any[][]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch) return;

    this.batchQueue.delete(batchKey);
    clearTimeout(batch.timer);

    try {
      const allParams = batch.requests.map(req => req.params);
      const results = await batchFn(allParams);

      batch.requests.forEach((req, index) => {
        req.resolve(results[index]);
      });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      batch.requests.forEach(req => {
        req.reject(errorObj);
      });
    }
  }

  clear(): void {
    this.batchQueue.forEach(batch => {
      clearTimeout(batch.timer);
    });
    this.batchQueue.clear();
  }

  size(): number {
    return this.batchQueue.size;
  }
}

/**
 * Smart caching layer with TTL and invalidation
 */
class SmartCache {
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    ttl: number;
    accessCount: number;
  }>();

  constructor(private defaultTTL: number = 5 * 60 * 1000) {} // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): {
    size: number;
    hitRate: number;
    mostAccessed: Array<{ key: string; accessCount: number }>;
  } {
    let totalAccess = 0;
    const entries: Array<{ key: string; accessCount: number }> = [];

    for (const [key, entry] of this.cache.entries()) {
      totalAccess += entry.accessCount;
      entries.push({ key, accessCount: entry.accessCount });
    }

    const mostAccessed = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 5);

    return {
      size: this.cache.size,
      hitRate: totalAccess > 0 ? totalAccess / (totalAccess + 1) : 0,
      mostAccessed,
    };
  }
}

/**
 * API optimization manager
 */
export class APIOptimizer {
  private deduplicator = new RequestDeduplicator();
  private batcher = new RequestBatcher();
  private cache = new SmartCache();
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.setupCacheCleanup();
  }

  private setupCacheCleanup(): void {
    // Clean up cache every 5 minutes
    setInterval(() => {
      this.cache.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Optimized fetch with deduplication and caching
   */
  async fetch<T>(
    key: string | string[],
    fetchFn: () => Promise<T>,
    options: {
      cache?: boolean;
      cacheTTL?: number;
      deduplicate?: boolean;
      retry?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T> {
    const {
      cache: enableCache = true,
      cacheTTL,
      deduplicate = true,
      retry = 1,
      retryDelay = 1000,
    } = options;

    const cacheKey = Array.isArray(key) ? key.join(':') : key;

    // Check cache first
    if (enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug("api", "Cache hit", { key: cacheKey });
        return cached;
      }
    }

    // Deduplicate concurrent requests
    const requestFn = async () => {
      let attempt = 0;
      while (attempt <= retry) {
        try {
          const result = await fetchFn();

          // Cache successful result
          if (enableCache) {
            this.cache.set(cacheKey, result, cacheTTL);
          }

          logger.debug("api", "Request successful", {
            key: cacheKey,
            attempt: attempt + 1,
            cached: enableCache
          });

          return result;
        } catch (error) {
          attempt++;
          if (attempt > retry) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("api", "Request failed after retries", {
              key: cacheKey,
              attempt,
              error: errorMessage,
            });
            throw error;
          }

          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));

          logger.debug("api", "Retrying request", {
            key: cacheKey,
            attempt: attempt + 1,
            delay
          });
        }
      }
      throw new Error('Maximum retry attempts exceeded');
    };

    if (deduplicate) {
      return this.deduplicator.deduplicate(cacheKey, requestFn);
    }

    return requestFn();
  }

  /**
   * Batch multiple requests together
   */
  async batchFetch<T>(
    batchKey: string,
    params: any[],
    batchFn: (allParams: any[][]) => Promise<T[]>
  ): Promise<T> {
    return this.batcher.batch(batchKey, params, batchFn);
  }

  /**
   * Prefetch data for better UX
   */
  async prefetch<T>(
    key: QueryKey,
    fetchFn: () => Promise<T>,
    options: { cacheTTL?: number } = {}
  ): Promise<void> {
    try {
      await this.queryClient.prefetchQuery({
        queryKey: key,
        queryFn: fetchFn,
        staleTime: options.cacheTTL || 5 * 60 * 1000, // 5 minutes
      });
      logger.debug("api", "Prefetched data", { key });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn("api", "Prefetch failed", { key, error: errorMessage });
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidate(key: string | RegExp): void {
    if (typeof key === 'string') {
      this.cache.invalidate(key);
      this.queryClient.invalidateQueries({ queryKey: [key] });
    } else {
      this.cache.invalidatePattern(key);
      this.queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey.join(':');
          return key.test(queryKey);
        }
      });
    }
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    deduplication: { pending: number };
    batching: { queued: number };
    cache: ReturnType<SmartCache['getStats']>;
  } {
    return {
      deduplication: { pending: this.deduplicator.size() },
      batching: { queued: this.batcher.size() },
      cache: this.cache.getStats(),
    };
  }

  /**
   * Clear all optimizations
   */
  clear(): void {
    this.deduplicator.clear();
    this.batcher.clear();
    this.cache.clear();
  }

  /**
   * Optimized query configuration
   */
  getQueryConfig<T>(options: {
    staleTime?: number;
    cacheTime?: number;
    retry?: number;
    retryDelay?: number;
  } = {}) {
    return {
      staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
      gcTime: options.cacheTime || 10 * 60 * 1000, // 10 minutes
      retry: options.retry || 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      onError: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error("api", "Query error", { error: errorMessage });
      },
    };
  }
}

/**
 * Hook for using API optimizer
 */
export function useAPIOptimizer(queryClient: QueryClient): APIOptimizer {
  // Note: This would need to be used in a React component context
  // For now, return a basic instance
  return new APIOptimizer(queryClient);
}

/**
 * Common API optimization patterns
 */
export const APIPatterns = {
  // Optimized entity fetching with caching
  fetchEntity: <T>(
    entityType: string,
    entityId: string,
    fetchFn: (id: string) => Promise<T>,
    optimizer: APIOptimizer
  ) => {
    return optimizer.fetch(
      `${entityType}:${entityId}`,
      () => fetchFn(entityId),
      {
        cache: true,
        cacheTTL: 10 * 60 * 1000, // 10 minutes
        deduplicate: true,
      }
    );
  },

  // Optimized search (debouncing should be handled at the component level)
  searchEntities: <T>(
    searchType: string,
    query: string,
    searchFn: (q: string) => Promise<T[]>,
    optimizer: APIOptimizer
  ) => {
    if (!query.trim()) return Promise.resolve([]);

    return optimizer.fetch(
      `search:${searchType}:${query}`,
      () => searchFn(query),
      {
        cache: true,
        cacheTTL: 2 * 60 * 1000, // 2 minutes for search results
        deduplicate: true,
      }
    );
  },

  // Batch entity fetching
  batchFetchEntities: <T>(
    entityType: string,
    ids: string[],
    batchFetchFn: (ids: string[]) => Promise<T[]>,
    optimizer: APIOptimizer
  ) => {
    return optimizer.batchFetch(
      `batch:${entityType}`,
      ids,
      (idArrays: string[][]) => {
        const allIds = idArrays.flat();
        return batchFetchFn(allIds);
      }
    );
  },
};

/**
 * Debounce utility function (non-hook version)
 */
export function debounce<T>(value: T, delay: number): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(value);
    }, delay);

    // In a real implementation, you'd want proper debouncing logic
    // This is a simplified version for the API utility
  });
}