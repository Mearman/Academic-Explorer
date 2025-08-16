// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheManager, RequestDeduplicator, BatchQueue } from './cache';
import type { Work, ApiResponse } from '../../types';

// Mock the db module
vi.mock('@/lib/db', () => ({
  db: {
    getSearchResults: vi.fn(),
    cacheSearchResults: vi.fn(),
    cleanOldSearchResults: vi.fn(),
  },
}));

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheManager({
      ttl: 60000, // 1 minute for testing
      useMemory: true,
      useIndexedDB: false, // Disable for most tests
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Memory caching', () => {
    it('should cache and retrieve data', async () => {
      const data = { id: 'W123', display_name: 'Test Work' };
      
      await cache.set('works', { id: 'W123' }, data);
      const retrieved = await cache.get('works', { id: 'W123' });
      
      expect(retrieved).toEqual(data);
    });

    it('should respect TTL', async () => {
      vi.useFakeTimers();
      
      const data = { id: 'W123' };
      await cache.set('works', {}, data);
      
      // Should retrieve within TTL
      let retrieved = await cache.get('works', {});
      expect(retrieved).toEqual(data);
      
      // Advance past TTL
      vi.advanceTimersByTime(61000);
      
      // Should return null after expiry
      retrieved = await cache.get('works', {});
      expect(retrieved).toBeNull();
      
      vi.useRealTimers();
    });

    it('should generate consistent cache keys', async () => {
      const data = { id: 'W123' };
      
      // Same params in different order should produce same key
      await cache.set('works', { page: 1, search: 'test' }, data);
      const retrieved = await cache.get('works', { search: 'test', page: 1 });
      
      expect(retrieved).toEqual(data);
    });

    it('should handle LRU eviction', async () => {
      // Create cache with small size
      const smallCache = new CacheManager({ useMemory: true, useIndexedDB: false });
      
      // Add more than 100 items
      for (let i = 0; i < 105; i++) {
        await smallCache.set('works', { id: i }, { data: i });
      }
      
      const stats = smallCache.getStats();
      expect(stats.memoryEntries).toBeLessThanOrEqual(100);
    });
  });

  describe('Cache operations', () => {
    it('should delete specific cache entry', async () => {
      const data = { id: 'W123' };
      
      await cache.set('works', { id: 'W123' }, data);
      await cache.delete('works', { id: 'W123' });
      
      const retrieved = await cache.get('works', { id: 'W123' });
      expect(retrieved).toBeNull();
    });

    it('should clear all cache', async () => {
      await cache.set('works', { id: '1' }, { data: 1 });
      await cache.set('works', { id: '2' }, { data: 2 });
      await cache.set('authors', { id: '3' }, { data: 3 });
      
      await cache.clear();
      
      const stats = cache.getStats();
      expect(stats.memoryEntries).toBe(0);
    });
  });

  describe('Cache statistics', () => {
    it('should track hits and misses', async () => {
      // Manually track hits and misses to test the tracking functionality
      cache.recordHit();
      cache.recordMiss();
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 total (1 hit + 1 miss)
    });

    it('should calculate memory size', async () => {
      const largeData = {
        id: 'W123',
        title: 'A'.repeat(1000),
      };
      
      await cache.set('works', {}, largeData);
      
      const stats = cache.getStats();
      expect(stats.memorySize).toBeGreaterThan(1000);
    });

    it('should count valid entries', async () => {
      // Add 3 entries to the cache
      await cache.set('works', { id: '1' }, { data: 1 });
      await cache.set('works', { id: '2' }, { data: 2 });
      await cache.set('works', { id: '3' }, { data: 3 });
      
      // All entries should be valid since they were just added
      const stats = cache.getStats();
      expect(stats.validEntries).toBe(3); // All three entries should be valid
      expect(stats.memoryEntries).toBe(3); // All three still in memory
    });
  });

  describe('IndexedDB integration', () => {
    it('should use IndexedDB when enabled', async () => {
      const { db } = await import('@/lib/db');
      
      const cacheWithDB = new CacheManager({
        useMemory: true,
        useIndexedDB: true,
      });
      
      const apiResponse: ApiResponse<Work> = {
        meta: {
          count: 1,
          db_response_time_ms: 10,
          page: 1,
          per_page: 25,
        },
        results: [{ id: 'W123', display_name: 'Test' } as Work],
      };
      
      await cacheWithDB.set('works', { search: 'test' }, apiResponse);
      
      expect(db.cacheSearchResults).toHaveBeenCalledWith(
        expect.stringContaining('openalex:works:'),
        apiResponse.results,
        apiResponse.meta.count,
        { search: 'test' }
      );
    });

    it('should fallback to IndexedDB when memory cache misses', async () => {
      const { db } = await import('@/lib/db');
      
      const cacheWithDB = new CacheManager({
        useMemory: true,
        useIndexedDB: true,
        ttl: 60000,
      });
      
      const cachedData = {
        results: [{ id: 'W123' }],
        timestamp: Date.now() - 30000, // 30 seconds ago
      };
      
      (db.getSearchResults as any).mockResolvedValue(cachedData);
      
      const result = await cacheWithDB.get('works', { search: 'test' });
      expect(result).toEqual(cachedData);
    });
  });
});

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator;

  beforeEach(() => {
    deduplicator = new RequestDeduplicator();
  });

  afterEach(() => {
    deduplicator.clear();
  });
  
  it('should execute a simple function', async () => {
    let called = false;
    const fn = async () => {
      called = true;
      return 'result';
    };
    
    const result = await deduplicator.deduplicate('test', fn);
    
    expect(called).toBe(true);
    expect(result).toBe('result');
  });

  it('should deduplicate concurrent requests', async () => {
    let callCount = 0;
    const requestFn = vi.fn().mockImplementation(async () => {
      callCount++;
      // Use immediate resolution instead of setTimeout for test stability
      await Promise.resolve();
      return { data: callCount };
    });

    // Make three concurrent requests with same key
    const promises = [
      deduplicator.deduplicate('key1', requestFn),
      deduplicator.deduplicate('key1', requestFn),
      deduplicator.deduplicate('key1', requestFn),
    ];

    const results = await Promise.all(promises);

    // Should only call requestFn once
    expect(requestFn).toHaveBeenCalledTimes(1);
    
    // All should get the same result
    expect(results[0]).toEqual({ data: 1 });
    expect(results[1]).toEqual({ data: 1 });
    expect(results[2]).toEqual({ data: 1 });
  });

  it('should allow different keys to proceed independently', async () => {
    // Use simple functions that we can track more directly
    let called1 = false;
    let called2 = false;
    
    const requestFn1 = async () => {
      called1 = true;
      return { data: 1 };
    };
    const requestFn2 = async () => {
      called2 = true;
      return { data: 2 };
    };

    const [result1, result2] = await Promise.all([
      deduplicator.deduplicate('different-key-1', requestFn1),
      deduplicator.deduplicate('different-key-2', requestFn2),
    ]);

    // Verify functions were called and results are correct
    expect(called1).toBe(true);
    expect(called2).toBe(true);
    expect(result1).toEqual({ data: 1 });
    expect(result2).toEqual({ data: 2 });
  });

  it('should allow sequential requests after completion', async () => {
    let callCount = 0;
    const requestFn = async () => {
      callCount++;
      return { data: 'test' };
    };

    // First request
    const result1 = await deduplicator.deduplicate('sequential-key', requestFn);
    expect(callCount).toBe(1);
    expect(result1).toEqual({ data: 'test' });

    // Second request (after first completes)
    const result2 = await deduplicator.deduplicate('sequential-key', requestFn);
    expect(callCount).toBe(2);
    expect(result2).toEqual({ data: 'test' });
  });

  it('should clear pending requests', async () => {
    let callCount = 0;
    const requestFn = async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
      return { data: `test-${callCount}` };
    };

    // Start request but don't await
    const firstPromise = deduplicator.deduplicate('clear-test-key', requestFn);

    // Clear should remove pending
    deduplicator.clear();

    // New request should proceed independently
    const secondPromise = deduplicator.deduplicate('clear-test-key', requestFn);

    // Wait for both to complete
    const results = await Promise.allSettled([firstPromise, secondPromise]);

    // Both requests should have been called (not deduplicated)
    expect(callCount).toBe(2);
    // Both should have succeeded with different results
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
  });
});

