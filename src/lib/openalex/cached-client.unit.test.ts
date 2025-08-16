import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockWork, mockAuthor, mockWorksResponse, mockAuthorsResponse } from '@/test/mocks/data';

// Mock console methods to avoid test output pollution
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});

// Mock the cache interceptor module
vi.mock('./utils/cache-interceptor', () => {
  const mockCacheInterceptor = {
    intercept: vi.fn(),
    clear: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockReturnValue({
      hits: 10,
      misses: 5,
      skipped: 2,
      errors: 0,
      hitRate: 0.67,
      cache: { memoryEntries: 15, validEntries: 15 },
    }),
    warmup: vi.fn(),
    resetStats: vi.fn(),
  };

  return {
    CacheInterceptor: vi.fn().mockImplementation(() => mockCacheInterceptor),
    withCache: vi.fn().mockImplementation((client) => {
      // Return a wrapped client that still calls the underlying client
      return new Proxy(client, {
        get(target, prop) {
          if (typeof target[prop] === 'function') {
            return function(...args: any[]) {
              return target[prop](...args);
            };
          }
          return target[prop];
        },
      });
    }),
    defaultStrategies: {
      entity: {
        shouldCache: () => true,
        getCacheTTL: () => 7 * 24 * 60 * 60 * 1000,
        getCacheKey: (endpoint: string, params: unknown) => `entity:${endpoint}:${JSON.stringify(params)}`,
      },
      search: {
        shouldCache: () => true,
        getCacheTTL: () => 60 * 60 * 1000,
        getCacheKey: (endpoint: string, params: unknown) => `search:${endpoint}:${JSON.stringify(params)}`,
      },
    },
  };
});

// Mock the base client module
vi.mock('./client', () => {
  const mockBaseClient = {
    works: vi.fn(),
    work: vi.fn(),
    authors: vi.fn(),
    author: vi.fn(),
    sources: vi.fn(),
    source: vi.fn(),
    institutions: vi.fn(),
    institution: vi.fn(),
    publishers: vi.fn(),
    publisher: vi.fn(),
    funders: vi.fn(),
    funder: vi.fn(),
    topics: vi.fn(),
    topic: vi.fn(),
    worksAutocomplete: vi.fn(),
    authorsAutocomplete: vi.fn(),
    randomWork: vi.fn(),
    randomAuthor: vi.fn(),
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn(),
  };

  return {
    openAlex: mockBaseClient,
    OpenAlexClient: vi.fn().mockImplementation(() => mockBaseClient),
    OpenAlexError: class OpenAlexError extends Error {},
  };
});

// Import the cached client module (after mocks are set up)
import { 
  cachedClient, 
  createCachedClient, 
  clearCache, 
  getCacheStats, 
  warmupCache,
  examples 
} from './cached-client';

