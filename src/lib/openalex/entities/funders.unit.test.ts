/**
 * Comprehensive unit tests for FundersApi entity class
 * Tests all methods including CRUD, search, filtering, and streaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FundersApi } from './funders';
import { OpenAlexBaseClient } from '../client';
import type {
  Funder,
  OpenAlexResponse,
  Work,
  Institution,
  FundersFilters
} from '../types';

// Mock the base client
vi.mock('../client');

describe('FundersApi', () => {
  let fundersApi: FundersApi;
  let mockClient: vi.Mocked<OpenAlexBaseClient>;

  beforeEach(() => {
    mockClient = {
      getById: vi.fn(),
      getResponse: vi.fn(),
      stream: vi.fn(),
      getAll: vi.fn(),
    } as unknown as vi.Mocked<OpenAlexBaseClient>;

    fundersApi = new FundersApi(mockClient);
  });

  describe('get', () => {
    it('should fetch a single funder by ID', async () => {
      const mockFunder: Partial<Funder> = {
        id: 'F4320306076',
        display_name: 'National Science Foundation',
        country_code: 'US',
        works_count: 150000,
        cited_by_count: 2000000,
      };

      mockClient.getById.mockResolvedValue(mockFunder as Funder);

      const result = await fundersApi.get('F4320306076');

      expect(mockClient.getById).toHaveBeenCalledWith('funders', 'F4320306076', {});
      expect(result).toEqual(mockFunder);
    });

    it('should pass additional parameters to client', async () => {
      const mockFunder: Partial<Funder> = {
        id: 'F4320306076',
        display_name: 'National Science Foundation',
      };

      const params = { select: ['id', 'display_name'] };
      mockClient.getById.mockResolvedValue(mockFunder as Funder);

      await fundersApi.get('F4320306076', params);

      expect(mockClient.getById).toHaveBeenCalledWith('funders', 'F4320306076', params);
    });
  });

  describe('getMultiple', () => {
    it('should fetch multiple funders without parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await fundersApi.getMultiple();

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {});
      expect(result).toEqual(mockResponse);
    });

    it('should fetch multiple funders with parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        'country_code': 'US',
        sort: 'works_count:desc',
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getMultiple(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', params);
    });
  });

  describe('search', () => {
    it('should search funders with query', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.search('science');

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        search: 'science',
      });
    });

    it('should search funders with query and parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        'country_code': 'US',
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.search('science', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        'country_code': 'US',
        per_page: 50,
        search: 'science',
      });
    });
  });

  describe('filters', () => {
    it('should apply filters to funders', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: FundersFilters = {
        'country_code': 'US',
        'works_count': '>1000',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.filters(filters);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', filters);
    });

    it('should apply filters with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: FundersFilters = {
        'country_code': 'US',
      };

      const params = {
        sort: 'works_count:desc',
        per_page: 100,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.filters(filters, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        ...filters,
      });
    });
  });

  describe('randomSample', () => {
    it('should fetch random sample with default count', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.randomSample();

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sample: 10,
        per_page: 10,
      });
    });

    it('should fetch random sample with custom count', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.randomSample(25);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sample: 25,
        per_page: 25,
      });
    });

    it('should limit count to maximum of 50', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.randomSample(100);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sample: 50,
        per_page: 50,
      });
    });

    it('should include additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 20,
        },
      };

      const params = {
        'country_code': 'US',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.randomSample(20, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        'country_code': 'US',
        sample: 20,
        per_page: 20,
      });
    });
  });

  describe('getFunderGrants', () => {
    it('should fetch grants for a funder', async () => {
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

      await fundersApi.getFunderGrants('F4320306076');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'grants.funder:F4320306076',
      });
    });

    it('should fetch grants with additional parameters', async () => {
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
        sort: 'publication_date:desc',
        per_page: 100,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getFunderGrants('F4320306076', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        ...params,
        filter: 'grants.funder:F4320306076',
      });
    });
  });

  describe('getFunderWorks', () => {
    it('should fetch works for a funder', async () => {
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

      await fundersApi.getFunderWorks('F4320306076');

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        filter: 'grants.funder:F4320306076',
      });
    });

    it('should fetch works with additional parameters', async () => {
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
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getFunderWorks('F4320306076', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('works', {
        ...params,
        filter: 'grants.funder:F4320306076',
      });
    });
  });

  describe('getFunderInstitutions', () => {
    it('should fetch institutions for a funder', async () => {
      const mockResponse: OpenAlexResponse<Institution> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getFunderInstitutions('F4320306076');

      expect(mockClient.getResponse).toHaveBeenCalledWith('institutions', {
        filter: 'works_count:>0',
      });
    });

    it('should fetch institutions with additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Institution> = {
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

      await fundersApi.getFunderInstitutions('F4320306076', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('institutions', {
        ...params,
        filter: 'works_count:>0',
      });
    });
  });

  describe('getByCountry', () => {
    it('should fetch funders by country', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getByCountry('US');

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        'country_code': 'US',
      });
    });

    it('should fetch funders by country with parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
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
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getByCountry('US', params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        'country_code': 'US',
      });
    });
  });

  describe('getByCountries', () => {
    it('should fetch funders by multiple countries', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getByCountries(['US', 'GB', 'CA']);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        'country_code': ['US', 'GB', 'CA'],
      });
    });

    it('should fetch funders by countries with parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
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
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getByCountries(['US', 'GB'], params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        'country_code': ['US', 'GB'],
      });
    });
  });

  describe('getByTopics', () => {
    it('should fetch funders by topics', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const topicIds = ['T123', 'T456'];

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getByTopics(topicIds);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        'topics.id': topicIds,
      });
    });

    it('should fetch funders by topics with parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const topicIds = ['T123', 'T456'];
      const params = {
        sort: 'works_count:desc',
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getByTopics(topicIds, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        'topics.id': topicIds,
      });
    });
  });

  describe('getTopByGrantsCount', () => {
    it('should fetch top funders by grants count with default limit', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByGrantsCount();

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sort: 'grants_count:desc',
        per_page: 50,
      });
    });

    it('should fetch top funders by grants count with custom limit', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByGrantsCount(25);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sort: 'grants_count:desc',
        per_page: 25,
      });
    });

    it('should limit to maximum of 200', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 200,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByGrantsCount(300);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sort: 'grants_count:desc',
        per_page: 200,
      });
    });

    it('should include additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        'country_code': 'US',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByGrantsCount(25, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        sort: 'grants_count:desc',
        per_page: 25,
      });
    });
  });

  describe('getTopByWorksCount', () => {
    it('should fetch top funders by works count with default limit', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByWorksCount();

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sort: 'works_count:desc',
        per_page: 50,
      });
    });

    it('should include additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 100,
        },
      };

      const params = {
        'country_code': 'GB',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByWorksCount(100, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        sort: 'works_count:desc',
        per_page: 100,
      });
    });
  });

  describe('getTopByCitations', () => {
    it('should fetch top funders by citations with default limit', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByCitations();

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        sort: 'cited_by_count:desc',
        per_page: 50,
      });
    });

    it('should include additional parameters', async () => {
      const mockResponse: OpenAlexResponse<Funder> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 75,
        },
      };

      const params = {
        'country_code': 'DE',
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await fundersApi.getTopByCitations(75, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith('funders', {
        ...params,
        sort: 'cited_by_count:desc',
        per_page: 75,
      });
    });
  });

  describe('getFundingStats', () => {
    it('should fetch funding statistics for a funder', async () => {
      const mockFunder: Partial<Funder> = {
        id: 'F4320306076',
        display_name: 'National Science Foundation',
        works_count: 150000,
        cited_by_count: 2000000,
      };

      mockClient.getById.mockResolvedValue(mockFunder as Funder);

      const result = await fundersApi.getFundingStats('F4320306076');

      expect(mockClient.getById).toHaveBeenCalledWith('funders', 'F4320306076', {});
      expect(result).toEqual(mockFunder);
    });

    it('should include additional parameters', async () => {
      const mockFunder: Partial<Funder> = {
        id: 'F4320306076',
        display_name: 'National Science Foundation',
      };

      const params = {
        select: ['id', 'display_name', 'counts_by_year'],
      };

      mockClient.getById.mockResolvedValue(mockFunder as Funder);

      await fundersApi.getFundingStats('F4320306076', params);

      expect(mockClient.getById).toHaveBeenCalledWith('funders', 'F4320306076', params);
    });
  });

  describe('stream', () => {
    it('should stream funders', async () => {
      const mockGenerator = async function* () {
        yield [{ id: 'F1' }, { id: 'F2' }] as Funder[];
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = fundersApi.stream();
      const result = await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith('funders', {}, 200);
      expect(result.done).toBe(false);
      expect(result.value).toEqual([{ id: 'F1' }, { id: 'F2' }]);
    });

    it('should stream funders with parameters', async () => {
      const mockGenerator = async function* () {
        yield [{ id: 'F1' }] as Funder[];
      };

      const params = {
        'country_code': 'US',
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = fundersApi.stream(params, 100);
      await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith('funders', params, 100);
    });
  });

  describe('getAll', () => {
    it('should get all funders', async () => {
      const mockFunders = [
        { id: 'F1', display_name: 'Funder 1' },
        { id: 'F2', display_name: 'Funder 2' },
      ] as Funder[];

      mockClient.getAll.mockResolvedValue(mockFunders);

      const result = await fundersApi.getAll();

      expect(mockClient.getAll).toHaveBeenCalledWith('funders', {}, undefined);
      expect(result).toEqual(mockFunders);
    });

    it('should get all funders with parameters and max results', async () => {
      const mockFunders = [
        { id: 'F1', display_name: 'Funder 1' },
      ] as Funder[];

      const params = {
        'country_code': 'US',
      };

      mockClient.getAll.mockResolvedValue(mockFunders);

      await fundersApi.getAll(params, 1000);

      expect(mockClient.getAll).toHaveBeenCalledWith('funders', params, 1000);
    });
  });
});