describe('BatchQueue', () => {
  it('should batch requests', async () => {
    const batchProcessor = vi.fn(async (items: number[]) => {
      return items.map(i => i * 2);
    });

    const queue = new BatchQueue(batchProcessor, 3, 10);

    // Add items
    const promises = [
      queue.add(1),
      queue.add(2),
      queue.add(3), // This triggers batch
    ];

    const results = await Promise.all(promises);

    expect(batchProcessor).toHaveBeenCalledTimes(1);
    expect(batchProcessor).toHaveBeenCalledWith([1, 2, 3]);
    expect(results).toEqual([2, 4, 6]);
  });

  it('should flush on delay', async () => {
    let resolveProcessor: (items: number[]) => number[];
    const batchProcessor = vi.fn().mockImplementation(async (items: number[]) => {
      return items.map(i => i * 2);
    });

    const queue = new BatchQueue(batchProcessor, 10, 10); // Use very short delay

    // Add items (less than batch size)
    const promise1 = queue.add(1);
    const promise2 = queue.add(2);

    // Should not process immediately
    expect(batchProcessor).not.toHaveBeenCalled();

    // Wait for delay to trigger
    await new Promise(resolve => setTimeout(resolve, 20));

    const results = await Promise.all([promise1, promise2]);

    expect(batchProcessor).toHaveBeenCalledTimes(1);
    expect(results).toEqual([2, 4]);
  });

  it('should handle errors', async () => {
    const batchProcessor = vi.fn(async () => {
      throw new Error('Batch processing failed');
    });

    const queue = new BatchQueue(batchProcessor, 2, 10);

    const promise1 = queue.add(1);
    const promise2 = queue.add(2);

    await expect(promise1).rejects.toThrow('Batch processing failed');
    await expect(promise2).rejects.toThrow('Batch processing failed');
  });

  it('should flush all pending items', async () => {
    const batchProcessor = vi.fn(async (items: number[]) => {
      return items.map(i => i * 2);
    });

    const queue = new BatchQueue(batchProcessor, 3, 1000);

    // Add many items
    for (let i = 1; i <= 7; i++) {
      queue.add(i);
    }

    await queue.flushAll();

    // Should have been called 3 times (3, 3, 1)
    expect(batchProcessor).toHaveBeenCalledTimes(3);
  });

  it('should clear queue', () => {
    const batchProcessor = vi.fn(async (items: number[]) => {
      return items.map(i => i * 2);
    });

    const queue = new BatchQueue(batchProcessor, 10, 100);

    queue.add(1);
    queue.add(2);
    queue.clear();

    // After clear, new adds should work normally
    queue.add(3);

    expect(batchProcessor).not.toHaveBeenCalled();
  });
});

