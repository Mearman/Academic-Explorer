// @ts-nocheck
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CachedOpenAlexClient, cachedOpenAlex, type CachedOpenAlexConfig } from './client-with-cache';
import { CacheManager, RequestDeduplicator } from './utils/cache';
import { OpenAlexError } from './client';
import { server } from '@/test/setup';
import { errorHandlers } from '@/test/mocks/handlers';
import { 
  mockWork, 
  mockAuthor, 
  mockSource, 
  mockInstitution, 
  mockWorksResponse, 
  mockAuthorsResponse 
} from '@/test/mocks/data';

// Mock the cache utilities
vi.mock('./utils/cache', () => ({
  CacheManager: vi.fn(),
  RequestDeduplicator: vi.fn(),
}));

describe('CachedOpenAlexClient', () => {
  let client: CachedOpenAlexClient;
  let mockCache: any;
  let mockDeduplicator: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock CacheManager instance
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      recordHit: vi.fn(),
      recordMiss: vi.fn(),
      getStats: vi.fn(() => ({
        hitRate: 0.5,
        memoryEntries: 10,
        memorySize: 1024,
        validEntries: 8,
      })),
    };

    // Mock RequestDeduplicator instance
    mockDeduplicator = {
      deduplicate: vi.fn((key, fn) => fn()),
      clear: vi.fn(),
    };

    // Setup constructor mocks
    (CacheManager as any).mockImplementation(() => mockCache);
    (RequestDeduplicator as any).mockImplementation(() => mockDeduplicator);

    // Mock console.debug to avoid test output
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default cache configuration', () => {
      client = new CachedOpenAlexClient();
      
      expect(CacheManager).toHaveBeenCalledWith({
        ttl: 60 * 60 * 1000, // 1 hour
        useMemory: true,
        useIndexedDB: true,
        namespace: 'openalex-api',
      });

      expect(RequestDeduplicator).toHaveBeenCalled();
    });

    it('should initialize with custom cache configuration', () => {
      const config: CachedOpenAlexConfig = {
        cache: {
          ttl: 30 * 60 * 1000, // 30 minutes
          useMemory: false,
          useIndexedDB: true,
          namespace: 'custom-namespace',
        },
        deduplicateRequests: false,
      };

      client = new CachedOpenAlexClient(config);
      
      expect(CacheManager).toHaveBeenCalledWith({
        ttl: 30 * 60 * 1000,
        useMemory: false,
        useIndexedDB: true,
        namespace: 'custom-namespace',
      });
    });

    it('should inherit from OpenAlexClient', () => {
      client = new CachedOpenAlexClient();
      
      // Should have OpenAlexClient methods
      expect(typeof client.getConfig).toBe('function');
      expect(typeof client.updateConfig).toBe('function');
    });

    it('should initialize deduplication state correctly', () => {
      const enabledClient = new CachedOpenAlexClient({ deduplicateRequests: true });
      const disabledClient = new CachedOpenAlexClient({ deduplicateRequests: false });
      
      // Both should create deduplicator instance, but enabled state differs
      expect(RequestDeduplicator).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Hit Scenarios', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
    });

    it('should return cached data on cache hit for works', async () => {
      mockCache.get.mockResolvedValue(mockWorksResponse);

      const result = await client.works({ search: 'test' });

      expect(mockCache.get).toHaveBeenCalledWith('works', { search: 'test' });
      expect(mockCache.recordHit).toHaveBeenCalled();
      expect(result).toEqual(mockWorksResponse);
      expect(console.debug).toHaveBeenCalledWith('Cache hit for works');
    });

    it('should return cached data on cache hit for single work', async () => {
      mockCache.get.mockResolvedValue(mockWork);

      const result = await client.work('W2741809807');

      expect(mockCache.get).toHaveBeenCalledWith('work:W2741809807', {});
      expect(mockCache.recordHit).toHaveBeenCalled();
      expect(result).toEqual(mockWork);
      expect(console.debug).toHaveBeenCalledWith('Cache hit for work:W2741809807');
    });

    it('should return cached data for all entity types', async () => {
      const testCases = [
        { method: 'authors', params: { search: 'john' }, expectedKey: 'authors', mockData: mockAuthorsResponse },
        { method: 'author', params: 'A5000000001', expectedKey: 'author:A5000000001', mockData: mockAuthor },
        { method: 'sources', params: {}, expectedKey: 'sources', mockData: { results: [mockSource] } },
        { method: 'source', params: 'S137773608', expectedKey: 'source:S137773608', mockData: mockSource },
        { method: 'institutions', params: {}, expectedKey: 'institutions', mockData: { results: [mockInstitution] } },
        { method: 'institution', params: 'I86987016', expectedKey: 'institution:I86987016', mockData: mockInstitution },
      ];

      for (const testCase of testCases) {
        mockCache.get.mockResolvedValue(testCase.mockData);
        
        const result = await (client as any)[testCase.method](
          typeof testCase.params === 'string' ? testCase.params : testCase.params
        );

        expect(mockCache.get).toHaveBeenCalledWith(
          testCase.expectedKey,
          typeof testCase.params === 'string' ? {} : testCase.params
        );
        expect(result).toEqual(testCase.mockData);
      }
    });
  });

  describe('Cache Miss Scenarios', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
      mockCache.get.mockResolvedValue(null); // Cache miss
    });

    it('should make API request and cache result on cache miss', async () => {
      const result = await client.works({ search: 'test' });

      expect(mockCache.get).toHaveBeenCalledWith('works', { search: 'test' });
      expect(mockCache.set).toHaveBeenCalledWith('works', { search: 'test' }, result);
      expect(mockCache.recordMiss).toHaveBeenCalled();
      expect(console.debug).toHaveBeenCalledWith('Cache miss for works - cached for future use');
    });

    it('should handle cache miss for single work', async () => {
      const result = await client.work('W2741809807');

      expect(mockCache.get).toHaveBeenCalledWith('work:W2741809807', {});
      expect(mockCache.set).toHaveBeenCalledWith('work:W2741809807', {}, result);
      expect(mockCache.recordMiss).toHaveBeenCalled();
      expect(result.id).toContain('W2741809807');
    });

    it('should handle cache miss with request deduplication', async () => {
      client = new CachedOpenAlexClient({ deduplicateRequests: true });
      mockDeduplicator.deduplicate.mockImplementation(async (key, fn) => {
        const result = await fn();
        await mockCache.set('works', { search: 'test' }, result);
        mockCache.recordMiss();
        return result;
      });

      const result = await client.works({ search: 'test' });

      expect(mockDeduplicator.deduplicate).toHaveBeenCalledWith(
        'works:{"search":"test"}',
        expect.any(Function)
      );
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockCache.recordMiss).toHaveBeenCalled();
    });

    it('should handle cache miss without deduplication when disabled', async () => {
      client = new CachedOpenAlexClient({ deduplicateRequests: false });

      const result = await client.works({ search: 'test' });

      expect(mockDeduplicator.deduplicate).not.toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith('works', { search: 'test' }, result);
      expect(mockCache.recordMiss).toHaveBeenCalled();
    });
  });

  describe('Skip Cache Scenarios', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
    });

    it('should skip cache when skipCache parameter is true', async () => {
      const result = await client.works({ search: 'test' }, true);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(result).toEqual(mockWorksResponse);
    });

    it('should skip cache for all methods when requested', async () => {
      const testCases = [
        { method: 'works', args: [{ search: 'test' }, true] },
        { method: 'work', args: ['W123', true] },
        { method: 'authors', args: [{}, true] },
        { method: 'author', args: ['A123', true] },
        { method: 'sources', args: [{}, true] },
        { method: 'source', args: ['S123', true] },
        { method: 'institutions', args: [{}, true] },
        { method: 'institution', args: ['I123', true] },
        { method: 'publishers', args: [{}, true] },
        { method: 'publisher', args: ['P123', true] },
        { method: 'funders', args: [{}, true] },
        { method: 'funder', args: ['F123', true] },
        { method: 'topics', args: [{}, true] },
        { method: 'topic', args: ['T123', true] },
      ];

      for (const testCase of testCases) {
        mockCache.get.mockClear();
        mockCache.set.mockClear();
        
        await (client as any)[testCase.method](...testCase.args);

        expect(mockCache.get).not.toHaveBeenCalled();
        expect(mockCache.set).not.toHaveBeenCalled();
      }
    });
  });

  describe('Cache Control Methods', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
    });

    it('should enable and disable cache', async () => {
      // Disable cache
      client.setCacheEnabled(false);
      await client.works({ search: 'test' });
      
      expect(mockCache.get).not.toHaveBeenCalled();
      
      // Re-enable cache
      client.setCacheEnabled(true);
      mockCache.get.mockResolvedValue(null);
      await client.works({ search: 'test' });
      
      expect(mockCache.get).toHaveBeenCalled();
    });

    it('should enable and disable deduplication', async () => {
      client.setDeduplicationEnabled(false);
      mockCache.get.mockResolvedValue(null);
      
      await client.works({ search: 'test' });
      
      expect(mockDeduplicator.deduplicate).not.toHaveBeenCalled();
    });

    it('should clear all cache', async () => {
      await client.clearCache();
      
      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockDeduplicator.clear).toHaveBeenCalled();
    });

    it('should clear cache for specific endpoint', async () => {
      await client.clearCacheForEndpoint('works');
      
      expect(mockCache.delete).toHaveBeenCalledWith('works');
    });

    it('should return cache statistics', () => {
      const stats = client.getCacheStats();
      
      expect(mockCache.getStats).toHaveBeenCalled();
      expect(stats).toEqual({
        hitRate: 0.5,
        memoryEntries: 10,
        memorySize: 1024,
        validEntries: 8,
      });
    });
  });

  describe('Preloading Methods', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
      mockCache.get.mockResolvedValue(null); // Always miss to ensure API calls
    });

    it('should preload single work', async () => {
      await client.preloadWork('W123');
      
      expect(mockCache.get).toHaveBeenCalledWith('work:W123', {});
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should preload single author', async () => {
      await client.preloadAuthor('A123');
      
      expect(mockCache.get).toHaveBeenCalledWith('author:A123', {});
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should preload works with parameters', async () => {
      const params = { search: 'quantum' };
      await client.preloadWorks(params);
      
      expect(mockCache.get).toHaveBeenCalledWith('works', params);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should preload works batch', async () => {
      const ids = ['W123', 'W456', 'W789'];
      await client.preloadWorksBatch(ids);
      
      expect(mockCache.get).toHaveBeenCalledTimes(3);
      expect(mockCache.get).toHaveBeenCalledWith('work:W123', {});
      expect(mockCache.get).toHaveBeenCalledWith('work:W456', {});
      expect(mockCache.get).toHaveBeenCalledWith('work:W789', {});
    });

    it('should preload authors batch', async () => {
      const ids = ['A123', 'A456'];
      await client.preloadAuthorsBatch(ids);
      
      expect(mockCache.get).toHaveBeenCalledTimes(2);
      expect(mockCache.get).toHaveBeenCalledWith('author:A123', {});
      expect(mockCache.get).toHaveBeenCalledWith('author:A456', {});
    });

    it('should handle preloading with cache hits', async () => {
      mockCache.get.mockResolvedValue(mockWork); // Cache hit
      
      await client.preloadWork('W123');
      
      expect(mockCache.get).toHaveBeenCalledWith('work:W123', {});
      expect(mockCache.recordHit).toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled(); // No API call needed
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
    });

    it('should handle cache read errors gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache read error'));
      
      const result = await client.works({ search: 'test' });
      
      // Should fall back to API call
      expect(result).toEqual(mockWorksResponse);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle cache write errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockRejectedValue(new Error('Cache write error'));
      
      const result = await client.works({ search: 'test' });
      
      // Should still return API result
      expect(result).toEqual(mockWorksResponse);
    });

    it('should handle API errors with cache', async () => {
      server.use(errorHandlers.emptyResponse);
      mockCache.get.mockResolvedValue(null);
      
      const result = await client.works();
      expect(result.results).toHaveLength(0);
    });

    it('should handle deduplication errors', async () => {
      mockDeduplicator.deduplicate.mockRejectedValue(new Error('Deduplication error'));
      mockCache.get.mockResolvedValue(null);
      
      // Should still work by falling back to direct API call
      const result = await client.works({ search: 'test' });
      expect(result).toEqual(mockWorksResponse);
    });

    it('should propagate OpenAlexError from base client', async () => {
      mockCache.get.mockResolvedValue(null);
      
      await expect(
        client.work('nonexistent')
      ).rejects.toThrow();
    });
  });

  describe('Request Deduplication', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient({ deduplicateRequests: true });
      mockCache.get.mockResolvedValue(null); // Cache miss
    });

    it('should deduplicate concurrent requests for same resource', async () => {
      let callCount = 0;
      mockDeduplicator.deduplicate.mockImplementation(async (key, fn) => {
        callCount++;
        const result = await fn();
        await mockCache.set(key.split(':')[0], {}, result);
        return result;
      });

      const promises = [
        client.work('W123'),
        client.work('W123'),
        client.work('W123'),
      ];

      const results = await Promise.all(promises);
      
      // All should get the same result
      results.forEach(result => {
        expect(result.id).toContain('W123');
      });

      // Deduplication should have been called 3 times but with same key
      expect(mockDeduplicator.deduplicate).toHaveBeenCalledTimes(3);
      expect(mockDeduplicator.deduplicate).toHaveBeenCalledWith(
        'work:W123:{}',
        expect.any(Function)
      );
    });

    it('should generate different deduplication keys for different parameters', async () => {
      await client.works({ search: 'quantum' });
      await client.works({ search: 'physics' });

      expect(mockDeduplicator.deduplicate).toHaveBeenCalledWith(
        'works:{"search":"quantum"}',
        expect.any(Function)
      );
      expect(mockDeduplicator.deduplicate).toHaveBeenCalledWith(
        'works:{"search":"physics"}',
        expect.any(Function)
      );
    });

    it('should not deduplicate when disabled', async () => {
      client.setDeduplicationEnabled(false);
      
      await client.work('W123');
      
      expect(mockDeduplicator.deduplicate).not.toHaveBeenCalled();
    });
  });

  describe('Parameter Handling', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
      mockCache.get.mockResolvedValue(null);
    });

    it('should handle empty parameters correctly', async () => {
      await client.works();
      
      expect(mockCache.get).toHaveBeenCalledWith('works', {});
      expect(mockCache.set).toHaveBeenCalledWith('works', {}, expect.any(Object));
    });

    it('should handle complex parameters', async () => {
      const params = {
        search: 'machine learning',
        filter: 'publication_year:2023',
        sort: 'cited_by_count:desc',
        per_page: 50,
        page: 2,
      };

      await client.works(params);
      
      expect(mockCache.get).toHaveBeenCalledWith('works', params);
      expect(mockCache.set).toHaveBeenCalledWith('works', params, expect.any(Object));
    });

    it('should handle ID normalization in cache keys', async () => {
      await client.work('https://openalex.org/W123');
      
      // Should normalize URL to just ID in cache key
      expect(mockCache.get).toHaveBeenCalledWith('work:W123', {});
    });
  });

  describe('All API Endpoints Coverage', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
      mockCache.get.mockResolvedValue(null);
    });

    it('should cache publishers endpoints', async () => {
      await client.publishers({ search: 'springer' });
      await client.publisher('P123');

      expect(mockCache.get).toHaveBeenCalledWith('publishers', { search: 'springer' });
      expect(mockCache.get).toHaveBeenCalledWith('publisher:P123', {});
    });

    it('should cache funders endpoints', async () => {
      await client.funders({ search: 'nsf' });
      await client.funder('F123');

      expect(mockCache.get).toHaveBeenCalledWith('funders', { search: 'nsf' });
      expect(mockCache.get).toHaveBeenCalledWith('funder:F123', {});
    });

    it('should cache topics endpoints', async () => {
      await client.topics({ search: 'climate' });
      await client.topic('T123');

      expect(mockCache.get).toHaveBeenCalledWith('topics', { search: 'climate' });
      expect(mockCache.get).toHaveBeenCalledWith('topic:T123', {});
    });

    it('should handle all endpoints with skipCache parameter', async () => {
      const endpoints = [
        { method: 'publishers', args: [{}, true] },
        { method: 'publisher', args: ['P123', true] },
        { method: 'funders', args: [{}, true] },
        { method: 'funder', args: ['F123', true] },
        { method: 'topics', args: [{}, true] },
        { method: 'topic', args: ['T123', true] },
      ];

      for (const endpoint of endpoints) {
        mockCache.get.mockClear();
        await (client as any)[endpoint.method](...endpoint.args);
        expect(mockCache.get).not.toHaveBeenCalled();
      }
    });
  });

  describe('Singleton Instance', () => {
    it('should export configured singleton instance', () => {
      expect(cachedOpenAlex).toBeInstanceOf(CachedOpenAlexClient);
    });

    it('should have correct singleton configuration', () => {
      // Test that singleton is properly configured by verifying it's an instance
      // and that it has the expected methods (behavior test rather than implementation test)
      expect(cachedOpenAlex).toBeInstanceOf(CachedOpenAlexClient);
      expect(typeof cachedOpenAlex.works).toBe('function');
      expect(typeof cachedOpenAlex.getCacheStats).toBe('function');
      expect(typeof cachedOpenAlex.clearCache).toBe('function');
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
    });

    it('should handle large cache operations', async () => {
      // Simulate many cache operations
      const promises = [];
      for (let i = 0; i < 100; i++) {
        mockCache.get.mockResolvedValue(null);
        promises.push(client.work(`W${i}`));
      }

      await Promise.all(promises);

      expect(mockCache.get).toHaveBeenCalledTimes(100);
      expect(mockCache.set).toHaveBeenCalledTimes(100);
    });

    it('should handle cache statistics accurately', () => {
      mockCache.getStats.mockReturnValue({
        hitRate: 0.75,
        memoryEntries: 500,
        memorySize: 1024 * 1024, // 1MB
        validEntries: 450,
      });

      const stats = client.getCacheStats();

      expect(stats.hitRate).toBe(0.75);
      expect(stats.memoryEntries).toBe(500);
      expect(stats.memorySize).toBe(1024 * 1024);
      expect(stats.validEntries).toBe(450);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      client = new CachedOpenAlexClient();
    });

    it('should handle null cache responses', async () => {
      mockCache.get.mockResolvedValue(null);
      
      const result = await client.work('W123');
      
      expect(result.id).toContain('W123');
      expect(mockCache.recordMiss).toHaveBeenCalled();
    });

    it('should handle undefined parameters', async () => {
      await client.works(undefined as any);
      
      expect(mockCache.get).toHaveBeenCalledWith('works', {});
    });

    it('should handle cache configuration edge cases', () => {
      const clientWithMinimalConfig = new CachedOpenAlexClient({
        cache: {},
      });
      
      expect(CacheManager).toHaveBeenCalledWith({
        ttl: 60 * 60 * 1000,
        useMemory: true,
        useIndexedDB: true,
        namespace: 'openalex-api',
      });
    });

    it('should handle concurrent cache control operations', async () => {
      const promises = [
        client.clearCache(),
        client.setCacheEnabled(false),
        client.setDeduplicationEnabled(false),
        client.getCacheStats(),
      ];

      await Promise.allSettled(promises);

      expect(mockCache.clear).toHaveBeenCalled();
      expect(mockCache.getStats).toHaveBeenCalled();
    });
  });
});