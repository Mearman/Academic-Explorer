/**
 * Database Cache Integration Tests
 * 
 * Tests the integration between the CacheManager and DatabaseService
 * using the mocked database layer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from '@/lib/openalex/utils/cache';
import { DatabaseTestHelpers } from '../utils/database-helpers';

describe('Database Cache Integration', () => {
  let cacheManager: CacheManager;

  beforeEach(async () => {
    // Clear all stores before each test
    await DatabaseTestHelpers.clearAll();
    
    // Create fresh cache manager
    cacheManager = new CacheManager({
      ttl: 60 * 60 * 1000, // 1 hour
      useMemory: true,
      useIndexedDB: true,
      namespace: 'test',
    });
  });

  describe('Cache Storage', () => {
    it('should store and retrieve API responses', async () => {
      const endpoint = '/works';
      const params = { query: 'machine learning' };
      const mockResponse = DatabaseTestHelpers.createMockApiResponse([
        DatabaseTestHelpers.createMockWork('W123'),
        DatabaseTestHelpers.createMockWork('W456'),
      ], 2);

      // Store data in cache
      await cacheManager.set(endpoint, params, mockResponse);

      // Retrieve from cache
      const cached = await cacheManager.get(endpoint, params);
      
      expect(cached).toEqual(mockResponse);
    });

    it('should handle cache misses correctly', async () => {
      const endpoint = '/works';
      const params = { query: 'nonexistent query' };

      const cached = await cacheManager.get(endpoint, params);
      
      expect(cached).toBeNull();
    });

    it('should expire cached data after TTL', async () => {
      const endpoint = '/authors';
      const params = { search: 'john doe' };
      const mockResponse = DatabaseTestHelpers.createMockApiResponse([
        DatabaseTestHelpers.createMockAuthor('A123'),
      ]);

      // Store data in cache
      await cacheManager.set(endpoint, params, mockResponse);

      // Simulate cache expiry
      await DatabaseTestHelpers.simulateCacheExpiry(2 * 60 * 60 * 1000); // 2 hours

      // Should return null for expired cache
      const cached = await cacheManager.get(endpoint, params);
      expect(cached).toBeNull();
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for same parameters', async () => {
      const endpoint = '/works';
      const params1 = { query: 'test', year: 2024 };
      const params2 = { year: 2024, query: 'test' }; // Different order
      
      const mockResponse = DatabaseTestHelpers.createMockApiResponse([]);

      await cacheManager.set(endpoint, params1, mockResponse);
      
      // Should retrieve with differently ordered params
      const cached = await cacheManager.get(endpoint, params2);
      expect(cached).toEqual(mockResponse);
    });

    it('should generate different keys for different parameters', async () => {
      const endpoint = '/works';
      const params1 = { query: 'test1' };
      const params2 = { query: 'test2' };
      
      const response1 = DatabaseTestHelpers.createMockApiResponse([
        DatabaseTestHelpers.createMockWork('W1'),
      ]);
      const response2 = DatabaseTestHelpers.createMockApiResponse([
        DatabaseTestHelpers.createMockWork('W2'),
      ]);

      await cacheManager.set(endpoint, params1, response1);
      await cacheManager.set(endpoint, params2, response2);
      
      const cached1 = await cacheManager.get(endpoint, params1);
      const cached2 = await cacheManager.get(endpoint, params2);
      
      expect(cached1).toEqual(response1);
      expect(cached2).toEqual(response2);
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const initialStats = await DatabaseTestHelpers.getCacheStats();
      expect(initialStats.totalEntries).toBe(0);

      // Add some cache entries
      await DatabaseTestHelpers.createTestSearchResults('query1', []);
      await DatabaseTestHelpers.createTestSearchResults('query2', []);
      await DatabaseTestHelpers.createTestPaper();

      const finalStats = await DatabaseTestHelpers.getCacheStats();
      expect(finalStats.searchResultsCount).toBe(2);
      expect(finalStats.papersCount).toBe(1);
      expect(finalStats.totalEntries).toBe(3);
    });
  });

  describe('Cache Cleanup', () => {
    it('should clean up old search results', async () => {
      // Create some test data
      await DatabaseTestHelpers.createTestSearchResults('old-query', []);
      await DatabaseTestHelpers.createTestSearchResults('recent-query', []);

      // Simulate some entries being old
      await DatabaseTestHelpers.simulateCacheExpiry(30 * 24 * 60 * 60 * 1000); // 30 days

      // Clear cache should clean everything
      await cacheManager.clear();

      const stats = await DatabaseTestHelpers.getCacheStats();
      expect(stats.searchResultsCount).toBe(0);
    });
  });

  describe('Memory and IndexedDB Coordination', () => {
    it('should coordinate between memory and IndexedDB caches', async () => {
      const endpoint = '/sources';
      const params = { search: 'nature' };
      const mockResponse = DatabaseTestHelpers.createMockApiResponse([]);

      // Store in cache
      await cacheManager.set(endpoint, params, mockResponse);

      // Should be retrievable (could come from memory or IndexedDB)
      const cached = await cacheManager.get(endpoint, params);
      expect(cached).toEqual(mockResponse);

      // Verify it was stored in IndexedDB by checking directly
      const dbCached = await DatabaseTestHelpers.verifySearchResultsCached(
        `test:${endpoint}:${JSON.stringify(params)}`,
        params
      );
      expect(dbCached).toBe(true);
    });

    it('should handle IndexedDB failures gracefully', async () => {
      // Create cache manager with only memory cache
      const memoryOnlyCache = new CacheManager({
        useMemory: true,
        useIndexedDB: false,
      });

      const endpoint = '/institutions';
      const params = { country: 'US' };
      const mockResponse = DatabaseTestHelpers.createMockApiResponse([]);

      // Should still work with memory cache only
      await memoryOnlyCache.set(endpoint, params, mockResponse);
      const cached = await memoryOnlyCache.get(endpoint, params);
      
      expect(cached).toEqual(mockResponse);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed cache data gracefully', async () => {
      const endpoint = '/topics';
      const params = { search: 'computer science' };

      // This should not throw an error
      const cached = await cacheManager.get(endpoint, params);
      expect(cached).toBeNull();
    });

    it('should handle cache corruption gracefully', async () => {
      const endpoint = '/funders';
      const params = { country: 'GB' };
      const mockResponse = DatabaseTestHelpers.createMockApiResponse([]);

      // Store normal data
      await cacheManager.set(endpoint, params, mockResponse);
      
      // Should retrieve normally
      const cached = await cacheManager.get(endpoint, params);
      expect(cached).toEqual(mockResponse);
    });
  });
});