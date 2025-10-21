/**
 * OpenAlex API Base HTTP Client
 * Handles requests, rate limiting, error handling, and response parsing
 */

import { logger } from "@academic-explorer/utils/logger";
import { apiInterceptor, type InterceptedRequest } from "./interceptors";
import { RETRY_CONFIG, calculateRetryDelay } from "./internal/rate-limit";
import {
  isValidApiResponse,
  validateApiResponse,
} from "./internal/type-helpers";
import { validateWithSchema } from "@academic-explorer/types/entities";
import { z } from "zod";
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
  statusCode?: number;
  response?: Response;

  constructor({
    message,
    statusCode,
    response,
  }: {
    message: string;
    statusCode?: number;
    response?: Response;
  }) {
    super(message);
    this.name = "OpenAlexApiError";
    this.statusCode = statusCode;
    this.response = response;

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, OpenAlexApiError.prototype);
  }
}

export class OpenAlexRateLimitError extends OpenAlexApiError {
  retryAfter?: number;

  constructor({
    message,
    retryAfter,
  }: {
    message: string;
    retryAfter?: number;
  }) {
    super({ message, statusCode: 429 });
    this.name = "OpenAlexRateLimitError";
    this.retryAfter = retryAfter;
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

  /**
   * Check if running in development mode based on NODE_ENV
   */
  private checkNodeEnv(): boolean | null {
    if (globalThis.process?.env?.NODE_ENV) {
      const nodeEnv = globalThis.process.env.NODE_ENV.toLowerCase();
      if (nodeEnv === "development" || nodeEnv === "dev") return true;
      if (nodeEnv === "production") return false;
    }
    return null;
  }

  /**
   * Check Vite's __DEV__ flag
   */
  private checkViteDevFlag(): boolean | null {
    if (typeof globalThis !== "undefined" && "__DEV__" in globalThis) {
      try {
        const globalObj = globalThis as Record<string, unknown>;
        const devFlag = globalObj.__DEV__;
        if (typeof devFlag === "boolean") {
          return devFlag;
        }
      } catch {
        // Ignore errors if __DEV__ is not accessible
      }
    }
    return null;
  }

  /**
   * Check browser-based development indicators
   */
  private checkBrowserDevIndicators(): boolean | null {
    try {
      if (typeof globalThis !== "undefined" && "window" in globalThis) {
        const win =
          "window" in globalThis &&
          globalThis.window &&
          "location" in globalThis.window
            ? globalThis.window
            : undefined;
        if (win?.location?.hostname) {
          const { hostname } = win.location;
          // Local development indicators
          if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.endsWith(".local")
          ) {
            return true;
          }
        }
      }
    } catch {
      // Ignore errors in browser detection
    }
    return null;
  }

  /**
   * Detect if running in development mode
   */
  private isDevelopmentMode(): boolean {
    // Check NODE_ENV first (most reliable)
    const nodeEnvResult = this.checkNodeEnv();
    if (nodeEnvResult !== null) return nodeEnvResult;

    // Check Vite's __DEV__ flag
    const viteResult = this.checkViteDevFlag();
    if (viteResult !== null) return viteResult;

    // Check browser-based development indicators
    const browserResult = this.checkBrowserDevIndicators();
    if (browserResult !== null) return browserResult;

    // Default to development if uncertain (fail-safe for dev mode)
    return true;
  }

