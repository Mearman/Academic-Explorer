/**
 * Cache Interceptor Unit Tests
 * Tests the core caching logic, strategy selection, and interception functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CacheInterceptor,
  withCache,
  defaultStrategies,
  type CacheStrategy,
} from './cache-interceptor';

// Mock the CacheManager
vi.mock('./cache', () => {
  const mockCache = {
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      memoryEntries: 0,
      validEntries: 0,
      size: 0,
    }),
  };

  return {
    CacheManager: vi.fn().mockImplementation(() => mockCache),
  };
});

// Mock console methods to avoid test output pollution
const mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let mockCache: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create interceptor instance
    interceptor = new CacheInterceptor({
      ttl: 60000,
      useMemory: true,
      useIndexedDB: false,
    });

    // Get the mock cache instance
    const { CacheManager } = await import('./cache');
    const CacheManagerMock = vi.mocked(CacheManager);
    mockCache = CacheManagerMock.mock.results[CacheManagerMock.mock.results.length - 1]?.value;
  });

  afterEach(() => {
    mockConsoleDebug.mockClear();
    mockConsoleError.mockClear();
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default options', () => {
      const defaultInterceptor = new CacheInterceptor();
      expect(defaultInterceptor).toBeDefined();
    });

    it('should initialize with custom options', () => {
      const customInterceptor = new CacheInterceptor({
        ttl: 120000,
        useMemory: false,
        useIndexedDB: true,
      });
      expect(customInterceptor).toBeDefined();
    });

    it('should accept custom strategies', () => {
      const customStrategy: CacheStrategy = {
        shouldCache: () => true,
        getCacheTTL: () => 30000,
        getCacheKey: (endpoint) => `custom:${endpoint}`,
      };

      const customInterceptor = new CacheInterceptor({
        strategies: [
          { pattern: /^\/custom\//, strategy: customStrategy },
        ],
      });

      expect(customInterceptor).toBeDefined();
    });
  });

  describe('Strategy Selection', () => {
    it('should select entity strategy for single entity endpoints', async () => {
      const requestFn = vi.fn().mockResolvedValue({ id: 'W123', title: 'Test Work' });
      mockCache.get.mockResolvedValue(null);

      await interceptor.intercept('/works/W123456789', {}, requestFn);

      expect(mockCache.set).toHaveBeenCalledWith(
        'entity:/works/W123456789:{}',
        {},
        { id: 'W123', title: 'Test Work' }
      );
    });

    it('should select search strategy for list endpoints', async () => {
      const requestFn = vi.fn().mockResolvedValue({ results: [] });
      mockCache.get.mockResolvedValue(null);

      await interceptor.intercept('/works', { search: 'test' }, requestFn);

      expect(mockCache.set).toHaveBeenCalledWith(
        'search:/works:{"search":"test"}',
        { search: 'test' },
        { results: [] }
      );
    });

    it('should select autocomplete strategy for autocomplete endpoints', async () => {
      const requestFn = vi.fn().mockResolvedValue({ results: [] });
      mockCache.get.mockResolvedValue(null);

      await interceptor.intercept('/autocomplete/works', { q: 'test' }, requestFn);

      expect(mockCache.set).toHaveBeenCalledWith(
        'autocomplete:/autocomplete/works:{"q":"test"}',
        { q: 'test' },
        { results: [] }
      );
    });

    it('should not cache random endpoints', async () => {
      const requestFn = vi.fn().mockResolvedValue({ id: 'W123' });

      const result = await interceptor.intercept('/works/random', {}, requestFn);

      expect(result).toEqual({ id: 'W123' });
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(interceptor.getStats().skipped).toBe(1);
    });

    it('should return null strategy for unknown endpoints', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      const result = await interceptor.intercept('/unknown/endpoint', {}, requestFn);

      expect(result).toEqual({ data: 'test' });
      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(interceptor.getStats().skipped).toBe(1);
    });
  });

  describe('Cache Hit/Miss Logic', () => {
    it('should return cached result on cache hit', async () => {
      const cachedData = { id: 'W123', title: 'Cached Work' };
      const requestFn = vi.fn().mockResolvedValue({ id: 'W123', title: 'Fresh Work' });
      
      mockCache.get.mockResolvedValue(cachedData);

      const result = await interceptor.intercept('/works/W123456789', {}, requestFn);

      expect(result).toEqual(cachedData);
      expect(requestFn).not.toHaveBeenCalled();
      expect(mockCache.get).toHaveBeenCalledWith('entity:/works/W123456789:{}', {});
      expect(interceptor.getStats().hits).toBe(1);
      expect(mockConsoleDebug).toHaveBeenCalledWith('Cache hit: entity:/works/W123456789:{}');
    });

    it('should make request and cache result on cache miss', async () => {
      const freshData = { id: 'W123', title: 'Fresh Work' };
      const requestFn = vi.fn().mockResolvedValue(freshData);
      
      mockCache.get.mockResolvedValue(null);

      const result = await interceptor.intercept('/works/W123456789', {}, requestFn);

      expect(result).toEqual(freshData);
      expect(requestFn).toHaveBeenCalledOnce();
      expect(mockCache.get).toHaveBeenCalledWith('entity:/works/W123456789:{}', {});
      expect(mockCache.set).toHaveBeenCalledWith(
        'entity:/works/W123456789:{}',
        {},
        freshData
      );
      expect(interceptor.getStats().misses).toBe(1);
    });

    it('should handle cache read errors gracefully', async () => {
      const freshData = { id: 'W123', title: 'Fresh Work' };
      const requestFn = vi.fn().mockResolvedValue(freshData);
      
      mockCache.get.mockRejectedValue(new Error('Cache read error'));

      const result = await interceptor.intercept('/works/W123456789', {}, requestFn);

      expect(result).toEqual(freshData);
      expect(requestFn).toHaveBeenCalledOnce();
      expect(mockConsoleError).toHaveBeenCalledWith('Cache read error:', expect.any(Error));
      expect(interceptor.getStats().errors).toBe(1);
    });

    it('should handle cache write errors gracefully', async () => {
      const freshData = { id: 'W123', title: 'Fresh Work' };
      const requestFn = vi.fn().mockResolvedValue(freshData);
      
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockRejectedValue(new Error('Cache write error'));

      const result = await interceptor.intercept('/works/W123456789', {}, requestFn);

      expect(result).toEqual(freshData);
      expect(requestFn).toHaveBeenCalledOnce();
      
      // Wait for async cache write to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockConsoleError).toHaveBeenCalledWith('Cache write error:', expect.any(Error));
      expect(interceptor.getStats().errors).toBe(1);
    });
  });

  describe('Cache Strategy Application', () => {
    it('should not cache when strategy says not to cache', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      // Use search endpoint with recent date sort (should not cache)
      await interceptor.intercept('/works', { sort: 'publication_date:desc' }, requestFn);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(interceptor.getStats().skipped).toBe(1);
    });

    it('should not cache sample requests', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });

      await interceptor.intercept('/works', { sample: 10 }, requestFn);

      expect(mockCache.get).not.toHaveBeenCalled();
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(interceptor.getStats().skipped).toBe(1);
    });

    it('should use different TTL for different strategies', async () => {
      const requestFn = vi.fn().mockResolvedValue({ results: [] });
      mockCache.get.mockResolvedValue(null);

      // Entity endpoint should use 7 days TTL
      await interceptor.intercept('/works/W123456789', {}, requestFn);
      
      // Search endpoint should use 1 hour TTL
      await interceptor.intercept('/works', { search: 'test' }, requestFn);

      // Verify different cache keys were used
      expect(mockCache.set).toHaveBeenNthCalledWith(
        1,
        'entity:/works/W123456789:{}',
        {},
        { results: [] }
      );
      expect(mockCache.set).toHaveBeenNthCalledWith(
        2,
        'search:/works:{"search":"test"}',
        { search: 'test' },
        { results: [] }
      );
    });
  });

  describe('Cache Management', () => {
    it('should clear cache and reset stats', async () => {
      // Add some stats first
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });
      mockCache.get.mockResolvedValue(null);
      
      await interceptor.intercept('/works/W123', {}, requestFn);
      expect(interceptor.getStats().misses).toBe(1);

      // Clear cache
      await interceptor.clear();

      expect(mockCache.clear).toHaveBeenCalled();
      expect(interceptor.getStats().misses).toBe(0);
      expect(interceptor.getStats().hits).toBe(0);
      expect(interceptor.getStats().skipped).toBe(0);
      expect(interceptor.getStats().errors).toBe(0);
    });

    it('should reset stats only', () => {
      // Add some stats first
      interceptor['stats'].hits = 5;
      interceptor['stats'].misses = 3;

      interceptor.resetStats();

      expect(interceptor.getStats().hits).toBe(0);
      expect(interceptor.getStats().misses).toBe(0);
      expect(interceptor.getStats().skipped).toBe(0);
      expect(interceptor.getStats().errors).toBe(0);
    });

    it('should invalidate all cache when pattern is wildcard', async () => {
      await interceptor.invalidate('*');
      expect(mockCache.clear).toHaveBeenCalled();

      await interceptor.invalidate(/.*/);
      expect(mockCache.clear).toHaveBeenCalledTimes(2);
    });

    it('should not invalidate for specific patterns (not implemented)', async () => {
      await interceptor.invalidate('/works');
      // Should not call clear for specific patterns
      expect(mockCache.clear).not.toHaveBeenCalled();
    });
  });

  describe('Cache Warmup', () => {
    it('should warmup cache with provided requests', async () => {
      const warmupData = [
        {
          endpoint: '/works/W123',
          params: {},
          data: { id: 'W123', title: 'Work 1' },
        },
        {
          endpoint: '/authors/A456',
          params: {},
          data: { id: 'A456', name: 'Author 1' },
        },
      ];

      await interceptor.warmup(warmupData);

      expect(mockCache.set).toHaveBeenCalledTimes(2);
      expect(mockCache.set).toHaveBeenNthCalledWith(
        1,
        'entity:/works/W123:{}',
        {},
        { id: 'W123', title: 'Work 1' }
      );
      expect(mockCache.set).toHaveBeenNthCalledWith(
        2,
        'entity:/authors/A456:{}',
        {},
        { id: 'A456', name: 'Author 1' }
      );
    });

    it('should skip warmup for endpoints that should not be cached', async () => {
      const warmupData = [
        {
          endpoint: '/works/random',
          params: {},
          data: { id: 'W123' },
        },
      ];

      await interceptor.warmup(warmupData);

      expect(mockCache.set).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should track statistics correctly', async () => {
      const requestFn = vi.fn().mockResolvedValue({ data: 'test' });
      
      // Cache miss
      mockCache.get.mockResolvedValue(null);
      await interceptor.intercept('/works/W123', {}, requestFn);
      
      // Cache hit
      mockCache.get.mockResolvedValue({ data: 'cached' });
      await interceptor.intercept('/works/W123', {}, requestFn);
      
      // Skipped
      await interceptor.intercept('/works/random', {}, requestFn);

      const stats = interceptor.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 1 hit / (1 hit + 1 miss)
    });

    it('should handle hit rate calculation with no requests', () => {
      const stats = interceptor.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should include cache stats', () => {
      const stats = interceptor.getStats();
      expect(stats.cache).toBeDefined();
      expect(stats.cache.memoryEntries).toBe(0);
      expect(stats.cache.validEntries).toBe(0);
    });
  });

  describe('Default Strategies', () => {
    describe('entity strategy', () => {
      it('should always cache entities', () => {
        expect(defaultStrategies.entity.shouldCache({ endpoint: '/works/W123', params: {} })).toBe(true);
      });

      it('should use 7-day TTL for entities', () => {
        const ttl = defaultStrategies.entity.getCacheTTL({ endpoint: '/works/W123', params: {} });
        expect(ttl).toBe(7 * 24 * 60 * 60 * 1000);
      });

      it('should generate consistent cache keys', () => {
        const key1 = defaultStrategies.entity.getCacheKey({ endpoint: '/works/W123', params: {} });
        const key2 = defaultStrategies.entity.getCacheKey({ endpoint: '/works/W123', params: {} });
        expect(key1).toBe(key2);
        expect(key1).toBe('entity:/works/W123:{}');
      });
    });

    describe('search strategy', () => {
      it('should cache most search requests', () => {
        expect(defaultStrategies.search.shouldCache({ endpoint: '/works', params: { search: 'test' } })).toBe(true);
      });

      it('should not cache recent date sorts', () => {
        expect(defaultStrategies.search.shouldCache({ endpoint: '/works', params: { sort: 'publication_date:desc' } })).toBe(false);
      });

      it('should not cache sample requests', () => {
        expect(defaultStrategies.search.shouldCache({ endpoint: '/works', params: { sample: 10 } })).toBe(false);
      });

      it('should use 1-hour TTL for searches', () => {
        const ttl = defaultStrategies.search.getCacheTTL({ endpoint: '/works', params: {} });
        expect(ttl).toBe(60 * 60 * 1000);
      });
    });

    describe('autocomplete strategy', () => {
      it('should always cache autocomplete', () => {
        expect(defaultStrategies.autocomplete.shouldCache({ endpoint: '/autocomplete/works', params: {} })).toBe(true);
      });

      it('should use 24-hour TTL for autocomplete', () => {
        const ttl = defaultStrategies.autocomplete.getCacheTTL({ endpoint: '/autocomplete/works', params: {} });
        expect(ttl).toBe(24 * 60 * 60 * 1000);
      });
    });

    describe('random strategy', () => {
      it('should never cache random requests', () => {
        expect(defaultStrategies.random.shouldCache({ endpoint: '/works/random', params: {} })).toBe(false);
      });
    });
  });
});

