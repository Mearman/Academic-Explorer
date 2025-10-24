/**
 * API mocking utilities for consistent HTTP request testing across all projects
 * in the Academic Explorer workspace.
 */

import { vi, type Mock as _Mock } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { SetupServerApi as _SetupServerApi } from "msw/node";

// Define OpenAlexResponse locally to avoid import issues
export interface OpenAlexResponse<T = any> {
  results: T[];
  meta: {
    count: number;
    db_response_time_ms: number;
    page: number;
    per_page: number;
    groups_count?: number;
  };
  group_by?: Array<{
    key: string;
    key_display_name: string;
    count: number;
    cited_by_count?: number;
    works_count?: number;
    h_index?: number;
  }>;
}

/**
 * Fetch API mocking utilities
 */
export const FetchMocks = {
  /**
   * Create a mock fetch function with common responses
   */
  createMockFetch: (defaultResponse?: Response) => {
    const mockFn = vi.fn();

    if (defaultResponse) {
      mockFn.mockResolvedValue(defaultResponse);
    }

    // Store original global fetch
    const originalFetch = global.fetch;

    // Replace global fetch
    global.fetch = mockFn;

    return {
      mock: mockFn,
      restore: () => {
        global.fetch = originalFetch;
      },
      mockResponse: (response: Response) => {
        mockFn.mockResolvedValueOnce(response);
      },
      mockError: (error: Error) => {
        mockFn.mockRejectedValueOnce(error);
      },
      mockTimeout: () => {
        const timeoutError = new DOMException("The operation was aborted", "AbortError");
        mockFn.mockRejectedValueOnce(timeoutError);
      },
      mockNetworkError: () => {
        const networkError = new Error("Network error");
        mockFn.mockRejectedValueOnce(networkError);
      },
    };
  },

  /**
   * Create common HTTP response mocks
   */
  createResponse: (
    data: any,
    options: {
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
    } = {}
  ): Response => {
    const { status = 200, statusText = "OK", headers = {} } = options;

    const responseInit: ResponseInit = {
      status,
      statusText,
      headers: new Headers({
        "content-type": "application/json",
        ...headers,
      }),
    };

    const response = new Response(JSON.stringify(data), responseInit);

    // Add url property if needed (as a custom property)
    if (options.url) {
      (response as any).url = options.url;
    }

    return response;
  },

  /**
   * Create HTTP error responses
   */
  createErrorResponse: (
    message: string,
    status = 500,
    statusText?: string
  ): Response => {
    return FetchMocks.createResponse(
      { error: message },
      { status, statusText }
    );
  },

  /**
   * Create rate limit response
   */
  createRateLimitResponse: (retryAfter = 60): Response => {
    return FetchMocks.createResponse(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  },

  /**
   * Create timeout response
   */
  createTimeoutResponse: (): Response => {
    const timeoutError = new DOMException("The operation was aborted", "AbortError");
    // Note: This doesn't work directly with Response - use mockError for timeout
    throw timeoutError;
  },
};

/**
 * OpenAlex API specific mocks
 */
export const OpenAlexMocks = {
  /**
   * Create OpenAlex API server for MSW
   */
  createServer: (): SetupServer => {
    return setupServer(
      // Default handlers that return empty responses
      http.get("https://api.openalex.org/works", () => {
        return HttpResponse.json({
          results: [],
          meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
        });
      }),
      http.get("https://api.openalex.org/authors", () => {
        return HttpResponse.json({
          results: [],
          meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
        });
      }),
      http.get("https://api.openalex.org/institutions", () => {
        return HttpResponse.json({
          results: [],
          meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
        });
      }),
      http.get("https://api.openalex.org/sources", () => {
        return HttpResponse.json({
          results: [],
          meta: { count: 0, db_response_time_ms: 10, page: 1, per_page: 25 },
        });
      }),
    );
  },

  /**
   * Create work API response
   */
  createWorkResponse: (works: any[] = []): OpenAlexResponse<any> => ({
    results: works,
    meta: {
      count: works.length,
      db_response_time_ms: 100,
      page: 1,
      per_page: 25,
    },
  }),

  /**
   * Create author API response
   */
  createAuthorResponse: (authors: any[] = []): OpenAlexResponse<any> => ({
    results: authors,
    meta: {
      count: authors.length,
      db_response_time_ms: 100,
      page: 1,
      per_page: 25,
    },
  }),

  /**
   * Create institution API response
   */
  createInstitutionResponse: (institutions: any[] = []): OpenAlexResponse<any> => ({
    results: institutions,
    meta: {
      count: institutions.length,
      db_response_time_ms: 100,
      page: 1,
      per_page: 25,
    },
  }),

  /**
   * Create realistic work data
   */
  createRealisticWork: (overrides: Partial<any> = {}) => ({
    id: "https://openalex.org/W123456789",
    doi: "https://doi.org/10.1234/test.123",
    title: "Machine Learning in Academic Research: A Comprehensive Study",
    display_name: "Machine Learning in Academic Research: A Comprehensive Study",
    publication_year: 2024,
    publication_date: "2024-03-15",
    type: "article",
    cited_by_count: 42,
    is_oa: true,
    authorships: [
      {
        author: {
          id: "https://openalex.org/A123456789",
          display_name: "Dr. Jane Smith",
          orcid: "https://orcid.org/0000-0000-0000-0000",
        },
        institutions: [
          {
            id: "https://openalex.org/I123456789",
            display_name: "Test University",
            ror: "https://ror.org/01abc23de",
            country_code: "US",
            type: "education",
          },
        ],
        is_corresponding: true,
      },
    ],
    institutions: [
      {
        id: "https://openalex.org/I123456789",
        display_name: "Test University",
        ror: "https://ror.org/01abc23de",
        country_code: "US",
        type: "education",
      },
    ],
    concepts: [
      {
        id: "https://openalex.org/C123456789",
        display_name: "Machine Learning",
        level: 1,
        score: 0.95,
      },
    ],
    mesh: [],
    locations: [
      {
        is_oa: true,
        landing_page_url: "https://doi.org/10.1234/test.123",
        pdf_url: "https://pdf.example.com/test.pdf",
        source: {
          id: "https://openalex.org/S123456789",
          display_name: "Test Journal",
          issn: ["1234-5678"],
          is_oa: true,
          is_in_doaj: true,
          host_organization: "https://openalex.org/P123456789",
        },
        license: "cc-by",
        version: "publishedVersion",
      },
    ],
    referenced_works: [
      "https://openalex.org/W987654321",
    ],
    related_works: [
      "https://openalex.org/W987654322",
    ],
    ...overrides,
  }),

  /**
   * Create realistic author data
   */
  createRealisticAuthor: (overrides: Partial<any> = {}) => ({
    id: "https://openalex.org/A123456789",
    orcid: "https://orcid.org/0000-0000-0000-0000",
    display_name: "Dr. Jane Smith",
    display_name_alternatives: ["J. Smith", "Jane Smith"],
    works_count: 45,
    cited_by_count: 1234,
    last_known_institution: {
      id: "https://openalex.org/I123456789",
      display_name: "Test University",
      ror: "https://ror.org/01abc23de",
      country_code: "US",
      type: "education",
    },
    x_concepts: [
      {
        id: "https://openalex.org/C123456789",
        display_name: "Machine Learning",
        level: 2,
        score: 0.85,
      },
    ],
    counts_by_year: [
      {
        year: 2024,
        works_count: 5,
        cited_by_count: 100,
      },
    ],
    works_api_url: "https://api.openalex.org/works?filter=author.id:A123456789",
    updated_date: "2024-01-01",
    created_date: "2024-01-01",
    ...overrides,
  }),

  /**
   * Create realistic institution data
   */
  createRealisticInstitution: (overrides: Partial<any> = {}) => ({
    id: "https://openalex.org/I123456789",
    ror: "https://ror.org/01abc23de",
    display_name: "Test University",
    country_code: "US",
    type: "education",
    homepage_url: "https://test-university.edu",
    image_url: "https://test-university.edu/logo.png",
    image_thumbnail_url: "https://test-university.edu/logo-thumb.png",
    works_count: 1500,
    cited_by_count: 25000,
    x_concepts: [
      {
        id: "https://openalex.org/C123456789",
        display_name: "Computer Science",
        level: 1,
        score: 0.90,
      },
    ],
    counts_by_year: [
      {
        year: 2024,
        works_count: 150,
        cited_by_count: 2500,
      },
    ],
    works_api_url: "https://api.openalex.org/works?filter=institution.id:I123456789",
    updated_date: "2024-01-01",
    created_date: "2024-01-01",
    ...overrides,
  }),
};

/**
 * Request/Response interceptor utilities for testing
 */
export const InterceptorMocks = {
  /**
   * Create request interceptor for testing
   */
  createRequestInterceptor: () => {
    const interceptedRequests: Array<{
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: any;
    }> = [];

    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
      const request = {
        url: url.toString(),
        method: options.method || "GET",
        headers: options.headers as Record<string, string> || {},
        body: options.body,
      };

      interceptedRequests.push(request);

      return originalFetch(url, options);
    });

    return {
      getInterceptedRequests: () => [...interceptedRequests],
      clearInterceptedRequests: () => {
        interceptedRequests.length = 0;
      },
      restore: () => {
        global.fetch = originalFetch;
      },
    };
  },

  /**
   * Create response interceptor for testing
   */
  createResponseInterceptor: () => {
    const interceptedResponses: Array<{
      url: string;
      status: number;
      headers: Record<string, string>;
      data: any;
    }> = [];

    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
      const response = await originalFetch(url, options);

      const responseData = await response.text();
      const data = responseData ? JSON.parse(responseData) : null;

      interceptedResponses.push({
        url: url.toString(),
        status: response.status,
        headers: Object.fromEntries(Array.from(response.headers.entries())),
        data,
      });

      // Return a new response with the same data
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    });

    return {
      getInterceptedResponses: () => [...interceptedResponses],
      clearInterceptedResponses: () => {
        interceptedResponses.length = 0;
      },
      restore: () => {
        global.fetch = originalFetch;
      },
    };
  },
};

