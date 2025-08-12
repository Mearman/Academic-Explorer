import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAlexClient, OpenAlexError } from './client';
import { server } from '@/test/setup';
import { errorHandlers } from '@/test/mocks/handlers';
import { mockWork, mockAuthor, mockWorksResponse } from '@/test/mocks/data';

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
      server.use(errorHandlers.networkError);
      
      await expect(client.works()).rejects.toThrow();
    });

    it('should handle timeout', async () => {
      const timeoutClient = new OpenAlexClient({ timeout: 100 });
      server.use(errorHandlers.timeout);
      
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
});