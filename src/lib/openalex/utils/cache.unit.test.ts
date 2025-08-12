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
      const data = { id: 'W123' };
      await cache.set('works', {}, data);
      
      // Hit
      await cache.get('works', {});
      cache.recordHit();
      
      // Miss
      await cache.get('works', { notCached: true });
      cache.recordMiss();
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5);
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
      vi.useFakeTimers();
      
      await cache.set('works', { id: '1' }, { data: 1 });
      await cache.set('works', { id: '2' }, { data: 2 });
      
      // Advance time to expire first entry
      vi.advanceTimersByTime(30000);
      await cache.set('works', { id: '3' }, { data: 3 });
      
      // Advance time to expire second entry but not third
      vi.advanceTimersByTime(31000);
      
      const stats = cache.getStats();
      expect(stats.validEntries).toBe(1); // Only the third entry is valid
      expect(stats.memoryEntries).toBe(3); // All three still in memory
      
      vi.useRealTimers();
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
        1,
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

  it('should deduplicate concurrent requests', async () => {
    let callCount = 0;
    const requestFn = vi.fn(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 10));
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
    const requestFn1 = vi.fn(async () => ({ data: 1 }));
    const requestFn2 = vi.fn(async () => ({ data: 2 }));

    const [result1, result2] = await Promise.all([
      deduplicator.deduplicate('key1', requestFn1),
      deduplicator.deduplicate('key2', requestFn2),
    ]);

    expect(requestFn1).toHaveBeenCalledTimes(1);
    expect(requestFn2).toHaveBeenCalledTimes(1);
    expect(result1).toEqual({ data: 1 });
    expect(result2).toEqual({ data: 2 });
  });

  it('should allow sequential requests after completion', async () => {
    const requestFn = vi.fn(async () => ({ data: 'test' }));

    // First request
    await deduplicator.deduplicate('key1', requestFn);
    expect(requestFn).toHaveBeenCalledTimes(1);

    // Second request (after first completes)
    await deduplicator.deduplicate('key1', requestFn);
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('should clear pending requests', () => {
    const requestFn = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { data: 'test' };
    });

    // Start request but don't await
    deduplicator.deduplicate('key1', requestFn);

    // Clear should remove pending
    deduplicator.clear();

    // New request should proceed
    deduplicator.deduplicate('key1', requestFn);

    expect(requestFn).toHaveBeenCalledTimes(2);
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
    vi.useFakeTimers();

    const batchProcessor = vi.fn(async (items: number[]) => {
      return items.map(i => i * 2);
    });

    const queue = new BatchQueue(batchProcessor, 10, 50);

    // Add items (less than batch size)
    const promise1 = queue.add(1);
    const promise2 = queue.add(2);

    // Should not process immediately
    expect(batchProcessor).not.toHaveBeenCalled();

    // Advance time to trigger delay
    vi.advanceTimersByTime(50);

    const results = await Promise.all([promise1, promise2]);

    expect(batchProcessor).toHaveBeenCalledTimes(1);
    expect(results).toEqual([2, 4]);

    vi.useRealTimers();
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