/**
 * Rate limiting and retry testing utilities
 */
export const RateLimitMocks = {
  /**
   * Create rate limit scenario for testing
   */
  createRateLimitScenario: (requestsToTriggerLimit = 3) => {
    let requestCount = 0;

    const mockFetch = vi.fn().mockImplementation(async (_url: string) => {
      requestCount++;

      if (requestCount <= requestsToTriggerLimit) {
        return FetchMocks.createResponse(
          { results: [], meta: { count: 0 } },
          { status: 200 }
        );
      } else {
        return FetchMocks.createRateLimitResponse();
      }
    });

    return {
      mockFetch,
      getRequestCount: () => requestCount,
      reset: () => {
        requestCount = 0;
      },
    };
  },

  /**
   * Create retry scenario for testing
   */
  createRetryScenario: (
    failureCount: number,
    finalResponse?: Response
  ) => {
    let attemptCount = 0;

    const mockFetch = vi.fn().mockImplementation(async (_url: string) => {
      attemptCount++;

      if (attemptCount <= failureCount) {
        return FetchMocks.createErrorResponse("Internal Server Error", 500);
      } else {
        return finalResponse || FetchMocks.createResponse({ results: [], meta: { count: 0 } });
      }
    });

    return {
      mockFetch,
      getAttemptCount: () => attemptCount,
      reset: () => {
        attemptCount = 0;
      },
    };
  },
};