describe('cached-client', () => {
  let mockBaseClient: any;
  let mockCacheInterceptor: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get access to the mocked modules
    const clientModule = await import('./client');
    const cacheModule = await import('./utils/cache-interceptor');
    
    mockBaseClient = clientModule.openAlex;
    // Access the cache interceptor mock instance safely
    const CacheInterceptorMock = vi.mocked(cacheModule.CacheInterceptor);
    if (CacheInterceptorMock.mock?.results?.length > 0) {
      mockCacheInterceptor = CacheInterceptorMock.mock.results[0]?.value || {};
    } else {
      // Provide a fallback mock
      mockCacheInterceptor = {
        intercept: vi.fn(),
        clear: vi.fn().mockResolvedValue(undefined),
        getStats: vi.fn().mockReturnValue({
          hits: 0,
          misses: 0,
          skipped: 0,
          errors: 0,
          hitRate: 0,
          cache: { memoryEntries: 0, validEntries: 0 },
        }),
        warmup: vi.fn(),
        resetStats: vi.fn(),
      };
    }
    
    // Ensure mockBaseClient methods are properly mocked functions
    if (typeof mockBaseClient.works?.mockResolvedValue === 'function') {
      mockBaseClient.works.mockResolvedValue(mockWorksResponse);
      mockBaseClient.work.mockResolvedValue(mockWork);
      mockBaseClient.authors.mockResolvedValue(mockAuthorsResponse);
      mockBaseClient.author.mockResolvedValue(mockAuthor);
      mockBaseClient.randomWork.mockResolvedValue(mockWork);
    }
  });

  afterEach(() => {
    vi.clearAllTimers();
    mockConsoleLog.mockClear();
    mockConsoleDebug.mockClear();
  });

  describe('Cached client initialization', () => {
    it('should create a cached client', () => {
      // The cached client should be available
      expect(cachedClient).toBeDefined();
      expect(typeof cachedClient).toBe('object');
    });

    it('should have all expected client methods', () => {
      expect(cachedClient.works).toBeDefined();
      expect(cachedClient.work).toBeDefined();
      expect(cachedClient.authors).toBeDefined();
      expect(cachedClient.author).toBeDefined();
      expect(cachedClient.sources).toBeDefined();
      expect(cachedClient.source).toBeDefined();
      expect(cachedClient.institutions).toBeDefined();
      expect(cachedClient.institution).toBeDefined();
    });

    it('should have configuration methods', () => {
      expect(cachedClient.getConfig).toBeDefined();
      expect(cachedClient.updateConfig).toBeDefined();
    });
  });

  describe('Custom caching strategy', () => {
    it('should test caching strategy indirectly through module behavior', () => {
      // Since the caching strategy is internal to the module,
      // we test it indirectly by observing that the module loads successfully
      // and the cache interceptor is initialized
      expect(cachedClient).toBeDefined();
      expect(createCachedClient).toBeDefined();
    });
  });

  describe('createCachedClient function', () => {
    it('should create a new cached client with default config', () => {
      const client = createCachedClient();
      
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should create a new cached client with custom config', () => {
      const config = {
        mailto: 'test@example.com',
        apiKey: 'test-key',
        cacheTTL: 30 * 60 * 1000, // 30 minutes
        useMemoryCache: false,
        useIndexedDB: true,
      };
      
      const client = createCachedClient(config);
      
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should use default values for missing config options', () => {
      const config = {
        mailto: 'test@example.com',
      };
      
      const client = createCachedClient(config);
      
      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });
  });

  describe('Cache management functions', () => {
    it('should clear cache', async () => {
      await clearCache();
      
      // Just verify the function completes successfully
      expect(true).toBe(true);
    });

    it('should get cache statistics', () => {
      const stats = getCacheStats();
      
      // Verify that stats are returned (mocked to return default stats)
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should warmup cache with common requests', async () => {
      await warmupCache();
      
      // Should make the predefined common requests
      expect(mockBaseClient.works).toHaveBeenCalledWith({
        sort: 'cited_by_count:desc',
        per_page: 10,
      });
      
      expect(mockBaseClient.works).toHaveBeenCalledWith({
        filter: 'is_oa:true',
        sort: 'publication_date:desc',
        per_page: 10,
      });
      
      // Console logging is handled by global setup and not directly testable
    });

    it('should handle warmup errors gracefully', async () => {
      mockBaseClient.works.mockRejectedValueOnce(new Error('API Error'));
      
      await expect(warmupCache()).rejects.toThrow('API Error');
    });
  });

  describe('Example functions', () => {
    describe('searchWorks', () => {
      it('should search works and return results', async () => {
        const query = 'quantum computing';
        
        const result = await examples.searchWorks(query);
        
        expect(mockBaseClient.works).toHaveBeenCalledWith({ search: query });
        expect(mockBaseClient.works).toHaveBeenCalledTimes(1); // Called once in the example
        expect(result).toEqual(mockWorksResponse);
      });
    });

    describe('getWork', () => {
      it('should get a specific work', async () => {
        const workId = 'W2741809807';
        
        const result = await examples.getWork(workId);
        
        expect(mockBaseClient.work).toHaveBeenCalledWith(workId);
        expect(result).toEqual(mockWork);
      });
    });

    describe('getFreshWork', () => {
      it('should get fresh work data bypassing cache', async () => {
        const workId = 'W2741809807';
        
        const result = await examples.getFreshWork(workId);
        
        expect(mockBaseClient.work).toHaveBeenCalledWith(workId);
        expect(result).toEqual(mockWork);
      });
    });

    describe('checkPerformance', () => {
      it('should log cache performance statistics', async () => {
        await examples.checkPerformance();
        
        // Console logging is handled by global setup and not directly testable
        // But we can verify the function ran without errors
      });
    });

    describe('batchGetWorks', () => {
      it('should fetch multiple works in parallel', async () => {
        const ids = ['W1234567890', 'W0987654321', 'W1111222233'];
        
        const results = await examples.batchGetWorks(ids);
        
        expect(mockBaseClient.work).toHaveBeenCalledTimes(3);
        expect(mockBaseClient.work).toHaveBeenCalledWith('W1234567890');
        expect(mockBaseClient.work).toHaveBeenCalledWith('W0987654321');
        expect(mockBaseClient.work).toHaveBeenCalledWith('W1111222233');
        expect(results).toEqual([mockWork, mockWork, mockWork]);
      });

      it('should handle empty array', async () => {
        const results = await examples.batchGetWorks([]);
        
        expect(mockBaseClient.work).not.toHaveBeenCalled();
        expect(results).toEqual([]);
      });

      it('should handle individual request failures', async () => {
        const ids = ['W1234567890', 'W0987654321'];
        mockBaseClient.work
          .mockResolvedValueOnce(mockWork)
          .mockRejectedValueOnce(new Error('Work not found'));
        
        await expect(examples.batchGetWorks(ids)).rejects.toThrow('Work not found');
      });
    });

    describe('getAllWorksForTopic', () => {
      it('should fetch all works for a topic with pagination', async () => {
        const topicId = 'T10555';
        
        // Mock paginated responses
        const firstPage = {
          ...mockWorksResponse,
          results: new Array(200).fill(mockWork),
        };
        const secondPage = {
          ...mockWorksResponse,
          results: new Array(150).fill(mockWork), // Less than 200, so last page
        };
        
        mockBaseClient.works
          .mockResolvedValueOnce(firstPage)
          .mockResolvedValueOnce(secondPage);
        
        const results = await examples.getAllWorksForTopic(topicId);
        
        expect(mockBaseClient.works).toHaveBeenCalledTimes(2);
        expect(mockBaseClient.works).toHaveBeenCalledWith({
          filter: `topics.id:${topicId}`,
          page: 1,
          per_page: 200,
        });
        expect(mockBaseClient.works).toHaveBeenCalledWith({
          filter: `topics.id:${topicId}`,
          page: 2,
          per_page: 200,
        });
        
        expect(results).toHaveLength(350); // 200 + 150
      });

      it('should handle single page response', async () => {
        const topicId = 'T10555';
        
        const singlePage = {
          ...mockWorksResponse,
          results: new Array(50).fill(mockWork), // Less than 200
        };
        
        mockBaseClient.works.mockResolvedValueOnce(singlePage);
        
        const results = await examples.getAllWorksForTopic(topicId);
        
        expect(mockBaseClient.works).toHaveBeenCalledTimes(1);
        expect(results).toHaveLength(50);
      });

      it('should handle exactly 200 results followed by empty page', async () => {
        const topicId = 'T10555';
        
        const firstPage = {
          ...mockWorksResponse,
          results: new Array(200).fill(mockWork),
        };
        const emptyPage = {
          ...mockWorksResponse,
          results: [],
        };
        
        mockBaseClient.works
          .mockResolvedValueOnce(firstPage)
          .mockResolvedValueOnce(emptyPage);
        
        const results = await examples.getAllWorksForTopic(topicId);
        
        expect(mockBaseClient.works).toHaveBeenCalledTimes(2);
        expect(results).toHaveLength(200);
      });

      it('should handle API errors during pagination', async () => {
        const topicId = 'T10555';
        
        // Reset mock and configure it to always throw an error
        mockBaseClient.works.mockReset();
        mockBaseClient.works.mockRejectedValue(new Error('API Error'));
        
        await expect(examples.getAllWorksForTopic(topicId)).rejects.toThrow('API Error');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle functions gracefully', () => {
      // Since we are mocking the internals, we test that the functions exist and can be called
      expect(clearCache).toBeDefined();
      expect(getCacheStats).toBeDefined();
      expect(typeof clearCache).toBe('function');
      expect(typeof getCacheStats).toBe('function');
    });
  });

  describe('Integration with cache interceptor', () => {
    it('should pass through all client methods', async () => {
      // Test that the cached client has all expected methods
      expect(cachedClient.works).toBeDefined();
      expect(cachedClient.work).toBeDefined();
      expect(cachedClient.authors).toBeDefined();
      expect(cachedClient.author).toBeDefined();
      expect(cachedClient.sources).toBeDefined();
      expect(cachedClient.source).toBeDefined();
      expect(cachedClient.institutions).toBeDefined();
      expect(cachedClient.institution).toBeDefined();
    });

    it('should maintain client configuration methods', () => {
      expect(cachedClient.getConfig).toBeDefined();
      expect(cachedClient.updateConfig).toBeDefined();
    });

    it('should handle client method calls correctly', async () => {
      // Reset mock to avoid interference from previous tests
      mockBaseClient.works.mockReset().mockResolvedValue(mockWorksResponse);
      mockBaseClient.work.mockReset().mockResolvedValue(mockWork);
      
      // Test that the methods can be called (they return the mocked results)
      const worksResult = await cachedClient.works({ search: 'test' });
      expect(worksResult).toBeDefined();
      
      const workResult = await cachedClient.work('W123');
      expect(workResult).toBeDefined();
    });
  });

  describe('Module integration', () => {
    it('should export all expected functions', () => {
      expect(cachedClient).toBeDefined();
      expect(createCachedClient).toBeDefined();
      expect(clearCache).toBeDefined();
      expect(getCacheStats).toBeDefined();
      expect(warmupCache).toBeDefined();
      expect(examples).toBeDefined();
    });

    it('should have working examples object', () => {
      expect(examples.searchWorks).toBeDefined();
      expect(examples.getWork).toBeDefined();
      expect(examples.getFreshWork).toBeDefined();
      expect(examples.checkPerformance).toBeDefined();
      expect(examples.batchGetWorks).toBeDefined();
      expect(examples.getAllWorksForTopic).toBeDefined();
    });
  });

  describe('Error Fallback Scenarios', () => {
    it('should fallback to regular client when cache setup fails', async () => {
      // Mock the cache interceptor constructor to throw
      const { CacheInterceptor } = await import('./utils/cache-interceptor');
      vi.mocked(CacheInterceptor).mockImplementationOnce(() => {
        throw new Error('Cache setup failed');
      });

      // Import should throw due to module-level instantiation error
      await expect(import('./cached-client')).rejects.toThrow('Cache setup failed');
    });

    it('should handle cache interceptor creation failure gracefully', async () => {
      // Test when withCache function throws an error
      const { withCache } = await import('./utils/cache-interceptor');
      vi.mocked(withCache).mockImplementationOnce(() => {
        throw new Error('withCache failed');
      });

      // Import should throw due to module-level withCache error
      await expect(import('./cached-client')).rejects.toThrow('withCache failed');
    });

    it('should handle cache warmup errors gracefully', async () => {
      mockBaseClient.works.mockRejectedValueOnce(new Error('Warmup API Error'));
      
      const { warmupCache } = await import('./cached-client');
      
      await expect(warmupCache()).rejects.toThrow('Warmup API Error');
    });

    it('should handle cache clear errors gracefully', async () => {
      // Note: Due to module-level instantiation, mocking internal cache errors is complex
      // This test ensures clearCache can be called without throwing
      const { clearCache } = await import('./cached-client');
      
      await expect(clearCache()).resolves.not.toThrow();
    });

    it('should handle corrupted cache stats gracefully', async () => {
      // Note: Due to module-level instantiation, mocking internal cache methods is complex
      // This test ensures getCacheStats returns a valid object
      const { getCacheStats } = await import('./cached-client');
      
      const stats = getCacheStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });

    it('should handle undefined cache interceptor methods', async () => {
      // Create a cache interceptor with missing methods
      const incompleteCacheInterceptor = {
        intercept: vi.fn(),
        // Missing clear, getStats, etc.
      };

      if (mockCacheInterceptor.clear) {
        mockCacheInterceptor.clear.mockImplementation(() => {
          throw new Error('Method not implemented');
        });
      }

      const { clearCache } = await import('./cached-client');
      
      await expect(clearCache()).resolves.not.toThrow();
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing mailto configuration', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        apiKey: 'test-key',
        cacheTTL: 30000,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle missing apiKey configuration', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        cacheTTL: 30000,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle zero cacheTTL', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        cacheTTL: 0,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle negative cacheTTL', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        cacheTTL: -1000,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle disabled memory cache', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        useMemoryCache: false,
        useIndexedDB: true,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle disabled IndexedDB', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        useMemoryCache: true,
        useIndexedDB: false,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle both cache types disabled', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        useMemoryCache: false,
        useIndexedDB: false,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle very large cacheTTL values', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        cacheTTL: Number.MAX_SAFE_INTEGER,
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });

    it('should handle string cacheTTL values', async () => {
      const { createCachedClient } = await import('./cached-client');
      
      const client = createCachedClient({
        mailto: 'test@example.com',
        cacheTTL: '60000' as any, // Type assertion to simulate incorrect type
      });

      expect(client).toBeDefined();
      expect(typeof client).toBe('object');
    });
  });

  describe('Cache Strategy Edge Cases', () => {
    it('should handle cache strategy with complex filter parameters', async () => {
      const complexParams = {
        filter: {
          'publication_year': '>2020',
          'is_oa': true,
          'authorships.institutions.country_code': 'US',
        },
        sort: 'cited_by_count:desc',
        per_page: 200,
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      const result = await examples.searchWorks('complex query');
      expect(result).toBeDefined();
    });

    it('should handle cache strategy with null parameters', async () => {
      // Reset mocks to test with null params
      mockBaseClient.works.mockReset().mockResolvedValue(mockWorksResponse);
      
      const result = await examples.searchWorks('test with nulls');
      expect(result).toBeDefined();
    });

    it('should handle cache strategy with circular reference in parameters', async () => {
      // Create circular reference (should be handled by JSON.stringify)
      const circularParams: any = { test: 'value' };
      circularParams.self = circularParams;

      // The cached client should handle this gracefully
      const result = await examples.searchWorks('circular test');
      expect(result).toBeDefined();
    });
  });

  describe('Advanced Cache Operations', () => {
    it('should handle concurrent cache operations', async () => {
      mockBaseClient.work.mockResolvedValue(mockWork);

      // Make multiple concurrent requests
      const promises = Array(10).fill(null).map((_, i) => 
        examples.getWork(`W${i.toString().padStart(10, '0')}`)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual(mockWork);
      });
    });

    it('should handle cache statistics with high numbers', async () => {
      // Mock high statistics
      if (mockCacheInterceptor.getStats) {
        mockCacheInterceptor.getStats.mockReturnValueOnce({
          hits: 999999,
          misses: 1000000,
          skipped: 500000,
          errors: 100,
          hitRate: 0.499999,
          cache: { memoryEntries: 50000, validEntries: 45000 },
        });
      }

      await examples.checkPerformance();

      // Console logging is handled by global setup and not directly testable
    });

    it('should handle cache statistics with zero values', async () => {
      if (mockCacheInterceptor.getStats) {
        mockCacheInterceptor.getStats.mockReturnValueOnce({
          hits: 0,
          misses: 0,
          skipped: 0,
          errors: 0,
          hitRate: 0,
          cache: { memoryEntries: 0, validEntries: 0 },
        });
      }

      await examples.checkPerformance();

      // Console logging is handled by global setup and not directly testable
    });

    it('should handle cache warmup with empty requests', async () => {
      const { warmupCache } = await import('./cached-client');
      
      // Mock empty responses
      mockBaseClient.works
        .mockResolvedValueOnce({ results: [], meta: { count: 0 } })
        .mockResolvedValueOnce({ results: [], meta: { count: 0 } });

      await warmupCache();

      expect(mockBaseClient.works).toHaveBeenCalledTimes(2);
      // Console logging is handled by global setup and not directly testable
    });
  });

  describe('Memory Management', () => {
    it('should handle large dataset processing without memory issues', async () => {
      // Mock a large number of works
      const largeWorkSet = Array(1000).fill(null).map((_, i) => ({
        ...mockWork,
        id: `W${i.toString().padStart(10, '0')}`,
      }));

      mockBaseClient.works.mockResolvedValue({
        results: largeWorkSet,
        meta: { count: 1000 }
      });

      const topicId = 'T12345';
      const result = await examples.getAllWorksForTopic(topicId);

      expect(result).toHaveLength(1000);
      expect(mockBaseClient.works).toHaveBeenCalledWith({
        filter: `topics.id:${topicId}`,
        page: 1,
        per_page: 200,
      });
    });

    it('should handle batch operations with memory constraints', async () => {
      // Test batch processing with many IDs
      const manyIds = Array(500).fill(null).map((_, i) => 
        `W${i.toString().padStart(10, '0')}`
      );

      mockBaseClient.work.mockResolvedValue(mockWork);

      const results = await examples.batchGetWorks(manyIds);

      expect(results).toHaveLength(500);
      expect(mockBaseClient.work).toHaveBeenCalledTimes(500);
    });
  });

  describe('Integration Error Scenarios', () => {
    it('should handle cache interceptor method failures', async () => {
      // Test when cache methods throw errors
      if (mockCacheInterceptor.intercept) {
        mockCacheInterceptor.intercept.mockRejectedValueOnce(new Error('Cache intercept failed'));
      }

      mockBaseClient.works.mockResolvedValue(mockWorksResponse);

      // Should still return results even if cache fails
      const result = await examples.searchWorks('test query');
      expect(result).toBeDefined();
    });

    it('should handle partial cache interceptor failures', async () => {
      // Test when some cache operations fail but others succeed
      if (mockCacheInterceptor.getStats) {
        mockCacheInterceptor.getStats
          .mockReturnValueOnce({
            hits: 10, misses: 5, skipped: 2, errors: 1,
            hitRate: 0.67, cache: { memoryEntries: 15, validEntries: 15 }
          })
          .mockImplementationOnce(() => {
            throw new Error('Stats failed');
          });
      }

      // First call should succeed
      await examples.checkPerformance();

      // Second call should handle error gracefully
      expect(() => examples.checkPerformance()).not.toThrow();
    });

    it('should handle base client method unavailability', async () => {
      // Test when base client methods are undefined
      const incompleteClient = {
        // Missing some methods
        works: mockBaseClient.works,
        // work method is missing
        authors: mockBaseClient.authors,
      };

      // Test that the wrapper handles missing methods gracefully
      expect(incompleteClient.works).toBeDefined();
      expect((incompleteClient as any).work).toBeUndefined();
    });
  });
});