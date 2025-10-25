/**
 * Centralized Mock OpenAlex Client for Testing
 *
 * Provides a comprehensive mock implementation of the OpenAlex client interface
 * with controllable behaviors for testing error conditions, malformed responses,
 * and various API scenarios. Now supports external identifier formats like
 * DOIs, ORCIDs, ROR IDs, ISSN-L, and OpenAlex URLs.
 */

import { EntityDetectionService } from '../../services/entity-detection-service';

export interface MockClientOptions {
  shouldFail?: boolean;
  failureMode?: 'network' | 'timeout' | 'rate-limit' | 'malformed' | 'invalid-response' | 'missing-fields' | 'server-error' | 'quota-exceeded';
  requestDelay?: number;
  customResponseData?: Record<string, unknown>;
}

/**
 * Mock OpenAlex Client that matches the interface expected by OpenAlexGraphProvider
 */
export class MockOpenAlexClient {
  private options: MockClientOptions = {
    shouldFail: false,
    requestDelay: 0,
  };
  // EntityDetectionService is static, no instance needed

  public requestHistory: Array<{ method: string; params: Record<string, unknown>; timestamp: number }> = [];

  constructor(options: MockClientOptions = {}) {
    this.options = { ...this.options, ...options };
    this.setupDefaultResponses();
  }

  // Configuration methods for tests
  setFailureMode(mode: MockClientOptions['failureMode'], customData?: Record<string, unknown>) {
    this.options.failureMode = mode;
    this.options.shouldFail = mode !== null && mode !== undefined;
    this.options.customResponseData = customData;
  }

  setShouldFail(fail: boolean) {
    this.options.shouldFail = fail;
  }

  setRequestDelay(delay: number) {
    this.options.requestDelay = delay;
  }

  clearRequestHistory() {
    this.requestHistory = [];
  }

  // Default test data
  private defaultData: Map<string, Record<string, unknown>> = new Map();

  private setupDefaultResponses() {
    // Works
    this.defaultData.set('works:W2741809807', {
      id: 'W2741809807',
      display_name: 'Machine Learning in Academic Research',
      title: 'Machine Learning in Academic Research',
      authorships: [
        { author: { id: 'A5017898742', display_name: 'Dr. Jane Smith' } }
      ],
      primary_location: {
        source: { id: 'S4210184550', display_name: 'Nature' }
      },
      ids: {
        openalex: 'https://openalex.org/W2741809807',
        doi: 'https://doi.org/10.1038/s41586-023-12345-6'
      },
      cited_by_count: 42,
      publication_year: 2023
    });

    // Authors
    this.defaultData.set('authors:A5017898742', {
      id: 'A5017898742',
      display_name: 'Dr. Jane Smith',
      ids: {
        openalex: 'https://openalex.org/A5017898742',
        orcid: 'https://orcid.org/0000-0002-1825-0097'
      },
      works_count: 25,
      cited_by_count: 1500,
      last_known_institutions: [
        { id: 'I4210140050', display_name: 'Harvard University' }
      ]
    });

    // Sources
    this.defaultData.set('sources:S4210184550', {
      id: 'S4210184550',
      display_name: 'Nature',
      ids: {
        openalex: 'https://openalex.org/S4210184550',
        issn_l: '0028-0836'
      },
      works_count: 50000,
      cited_by_count: 5000000
    });

    // Institutions
    this.defaultData.set('institutions:I4210140050', {
      id: 'I4210140050',
      display_name: 'Harvard University',
      ids: {
        openalex: 'https://openalex.org/I4210140050',
        ror: 'https://ror.org/03vek6s52'
      },
      works_count: 100000,
      cited_by_count: 10000000
    });

  }