/**
 * Network condition simulation utilities
 */
export const NetworkMocks = {
  /**
   * Simulate slow network conditions
   */
  simulateSlowNetwork: (delay = 1000) => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return originalFetch(url, options);
    });

    return {
      restore: () => {
        global.fetch = originalFetch;
      },
    };
  },

  /**
   * Simulate flaky network conditions
   */
  simulateFlakyNetwork: (failureRate = 0.3) => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
      if (Math.random() < failureRate) {
        throw new Error("Network request failed");
      }
      return originalFetch(url, options);
    });

    return {
      restore: () => {
        global.fetch = originalFetch;
      },
    };
  },

  /**
   * Simulate offline conditions
   */
  simulateOffline: () => {
    const originalFetch = global.fetch;

    global.fetch = vi.fn().mockImplementation(() => {
      throw new Error("Network request failed");
    });

    return {
      restore: () => {
        global.fetch = originalFetch;
      },
    };
  },
};

/**
 * Query parameter utilities for API testing
 */
export const QueryParamMocks = {
  /**
   * Create URL with query parameters for testing
   */
  createUrlWithParams: (baseUrl: string, params: Record<string, any>): string => {
    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value != null) {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });

    return url.toString();
  },

  /**
   * Parse URL and extract query parameters
   */
  parseQueryParams: (url: string): Record<string, string[]> => {
    const urlObj = new URL(url);
    const params: Record<string, string[]> = {};

    urlObj.searchParams.forEach((value, key) => {
      if (!params[key]) {
        params[key] = [];
      }
      params[key].push(value);
    });

    return params;
  },

  /**
   * Create OpenAlex filter query
   */
  createFilterQuery: (filters: Record<string, string>): string => {
    return Object.entries(filters)
      .map(([key, value]) => `${key}:${value}`)
      .join(",");
  },

  /**
   * Create OpenAlex select query
   */
  createSelectQuery: (fields: string[]): string => {
    return fields.join(",");
  },
};