  constructor(config: OpenAlexClientConfig = {}) {
    // Create a fully-specified config with all required properties
    const defaultConfig: Required<FullyConfiguredClient> = {
      baseUrl: this.isDevelopmentMode()
        ? "/api/openalex"
        : "https://api.openalex.org",
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
      throw new OpenAlexRateLimitError({
        message: `Daily request limit of ${this.config.rateLimit.requestsPerDay} exceeded. Resets at ${resetTime.toISOString()}`,
        retryAfter: this.rateLimitState.dailyResetTime - now,
      });
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

  private isAbsoluteUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return Boolean(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  private getEnvironmentOrigin(): string | null {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }

    if (typeof globalThis !== "undefined") {
      const globalLocation =
        "location" in globalThis ? globalThis.location : undefined;
      if (globalLocation?.origin) {
        return globalLocation.origin;
      }
    }

    if (
      typeof process !== "undefined" &&
      typeof process.env?.VITE_ORIGIN === "string" &&
      process.env.VITE_ORIGIN.length > 0
    ) {
      return process.env.VITE_ORIGIN;
    }

    return null;
  }

  private resolveBaseUrl(baseUrl: string): string {
    if (this.isAbsoluteUrl(baseUrl)) {
      return baseUrl.replace(/\/+$/, "");
    }

    const origin = this.getEnvironmentOrigin();
    if (origin) {
      const resolvedUrl = new URL(baseUrl, origin);
      return resolvedUrl.toString().replace(/\/+$/, "");
    }

    const fallbackOrigin = "https://api.openalex.org";
    const sanitizedBase = baseUrl.trim();

    if (
      sanitizedBase.startsWith("/") ||
      sanitizedBase.startsWith("./") ||
      sanitizedBase.startsWith("../")
    ) {
      return fallbackOrigin;
    }

    const resolvedUrl = new URL(sanitizedBase, `${fallbackOrigin}/`);
    return resolvedUrl.toString().replace(/\/+$/, "");
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params: QueryParams = {}): string {
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;
    const resolvedBaseUrl = this.resolveBaseUrl(this.config.baseUrl);
    const baseWithSlash = resolvedBaseUrl.endsWith("/")
      ? resolvedBaseUrl
      : `${resolvedBaseUrl}/`;
    const url = new URL(normalizedEndpoint, baseWithSlash);

    // Add user email if provided (recommended by OpenAlex)
    if (this.config.userEmail) {
      url.searchParams.set("mailto", this.config.userEmail);
    }

    // Build URL string first, then manually append select parameter to avoid encoding commas
    // OpenAlex API requires actual commas, not %2C encoded commas in select parameter
    const selectValue = params.select;
    const otherParams = { ...params };
    delete otherParams.select;

    // Add other query parameters (these can be URL-encoded normally)
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle arrays
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

    // Get the base URL string
    let finalUrl = url.toString();

    // Manually append select parameter with unencoded commas if present
    if (selectValue !== undefined && selectValue !== null) {
      const selectString = Array.isArray(selectValue)
        ? selectValue.join(",")
        : String(selectValue);
      const separator = finalUrl.includes("?") ? "&" : "?";
      finalUrl = `${finalUrl}${separator}select=${selectString}`;
    }

    logger.debug("client", "Built API URL", {
      endpoint,
      params,
      finalUrl,
    });
    return finalUrl;
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
        return new OpenAlexApiError({
          message:
            errorData.message ||
            errorData.error ||
            `HTTP ${response.status.toString()}`,
          statusCode: response.status,
          response,
        });
      } else {
        return new OpenAlexApiError({
          message: `HTTP ${response.status.toString()} ${response.statusText}`,
          statusCode: response.status,
          response,
        });
      }
    } catch {
      return new OpenAlexApiError({
        message: `HTTP ${response.status.toString()} ${response.statusText}`,
        statusCode: response.status,
        response,
      });
    }
  }

