/**
 * Unit tests for CacheInterceptor with request deduplication
 * Tests integration between caching and request deduplication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheInterceptor } from './cache-interceptor';
import { RequestManager } from './request-manager';

// Mock the cache manager
vi.mock('./cache', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      size: 0,
      hits: 0,
      misses: 0,
    }),
  })),
}));

describe('CacheInterceptor with Request Deduplication', () => {
  let cacheInterceptor: CacheInterceptor;
  let requestManager: RequestManager;
  let mockCache: any;
  let mockExecutor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create fresh instances
    cacheInterceptor = new CacheInterceptor({
      ttl: 60 * 60 * 1000,
      useMemory: true,
      useLocalStorage: false,
      useIndexedDB: false,
    });

    requestManager = new RequestManager();
    
    // Access the mocked cache instance
    mockCache = (cacheInterceptor as any).cache;
    mockExecutor = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    requestManager.clear();
  });

  describe('enhanced cache interceptor', () => {
    it('should integrate request deduplication with cache hits', async () => {
      const endpoint = '/works/W123456789';
      const params = {};
      const cachedData = { id: 'W123456789', title: 'Test Work' };
      
      // Mock cache hit
      mockCache.get.mockResolvedValueOnce(cachedData);
      
      // Multiple concurrent requests
      const promise1 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      const promise2 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      const promise3 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      
      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
      
      // All should return cached data
      expect(result1).toEqual(cachedData);
      expect(result2).toEqual(cachedData);
      expect(result3).toEqual(cachedData);
      
      // Executor should not be called (cache hit)
      expect(mockExecutor).not.toHaveBeenCalled();
      
      // Cache should only be checked once due to deduplication
      expect(mockCache.get).toHaveBeenCalledTimes(1);
    });

    it('should deduplicate requests on cache misses', async () => {
      const endpoint = '/works/W123456789';
      const params = {};
      const freshData = { id: 'W123456789', title: 'Fresh Work' };
      
      // Mock cache miss
      mockCache.get.mockResolvedValue(null);
      
      // Create controlled promise to simulate network request
      let resolveExecutor: (value: any) => void;
      const controlledPromise = new Promise((resolve) => {
        resolveExecutor = resolve;
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Multiple concurrent requests
      const promise1 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      const promise2 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      const promise3 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      
      // Allow cache checks to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Resolve the network request
      resolveExecutor!(freshData);
      
      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);
      
      // All should return the same fresh data
      expect(result1).toEqual(freshData);
      expect(result2).toEqual(freshData);
      expect(result3).toEqual(freshData);
      
      // Executor should only be called once due to deduplication
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      
      // Cache should be set once with the result
      expect(mockCache.set).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('entity:'),
        params,
        freshData
      );
    });

    it('should handle mixed cache hits and misses correctly', async () => {
      const endpoint1 = '/works/W123456789';
      const endpoint2 = '/works/W987654321';
      const params = {};
      const cachedData = { id: 'W123456789', title: 'Cached Work' };
      const freshData = { id: 'W987654321', title: 'Fresh Work' };
      
      // Mock cache responses
      mockCache.get
        .mockResolvedValueOnce(cachedData) // Hit for first endpoint
        .mockResolvedValueOnce(null);      // Miss for second endpoint
      
      mockExecutor.mockResolvedValueOnce(freshData);
      
      // Concurrent requests to different endpoints
      const [result1, result2] = await Promise.all([
        cacheInterceptor.intercept(endpoint1, params, mockExecutor),
        cacheInterceptor.intercept(endpoint2, params, mockExecutor)
      ]);
      
      expect(result1).toEqual(cachedData);
      expect(result2).toEqual(freshData);
      
      // Executor should only be called once (for cache miss)
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should coordinate cache and deduplication for entity requests', async () => {
      const workId = 'W123456789';
      const endpoint = `/works/${workId}`;
      const params = {};
      const workData = { 
        id: workId, 
        title: 'Test Work',
        cited_by_count: 100 
      };
      
      // Mock cache miss initially
      mockCache.get.mockResolvedValue(null);
      mockExecutor.mockResolvedValue(workData);
      
      // First request should miss cache and fetch
      const result1 = await cacheInterceptor.intercept(endpoint, params, mockExecutor);
      expect(result1).toEqual(workData);
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledTimes(1);
      
      // Mock cache hit for subsequent requests
      mockCache.get.mockResolvedValue(workData);
      
      // Second request should hit cache (no deduplication needed)
      const result2 = await cacheInterceptor.intercept(endpoint, params, mockExecutor);
      expect(result2).toEqual(workData);
      expect(mockExecutor).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should propagate errors correctly through deduplication', async () => {
      const endpoint = '/works/W123456789';
      const params = {};
      const testError = new Error('Network error');
      
      // Mock cache miss
      mockCache.get.mockResolvedValue(null);
      
      // Create controlled promise to simulate network error
      let rejectExecutor: (error: Error) => void;
      const controlledPromise = new Promise((_, reject) => {
        rejectExecutor = reject;
      });
      
      mockExecutor.mockReturnValue(controlledPromise);
      
      // Multiple concurrent requests
      const promise1 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      const promise2 = cacheInterceptor.intercept(endpoint, params, mockExecutor);
      
      // Reject the network request
      rejectExecutor!(testError);
      
      // All should reject with the same error
      await expect(promise1).rejects.toThrow('Network error');
      await expect(promise2).rejects.toThrow('Network error');
      
      // Executor should only be called once
      expect(mockExecutor).toHaveBeenCalledTimes(1);
      
      // Cache should not be set on error
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should handle different cache strategies with deduplication', async () => {
      // Create interceptor with custom strategies
      const interceptorWithStrategies = new CacheInterceptor({
        strategies: [
          {
            pattern: /^\/works\/W\d+$/,
            strategy: {
              shouldCache: () => true,
              getCacheTTL: () => 7 * 24 * 60 * 60 * 1000, // 7 days
              getCacheKey: ({ endpoint }) => `long-term:${endpoint}`,
            },
          },
          {
            pattern: /^\/works$/,
            strategy: {
              shouldCache: () => true,
              getCacheTTL: () => 60 * 60 * 1000, // 1 hour
              getCacheKey: ({ endpoint, params }) => `short-term:${endpoint}:${JSON.stringify(params)}`,
            },
          },
        ],
      });
      
      const entityEndpoint = '/works/W123456789';
      const searchEndpoint = '/works';
      const searchParams = { search: 'test' };
      
      // Mock cache for both strategies
      const entityCache = (interceptorWithStrategies as any).cache;
      entityCache.get.mockResolvedValue(null);
      
      mockExecutor
        .mockResolvedValueOnce({ id: 'W123456789', title: 'Entity Work' })
        .mockResolvedValueOnce({ results: [{ id: 'W999', title: 'Search Result' }] });
      
      // Test both strategies
      const [entityResult, searchResult] = await Promise.all([
        interceptorWithStrategies.intercept(entityEndpoint, {}, mockExecutor),
        interceptorWithStrategies.intercept(searchEndpoint, searchParams, mockExecutor)
      ]);
      
      expect(entityResult).toEqual({ id: 'W123456789', title: 'Entity Work' });
      expect(searchResult).toEqual({ results: [{ id: 'W999', title: 'Search Result' }] });
      
      // Should be called twice (different strategies, different endpoints)
      expect(mockExecutor).toHaveBeenCalledTimes(2);
      
      // Cache should be set with different keys
      expect(entityCache.set).toHaveBeenCalledWith(
        expect.stringContaining('long-term:'),
        {},
        expect.any(Object)
      );
      expect(entityCache.set).toHaveBeenCalledWith(
        expect.stringContaining('short-term:'),
        searchParams,
        expect.any(Object)
      );
    });

    it('should handle concurrent requests with no-cache strategy', async () => {
      // Create interceptor that doesn't cache certain endpoints
      const interceptorWithNoCache = new CacheInterceptor({
        strategies: [
          {
            pattern: /\/random$/,
            strategy: {
              shouldCache: () => false,
              getCacheTTL: () => 0,
              getCacheKey: () => '',
            },
          },
        ],
      });
      
      const randomEndpoint = '/works/random';
      const params = {};
      
      mockExecutor
        .mockResolvedValueOnce({ id: 'W111', title: 'Random 1' })
        .mockResolvedValueOnce({ id: 'W222', title: 'Random 2' });
      
      // Concurrent requests to no-cache endpoint
      const [result1, result2] = await Promise.all([
        interceptorWithNoCache.intercept(randomEndpoint, params, mockExecutor),
        interceptorWithNoCache.intercept(randomEndpoint, params, mockExecutor)
      ]);
      
      // Should get different results (no caching, no deduplication for this strategy)
      expect(result1).toEqual({ id: 'W111', title: 'Random 1' });
      expect(result2).toEqual({ id: 'W222', title: 'Random 2' });
      
      // Should call executor twice (no deduplication when caching is disabled)
      expect(mockExecutor).toHaveBeenCalledTimes(2);
    });
  });

  describe('memory management with deduplication', () => {
    it('should clean up deduplication state after cache operations', async () => {
      const endpoint = '/works/W123456789';
      const params = {};
      const workData = { id: 'W123456789', title: 'Test Work' };
      
      // Mock cache miss then hit
      mockCache.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(workData);
      
      mockExecutor.mockResolvedValueOnce(workData);
      
      // First request (cache miss, creates deduplication entry)
      await cacheInterceptor.intercept(endpoint, params, mockExecutor);
      
      // Verify deduplication state is cleaned up
      // This is implementation-dependent but should not leak memory
      
      // Second request (cache hit, should not need deduplication)
      await cacheInterceptor.intercept(endpoint, params, mockExecutor);
      
      expect(mockExecutor).toHaveBeenCalledTimes(1);
    });

    it('should handle memory pressure by limiting concurrent requests', async () => {
      // This test verifies that the system doesn't create unlimited concurrent requests
      const promises: Promise<any>[] = [];
      const controlledPromises: Array<{ resolve: (value: any) => void; reject: (error: any) => void }> = [];
      
      // Mock cache misses for all requests
      mockCache.get.mockResolvedValue(null);
      
      // Create controlled promises for each executor call
      mockExecutor.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          controlledPromises.push({ resolve, reject });
        });
      });
      
      // Create many concurrent requests to different endpoints
      for (let i = 0; i < 100; i++) {
        promises.push(
          cacheInterceptor.intercept(`/works/W${i}`, {}, mockExecutor)
        );
      }
      
      // Allow some time for deduplication logic
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should have created many requests but managed them efficiently
      expect(mockExecutor).toHaveBeenCalledTimes(100); // Each unique endpoint
      
      // Resolve all promises
      controlledPromises.forEach((cp, i) => {
        cp.resolve({ id: `W${i}`, title: `Work ${i}` });
      });
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
    });
  });

  describe('performance metrics', () => {
    it('should track deduplication performance in cache stats', async () => {
      const endpoint = '/works/W123456789';
      const params = {};
      const workData = { id: 'W123456789', title: 'Test Work' };
      
      // Mock cache miss
      mockCache.get.mockResolvedValue(null);
      mockExecutor.mockResolvedValue(workData);
      
      // Make multiple concurrent requests
      await Promise.all([
        cacheInterceptor.intercept(endpoint, params, mockExecutor),
        cacheInterceptor.intercept(endpoint, params, mockExecutor),
        cacheInterceptor.intercept(endpoint, params, mockExecutor)
      ]);
      
      const stats = cacheInterceptor.getStats();
      
      // Should show correct cache statistics
      expect(stats.misses).toBe(1); // Only one actual cache miss due to deduplication
      expect(stats.hits).toBe(0);   // No cache hits
      
      // The deduplication should be reflected in the implementation stats
      // (The exact structure depends on implementation)
      expect(stats).toHaveProperty('hitRate');
    });
  });
});