/**
 * Mock server utilities for MSW
 */
export const MockServerHelpers = {
  /**
   * Create MSW server with custom handlers
   */
  createServerWithHandlers: (handlers: any[]) => {
    return setupServer(...handlers);
  },

  /**
   * Create handler for specific endpoint
   */
  createEndpointHandler: (
    method: "get" | "post" | "put" | "delete" | "patch",
    urlPattern: string,
    response: (req: any, res: any, ctx: any) => any
  ) => {
    return http[method](urlPattern, response);
  },

  /**
   * Create handler that returns data with delay
   */
  createDelayedHandler: (
    method: "get" | "post" | "put" | "delete" | "patch",
    urlPattern: string,
    responseData: any,
    delay = 1000
  ) => {
    return http[method](urlPattern, async () => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return HttpResponse.json(responseData);
    });
  },

  /**
   * Create handler that simulates errors
   */
  createErrorHandler: (
    method: "get" | "post" | "put" | "delete" | "patch",
    urlPattern: string,
    status = 500,
    errorMessage = "Internal Server Error"
  ) => {
    return http[method](urlPattern, () => {
      return HttpResponse.json({ error: errorMessage }, { status });
    });
  },
};

/**
 * Cache testing utilities for API responses
 */
export const CacheMocks = {
  /**
   * Mock cache storage for testing
   */
  createCacheMock: () => {
    const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    return {
      get: vi.fn().mockImplementation((key: string) => {
        const entry = cache.get(key);
        if (!entry) return undefined;

        if (Date.now() - entry.timestamp > entry.ttl) {
          cache.delete(key);
          return undefined;
        }

        return entry.data;
      }),

      set: vi.fn().mockImplementation((key: string, data: any, ttl = 300000) => {
        cache.set(key, { data, timestamp: Date.now(), ttl });
      }),

      delete: vi.fn().mockImplementation((key: string) => {
        cache.delete(key);
      }),

      clear: vi.fn().mockImplementation(() => {
        cache.clear();
      }),

      getStats: () => ({
        size: cache.size,
        keys: Array.from(cache.keys()),
      }),
    };
  },

  /**
   * Create stale-while-revalidate cache scenario
   */
  createStaleWhileRevalidateScenario: () => {
    const cache = CacheMocks.createCacheMock();
    let networkCallCount = 0;

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      const cached = cache.get(url);

      if (cached && networkCallCount === 0) {
        // Return stale data but trigger background refresh
        setTimeout(() => {
          networkCallCount++;
          // Simulate background refresh
        }, 0);

        return FetchMocks.createResponse(cached);
      } else {
        // Fresh data
        networkCallCount++;
        const freshData = { results: [], meta: { count: 1 } };
        cache.set(url, freshData);
        return FetchMocks.createResponse(freshData);
      }
    });

    return {
      cache,
      mockFetch,
      getNetworkCallCount: () => networkCallCount,
    };
  },
};

