/**
 * Integration tests for request deduplication across the entire system
 * Tests the full stack: useEntityData → cachedClient → cacheInterceptor → requestManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheInterceptor, withCache } from './utils/cache-interceptor';
import { RequestManager } from './utils/request-manager';
import { OpenAlexClient } from './client';

// Mock the base client
const mockBaseClient = {
  work: vi.fn(),
  author: vi.fn(),
  source: vi.fn(),
  institution: vi.fn(),
  publisher: vi.fn(),
  funder: vi.fn(),
  topic: vi.fn(),
  concept: vi.fn(),
  request: vi.fn(),
};

// Mock the cache manager
vi.mock('./utils/cache', () => ({
  CacheManager: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null), // Always cache miss for testing
    set: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      size: 0,
      hits: 0,
      misses: 0,
    }),
  })),
}));

describe('Request Deduplication Integration', () => {
  let cacheInterceptor: CacheInterceptor;
  let cachedClient: any;
  let mockCache: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create fresh interceptor with deduplication enabled
    cacheInterceptor = new CacheInterceptor({
      ttl: 60 * 60 * 1000,
      useMemory: true,
      useLocalStorage: false,
      useIndexedDB: false,
      enableRequestDeduplication: true,
    });

    // Create cached client
    cachedClient = withCache(mockBaseClient, cacheInterceptor);
    
    // Access the mocked cache
    mockCache = (cacheInterceptor as any).cache;
  });

  afterEach(() => {
    cacheInterceptor.clear();
  });

  describe('end-to-end deduplication', () => {
    it('should deduplicate concurrent requests through the full stack', async () => {
      const workData = {
        id: 'W123456789',
        title: 'Integration Test Work',
        display_name: 'Integration Test Work'
      };

      // Create a controlled promise to ensure concurrency
      let resolveWork: (value: any) => void;
      const workPromise = new Promise((resolve) => {
        resolveWork = resolve;
      });

      mockBaseClient.work.mockReturnValue(workPromise);

      // Start multiple concurrent requests
      const request1 = cachedClient.work('W123456789');
      const request2 = cachedClient.work('W123456789');
      const request3 = cachedClient.work('W123456789');

      // Resolve the promise
      setTimeout(() => {
        resolveWork!(workData);
      }, 10);

      // Wait for all requests to complete
      const [result1, result2, result3] = await Promise.all([
        request1,
        request2,
        request3
      ]);

      // All should return the same data
      expect(result1).toEqual(workData);
      expect(result2).toEqual(workData);
      expect(result3).toEqual(workData);

      // The base client should only be called once due to deduplication
      expect(mockBaseClient.work).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.work).toHaveBeenCalledWith('W123456789');
    });

    it('should handle different entities independently', async () => {
      const workData = { id: 'W123', title: 'Work', display_name: 'Work' };
      const authorData = { id: 'A456', display_name: 'Author', works_count: 10 };

      mockBaseClient.work.mockResolvedValue(workData);
      mockBaseClient.author.mockResolvedValue(authorData);

      // Concurrent requests for different entities
      const [workResult, authorResult] = await Promise.all([
        cachedClient.work('W123'),
        cachedClient.author('A456')
      ]);

      expect(workResult).toEqual(workData);
      expect(authorResult).toEqual(authorData);

      // Different entities should not be deduplicated
      expect(mockBaseClient.work).toHaveBeenCalledTimes(1);
      expect(mockBaseClient.author).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors correctly through deduplication', async () => {
      const error = new Error('Integration test error');

      // Create controlled promise for error
      let rejectWork: (error: Error) => void;
      const workPromise = new Promise((_, reject) => {
        rejectWork = reject;
      });

      mockBaseClient.work.mockReturnValue(workPromise);

      // Start multiple concurrent requests
      const request1 = cachedClient.work('W123456789');
      const request2 = cachedClient.work('W123456789');

      // Reject the promise
      setTimeout(() => {
        rejectWork!(error);
      }, 10);

      // All should reject with the same error
      await expect(request1).rejects.toThrow('Integration test error');
      await expect(request2).rejects.toThrow('Integration test error');

      // Base client should only be called once
      expect(mockBaseClient.work).toHaveBeenCalledTimes(1);
    });
  });

  describe('deduplication statistics', () => {
    it('should track deduplication metrics correctly', async () => {
      const workData = { id: 'W999', title: 'Stats Test', display_name: 'Stats Test' };

      mockBaseClient.work.mockResolvedValue(workData);

      // Make multiple concurrent requests
      await Promise.all([
        cachedClient.work('W999'),
        cachedClient.work('W999'),
        cachedClient.work('W999'),
        cachedClient.work('W999'),
        cachedClient.work('W999')
      ]);

      // Check the statistics
      const stats = cacheInterceptor.getStats();
      
      // Should show deduplication in action
      expect(stats.deduplication).toBeDefined();
      expect(stats.deduplication.totalRequests).toBe(5);
      expect(stats.deduplication.deduplicatedRequests).toBe(4); // 4 out of 5 were deduplicated
      expect(stats.deduplication.deduplicationHitRate).toBe(0.8); // 80% hit rate

      // Only one actual API call should have been made
      expect(mockBaseClient.work).toHaveBeenCalledTimes(1);
    });
  });

  describe('memory and cleanup', () => {
    it('should clean up deduplication state after requests complete', async () => {
      const workData = { id: 'W777', title: 'Cleanup Test', display_name: 'Cleanup Test' };

      mockBaseClient.work.mockResolvedValue(workData);

      // Make a request and wait for completion
      await cachedClient.work('W777');

      // Check that no active requests remain
      const deduplicationInfo = cacheInterceptor.getDeduplicationInfo();
      expect(deduplicationInfo.activeRequests).toHaveLength(0);

      // Make another request for the same entity
      await cachedClient.work('W777');

      // Should make a new API call (not deduplicated with completed request)
      expect(mockBaseClient.work).toHaveBeenCalledTimes(2);
    });

    it('should handle cancellation of requests', async () => {
      const workData = { id: 'W888', title: 'Cancel Test', display_name: 'Cancel Test' };

      // Create a slow promise
      let resolveWork: (value: any) => void;
      const workPromise = new Promise((resolve) => {
        resolveWork = resolve;
      });

      mockBaseClient.work.mockReturnValue(workPromise);

      // Start requests
      const request1 = cachedClient.work('W888');
      const request2 = cachedClient.work('W888');

      // Cancel all requests
      cacheInterceptor.cancelAllRequests();

      // Check that no active requests remain
      const deduplicationInfo = cacheInterceptor.getDeduplicationInfo();
      expect(deduplicationInfo.activeRequests).toHaveLength(0);

      // Resolve the original promise (should still work)
      resolveWork!(workData);

      // The promises should still resolve (cancellation doesn't abort the underlying promise)
      const [result1, result2] = await Promise.all([request1, request2]);
      expect(result1).toEqual(workData);
      expect(result2).toEqual(workData);
    });
  });

  describe('different cache strategies with deduplication', () => {
    it('should deduplicate requests even with custom cache strategies', async () => {
      // Create interceptor with custom strategies
      const customInterceptor = new CacheInterceptor({
        strategies: [
          {
            pattern: /^\/works\/W\d+$/,
            strategy: {
              shouldCache: () => true,
              getCacheTTL: () => 24 * 60 * 60 * 1000, // 24 hours
              getCacheKey: (endpoint) => `custom:${endpoint}`,
            },
          },
        ],
      });

      const customCachedClient = withCache(mockBaseClient, customInterceptor);
      const customMockCache = (customInterceptor as any).cache;
      customMockCache.get.mockResolvedValue(null); // Cache miss

      const workData = { id: 'W555', title: 'Custom Strategy', display_name: 'Custom Strategy' };
      mockBaseClient.work.mockResolvedValue(workData);

      // Multiple concurrent requests
      await Promise.all([
        customCachedClient.work('W555'),
        customCachedClient.work('W555'),
        customCachedClient.work('W555')
      ]);

      // Should still deduplicate even with custom strategy
      expect(mockBaseClient.work).toHaveBeenCalledTimes(1);

      // Should use the custom cache key
      expect(customMockCache.set).toHaveBeenCalledWith(
        'custom:/works/W555',
        {},
        workData
      );

      customInterceptor.clear();
    });
  });

  describe('performance under load', () => {
    it('should handle many concurrent requests efficiently', async () => {
      const workData = { id: 'W666', title: 'Load Test', display_name: 'Load Test' };

      mockBaseClient.work.mockResolvedValue(workData);

      // Create 50 concurrent requests
      const requests = Array.from({ length: 50 }, () =>
        cachedClient.work('W666')
      );

      const results = await Promise.all(requests);

      // All should return the same data
      results.forEach(result => {
        expect(result).toEqual(workData);
      });

      // Only one API call should be made despite 50 requests
      expect(mockBaseClient.work).toHaveBeenCalledTimes(1);

      // Check statistics
      const stats = cacheInterceptor.getStats();
      expect(stats.deduplication.totalRequests).toBe(50);
      expect(stats.deduplication.deduplicatedRequests).toBe(49);
    });
  });
});