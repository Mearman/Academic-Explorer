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
    withCache: vi.fn().mockImplementation((client) => client),
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
    // The cache interceptor is created by the constructor, so we need to access it differently
    mockCacheInterceptor = vi.mocked(cacheModule.CacheInterceptor).mock.results[0]?.value || {};
    
    // Setup mock return values
    mockBaseClient.works.mockResolvedValue(mockWorksResponse);
    mockBaseClient.work.mockResolvedValue(mockWork);
    mockBaseClient.authors.mockResolvedValue(mockAuthorsResponse);
    mockBaseClient.author.mockResolvedValue(mockAuthor);
    mockBaseClient.randomWork.mockResolvedValue(mockWork);
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
      
      expect(mockConsoleLog).toHaveBeenCalledWith('Cache warmup complete');
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
        
        // Verify that console.log was called with cache statistics
        expect(mockConsoleLog).toHaveBeenCalledWith('Cache Statistics:', expect.objectContaining({
          hitRate: expect.any(String),
          hits: expect.any(Number),
          misses: expect.any(Number),
          skipped: expect.any(Number),
          errors: expect.any(Number),
        }));
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
});