/**
 * Request deduplication testing utilities
 */
export const DeduplicationMocks = {
  /**
   * Create request deduplication scenario
   */
  createDeduplicationScenario: () => {
    const pendingRequests = new Map<string, Promise<any>>();
    let networkCallCount = 0;

    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      const requestKey = url.toString();

      if (pendingRequests.has(requestKey)) {
        // Return existing promise
        return pendingRequests.get(requestKey);
      }

      const promise = (async () => {
        networkCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
        return FetchMocks.createResponse({ results: [], meta: { count: 1 } });
      })();

      pendingRequests.set(requestKey, promise);

      try {
        return await promise;
      } finally {
        pendingRequests.delete(requestKey);
      }
    });

    return {
      mockFetch,
      getNetworkCallCount: () => networkCallCount,
      getPendingRequestCount: () => pendingRequests.size,
    };
  },
};

/**
 * Performance testing utilities for API calls
 */
export const ApiPerformanceMocks = {
  /**
   * Measure API call performance
   */
  measureApiPerformance: async (
    apiCall: () => Promise<any>,
    iterations = 10
  ): Promise<number> => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await apiCall();
      const end = performance.now();
      times.push(end - start);
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  },

  /**
   * Create performance test scenario with varying response times
   */
  createPerformanceScenario: (responseTimes: number[] = [100, 500, 1000]) => {
    let callIndex = 0;

    const mockFetch = vi.fn().mockImplementation(async (_url: string) => {
      const delay = responseTimes[callIndex % responseTimes.length] || 100;
      callIndex++;

      await new Promise(resolve => setTimeout(resolve, delay));
      return FetchMocks.createResponse({ results: [], meta: { count: 1 } });
    });

    return {
      mockFetch,
      getCallCount: () => callIndex,
      reset: () => {
        callIndex = 0;
      },
    };
  },
};

/**
 * Integration with existing test patterns
 */
export const ApiTestPatterns = {
  /**
   * Standard API test setup
   */
  apiTestSetup: () => {
    const mockFetch = FetchMocks.createMockFetch();
    const server = OpenAlexMocks.createServer();

    return {
      mockFetch,
      server,
      createResponse: FetchMocks.createResponse,
      createErrorResponse: FetchMocks.createErrorResponse,
    };
  },

  /**
   * Setup for testing API error scenarios
   */
  errorScenarioSetup: () => {
    const mockFetch = FetchMocks.createMockFetch();
    const server = setupServer();

    return {
      mockFetch,
      server,
      simulateNetworkError: () => mockFetch.mockError(new Error("Network error")),
      simulateTimeout: () => mockFetch.mockTimeout(),
      simulateRateLimit: () => mockFetch.mockResponse(FetchMocks.createRateLimitResponse()),
    };
  },

  /**
   * Setup for testing API retry scenarios
   */
  retryScenarioSetup: () => {
    const retryScenario = RateLimitMocks.createRetryScenario(2);
    const server = setupServer();

    return {
      mockFetch: retryScenario.mockFetch,
      server,
      getAttemptCount: retryScenario.getAttemptCount,
      reset: retryScenario.reset,
    };
  },
};