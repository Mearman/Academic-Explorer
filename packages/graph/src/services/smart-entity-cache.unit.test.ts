/**
 * SmartEntityCache Test Suite
 *
 * Tests for the SmartEntityCache system covering:
 * - Field-level caching and incremental saturation
 * - Cache management, invalidation, and eviction
 * - Error handling and edge cases
 * - Batch operations and performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { EntityType } from '../types/core';
import { SmartEntityCache, type EntityDataProvider, type FieldRequest } from './smart-entity-cache';
import { logger } from '@academic-explorer/utils';

// Mock entity data provider for testing
class MockEntityDataProvider implements EntityDataProvider {
  private responses = new Map<string, Record<string, unknown>>();
  private latency = 0;
  private failureRate = 0;

  setResponse(key: string, data: Record<string, unknown>): void {
    this.responses.set(key, data);
  }

  setLatency(ms: number): void {
    this.latency = ms;
  }

  setFailureRate(rate: number): void {
    this.failureRate = rate;
  }

  async fetchEntity(
    id: string,
    entityType: EntityType,
    fields?: string[]
  ): Promise<Record<string, unknown>> {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }

    if (Math.random() < this.failureRate) {
      throw new Error('Simulated API failure');
    }

    const key = `${entityType}:${id}`;
    const data = this.responses.get(key);

    if (!data) {
      throw new Error(`Entity ${id} not found`);
    }

    // Return only requested fields if specified
    if (!fields || fields.length === 0) {
      return data;
    }

    const filtered: Record<string, unknown> = {};
    for (const field of fields) {
      if (field in data) {
        filtered[field] = data[field];
      }
    }

    return filtered;
  }

  async fetchEntities(
    requests: Array<{ id: string; entityType: EntityType; fields?: string[] }>
  ): Promise<Array<{ id: string; data: Record<string, unknown>; error?: string }>> {
    if (this.latency > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latency));
    }

    return Promise.all(
      requests.map(async req => {
        try {
          const data = await this.fetchEntity(req.id, req.entityType, req.fields);
          return { id: req.id, data };
        } catch (error) {
          return {
            id: req.id,
            data: {},
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );
  }
}

// Test data
const mockWorkData = {
  id: 'W2741809807',
  display_name: 'Deep learning for natural language processing',
  publication_year: 2018,
  cited_by_count: 1250,
  type: 'journal-article',
  language: 'en',
  authorships: [
    { author: { id: 'A5023888391', display_name: 'John Smith' } }
  ],
  open_access: { is_oa: true },
  abstract_inverted_index: { 'Deep': [0], 'learning': [1] },
};

const mockAuthorData = {
  id: 'A5023888391',
  display_name: 'John Smith',
  works_count: 42,
  cited_by_count: 3500,
  h_index: 25,
  affiliations: [
    { institution: { id: 'I17837204', display_name: 'MIT' } }
  ],
  orcid: 'https://orcid.org/0000-0000-0000-0000',
};

// Test Suite
describe('SmartEntityCache', () => {
  let cache: SmartEntityCache;
  let provider: MockEntityDataProvider;

  beforeEach(() => {
    provider = new MockEntityDataProvider();
    cache = new SmartEntityCache(provider, { maxCacheSize: 100, defaultMaxAge: 5000 });

    // Setup mock data
    provider.setResponse('works:W2741809807', mockWorkData);
    provider.setResponse('authors:A5023888391', mockAuthorData);
  });

  afterEach(() => {
    cache.clear();
    vi.clearAllMocks();
  });

  describe('Core Functionality', () => {
    describe('Field-level caching', () => {
      it('should cache entities with requested fields', async () => {
        const fields = ['id', 'display_name', 'publication_year'];
        const result = await cache.getEntity('W2741809807', fields);

        expect(result).toBeTruthy();
        expect(result.id).toBe('W2741809807');
        expect(result.display_name).toBe('Deep learning for natural language processing');
        expect(result.publication_year).toBe(2018);
        expect(result.abstract_inverted_index).toBeUndefined();
      });

      it('should perform incremental saturation', async () => {
        // First request with minimal fields
        await cache.getEntity('W2741809807', ['id', 'display_name']);

        // Second request with more fields should add to existing entry
        const result = await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year', 'cited_by_count', 'type', 'language']);

        expect(result.id).toBe('W2741809807');
        expect(result.display_name).toBe('Deep learning for natural language processing');
        expect(result.publication_year).toBe(2018);
        expect(result.cited_by_count).toBe(1250);
        expect(result.type).toBe('journal-article');
        expect(result.language).toBe('en');
      });

      it('should detect cache hits when all fields are available', async () => {
        // Prime the cache
        await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year', 'cited_by_count']);

        // Request subset should be a cache hit (no additional API call needed)
        const startTime = Date.now();
        const result = await cache.getEntity('W2741809807', ['id', 'display_name']);
        const duration = Date.now() - startTime;

        expect(result.id).toBe('W2741809807');
        expect(result.display_name).toBe('Deep learning for natural language processing');
        expect(duration).toBeLessThan(10); // Should be very fast from cache
      });

      it('should detect cache miss when fields are not available', async () => {
        // Prime with minimal fields
        await cache.getEntity('W2741809807', ['id', 'display_name']);

        // Request more fields should require additional API call
        provider.setLatency(50); // Add latency to detect API call
        const startTime = Date.now();
        const result = await cache.getEntity('W2741809807', ['id', 'display_name', 'cited_by_count', 'authorships']);
        const duration = Date.now() - startTime;

        expect(result.id).toBe('W2741809807');
        expect(result.display_name).toBe('Deep learning for natural language processing');
        expect(result.cited_by_count).toBe(1250);
        expect(result.authorships).toBeDefined();
        expect(duration).toBeGreaterThan(40); // Should take time due to API call
      });
    });

    describe('Different field combinations', () => {
      it('should work with different field combinations for authors', async () => {
        const result = await cache.getEntity('A5023888391', ['id', 'display_name', 'works_count']);

        expect(result.id).toBe('A5023888391');
        expect(result.display_name).toBe('John Smith');
        expect(result.works_count).toBe(42);
      });

      it('should work with extended field sets', async () => {
        const result = await cache.getEntity('A5023888391', [
          'id', 'display_name', 'works_count', 'cited_by_count', 'h_index', 'affiliations'
        ]);

        expect(result.id).toBe('A5023888391');
        expect(result.display_name).toBe('John Smith');
        expect(result.works_count).toBe(42);
        expect(result.cited_by_count).toBe(3500);
        expect(result.h_index).toBe(25);
        expect(result.affiliations).toBeDefined();
      });

      it('should handle requests for all available fields', async () => {
        // Request all fields available in mock data
        const allFields = Object.keys(mockWorkData);
        const result = await cache.getEntity('W2741809807', allFields);

        // Should have all requested fields
        allFields.forEach(field => {
          expect(result).toHaveProperty(field);
        });
      });

      it('should support custom field sets', async () => {
        const customFields = ['id', 'display_name', 'orcid'];
        const result = await cache.getEntity('A5023888391', customFields);

        expect(result.id).toBe('A5023888391');
        expect(result.display_name).toBe('John Smith');
        expect(result.orcid).toBe('https://orcid.org/0000-0000-0000-0000');
      });
    });

    describe('Batch operations', () => {
      it('should handle batch requests efficiently', async () => {
        const requests: FieldRequest[] = [
          { id: 'W2741809807', entityType: 'works', fields: ['id', 'display_name'] },
          { id: 'A5023888391', entityType: 'authors', fields: ['id', 'display_name'] },
        ];

        await cache.batchEnsureFields(requests);

        // Verify both entities are cached
        const work = await cache.getEntity('W2741809807', ['id', 'display_name']);
        const author = await cache.getEntity('A5023888391', ['id', 'display_name']);

        expect(work.id).toBe('W2741809807');
        expect(work.display_name).toBe('Deep learning for natural language processing');
        expect(author.id).toBe('A5023888391');
        expect(author.display_name).toBe('John Smith');
      });

      it('should optimize batch requests by deduplicating', async () => {
        const requests: FieldRequest[] = [
          { id: 'W2741809807', entityType: 'works', fields: ['id'] },
          { id: 'W2741809807', entityType: 'works', fields: ['display_name'] },
        ];

        // Batch should merge these requests for same entity
        await cache.batchEnsureFields(requests);

        // Both fields should be available
        const result = await cache.getEntity('W2741809807', ['id', 'display_name']);
        expect(result.id).toBe('W2741809807');
        expect(result.display_name).toBe('Deep learning for natural language processing');
      });

      it('should handle prioritized requests', async () => {
        const requests: FieldRequest[] = [
          { id: 'W2741809807', entityType: 'works', fields: ['id'], priority: 1 },
          { id: 'A5023888391', entityType: 'authors', fields: ['id'], priority: 5 },
        ];

        await cache.batchEnsureFields(requests);

        // Both should be cached regardless of priority order
        const work = await cache.getEntity('W2741809807', ['id']);
        const author = await cache.getEntity('A5023888391', ['id']);

        expect(work.id).toBe('W2741809807');
        expect(author.id).toBe('A5023888391');
      });

      it('should log errors when batch operations fail', async () => {
        const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

        // Mock the fetchEntities method to throw an error
        const originalFetchEntities = provider.fetchEntities;
        provider.fetchEntities = vi.fn().mockRejectedValue(new Error('Batch operation failed'));

        const requests: FieldRequest[] = [
          { id: 'W2741809807', entityType: 'works', fields: ['id', 'display_name'] },
          { id: 'A5023888391', entityType: 'authors', fields: ['id', 'display_name'] },
        ];

        await cache.batchEnsureFields(requests);

        // Batch operations log general batch failure messages
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'cache',
          'Batch request failed for works:',
          { args: [expect.any(Error)] },
          'SmartEntityCache'
        );

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'cache',
          'Batch request failed for authors:',
          { args: [expect.any(Error)] },
          'SmartEntityCache'
        );

        // Restore original method
        provider.fetchEntities = originalFetchEntities;
        loggerErrorSpy.mockRestore();
      });
    });
  });

  describe('Cache Management', () => {
    describe('Cache invalidation', () => {
      it('should invalidate single entities', async () => {
        await cache.getEntity('W2741809807', ['id', 'display_name']);

        const invalidated = cache.evict('W2741809807');

        expect(invalidated).toBe(true);

        // Should not exist in cache
        const stats = cache.getStats();
        expect(stats.entityCount).toBe(0);
      });

      it('should clear all cached entities', async () => {
        await cache.getEntity('W2741809807', ['id', 'display_name']);
        await cache.getEntity('A5023888391', ['id', 'display_name']);

        cache.clear();

        const stats = cache.getStats();
        expect(stats.entityCount).toBe(0);
      });

      it('should invalidate specific fields', async () => {
        await cache.getEntity('W2741809807', ['id', 'display_name', 'cited_by_count']);

        cache.invalidateFields('W2741809807', ['cited_by_count']);

        // Fields should be refetched when requested again
        provider.setLatency(50);
        const startTime = Date.now();
        const result = await cache.getEntity('W2741809807', ['cited_by_count']);
        const duration = Date.now() - startTime;

        expect(result.cited_by_count).toBe(1250);
        expect(duration).toBeGreaterThan(40); // Should take time due to refetch
      });

      it('should handle invalidation of non-existent entries', () => {
        const invalidated = cache.evict('nonexistent');
        expect(invalidated).toBe(false);
      });
    });

    describe('Stale data handling', () => {
      it('should expire old entries', async () => {
        // Use short maxAge for testing
        const shortCache = new SmartEntityCache(provider, { defaultMaxAge: 100 });

        await shortCache.getEntity('W2741809807', ['id', 'display_name']);

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should refetch due to expiration
        provider.setLatency(50);
        const startTime = Date.now();
        await shortCache.getEntity('W2741809807', ['id', 'display_name']);
        const duration = Date.now() - startTime;

        expect(duration).toBeGreaterThan(40); // Should take time due to refetch
      });
    });

    describe('Cache eviction', () => {
      it('should evict LRU entries when cache is full', async () => {
        const smallCache = new SmartEntityCache(provider, { maxCacheSize: 2 });

        // Fill cache
        provider.setResponse('works:W2741809801', { id: 'W2741809801', display_name: 'Work 1' });
        provider.setResponse('works:W2741809802', { id: 'W2741809802', display_name: 'Work 2' });
        provider.setResponse('works:W2741809803', { id: 'W2741809803', display_name: 'Work 3' });

        await smallCache.getEntity('W2741809801', ['id', 'display_name']);
        await smallCache.getEntity('W2741809802', ['id', 'display_name']);

        // This should evict W2741809801 (least recently used)
        await smallCache.getEntity('W2741809803', ['id', 'display_name']);

        const stats = smallCache.getStats();
        expect(stats.entityCount).toBe(2);

        // Try to get W2741809801 - should require API call (indicating it was evicted)
        provider.setLatency(50);
        const startTime = Date.now();
        const result = await smallCache.getEntity('W2741809801', ['id']);
        const duration = Date.now() - startTime;

        expect(result.id).toBe('W2741809801');
        expect(duration).toBeGreaterThan(40); // Should take time due to API call
      });

      it('should update access times to influence LRU', async () => {
        const smallCache = new SmartEntityCache(provider, { maxCacheSize: 2 });

        provider.setResponse('works:W2741809801', { id: 'W2741809801', display_name: 'Work 1' });
        provider.setResponse('works:W2741809802', { id: 'W2741809802', display_name: 'Work 2' });
        provider.setResponse('works:W2741809803', { id: 'W2741809803', display_name: 'Work 3' });

        await smallCache.getEntity('W2741809801', ['id', 'display_name']);
        await smallCache.getEntity('W2741809802', ['id', 'display_name']);

        // Access W2741809801 again to make it more recently used
        await smallCache.getEntity('W2741809801', ['id', 'display_name']);

        // This should evict W2741809802 now (not W2741809801)
        await smallCache.getEntity('W2741809803', ['id', 'display_name']);

        // W2741809801 should still be fast to access (in cache)
        const startTime = Date.now();
        const result = await smallCache.getEntity('W2741809801', ['id', 'display_name']);
        const duration = Date.now() - startTime;

        expect(result.id).toBe('W2741809801');
        expect(duration).toBeLessThan(10); // Should be fast from cache
      });
    });
  });

  describe('Statistics and monitoring', () => {
    it('should track cache statistics', async () => {
      const initialStats = cache.getStats();
      expect(initialStats.entityCount).toBe(0);

      await cache.getEntity('W2741809807', ['id', 'display_name']);

      const statsAfterFirst = cache.getStats();
      expect(statsAfterFirst.entityCount).toBe(1);
      expect(statsAfterFirst.totalFieldsStored).toBeGreaterThan(0);
    });

    it('should track cache size and entry count', async () => {
      await cache.getEntity('W2741809807', ['id', 'display_name']);
      await cache.getEntity('A5023888391', ['id', 'display_name']);

      const stats = cache.getStats();
      expect(stats.entityCount).toBe(2);
      expect(stats.totalMemoryUsage).toBeGreaterThan(0);
      expect(stats.totalFieldsStored).toBeGreaterThan(0);
    });

    it('should track field coverage statistics', async () => {
      await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year']);

      const stats = cache.getStats();
      expect(stats.averageFieldsPerEntity).toBeGreaterThan(0);
      expect(stats.totalFieldsStored).toBe(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    describe('API failures', () => {
      it('should handle API failures gracefully', async () => {
        provider.setFailureRate(1); // Always fail

        await expect(cache.getEntity('W2741809807', ['id', 'display_name']))
          .rejects.toThrow('Simulated API failure');
      });

      it('should log errors when API failures occur', async () => {
        const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
        provider.setFailureRate(1); // Always fail

        await expect(cache.getEntity('W2741809807', ['id', 'display_name']))
          .rejects.toThrow('Simulated API failure');

        expect(loggerErrorSpy).toHaveBeenCalledWith(
          'cache',
          'Failed to fetch fields id, display_name for W2741809807:',
          { args: [expect.any(Error)] },
          'SmartEntityCache'
        );

        loggerErrorSpy.mockRestore();
      });

      it('should fall back to cached data on API failure', async () => {
        // Prime cache first
        await cache.getEntity('W2741809807', ['id', 'display_name']);

        // Set up failure for additional fields
        provider.setFailureRate(1);

        // Request cached fields - should work
        const result = await cache.getEntity('W2741809807', ['id', 'display_name']);

        expect(result).toBeTruthy();
        expect(result.display_name).toBe('Deep learning for natural language processing');

        // But requesting new fields should fail
        await expect(cache.getEntity('W2741809807', ['cited_by_count']))
          .rejects.toThrow('Simulated API failure');
      });
    });

    describe('Malformed data handling', () => {
      it('should handle missing entities', async () => {
        // Don't set any response for this entity
        await expect(cache.getEntity('NONEXISTENT', ['id', 'display_name']))
          .rejects.toThrow('Entity NONEXISTENT not found');
      });

      it('should handle incomplete data', async () => {
        provider.setResponse('works:W1234567890', { id: 'W1234567890' }); // Missing display_name

        const result = await cache.getEntity('W1234567890', ['id', 'display_name']);

        expect(result.id).toBe('W1234567890');
        expect(result.display_name).toBeUndefined();
      });
    });

    describe('Network timeout scenarios', () => {
      it('should handle slow API responses', async () => {
        provider.setLatency(100);

        const startTime = Date.now();
        const result = await cache.getEntity('W2741809807', ['id', 'display_name']);
        const duration = Date.now() - startTime;

        expect(result).toBeTruthy();
        expect(result.id).toBe('W2741809807');
        expect(duration).toBeGreaterThanOrEqual(90); // Account for test timing variations
      });
    });

    describe('Memory management', () => {
      it('should manage memory efficiently', () => {
        const initialStats = cache.getStats();
        expect(initialStats.totalMemoryUsage).toBe(0);
      });

      it('should clear all data on clear()', async () => {
        await cache.getEntity('W2741809807', ['id', 'display_name']);

        cache.clear();

        const stats = cache.getStats();
        expect(stats.entityCount).toBe(0);
        expect(stats.totalMemoryUsage).toBe(0);
        expect(stats.totalFieldsStored).toBe(0);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    describe('UI rendering workflow', () => {
      it('should efficiently handle typical UI rendering pattern', async () => {
        // Simulate typical Academic Explorer workflow:
        // 1. Search results (minimal fields)
        // 2. Detail view (more fields)
        // 3. Graph traversal (relationships)

        // 1. Search results - get basic info
        const searchResult = await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year']);
        expect(searchResult.display_name).toBe('Deep learning for natural language processing');

        // 2. Detail view - get additional fields (should be incremental)
        provider.setLatency(50);
        const startTime = Date.now();
        const detailResult = await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year', 'cited_by_count', 'authorships']);
        const duration = Date.now() - startTime;

        expect(detailResult.display_name).toBe('Deep learning for natural language processing');
        expect(detailResult.authorships).toBeDefined();
        expect(duration).toBeGreaterThan(40); // Should take time for new fields

        // 3. Graph traversal - should be fast from cache
        provider.setLatency(0);
        const traversalStart = Date.now();
        const traversalResult = await cache.getEntity('W2741809807', ['id', 'display_name']);
        const traversalDuration = Date.now() - traversalStart;

        expect(traversalResult.display_name).toBe('Deep learning for natural language processing');
        expect(traversalDuration).toBeLessThan(10); // Should be fast from cache
      });
    });

    describe('Graph analysis workflow', () => {
      it('should handle batch analysis efficiently', async () => {
        provider.setResponse('works:W2741809801', { id: 'W2741809801', display_name: 'Work 1', cited_by_count: 100 });
        provider.setResponse('works:W2741809802', { id: 'W2741809802', display_name: 'Work 2', cited_by_count: 200 });
        provider.setResponse('works:W2741809803', { id: 'W2741809803', display_name: 'Work 3', cited_by_count: 300 });

        const analysisRequests: FieldRequest[] = [
          { id: 'W2741809801', entityType: 'works', fields: ['id', 'display_name', 'cited_by_count'] },
          { id: 'W2741809802', entityType: 'works', fields: ['id', 'display_name', 'cited_by_count'] },
          { id: 'W2741809803', entityType: 'works', fields: ['id', 'display_name', 'cited_by_count'] },
        ];

        await cache.batchEnsureFields(analysisRequests);

        // Verify all entities are cached with analysis fields
        const results = await Promise.all([
          cache.getEntity('W2741809801', ['id', 'display_name', 'cited_by_count']),
          cache.getEntity('W2741809802', ['id', 'display_name', 'cited_by_count']),
          cache.getEntity('W2741809803', ['id', 'display_name', 'cited_by_count'])
        ]);

        expect(results).toHaveLength(3);
        expect(results[0].cited_by_count).toBe(100);
        expect(results[1].cited_by_count).toBe(200);
        expect(results[2].cited_by_count).toBe(300);
      });
    });

    describe('Mixed field operations', () => {
      it('should handle different field sets for same entity efficiently', async () => {
        // Start with basic fields
        await cache.getEntity('A5023888391', ['id', 'display_name']);

        // Add more fields gradually
        await cache.getEntity('A5023888391', ['id', 'display_name', 'works_count']);

        // Add analysis fields - should be incremental
        provider.setLatency(50);
        const startTime = Date.now();
        const analysisResult = await cache.getEntity('A5023888391', ['id', 'display_name', 'works_count', 'h_index', 'cited_by_count']);
        const duration = Date.now() - startTime;

        // Should have all fields
        expect(analysisResult.display_name).toBe('John Smith');
        expect(analysisResult.works_count).toBe(42);
        expect(analysisResult.h_index).toBe(25);
        expect(analysisResult.cited_by_count).toBe(3500);
        expect(duration).toBeGreaterThan(40); // Should take time for new fields only
      });
    });

    describe('High-load scenarios', () => {
      it('should maintain performance under concurrent requests', async () => {
        const concurrentRequests = Array.from({ length: 50 }, (_, i) => {
          const workId = `W${(i + 2741809801).toString()}`;
          provider.setResponse(`works:${workId}`, {
            id: workId,
            display_name: `Work ${i}`,
            publication_year: 2020 + (i % 5)
          });
          return cache.getEntity(workId, ['id', 'display_name', 'publication_year']);
        });

        const startTime = Date.now();
        const results = await Promise.all(concurrentRequests);
        const duration = Date.now() - startTime;

        expect(results.every(r => r !== null)).toBe(true);
        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

        const stats = cache.getStats();
        expect(stats.entityCount).toBe(50);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should demonstrate cache performance improvement', async () => {
      provider.setLatency(50); // Simulate API latency

      // Measure without cache (cold)
      const coldStartTime = Date.now();
      await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year']);
      const coldDuration = Date.now() - coldStartTime;

      // Measure with cache (warm)
      const warmStartTime = Date.now();
      await cache.getEntity('W2741809807', ['id', 'display_name', 'publication_year']);
      const warmDuration = Date.now() - warmStartTime;

      // Cache should be significantly faster
      expect(warmDuration).toBeLessThan(coldDuration / 2);
      expect(warmDuration).toBeLessThan(10); // Should be nearly instant
    });

    it('should maintain good batch efficiency', async () => {
      // Setup multiple entities
      const workIds = Array.from({ length: 10 }, (_, i) => `W${(i + 2741809801).toString()}`);
      for (let i = 0; i < 10; i++) {
        const workId = workIds[i];
        provider.setResponse(`works:${workId}`, {
          id: workId,
          display_name: `Work ${i}`
        });
      }

      const batchRequests: FieldRequest[] = workIds.map(workId => ({
        id: workId,
        entityType: 'works' as EntityType,
        fields: ['id', 'display_name'],
      }));

      const startTime = Date.now();
      await cache.batchEnsureFields(batchRequests);
      const duration = Date.now() - startTime;

      // Should complete efficiently
      expect(duration).toBeLessThan(1000);

      // Verify all entities are cached
      const results = await Promise.all(
        workIds.map(workId =>
          cache.getEntity(workId, ['id', 'display_name'])
        )
      );

      expect(results.every(r => r !== null)).toBe(true);
    });

    it('should maintain memory efficiency', async () => {
      const initialStats = cache.getStats();
      const initialMemoryBaseline = initialStats.totalMemoryUsage;

      // Add many entries
      for (let i = 0; i < 50; i++) {
        const workId = `W${(i + 2741809801).toString()}`;
        provider.setResponse(`works:${workId}`, {
          id: workId,
          display_name: `Work ${i}`.repeat(10) // Larger data
        });
        await cache.getEntity(workId, ['id', 'display_name']);
      }

      const finalStats = cache.getStats();
      const memoryGrowth = finalStats.totalMemoryUsage - initialMemoryBaseline;

      // Memory growth should be reasonable (less than 100KB for 50 entries)
      expect(memoryGrowth).toBeLessThan(100000);
      expect(finalStats.entityCount).toBeLessThanOrEqual(50);
    });
  });
});

// Missing fields functionality test
describe('SmartEntityCache - Missing Fields', () => {
  let cache: SmartEntityCache;
  let provider: MockEntityDataProvider;

  beforeEach(() => {
    provider = new MockEntityDataProvider();
    cache = new SmartEntityCache(provider);
    provider.setResponse('works:W2741809123', {
      id: 'W2741809123',
      display_name: 'Test Work',
      publication_year: 2023,
      cited_by_count: 42
    });
  });

  it('should correctly identify missing fields', () => {
    // No cached entry yet
    const missing1 = cache.getMissingFields(undefined, ['id', 'display_name']);
    expect(missing1).toEqual(['id', 'display_name']);
  });

  it('should refresh specific fields', async () => {
    // Prime cache
    await cache.getEntity('W2741809123', ['id', 'display_name']);

    // Change mock data
    provider.setResponse('works:W2741809123', {
      id: 'W2741809123',
      display_name: 'Updated Test Work', // Changed
      publication_year: 2023,
      cited_by_count: 42
    });

    // Refresh specific fields
    await cache.refreshFields('W2741809123', ['display_name']);

    // Should have updated data
    const result = await cache.getEntity('W2741809123', ['id', 'display_name']);
    expect(result.display_name).toBe('Updated Test Work');
  });
});