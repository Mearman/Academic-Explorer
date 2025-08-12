/**
 * Unit tests for OpenAlex main index.ts
 * Tests all exports and import functionality
 */

import { describe, it, expect } from 'vitest';

describe('OpenAlex Index Exports', () => {
  describe('Client Exports', () => {
    it('should export OpenAlexClient', async () => {
      const { OpenAlexClient } = await import('./index');
      expect(OpenAlexClient).toBeDefined();
      expect(typeof OpenAlexClient).toBe('function');
    });

    it('should export openAlex instance', async () => {
      const { openAlex } = await import('./index');
      expect(openAlex).toBeDefined();
      expect(typeof openAlex).toBe('object');
      expect(openAlex).toBeInstanceOf(Object);
    });

    it('should export OpenAlexError', async () => {
      const { OpenAlexError } = await import('./index');
      expect(OpenAlexError).toBeDefined();
      expect(typeof OpenAlexError).toBe('function');
    });
  });

  describe('Cached Client Exports', () => {
    it('should export cachedClient', async () => {
      const { cachedClient } = await import('./index');
      expect(cachedClient).toBeDefined();
    });

    it('should export createCachedClient', async () => {
      const { createCachedClient } = await import('./index');
      expect(createCachedClient).toBeDefined();
      expect(typeof createCachedClient).toBe('function');
    });

    it('should export clearCache', async () => {
      const { clearCache } = await import('./index');
      expect(clearCache).toBeDefined();
      expect(typeof clearCache).toBe('function');
    });

    it('should export getCacheStats', async () => {
      const { getCacheStats } = await import('./index');
      expect(getCacheStats).toBeDefined();
      expect(typeof getCacheStats).toBe('function');
    });

    it('should export warmupCache', async () => {
      const { warmupCache } = await import('./index');
      expect(warmupCache).toBeDefined();
      expect(typeof warmupCache).toBe('function');
    });

    it('should export CachedOpenAlexClient', async () => {
      const { CachedOpenAlexClient } = await import('./index');
      expect(CachedOpenAlexClient).toBeDefined();
      expect(typeof CachedOpenAlexClient).toBe('function');
    });

    it('should export cachedOpenAlex', async () => {
      const { cachedOpenAlex } = await import('./index');
      expect(cachedOpenAlex).toBeDefined();
      expect(typeof cachedOpenAlex).toBe('object');
      expect(cachedOpenAlex).toBeInstanceOf(Object);
    });
  });

  describe('Utility Exports', () => {
    it('should export CacheInterceptor', async () => {
      const { CacheInterceptor } = await import('./index');
      expect(CacheInterceptor).toBeDefined();
      expect(typeof CacheInterceptor).toBe('function');
    });

    it('should export withCache', async () => {
      const { withCache } = await import('./index');
      expect(withCache).toBeDefined();
      expect(typeof withCache).toBe('function');
    });

    it('should export query builder utilities', async () => {
      const { query, filters, combineFilters } = await import('./index');
      expect(query).toBeDefined();
      expect(typeof query).toBe('function');
      expect(filters).toBeDefined();
      expect(combineFilters).toBeDefined();
      expect(typeof combineFilters).toBe('function');
    });

    it('should export pagination utilities', async () => {
      const { paginate, Paginator, BatchProcessor } = await import('./index');
      expect(paginate).toBeDefined();
      expect(typeof paginate).toBe('function');
      expect(Paginator).toBeDefined();
      expect(typeof Paginator).toBe('function');
      expect(BatchProcessor).toBeDefined();
      expect(typeof BatchProcessor).toBe('function');
    });

    it('should export transformer utilities', async () => {
      const {
        reconstructAbstract,
        extractAuthorNames,
        getBestAccessUrl,
        formatCitation,
        calculateCollaborationMetrics,
        buildCoAuthorshipNetwork,
        entitiesToCSV,
      } = await import('./index');

      expect(reconstructAbstract).toBeDefined();
      expect(typeof reconstructAbstract).toBe('function');
      expect(extractAuthorNames).toBeDefined();
      expect(typeof extractAuthorNames).toBe('function');
      expect(getBestAccessUrl).toBeDefined();
      expect(typeof getBestAccessUrl).toBe('function');
      expect(formatCitation).toBeDefined();
      expect(typeof formatCitation).toBe('function');
      expect(calculateCollaborationMetrics).toBeDefined();
      expect(typeof calculateCollaborationMetrics).toBe('function');
      expect(buildCoAuthorshipNetwork).toBeDefined();
      expect(typeof buildCoAuthorshipNetwork).toBe('function');
      expect(entitiesToCSV).toBeDefined();
      expect(typeof entitiesToCSV).toBe('function');
    });

    it('should export cache utilities', async () => {
      const { CacheManager, defaultCache, cached } = await import('./index');
      expect(CacheManager).toBeDefined();
      expect(typeof CacheManager).toBe('function');
      expect(defaultCache).toBeDefined();
      expect(cached).toBeDefined();
      expect(typeof cached).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should export all entity types via typescript', async () => {
      // Test that types can be imported (this will fail at compile time if types don't exist)
      const module = await import('./index');
      
      // Since these are TypeScript types, we can't test them at runtime
      // But importing the module ensures all exports are available
      expect(module).toBeDefined();
    });
  });

  describe('Wildcard Re-exports', () => {
    it('should re-export all client functionality', async () => {
      const module = await import('./index');
      
      // Test that wildcard exports from './client' are available
      expect(module.OpenAlexClient).toBeDefined();
      expect(module.openAlex).toBeDefined();
      expect(module.OpenAlexError).toBeDefined();
    });

    it('should re-export all types functionality', async () => {
      const module = await import('./index');
      
      // The types should be available as part of the module
      expect(module).toBeDefined();
    });

    it('should re-export all utils functionality', async () => {
      const module = await import('./index');
      
      // Test some key utils that should be available via wildcard export
      expect(module.query).toBeDefined();
      expect(module.paginate).toBeDefined();
      expect(module.CacheManager).toBeDefined();
    });
  });

  describe('Module Integration', () => {
    it('should allow creating an OpenAlexClient instance', async () => {
      const { OpenAlexClient } = await import('./index');
      
      const client = new OpenAlexClient();
      expect(client).toBeInstanceOf(OpenAlexClient);
    });

    it('should allow using the openAlex instance', async () => {
      const { openAlex } = await import('./index');
      
      expect(openAlex).toBeDefined();
      expect(typeof openAlex.works).toBe('function');
      expect(typeof openAlex.authors).toBe('function');
    });

    it('should allow creating cached client', async () => {
      const { createCachedClient } = await import('./index');
      
      const cachedClient = createCachedClient();
      expect(cachedClient).toBeDefined();
    });

    it('should allow using query builder', async () => {
      const { query } = await import('./index');
      
      const builder = query();
      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe('function');
    });

    it('should allow using transformer functions', async () => {
      const { extractAuthorNames } = await import('./index');
      
      // Test with mock work object
      const mockWork = {
        authorships: [
          { author: { display_name: 'John Doe' } },
          { author: { display_name: 'Jane Smith' } }
        ]
      };
      
      const names = extractAuthorNames(mockWork as any);
      expect(Array.isArray(names)).toBe(true);
      expect(names).toHaveLength(2);
      expect(names).toContain('John Doe');
      expect(names).toContain('Jane Smith');
    });
  });

  describe('Error Handling', () => {
    it('should export OpenAlexError class that can be instantiated', async () => {
      const { OpenAlexError } = await import('./index');
      
      const error = new OpenAlexError('Test error', 500);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OpenAlexError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
    });
  });
});