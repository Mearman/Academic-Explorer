/**
 * Comprehensive unit tests for TopicsApi entity class
 * Tests all methods including CRUD, search, filtering, hierarchy, and streaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TopicsApi } from './topics';
import { OpenAlexBaseClient } from '../client';
import type {
  Topic,
  Author,
  Work,
  OpenAlexResponse,
  TopicsFilters
} from '../types';

// Mock the base client
vi.mock('../client');

describe('TopicsApi', () => {
  let topicsApi: TopicsApi;
  let mockClient: vi.Mocked<OpenAlexBaseClient>;

  beforeEach(() => {
    mockClient = {
      getById: vi.fn(),
      getResponse: vi.fn(),
      stream: vi.fn(),
      getAll: vi.fn(),
    } as unknown as vi.Mocked<OpenAlexBaseClient>;

    topicsApi = new TopicsApi(mockClient);
  });

  describe('get', () => {
    it('should fetch a single topic by ID', async () => {
      const mockTopic: Partial<Topic> = {
        id: 'T10138',
        display_name: 'Artificial intelligence',
        level: 2,
        score: 0.95,
        works_count: 100000,
        cited_by_count: 500000,
      };

      mockClient.getById.mockResolvedValue(mockTopic as Topic);

      const result = await topicsApi.get('T10138');

      expect(mockClient.getById).toHaveBeenCalledWith('topics', 'T10138', {});
      expect(result).toEqual(mockTopic);
    });

    it('should pass additional parameters to client', async () => {
      const mockTopic: Partial<Topic> = {
        id: 'T10138',
        display_name: 'Artificial intelligence',
      };

      const params = { select: ['id', 'display_name'] };
      mockClient.getById.mockResolvedValue(mockTopic as Topic);

      await topicsApi.get('T10138', params);

      expect(mockClient.getById).toHaveBeenCalledWith('topics', 'T10138', params);
    });
  });

  describe('getMultiple', () => {
    it('should fetch multiple topics without parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await topicsApi.getMultiple();

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {});
      expect(result).toEqual(mockResponse);
    });

    it('should fetch multiple topics with parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        filter: 'level:1',
        sort: 'cited_by_count:desc',
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getMultiple(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', params);
    });

    it('should handle TopicsFilters and QueryParams combination', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        level: 1,
        'works_count': '>1000',
        sort: 'score:desc',
        per_page: 20,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getMultiple(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', params);
    });
  });

  describe('search', () => {
    it('should search topics with query', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.search('machine learning');

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        search: 'machine learning',
      });
    });

    it('should search topics with query and additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        level: 2,
        sort: 'score:desc',
        per_page: 30,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.search('artificial intelligence', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        search: 'artificial intelligence',
        level: 2,
        sort: 'score:desc',
        per_page: 30,
      });
    });
  });

  describe('filters', () => {
    it('should apply topic-specific filters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: TopicsFilters = {
        level: 1,
        'works_count': '>10000',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.filters(filters);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', filters);
    });

    it('should combine filters with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: TopicsFilters = {
        level: 2,
        'cited_by_count': '>50000',
      };

      const params = { sort: 'display_name:asc', per_page: 50 };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.filters(filters, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        level: 2,
        'cited_by_count': '>50000',
        sort: 'display_name:asc',
        per_page: 50,
      });
    });
  });

  describe('randomSample', () => {
    it('should get random topics with default count', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.randomSample();

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        sample: 10,
        per_page: 10,
      });
    });

    it('should get random topics with custom count', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.randomSample(25);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        sample: 25,
        per_page: 25,
      });
    });

    it('should limit count to maximum of 50', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.randomSample(100);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        sample: 50,
        per_page: 50,
      });
    });

    it('should combine random sample with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 15,
        },
      };

      const params = { select: ['id', 'display_name', 'level'] };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.randomSample(15, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        select: ['id', 'display_name', 'level'],
        sample: 15,
        per_page: 15,
      });
    });
  });

  describe('getTopicWorks', () => {
    it('should get works for a topic', async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getTopicWorks('T10138');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'topics.id:T10138',
      });
    });

    it('should get works for a topic with parameters', async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        sort: 'cited_by_count:desc',
        per_page: 50,
        filter: 'publication_year:2023',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getTopicWorks('T10138', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        sort: 'cited_by_count:desc',
        per_page: 50,
        filter: 'topics.id:T10138',
      });
    });
  });

  describe('getTopicAuthors', () => {
    it('should get authors for a topic', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getTopicAuthors('T10138');

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        filter: 'topics.id:T10138',
      });
    });

    it('should get authors for a topic with parameters', async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        sort: 'works_count:desc',
        per_page: 30,
        select: ['id', 'display_name', 'works_count'],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getTopicAuthors('T10138', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('authors', {
        sort: 'works_count:desc',
        per_page: 30,
        select: ['id', 'display_name', 'works_count'],
        filter: 'topics.id:T10138',
      });
    });
  });

  describe('getSubfields', () => {
    it('should get subfields without field ID', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getSubfields();

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {});
    });

    it('should get subfields for a specific field', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getSubfields('T12345');

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        'field.id': 'T12345',
      });
    });

    it('should get subfields with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = { sort: 'works_count:desc', per_page: 50 };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getSubfields('T12345', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        'field.id': 'T12345',
        sort: 'works_count:desc',
        per_page: 50,
      });
    });
  });

  describe('getFields', () => {
    it('should get fields without domain ID', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getFields();

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {});
    });

    it('should get fields for a specific domain', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getFields('T54321');

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        'domain.id': 'T54321',
      });
    });

    it('should get fields with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = { sort: 'display_name:asc', per_page: 100 };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getFields('T54321', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        'domain.id': 'T54321',
        sort: 'display_name:asc',
        per_page: 100,
      });
    });
  });

  describe('getDomains', () => {
    it('should get domains', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getDomains();

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        sort: 'cited_by_count:desc',
      });
    });

    it('should get domains with parameters', async () => {
      const mockResponse: OpenAlexResponse<Topic> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = { per_page: 10, select: ['id', 'display_name', 'level'] };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await topicsApi.getDomains(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('topics', {
        per_page: 10,
        select: ['id', 'display_name', 'level'],
        sort: 'cited_by_count:desc',
      });
    });
  });

  describe('stream', () => {
    it('should stream topics', async () => {
      const mockBatch: Topic[] = [
        {
          id: 'T1',
          display_name: 'Computer Science',
          level: 1,
          score: 0.98,
          works_count: 50000,
          cited_by_count: 250000,
        } as Topic,
      ];

      async function* mockStreamGenerator() {
        yield mockBatch;
      }

      mockClient.stream = vi.fn().mockReturnValue(mockStreamGenerator());

      const batches = [];
      for await (const batch of topicsApi.stream()) {
        batches.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('topics', {}, 200);
      expect(batches).toEqual([mockBatch]);
    });

    it('should stream topics with parameters and custom batch size', async () => {
      const mockBatch: Topic[] = [
        {
          id: 'T1',
          display_name: 'Artificial Intelligence',
          level: 2,
          score: 0.95,
        } as Topic,
      ];

      async function* mockStreamGenerator() {
        yield mockBatch;
      }

      mockClient.stream = vi.fn().mockReturnValue(mockStreamGenerator());

      const params = { level: 2 };
      const batches = [];
      for await (const batch of topicsApi.stream(params, 100)) {
        batches.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('topics', params, 100);
      expect(batches).toEqual([mockBatch]);
    });
  });

  describe('getAll', () => {
    it('should get all topics', async () => {
      const mockTopics: Topic[] = [
        {
          id: 'T1',
          display_name: 'Machine Learning',
          level: 2,
          score: 0.92,
          works_count: 30000,
          cited_by_count: 150000,
        } as Topic,
      ];

      mockClient.getAll.mockResolvedValue(mockTopics);

      const result = await topicsApi.getAll();

      expect(mockClient.getAll).toHaveBeenCalledWith('topics', {}, undefined);
      expect(result).toEqual(mockTopics);
    });

    it('should get all topics with parameters and limit', async () => {
      const mockTopics: Topic[] = [
        {
          id: 'T1',
          display_name: 'Deep Learning',
          level: 3,
        } as Topic,
      ];

      mockClient.getAll.mockResolvedValue(mockTopics);

      const params = { level: 3, 'works_count': '>1000' };
      await topicsApi.getAll(params, 500);

      expect(mockClient.getAll).toHaveBeenCalledWith('topics', params, 500);
    });
  });
});