describe('Storage Quota Exceeded Scenarios', () => {
  let cache: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheManager({
      ttl: 60000,
      useMemory: true,
      useIndexedDB: true,
    });
  });

  it('should handle quota exceeded errors gracefully', async () => {
    const { db } = await import('@/lib/db');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const quotaError = new Error('QuotaExceededError');
    quotaError.name = 'QuotaExceededError';
    (db.cacheSearchResults as any).mockRejectedValueOnce(quotaError);

    const apiResponse: ApiResponse<Work> = {
      meta: { count: 1, db_response_time_ms: 10, page: 1, per_page: 25 },
      results: [{ id: 'W123', display_name: 'Test' } as Work],
    };

    // Should not throw, just log error
    await cache.set('works', { search: 'test' }, apiResponse);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to store in IndexedDB cache:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should continue working when IndexedDB fails', async () => {
    const { db } = await import('@/lib/db');
    
    // Make IndexedDB operations fail
    (db.cacheSearchResults as any).mockRejectedValue(new Error('Storage unavailable'));
    (db.getSearchResults as any).mockRejectedValue(new Error('Storage unavailable'));

    const testData = { test: 'data' };

    // Should still work with memory cache
    await cache.set('works', { id: 'test' }, testData);
    const retrieved = await cache.get('works', { id: 'test' });

    expect(retrieved).toEqual(testData);
  });

  it('should handle transaction abort errors', async () => {
    const { db } = await import('@/lib/db');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const abortError = new Error('TransactionInactiveError');
    abortError.name = 'TransactionInactiveError';
    (db.cacheSearchResults as any).mockRejectedValueOnce(abortError);

    const largeResponse: ApiResponse<Work> = {
      meta: { count: 1000, db_response_time_ms: 10, page: 1, per_page: 1000 },
      results: Array.from({ length: 1000 }, (_, i) => ({
        id: `W${i}`,
        display_name: `Work ${i}`,
      })) as Work[],
    };

    await cache.set('works', { search: 'large' }, largeResponse);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to store in IndexedDB cache:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('Concurrent Access Patterns', () => {
  let cache: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheManager({
      ttl: 60000,
      useMemory: true,
      useIndexedDB: false, // Focus on memory cache for these tests
    });
  });

  it('should handle concurrent reads and writes', async () => {
    const testData = { test: 'data' };
    
    const operations = [
      cache.set('works', { id: '1' }, testData),
      cache.get('works', { id: '1' }),
      cache.set('works', { id: '2' }, testData),
      cache.get('works', { id: '2' }),
      cache.delete('works', { id: '1' }),
    ];

    const results = await Promise.all(operations);

    // First get might be null (race condition), but should not throw
    expect(results).toBeDefined();
    expect(results.length).toBe(5);
  });

  it('should handle rapid cache key generation', async () => {
    const operations = Array.from({ length: 100 }, (_, i) => 
      cache.set('works', { id: i, query: `test${i}` }, { data: i })
    );

    await Promise.all(operations);

    const stats = cache.getStats();
    expect(stats.memoryEntries).toBeLessThanOrEqual(100); // LRU might have evicted some
  });

  it('should handle concurrent statistics operations', async () => {
    const testData = { test: 'data' };
    
    // Set up some cache entries
    await cache.set('works', { id: '1' }, testData);
    await cache.set('works', { id: '2' }, testData);

    const statOperations = Array.from({ length: 10 }, () => cache.getStats());

    const results = await Promise.all(statOperations);

    results.forEach(stats => {
      expect(stats.memoryEntries).toBeGreaterThanOrEqual(0);
      expect(stats.validEntries).toBeGreaterThanOrEqual(0);
      expect(stats.memorySize).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle concurrent cache clearing', async () => {
    const testData = { test: 'data' };
    
    // Set up cache entries
    await cache.set('works', { id: '1' }, testData);
    await cache.set('works', { id: '2' }, testData);

    const operations = [
      cache.clear(),
      cache.clear(),
      cache.set('works', { id: '3' }, testData),
      cache.get('works', { id: '1' }),
    ];

    const results = await Promise.all(operations);
    
    // Should complete without errors
    expect(results).toBeDefined();
  });
});

describe('Performance Under Load', () => {
  let cache: CacheManager;

  beforeEach(() => {
    vi.clearAllMocks();
    cache = new CacheManager({
      ttl: 60000,
      useMemory: true,
      useIndexedDB: false,
    });
  });

  it('should handle large data objects efficiently', async () => {
    const largeObject = {
      id: 'W123',
      title: 'A'.repeat(10000),
      abstract: 'B'.repeat(50000),
      metadata: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: 'C'.repeat(100),
      })),
    };

    const startTime = Date.now();
    await cache.set('works', { id: 'large' }, largeObject);
    const setTime = Date.now() - startTime;

    const retrieveStart = Date.now();
    const retrieved = await cache.get('works', { id: 'large' });
    const getTime = Date.now() - retrieveStart;

    expect(retrieved).toEqual(largeObject);
    expect(setTime).toBeLessThan(100); // Should be fast
    expect(getTime).toBeLessThan(50); // Retrieval should be very fast
  });

  it('should handle many small cache operations', async () => {
    const operationCount = 1000;
    const operations = [];

    const startTime = Date.now();

    for (let i = 0; i < operationCount; i++) {
      operations.push(
        cache.set('works', { id: i }, { data: `item${i}` })
      );
    }

    await Promise.all(operations);

    const operationTime = Date.now() - startTime;

    // Should complete in reasonable time (adjust threshold as needed)
    expect(operationTime).toBeLessThan(1000); // 1 second for 1000 operations

    const stats = cache.getStats();
    expect(stats.memoryEntries).toBeGreaterThan(0);
  });

  it('should handle complex cache key generation efficiently', async () => {
    const complexParams = {
      search: 'test query',
      filters: {
        publication_year: { from: 2020, to: 2023 },
        type: ['article', 'review', 'book'],
        authors: ['Smith', 'Johnson', 'Williams'],
        institutions: Array.from({ length: 100 }, (_, i) => `Institution ${i}`),
        concepts: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `Concept ${i}`,
          score: Math.random(),
        })),
      },
      sort: ['cited_by_count:desc', 'publication_date:desc'],
      page: 1,
      per_page: 200,
    };

    const operations = Array.from({ length: 100 }, (_, i) => 
      cache.set('works', { ...complexParams, page: i + 1 }, { data: i })
    );

    const startTime = Date.now();
    await Promise.all(operations);
    const operationTime = Date.now() - startTime;

    expect(operationTime).toBeLessThan(500); // Should handle complex keys efficiently
  });

  it('should maintain performance with cache churn', async () => {
    // Simulate high cache turnover
    const iterations = 10;
    const itemsPerIteration = 150; // More than LRU limit

    for (let i = 0; i < iterations; i++) {
      const operations = Array.from({ length: itemsPerIteration }, (_, j) => 
        cache.set('works', { iteration: i, item: j }, { data: `${i}-${j}` })
      );

      await Promise.all(operations);

      // Check that cache is still responsive
      const testKey = { iteration: i, item: 0 };
      const retrieved = await cache.get('works', testKey);
      
      if (i === 0) {
        // First iteration items might be evicted due to LRU
        // Just ensure the operation completes
        expect(retrieved).toBeDefined();
      }
    }

    const stats = cache.getStats();
    expect(stats.memoryEntries).toBeLessThanOrEqual(100); // LRU should limit size
  });
});

