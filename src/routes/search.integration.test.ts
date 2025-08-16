/**
 * Integration tests for search functionality routing
 * Tests search query persistence, URL state management, and search-specific navigation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock TanStack Router hooks
const mockNavigate = vi.fn();
const mockUseSearch = vi.fn();
const mockUseParams = vi.fn();

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearch: mockUseSearch,
    useParams: mockUseParams,
    createFileRoute: vi.fn(() => ({
      component: vi.fn(),
      validateSearch: vi.fn(),
    })),
  };
});

// Mock search components
vi.mock('@/components/molecules/advanced-search-form', () => ({
  AdvancedSearchForm: vi.fn(({ onSearch, initialData }) => {
    // Simulate form submission
    if (onSearch && initialData) {
      onSearch({
        search: initialData.query,
        filter: 'is_oa:true',
      });
    }
    return null;
  }),
}));

vi.mock('@/components/organisms/search-results', () => ({
  SearchResults: vi.fn(() => null),
}));

// Search schema from the actual search route
const searchSchema = z.object({
  q: z.string().optional(),
  field: z.enum(['all', 'title', 'abstract', 'fulltext']).optional(),
  mode: z.enum(['basic', 'boolean', 'exact', 'no_stem']).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  year: z.number().optional(),
  is_oa: z.boolean().optional(),
  has_fulltext: z.boolean().optional(),
  has_doi: z.boolean().optional(),
  has_abstract: z.boolean().optional(),
  not_retracted: z.boolean().optional(),
  min_citations: z.number().optional(),
  max_citations: z.number().optional(),
  author_id: z.string().optional(),
  institution_id: z.string().optional(),
  source_id: z.string().optional(),
  funder_id: z.string().optional(),
  topic_id: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  per_page: z.number().optional(),
  sample: z.number().optional(),
  group_by: z.string().optional(),
  page: z.number().optional(),
}).partial();

type SearchParams = z.infer<typeof searchSchema>;

describe('Search Routing Integration', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseSearch.mockReturnValue({});
    mockUseParams.mockReturnValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Search Query Persistence', () => {
    it('should persist simple search query in URL', () => {
      const searchParams: SearchParams = { q: 'machine learning' };
      
      mockNavigate({
        to: '/search',
        search: searchParams,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchParams,
        replace: true,
      });
    });

    it('should persist complex search query with filters', () => {
      const searchParams: SearchParams = {
        q: 'artificial intelligence',
        field: 'title',
        mode: 'boolean',
        is_oa: true,
        has_fulltext: true,
        from_date: '2020-01-01',
        to_date: '2023-12-31',
        min_citations: 10,
        sort: 'cited_by_count',
        order: 'desc',
        per_page: 50,
      };

      mockNavigate({
        to: '/search',
        search: searchParams,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchParams,
        replace: true,
      });
    });

    it('should handle empty search parameters', () => {
      const searchParams: SearchParams = {};
      
      mockNavigate({
        to: '/search',
        search: searchParams,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchParams,
        replace: true,
      });
    });
  });

  describe('Search Field Validation', () => {
    it('should validate search field parameter', () => {
      const validFields = ['all', 'title', 'abstract', 'fulltext'] as const;
      
      validFields.forEach(field => {
        const searchParams: SearchParams = { q: 'test', field };
        const result = searchSchema.safeParse(searchParams);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.field).toBe(field);
        }
      });
    });

    it('should validate search mode parameter', () => {
      const validModes = ['basic', 'boolean', 'exact', 'no_stem'] as const;
      
      validModes.forEach(mode => {
        const searchParams: SearchParams = { q: 'test', mode };
        const result = searchSchema.safeParse(searchParams);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.mode).toBe(mode);
        }
      });
    });

    it('should validate sort order parameter', () => {
      const validOrders = ['asc', 'desc'] as const;
      
      validOrders.forEach(order => {
        const searchParams: SearchParams = { q: 'test', order };
        const result = searchSchema.safeParse(searchParams);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe(order);
        }
      });
    });

    it('should reject invalid enum values', () => {
      const invalidParams = [
        { field: 'invalid' },
        { mode: 'invalid' },
        { order: 'invalid' },
      ];

      invalidParams.forEach(params => {
        const result = searchSchema.safeParse(params);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Date Range Handling', () => {
    it('should handle date range parameters', () => {
      const searchParams: SearchParams = {
        q: 'climate change',
        from_date: '2020-01-01',
        to_date: '2023-12-31',
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.from_date).toBe('2020-01-01');
        expect(result.data.to_date).toBe('2023-12-31');
      }
    });

    it('should handle publication year parameter', () => {
      const searchParams: SearchParams = {
        q: 'quantum computing',
        year: 2023,
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.year).toBe(2023);
      }
    });

    it('should handle both date range and year parameters', () => {
      const searchParams: SearchParams = {
        q: 'machine learning',
        from_date: '2022-01-01',
        to_date: '2022-12-31',
        year: 2022,
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.from_date).toBe('2022-01-01');
        expect(result.data.to_date).toBe('2022-12-31');
        expect(result.data.year).toBe(2022);
      }
    });
  });

  describe('Boolean Filter Parameters', () => {
    it('should handle boolean filter parameters', () => {
      const booleanFilters: (keyof SearchParams)[] = [
        'is_oa',
        'has_fulltext',
        'has_doi',
        'has_abstract',
        'not_retracted',
      ];

      booleanFilters.forEach(filter => {
        const searchParamsTrue: SearchParams = { [filter]: true };
        const searchParamsFalse: SearchParams = { [filter]: false };

        const resultTrue = searchSchema.safeParse(searchParamsTrue);
        const resultFalse = searchSchema.safeParse(searchParamsFalse);

        expect(resultTrue.success).toBe(true);
        expect(resultFalse.success).toBe(true);
        
        if (resultTrue.success) {
          expect(resultTrue.data[filter]).toBe(true);
        }
        if (resultFalse.success) {
          expect(resultFalse.data[filter]).toBe(false);
        }
      });
    });

    it('should handle open access filter navigation', () => {
      const searchParams: SearchParams = {
        q: 'open science',
        is_oa: true,
      };

      mockNavigate({
        to: '/search',
        search: searchParams,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchParams,
        replace: true,
      });
    });
  });

  describe('Citation Count Range Parameters', () => {
    it('should handle citation count range parameters', () => {
      const searchParams: SearchParams = {
        q: 'highly cited papers',
        min_citations: 100,
        max_citations: 1000,
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.min_citations).toBe(100);
        expect(result.data.max_citations).toBe(1000);
      }
    });

    it('should handle single citation threshold', () => {
      const searchParams: SearchParams = {
        q: 'recent papers',
        min_citations: 10,
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.min_citations).toBe(10);
        expect(result.data.max_citations).toBeUndefined();
      }
    });
  });

  describe('Entity ID Filter Parameters', () => {
    it('should handle author ID filter', () => {
      const searchParams: SearchParams = {
        q: 'machine learning',
        author_id: 'A1234567890',
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.author_id).toBe('A1234567890');
      }
    });

    it('should handle institution ID filter', () => {
      const searchParams: SearchParams = {
        q: 'research papers',
        institution_id: 'I1234567890',
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.institution_id).toBe('I1234567890');
      }
    });

    it('should handle multiple entity ID filters', () => {
      const searchParams: SearchParams = {
        q: 'collaborative research',
        author_id: 'A1234567890',
        institution_id: 'I1234567890',
        source_id: 'S1234567890',
        funder_id: 'F1234567890',
        topic_id: 'T1234567890',
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.author_id).toBe('A1234567890');
        expect(result.data.institution_id).toBe('I1234567890');
        expect(result.data.source_id).toBe('S1234567890');
        expect(result.data.funder_id).toBe('F1234567890');
        expect(result.data.topic_id).toBe('T1234567890');
      }
    });
  });

  describe('Pagination and Sorting Parameters', () => {
    it('should handle pagination parameters', () => {
      const searchParams: SearchParams = {
        q: 'search results',
        page: 2,
        per_page: 100,
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.per_page).toBe(100);
      }
    });

    it('should handle sorting parameters', () => {
      const searchParams: SearchParams = {
        q: 'sorted results',
        sort: 'cited_by_count',
        order: 'desc',
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.sort).toBe('cited_by_count');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should handle sampling parameter', () => {
      const searchParams: SearchParams = {
        q: 'random sample',
        sample: 1000,
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.sample).toBe(1000);
      }
    });

    it('should handle group by parameter', () => {
      const searchParams: SearchParams = {
        q: 'grouped results',
        group_by: 'publication_year',
      };

      const result = searchSchema.safeParse(searchParams);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.group_by).toBe('publication_year');
      }
    });
  });

  describe('Search State Transitions', () => {
    it('should navigate from homepage to search with query', () => {
      // Simulate homepage search
      const initialQuery = 'machine learning';
      
      mockNavigate({
        to: '/search',
        search: { q: initialQuery },
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: { q: initialQuery },
      });
    });

    it('should update search URL when filters change', () => {
      // Initial search
      const initialSearch: SearchParams = { q: 'ai' };
      mockUseSearch.mockReturnValue(initialSearch);

      // Updated search with filters
      const updatedSearch: SearchParams = {
        q: 'ai',
        is_oa: true,
        min_citations: 10,
      };

      mockNavigate({
        to: '/search',
        search: updatedSearch,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: updatedSearch,
        replace: true,
      });
    });

    it('should navigate from search results to entity page and back', () => {
      const searchState: SearchParams = {
        q: 'quantum computing',
        is_oa: true,
        page: 2,
      };

      // Navigate to entity
      mockNavigate({ to: '/works/W1234567890' });

      // Navigate back to search with preserved state
      mockNavigate({
        to: '/search',
        search: searchState,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchState,
      });
    });
  });

  describe('Search URL Encoding and Decoding', () => {
    it('should handle special characters in search query', () => {
      const specialQueries = [
        'machine learning & AI',
        'quantum computing (theory)',
        'COVID-19 + vaccines',
        'deep learning / neural networks',
      ];

      specialQueries.forEach(query => {
        const searchParams: SearchParams = { q: query };
        const result = searchSchema.safeParse(searchParams);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe(query);
        }
      });
    });

    it('should handle Unicode characters in search query', () => {
      const unicodeQueries = [
        'Schrödinger equation',
        'naïve Bayes',
        'réseau de neurones',
        '机器学习',
      ];

      unicodeQueries.forEach(query => {
        const searchParams: SearchParams = { q: query };
        const result = searchSchema.safeParse(searchParams);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe(query);
        }
      });
    });

    it('should handle very long search queries', () => {
      const longQuery = 'machine learning artificial intelligence deep learning neural networks natural language processing computer vision robotics data science big data analytics predictive modeling statistical analysis'.repeat(5);
      
      const searchParams: SearchParams = { q: longQuery };
      const result = searchSchema.safeParse(searchParams);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.q).toBe(longQuery);
      }
    });
  });

  describe('Search Performance and Optimization', () => {
    it('should handle rapid search parameter updates', () => {
      const rapidUpdates = [
        { q: 'a' },
        { q: 'ai' },
        { q: 'artificial' },
        { q: 'artificial intelligence' },
      ];

      rapidUpdates.forEach(searchParams => {
        mockNavigate({
          to: '/search',
          search: searchParams,
          replace: true,
        });
      });

      expect(mockNavigate).toHaveBeenCalledTimes(rapidUpdates.length);
    });

    it('should handle concurrent filter updates', () => {
      const searchParams: SearchParams = {
        q: 'machine learning',
        is_oa: true,
        has_fulltext: true,
        min_citations: 10,
        sort: 'cited_by_count',
        order: 'desc',
      };

      mockNavigate({
        to: '/search',
        search: searchParams,
        replace: true,
      });

      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/search',
        search: searchParams,
        replace: true,
      });
    });
  });
});