  /**
   * Normalize external identifiers to OpenAlex format
   * Converts DOIs, ORCIDs, ROR IDs, ISSN-L, etc. to OpenAlex IDs
   * Uses EntityDetectionService to handle all identifier formats
   */
  private normalizeId(id: string): { normalizedId: string; entityType: string | null } {
    const entityType = EntityDetectionService.detectEntityType(id);
    const normalizedId = EntityDetectionService.normalizeIdentifier(id);

    if (!entityType || !normalizedId) {
      // For invalid IDs, throw an error to simulate real API behavior
      throw new Error(`Cannot detect entity type for ID: ${id}`);
    }

    return { normalizedId, entityType };
  }


  // OpenAlex Client Interface Implementation

  async getWork(id: string): Promise<Record<string, unknown>> {
    const normalized = this.normalizeId(id);
    const actualId = normalized.normalizedId;

    // Check if we have mock data for this specific ID
    let dataKey = `works:${actualId}`;
    let mockData = this.defaultData.get(dataKey);

    if (!mockData) {
      // Try to find by external ID pattern
      if (id.includes('doi.org') || id.startsWith('10.')) {
        dataKey = 'works:W2741809807'; // Default work with DOI
        mockData = this.defaultData.get(dataKey);
      } else {
        dataKey = 'works:W2741809807'; // Fallback
        mockData = this.defaultData.get(dataKey);
      }
    }

    // Clone the mock data and update the ID to match the normalized ID
    if (mockData) {
      mockData = { ...mockData, id: actualId };
    }

    return this.makeRequest('getWork', { id }, undefined, mockData) as unknown as Record<string, unknown>;
  }

  async getAuthor(id: string): Promise<Record<string, unknown>> {
    const normalized = this.normalizeId(id);
    const actualId = normalized.normalizedId;

    // Check if we have mock data for this specific ID
    let dataKey = `authors:${actualId}`;
    let mockData = this.defaultData.get(dataKey);

    if (!mockData) {
      // Try to find by external ID pattern
      if (id.includes('orcid.org') || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) {
        dataKey = 'authors:A5017898742'; // Default author with ORCID
        mockData = this.defaultData.get(dataKey);
      } else {
        dataKey = 'authors:A5017898742'; // Fallback
        mockData = this.defaultData.get(dataKey);
      }
    }

    // Clone the mock data and update the ID to match the normalized ID
    if (mockData) {
      mockData = { ...mockData, id: actualId };
    }

    return this.makeRequest('getAuthor', { id }, undefined, mockData) as unknown as Record<string, unknown>;
  }

  async getSource(id: string): Promise<Record<string, unknown>> {
    const normalized = this.normalizeId(id);
    const actualId = normalized.normalizedId;

    // Check if we have mock data for this specific ID
    let dataKey = `sources:${actualId}`;
    let mockData = this.defaultData.get(dataKey);

    if (!mockData) {
      // Try to find by external ID pattern
      if (/^\d{4}-\d{3}[\dX]$/.test(id) || id.includes('issn')) {
        dataKey = 'sources:S4210184550'; // Default source with ISSN-L
        mockData = this.defaultData.get(dataKey);
      } else {
        dataKey = 'sources:S4210184550'; // Fallback
        mockData = this.defaultData.get(dataKey);
      }
    }

    // Clone the mock data and update the ID to match the normalized ID
    if (mockData) {
      mockData = { ...mockData, id: actualId };
    }

    return this.makeRequest('getSource', { id }, undefined, mockData) as unknown as Record<string, unknown>;
  }

  async getInstitution(id: string): Promise<Record<string, unknown>> {
    const normalized = this.normalizeId(id);
    const actualId = normalized.normalizedId;

    // Check if we have mock data for this specific ID
    let dataKey = `institutions:${actualId}`;
    let mockData = this.defaultData.get(dataKey);

    if (!mockData) {
      // Try to find by external ID pattern
      if (id.includes('ror.org') || /^0[a-z0-9]{6}[0-9]{2}$/.test(id)) {
        dataKey = 'institutions:I4210140050'; // Default institution with ROR
        mockData = this.defaultData.get(dataKey);
      } else {
        dataKey = 'institutions:I4210140050'; // Fallback
        mockData = this.defaultData.get(dataKey);
      }
    }

    // Clone the mock data and update the ID to match the normalized ID
    if (mockData) {
      mockData = { ...mockData, id: actualId };
    }

    return this.makeRequest('getInstitution', { id }, undefined, mockData) as unknown as Record<string, unknown>;
  }