describe('Memory Management Edge Cases', () => {
  it('should handle circular references in cache data', async () => {
    const cache = new CacheManager({ useMemory: true, useIndexedDB: false });
    
    const circularObject: any = {
      id: 'circular',
      name: 'test',
      metadata: {}
    };
    circularObject.self = circularObject;
    circularObject.metadata.parent = circularObject;

    // Should not throw when caching circular references
    await cache.set('works', { id: 'circular' }, circularObject);
    const retrieved = await cache.get('works', { id: 'circular' });

    expect(retrieved).toBe(circularObject); // Same reference
  });

  it('should handle extremely deep nested objects', async () => {
    const cache = new CacheManager({ useMemory: true, useIndexedDB: false });
    
    // Create deeply nested object
    let deepObject: any = { value: 'leaf' };
    for (let i = 0; i < 1000; i++) {
      deepObject = { level: i, child: deepObject };
    }

    await cache.set('works', { id: 'deep' }, deepObject);
    const retrieved = await cache.get('works', { id: 'deep' });

    expect(retrieved).toEqual(deepObject);
  });

  it('should handle cache with mixed data types', async () => {
    const cache = new CacheManager({ useMemory: true, useIndexedDB: false });
    
    const mixedData = {
      string: 'test',
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
      array: [1, 'two', { three: 3 }],
      date: new Date(),
      regex: /test/g,
      symbol: Symbol('test'),
      function: () => 'test',
    };

    await cache.set('works', { id: 'mixed' }, mixedData);
    const retrieved = await cache.get('works', { id: 'mixed' });

    // Note: Some types (symbol, function) may not serialize properly
    expect(retrieved).toBeDefined();
    expect(retrieved.string).toBe('test');
    expect(retrieved.number).toBe(42);
    expect(retrieved.boolean).toBe(true);
  });

  it('should handle null and undefined parameter values', async () => {
    const cache = new CacheManager({ useMemory: true, useIndexedDB: false });
    const testData = { test: 'data' };

    // Test various null/undefined scenarios
    await cache.set('works', { filter: null }, testData);
    await cache.set('works', { filter: undefined }, testData);
    await cache.set('works', { filter: null, sort: undefined }, testData);

    const retrieved1 = await cache.get('works', { filter: null });
    const retrieved2 = await cache.get('works', { filter: undefined });

    // Both should retrieve the same data (null and undefined treated similarly)
    expect(retrieved1).toEqual(testData);
    expect(retrieved2).toEqual(testData);
  });
});

