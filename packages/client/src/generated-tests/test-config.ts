/**
 * Test Configuration for Generated OpenAlex API Tests
 *
 * This file provides configuration and utilities for the generated test suites.
 */

export interface TestConfig {
  /** Whether to run integration tests that make real API calls */
  runIntegrationTests: boolean;

  /** Rate limit for integration tests (requests per second) */
  integrationRateLimit: number;

  /** Timeout for integration tests (milliseconds) */
  integrationTimeout: number;

  /** Email to use for polite API requests */
  testEmail: string;

  /** Maximum number of routes to test in parallel */
  maxParallelTests: number;
}

export const defaultTestConfig: TestConfig = {
  runIntegrationTests: process.env.RUN_INTEGRATION_TESTS === 'true',
  integrationRateLimit: 8, // Conservative rate limit
  integrationTimeout: 45000, // 45 seconds
  testEmail: process.env.OPENALEX_EMAIL || 'test@academic-explorer.org',
  maxParallelTests: 3,
};

/**
 * Test data factories for creating mock responses
 */
export class TestDataFactory {
  static createWork(overrides = {}) {
    return {
      id: 'W2741809807',
      display_name: 'Test Work',
      publication_year: 2023,
      cited_by_count: 42,
      is_retracted: false,
      is_paratext: false,
      type: 'journal-article',
      open_access: { is_oa: true },
      authorships: [],
      concepts: [],
      locations: [],
      ...overrides
    };
  }

  static createAuthor(overrides = {}) {
    return {
      id: 'A5023888391',
      display_name: 'Test Author',
      orcid: 'https://orcid.org/0000-0002-1825-0097',
      works_count: 100,
      cited_by_count: 1500,
      ...overrides
    };
  }

  static createInstitution(overrides = {}) {
    return {
      id: 'I27837315',
      display_name: 'Test University',
      ror: 'https://ror.org/01234567',
      country_code: 'US',
      type: 'education',
      works_count: 50000,
      ...overrides
    };
  }

  static createSource(overrides = {}) {
    return {
      id: 'S137773608',
      display_name: 'Test Journal',
      issn_l: '2041-1723',
      is_oa: true,
      works_count: 25000,
      ...overrides
    };
  }

  static createTopic(overrides = {}) {
    return {
      id: 'T11636',
      display_name: 'Test Topic',
      description: 'A test topic description',
      works_count: 10000,
      ...overrides
    };
  }

  static createPublisher(overrides = {}) {
    return {
      id: 'P4310319965',
      display_name: 'Test Publisher',
      works_count: 100000,
      ...overrides
    };
  }

  static createFunder(overrides = {}) {
    return {
      id: 'F4320332161',
      display_name: 'Test Foundation',
      description: 'A test funding organization',
      works_count: 5000,
      ...overrides
    };
  }

  static createKeyword(overrides = {}) {
    return {
      id: 'test-keyword',
      display_name: 'Test Keyword',
      works_count: 1000,
      ...overrides
    };
  }

  static createResponse<T>(entity: T, meta = {}) {
    return {
      results: Array.isArray(entity) ? entity : [entity],
      meta: {
        count: Array.isArray(entity) ? entity.length : 1,
        db_response_time_ms: 15,
        page: 1,
        per_page: 25,
        ...meta
      }
    };
  }
}

/**
 * Utility functions for tests
 */
export class TestUtils {
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static generateRandomId(prefix: string): string {
    return `${prefix}${Math.floor(Math.random() * 1000000000)}`;
  }

  static sanitizeForTest(value: string): string {
    return value.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  static mockErrorResponse(statusCode: number, message: string) {
    const error = new Error(message);
    (error as any).statusCode = statusCode;
    return error;
  }
}
