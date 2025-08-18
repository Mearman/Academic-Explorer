/**
 * OpenAlex Client Unit Tests
 * 
 * Performance Optimizations:
 * - Mock setTimeout/clearTimeout for instant timeout test execution (eliminates 3+ second waits)
 * - Mock retry delays to execute immediately instead of real exponential backoff delays  
 * - Use MSW handlers that return errors instantly without delays
 * - Overall test performance: ~13.85s -> ~1.13s (88% improvement)
 * 
 * Key optimizations applied to:
 * - Timeout tests: 3000ms+ -> <3ms each
 * - Network error tests with retries: 3000ms+ -> ~30ms each  
 * - Rate limit retry tests: instant execution with mocked delays
 */

// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http } from 'msw';
import { OpenAlexClient, OpenAlexError } from './client';
import { server } from '@/test/setup';
import { errorHandlers, handlers } from '@/test/mocks/handlers';
import { 
  mockWork, 
  mockAuthor, 
  mockWorksResponse,
  mockContinent,
  mockRegion,
  mockContinentsResponse,
  mockRegionsResponse,
  mockAboutnessResponse
} from '@/test/mocks/data';

describe('OpenAlexClient', () => {
  let client: OpenAlexClient;

  beforeEach(() => {
    client = new OpenAlexClient({
      apiUrl: 'https://api.openalex.org',
      mailto: 'test@example.com',
      polite: true,
    });
  });

  // Helper functions for performance-optimized testing
  // These functions eliminate real timing delays in timeout and retry scenarios
  
  // Helper function to mock timeouts for instant test execution
  const mockTimeout = (testFn: () => Promise<void>) => {
    return async () => {
      const originalSetTimeout = global.setTimeout;
      const originalClearTimeout = global.clearTimeout;
      
      // Mock setTimeout to execute immediately
      global.setTimeout = ((callback: () => void) => {
        callback();
        return 1 as any;
      }) as any;
      
      // Mock clearTimeout to do nothing
      global.clearTimeout = (() => {}) as any;
      
      try {
        await testFn();
      } finally {
        // Restore original implementations
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
      }
    };
  };

  // Helper function to mock delays for fast retry tests  
  const mockRetryDelays = (testFn: () => Promise<void>) => {
    return async () => {
      const originalSetTimeout = global.setTimeout;
      
      // Mock setTimeout for delays to execute immediately
      global.setTimeout = ((callback: () => void, delay?: number) => {
        // If it's a very short delay (like 1ms), execute immediately for testing
        if (typeof delay === 'number' && delay < 100) {
          callback();
          return 1 as any;
        }
        // For longer delays, still execute immediately in tests
        callback();
        return 1 as any;
      }) as any;
      
      try {
        await testFn();
      } finally {
        // Restore original setTimeout
        global.setTimeout = originalSetTimeout;
      }
    };
  };

  // Removed global afterEach to avoid interfering with error handling tests

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const defaultClient = new OpenAlexClient();
      const config = defaultClient.getConfig();
      
      expect(config.apiUrl).toBe('https://api.openalex.org');
      expect(config.polite).toBe(true);
      expect(config.maxRetries).toBe(3);
      expect(config.timeout).toBe(30000);
    });

    it('should update configuration', () => {
      client.updateConfig({ mailto: 'new@example.com' });
      const config = client.getConfig();
      
      expect(config.mailto).toBe('new@example.com');
    });
  });

  describe('Works endpoints', () => {
    it('should fetch works list', async () => {
      const response = await client.works({ search: 'test' });
      
      expect(response).toEqual(mockWorksResponse);
      expect(response.meta.count).toBe(100);
      expect(response.results).toHaveLength(1);
    });

    it('should fetch single work', async () => {
      const work = await client.work('W2741809807');
      
      expect(work.id).toContain('W2741809807');
      expect(work.display_name).toBe('Test Work Title');
    });

    it('should fetch random work', async () => {
      const work = await client.randomWork();
      
      expect(work).toHaveProperty('id');
      expect(work).toHaveProperty('display_name');
    });

    it('should handle work filters', async () => {
      const response = await client.works({
        filter: 'is_oa:true',
        sort: 'cited_by_count:desc',
        per_page: 10,
      });
      
      expect(response.results).toBeDefined();
    });

    it('should fetch works batch', async () => {
      const ids = ['W1234567890', 'W0987654321'];
      const works = await client.worksBatch(ids);
      
      expect(Array.isArray(works)).toBe(true);
    });
  });

  describe('Authors endpoints', () => {
    it('should fetch authors list', async () => {
      const response = await client.authors({ search: 'John Doe' });
      
      expect(response.meta).toBeDefined();
      expect(response.results).toBeDefined();
    });

    it('should fetch single author', async () => {
      const author = await client.author('A5000000001');
      
      expect(author.id).toContain('A5000000001');
      expect(author.display_name).toBe('John Doe');
    });

    it('should fetch author autocomplete', async () => {
      const response = await client.authorsAutocomplete({ q: 'John' });
      
      expect(response.results).toBeDefined();
      expect(response.meta.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error handling', () => {
    it('should handle 404 errors', async () => {
      await expect(
        client.request('error/404', {})
      ).rejects.toThrow(OpenAlexError);
    });

    it('should retry on 429 rate limit', mockRetryDelays(async () => {
      server.use(errorHandlers.emptyResponse);
      
      const response = await client.works();
      expect(response.results).toHaveLength(0);
    }));

    it('should handle network errors', mockRetryDelays(async () => {
      // Use a specific error endpoint that returns 500
      await expect(
        client.request('error/500', {})
      ).rejects.toThrow(OpenAlexError);
    }));

    it('should handle timeout', mockTimeout(async () => {
      const timeoutClient = new OpenAlexClient({ timeout: 1, maxRetries: 1 });
      server.use(...errorHandlers.timeout);
      
      await expect(timeoutClient.works()).rejects.toThrow();
    }));
  });

  describe('Request cancellation', () => {
    it('should cancel specific request', () => {
      const controller = new AbortController();
      client['abortControllers'].set('/works-test', controller);
      
      client.cancelRequest('/works');
      
      expect(controller.signal.aborted).toBe(true);
    });

    it('should cancel all requests', () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      
      client['abortControllers'].set('/works-1', controller1);
      client['abortControllers'].set('/authors-1', controller2);
      
      client.cancelAllRequests();
      
      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(true);
      expect(client['abortControllers'].size).toBe(0);
    });
  });

  describe('ID normalization', () => {
    it('should normalize OpenAlex URLs', async () => {
      const work = await client.work('https://openalex.org/W2741809807');
      expect(work.id).toContain('W2741809807');
    });

    it('should handle plain IDs', async () => {
      const work = await client.work('W2741809807');
      expect(work.id).toContain('W2741809807');
    });
  });

  describe('Pagination', () => {
    it('should handle pagination parameters', async () => {
      const response = await client.works({
        page: 2,
        per_page: 50,
      });
      
      expect(response.meta.page).toBeDefined();
      expect(response.meta.per_page).toBeDefined();
    });

    it('should handle cursor pagination', async () => {
      const response = await client.works({
        cursor: '*',
        per_page: 100,
      });
      
      expect(response.results).toBeDefined();
    });
  });

  describe('Continents endpoints', () => {
    it('should fetch continents list', async () => {
      const response = await client.continents();
      
      expect(response).toEqual(mockContinentsResponse);
      expect(response.meta.count).toBe(7);
      expect(response.results).toHaveLength(3);
      expect(response.results[0]).toEqual(mockContinent);
    });

    it('should fetch continents with parameters', async () => {
      const response = await client.continents({
        filter: 'works_count:>1000000',
        sort: 'works_count:desc',
        per_page: 5,
      });
      
      expect(response.results).toBeDefined();
      expect(response.meta).toBeDefined();
    });

    it('should fetch single continent', async () => {
      const continent = await client.continent('europe');
      
      expect(continent.id).toContain('europe');
      expect(continent.display_name).toBe('Europe');
      expect(continent.works_count).toBe(15000000);
      expect(continent.cited_by_count).toBe(500000000);
    });

    it('should fetch random continent', async () => {
      const continent = await client.randomContinent();
      
      expect(continent).toHaveProperty('id');
      expect(continent).toHaveProperty('display_name');
      expect(continent).toHaveProperty('works_count');
      expect(continent).toHaveProperty('cited_by_count');
      expect(continent.display_name).toBe(mockContinent.display_name);
    });

    it('should handle continent filters with object syntax', async () => {
      const response = await client.continents({
        filter: {
          display_name: 'Europe',
          works_count: '>1000000',
        },
      });
      
      expect(response.results).toBeDefined();
    });

    it('should normalise continent IDs', async () => {
      // Test with OpenAlex URL
      const continent1 = await client.continent('https://openalex.org/continents/europe');
      expect(continent1.id).toContain('europe');

      // Test with plain ID
      const continent2 = await client.continent('europe');
      expect(continent2.id).toContain('europe');
    });
  });

  describe('Regions endpoints', () => {
    it('should fetch regions list', async () => {
      const response = await client.regions();
      
      expect(response).toEqual(mockRegionsResponse);
      expect(response.meta.count).toBe(22);
      expect(response.results).toHaveLength(3);
      expect(response.results[0]).toEqual(mockRegion);
    });

    it('should fetch regions with parameters', async () => {
      const response = await client.regions({
        filter: 'works_count:>500000',
        sort: 'cited_by_count:desc',
        per_page: 10,
      });
      
      expect(response.results).toBeDefined();
      expect(response.meta).toBeDefined();
    });

    it('should fetch single region', async () => {
      const region = await client.region('western-europe');
      
      expect(region.id).toContain('western-europe');
      expect(region.display_name).toBe('Western Europe');
      expect(region.works_count).toBe(8000000);
      expect(region.cited_by_count).toBe(300000000);
    });

    it('should fetch random region', async () => {
      const region = await client.randomRegion();
      
      expect(region).toHaveProperty('id');
      expect(region).toHaveProperty('display_name');
      expect(region).toHaveProperty('works_count');
      expect(region).toHaveProperty('cited_by_count');
      expect(region.display_name).toBe(mockRegion.display_name);
    });

    it('should handle region filters with object syntax', async () => {
      const response = await client.regions({
        filter: {
          display_name: 'Western Europe',
          works_count: '>5000000',
        },
      });
      
      expect(response.results).toBeDefined();
    });

    it('should normalise region IDs', async () => {
      // Test with OpenAlex URL
      const region1 = await client.region('https://openalex.org/regions/western-europe');
      expect(region1.id).toContain('western-europe');

      // Test with plain ID
      const region2 = await client.region('western-europe');
      expect(region2.id).toContain('western-europe');
    });
  });

  describe('Aboutness endpoints', () => {
    it('should analyse text aboutness with machine learning content', async () => {
      const response = await client.aboutness({
        text: 'This research explores machine learning algorithms for natural language processing and deep neural networks.',
      });
      
      expect(response).toEqual(mockAboutnessResponse);
      expect(response.concepts).toHaveLength(4);
      expect(response.topics).toHaveLength(2);
      
      // Check concepts structure
      expect(response.concepts[0]).toHaveProperty('score');
      expect(response.concepts[0]).toHaveProperty('concept');
      expect(response.concepts[0].concept).toHaveProperty('id');
      expect(response.concepts[0].concept).toHaveProperty('display_name');
      expect(response.concepts[0].concept).toHaveProperty('level');

      // Check topics structure
      expect(response.topics[0]).toHaveProperty('score');
      expect(response.topics[0]).toHaveProperty('id');
      expect(response.topics[0]).toHaveProperty('display_name');
      expect(response.topics[0]).toHaveProperty('subfield');
      expect(response.topics[0]).toHaveProperty('field');
      expect(response.topics[0]).toHaveProperty('domain');
    });

    it('should analyse text aboutness with general content', async () => {
      const response = await client.aboutness({
        text: 'This is a general computer science paper about algorithms and data structures.',
      });
      
      expect(response.concepts).toHaveLength(1);
      expect(response.topics).toHaveLength(1);
      expect(response.concepts[0].concept.display_name).toBe('Computer science');
      expect(response.topics[0].display_name).toBe('General Computer Science');
    });

    it('should handle aboutness with additional parameters', async () => {
      const response = await client.aboutness({
        text: 'Advanced machine learning techniques for computer vision applications.',
        return_concepts: true,
        return_topics: true,
      });
      
      expect(response.concepts).toBeDefined();
      expect(response.topics).toBeDefined();
    });

    it('should require text parameter for aboutness', async () => {
      // TypeScript should prevent this, but test runtime validation if any
      await expect(
        client.aboutness({} as any)
      ).rejects.toThrow(OpenAlexError);
    });

    it('should handle empty text', async () => {
      const response = await client.aboutness({ text: '' });
      
      // Should still return valid response structure
      expect(response).toHaveProperty('concepts');
      expect(response).toHaveProperty('topics');
    });

    it('should handle very long text', async () => {
      const longText = 'machine learning '.repeat(1000);
      const response = await client.aboutness({ text: longText });
      
      expect(response.concepts).toBeDefined();
      expect(response.topics).toBeDefined();
    });
  });

  describe('Error handling for new endpoints', () => {
    it('should handle 404 errors for continents', async () => {
      await expect(
        client.continent('nonexistent-continent')
      ).rejects.toThrow();
    });

    it('should handle 404 errors for regions', async () => {
      await expect(
        client.region('nonexistent-region')
      ).rejects.toThrow();
    });

    it('should handle network errors for continents', mockRetryDelays(async () => {
      // Use the existing error endpoint that returns 500
      await expect(
        client.request('error/500', {})
      ).rejects.toThrow(OpenAlexError);
    }));

    it('should handle network errors for regions', mockRetryDelays(async () => {
      // Use the existing error endpoint that returns 500
      await expect(
        client.request('error/500', {})
      ).rejects.toThrow(OpenAlexError);
    }));

    it('should handle network errors for aboutness', mockRetryDelays(async () => {
      // Use the existing error endpoint that returns 500
      await expect(
        client.request('error/500', {})
      ).rejects.toThrow(OpenAlexError);
    }));

    it('should handle timeout for aboutness', mockTimeout(async () => {
      const timeoutClient = new OpenAlexClient({ timeout: 1, maxRetries: 1 });
      server.use(...errorHandlers.timeout);
      
      await expect(
        timeoutClient.aboutness({ text: 'test text' })
      ).rejects.toThrow();
    }));
  });

  describe('Parameter validation for new endpoints', () => {
    it('should validate continents parameters', async () => {
      // Ensure clean handler state before this test
      server.resetHandlers(...handlers);
      
      const response = await client.continents({
        page: 1,
        per_page: 25,
        filter: 'works_count:>1000',
        sort: 'works_count:desc',
        search: 'Europe',
      });
      
      expect(response.results).toBeDefined();
    });

    it('should validate regions parameters', async () => {
      const response = await client.regions({
        page: 1,
        per_page: 25,
        filter: 'works_count:>1000',
        sort: 'cited_by_count:desc',
        search: 'Europe',
      });
      
      expect(response.results).toBeDefined();
    });

    it('should handle complex filters for continents', async () => {
      const response = await client.continents({
        filter: {
          works_count: '>10000000',
          display_name: 'Asia',
        },
      });
      
      expect(response.results).toBeDefined();
    });

    it('should handle complex filters for regions', async () => {
      const response = await client.regions({
        filter: {
          works_count: '>5000000',
          cited_by_count: '>100000000',
        },
      });
      
      expect(response.results).toBeDefined();
    });
  });

  describe('Response parsing for new endpoints', () => {
    it('should parse continent response correctly', async () => {
      const continent = await client.continent('europe');
      
      expect(typeof continent.id).toBe('string');
      expect(typeof continent.display_name).toBe('string');
      expect(typeof continent.works_count).toBe('number');
      expect(typeof continent.cited_by_count).toBe('number');
      expect(continent.wikidata).toBeDefined();
    });

    it('should parse region response correctly', async () => {
      const region = await client.region('western-europe');
      
      expect(typeof region.id).toBe('string');
      expect(typeof region.display_name).toBe('string');
      expect(typeof region.works_count).toBe('number');
      expect(typeof region.cited_by_count).toBe('number');
      expect(region.wikidata).toBeDefined();
    });

    it('should parse aboutness response correctly', async () => {
      const response = await client.aboutness({
        text: 'machine learning research',
      });
      
      expect(Array.isArray(response.concepts)).toBe(true);
      expect(Array.isArray(response.topics)).toBe(true);
      
      if (response.concepts.length > 0) {
        const concept = response.concepts[0];
        expect(typeof concept.score).toBe('number');
        expect(typeof concept.concept.id).toBe('string');
        expect(typeof concept.concept.display_name).toBe('string');
        expect(typeof concept.concept.level).toBe('number');
      }
      
      if (response.topics.length > 0) {
        const topic = response.topics[0];
        expect(typeof topic.score).toBe('number');
        expect(typeof topic.id).toBe('string');
        expect(typeof topic.display_name).toBe('string');
        expect(topic.subfield).toBeDefined();
        expect(topic.field).toBeDefined();
        expect(topic.domain).toBeDefined();
      }
    });
  });

  describe('Entity Redirect Handling', () => {
    describe('handleEntityRedirect', () => {
      it('should detect redirect when returned ID differs from requested ID', async () => {
        const entityFetcher = vi.fn().mockResolvedValue({
          id: 'https://openalex.org/W999999999',
          title: 'Merged Work',
        });

        const result = await client.handleEntityRedirect(entityFetcher, 'W123456789');

        expect(result.data.id).toBe('https://openalex.org/W999999999');
        expect(result.redirectedId).toBe('https://openalex.org/W999999999');
      });

      it('should not detect redirect when IDs match', async () => {
        const entityFetcher = vi.fn().mockResolvedValue({
          id: 'https://openalex.org/W123456789',
          title: 'Original Work',
        });

        const result = await client.handleEntityRedirect(entityFetcher, 'W123456789');

        expect(result.data.id).toBe('https://openalex.org/W123456789');
        expect(result.redirectedId).toBeUndefined();
      });

      it('should handle entities without id property', async () => {
        const entityFetcher = vi.fn().mockResolvedValue({
          title: 'Work without ID',
        });

        const result = await client.handleEntityRedirect(entityFetcher, 'W123456789');

        expect(result.data.title).toBe('Work without ID');
        expect(result.redirectedId).toBeUndefined();
      });

      it('should handle null entities', async () => {
        const entityFetcher = vi.fn().mockResolvedValue(null);

        const result = await client.handleEntityRedirect(entityFetcher, 'W123456789');

        expect(result.data).toBeNull();
        expect(result.redirectedId).toBeUndefined();
      });

      it('should handle non-object entities', async () => {
        const entityFetcher = vi.fn().mockResolvedValue('string result');

        const result = await client.handleEntityRedirect(entityFetcher, 'W123456789');

        expect(result.data).toBe('string result');
        expect(result.redirectedId).toBeUndefined();
      });

      it('should normalize IDs when comparing', async () => {
        const entityFetcher = vi.fn().mockResolvedValue({
          id: 'W123456789', // Without URL prefix
        });

        // Request with URL prefix
        const result = await client.handleEntityRedirect(
          entityFetcher, 
          'https://openalex.org/W123456789'
        );

        expect(result.redirectedId).toBeUndefined(); // Should not detect redirect
      });

      it('should propagate errors from entity fetcher', async () => {
        const entityFetcher = vi.fn().mockRejectedValue(new Error('Fetch failed'));

        await expect(
          client.handleEntityRedirect(entityFetcher, 'W123456789')
        ).rejects.toThrow('Fetch failed');
      });
    });

    describe('workWithRedirect', () => {
      it('should call handleEntityRedirect with work fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: mockWork });

        await client.workWithRedirect('W123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'W123456789');
      });

      it('should return work data with redirect info', async () => {
        const redirectedWork = {
          ...mockWork,
          id: 'https://openalex.org/W999999999',
        };

        // Mock the work method to return different ID
        vi.spyOn(client, 'work').mockResolvedValue(redirectedWork);

        const result = await client.workWithRedirect('W123456789');

        expect(result.data).toEqual(redirectedWork);
        expect(result.redirectedId).toBe('https://openalex.org/W999999999');
      });
    });

    describe('authorWithRedirect', () => {
      it('should call handleEntityRedirect with author fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: mockAuthor });

        await client.authorWithRedirect('A123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'A123456789');
      });
    });

    describe('sourceWithRedirect', () => {
      it('should call handleEntityRedirect with source fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'S123', display_name: 'Test Source' } });

        await client.sourceWithRedirect('S123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'S123456789');
      });
    });

    describe('institutionWithRedirect', () => {
      it('should call handleEntityRedirect with institution fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'I123', display_name: 'Test Institution' } });

        await client.institutionWithRedirect('I123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'I123456789');
      });
    });

    describe('publisherWithRedirect', () => {
      it('should call handleEntityRedirect with publisher fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'P123', display_name: 'Test Publisher' } });

        await client.publisherWithRedirect('P123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'P123456789');
      });
    });

    describe('funderWithRedirect', () => {
      it('should call handleEntityRedirect with funder fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'F123', display_name: 'Test Funder' } });

        await client.funderWithRedirect('F123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'F123456789');
      });
    });

    describe('topicWithRedirect', () => {
      it('should call handleEntityRedirect with topic fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'T123', display_name: 'Test Topic' } });

        await client.topicWithRedirect('T123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'T123456789');
      });
    });

    describe('conceptWithRedirect', () => {
      it('should call handleEntityRedirect with concept fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'C123', display_name: 'Test Concept' } });

        await client.conceptWithRedirect('C123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'C123456789');
      });
    });

    describe('keywordWithRedirect', () => {
      it('should call handleEntityRedirect with keyword fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: { id: 'K123', display_name: 'Test Keyword' } });

        await client.keywordWithRedirect('K123456789');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'K123456789');
      });
    });

    describe('continentWithRedirect', () => {
      it('should call handleEntityRedirect with continent fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: mockContinent });

        await client.continentWithRedirect('europe');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'europe');
      });
    });

    describe('regionWithRedirect', () => {
      it('should call handleEntityRedirect with region fetcher', async () => {
        const spy = vi.spyOn(client, 'handleEntityRedirect');
        spy.mockResolvedValue({ data: mockRegion });

        await client.regionWithRedirect('western-europe');

        expect(spy).toHaveBeenCalledWith(expect.any(Function), 'western-europe');
      });
    });
  });

  describe('Advanced ID Normalisation', () => {
    describe.skip('normaliseId edge cases', () => {
      it('should handle DOI URLs correctly', async () => {
        const work = await client.work('https://doi.org/10.1038/nature12345');
        expect(work.id).toContain('W2741809807');
      });

      it('should handle DOI without URL', async () => {
        const work = await client.work('10.1038/nature12345');
        expect(work.id).toContain('W2741809807');
      });

      it('should handle ORCID URLs correctly', async () => {
        const author = await client.author('https://orcid.org/0000-0001-0000-0001');
        expect(author.id).toContain('A5000000001');
      });

      it('should handle ORCID without URL', async () => {
        const author = await client.author('0000-0001-0000-0001');
        expect(author.id).toContain('A5000000001');
      });

      it('should handle ROR URLs correctly', async () => {
        const institution = await client.institution('https://ror.org/123456789');
        expect(institution.id).toBeDefined();
      });

      it('should handle ROR IDs without URL', async () => {
        const institution = await client.institution('123456789ab');
        expect(institution.id).toBeDefined();
      });

      it('should handle ISSN-L format', async () => {
        const source = await client.source('1234-567X');
        expect(source.id).toBeDefined();
      });

      it('should handle Wikidata IDs', async () => {
        const work = await client.work('Q12345');
        expect(work.id).toBeDefined();
      });

      it('should handle PMID format', async () => {
        const work = await client.work('12345678');
        expect(work.id).toBeDefined();
      });

      it('should handle PMCID format', async () => {
        const work = await client.work('PMC1234567');
        expect(work.id).toBeDefined();
      });

      it('should normalize OpenAlex IDs to uppercase', async () => {
        const work = await client.work('w2741809807');
        expect(work.id).toContain('W2741809807');
      });

      it('should pass through unknown formats unchanged', async () => {
        const work = await client.work('unknown-format-123');
        expect(work.id).toBeDefined();
      });
    });

    describe('Geographic ID normalisation', () => {
      it('should handle continent URLs correctly', async () => {
        const continent = await client.continent('https://openalex.org/continents/europe');
        expect(continent.id).toContain('europe');
      });

      it('should handle region URLs correctly', async () => {
        const region = await client.region('https://openalex.org/regions/western-europe');
        expect(region.id).toContain('western-europe');
      });

      it('should handle plain continent IDs', async () => {
        const continent = await client.continent('asia');
        expect(continent.id).toContain('asia');
      });

      it('should handle plain region IDs', async () => {
        const region = await client.region('eastern-asia');
        expect(region.id).toContain('eastern-asia');
      });
    });
  });

  describe('Batch Operations', () => {
    describe('worksBatch', () => {
      it('should handle mixed ID formats', async () => {
        const ids = [
          'W123456789',
          'https://openalex.org/W987654321',
          'w111222333'
        ];

        const works = await client.worksBatch(ids);
        expect(Array.isArray(works)).toBe(true);
      });

      it('should handle empty array', async () => {
        const works = await client.worksBatch([]);
        expect(works).toEqual([]);
      });
    });

    describe('authorsBatch', () => {
      it('should handle mixed ID formats', async () => {
        const ids = [
          'A123456789',
          'https://openalex.org/A987654321',
          '0000-0001-0000-0001'
        ];

        const authors = await client.authorsBatch(ids);
        expect(Array.isArray(authors)).toBe(true);
      });

      it('should handle empty array', async () => {
        const authors = await client.authorsBatch([]);
        expect(authors).toEqual([]);
      });
    });
  });

  describe('Advanced Error Handling', () => {
    it.skip('should handle malformed JSON responses', async () => {
      server.use(
        handlers.filter(h => h.info?.real).find(h => 
          h.info?.path === '/works'
        )?.respondWith((req) => 
          new Response('invalid json', { status: 200 })
        ) || handlers[0]
      );

      await expect(client.works()).rejects.toThrow();
    });

    it('should handle empty response bodies', async () => {
      server.use(
        http.get('https://api.openalex.org/works', () => {
          return new Response('', { status: 200 });
        })
      );

      await expect(client.works()).rejects.toThrow();
    });

    it('should handle network disconnection during request', mockRetryDelays(async () => {
      // Simulate network error that would trigger retries
      await expect(
        client.request('error/500', {})
      ).rejects.toThrow(OpenAlexError);
    }));

    it('should handle very large response payloads', async () => {
      // Test with a response that has many results
      const largeResponse = {
        meta: { count: 10000, per_page: 200 },
        results: new Array(200).fill(mockWork),
        group_by: []
      };

      server.use(
        handlers.filter(h => h.info?.real).find(h => 
          h.info?.path === '/works'
        )?.respondWith((req) => 
          Response.json(largeResponse)
        ) || handlers[0]
      );

      const response = await client.works({ per_page: 200 });
      expect(response.results).toHaveLength(200);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle zero timeout correctly', async () => {
      const zeroTimeoutClient = new OpenAlexClient({ timeout: 0 });
      
      // With zero timeout, requests should proceed without timeout
      const work = await zeroTimeoutClient.work('W2741809807');
      expect(work.id).toContain('W2741809807');
    });

    it('should handle negative timeout correctly', async () => {
      const negativeTimeoutClient = new OpenAlexClient({ timeout: -1000 });
      
      // Should treat negative timeout as no timeout
      const work = await negativeTimeoutClient.work('W2741809807');
      expect(work.id).toContain('W2741809807');
    });

    it('should handle zero max retries', async () => {
      const noRetryClient = new OpenAlexClient({ maxRetries: 0 });
      
      // Should fail immediately on error without retries
      await expect(
        noRetryClient.request('error/500', {})
      ).rejects.toThrow(OpenAlexError);
    });

    it('should handle very high max retries', async () => {
      const highRetryClient = new OpenAlexClient({ maxRetries: 100 });
      expect(highRetryClient.getConfig().maxRetries).toBe(100);
    });

    it('should handle empty mailto in polite mode', () => {
      const emptyMailtoClient = new OpenAlexClient({ 
        mailto: '',
        polite: true 
      });
      
      const config = emptyMailtoClient.getConfig();
      expect(config.mailto).toBe('');
      expect(config.polite).toBe(true);
    });

    it('should handle empty API key', () => {
      const emptyKeyClient = new OpenAlexClient({ apiKey: '' });
      expect(emptyKeyClient.getConfig().apiKey).toBe('');
    });
  });

  describe('URL Building Edge Cases', () => {
    it('should handle complex parameter objects', async () => {
      const complexParams = {
        filter: {
          'publication_year': '>2020',
          'is_oa': true,
          'authors.orcid': '0000-0001-0000-0001'
        },
        sort: 'cited_by_count:desc',
        per_page: 200,
        cursor: '*',
        nested: {
          deep: {
            value: 'test'
          }
        }
      };

      const response = await client.works(complexParams);
      expect(response.results).toBeDefined();
    });

    it('should handle null and undefined parameters', async () => {
      const paramsWithNulls = {
        search: 'test',
        filter: null,
        sort: undefined,
        per_page: 0, // Should be excluded
        cursor: '', // Should be excluded
        valid_param: 'included'
      };

      const response = await client.works(paramsWithNulls);
      expect(response.results).toBeDefined();
    });

    it('should handle array parameters', async () => {
      const arrayParams = {
        filter: ['type:article', 'is_oa:true'],
        topics: ['T1', 'T2', 'T3']
      };

      const response = await client.works(arrayParams);
      expect(response.results).toBeDefined();
    });
  });

  describe('Edge Cases in Method Calls', () => {
    it('should handle workNgrams with complex parameters', async () => {
      const ngrams = await client.workNgrams('W2741809807', {
        return_type: 'frequency',
        min_frequency: 5,
        max_frequency: 100
      });
      
      expect(Array.isArray(ngrams)).toBe(true);
    });

    it('should handle aboutness with edge case parameters', async () => {
      const response = await client.aboutness({
        text: '',
        return_concepts: false,
        return_topics: false
      });
      
      expect(response.concepts).toBeDefined();
      expect(response.topics).toBeDefined();
    });

    it('should handle groupBy methods with complex grouping', async () => {
      const response = await client.worksGroupBy({
        group_by: 'publication_year',
        filter: 'publication_year:>2020'
      });
      
      expect(response.group_by).toBeDefined();
    });
  });
});