  async get(endpoint: string, id: string): Promise<Record<string, unknown>> {
    const normalized = this.normalizeId(id);
    const actualId = normalized.normalizedId;

    // Check if we have mock data for this specific ID
    const dataKey = `${endpoint}:${actualId}`;
    let mockData = this.defaultData.get(dataKey);

    if (!mockData) {
      // Create default data for other entity types
      const entityTypes: Record<string, string> = {
        topics: 'T',
        publishers: 'P',
        funders: 'F',
        concepts: 'C',
        keywords: 'K'
      };

      const _prefix = entityTypes[endpoint] || 'X';
      mockData = {
        id: actualId,
        display_name: `Mock ${endpoint.slice(0, -1)} Entity`,
        ids: {
          openalex: `https://openalex.org/${actualId}`
        }
      };
    } else {
      // Clone and update ID
      mockData = { ...mockData, id: actualId };
    }

    return this.makeRequest('get', { endpoint, id }, undefined, mockData) as unknown as Record<string, unknown>;
  }

  // Search methods - these MUST return { results: [...] } format
  async works(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const results = await this.makeRequest('works', params, 'search:works');

    // If we're returning malformed data for testing purposes, return it as-is
    if (this.options.failureMode === 'malformed' && this.options.customResponseData) {
      return this.options.customResponseData as { results: Record<string, unknown>[] };
    }

    // Ensure it's in the correct format even if makeRequest returns something else
    if (Array.isArray(results)) {
      return { results };
    }
    if (results && typeof results === 'object' && 'results' in results && Array.isArray(results.results)) {
      return results as { results: Record<string, unknown>[] };
    }

    // Default search results for works with proper OpenAlex IDs
    return {
      results: [
        { id: 'W2741809807', display_name: 'Test Work', title: 'Test Work' },
        { id: 'W1234567890', display_name: 'Another Work', title: 'Another Work' }
      ]
    };
  }

  async authors(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const results = await this.makeRequest('authors', params, 'search:authors');

    // If we're returning malformed data for testing purposes, return it as-is
    if (this.options.failureMode === 'malformed' && this.options.customResponseData) {
      return this.options.customResponseData as { results: Record<string, unknown>[] };
    }

    if (Array.isArray(results)) {
      return { results };
    }
    if (results && typeof results === 'object' && 'results' in results && Array.isArray(results.results)) {
      return results as { results: Record<string, unknown>[] };
    }

    return {
      results: [
        { id: 'A5017898742', display_name: 'Test Author' },
        { id: 'A9876543210', display_name: 'Test Researcher' }
      ]
    };
  }

  async sources(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const results = await this.makeRequest('sources', params, 'search:sources') as { results: Record<string, unknown>[] };

    if (Array.isArray(results)) {
      return { results };
    }
    if (results && Array.isArray(results.results)) {
      return results;
    }

    return { results: [] };
  }

  async institutions(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }> {
    const results = await this.makeRequest('institutions', params, 'search:institutions') as { results: Record<string, unknown>[] };

    if (Array.isArray(results)) {
      return { results };
    }
    if (results && Array.isArray(results.results)) {
      return results;
    }

    return { results: [] };
  }

