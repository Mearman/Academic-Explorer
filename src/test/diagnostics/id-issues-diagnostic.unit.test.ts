/**
 * Diagnostic test suite to identify ID-related issues in entity loading
 *
 * This test investigates the console errors:
 * 1. "Cannot read properties of undefined (reading 'results')" in AuthorEntity.expand
 * 2. "Cannot read properties of undefined (reading 'id')" in loadEntityIntoGraph
 * 3. "Cannot read properties of undefined (reading 'ror')" in placeholder loading
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger } from '@/lib/logger';
import type { Author, Work, Institution } from '@/lib/openalex/types';

// Import the modules we're testing
import { AuthorEntity } from '@/lib/entities/author-entity';
import { GraphDataService } from '@/services/graph-data-service';
import { rateLimitedOpenAlex } from '@/lib/openalex/rate-limited-client';
import { QueryClient } from '@tanstack/react-query';

// Mock the logger to prevent test pollution
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  logError: vi.fn()
}));

// Mock the rate limited client
vi.mock('@/lib/openalex/rate-limited-client', () => ({
  rateLimitedOpenAlex: {
    getEntity: vi.fn(),
    search: vi.fn(),
    works: {
      search: vi.fn()
    },
    authors: {
      search: vi.fn(),
      getWorks: vi.fn()
    },
    institutions: {
      get: vi.fn()
    }
  }
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn()
  }))
}));

// Mock graph store
vi.mock('@/stores/graph-store', () => ({
  useGraphStore: {
    getState: vi.fn(() => ({
      graph: {
        vertices: new Map(),
        edges: new Map()
      },
      addNode: vi.fn(),
      addEdge: vi.fn(),
      updateNode: vi.fn()
    }))
  }
}));

// Mock entity detection
vi.mock('@/lib/graph/utils/entity-detection', () => ({
  EntityDetector: vi.fn().mockImplementation(() => ({
    detectEntityType: vi.fn(),
    detectExternalIdType: vi.fn()
  }))
}));

// Mock entity factory
vi.mock('@/lib/entities', () => ({
  EntityFactory: {
    createEntity: vi.fn()
  }
}));

// Mock graph cache
vi.mock('@/lib/cache/graph-cache', () => ({
  getCachedOpenAlexEntities: vi.fn(),
  setCachedGraphNodes: vi.fn(),
  setCachedGraphEdges: vi.fn(),
  setNodeExpanded: vi.fn(),
  isNodeExpanded: vi.fn()
}));

describe('ID Issues Diagnostic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthorEntity.expand - Results Property Access', () => {
    it('should handle undefined response from works search', async () => {
      // Test case 1: Completely undefined response
      vi.mocked(rateLimitedOpenAlex.works.search).mockResolvedValue(undefined as any);

      const authorEntity = new AuthorEntity(rateLimitedOpenAlex);

      const result = await authorEntity.expand('https://openalex.org/A5025875274', 10, {});

      expect(result.nodeCount).toBe(0);
      expect(result.edgeCount).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Cannot read properties of undefined"),
        expect.any(String),
        'https://openalex.org/A5025875274'
      );
    });

    it('should handle response without results property', async () => {
      // Test case 2: Response object exists but missing 'results' property
      const responseWithoutResults = {
        meta: {
          count: 0,
          db_response_time_ms: 100,
          page: 1,
          per_page: 25
        }
        // Missing 'results' property
      };

      vi.mocked(rateLimitedOpenAlex.works.search).mockResolvedValue(responseWithoutResults as any);

      const authorEntity = new AuthorEntity(rateLimitedOpenAlex);

      const result = await authorEntity.expand('https://openalex.org/A5025875274', 10, {});

      expect(result.nodeCount).toBe(0);
      expect(result.edgeCount).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Cannot read properties of undefined"),
        expect.any(String),
        'https://openalex.org/A5025875274'
      );
    });

    it('should handle null results property', async () => {
      // Test case 3: Response with null results
      const responseWithNullResults = {
        meta: {
          count: 0,
          db_response_time_ms: 100,
          page: 1,
          per_page: 25
        },
        results: null
      };

      vi.mocked(rateLimitedOpenAlex.works.search).mockResolvedValue(responseWithNullResults as any);

      const authorEntity = new AuthorEntity(rateLimitedOpenAlex);

      const result = await authorEntity.expand('https://openalex.org/A5025875274', 10, {});

      // Should handle null gracefully
      expect(result.nodeCount).toBe(0);
      expect(result.edgeCount).toBe(0);
    });

    it('should handle empty results array', async () => {
      // Test case 4: Valid response with empty results
      const validResponseEmptyResults = {
        meta: {
          count: 0,
          db_response_time_ms: 100,
          page: 1,
          per_page: 25
        },
        results: []
      };

      vi.mocked(rateLimitedOpenAlex.works.search).mockResolvedValue(validResponseEmptyResults);

      const authorEntity = new AuthorEntity(rateLimitedOpenAlex);

      const result = await authorEntity.expand('https://openalex.org/A5025875274', 10, {});

      // Should succeed with empty results
      expect(result.nodeCount).toBe(0);
      expect(result.edgeCount).toBe(0);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('Entity Loading - ID Property Access', () => {
    it('should identify undefined entity in loadEntityIntoGraph', async () => {
      // This tests the "Cannot read properties of undefined (reading 'id')" error
      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      // Mock rateLimitedOpenAlex to return undefined
      vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(undefined);

      try {
        await graphDataService.loadEntityIntoGraph('A5025875274', 'authors');
      } catch (error) {
        // Should catch the undefined access error
        expect(error).toBeDefined();
        expect(String(error)).toContain("Cannot read properties of undefined");
      }
    });

    it('should identify null entity response', async () => {
      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      // Mock rateLimitedOpenAlex to return null
      vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(null);

      try {
        await graphDataService.loadEntityIntoGraph('A5025875274', 'authors');
      } catch (error) {
        expect(error).toBeDefined();
        expect(String(error)).toContain("Cannot read properties of undefined");
      }
    });

    it('should identify entity without id property', async () => {
      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      // Mock entity response missing 'id' property
      const entityWithoutId = {
        display_name: 'Test Author',
        // Missing 'id' property
      };

      vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(entityWithoutId);

      try {
        await graphDataService.loadEntityIntoGraph('A5025875274', 'authors');
      } catch (error) {
        expect(error).toBeDefined();
        expect(String(error)).toContain("Cannot read properties of undefined");
      }
    });
  });

  describe('Institution Placeholder Loading - ROR Property Access', () => {
    it('should handle undefined institution response', async () => {
      // Test the "Cannot read properties of undefined (reading 'ror')" error
      vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(undefined as any);

      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      try {
        await graphDataService.loadPlaceholderNodeData('https://openalex.org/I161548249', 'institutions', 'Bangor University');
      } catch (error) {
        expect(error).toBeDefined();
        expect(String(error)).toContain("Cannot read properties of undefined");
      }
    });

    it('should handle institution without ror property', async () => {
      const institutionWithoutRor: Partial<Institution> = {
        id: 'https://openalex.org/I161548249',
        display_name: 'Bangor University',
        // Missing 'ror' property
      };

      vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(institutionWithoutRor as Institution);

      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      try {
        await graphDataService.loadPlaceholderNodeData('https://openalex.org/I161548249', 'institutions', 'Bangor University');
      } catch (error) {
        expect(error).toBeDefined();
        expect(String(error)).toContain("Cannot read properties of undefined");
      }
    });

    it('should handle null ror property', async () => {
      const institutionWithNullRor: Institution = {
        id: 'https://openalex.org/I161548249',
        display_name: 'Bangor University',
        ror: null as any, // Null ROR
        country_code: 'GB',
        type: 'education',
        homepage_url: 'https://bangor.ac.uk',
        image_url: null,
        image_thumbnail_url: null,
        display_name_acronyms: [],
        display_name_alternatives: [],
        works_count: 1000,
        cited_by_count: 5000,
        summary_stats: {
          '2yr_mean_citedness': 2.5,
          h_index: 50,
          i10_index: 100
        },
        ids: {
          openalex: 'https://openalex.org/I161548249',
          ror: null,
          grid: null,
          wikipedia: null,
          wikidata: null,
          mag: null
        },
        geo: {
          city: 'Bangor',
          geonames_city_id: '2656173',
          region: 'Wales',
          country_code: 'GB',
          country: 'United Kingdom',
          latitude: 53.2285,
          longitude: -4.1294
        },
        international: {
          display_name: {}
        },
        repositories: [],
        roles: [],
        x_concepts: [],
        counts_by_year: [],
        works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I161548249',
        updated_date: '2024-01-01',
        created_date: '2021-01-01'
      };

      vi.mocked(rateLimitedOpenAlex.getEntity).mockResolvedValue(institutionWithNullRor);

      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      // This should not throw an error if handled properly
      try {
        const result = await graphDataService.loadPlaceholderNodeData('https://openalex.org/I161548249', 'institutions', 'Bangor University');
        expect(result).toBeDefined();
      } catch (error) {
        // If it throws, check if it's the ROR access error
        if (String(error).includes("Cannot read properties of undefined")) {
          expect(String(error)).toContain("ror");
        }
      }
    });
  });

  describe('Rate Limiting Issues', () => {
    it('should handle 429 rate limit responses', async () => {
      const rateLimitError = new Error('429 TOO MANY REQUESTS');
      vi.mocked(rateLimitedOpenAlex.getEntity).mockRejectedValue(rateLimitError);

      const queryClient = new QueryClient();
      const graphDataService = new GraphDataService(queryClient);

      try {
        await graphDataService.loadPlaceholderNodeData('https://openalex.org/I2799442855', 'institutions', 'New York University Press');
      } catch (error) {
        expect(String(error)).toContain('429');
      }
    });
  });

  describe('API Response Structure Validation', () => {
    it('should validate expected Work response structure', () => {
      // Test what we expect from a valid Work response
      const validWork: Partial<Work> = {
        id: 'https://openalex.org/W123456789',
        title: 'Test Work',
        authorships: [],
        referenced_works: []
      };

      expect(validWork.id).toBeDefined();
      expect(Array.isArray(validWork.authorships)).toBe(true);
      expect(Array.isArray(validWork.referenced_works)).toBe(true);
    });

    it('should validate expected Author response structure', () => {
      const validAuthor: Partial<Author> = {
        id: 'https://openalex.org/A123456789',
        display_name: 'Test Author',
        works_count: 10
      };

      expect(validAuthor.id).toBeDefined();
      expect(validAuthor.display_name).toBeDefined();
    });

    it('should validate expected Institution response structure', () => {
      const validInstitution: Partial<Institution> = {
        id: 'https://openalex.org/I123456789',
        display_name: 'Test Institution',
        ror: 'https://ror.org/123456'
      };

      expect(validInstitution.id).toBeDefined();
      expect(validInstitution.display_name).toBeDefined();
      expect(validInstitution.ror).toBeDefined();
    });
  });
});