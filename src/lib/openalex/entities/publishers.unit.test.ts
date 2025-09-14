/**
 * Comprehensive unit tests for PublishersApi entity class
 * Tests all methods including CRUD, search, filtering, hierarchy, and streaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishersApi } from './publishers';
import { OpenAlexBaseClient } from '../client';
import type {
  Publisher,
  Source,
  Work,
  OpenAlexResponse,
  PublishersFilters
} from '../types';

// Mock the base client
vi.mock('../client');

describe('PublishersApi', () => {
  let publishersApi: PublishersApi;
  let mockClient: vi.Mocked<OpenAlexBaseClient>;

  beforeEach(() => {
    mockClient = {
      getById: vi.fn(),
      getResponse: vi.fn(),
      stream: vi.fn(),
      getAll: vi.fn(),
    } as unknown as vi.Mocked<OpenAlexBaseClient>;

    publishersApi = new PublishersApi(mockClient);
  });

  describe('get', () => {
    it('should fetch a single publisher by ID', async () => {
      const mockPublisher: Partial<Publisher> = {
        id: 'P4310320990',
        display_name: 'Springer Nature',
        alternate_titles: ['Springer', 'Nature Publishing Group'],
        country_codes: ['DE', 'GB'],
        hierarchy_level: 0,
        parent_publisher: null,
        works_count: 500000,
        cited_by_count: 2000000,
      };

      mockClient.getById.mockResolvedValue(mockPublisher as Publisher);

      const result = await publishersApi.get('P4310320990');

      expect(mockClient.getById).toHaveBeenCalledWith('publishers', 'P4310320990', {});
      expect(result).toEqual(mockPublisher);
    });

    it('should pass additional parameters to client', async () => {
      const mockPublisher: Partial<Publisher> = {
        id: 'P4310320990',
        display_name: 'Springer Nature',
      };

      const params = { select: ['id', 'display_name'] };
      mockClient.getById.mockResolvedValue(mockPublisher as Publisher);

      await publishersApi.get('P4310320990', params);

      expect(mockClient.getById).toHaveBeenCalledWith('publishers', 'P4310320990', params);
    });
  });

  describe('getMultiple', () => {
    it('should fetch multiple publishers without parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await publishersApi.getMultiple();

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {});
      expect(result).toEqual(mockResponse);
    });

    it('should fetch multiple publishers with parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        filter: 'works_count:>1000',
        sort: 'cited_by_count:desc',
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getMultiple(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', params);
    });

    it('should handle PublishersFilters and QueryParams combination', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        'country_codes': ['US', 'GB'],
        'works_count': '>10000',
        sort: 'display_name:asc',
        per_page: 20,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getMultiple(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', params);
    });
  });

  describe('search', () => {
    it('should search publishers with query', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.search('springer');

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        search: 'springer',
      });
    });

    it('should search publishers with query and additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        'country_codes': ['US'],
        sort: 'works_count:desc',
        per_page: 30,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.search('elsevier', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        search: 'elsevier',
        'country_codes': ['US'],
        sort: 'works_count:desc',
        per_page: 30,
      });
    });
  });

  describe('filters', () => {
    it('should apply publisher-specific filters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: PublishersFilters = {
        'country_codes': ['US', 'GB'],
        'works_count': '>50000',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.filters(filters);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', filters);
    });

    it('should combine filters with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: PublishersFilters = {
        'hierarchy_level': 0,
        'cited_by_count': '>100000',
      };

      const params = { sort: 'display_name:asc', per_page: 50 };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.filters(filters, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        'hierarchy_level': 0,
        'cited_by_count': '>100000',
        sort: 'display_name:asc',
        per_page: 50,
      });
    });
  });

  describe('randomSample', () => {
    it('should get random publishers with default count', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.randomSample();

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sample: 10,
        per_page: 10,
      });
    });

    it('should get random publishers with custom count', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.randomSample(25);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sample: 25,
        per_page: 25,
      });
    });

    it('should limit count to maximum of 50', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.randomSample(100);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sample: 50,
        per_page: 50,
      });
    });

    it('should combine random sample with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 15,
        },
      };

      const params = { select: ['id', 'display_name', 'country_codes'] };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.randomSample(15, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        select: ['id', 'display_name', 'country_codes'],
        sample: 15,
        per_page: 15,
      });
    });
  });

  describe('getPublisherSources', () => {
    it('should get sources for a publisher', async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getPublisherSources('P4310320990');

      expect(mockClient.getResponse).toHaveBeenCalledWith('sources', {
        filter: 'host_organization_lineage:P4310320990',
      });
    });

    it('should get sources for a publisher with parameters', async () => {
      const mockResponse: OpenAlexResponse<Source> = {
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
        per_page: 50,
        select: ['id', 'display_name', 'type'],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getPublisherSources('P4310320990', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('sources', {
        sort: 'works_count:desc',
        per_page: 50,
        select: ['id', 'display_name', 'type'],
        filter: 'host_organization_lineage:P4310320990',
      });
    });
  });

  describe('getPublisherWorks', () => {
    it('should get works for a publisher', async () => {
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

      await publishersApi.getPublisherWorks('P4310320990');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'locations.source.host_organization_lineage:P4310320990',
      });
    });

    it('should get works for a publisher with parameters', async () => {
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
        per_page: 100,
        filter: 'publication_year:2023',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getPublisherWorks('P4310320990', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        sort: 'cited_by_count:desc',
        per_page: 100,
        filter: 'locations.source.host_organization_lineage:P4310320990',
      });
    });
  });

  describe('getChildPublishers', () => {
    it('should get child publishers', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getChildPublishers('P4310320990');

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        filter: 'parent_publisher:P4310320990',
      });
    });

    it('should get child publishers with parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
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
        per_page: 50,
        select: ['id', 'display_name', 'parent_publisher'],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getChildPublishers('P4310320990', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'works_count:desc',
        per_page: 50,
        select: ['id', 'display_name', 'parent_publisher'],
        filter: 'parent_publisher:P4310320990',
      });
    });
  });

  describe('getByCountry', () => {
    it('should get publishers by country codes', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getByCountry(['US', 'GB']);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        'country_codes': ['US', 'GB'],
      });
    });

    it('should get publishers by country codes with parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
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
        per_page: 100,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getByCountry(['DE', 'NL'], params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        'country_codes': ['DE', 'NL'],
        sort: 'works_count:desc',
        per_page: 100,
      });
    });
  });

  describe('getByLineage', () => {
    it('should get publishers by lineage', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getByLineage(['P4310320990', 'P1234567890']);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        'lineage': ['P4310320990', 'P1234567890'],
      });
    });

    it('should get publishers by lineage with parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        sort: 'hierarchy_level:asc',
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getByLineage(['P4310320990'], params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        'lineage': ['P4310320990'],
        sort: 'hierarchy_level:asc',
        per_page: 50,
      });
    });
  });

  describe('getTopByWorksCount', () => {
    it('should get top publishers by works count with default limit', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByWorksCount();

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'works_count:desc',
        per_page: 50,
      });
    });

    it('should get top publishers by works count with custom limit', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByWorksCount(25);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'works_count:desc',
        per_page: 25,
      });
    });

    it('should limit per_page to maximum of 200', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 200,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByWorksCount(500);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'works_count:desc',
        per_page: 200,
      });
    });

    it('should combine top by works count with parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 20,
        },
      };

      const params = { select: ['id', 'display_name', 'works_count'] };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByWorksCount(20, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        select: ['id', 'display_name', 'works_count'],
        sort: 'works_count:desc',
        per_page: 20,
      });
    });
  });

  describe('getTopByCitations', () => {
    it('should get top publishers by citations with default limit', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByCitations();

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'cited_by_count:desc',
        per_page: 50,
      });
    });

    it('should get top publishers by citations with custom limit', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 30,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByCitations(30);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'cited_by_count:desc',
        per_page: 30,
      });
    });

    it('should limit per_page to maximum of 200', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 200,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByCitations(300);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        sort: 'cited_by_count:desc',
        per_page: 200,
      });
    });

    it('should combine top by citations with parameters', async () => {
      const mockResponse: OpenAlexResponse<Publisher> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 15,
        },
      };

      const params = { select: ['id', 'display_name', 'cited_by_count'] };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await publishersApi.getTopByCitations(15, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('publishers', {
        select: ['id', 'display_name', 'cited_by_count'],
        sort: 'cited_by_count:desc',
        per_page: 15,
      });
    });
  });

  describe('stream', () => {
    it('should stream publishers', async () => {
      const mockBatch: Publisher[] = [
        {
          id: 'P1',
          display_name: 'Springer Nature',
          country_codes: ['DE', 'GB'],
          hierarchy_level: 0,
          works_count: 500000,
          cited_by_count: 2000000,
        } as Publisher,
      ];

      async function* mockStreamGenerator() {
        yield mockBatch;
      }

      mockClient.stream = vi.fn().mockReturnValue(mockStreamGenerator());

      const batches = [];
      for await (const batch of publishersApi.stream()) {
        batches.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('publishers', {}, 200);
      expect(batches).toEqual([mockBatch]);
    });

    it('should stream publishers with parameters and custom batch size', async () => {
      const mockBatch: Publisher[] = [
        {
          id: 'P1',
          display_name: 'Elsevier',
          country_codes: ['NL'],
        } as Publisher,
      ];

      async function* mockStreamGenerator() {
        yield mockBatch;
      }

      mockClient.stream = vi.fn().mockReturnValue(mockStreamGenerator());

      const params = { 'country_codes': ['NL'] };
      const batches = [];
      for await (const batch of publishersApi.stream(params, 100)) {
        batches.push(batch);
      }

      expect(mockClient.stream).toHaveBeenCalledWith('publishers', params, 100);
      expect(batches).toEqual([mockBatch]);
    });
  });

  describe('getAll', () => {
    it('should get all publishers', async () => {
      const mockPublishers: Publisher[] = [
        {
          id: 'P1',
          display_name: 'Wiley',
          country_codes: ['US'],
          hierarchy_level: 0,
          works_count: 300000,
          cited_by_count: 1500000,
        } as Publisher,
      ];

      mockClient.getAll.mockResolvedValue(mockPublishers);

      const result = await publishersApi.getAll();

      expect(mockClient.getAll).toHaveBeenCalledWith('publishers', {}, undefined);
      expect(result).toEqual(mockPublishers);
    });

    it('should get all publishers with parameters and limit', async () => {
      const mockPublishers: Publisher[] = [
        {
          id: 'P1',
          display_name: 'Oxford University Press',
          country_codes: ['GB'],
        } as Publisher,
      ];

      mockClient.getAll.mockResolvedValue(mockPublishers);

      const params = { 'country_codes': ['GB'], 'works_count': '>10000' };
      await publishersApi.getAll(params, 100);

      expect(mockClient.getAll).toHaveBeenCalledWith('publishers', params, 100);
    });
  });
});