  // Core request handling with error simulation
  private async makeRequest(method: string, params: Record<string, unknown>, dataKey?: string, customData?: unknown): Promise<unknown> {
    this.requestHistory.push({ method, params, timestamp: Date.now() });

    // Simulate network delay
    if (this.options.requestDelay && this.options.requestDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.options.requestDelay));
    }

    // Handle failure modes
    if (this.options.shouldFail && this.options.failureMode) {
      return this.simulateFailure(this.options.failureMode);
    }

    // Return custom data if provided in options
    if (this.options.customResponseData) {
      return this.options.customResponseData;
    }

    // Return custom data if provided in method call
    if (customData) {
      return customData;
    }

    // Return default data
    if (dataKey && this.defaultData.has(dataKey)) {
      return this.defaultData.get(dataKey);
    }

    // Default successful response based on method
    switch (method) {
      case 'works':
      case 'authors':
      case 'sources':
      case 'institutions':
        return { results: [{ id: 'default-result', display_name: 'Default Result' }] };
      default:
        return { id: 'default', display_name: 'Default Entity', test: true };
    }
  }

  private async simulateFailure(mode: NonNullable<MockClientOptions['failureMode']>): Promise<unknown> {
    switch (mode) {
      case 'network': {
        const networkError = new Error('fetch failed');
        (networkError as { cause?: { code?: string } }).cause = { code: 'ECONNRESET' };
        throw networkError;
      }

      case 'timeout': {
        // Simulate timeout by delaying then throwing AbortError
        await new Promise(resolve => setTimeout(resolve, 50));
        const timeoutError = new Error('The operation was aborted.');
        (timeoutError as { name?: string }).name = 'AbortError';
        throw timeoutError;
      }

      case 'rate-limit': {
        const rateLimitError = new Error('Too Many Requests');
        (rateLimitError as { status?: number; headers?: Map<string, string> }).status = 429;
        (rateLimitError as { status?: number; headers?: Map<string, string> }).headers = new Map([['retry-after', '3600']]);
        throw rateLimitError;
      }

      case 'quota-exceeded': {
        const quotaError = new Error('API quota exceeded');
        (quotaError as { status?: number; headers?: Map<string, string> }).status = 403;
        (quotaError as { status?: number; headers?: Map<string, string> }).headers = new Map([['x-ratelimit-remaining', '0']]);
        throw quotaError;
      }

      case 'server-error': {
        const serverError = new Error('Internal Server Error');
        (serverError as { status?: number }).status = 500;
        throw serverError;
      }

      case 'malformed': {
        // Return malformed data instead of throwing
        if (this.options.customResponseData) {
          return this.options.customResponseData;
        }
        return { malformed: true, results: "not-an-array" };
      }

      case 'invalid-response': {
        // Return null/invalid response
        return null;
      }

      case 'missing-fields': {
        // Return response with missing/null required fields
        return { id: undefined, display_name: null };
      }

      default:
        throw new Error(`Unknown failure mode: ${mode}`);
    }
  }

  // Test utility methods
  addMockData(key: string, data: Record<string, unknown>) {
    this.defaultData.set(key, data);
  }

  removeMockData(key: string) {
    this.defaultData.delete(key);
  }

  clearMockData() {
    this.defaultData.clear();
    this.setupDefaultResponses();
  }

  getRequestCount(): number {
    return this.requestHistory.length;
  }

  getLastRequest(): { method: string; params: Record<string, unknown>; timestamp: number } | undefined {
    return this.requestHistory[this.requestHistory.length - 1];
  }

  getRequestsForMethod(method: string): { method: string; params: Record<string, unknown>; timestamp: number }[] {
    return this.requestHistory.filter(r => r.method === method);
  }
}

// Factory functions for common test scenarios
export function createHealthyMockClient(): MockOpenAlexClient {
  return new MockOpenAlexClient({ shouldFail: false });
}

export function createFailingMockClient(mode: MockClientOptions['failureMode']): MockOpenAlexClient {
  return new MockOpenAlexClient({ shouldFail: true, failureMode: mode });
}

export function createSlowMockClient(delay: number): MockOpenAlexClient {
  return new MockOpenAlexClient({ shouldFail: false, requestDelay: delay });
}

export function createMockClientWithData(data: Record<string, Record<string, unknown>>): MockOpenAlexClient {
  const client = new MockOpenAlexClient();
  Object.entries(data).forEach(([key, value]) => {
    client.addMockData(key, value);
  });
  return client;
}