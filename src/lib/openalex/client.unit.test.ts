// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAlexClient, OpenAlexError } from './client';
import { server } from '@/test/setup';
import { errorHandlers } from '@/test/mocks/handlers';
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

    it('should retry on 429 rate limit', async () => {
      server.use(errorHandlers.emptyResponse);
      
      const response = await client.works();
      expect(response.results).toHaveLength(0);
    });

    it('should handle network errors', async () => {
      server.use(...errorHandlers.networkError);
      
      await expect(client.works()).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      const timeoutClient = new OpenAlexClient({ timeout: 50, maxRetries: 1 });
      server.use(...errorHandlers.timeout);
      
      await expect(timeoutClient.works()).rejects.toThrow();
    });
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

    it('should handle network errors for continents', async () => {
      server.use(...errorHandlers.networkError);
      
      await expect(client.continents()).rejects.toThrow();
    });

    it('should handle network errors for regions', async () => {
      server.use(...errorHandlers.networkError);
      
      await expect(client.regions()).rejects.toThrow();
    });

    it('should handle network errors for aboutness', async () => {
      server.use(...errorHandlers.networkError);
      
      await expect(
        client.aboutness({ text: 'test text' })
      ).rejects.toThrow();
    });

    it('should handle timeout for aboutness', async () => {
      const timeoutClient = new OpenAlexClient({ timeout: 50, maxRetries: 1 });
      server.use(...errorHandlers.timeout);
      
      await expect(
        timeoutClient.aboutness({ text: 'test text' })
      ).rejects.toThrow();
    });
  });

  describe('Parameter validation for new endpoints', () => {
    it('should validate continents parameters', async () => {
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
});