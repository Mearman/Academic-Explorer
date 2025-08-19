/**
 * Advanced Cache Performance and TDD Tests
 * Tests comprehensive cache scenarios including memory pressure, offline/online transitions,
 * intelligent invalidation, and performance optimizations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager } from './cache';
import { CacheInterceptor } from './cache-interceptor';
import { RequestManager } from './request-manager';
import type { ApiResponse, Work, Author } from '../types';

// Mock performance.now() for consistent testing
const mockPerformanceNow = vi.fn(() => Date.now());
global.performance = { now: mockPerformanceNow } as any;

// Mock IndexedDB for testing
vi.mock('@/lib/db', () => ({
  db: {
    init: vi.fn(),
    getSearchResults: vi.fn(),
    cacheSearchResults: vi.fn(),
    cleanOldSearchResults: vi.fn(),
    clearAllStores: vi.fn(),
    getStorageEstimate: vi.fn(() => Promise.resolve({ usage: 0, quota: 1000000 })),
  },
}));

// Mock navigator for storage quota testing
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn(() => Promise.resolve({ usage: 100000, quota: 1000000 })),
    persist: vi.fn(() => Promise.resolve(true)),
  },
  writable: true,
});

describe('Advanced Cache Performance Tests', () => {
  let cache: CacheManager;
  let interceptor: CacheInterceptor;
  let requestManager: RequestManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheManager({
      ttl: 60000,
      useMemory: true,
      useLocalStorage: true,
      useIndexedDB: true,
      localStorageLimit: 50000, // Small limit for testing
    });
    
    interceptor = new CacheInterceptor({
      ttl: 60000,
      useMemory: true,
      useIndexedDB: true,
      enableRequestDeduplication: true,
    });

    requestManager = new RequestManager({
      maxConcurrentRequests: 10,
      requestTimeout: 5000,
      enableMetrics: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle memory pressure with intelligent eviction', async () => {
      const smallCache = new CacheManager({
        useMemory: true,
        useLocalStorage: false,
        useIndexedDB: false,
      });

      // Fill cache beyond LRU limit
      const entries = Array.from({ length: 150 }, (_, i) => ({
        endpoint: `/works/W${i}`,
        params: { id: i },
        data: { 
          id: `W${i}`, 
          title: `Work ${i}`,
          content: 'A'.repeat(1000), // Make entries substantial
        },
      }));

      // Add all entries
      for (const entry of entries) {
        await smallCache.set(entry.endpoint, entry.params, entry.data);
      }

      const stats = smallCache.getStats();
      expect(stats.memoryEntries).toBeLessThanOrEqual(100); // LRU eviction

      // Recent entries should still be accessible
      const recentEntry = await smallCache.get('/works/W149', { id: 149 });
      expect(recentEntry).toBeTruthy();

      // Old entries might be evicted
      const oldEntry = await smallCache.get('/works/W0', { id: 0 });
      expect(oldEntry).toBeNull();
    });

    it('should fallback gracefully when localStorage quota exceeded', async () => {
      const quotaCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: true,
        localStorageLimit: 1000, // Very small limit
      });

      const largeData = {
        id: 'W123',
        content: 'A'.repeat(2000), // Exceeds localStorage limit
      };

      // Should not throw and fallback to IndexedDB
      await expect(quotaCache.set('/works', { id: 'large' }, largeData)).resolves.not.toThrow();

      // Should still be retrievable
      const retrieved = await quotaCache.get('/works', { id: 'large' });
      expect(retrieved).toEqual(largeData);
    });

    it('should monitor and report memory usage accurately', async () => {
      const monitoringCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: false,
      });

      // Add various sized entries
      const smallData = { id: 'small', data: 'small' };
      const mediumData = { id: 'medium', data: 'B'.repeat(1000) };
      const largeData = { id: 'large', data: 'C'.repeat(10000) };

      await monitoringCache.set('/test', { type: 'small' }, smallData);
      await monitoringCache.set('/test', { type: 'medium' }, mediumData);
      await monitoringCache.set('/test', { type: 'large' }, largeData);

      const stats = monitoringCache.getStats();
      expect(stats.memorySize).toBeGreaterThan(11000); // Should reflect actual size
      expect(stats.memoryEntries).toBe(3);
      expect(stats.localStorageSize).toBeGreaterThan(0);
    });
  });

  describe('Cache Hit/Miss Optimization', () => {
    it('should optimize cache hit rates with intelligent prefetching', async () => {
      const optimizedCache = new CacheInterceptor({
        ttl: 60000,
        strategies: [
          {
            pattern: /^\/works\/W\d+$/,
            strategy: {
              shouldCache: () => true,
              getCacheTTL: () => 7 * 24 * 60 * 60 * 1000, // 7 days for entities
              getCacheKey: (endpoint) => `entity:${endpoint}`,
            },
          },
        ],
      });

      let callCount = 0;
      const mockRequestFn = vi.fn(async () => {
        callCount++;
        return { id: 'W123', title: 'Test Work' };
      });

      // First request - should be cache miss
      const result1 = await optimizedCache.intercept('/works/W123', {}, mockRequestFn);
      expect(result1).toEqual({ id: 'W123', title: 'Test Work' });
      expect(callCount).toBe(1);

      // Second request - should be cache hit
      const result2 = await optimizedCache.intercept('/works/W123', {}, mockRequestFn);
      expect(result2).toEqual({ id: 'W123', title: 'Test Work' });
      expect(callCount).toBe(1); // No additional call

      const stats = optimizedCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should implement cache warming for frequently accessed entities', async () => {
      const warmingData = [
        {
          endpoint: '/works/W123',
          params: {},
          data: { id: 'W123', title: 'Popular Work 1' },
        },
        {
          endpoint: '/works/W456',
          params: {},
          data: { id: 'W456', title: 'Popular Work 2' },
        },
        {
          endpoint: '/authors/A789',
          params: {},
          data: { id: 'A789', name: 'Popular Author' },
        },
      ];

      await interceptor.warmup(warmingData);

      // All warmed entities should be cache hits
      let callCount = 0;
      const mockRequestFn = vi.fn(async () => {
        callCount++;
        return null;
      });

      await interceptor.intercept('/works/W123', {}, mockRequestFn);
      await interceptor.intercept('/works/W456', {}, mockRequestFn);
      await interceptor.intercept('/authors/A789', {}, mockRequestFn);

      expect(callCount).toBe(0); // All should be cache hits
      
      const stats = interceptor.getStats();
      expect(stats.hits).toBe(3);
    });

    it('should implement intelligent cache invalidation patterns', async () => {
      const data1 = { id: 'W123', title: 'Version 1' };
      const data2 = { id: 'W123', title: 'Version 2' };

      await cache.set('/works', { id: 'W123' }, data1);
      
      // Verify initial cache
      const cached1 = await cache.get('/works', { id: 'W123' });
      expect(cached1).toEqual(data1);

      // Invalidate and update
      await cache.delete('/works', { id: 'W123' });
      await cache.set('/works', { id: 'W123' }, data2);

      // Should get updated data
      const cached2 = await cache.get('/works', { id: 'W123' });
      expect(cached2).toEqual(data2);
    });
  });

  describe('Request Deduplication and Batching', () => {
    it('should deduplicate concurrent identical requests effectively', async () => {
      let executionCount = 0;
      const slowRequestFn = vi.fn(async () => {
        executionCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 'W123', title: 'Slow Work' };
      });

      // Make 5 concurrent identical requests
      const promises = Array(5).fill(null).map(() =>
        requestManager.deduplicate('test-key', slowRequestFn)
      );

      const results = await Promise.all(promises);

      // Should only execute once
      expect(executionCount).toBe(1);
      expect(slowRequestFn).toHaveBeenCalledTimes(1);

      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual({ id: 'W123', title: 'Slow Work' });
      });

      const stats = requestManager.getStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.deduplicatedRequests).toBe(4);
      expect(stats.deduplicationHitRate).toBe(0.8);
    });

    it('should handle request timeout gracefully in deduplication', async () => {
      const timeoutManager = new RequestManager({
        requestTimeout: 50, // Very short timeout
      });

      const slowRequestFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Longer than timeout
        return { data: 'should not reach' };
      });

      await expect(
        timeoutManager.deduplicate('timeout-test', slowRequestFn)
      ).rejects.toThrow('Request timeout after 50ms');

      const stats = timeoutManager.getStats();
      expect(stats.failedRequests).toBe(1);
    });

    it('should implement batch request optimization', async () => {
      const batchRequestData = [
        { endpoint: '/works/W1', data: { id: 'W1' } },
        { endpoint: '/works/W2', data: { id: 'W2' } },
        { endpoint: '/works/W3', data: { id: 'W3' } },
        { endpoint: '/works/W4', data: { id: 'W4' } },
        { endpoint: '/works/W5', data: { id: 'W5' } },
      ];

      // Simulate batch warming
      const batchWarmupData = batchRequestData.map(item => ({
        endpoint: item.endpoint,
        params: {},
        data: item.data,
      }));

      await interceptor.warmup(batchWarmupData);

      // Verify all are cached
      let hitCount = 0;
      const mockFn = vi.fn(async () => {
        hitCount++;
        return null;
      });

      for (const item of batchRequestData) {
        await interceptor.intercept(item.endpoint, {}, mockFn);
      }

      expect(hitCount).toBe(0); // All should be cache hits
      expect(interceptor.getStats().hits).toBe(5);
    });
  });

  describe('Offline/Online Transition Handling', () => {
    it('should maintain cache functionality during offline state', async () => {
      // Simulate offline cache with only memory and localStorage
      const offlineCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: false, // Simulate IndexedDB being unavailable
      });

      const testData = { id: 'W123', title: 'Offline Work' };
      
      // Should work offline
      await offlineCache.set('/works', { id: 'offline' }, testData);
      const retrieved = await offlineCache.get('/works', { id: 'offline' });

      expect(retrieved).toEqual(testData);

      const stats = offlineCache.getStats();
      expect(stats.localStorageEntries).toBeGreaterThan(0);
    });

    it('should handle online/offline transitions smoothly', async () => {
      const transitionCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: true,
      });

      // Store data while "online"
      const onlineData = { id: 'W123', title: 'Online Work' };
      await transitionCache.set('/works', { id: 'transition' }, onlineData);

      // Verify accessible
      const retrieved1 = await transitionCache.get('/works', { id: 'transition' });
      expect(retrieved1).toEqual(onlineData);

      // Simulate going offline (disable IndexedDB)
      const offlineCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: false,
      });

      // Store new data while "offline"
      const offlineData = { id: 'W456', title: 'Offline Work' };
      await offlineCache.set('/works', { id: 'offline' }, offlineData);

      // Both should be accessible
      const retrieved2 = await offlineCache.get('/works', { id: 'offline' });
      expect(retrieved2).toEqual(offlineData);
    });

    it('should implement cache persistence across sessions', async () => {
      const sessionCache1 = new CacheManager({
        useMemory: false, // Don't use memory to simulate new session
        useLocalStorage: true,
        useIndexedDB: true,
        namespace: 'session-test',
      });

      const persistentData = { id: 'W123', title: 'Persistent Work' };
      await sessionCache1.set('/works', { id: 'persistent' }, persistentData);

      // Simulate new session (new cache instance)
      const sessionCache2 = new CacheManager({
        useMemory: false,
        useLocalStorage: true,
        useIndexedDB: true,
        namespace: 'session-test',
      });

      // Should be able to retrieve from previous session
      const retrieved = await sessionCache2.get('/works', { id: 'persistent' });
      expect(retrieved).toEqual(persistentData);
    });
  });

  describe('Enhanced Cache Analytics and Monitoring', () => {
    it('should provide comprehensive cache analytics', async () => {
      const analyticsCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: true,
      });

      // Perform various operations to generate analytics data
      await analyticsCache.set('/works', { id: '1' }, { data: 'work1' });
      await analyticsCache.set('/works', { id: '2' }, { data: 'work2' });
      await analyticsCache.set('/authors', { id: '1' }, { data: 'author1' });

      // Record some hits and misses manually for testing
      analyticsCache.recordHit();
      analyticsCache.recordHit();
      analyticsCache.recordMiss();

      const stats = analyticsCache.getStats();
      
      expect(stats.memoryEntries).toBe(3);
      expect(stats.validEntries).toBe(3);
      expect(stats.hitRate).toBe(2/3); // 2 hits, 1 miss
      expect(stats.memorySize).toBeGreaterThan(0);
      expect(stats.localStorageEntries).toBeGreaterThan(0);
    });

    it('should track request manager performance metrics', async () => {
      const performanceManager = new RequestManager({
        enableMetrics: true,
        maxConcurrentRequests: 5,
      });

      let callCount = 0;
      const timedRequestFn = vi.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        return { result: `call-${callCount}` };
      });

      // Make several requests
      await performanceManager.deduplicate('test-1', timedRequestFn);
      await performanceManager.deduplicate('test-2', timedRequestFn);
      await performanceManager.deduplicate('test-1', timedRequestFn); // Should be deduplicated if concurrent

      const stats = performanceManager.getStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.completedRequests).toBeGreaterThan(0);
      expect(stats.averageRequestDuration).toBeGreaterThan(0);
    });

    it('should implement cache performance monitoring', async () => {
      const monitoredCache = new CacheInterceptor({
        ttl: 60000,
        useMemory: true,
        useIndexedDB: true,
      });

      let requestCount = 0;
      const monitoredRequestFn = vi.fn(async () => {
        requestCount++;
        return { id: `result-${requestCount}`, timestamp: Date.now() };
      });

      // First request - cache miss (using proper work endpoint that matches entity strategy)
      await monitoredCache.intercept('/works/W123', {}, monitoredRequestFn);

      // Second request - cache hit (same endpoint and params)
      await monitoredCache.intercept('/works/W123', {}, monitoredRequestFn);

      const stats = monitoredCache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);

      // Verify the request function was only called once (cache hit prevented second call)
      expect(requestCount).toBe(1);
      expect(monitoredRequestFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should prevent memory leaks with proper cleanup', async () => {
      const leakTestCache = new CacheManager({
        useMemory: true,
        useLocalStorage: false,
        useIndexedDB: false,
      });

      // Fill cache and clear repeatedly to test for leaks
      for (let iteration = 0; iteration < 10; iteration++) {
        // Add many entries
        for (let i = 0; i < 100; i++) {
          await leakTestCache.set(`/test-${iteration}`, { id: i }, { 
            data: `iteration-${iteration}-item-${i}`,
            content: 'A'.repeat(100),
          });
        }

        // Clear cache
        await leakTestCache.clear();

        // Verify cache is truly cleared
        const stats = leakTestCache.getStats();
        expect(stats.memoryEntries).toBe(0);
        expect(stats.memorySize).toBe(0);
      }

      // Final verification - no memory should be held
      const finalStats = leakTestCache.getStats();
      expect(finalStats.memoryEntries).toBe(0);
      expect(finalStats.memorySize).toBe(0);
    });

    it('should handle circular references without memory leaks', async () => {
      const circularCache = new CacheManager({
        useMemory: true,
        useLocalStorage: false,
        useIndexedDB: false,
      });

      // Create circular reference
      const circularData: any = {
        id: 'circular',
        name: 'test',
        children: [],
      };
      circularData.parent = circularData;
      circularData.children.push(circularData);

      // Should handle circular references
      await circularCache.set('/circular', {}, circularData);
      const retrieved = await circularCache.get('/circular', {});

      expect(retrieved).toBe(circularData); // Same reference
      
      // Cleanup should work
      await circularCache.clear();
      const stats = circularCache.getStats();
      expect(stats.memoryEntries).toBe(0);
    });

    it('should implement proper request manager cleanup', async () => {
      const cleanupManager = new RequestManager({
        maxConcurrentRequests: 3,
        requestTimeout: 1000,
      });

      // Start several long-running requests
      const longRequestFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { data: 'long-request' };
      };

      const promises = [
        cleanupManager.deduplicate('long-1', longRequestFn),
        cleanupManager.deduplicate('long-2', longRequestFn),
        cleanupManager.deduplicate('long-3', longRequestFn),
      ];

      // Cancel all requests
      cleanupManager.cancelAll();

      // Verify cleanup
      const stats = cleanupManager.getStats();
      expect(stats.activeRequests).toBe(0);

      // Clear should work
      cleanupManager.clear();
      const clearedStats = cleanupManager.getStats();
      expect(clearedStats.totalRequests).toBe(0);
    });
  });

  describe('Storage Quota Management', () => {
    it('should monitor and handle storage quota limits', async () => {
      const quotaCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: true,
        localStorageLimit: 5000, // Small limit
      });

      // Try to store data exceeding localStorage limit
      const largeData = {
        id: 'large',
        content: 'A'.repeat(10000), // Exceeds localStorage limit
      };

      // Should not throw, should fallback to IndexedDB
      await expect(quotaCache.set('/large', {}, largeData)).resolves.not.toThrow();

      // Should still be retrievable
      const retrieved = await quotaCache.get('/large', {});
      expect(retrieved).toEqual(largeData);

      const stats = quotaCache.getStats();
      expect(stats.localStorageSize).toBeLessThan(stats.localStorageLimit);
    });

    it('should implement intelligent storage tier selection', async () => {
      const tieredCache = new CacheManager({
        useMemory: true,
        useLocalStorage: true,
        useIndexedDB: true,
        localStorageLimit: 2000,
      });

      // Small data should prefer localStorage
      const smallData = { id: 'small', data: 'S' };
      await tieredCache.set('/small', {}, smallData);

      // Large data should use IndexedDB
      const largeData = { id: 'large', data: 'L'.repeat(5000) };
      await tieredCache.set('/large', {}, largeData);

      // Both should be retrievable
      const retrievedSmall = await tieredCache.get('/small', {});
      const retrievedLarge = await tieredCache.get('/large', {});

      expect(retrievedSmall).toEqual(smallData);
      expect(retrievedLarge).toEqual(largeData);
    });
  });

  describe('Cache Invalidation Strategies', () => {
    it('should implement time-based invalidation', async () => {
      vi.useFakeTimers();

      const ttlCache = new CacheManager({
        ttl: 10000, // 10 seconds
        useMemory: true,
        useLocalStorage: false,
        useIndexedDB: false,
      });

      const testData = { id: 'ttl-test', data: 'expires' };
      await ttlCache.set('/ttl', {}, testData);

      // Should be available immediately
      let retrieved = await ttlCache.get('/ttl', {});
      expect(retrieved).toEqual(testData);

      // Advance time beyond TTL
      vi.advanceTimersByTime(11000);

      // Should be expired
      retrieved = await ttlCache.get('/ttl', {});
      expect(retrieved).toBeNull();

      vi.useRealTimers();
    });

    it('should implement pattern-based invalidation', async () => {
      const patternCache = new CacheInterceptor({
        ttl: 60000,
        useMemory: true,
      });

      // Add some test data
      await patternCache.warmup([
        { endpoint: '/works/W123', params: {}, data: { id: 'W123' } },
        { endpoint: '/works/W456', params: {}, data: { id: 'W456' } },
        { endpoint: '/authors/A789', params: {}, data: { id: 'A789' } },
      ]);

      // Verify cached
      let callCount = 0;
      const mockFn = vi.fn(() => {
        callCount++;
        return Promise.resolve(null);
      });

      await patternCache.intercept('/works/W123', {}, mockFn);
      expect(callCount).toBe(0); // Should be cache hit

      // Invalidate all cache (wildcard pattern)
      await patternCache.invalidate('*');

      // Should be cache miss now
      await patternCache.intercept('/works/W123', {}, mockFn);
      expect(callCount).toBe(1); // Should be cache miss
    });
  });
});

describe('Cache Integration Edge Cases', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({
      useMemory: true,
      useLocalStorage: true,
      useIndexedDB: true,
    });
  });

  describe('API Response Compatibility', () => {
    it('should handle various API response formats', async () => {
      const apiResponse: ApiResponse<Work> = {
        meta: {
          count: 1,
          db_response_time_ms: 10,
          page: 1,
          per_page: 25,
        },
        results: [{
          id: 'W123',
          title: 'Test Work',
          display_name: 'Test Work Display',
          ids: { openalex: 'W123' },
          open_access: {
            is_oa: false,
            oa_status: 'closed' as const,
            any_repository_has_fulltext: false,
          },
          authorships: [],
          countries_distinct_count: 0,
          institutions_distinct_count: 0,
          has_fulltext: false,
          cited_by_count: 0,
          is_retracted: false,
          is_paratext: false,
          locations_count: 0,
          referenced_works_count: 0,
          cited_by_api_url: 'https://api.openalex.org/works/W123/cited_by',
          counts_by_year: [],
          updated_date: '2024-01-01',
          created_date: '2024-01-01',
          publication_year: 2024,
        } as Work],
      };

      await cache.set('/works', { search: 'test' }, apiResponse);
      const retrieved = await cache.get('/works', { search: 'test' });

      expect(retrieved).toEqual(apiResponse);
    });

    it('should handle empty API responses', async () => {
      const emptyResponse: ApiResponse<Work> = {
        meta: {
          count: 0,
          db_response_time_ms: 5,
          page: 1,
          per_page: 25,
        },
        results: [],
      };

      await cache.set('/works', { search: 'nonexistent' }, emptyResponse);
      const retrieved = await cache.get('/works', { search: 'nonexistent' });

      expect(retrieved).toEqual(emptyResponse);
    });

    it('should handle nested entity relationships', async () => {
      const workWithAuthors: Work = {
        id: 'W123',
        title: 'Complex Work',
        display_name: 'Complex Work Display',
        ids: { openalex: 'W123' },
        open_access: {
          is_oa: true,
          oa_status: 'gold' as const,
          any_repository_has_fulltext: true,
        },
        authorships: [
          {
            author_position: 'first' as const,
            author: {
              id: 'A456',
              display_name: 'Author Name',
              orcid: 'https://orcid.org/0000-0000-0000-0000',
            },
            institutions: [
              {
                id: 'I789',
                display_name: 'Institution Name',
                country_code: 'US',
              },
            ],
            countries: ['US'],
            is_corresponding: true,
            raw_author_name: 'Author Name',
            raw_affiliation_strings: ['Institution Name'],
            affiliations: [
              {
                raw_affiliation_string: 'Institution Name',
                institution_ids: ['I789'],
              },
            ],
          },
        ],
        countries_distinct_count: 1,
        institutions_distinct_count: 1,
        has_fulltext: true,
        cited_by_count: 10,
        is_retracted: false,
        is_paratext: false,
        locations_count: 1,
        referenced_works_count: 5,
        cited_by_api_url: 'https://api.openalex.org/works/W123/cited_by',
        counts_by_year: [],
        updated_date: '2024-01-01',
        created_date: '2024-01-01',
        publication_year: 2024,
      };

      await cache.set('/works', { id: 'W123' }, workWithAuthors);
      const retrieved = await cache.get<Work>('/works', { id: 'W123' });

      expect(retrieved).toEqual(workWithAuthors);
      expect(retrieved?.authorships?.[0]?.author?.id).toBe('A456');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from storage errors gracefully', async () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const testData = { id: 'error-test', data: 'should work' };
      
      // Should not throw error, should fallback
      await expect(cache.set('/error', {}, testData)).resolves.not.toThrow();

      // Restore localStorage
      localStorage.setItem = originalSetItem;

      // Should still be retrievable from memory
      const retrieved = await cache.get('/error', {});
      expect(retrieved).toEqual(testData);
    });

    it('should handle corrupted cache data', async () => {
      // Manually corrupt localStorage data
      const cacheKey = 'test:corrupted:{}';
      localStorage.setItem(cacheKey, 'invalid-json-data');

      // Should handle gracefully
      const retrieved = await cache.get('corrupted', {});
      expect(retrieved).toBeNull();
    });
  });
});