/**
 * OpenAlex API Base HTTP Client
 * Handles requests, rate limiting, error handling, and response parsing
 */

import { OpenAlexError, OpenAlexResponse, QueryParams } from './types';

export interface OpenAlexClientConfig {
  baseUrl?: string;
  userEmail?: string;
  rateLimit?: {
    requestsPerSecond?: number;
    requestsPerDay?: number;
  };
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface FullyConfiguredClient extends OpenAlexClientConfig {
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
}

export class OpenAlexApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'OpenAlexApiError';
    this.message = message; // Explicitly set message to ensure it's available

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, OpenAlexApiError.prototype);
  }
}

export class OpenAlexRateLimitError extends OpenAlexApiError {
  constructor(message: string, public retryAfter?: number) {
    super(message, 429);
    this.name = 'OpenAlexRateLimitError';
    this.message = message; // Explicitly set message to ensure it's available

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, OpenAlexRateLimitError.prototype);
  }
}

interface RateLimitState {
  requestsToday: number;
  lastRequestTime: number;
  dailyResetTime: number;
}

export class OpenAlexBaseClient {
  private config: Required<FullyConfiguredClient>;
  private rateLimitState: RateLimitState;

  constructor(config: OpenAlexClientConfig = {}) {
    // Create a fully-specified config with all required properties
    const defaultConfig: Required<FullyConfiguredClient> = {
      baseUrl: 'https://api.openalex.org',
      userEmail: '',
      rateLimit: {
        requestsPerSecond: 10, // Conservative default
        requestsPerDay: 100000, // OpenAlex limit
      },
      timeout: 30000, // 30 seconds
      retries: 3,
      retryDelay: 1000, // 1 second
    };

    this.config = {
      ...defaultConfig,
      ...config,
      rateLimit: {
        ...defaultConfig.rateLimit,
        ...config.rateLimit,
      },
    };

    // Initialize rate limiting state
    this.rateLimitState = {
      requestsToday: 0,
      lastRequestTime: 0,
      dailyResetTime: this.getNextMidnightUTC(),
    };
  }

  /**
   * Get the next midnight UTC timestamp for rate limit reset
   */
  private getNextMidnightUTC(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Check and enforce rate limits
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Reset daily counter if it's a new day
    if (now >= this.rateLimitState.dailyResetTime) {
      this.rateLimitState.requestsToday = 0;
      this.rateLimitState.dailyResetTime = this.getNextMidnightUTC();
    }

    // Check daily limit
    if (this.rateLimitState.requestsToday >= this.config.rateLimit.requestsPerDay) {
      const resetTime = new Date(this.rateLimitState.dailyResetTime);
      throw new OpenAlexRateLimitError(
        `Daily request limit of ${this.config.rateLimit.requestsPerDay} exceeded. Resets at ${resetTime.toISOString()}`,
        this.rateLimitState.dailyResetTime - now
      );
    }

    // Check per-second limit
    const minTimeBetweenRequests = 1000 / this.config.rateLimit.requestsPerSecond;
    const timeSinceLastRequest = now - this.rateLimitState.lastRequestTime;

    if (timeSinceLastRequest < minTimeBetweenRequests) {
      const waitTime = minTimeBetweenRequests - timeSinceLastRequest;
      await this.sleep(waitTime);
    }

    // Update state
    this.rateLimitState.requestsToday++;
    this.rateLimitState.lastRequestTime = Date.now();
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params: QueryParams = {}): string {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);