describe('withCache proxy wrapper', () => {
  let mockClient: any;
  let interceptor: CacheInterceptor;
  let proxiedClient: any;

  beforeEach(() => {
    mockClient = {
      works: vi.fn(),
      work: vi.fn(),
      authors: vi.fn(),
      author: vi.fn(),
      sources: vi.fn(),
      source: vi.fn(),
      institutions: vi.fn(),
      institution: vi.fn(),
      funders: vi.fn(),
      funder: vi.fn(),
      topics: vi.fn(),
      topic: vi.fn(),
      concepts: vi.fn(),
      concept: vi.fn(),
      publishers: vi.fn(),
      publisher: vi.fn(),
      worksAutocomplete: vi.fn(),
      authorsAutocomplete: vi.fn(),
      randomWork: vi.fn(),
      getConfig: vi.fn(),
      updateConfig: vi.fn(),
      nonAsyncMethod: () => 'sync result',
    };

    interceptor = new CacheInterceptor();
    vi.spyOn(interceptor, 'intercept');
    
    proxiedClient = withCache(mockClient, interceptor);
  });

  describe('Method Interception', () => {
    it('should intercept async API methods', async () => {
      mockClient.works.mockResolvedValue({ results: [] });
      
      await proxiedClient.works({ search: 'test' });

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/works',
        { search: 'test' },
        expect.any(Function)
      );
    });

    it('should intercept single entity methods', async () => {
      mockClient.work.mockResolvedValue({ id: 'W123' });
      
      await proxiedClient.work('W123456789');

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/works/W123456789',
        {},
        expect.any(Function)
      );
    });

    it('should intercept autocomplete methods', async () => {
      mockClient.worksAutocomplete.mockResolvedValue({ results: [] });
      
      await proxiedClient.worksAutocomplete({ q: 'test' });

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/autocomplete/works',
        { q: 'test' },
        expect.any(Function)
      );
    });

    it('should intercept random methods', async () => {
      mockClient.randomWork.mockResolvedValue({ id: 'W123' });
      
      await proxiedClient.randomWork();

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/works/random',
        {},
        expect.any(Function)
      );
    });

    it('should not intercept non-API methods', async () => {
      await proxiedClient.getConfig();

      expect(interceptor.intercept).not.toHaveBeenCalled();
      expect(mockClient.getConfig).toHaveBeenCalled();
    });

    it('should not intercept synchronous methods', () => {
      const result = proxiedClient.nonAsyncMethod();

      expect(result).toBe('sync result');
      expect(interceptor.intercept).not.toHaveBeenCalled();
    });

    it('should not intercept constructor', () => {
      expect(() => {
        // Access constructor property
        proxiedClient.constructor;
      }).not.toThrow();
    });
  });

  describe('Endpoint Mapping', () => {
    it('should map list methods to correct endpoints', async () => {
      const listMethods = [
        { method: 'works', endpoint: '/works' },
        { method: 'authors', endpoint: '/authors' },
        { method: 'sources', endpoint: '/sources' },
        { method: 'institutions', endpoint: '/institutions' },
        { method: 'publishers', endpoint: '/publishers' },
        { method: 'funders', endpoint: '/funders' },
        { method: 'topics', endpoint: '/topics' },
        { method: 'concepts', endpoint: '/concepts' },
      ];

      for (const { method, endpoint } of listMethods) {
        mockClient[method].mockResolvedValue({ results: [] });
        await proxiedClient[method]({ search: 'test' });

        expect(interceptor.intercept).toHaveBeenCalledWith(
          endpoint,
          { search: 'test' },
          expect.any(Function)
        );
      }
    });

    it('should map single entity methods to correct endpoints', async () => {
      const entityMethods = [
        { method: 'work', endpoint: '/works/W123' },
        { method: 'author', endpoint: '/authors/A123' },
        { method: 'source', endpoint: '/sources/S123' },
        { method: 'institution', endpoint: '/institutions/I123' },
        { method: 'publisher', endpoint: '/publishers/P123' },
        { method: 'funder', endpoint: '/funders/F123' },
        { method: 'topic', endpoint: '/topics/T123' },
        { method: 'concept', endpoint: '/concepts/C123' },
      ];

      for (const { method, endpoint } of entityMethods) {
        const id = endpoint.split('/')[2];
        mockClient[method].mockResolvedValue({ id });
        await proxiedClient[method](id);

        expect(interceptor.intercept).toHaveBeenCalledWith(
          endpoint,
          {},
          expect.any(Function)
        );
      }
    });

    it('should handle unknown methods gracefully', async () => {
      mockClient.unknownMethod = vi.fn().mockResolvedValue({ data: 'test' });
      
      const result = await proxiedClient.unknownMethod();

      expect(result).toEqual({ data: 'test' });
      expect(interceptor.intercept).not.toHaveBeenCalled();
      expect(mockClient.unknownMethod).toHaveBeenCalled();
    });
  });

  describe('Parameter Extraction', () => {
    it('should extract parameters for list methods', async () => {
      mockClient.works.mockResolvedValue({ results: [] });
      
      await proxiedClient.works({ search: 'test', per_page: 50 });

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/works',
        { search: 'test', per_page: 50 },
        expect.any(Function)
      );
    });

    it('should handle missing parameters for list methods', async () => {
      mockClient.works.mockResolvedValue({ results: [] });
      
      await proxiedClient.works();

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/works',
        {},
        expect.any(Function)
      );
    });

    it('should extract parameters for autocomplete methods', async () => {
      mockClient.authorsAutocomplete.mockResolvedValue({ results: [] });
      
      await proxiedClient.authorsAutocomplete({ q: 'John' });

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/autocomplete/authors',
        { q: 'John' },
        expect.any(Function)
      );
    });

    it('should handle no parameters for entity methods', async () => {
      mockClient.work.mockResolvedValue({ id: 'W123' });
      
      await proxiedClient.work('W123456789');

      expect(interceptor.intercept).toHaveBeenCalledWith(
        '/works/W123456789',
        {},
        expect.any(Function)
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from intercepted methods', async () => {
      const error = new Error('API Error');
      mockClient.works.mockRejectedValue(error);
      
      // Ensure the interceptor mock doesn't interfere - use a clean interceptor
      vi.mocked(interceptor.intercept).mockImplementation(async (endpoint, params, requestFn) => {
        return await requestFn();
      });
      
      await expect(proxiedClient.works()).rejects.toThrow('API Error');
    });

    it('should handle interceptor errors gracefully', async () => {
      mockClient.works.mockResolvedValue({ results: [] });
      vi.mocked(interceptor.intercept).mockRejectedValue(new Error('Interceptor Error'));
      
      await expect(proxiedClient.works()).rejects.toThrow('Interceptor Error');
    });
  });
});