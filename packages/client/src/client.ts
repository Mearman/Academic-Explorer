/**
 * OpenAlex API Base HTTP Client
 * Handles requests, rate limiting, error handling, and response parsing
 */

import { logger } from "@academic-explorer/utils";
import { apiInterceptor } from "./interceptors";
import { RETRY_CONFIG, calculateRetryDelay } from "./internal/rate-limit";
import { trustApiContract, validateApiResponse } from "./internal/type-helpers";
import type { OpenAlexError, OpenAlexResponse, QueryParams } from "./types";

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
  headers?: Record<string, string>;
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
    public response?: Response,
  ) {
    super(message);
    this.name = "OpenAlexApiError";
    this.message = message; // Explicitly set message to ensure it's available

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, OpenAlexApiError.prototype);
  }
}

export class OpenAlexRateLimitError extends OpenAlexApiError {
  constructor(
    message: string,
    public retryAfter?: number,
  ) {
    super(message, 429);
    this.name = "OpenAlexRateLimitError";
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
      baseUrl: "https://api.openalex.org",
      userEmail: "",
      rateLimit: {
        requestsPerSecond: 10, // Conservative default
        requestsPerDay: 100000, // OpenAlex limit
      },
      timeout: 30000, // 30 seconds
      retries: 3,
      retryDelay: 1000, // 1 second
      headers: {},
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
    if (
      this.rateLimitState.requestsToday >= this.config.rateLimit.requestsPerDay
    ) {
      const resetTime = new Date(this.rateLimitState.dailyResetTime);
      throw new OpenAlexRateLimitError(
        `Daily request limit of ${this.config.rateLimit.requestsPerDay.toString()} exceeded. Resets at ${resetTime.toISOString()}`,
        this.rateLimitState.dailyResetTime - now,
      );
    }

    // Check per-second limit
    const minTimeBetweenRequests =
      1000 / this.config.rateLimit.requestsPerSecond;
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params: QueryParams = {}): string {
    const url = new URL(`${this.config.baseUrl}/${endpoint}`);

    // Add user email if provided (recommended by OpenAlex)
    if (this.config.userEmail) {
      url.searchParams.set("mailto", this.config.userEmail);
    }

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays (like select fields)
          url.searchParams.set(key, value.join(","));
        } else if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          url.searchParams.set(key, String(value));
        }
        // Ignore other types (objects, functions, etc.)
      }
    });

    return url.toString();
  }

  /**
   * Parse error response from OpenAlex API
   */
  private async parseError(response: Response): Promise<OpenAlexApiError> {
    // Type guard for OpenAlexError
    const isOpenAlexError = (data: unknown): data is OpenAlexError => {
      return (
        typeof data === "object" &&
        data !== null &&
        ("message" in data || "error" in data)
      );
    };

    try {
      const errorData: unknown = await response.json();

      if (isOpenAlexError(errorData)) {
        return new OpenAlexApiError(
          errorData.message ||
            errorData.error ||
            `HTTP ${response.status.toString()}`,
          response.status,
          response,
        );
      } else {
        return new OpenAlexApiError(
          `HTTP ${response.status.toString()} ${response.statusText}`,
          response.status,
          response,
        );
      }
    } catch {
      return new OpenAlexApiError(
        `HTTP ${response.status.toString()} ${response.statusText}`,
        response.status,
        response,
      );
    }
  }

  /**
   * Make a request with retries and error handling
   */
  private async makeRequest(
    url: string,
    options: RequestInit = {},
    retryCount = 0,
  ): Promise<Response> {
    // Log real API calls for debugging
    if (
      url.includes("api.openalex.org") &&
      !url.includes("test") &&
      !url.includes("localhost")
    ) {
      logger.warn(
        "client",
        "Making real OpenAlex API call in test environment",
        {
          url: url.substring(0, 100), // Truncate for readability
          method: options.method || "GET",
          retryCount,
        },
      );
    }

    // Determine max attempts: use config.retries if explicitly set (including 0), otherwise use RETRY_CONFIG
    const maxServerRetries =
      this.config.retries !== 3
        ? this.config.retries
        : RETRY_CONFIG.server.maxAttempts; // 3 is default
    const maxNetworkRetries =
      this.config.retries !== 3
        ? this.config.retries
        : RETRY_CONFIG.network.maxAttempts; // 3 is default

    try {
      // Short-circuit if host is under cooldown to avoid additional bursts
      try {
        const host = new URL(url).hostname;
        const cooldownUntil = hostCooldowns.get(host);
        if (cooldownUntil && Date.now() < cooldownUntil) {
          throw new OpenAlexRateLimitError(
            `Host ${host} is in cooldown until ${new Date(cooldownUntil).toISOString()}`,
            cooldownUntil - Date.now(),
          );
        }
      } catch {
        // If URL parsing fails or no cooldown, continue with normal flow
      }
      await this.enforceRateLimit();

      // Intercept the request if enabled
      const requestStartTime = Date.now();
      const requestOptions: RequestInit = {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": "OpenAlex-TypeScript-Client/1.0",
          ...this.config.headers,
          ...(options.headers &&
          typeof options.headers === "object" &&
          !Array.isArray(options.headers) &&
          !(options.headers instanceof Headers)
            ? options.headers
            : {}),
        },
      };

      const interceptedRequest = apiInterceptor.interceptRequest(
        url,
        requestOptions,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, this.config.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - requestStartTime;

      // Handle rate limiting from server (HTTP 429) with retry/backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retryAfterMs = retryAfter
          ? parseRetryAfterToMs(retryAfter)
          : undefined;

        // Use rate-limited retry strategy from internal config
        const maxRateLimitAttempts = RETRY_CONFIG.rateLimited.maxAttempts;
        if (retryCount < maxRateLimitAttempts) {
          const waitTime = calculateRetryDelay(
            retryCount,
            RETRY_CONFIG.rateLimited,
            retryAfterMs,
          );
          await this.sleep(waitTime);
          return await this.makeRequest(url, options, retryCount + 1);
        }

        // Exhausted retries - set host cooldown (if provided) and surface a rate limit error to callers
        try {
          const host = new URL(url).hostname;
          if (retryAfterMs) {
            hostCooldowns.set(host, Date.now() + retryAfterMs);
          } else {
            // Set a conservative default cooldown
            hostCooldowns.set(host, Date.now() + 10000);
          }
        } catch {
          // ignore URL parsing failures
        }

        throw new OpenAlexRateLimitError(
          `Rate limit exceeded (HTTP 429) after ${String(maxRateLimitAttempts)} attempts`,
          retryAfterMs,
        );
      }

      // Handle server errors (5xx) with enhanced retry logic
      if (!response.ok && response.status >= 500) {
        if (retryCount < maxServerRetries) {
          const waitTime =
            this.config.retries !== 3
              ? this.config.retryDelay * Math.pow(2, retryCount)
              : calculateRetryDelay(retryCount, RETRY_CONFIG.server);
          await this.sleep(waitTime);
          return await this.makeRequest(url, options, retryCount + 1);
        }
      }

      // Handle other HTTP errors (no retry for 4xx except 429)
      if (!response.ok) {
        throw await this.parseError(response);
      }

      // Intercept the response if request was intercepted and response is successful
      if (
        interceptedRequest &&
        response.status >= 200 &&
        response.status < 300
      ) {
        try {
          // Clone the response to read the data without consuming the original stream
          const responseClone = response.clone();
          const responseData = await responseClone.json();

          // Intercept the response
          const interceptedCall = apiInterceptor.interceptResponse(
            interceptedRequest,
            response,
            responseData,
            responseTime,
          );

          // Write to disk cache if intercepted successfully (Node.js only)
          // Check environment variable to determine if disk caching should be enabled
          const diskCacheEnabled =
            globalThis.process?.env?.ACADEMIC_EXPLORER_DISK_CACHE_ENABLED !==
            "false";

          if (
            interceptedCall &&
            typeof globalThis.process !== "undefined" &&
            globalThis.process.versions?.node &&
            diskCacheEnabled
          ) {
            try {
              // Dynamic import to avoid bundling Node.js modules in browser
              const { defaultDiskWriter } = await import("./cache/disk");
              await defaultDiskWriter.writeToCache({
                url: interceptedCall.request.url,
                finalUrl: interceptedCall.request.finalUrl,
                method: interceptedCall.request.method,
                requestHeaders: interceptedCall.request.headers,
                responseData: interceptedCall.response.data,
                statusCode: interceptedCall.response.status,
                responseHeaders: interceptedCall.response.headers,
                timestamp: new Date(
                  interceptedCall.response.timestamp,
                ).toISOString(),
              });
            } catch (diskError: unknown) {
              // Silently fail disk caching in browser environments
              logger.debug(
                "client",
                "Disk caching unavailable (browser environment)",
                { error: diskError },
              );
            }
          }
        } catch (interceptError: unknown) {
          // Don't fail the request if interception fails
          logger.debug("client", "Response interception failed", {
            error: interceptError,
          });
        }
      }

      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new OpenAlexApiError(
          `Request timeout after ${this.config.timeout.toString()}ms`,
        );
      }

      if (error instanceof OpenAlexApiError) {
        throw error;
      }

      // Handle network errors with enhanced retry logic
      if (retryCount < maxNetworkRetries) {
        const waitTime =
          this.config.retries !== 3
            ? this.config.retryDelay * Math.pow(2, retryCount)
            : calculateRetryDelay(retryCount, RETRY_CONFIG.network);
        await this.sleep(waitTime);
        return this.makeRequest(url, options, retryCount + 1);
      }

      throw new OpenAlexApiError(
        `Network error after ${String(maxNetworkRetries)} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * GET request that returns parsed JSON
   */
  public async get<T>(endpoint: string, params: QueryParams = {}): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await this.makeRequest(url);
    const data: unknown = await response.json();
    const validatedData = validateApiResponse(data);
    return trustApiContract(validatedData) as T;
  }

  /**
   * GET request that returns an OpenAlex response with results and metadata
   */
  public async getResponse<T>(
    endpoint: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<T>> {
    return this.get<OpenAlexResponse<T>>(endpoint, params);
  }

  /**
   * GET request for a single entity by ID
   */
  public async getById<T>(
    endpoint: string,
    id: string,
    params: QueryParams = {},
  ): Promise<T> {
    return this.get<T>(`${endpoint}/${encodeURIComponent(id)}`, params);
  }

  /**
   * Stream all results using cursor pagination
   */
  public async *stream<T>(
    endpoint: string,
    params: QueryParams = {},
    batchSize = 200,
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    const streamParams = { ...params };

    // Only set per_page if not already provided in params
    streamParams.per_page ??= batchSize;

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
      cursor = this.extractCursorFromResponse();
    } while (cursor);
  }

  /**
   * Extract cursor from OpenAlex response metadata
   */
  private extractCursorFromResponse(): string | undefined {
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
    maxResults?: number,
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
      requestsRemaining:
        this.config.rateLimit.requestsPerDay -
        this.rateLimitState.requestsToday,
      dailyResetTime: new Date(this.rateLimitState.dailyResetTime),
    };
  }
}

/**
 * Parse Retry-After header value into milliseconds.
 * Accepts either integer seconds or HTTP-date formats. Returns undefined if unparsable.
 */
function parseRetryAfterToMs(
  value: string | null | undefined,
): number | undefined {
  if (!value) return undefined;
  // If it's an integer number of seconds
  const seconds = Number(value);
  if (!Number.isNaN(seconds) && Number.isFinite(seconds)) {
    return Math.max(0, Math.floor(seconds)) * 1000;
  }

  // Try parsing as HTTP-date
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const diff = parsed - Date.now();
    return diff > 0 ? diff : 0;
  }

  return undefined;
}

// Default client instance
export const defaultClient = new OpenAlexBaseClient();

// Global cooldown map per host to avoid repeated bursts after 429s
export const hostCooldowns: Map<string, number> = new Map();
