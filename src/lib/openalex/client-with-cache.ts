/**
 * OpenAlex API Client with integrated caching
 * Extends the base client to add automatic caching
 */

import { OpenAlexClient, OpenAlexConfig } from './client';
import type { ApiResponse } from './types';
import { CacheManager, CacheOptions, RequestDeduplicator } from './utils/cache';

export interface CachedOpenAlexConfig extends OpenAlexConfig {
  cache?: CacheOptions;
  deduplicateRequests?: boolean;
}

export class CachedOpenAlexClient extends OpenAlexClient {
  private cache: CacheManager;
  private deduplicator: RequestDeduplicator;
  private cacheEnabled = true;
  private deduplicateEnabled = true;

  // Normalize OpenAlex IDs to extract just the entity identifier
  private normalizeId(id: string): string {
    // If it's a full OpenAlex URL, extract just the ID part
    if (id.startsWith('https://openalex.org/')) {
      return id.split('/').pop() || id;
    }
    return id;
  }

  constructor(config: CachedOpenAlexConfig = {}) {
    super(config);
    
    // Initialize cache with custom options
    this.cache = new CacheManager({
      ttl: config.cache?.ttl || 60 * 60 * 1000, // 1 hour default for API responses
      useMemory: config.cache?.useMemory !== false,
      useIndexedDB: config.cache?.useIndexedDB !== false,
      namespace: config.cache?.namespace || 'openalex-api',
    });
    
    this.deduplicator = new RequestDeduplicator();
    this.deduplicateEnabled = config.deduplicateRequests !== false;
  }

