/**
 * Unit tests for AuthorEntity class
 * Tests author-specific operations like expanding works and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorEntity } from './author-entity';
import type { RateLimitedOpenAlexClient } from '@/lib/openalex/rate-limited-client';
import type { Author, Work, OpenAlexResponse } from '@/lib/openalex/types';
import { logger } from '@/lib/logger';

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  },
  logError: vi.fn()
}));

describe('AuthorEntity', () => {
  let mockClient: vi.Mocked<RateLimitedOpenAlexClient>;
  let authorEntity: AuthorEntity;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create comprehensive mock client
    mockClient = {
      getEntity: vi.fn(),
      getWorks: vi.fn(),
      search: vi.fn(),
      works: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      },
      authors: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn(),
        getWorks: vi.fn()
      },
      institutions: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      },
      sources: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      },
      topics: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      },
      publishers: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      },
      funders: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      },
      concepts: {
        search: vi.fn(),
        get: vi.fn(),
        getMultiple: vi.fn(),
        stream: vi.fn()
      }
    } as vi.Mocked<RateLimitedOpenAlexClient>;

    authorEntity = new AuthorEntity(mockClient);
  });

  describe('constructor', () => {
    it('should create AuthorEntity with client', () => {
      expect(authorEntity).toBeDefined();
      expect(authorEntity['entityType']).toBe('authors');
    });

    it('should create AuthorEntity with client and entity data', () => {
      const authorData: Partial<Author> = {
        id: 'https://openalex.org/A5025875274',
        display_name: 'Test Author'
      };

      const entityWithData = new AuthorEntity(mockClient, authorData as Author);
      expect(entityWithData).toBeDefined();
    });
  });

  describe('expand', () => {
    const entityId = 'https://openalex.org/A5025875274';
    const context = {
      entityId: 'https://openalex.org/A5025875274',
      entityType: 'authors' as const,
      client: mockClient
    };
    const options = { limit: 10 };

    it('should successfully expand author with valid works response', async () => {
      const mockWorksResponse: OpenAlexResponse<Work> = {
        meta: {
          count: 2,
          db_response_time_ms: 100,
          page: 1,
          per_page: 25
        },
        results: [
          {
            id: 'https://openalex.org/W1',
            title: 'Work 1',
            authorships: [],
            referenced_works: [],
            publication_year: 2023
          } as Work,
          {
            id: 'https://openalex.org/W2',
            title: 'Work 2',
            authorships: [],
            referenced_works: [],
            publication_year: 2022
          } as Work
        ]
      };

      mockClient.getWorks.mockResolvedValue(mockWorksResponse);

      const result = await authorEntity.expand(context, options);

      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(2);
      expect(mockClient.getWorks).toHaveBeenCalledWith({
        filter: `authorships.author.id:${entityId}`,
        per_page: Math.min(options.limit || 10, 8),
        sort: "publication_year:desc"
      });
    });

    it('should handle empty works response gracefully', async () => {
      const emptyResponse: OpenAlexResponse<Work> = {
        meta: {
          count: 0,
          db_response_time_ms: 100,
          page: 1,
          per_page: 25
        },
        results: []
      };

      mockClient.getWorks.mockResolvedValue(emptyResponse);

      const result = await authorEntity.expand(context, options);

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
      expect(logger.error).not.toHaveBeenCalled();
    });

    describe('error handling', () => {
      it('should handle undefined response from works search', async () => {
        mockClient.getWorks.mockResolvedValue(undefined as any);

        const result = await authorEntity.expand(context, options);

        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
        expect(logger.error).toHaveBeenCalledWith(
          "graph",
          "Works response is undefined",
          entityId
        );
      });

      it('should handle response without results property', async () => {
        const responseWithoutResults = {
          meta: {
            count: 0,
            db_response_time_ms: 100,
            page: 1,
            per_page: 25
          }
          // Missing 'results' property
        };

        mockClient.getWorks.mockResolvedValue(responseWithoutResults as any);

        const result = await authorEntity.expand(context, options);

        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
        expect(logger.error).toHaveBeenCalledWith(
          "graph",
          "Works response missing results property",
          entityId
        );
      });

      it('should handle null results property', async () => {
        const responseWithNullResults = {
          meta: {
            count: 0,
            db_response_time_ms: 100,
            page: 1,
            per_page: 25
          },
          results: null
        };

        mockClient.getWorks.mockResolvedValue(responseWithNullResults as any);

        const result = await authorEntity.expand(context, options);

        // Should handle null gracefully without throwing
        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
      });

      it('should handle API rejection with proper error logging', async () => {
        const apiError = new Error('API Error');
        mockClient.getWorks.mockRejectedValue(apiError);

        const result = await authorEntity.expand(context, options);

        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
        expect(logger.error).toHaveBeenCalled();
      });

      it('should handle rate limiting errors', async () => {
        const rateLimitError = new Error('429 TOO MANY REQUESTS');
        mockClient.getWorks.mockRejectedValue(rateLimitError);

        const result = await authorEntity.expand(context, options);

        expect(result.nodes).toHaveLength(0);
        expect(result.edges).toHaveLength(0);
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe('field configuration', () => {
    it('should return correct minimal fields for author display', () => {
      const minimalFields = authorEntity['getMinimalFields']();

      expect(minimalFields).toContain('id');
      expect(minimalFields).toContain('display_name');
      expect(minimalFields).toContain('orcid');
    });

    it('should return comprehensive metadata fields', () => {
      const metadataFields = authorEntity['getMetadataFields']();

      expect(metadataFields).toContain('id');
      expect(metadataFields).toContain('display_name');
      expect(metadataFields).toContain('works_count');
      expect(metadataFields).toContain('cited_by_count');
      expect(metadataFields).toContain('affiliations');
    });
  });

  describe('entity validation', () => {
    it('should handle malformed author data', () => {
      const malformedData = {
        // Missing required fields like 'id'
        display_name: 'Test Author'
      };

      expect(() => {
        new AuthorEntity(mockClient, malformedData as Author);
      }).not.toThrow();
    });

    it('should handle null author data', () => {
      expect(() => {
        new AuthorEntity(mockClient, null as any);
      }).not.toThrow();
    });

    it('should handle undefined author data', () => {
      expect(() => {
        new AuthorEntity(mockClient, undefined as any);
      }).not.toThrow();
    });
  });
});