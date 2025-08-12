/**
 * OpenAlex API Client with integrated caching
 * Extends the base client to add automatic caching
 */

import { OpenAlexClient, OpenAlexConfig } from './client';
import { CacheManager, CacheOptions, RequestDeduplicator } from './utils/cache';
import type { ApiResponse } from './types';

export interface CachedOpenAlexConfig extends OpenAlexConfig {
  cache?: CacheOptions;
  deduplicateRequests?: boolean;
}

export class CachedOpenAlexClient extends OpenAlexClient {
  private cache: CacheManager;
  private deduplicator: RequestDeduplicator;
  private cacheEnabled = true;
  private deduplicateEnabled = true;

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
    const cached = await this.cache.get<T>(cacheKey, params as Record<string, unknown>);
    if (cached !== null) {
      this.cache.recordHit();
      console.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    // Deduplicate parallel requests for the same resource
    if (this.deduplicateEnabled) {
      const dedupeKey = `${cacheKey}:${JSON.stringify(params)}`;
      return this.deduplicator.deduplicate(dedupeKey, async () => {
        const result = await method();
        await this.cache.set(cacheKey, params as Record<string, unknown>, result);
        this.cache.recordMiss();
        console.debug(`Cache miss for ${cacheKey} - cached for future use`);
        return result;
      }) as Promise<T>;
    }

    // Make the request and cache the result
    this.cache.recordMiss();
    const result = await method();
    await this.cache.set(cacheKey, params as Record<string, unknown>, result);
    console.debug(`Cache miss for ${cacheKey} - cached for future use`);
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
    return this.cachedRequest(
      () => super.work(id),
      `work:${id}`,
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
    return this.cachedRequest(
      () => super.author(id),
      `author:${id}`,
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
    return this.cachedRequest(
      () => super.source(id),
      `source:${id}`,
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
    return this.cachedRequest(
      () => super.institution(id),
      `institution:${id}`,
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
    return this.cachedRequest(
      () => super.publisher(id),
      `publisher:${id}`,
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
    return this.cachedRequest(
      () => super.funder(id),
      `funder:${id}`,
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
    return this.cachedRequest(
      () => super.topic(id),
      `topic:${id}`,
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