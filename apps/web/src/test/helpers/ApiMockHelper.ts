/**
 * API Mock Helper for E2E Tests
 * Provides utilities for mocking API responses using Playwright's route interception
 */

import { type Page, type Route } from '@playwright/test';

export interface MockResponse {
  status?: number;
  contentType?: string;
  body?: unknown;
  delay?: number;
}

export class ApiMockHelper {
  private readonly page: Page;
  private readonly mocks: Map<string, MockResponse> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Mock an API endpoint with a specific response
   * @param urlPattern - URL pattern to match (string or regex)
   * @param response - Mock response configuration
   */
  async mockEndpoint(urlPattern: string | RegExp, response: MockResponse): Promise<void> {
    const key = urlPattern.toString();
    this.mocks.set(key, response);

    await this.page.route(urlPattern, async (route: Route) => {
      const mockResponse = this.mocks.get(key);

      if (!mockResponse) {
        await route.continue();
        return;
      }

      // Add delay if specified
      if (mockResponse.delay) {
        await new Promise((resolve) => setTimeout(resolve, mockResponse.delay));
      }

      await route.fulfill({
        status: mockResponse.status ?? 200,
        contentType: mockResponse.contentType ?? 'application/json',
        body: typeof mockResponse.body === 'string'
          ? mockResponse.body
          : JSON.stringify(mockResponse.body),
      });
    });
  }

  /**
   * Mock a 404 error for a specific endpoint
   * @param urlPattern - URL pattern to match
   */
  async mock404(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 404,
      body: { error: 'Not Found' },
    });
  }

  /**
   * Mock a 500 server error for a specific endpoint
   * @param urlPattern - URL pattern to match
   */
  async mock500(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 500,
      body: { error: 'Internal Server Error' },
    });
  }

  /**
   * Mock a network failure (connection refused)
   * @param urlPattern - URL pattern to match
   */
  async mockNetworkFailure(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, (route: Route) => {
      route.abort('failed');
    });
  }

  /**
   * Mock a timeout (slow response)
   * @param urlPattern - URL pattern to match
   * @param delay - Delay in milliseconds (default: 65000 to trigger timeout)
   */
  async mockTimeout(urlPattern: string | RegExp, delay = 65000): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 200,
      body: {},
      delay,
    });
  }

  /**
   * Mock OpenAlex API entity response
   * @param entityType - Type of entity (works, authors, etc.)
   * @param entityId - Entity ID
   * @param data - Mock entity data
   */
  async mockOpenAlexEntity(entityType: string, entityId: string, data: unknown): Promise<void> {
    const pattern = new RegExp(`api\\.openalex\\.org/${entityType}/${entityId}`);
    await this.mockEndpoint(pattern, {
      status: 200,
      body: data,
    });
  }

  /**
   * Mock OpenAlex API list/search response
   * @param entityType - Type of entity
   * @param results - Array of entity results
   * @param meta - Optional metadata (pagination, etc.)
   */
  async mockOpenAlexList(
    entityType: string,
    results: unknown[],
    meta?: { count?: number; page?: number; per_page?: number }
  ): Promise<void> {
    const pattern = new RegExp(`api\\.openalex\\.org/${entityType}`);
    await this.mockEndpoint(pattern, {
      status: 200,
      body: {
        results,
        meta: meta ?? {
          count: results.length,
          page: 1,
          per_page: results.length,
        },
      },
    });
  }

  /**
   * Clear a specific mock
   * @param urlPattern - URL pattern to clear
   */
  async clearMock(urlPattern: string | RegExp): Promise<void> {
    const key = urlPattern.toString();
    this.mocks.delete(key);
    await this.page.unroute(urlPattern);
  }

  /**
   * Clear all mocks
   */
  async clearAllMocks(): Promise<void> {
    for (const [pattern] of this.mocks) {
      await this.page.unroute(new RegExp(pattern));
    }
    this.mocks.clear();
  }

  /**
   * Intercept and log API requests for debugging
   * @param urlPattern - URL pattern to log
   */
  async logRequests(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, async (route: Route) => {
      const request = route.request();
      console.log(`[API Request] ${request.method()} ${request.url()}`);
      await route.continue();
    });
  }

  /**
   * Wait for a specific API request to be made
   * @param urlPattern - URL pattern to wait for
   * @param timeout - Maximum time to wait
   */
  async waitForRequest(urlPattern: string | RegExp, timeout = 30000): Promise<void> {
    await this.page.waitForRequest(urlPattern, { timeout });
  }

  /**
   * Wait for a specific API response
   * @param urlPattern - URL pattern to wait for
   * @param timeout - Maximum time to wait
   */
  async waitForResponse(urlPattern: string | RegExp, timeout = 30000): Promise<void> {
    await this.page.waitForResponse(urlPattern, { timeout });
  }

  /**
   * Get the number of requests made to a specific endpoint
   * @param urlPattern - URL pattern to count
   */
  async getRequestCount(urlPattern: string | RegExp): Promise<number> {
    return this.page.evaluate((pattern) => {
      // This requires tracking requests in page context
      // Return 0 as default (would need to set up tracking beforehand)
      return 0;
    }, urlPattern.toString());
  }

  /**
   * Simulate rate limiting (delay + 429 response)
   * @param urlPattern - URL pattern to rate limit
   */
  async mockRateLimit(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 429,
      body: {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      },
    });
  }

  /**
   * Mock authentication failure
   * @param urlPattern - URL pattern to return 401
   */
  async mock401(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 401,
      body: {
        error: 'Unauthorized',
        message: 'Authentication required',
      },
    });
  }

  /**
   * Mock forbidden access
   * @param urlPattern - URL pattern to return 403
   */
  async mock403(urlPattern: string | RegExp): Promise<void> {
    await this.mockEndpoint(urlPattern, {
      status: 403,
      body: {
        error: 'Forbidden',
        message: 'Access denied',
      },
    });
  }
}
