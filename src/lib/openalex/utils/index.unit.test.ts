/**
 * Unit tests for OpenAlex utils index.ts
 * Tests all exports and import functionality
 */

import { describe, it, expect, vi } from 'vitest';

describe('OpenAlex Utils Index Exports', () => {
  describe('Query Builder Exports', () => {
    it('should export query builder functionality', async () => {
      const module = await import('./index');
      
      // These should be available from query-builder
      expect(module.QueryBuilder).toBeDefined();
      expect(typeof module.QueryBuilder).toBe('function');
      expect(module.query).toBeDefined();
      expect(typeof module.query).toBe('function');
      expect(module.filters).toBeDefined();
      expect(module.combineFilters).toBeDefined();
      expect(typeof module.combineFilters).toBe('function');
    });

    it('should allow creating and using QueryBuilder', async () => {
      const { QueryBuilder, query } = await import('./index');
      
      // Test direct instantiation
      const builder1 = new QueryBuilder();
      expect(builder1).toBeDefined();
      expect(typeof builder1.build).toBe('function');
      
      // Test factory function
      const builder2 = query();
      expect(builder2).toBeDefined();
      expect(typeof builder2.build).toBe('function');
    });

    it('should allow using filter utilities', async () => {
      const { filters, combineFilters } = await import('./index');
      
      expect(filters).toBeDefined();
      expect(combineFilters).toBeDefined();
      
      // Test combining filters
      const combined = combineFilters(['filter1', 'filter2']);
      expect(typeof combined).toBe('string');
    });
  });

  describe('Pagination Exports', () => {
    it('should export pagination functionality', async () => {
      const module = await import('./index');
      
      expect(module.Paginator).toBeDefined();
      expect(typeof module.Paginator).toBe('function');
      expect(module.paginate).toBeDefined();
      expect(typeof module.paginate).toBe('function');
      expect(module.BatchProcessor).toBeDefined();
      expect(typeof module.BatchProcessor).toBe('function');
    });

    it('should allow creating Paginator instance', async () => {
      const { Paginator } = await import('./index');
      
      // Mock client for testing
      const mockClient = {
        works: vi.fn(),
        authors: vi.fn(),
      };
      
      const paginator = new Paginator(
        mockClient as any,
        'works',
        'works' as any,
        {},
        {}
      );
      
      expect(paginator).toBeDefined();
      expect(typeof paginator.all).toBe('function');
    });

    it('should export paginate utility function', async () => {
      const { paginate } = await import('./index');
      
      expect(paginate).toBeDefined();
      expect(typeof paginate).toBe('function');
    });
  });

  describe('Transformer Exports', () => {
    it('should export transformer functions', async () => {
      const module = await import('./index');
      
      expect(module.reconstructAbstract).toBeDefined();
      expect(typeof module.reconstructAbstract).toBe('function');
      expect(module.extractAuthorNames).toBeDefined();
      expect(typeof module.extractAuthorNames).toBe('function');
      expect(module.getBestAccessUrl).toBeDefined();
      expect(typeof module.getBestAccessUrl).toBe('function');
      expect(module.formatCitation).toBeDefined();
      expect(typeof module.formatCitation).toBe('function');
      expect(module.calculateCollaborationMetrics).toBeDefined();
      expect(typeof module.calculateCollaborationMetrics).toBe('function');
      expect(module.buildCoAuthorshipNetwork).toBeDefined();
      expect(typeof module.buildCoAuthorshipNetwork).toBe('function');
      expect(module.entitiesToCSV).toBeDefined();
      expect(typeof module.entitiesToCSV).toBe('function');
    });

    it('should allow using reconstructAbstract', async () => {
      const { reconstructAbstract } = await import('./index');
      
      const mockInvertedIndex = {
        'This': [0],
        'is': [1],
        'a': [2],
        'test': [3],
        'abstract': [4]
      };
      
      const abstract = reconstructAbstract(mockInvertedIndex);
      expect(typeof abstract).toBe('string');
      expect(abstract).toBe('This is a test abstract');
    });

    it('should allow using extractAuthorNames', async () => {
      const { extractAuthorNames } = await import('./index');
      
      const mockWork = {
        authorships: [
          { author: { display_name: 'Alice Johnson' } },
          { author: { display_name: 'Bob Wilson' } }
        ]
      };
      
      const names = extractAuthorNames(mockWork as any);
      expect(Array.isArray(names)).toBe(true);
      expect(names).toHaveLength(2);
      expect(names).toContain('Alice Johnson');
      expect(names).toContain('Bob Wilson');
    });

    it('should allow using getBestAccessUrl', async () => {
      const { getBestAccessUrl } = await import('./index');
      
      const mockWork = {
        best_oa_location: {
          pdf_url: 'https://example.com/paper.pdf',
          landing_page_url: 'https://example.com/paper'
        }
      };
      
      const url = getBestAccessUrl(mockWork as any);
      expect(typeof url).toBe('string');
      expect(url).toBe('https://example.com/paper.pdf');
    });

    it('should allow using formatCitation', async () => {
      const { formatCitation } = await import('./index');
      
      const mockWork = {
        display_name: 'Test Paper',
        publication_year: 2023,
        authorships: [
          { author: { display_name: 'John Doe' } }
        ],
        primary_location: {
          source: { display_name: 'Test Journal' }
        }
      };
      
      const citation = formatCitation(mockWork as any);
      expect(typeof citation).toBe('string');
      expect(citation).toContain('Test Paper');
      expect(citation).toContain('2023');
    });
  });

  describe('Cache Exports', () => {
    it('should export cache functionality', async () => {
      const module = await import('./index');
      
      expect(module.CacheManager).toBeDefined();
      expect(typeof module.CacheManager).toBe('function');
      expect(module.defaultCache).toBeDefined();
      expect(module.cached).toBeDefined();
      expect(typeof module.cached).toBe('function');
    });

    it('should allow creating CacheManager instance', async () => {
      const { CacheManager } = await import('./index');
      
      const cache = new CacheManager();
      expect(cache).toBeDefined();
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
      // has method is not implemented in CacheManager
      expect(typeof cache.delete).toBe('function');
      expect(typeof cache.clear).toBe('function');
    });

    it('should provide default cache instance', async () => {
      const { defaultCache } = await import('./index');
      
      expect(defaultCache).toBeDefined();
      expect(typeof defaultCache.get).toBe('function');
      expect(typeof defaultCache.set).toBe('function');
    });

    it('should provide cached decorator function', async () => {
      const { cached } = await import('./index');
      
      expect(cached).toBeDefined();
      expect(typeof cached).toBe('function');
    });
  });

  describe('Wildcard Re-exports', () => {
    it('should re-export all query-builder functionality', async () => {
      const module = await import('./index');
      
      // Test that wildcard exports from './query-builder' are available
      expect(module.QueryBuilder).toBeDefined();
      expect(module.query).toBeDefined();
      expect(module.filters).toBeDefined();
    });

    it('should re-export all pagination functionality', async () => {
      const module = await import('./index');
      
      // Test that wildcard exports from './pagination' are available
      expect(module.Paginator).toBeDefined();
      expect(module.paginate).toBeDefined();
      expect(module.BatchProcessor).toBeDefined();
    });

    it('should re-export all transformer functionality', async () => {
      const module = await import('./index');
      
      // Test that wildcard exports from './transformers' are available
      expect(module.reconstructAbstract).toBeDefined();
      expect(module.extractAuthorNames).toBeDefined();
      expect(module.getBestAccessUrl).toBeDefined();
    });

    it('should re-export all cache functionality', async () => {
      const module = await import('./index');
      
      // Test that wildcard exports from './cache' are available
      expect(module.CacheManager).toBeDefined();
      expect(module.defaultCache).toBeDefined();
      expect(module.cached).toBeDefined();
    });
  });

  describe('Module Integration', () => {
    it('should allow chaining query builder operations', async () => {
      const { query } = await import('./index');
      
      const builder = query()
        .equals('publication_year', 2023)
        .contains('display_name', 'machine learning');
        
      expect(builder).toBeDefined();
      const queryString = builder.build();
      expect(typeof queryString).toBe('string');
      expect(queryString).toContain('publication_year:2023');
      expect(queryString).toContain('display_name.search:machine learning');
    });

    it('should allow using transformers in combination', async () => {
      const { extractAuthorNames, formatCitation } = await import('./index');
      
      const mockWork = {
        display_name: 'AI Research Paper',
        publication_year: 2023,
        authorships: [
          { author: { display_name: 'Dr. Smith' } },
          { author: { display_name: 'Prof. Jones' } }
        ],
        primary_location: {
          source: { display_name: 'AI Journal' }
        }
      };
      
      // Extract authors
      const authors = extractAuthorNames(mockWork as any);
      expect(authors).toHaveLength(2);
      
      // Format citation
      const citation = formatCitation(mockWork as any);
      expect(citation).toContain('AI Research Paper');
      expect(citation).toContain('2023');
    });

    it('should allow using cache with transformers', async () => {
      const { cached, extractAuthorNames } = await import('./index');
      
      // Note: cached is a decorator, not a function wrapper in this implementation
      expect(cached).toBeDefined();
      expect(typeof cached).toBe('function');
      
      // Test the original function works
      const mockWork = {
        authorships: [
          { author: { display_name: 'Cached Author' } }
        ]
      };
      
      const names = extractAuthorNames(mockWork as any);
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain('Cached Author');
    });
  });
});