    // Add user email if provided (recommended by OpenAlex)
    if (this.config.userEmail) {
      url.searchParams.set('mailto', this.config.userEmail);
    }

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays (like select fields)
          url.searchParams.set(key, value.join(','));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });

    return url.toString();
  }

  /**
   * Parse error response from OpenAlex API
   */
  private async parseError(response: Response): Promise<OpenAlexApiError> {
    try {
      const errorData: OpenAlexError = await response.json();
      return new OpenAlexApiError(
        errorData.message || errorData.error || `HTTP ${response.status}`,
        response.status,
        response
      );
    } catch {
      return new OpenAlexApiError(
        `HTTP ${response.status} ${response.statusText}`,
        response.status,
        response
      );
    }
  }

  /**
   * Make a request with retries and error handling
   */
  private async makeRequest(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<Response> {
    try {
      await this.enforceRateLimit();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => { controller.abort(); }, this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenAlex-TypeScript-Client/1.0',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      // Handle rate limiting from server
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay;

        if (retryCount < this.config.retries) {
          await this.sleep(waitTime);
          return this.makeRequest(url, options, retryCount + 1);
        }

        throw new OpenAlexRateLimitError(
          'Rate limit exceeded and max retries reached',
          waitTime
        );
      }

      // Handle other HTTP errors
      if (!response.ok) {
        if (retryCount < this.config.retries && response.status >= 500) {
          // Retry on server errors
          await this.sleep(this.config.retryDelay * Math.pow(2, retryCount));
          return this.makeRequest(url, options, retryCount + 1);
        }
        throw await this.parseError(response);
      }

      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new OpenAlexApiError(`Request timeout after ${this.config.timeout}ms`);
      }

      if (error instanceof OpenAlexApiError) {
        throw error;
      }

      // Handle network errors
      if (retryCount < this.config.retries) {
        await this.sleep(this.config.retryDelay * Math.pow(2, retryCount));
        return this.makeRequest(url, options, retryCount + 1);
      }

      throw new OpenAlexApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * GET request that returns parsed JSON
   */
  public async get<T>(endpoint: string, params: QueryParams = {}): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await this.makeRequest(url);
    return response.json();
  }

  /**
   * GET request that returns an OpenAlex response with results and metadata
   */
  public async getResponse<T>(
    endpoint: string,
    params: QueryParams = {}
  ): Promise<OpenAlexResponse<T>> {
    return this.get<OpenAlexResponse<T>>(endpoint, params);
  }

  /**
   * GET request for a single entity by ID
   */
  public async getById<T>(endpoint: string, id: string, params: QueryParams = {}): Promise<T> {
    return this.get<T>(`${endpoint}/${encodeURIComponent(id)}`, params);
  }

  /**
   * Stream all results using cursor pagination
   */
  public async *stream<T>(
    endpoint: string,
    params: QueryParams = {},
    batchSize = 200
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    const streamParams = { ...params };

    // Only set per_page if not already provided in params
    if (!streamParams.per_page) {
      streamParams.per_page = batchSize;
    }

    do {
      if (cursor) {
        streamParams.cursor = cursor;
      }

      const response = await this.getResponse<T>(endpoint, streamParams);

      if (response.results.length === 0) {
        break;
      }

      yield response.results;

      // Extract cursor from next page URL if available
      cursor = this.extractCursorFromResponse(response);

    } while (cursor);
  }

  /**
   * Extract cursor from OpenAlex response metadata
   */
  private extractCursorFromResponse<T>(_response: OpenAlexResponse<T>): string | undefined {
    // OpenAlex typically includes pagination info in meta
    // This is a placeholder - actual implementation depends on OpenAlex response format
    return undefined;
  }

  /**
   * Get all results (use with caution for large datasets)
   */
  public async getAll<T>(
    endpoint: string,
    params: QueryParams = {},
    maxResults?: number
  ): Promise<T[]> {
    const results: T[] = [];
    let count = 0;

    for await (const batch of this.stream<T>(endpoint, params)) {
      for (const item of batch) {
        if (maxResults && count >= maxResults) {
          return results;
        }
        results.push(item);
        count++;
      }
    }

    return results;
  }

  /**
   * Update client configuration
   */
  public updateConfig(config: Partial<OpenAlexClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      rateLimit: {
        ...this.config.rateLimit,
        ...config.rateLimit,
      },
    };
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): {
    requestsToday: number;
    requestsRemaining: number;
    dailyResetTime: Date;
  } {
    return {
      requestsToday: this.rateLimitState.requestsToday,
      requestsRemaining: this.config.rateLimit.requestsPerDay - this.rateLimitState.requestsToday,
      dailyResetTime: new Date(this.rateLimitState.dailyResetTime),
    };
  }
}

// Default client instance
export const defaultClient = new OpenAlexBaseClient();