  // Override the main request method to add caching
  private async cachedRequest<T>(
    method: () => Promise<T>,
    cacheKey: string,
    params: unknown = {},
    skipCache = false
  ): Promise<T> {
    // Skip cache if disabled or explicitly skipped
    if (!this.cacheEnabled || skipCache) {
      return method();
    }

    // Try to get from cache first
    try {
      const cached = await this.cache.get<T>(cacheKey, params as Record<string, unknown>);
      if (cached !== null) {
        this.cache.recordHit();
        console.debug(`Cache hit for ${cacheKey}`);
        return cached;
      }
    } catch (error) {
      // Cache read error - continue with normal request flow
      // Only log in development to avoid test noise
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Cache read error for ${cacheKey}:`, error);
      }
      // Continue with normal request flow
    }

    // Deduplicate parallel requests for the same resource
    if (this.deduplicateEnabled) {
      const dedupeKey = `${cacheKey}:${JSON.stringify(params)}`;
      try {
        return await this.deduplicator.deduplicate(dedupeKey, async () => {
          const result = await method();
          try {
            await this.cache.set(cacheKey, params as Record<string, unknown>, result);
            console.debug(`Cache miss for ${cacheKey} - cached for future use`);
          } catch (cacheError) {
            // Cache write error - continue without failing the request
            // Only log in development to avoid test noise
            if (process.env.NODE_ENV === 'development') {
              console.debug(`Cache write error for ${cacheKey}:`, cacheError);
            }
            // Continue without failing the request
          }
          this.cache.recordMiss();
          return result;
        }) as Promise<T>;
      } catch (dedupeError) {
        // Deduplication error - fall back to direct API call
        // Only log in development to avoid test noise
        if (process.env.NODE_ENV === 'development') {
          console.debug(`Deduplication error for ${cacheKey}:`, dedupeError);
        }
        // Fall back to direct API call (continue to code below)
      }
    }

    // Make the request and cache the result (fallback or no deduplication)
    this.cache.recordMiss();
    const result = await method();
    try {
      await this.cache.set(cacheKey, params as Record<string, unknown>, result);
      console.debug(`Cache miss for ${cacheKey} - cached for future use`);
    } catch (cacheError) {
      // Cache write error - continue without failing the request
      // Only log in development to avoid test noise
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Cache write error for ${cacheKey}:`, cacheError);
      }
      // Continue without failing the request
    }
    return result;
  }

  // Override specific methods to add caching
  async works(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Work>> {
    return this.cachedRequest(
      () => super.works(params),
      'works',
      params,
      skipCache
    );
  }

  async work(id: string, skipCache = false): Promise<import('./types').Work> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.work(id),
      `work:${normalizedId}`,
      {},
      skipCache
    );
  }

  async authors(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Author>> {
    return this.cachedRequest(
      () => super.authors(params),
      'authors',
      params,
      skipCache
    );
  }

  async author(id: string, skipCache = false): Promise<import('./types').Author> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.author(id),
      `author:${normalizedId}`,
      {},
      skipCache
    );
  }

  async sources(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Source>> {
    return this.cachedRequest(
      () => super.sources(params),
      'sources',
      params,
      skipCache
    );
  }

  async source(id: string, skipCache = false): Promise<import('./types').Source> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.source(id),
      `source:${normalizedId}`,
      {},
      skipCache
    );
  }

  async institutions(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Institution>> {
    return this.cachedRequest(
      () => super.institutions(params),
      'institutions',
      params,
      skipCache
    );
  }

  async institution(id: string, skipCache = false): Promise<import('./types').Institution> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.institution(id),
      `institution:${normalizedId}`,
      {},
      skipCache
    );
  }

  async publishers(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Publisher>> {
    return this.cachedRequest(
      () => super.publishers(params),
      'publishers',
      params,
      skipCache
    );
  }

  async publisher(id: string, skipCache = false): Promise<import('./types').Publisher> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.publisher(id),
      `publisher:${normalizedId}`,
      {},
      skipCache
    );
  }

  async funders(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Funder>> {
    return this.cachedRequest(
      () => super.funders(params),
      'funders',
      params,
      skipCache
    );
  }

  async funder(id: string, skipCache = false): Promise<import('./types').Funder> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.funder(id),
      `funder:${normalizedId}`,
      {},
      skipCache
    );
  }

  async topics(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Topic>> {
    return this.cachedRequest(
      () => super.topics(params),
      'topics',
      params,
      skipCache
    );
  }

  async topic(id: string, skipCache = false): Promise<import('./types').Topic> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.topic(id),
      `topic:${normalizedId}`,
      {},
      skipCache
    );
  }

  async concepts(params = {}, skipCache = false): Promise<ApiResponse<import('./types').Concept>> {
    return this.cachedRequest(
      () => super.concepts(params),
      'concepts',
      params,
      skipCache
    );
  }

  async concept(id: string, skipCache = false): Promise<import('./types').Concept> {
    const normalizedId = this.normalizeId(id);
    return this.cachedRequest(
      () => super.concept(id),
      `concept:${normalizedId}`,
      {},
      skipCache
    );
  }

  // Cache management methods
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
  }

  setDeduplicationEnabled(enabled: boolean): void {
    this.deduplicateEnabled = enabled;
  }

  async clearCache(): Promise<void> {
    await this.cache.clear();
    this.deduplicator.clear();
  }

  async clearCacheForEndpoint(endpoint: string): Promise<void> {
    await this.cache.delete(endpoint);
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  // Preload data into cache
  async preloadWork(id: string): Promise<void> {
    await this.work(id);
  }

  async preloadAuthor(id: string): Promise<void> {
    await this.author(id);
  }

  async preloadWorks(params = {}): Promise<void> {
    await this.works(params);
  }

  // Batch preloading
  async preloadWorksBatch(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.preloadWork(id)));
  }

  async preloadAuthorsBatch(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => this.preloadAuthor(id)));
  }
}

// Export singleton instance with caching enabled
export const cachedOpenAlex = new CachedOpenAlexClient({
  polite: true,
  cache: {
    ttl: 60 * 60 * 1000, // 1 hour
    useMemory: true,
    useIndexedDB: true,
    namespace: 'openalex-api',
  },
  deduplicateRequests: true,
});