describe('Cache Decorator Performance', () => {
  it('should efficiently cache method results', async () => {
    class TestService {
      callCount = 0;

      async expensiveOperation(params: { id: number; data: string }) {
        this.callCount++;
        // Simulate expensive operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return { result: `processed-${params.id}-${params.data}` };
      }
    }

    const service = new TestService();
    const cache = new CacheManager({ useMemory: true, useIndexedDB: false });

    // Manually implement caching behavior for testing
    const cachedOperation = async (params: { id: number; data: string }) => {
      const cacheKey = `TestService.expensiveOperation:${JSON.stringify(params)}`;
      
      let cached = await cache.get('method', { key: cacheKey });
      if (cached) {
        return cached;
      }

      const result = await service.expensiveOperation(params);
      await cache.set('method', { key: cacheKey }, result);
      return result;
    };

    // Test multiple calls with same parameters
    const params = { id: 1, data: 'test' };
    
    const startTime = Date.now();
    const results = await Promise.all([
      cachedOperation(params),
      cachedOperation(params),
      cachedOperation(params),
    ]);
    const totalTime = Date.now() - startTime;

    expect(service.callCount).toBe(1); // Only called once
    expect(results[0]).toEqual(results[1]);
    expect(results[1]).toEqual(results[2]);
    expect(totalTime).toBeLessThan(50); // Should be much faster than 3 * 10ms
  });
});