  /**
   * Make a request with retries and error handling
   */
  private logRealApiCall({
    url,
    options,
    retryCount,
  }: {
    url: string;
    options: RequestInit;
    retryCount: number;
  }): void {
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
          method: options.method ?? "GET",
          retryCount,
        },
      );
    }
  }

  private getMaxRetries(): { server: number; network: number } {
    return {
      server:
        this.config.retries !== 3
          ? this.config.retries
          : RETRY_CONFIG.server.maxAttempts,
      network:
        this.config.retries !== 3
          ? this.config.retries
          : RETRY_CONFIG.network.maxAttempts,
    };
  }

  private async checkHostCooldown(url: string): Promise<void> {
    try {
      const host = new URL(url).hostname;
      const cooldownUntil = hostCooldowns.get(host);
      if (cooldownUntil && Date.now() < cooldownUntil) {
        throw new OpenAlexRateLimitError({
          message: `Host ${host} is in cooldown until ${new Date(cooldownUntil).toISOString()}`,
          retryAfter: cooldownUntil - Date.now(),
        });
      }
    } catch {
      // If URL parsing fails or no cooldown, continue with normal flow
    }
  }

  private buildRequestOptions(options: RequestInit): RequestInit {
    return {
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
  }

  private async handleRateLimitResponse(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
  ): Promise<Response> {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterMs = retryAfter
      ? parseRetryAfterToMs(retryAfter)
      : undefined;

    const maxRateLimitAttempts = RETRY_CONFIG.rateLimited.maxAttempts;
    if (retryCount < maxRateLimitAttempts) {
      const waitTime = calculateRetryDelay(
        retryCount,
        RETRY_CONFIG.rateLimited,
        retryAfterMs,
      );
      await this.sleep(waitTime);
      return await this.makeRequest({
        url,
        options,
        retryCount: retryCount + 1,
      });
    }

    // Set host cooldown and throw error
    try {
      const host = new URL(url).hostname;
      if (retryAfterMs) {
        hostCooldowns.set(host, Date.now() + retryAfterMs);
      } else {
        hostCooldowns.set(host, Date.now() + 10000);
      }
    } catch {
      // ignore URL parsing failures
    }

    throw new OpenAlexRateLimitError({
      message: `Rate limit exceeded (HTTP 429) after ${maxRateLimitAttempts} attempts`,
      retryAfter: retryAfterMs,
    });
  }

  private async handleServerError(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
    maxServerRetries: number,
  ): Promise<Response> {
    if (response.status >= 500 && retryCount < maxServerRetries) {
      const waitTime =
        this.config.retries !== 3
          ? this.config.retryDelay * Math.pow(2, retryCount)
          : calculateRetryDelay(retryCount, RETRY_CONFIG.server);
      await this.sleep(waitTime);
      return await this.makeRequest({
        url,
        options,
        retryCount: retryCount + 1,
      });
    }
    throw await this.parseError(response);
  }

  private async handleResponseInterception({
    interceptedRequest,
    response,
    responseTime,
  }: {
    interceptedRequest: InterceptedRequest | null;
    response: Response;
    responseTime: number;
  }): Promise<void> {
    if (interceptedRequest && response.status >= 200 && response.status < 300) {
      try {
        const responseClone = response.clone();
        let responseData: unknown;

        try {
          responseData = await responseClone.json();
        } catch (jsonError) {
          logger.debug(
            "client",
            "Failed to parse response as JSON for interception",
            {
              error: jsonError,
              contentType: response.headers.get("content-type"),
              status: response.status,
            },
          );
          return;
        }

        const interceptedCall = apiInterceptor.interceptResponse(
          interceptedRequest,
          response,
          responseData,
          responseTime,
        );

        const diskCacheEnabled =
          globalThis.process?.env?.ACADEMIC_EXPLORER_DISK_CACHE_ENABLED !==
          "false";

        if (
          interceptedCall &&
          globalThis.process?.versions?.node &&
          diskCacheEnabled
        ) {
          try {
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
            logger.debug(
              "client",
              "Disk caching unavailable (browser environment)",
              { error: diskError },
            );
          }
        }
      } catch (interceptError: unknown) {
        logger.debug("client", "Response interception failed", {
          error: interceptError,
        });
      }
    }
  }

  private async makeRequest({
    url,
    options = {},
    retryCount = 0,
  }: {
    url: string;
    options?: RequestInit;
    retryCount?: number;
  }): Promise<Response> {
    this.logRealApiCall({ url, options, retryCount });
    const { server: maxServerRetries, network: maxNetworkRetries } =
      this.getMaxRetries();

    try {
      await this.checkHostCooldown(url);
      await this.enforceRateLimit();

      const requestStartTime = Date.now();
      const requestOptions = this.buildRequestOptions(options);
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

      if (response.status === 429) {
        return await this.handleRateLimitResponse(
          response,
          url,
          options,
          retryCount,
        );
      }

      if (!response.ok) {
        return await this.handleServerError(
          response,
          url,
          options,
          retryCount,
          maxServerRetries,
        );
      }

      await this.handleResponseInterception({
        interceptedRequest,
        response,
        responseTime,
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new OpenAlexApiError({
          message: `Request timeout after ${this.config.timeout.toString()}ms`,
        });
      }

      if (error instanceof OpenAlexApiError) {
        throw error;
      }

      if (retryCount < maxNetworkRetries) {
        const waitTime =
          this.config.retries !== 3
            ? this.config.retryDelay * Math.pow(2, retryCount)
            : calculateRetryDelay(retryCount, RETRY_CONFIG.network);
        await this.sleep(waitTime);
        return this.makeRequest({ url, options, retryCount: retryCount + 1 });
      }

      throw new OpenAlexApiError({
        message: `Network error after ${String(maxNetworkRetries)} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * GET request that returns parsed JSON with schema-based validation
   * Returns typed result when schema is provided, otherwise unknown
   */
  public async get<T = unknown>(
    endpoint: string,
    params: QueryParams = {},
    schema?: z.ZodType<T>,
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await this.makeRequest({ url });

    // Validate content-type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new OpenAlexApiError({
        message: `Expected JSON response but got ${contentType ?? "unknown content-type"}. Response: ${text.substring(0, 200)}...`,
        statusCode: response.status,
      });
    }

    const data: unknown = await response.json();
    const validatedData = validateApiResponse(data);

    // If schema is provided, use it for type-safe validation
    if (schema) {
      return validateWithSchema({ data: validatedData, schema });
    }

    // Return validated data - callers must handle typing
    return validatedData as T;
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
   * Supports both legacy signature (endpoint, id, params) and new signature ({ endpoint, id, params })
   */
  public async getById<T = unknown>(
    endpointOrParams: string | { endpoint: string; id: string; params?: QueryParams; schema?: z.ZodType<T> },
    id?: string,
    params?: QueryParams,
    schema?: z.ZodType<T>
  ): Promise<T> {
    // Handle legacy signature: getById(endpoint, id, params, schema)
    if (typeof endpointOrParams === 'string') {
      const endpoint = endpointOrParams;
      return this.get(`${endpoint}/${encodeURIComponent(id!)}`, params, schema);
    }
    
    // Handle new signature: getById({ endpoint, id, params, schema })
    const { endpoint, id: entityId, params: newParams = {}, schema: newSchema } = endpointOrParams;
    return this.get(`${endpoint}/${encodeURIComponent(entityId)}`, newParams, newSchema);
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
   * Get current client configuration (read-only)
   */
  public getConfig(): Readonly<Required<FullyConfiguredClient>> {
    return this.config;
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
