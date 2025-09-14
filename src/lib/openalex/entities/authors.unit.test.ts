/**
 * Comprehensive unit tests for AuthorsApi entity class
 * Tests all methods including CRUD, search, filtering, collaboration analysis, and streaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthorsApi, AuthorWorksFilters } from './authors';
import { OpenAlexBaseClient } from '../client';
import type {
  Author,
  OpenAlexResponse,
  Work
} from '../types';

// Mock the base client
vi.mock('../client');

describe('AuthorsApi', () => {
  let authorsApi: AuthorsApi;
  let mockClient: vi.Mocked<OpenAlexBaseClient>;

  beforeEach(() => {
    mockClient = {
      getById: vi.fn(),
      getResponse: vi.fn(),
      stream: vi.fn(),
      getAll: vi.fn(),
    } as unknown as vi.Mocked<OpenAlexBaseClient>;

    authorsApi = new AuthorsApi(mockClient);
  });

  describe('getAuthor', () => {
    it('should fetch a single author by ID', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A2208157607',
        display_name: 'John Doe',
        works_count: 150,
        cited_by_count: 2500,
        orcid: '0000-0003-1613-5981',
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthor('A2208157607');

      expect(mockClient.getById).toHaveBeenCalledWith('authors', 'A2208157607', {});
      expect(result).toEqual(mockAuthor);
    });

    it('should pass query parameters to the client', async () => {
      const mockAuthor: Partial<Author> = { id: 'A123', display_name: 'Test Author' };
      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      await authorsApi.getAuthor('A123', {
        select: ['id', 'display_name', 'works_count']
      });

      expect(mockClient.getById).toHaveBeenCalledWith('authors', 'A123', {
        select: ['id', 'display_name', 'works_count'],
      });
    });

    it('should handle ORCID IDs', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A2208157607',
        orcid: '0000-0003-1613-5981',
        display_name: 'ORCID Author',
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthor('0000-0003-1613-5981');

      expect(mockClient.getById).toHaveBeenCalledWith('authors', '0000-0003-1613-5981', {});
      expect(result).toEqual(mockAuthor);
    });
  });

  describe('getAuthors', () => {
    it('should fetch multiple authors with default parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'Author 1', works_count: 50, cited_by_count: 100 } as Author,
          { id: 'A2', display_name: 'Author 2', works_count: 75, cited_by_count: 200 } as Author,
        ],
        meta: {
          count: 2,
          db_response_time_ms: 12,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await authorsApi.getAuthors();

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {});
      expect(result).toEqual(mockResponse);
    });

    it('should pass filter strings and parameters correctly', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthors({
        filter: 'cited_by_count:>1000',
        sort: 'cited_by_count:desc',
        per_page: 50,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'cited_by_count:>1000',
        sort: 'cited_by_count:desc',
        per_page: 50,
      });
    });
  });

  describe('searchAuthors', () => {
    it('should search authors by query string', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'Einstein' } as Author,
        ],
        meta: { count: 1, db_response_time_ms: 15, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('einstein');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:einstein',
      });
    });

    it('should combine search query with filters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('machine learning', {
        'works_count': '>10',
        'has_orcid': true,
        'cited_by_count': 500,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:machine%20learning,works_count:%3E10,has_orcid:true,cited_by_count:500',
      });
    });

    it('should handle array filters correctly', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 8, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('query', {
        'last_known_institution.id': ['I27837315', 'I123456789'],
        'x_concepts.id': ['C41008148'],
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:query,last_known_institution.id:I27837315%7CI123456789,x_concepts.id:C41008148',
      });
    });

    it('should skip null and undefined filter values', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('test', {
        'works_count': 50,
        'has_orcid': null as unknown as boolean,
        'cited_by_count': undefined as unknown as number,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:test,works_count:50',
      });
    });

    it('should pass additional query parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 7, page: 1, per_page: 100 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('test', {}, {
        per_page: 100,
        sort: 'works_count:desc',
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:test',
        per_page: 100,
        sort: 'works_count:desc',
      });
    });
  });

  describe('getAuthorsByInstitution', () => {
    it('should filter authors by institution ID', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'MIT Author 1' } as Author,
          { id: 'A2', display_name: 'MIT Author 2' } as Author,
        ],
        meta: { count: 2, db_response_time_ms: 18, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsByInstitution('I27837315');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.id:I27837315',
      });
    });

    it('should encode special characters in institution ID', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsByInstitution('I27837315?test=value');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.id:I27837315%3Ftest%3Dvalue',
      });
    });

    it('should pass additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 20 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsByInstitution('I27837315', {
        sort: 'cited_by_count:desc',
        per_page: 20,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.id:I27837315',
        sort: 'cited_by_count:desc',
        per_page: 20,
      });
    });
  });

  describe('getAuthorsByCountry', () => {
    it('should filter authors by country code', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'US Author' } as Author,
        ],
        meta: { count: 1, db_response_time_ms: 12, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsByCountry('US');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.country_code:US',
      });
    });

    it('should convert country code to uppercase', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 8, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsByCountry('gb');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.country_code:GB',
      });
    });

    it('should pass additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 15, page: 1, per_page: 100 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsByCountry('GB', {
        sort: 'works_count:desc',
        per_page: 100,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.country_code:GB',
        sort: 'works_count:desc',
        per_page: 100,
      });
    });
  });

  describe('getAuthorWorks', () => {
    it('should fetch works by a specific author', async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [
          { id: 'W1', display_name: 'Work 1' } as Work,
          { id: 'W2', display_name: 'Work 2' } as Work,
        ],
        meta: { count: 2, db_response_time_ms: 20, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorWorks('A2208157607');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'authorships.author.id:A2208157607',
      });
    });

    it('should combine author filter with additional filters', async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 12, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const filters: AuthorWorksFilters = {
        'publication_year': '>2020',
        'is_oa': true,
        'cited_by_count': 10,
        'type': ['journal-article', 'conference-paper'],
        'primary_topic.id': ['T10555', 'T11234'],
      };

      await authorsApi.getAuthorWorks('A2208157607', filters);

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'authorships.author.id:A2208157607,publication_year:%3E2020,is_oa:true,cited_by_count:10,type:journal-article%7Cconference-paper,primary_topic.id:T10555%7CT11234',
      });
    });

    it('should pass additional query parameters', async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 15, page: 1, per_page: 50 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorWorks('A123', {}, {
        sort: 'publication_date:desc',
        per_page: 50,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'authorships.author.id:A123',
        sort: 'publication_date:desc',
        per_page: 50,
      });
    });

    it('should handle special characters in author ID', async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 8, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorWorks('A123?test=value');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'authorships.author.id:A123%3Ftest%3Dvalue',
      });
    });
  });

  describe('getAuthorConcepts', () => {
    it('should fetch research concepts for an author', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A2208157607',
        x_concepts: [
          { id: 'C41008148', display_name: 'Computer science', score: 0.8, level: 0 },
          { id: 'C154945302', display_name: 'Machine learning', score: 0.6, level: 1 },
        ],
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthorConcepts('A2208157607');

      expect(mockClient.getById).toHaveBeenCalledWith('authors', 'A2208157607', {
        select: ['x_concepts'],
      });
      expect(result).toEqual(mockAuthor.x_concepts);
    });

    it('should return empty array if no concepts', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A123',
        x_concepts: [],
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthorConcepts('A123');

      expect(result).toEqual([]);
    });

    it('should handle missing x_concepts field', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A123',
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthorConcepts('A123');

      expect(result).toEqual([]);
    });

    it('should pass additional query parameters', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A123',
        x_concepts: [],
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      await authorsApi.getAuthorConcepts('A123', { per_page: 100 });

      expect(mockClient.getById).toHaveBeenCalledWith('authors', 'A123', {
        select: ['x_concepts'],
        per_page: 100,
      });
    });
  });

  describe('getAuthorTopics', () => {
    it('should fetch research topics for an author', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A2208157607',
        topics: [
          {
            id: 'T10555',
            display_name: 'Neural networks',
            count: 25,
            subfield: { id: 'T123', display_name: 'Artificial Intelligence' },
            field: { id: 'T456', display_name: 'Computer Science' },
            domain: { id: 'T789', display_name: 'Physical Sciences' },
          },
          {
            id: 'T11234',
            display_name: 'Deep learning',
            count: 15,
          },
        ],
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthorTopics('A2208157607');

      expect(mockClient.getById).toHaveBeenCalledWith('authors', 'A2208157607', {
        select: ['topics'],
      });
      expect(result).toEqual(mockAuthor.topics);
    });

    it('should return empty array if no topics', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A123',
        topics: [],
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthorTopics('A123');

      expect(result).toEqual([]);
    });

    it('should handle missing topics field', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A123',
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      const result = await authorsApi.getAuthorTopics('A123');

      expect(result).toEqual([]);
    });
  });

  describe('getAuthorCollaborators', () => {
    it('should analyze collaborations and return collaborator stats', async () => {
      const mockWorksResponse: OpenAlexResponse<Work> = {
        results: [
          {
            id: 'W1',
            authorships: [
              { author: { id: 'A2208157607' } },
              { author: { id: 'A123' } },
              { author: { id: 'A456' } },
            ],
            publication_year: 2023,
          },
          {
            id: 'W2',
            authorships: [
              { author: { id: 'A2208157607' } },
              { author: { id: 'A123' } },
            ],
            publication_year: 2022,
          },
        ] as Work[],
        meta: { count: 2, db_response_time_ms: 25, page: 1, per_page: 25 },
      };

      const mockCollaborator1: Author = {
        id: 'A123',
        display_name: 'Jane Smith',
        works_count: 50,
        cited_by_count: 750,
      } as Author;

      const mockCollaborator2: Author = {
        id: 'A456',
        display_name: 'Bob Johnson',
        works_count: 30,
        cited_by_count: 400,
      } as Author;

      // Mock the sequence of calls
      mockClient.getResponse.mockResolvedValueOnce(mockWorksResponse);
      mockClient.getById
        .mockResolvedValueOnce(mockCollaborator1)
        .mockResolvedValueOnce(mockCollaborator2);

      const result = await authorsApi.getAuthorCollaborators('A2208157607');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'authorships.author.id:A2208157607',
        select: ['authorships', 'publication_year'],
        per_page: 200,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        author: mockCollaborator1,
        collaboration_count: 2,
        first_collaboration_year: 2022,
        last_collaboration_year: 2023,
      });
      expect(result[1]).toEqual({
        author: mockCollaborator2,
        collaboration_count: 1,
        first_collaboration_year: 2023,
        last_collaboration_year: 2023,
      });
    });

    it('should filter by minimum works threshold', async () => {
      const mockWorksResponse: OpenAlexResponse<Work> = {
        results: [
          {
            id: 'W1',
            authorships: [
              { author: { id: 'A2208157607' } },
              { author: { id: 'A123' } }, // 1 collaboration
              { author: { id: 'A456' } }, // 1 collaboration
            ],
            publication_year: 2023,
          },
        ] as Work[],
        meta: { count: 1, db_response_time_ms: 15, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockWorksResponse);

      const result = await authorsApi.getAuthorCollaborators('A2208157607', {
        min_works: 2, // Should filter out all collaborators with only 1 work
      });

      expect(result).toHaveLength(0);
    });

    it('should filter by publication year range', async () => {
      const mockWorksResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockWorksResponse);

      await authorsApi.getAuthorCollaborators('A2208157607', {
        from_publication_year: 2020,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'authorships.author.id:A2208157607,publication_year:%3E%3D2020',
        select: ['authorships', 'publication_year'],
        per_page: 200,
      });
    });

    it('should handle failed author fetches gracefully', async () => {
      const mockWorksResponse: OpenAlexResponse<Work> = {
        results: [
          {
            id: 'W1',
            authorships: [
              { author: { id: 'A2208157607' } },
              { author: { id: 'A123' } },
            ],
            publication_year: 2023,
          },
        ] as Work[],
        meta: { count: 1, db_response_time_ms: 12, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockWorksResponse);
      mockClient.getById.mockRejectedValue(new Error('Author not found'));

      const result = await authorsApi.getAuthorCollaborators('A2208157607');

      expect(result).toHaveLength(0);
    });
  });

  describe('getRandomAuthors', () => {
    it('should fetch random authors with default count', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'Random Author 1' } as Author,
        ],
        meta: { count: 1, db_response_time_ms: 10, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await authorsApi.getRandomAuthors();

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sample: 25,
        seed: expect.any(Number),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should respect custom count parameter', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 8, page: 1, per_page: 10 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getRandomAuthors(10);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sample: 10,
        seed: expect.any(Number),
      });
    });

    it('should limit count to maximum of 200', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 20, page: 1, per_page: 200 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getRandomAuthors(1000);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sample: 200,
        seed: expect.any(Number),
      });
    });

    it('should set minimum count to 1', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 1 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getRandomAuthors(0);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sample: 1,
        seed: expect.any(Number),
      });
    });

    it('should include additional filters when provided', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 12, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getRandomAuthors(20, {
        filter: 'cited_by_count:>100',
        sort: 'works_count:desc',
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sample: 20,
        seed: expect.any(Number),
        filter: 'cited_by_count:>100',
        sort: 'works_count:desc',
      });
    });
  });

  describe('getAuthorsWithOrcid', () => {
    it('should filter authors with ORCID identifiers', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'Author with ORCID', orcid: '0000-0003-1613-5981' } as Author,
        ],
        meta: { count: 1, db_response_time_ms: 15, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsWithOrcid();

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'has_orcid:true',
      });
    });

    it('should pass additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 100 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthorsWithOrcid({
        sort: 'works_count:desc',
        per_page: 100,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'has_orcid:true',
        sort: 'works_count:desc',
        per_page: 100,
      });
    });
  });

  describe('getMostCitedAuthors', () => {
    it('should fetch most cited authors with default limit', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'Highly Cited Author', cited_by_count: 10000 } as Author,
        ],
        meta: { count: 1, db_response_time_ms: 20, page: 1, per_page: 50 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostCitedAuthors();

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sort: 'cited_by_count:desc',
        per_page: 50,
      });
    });

    it('should respect custom limit', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 18, page: 1, per_page: 100 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostCitedAuthors(100);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sort: 'cited_by_count:desc',
        per_page: 100,
      });
    });

    it('should limit to maximum of 200', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 25, page: 1, per_page: 200 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostCitedAuthors(500);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sort: 'cited_by_count:desc',
        per_page: 200,
      });
    });

    it('should combine with filters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 22, page: 1, per_page: 50 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostCitedAuthors(50, {
        'x_concepts.id': 'C119857082', // Machine learning concept
        'has_orcid': true,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'x_concepts.id:C119857082,has_orcid:true',
        sort: 'cited_by_count:desc',
        per_page: 50,
      });
    });

    it('should handle array filters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 15, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostCitedAuthors(25, {
        'last_known_institution.id': ['I27837315', 'I123456789'],
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.id:I27837315%7CI123456789',
        sort: 'cited_by_count:desc',
        per_page: 25,
      });
    });
  });

  describe('getMostProductiveAuthors', () => {
    it('should fetch most productive authors by works count', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [
          { id: 'A1', display_name: 'Productive Author', works_count: 500 } as Author,
        ],
        meta: { count: 1, db_response_time_ms: 18, page: 1, per_page: 50 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostProductiveAuthors();

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sort: 'works_count:desc',
        per_page: 50,
      });
    });

    it('should respect custom limit', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 20, page: 1, per_page: 75 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostProductiveAuthors(75);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sort: 'works_count:desc',
        per_page: 75,
      });
    });

    it('should combine with filters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 16, page: 1, per_page: 30 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getMostProductiveAuthors(30, {
        'last_known_institution.country_code': 'US',
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.country_code:US',
        sort: 'works_count:desc',
        per_page: 30,
      });
    });
  });

  describe('streamAuthors', () => {
    it('should delegate to client stream method', async () => {
      const mockBatch1 = [
        { id: 'A1', display_name: 'Author 1' } as Author,
        { id: 'A2', display_name: 'Author 2' } as Author,
      ];
      const mockBatch2 = [
        { id: 'A3', display_name: 'Author 3' } as Author,
      ];

      // Mock async generator
      const mockGenerator = (async function* () {
        yield mockBatch1;
        yield mockBatch2;
      })();

      mockClient.stream.mockReturnValue(mockGenerator);

      const results: Author[][] = [];
      for await (const batch of authorsApi.streamAuthors({
        filter: 'last_known_institution.id:I27837315',
      })) {
        results.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('authors', {
        filter: 'last_known_institution.id:I27837315',
      }, 200);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(mockBatch1);
      expect(results[1]).toEqual(mockBatch2);
    });

    it('should use custom batch size', async () => {
      const mockGenerator = (async function* () {
        yield [{ id: 'A1', display_name: 'Author 1' } as Author];
      })();

      mockClient.stream.mockReturnValue(mockGenerator);

      const results: Author[][] = [];
      for await (const batch of authorsApi.streamAuthors({}, 50)) {
        results.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('authors', {}, 50);
    });

    it('should handle empty parameters', async () => {
      const mockGenerator = (async function* () {
        yield [];
      })();

      mockClient.stream.mockReturnValue(mockGenerator);

      const results: Author[][] = [];
      for await (const batch of authorsApi.streamAuthors()) {
        results.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('authors', {}, 200);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should propagate client errors', async () => {
      const clientError = new Error('API request failed');
      mockClient.getById.mockRejectedValue(clientError);

      await expect(authorsApi.getAuthor('A123')).rejects.toThrow('API request failed');
    });

    it('should handle network errors in search', async () => {
      const networkError = new Error('Network error');
      mockClient.getResponse.mockRejectedValue(networkError);

      await expect(authorsApi.searchAuthors('test query')).rejects.toThrow('Network error');
    });

    it('should handle errors in collaboration analysis', async () => {
      const error = new Error('Works fetch failed');
      mockClient.getResponse.mockRejectedValue(error);

      await expect(authorsApi.getAuthorCollaborators('A123')).rejects.toThrow('Works fetch failed');
    });
  });

  describe('parameter validation', () => {
    it('should handle empty search query', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:',
      });
    });

    it('should handle special characters in search query', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 8, page: 1, per_page: 25 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.searchAuthors('test & query with "quotes"');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'default.search:test%20%26%20query%20with%20%22quotes%22',
      });
    });
  });

  describe('integration patterns', () => {
    it('should work with pagination parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: { count: 1000, db_response_time_ms: 12, page: 2, per_page: 100 },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await authorsApi.getAuthors({
        page: 2,
        per_page: 100,
        cursor: 'next_cursor_value',
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        page: 2,
        per_page: 100,
        cursor: 'next_cursor_value',
      });
    });

    it('should work with complex select parameters', async () => {
      const mockAuthor: Partial<Author> = {
        id: 'A123',
        display_name: 'Test Author',
        works_count: 50,
      };

      mockClient.getById.mockResolvedValue(mockAuthor as Author);

      await authorsApi.getAuthor('A123', {
        select: ['id', 'display_name', 'works_count', 'cited_by_count', 'summary_stats'],
      });

      expect(mockClient.getById).toHaveBeenCalledWith('authors', 'A123', {
        select: ['id', 'display_name', 'works_count', 'cited_by_count', 'summary_stats'],
      });
    });
  });
});