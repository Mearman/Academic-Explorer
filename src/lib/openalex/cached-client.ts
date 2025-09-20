/**
 * Unified Cached OpenAlex Client
 * Integrates synthetic cache, rate limiting, queuing, retries, and worker coordination
 * Provides complete OpenAlex API management with intelligent optimization
 */

import { logger, logError } from "@/lib/logger";
import { OpenAlexBaseClient, OpenAlexClientConfig, OpenAlexRateLimitError } from "./client";
import { OpenAlexClient } from "./openalex-client";
import { OpenAlexResponse, QueryParams } from "./types";
import { RATE_LIMIT_CONFIG, RETRY_CONFIG, calculateRetryDelay } from "@/config/rate-limit";
import { staticDataProvider } from "@/lib/api/static-data-provider";
import { toStaticEntityType, cleanOpenAlexId } from "@/lib/utils/static-data-utils";
import {
  SyntheticCacheLayer,
  createSyntheticCacheLayer,
  EntityType,
  OptimizedRequestPlan,
  StorageTier,
  QueryParams as SyntheticQueryParams
} from "../cache/synthetic";

// Worker coordination interfaces
export interface WorkerRequest {
  id: string;
  type: "api-call" | "batch-call" | "background-fetch";
  payload: {
    endpoint: string;
    params?: QueryParams;
    entityType?: EntityType;
    priority?: "high" | "normal" | "low";
  };
  timestamp: number;
  retryCount?: number;
}

export interface WorkerResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
  fromCache?: boolean;
  statistics?: {
    duration: number;
    retries: number;
    bandwidth: number;
  };
}

export interface CachedOpenAlexClientConfig extends OpenAlexClientConfig {
  cacheEnabled?: boolean;
  syntheticCache?: SyntheticCacheLayer;
  rateLimitEnabled?: boolean;
  maxConcurrentRequests?: number;
}

export class CachedOpenAlexClient extends OpenAlexBaseClient {
  private cache: SyntheticCacheLayer;
  private cacheEnabled: boolean;
  private rateLimitEnabled: boolean;
  private readonly maxConcurrentRequests: number;

  // OpenAlex API client for entity operations
  public readonly client: OpenAlexClient;

  // Rate limiting infrastructure
  private lastRequestTime = 0;
  private readonly minInterval: number;
  private readonly requestQueue: Array<() => void> = [];
  private isProcessingQueue = false;
  private activeRequests = 0;

  private requestMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    surgicalRequests: 0,
    bandwidthSaved: 0,
    queuedRequests: 0,
    retries: 0
  };

  constructor(config: CachedOpenAlexClientConfig = {}) {
    super({
      ...config,
      rateLimit: {
        requestsPerSecond: 8, // Conservative under 10 req/sec limit
        requestsPerDay: 95000, // Conservative under 100k req/day limit
        ...config.rateLimit,
      },
    });

    this.cacheEnabled = config.cacheEnabled !== false;
    this.rateLimitEnabled = config.rateLimitEnabled !== false;
    this.maxConcurrentRequests = config.maxConcurrentRequests || 5;

    this.cache = config.syntheticCache || createSyntheticCacheLayer();

    // Initialize the OpenAlex API client with the same configuration
    this.client = new OpenAlexClient(config);

    // Calculate minimum interval between requests (in ms)
    this.minInterval = 1000 / RATE_LIMIT_CONFIG.openAlex.limit; // 125ms for 8 req/sec

    logger.debug("cache", "CachedOpenAlexClient initialized", {
      cacheEnabled: this.cacheEnabled,
      rateLimitEnabled: this.rateLimitEnabled,
      maxConcurrentRequests: this.maxConcurrentRequests,
      minInterval: this.minInterval
    });
  }


  /**
   * Convert OpenAlex QueryParams to SyntheticQueryParams format
   */
  private convertQueryParams(params: QueryParams): SyntheticQueryParams {
    // Create a new object with all properties except filter
    const { filter, ...rest } = params;
    const converted: SyntheticQueryParams = {
      ...rest,
      filter: typeof filter === "string" ? this.parseFilterString(filter) : filter
    };

    return converted;
  }

  /**
   * Parse OpenAlex filter string into Record format
   * Converts "author.id:A123,publication_year:2023" to { "author.id": "A123", "publication_year": "2023" }
   */
  private parseFilterString(filter: string): Record<string, unknown> {
    return filter.split(",").reduce<Record<string, unknown>>((obj, pair) => {
      const [key, ...valueParts] = pair.split(":");
      if (key && valueParts.length > 0) {
        obj[key.trim()] = valueParts.join(":").trim();
      }
      return obj;
    }, {});
  }

  /**
   * Enhanced getResponse with synthetic caching and parameter conversion
   */
  async getResponse<T>(
    endpoint: string,
    params: QueryParams = {}
  ): Promise<OpenAlexResponse<T>> {
    // Convert OpenAlex params to synthetic cache format
    const convertedParams = this.convertQueryParams(params);
    this.requestMetrics.totalRequests++;

    if (!this.cacheEnabled) {
      return super.getResponse<T>(endpoint, params);
    }

    const entityType = this.extractEntityType(endpoint);
    if (!entityType) {
      // Non-entity endpoints bypass synthetic cache
      return super.getResponse<T>(endpoint, params);
    }

    try {
      // Step 1: Generate optimization plan
      const plan = await this.cache.optimizeRequest(entityType, convertedParams);

      logger.debug("cache", "Generated optimization plan", {
        entityType,
        canSynthesize: plan.canSynthesize,
        requiredApiCalls: plan.requiredApiCalls.length,
        estimatedSavings: plan.estimatedSavings
      });

      // Step 2: Execute surgical API requests if needed
      let apiResponse: OpenAlexResponse<T> | undefined;

      if (plan.requiredApiCalls.length > 0) {
        apiResponse = await this.executeSurgicalRequests<T>(plan, entityType, params);
        this.requestMetrics.surgicalRequests += plan.requiredApiCalls.length;
      } else {
        // Complete cache hit!
        this.requestMetrics.cacheHits++;
        logger.debug("cache", "Complete cache hit - no API requests needed", { entityType });
      }

      // Step 3: Synthesize response from cached + API data
      const synthesizedResponse = await this.cache.synthesizeResponse(
        plan,
        apiResponse,
        entityType
      );

      // Step 4: Update caches with any new API data
      if (apiResponse?.results) {
        await this.updateCachesWithResults(entityType, apiResponse.results, params);
      }

      // Update metrics
      this.requestMetrics.bandwidthSaved += plan.estimatedSavings.bandwidth;

      logger.debug("cache", "Cached request completed", {
        entityType,
        resultCount: synthesizedResponse.results.length,
        bandwidthSaved: plan.estimatedSavings.bandwidth,
        totalMetrics: this.requestMetrics
      });

      return synthesizedResponse;

    } catch (error) {
      logError("Synthetic cache request failed, falling back to direct API", error, "CachedOpenAlexClient", "cache");

      // Fallback to direct API request
      return super.getResponse<T>(endpoint, params);
    }
  }

  /**
   * Enhanced getById with field-level caching and parameter conversion
   */
  async getById<T>(
    endpoint: string,
    id: string,
    params: QueryParams = {}
  ): Promise<T> {
    // Convert OpenAlex params to synthetic cache format
    const convertedParams = this.convertQueryParams(params);
    this.requestMetrics.totalRequests++;

    if (!this.cacheEnabled) {
      return super.getById<T>(endpoint, id, params);
    }

    const entityType = this.extractEntityType(endpoint);
    if (!entityType) {
      return super.getById<T>(endpoint, id, params);
    }

    try {
      const requestedFields = convertedParams.select || [];

      // Check cache for entity fields
      const cachedData = await this.cache.getEntityFields<T>(entityType, id, requestedFields);

      if (Object.keys(cachedData).length === requestedFields.length) {
        // Complete cache hit
        this.requestMetrics.cacheHits++;
        logger.debug("cache", "Complete cache hit for single entity", {
          entityType,
          entityId: id,
          fields: requestedFields
        });
        return cachedData as T;
      }

      // Determine missing fields for surgical request
      const missingFields = requestedFields.filter(field => !(field in cachedData));

      let apiData: T;
      if (missingFields.length > 0) {
        // Make surgical request for missing fields only
        const surgicalParams = { ...params, select: missingFields };
        apiData = await this.withEnhancedRequestHandling(
          () => super.getById<T>(endpoint, id, surgicalParams),
          {
            entityType,
            endpoint,
            params: surgicalParams
          }
        );

        this.requestMetrics.surgicalRequests++;

        logger.debug("cache", "Made surgical request for missing fields", {
          entityType,
          entityId: id,
          missingFields,
          cachedFields: Object.keys(cachedData)
        });
      } else {
        // This shouldn't happen if cache check above was correct
        apiData = await this.withEnhancedRequestHandling(
          () => super.getById<T>(endpoint, id, params),
          {
            entityType,
            endpoint,
            params
          }
        );
      }

      // Store new data in cache
      await this.cache.putEntityFields(entityType, id, apiData as Partial<unknown>);

      // Combine cached and API data
      const combinedData = { ...cachedData, ...apiData };

      return combinedData;

    } catch (error) {
      logError("Cached getById failed, falling back to direct API", error, "CachedOpenAlexClient", "cache");
      return this.withEnhancedRequestHandling(
        () => super.getById<T>(endpoint, id, params),
        {
          entityType,
          endpoint,
          params
        }
      );
    }
  }

  /**
   * Stream with cache warming
   */
  async *stream<T>(
    endpoint: string,
    params: QueryParams = {},
    batchSize = 200
  ): AsyncGenerator<T[], void, unknown> {
    // For streaming, we still use direct API but warm the cache with results
    const entityType = this.extractEntityType(endpoint);

    for await (const batch of super.stream<T>(endpoint, params, batchSize)) {
      // Warm cache with streaming results
      if (this.cacheEnabled && entityType && batch.length > 0) {
        void this.updateCachesWithResults(entityType, batch, params);
      }

      yield batch;
    }
  }

  /**
   * Get cache performance metrics
   */
  getCacheMetrics(): {
    totalRequests: number;
    cacheHitRate: number;
    surgicalRequestCount: number;
    bandwidthSaved: number;
  } {
    return {
      ...this.requestMetrics,
      surgicalRequestCount: this.requestMetrics.surgicalRequests,
      cacheHitRate: this.requestMetrics.totalRequests > 0
        ? this.requestMetrics.cacheHits / this.requestMetrics.totalRequests
        : 0
    };
  }

  /**
   * Get detailed cache statistics
   */
  async getCacheStats(): Promise<unknown> {
    if (!this.cacheEnabled) {
      return { enabled: false };
    }

    const stats = await this.cache.getCacheStats();
    const metrics = this.getCacheMetrics();

    return {
      enabled: true,
      performance: metrics,
      storage: stats
    };
  }

  /**
   * Promote entity to hot tier (memory)
   */
  async promoteEntity(entityType: EntityType, entityId: string, fields?: string[]): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      const fieldsToPromote = fields || await this.getAvailableFields(entityType, entityId);
      await this.cache.promoteToHotTier(entityType, entityId, fieldsToPromote);

      logger.debug("cache", "Promoted entity to hot tier", {
        entityType,
        entityId,
        fieldCount: fieldsToPromote.length
      });
    } catch (error) {
      logError("Failed to promote entity", error, "CachedOpenAlexClient", "cache");
    }
  }

  /**
   * Invalidate cached entity data
   */
  async invalidateEntity(entityType: EntityType, entityId: string, tiers?: StorageTier[]): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      await this.cache.invalidateEntity(entityType, entityId, tiers);

      logger.debug("cache", "Invalidated entity cache", {
        entityType,
        entityId,
        tiers: tiers || "all"
      });
    } catch (error) {
      logError("Failed to invalidate entity", error, "CachedOpenAlexClient", "cache");
    }
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    if (!this.cacheEnabled) return;

    try {
      await this.cache.clear();

      // Reset metrics
      this.requestMetrics = {
        totalRequests: 0,
        cacheHits: 0,
        surgicalRequests: 0,
        bandwidthSaved: 0,
        queuedRequests: 0,
        retries: 0
      };

      logger.debug("cache", "Cleared all cache data and reset metrics");
    } catch (error) {
      logError("Failed to clear cache", error, "CachedOpenAlexClient", "cache");
    }
  }

  /**
   * Enable or disable caching
   */
  setCacheEnabled(enabled: boolean): void {
    this.cacheEnabled = enabled;
    logger.debug("cache", `Cache ${enabled ? "enabled" : "disabled"}`);
  }

  // Private helper methods

  private extractEntityType(endpoint: string): EntityType | null {
    const entityTypes: EntityType[] = ["works", "authors", "sources", "institutions", "topics", "publishers", "funders"];

    for (const type of entityTypes) {
      if (endpoint.includes(type)) {
        return type;
      }
    }

    return null;
  }

  private async executeSurgicalRequests<T>(
    plan: OptimizedRequestPlan,
    entityType: EntityType,
    originalParams: QueryParams
  ): Promise<OpenAlexResponse<T> | undefined> {
    if (plan.requiredApiCalls.length === 0) {
      return undefined;
    }

    // For simplicity, execute the first surgical request
    // In a more sophisticated implementation, we could batch or parallelize requests
    const firstRequest = plan.requiredApiCalls[0];

    switch (firstRequest.type) {
      case "single-entity":
        if (firstRequest.entityIds && firstRequest.entityIds.length === 1) {
          const entityId = firstRequest.entityIds[0];
          const data = await this.withEnhancedRequestHandling(
            () => super.getById<T>(entityType, entityId, {
              select: firstRequest.fields
            }),
            {
              entityType,
              endpoint: entityType
            }
          );

          return {
            results: [data],
            meta: {
              count: 1,
              db_response_time_ms: 0,
              page: 1,
              per_page: 1
            }
          };
        }
        break;

      case "batch-entities":
        if (firstRequest.entityIds) {
          const batchParams = {
            ...originalParams,
            filter: `id:${firstRequest.entityIds.join("|")}`,
            select: firstRequest.fields
          };
          return this.withEnhancedRequestHandling(
            () => super.getResponse<T>(entityType, batchParams),
            {
              entityType,
              endpoint: entityType,
              params: batchParams
            }
          );
        }
        break;

      case "full-collection":
        return this.withEnhancedRequestHandling(
          () => super.getResponse<T>(entityType, originalParams),
          {
            entityType,
            endpoint: entityType,
            params: originalParams
          }
        );
    }

    // Fallback to full request with enhanced handling
    return this.withEnhancedRequestHandling(
      () => super.getResponse<T>(entityType, originalParams),
      {
        entityType,
        endpoint: entityType,
        params: originalParams
      }
    );
  }

  private async updateCachesWithResults(
    entityType: EntityType,
    results: unknown[],
    params: QueryParams
  ): Promise<void> {
    try {
      // Update entity field accumulator
      for (const result of results) {
        const entityId = this.extractEntityId(result);
        if (entityId) {
          await this.cache.putEntityFields(entityType, entityId, result as Partial<unknown>);
        }
      }

      // Update collection mapper if this was a collection request
      if (this.isCollectionRequest(params)) {
        const convertedParams = this.convertQueryParams(params);
        const queryKey = this.cache.generateQueryKey(entityType, convertedParams);
        const page = params.page || 1;
        const entityIds = results
          .map(result => this.extractEntityId(result))
          .filter((id): id is string => id !== null);

        await this.cache.putCollectionPage(queryKey, page, entityIds);
      }

    } catch (error) {
      logError("Failed to update caches with results", error, "CachedOpenAlexClient", "cache");
    }
  }

  private hasId(entity: unknown): entity is { id: unknown } {
    return typeof entity === "object" && entity !== null && entity !== undefined && "id" in entity;
  }

  private extractEntityId(entity: unknown): string | null {
    if (this.hasId(entity)) {
      return String(entity.id);
    }
    return null;
  }

  private isCollectionRequest(params: QueryParams): boolean {
    return !!(params.filter || params.page || params.per_page);
  }

  private async getAvailableFields(entityType: EntityType, entityId: string): Promise<string[]> {
    try {
      const coverage = await this.cache.getFieldCoverage(entityType, entityId);
      return coverage.total;
    } catch {
      return [];
    }
  }


  // ==================== RATE LIMITING ====================

  /**
   * Queue-based rate limiting to handle concurrent requests properly
   */
  private async applyRateLimit(): Promise<void> {
    if (!this.rateLimitEnabled) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.requestQueue.push(resolve);
      this.requestMetrics.queuedRequests++;
      void this.processQueue();
    });
  }

  /**
   * Process the request queue with proper timing
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.rateLimitEnabled) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.minInterval) {
        const delay = this.minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      this.lastRequestTime = Date.now();
      this.activeRequests++;

      // Release the next request
      const resolve = this.requestQueue.shift();
      resolve?.();
    }

    this.isProcessingQueue = false;
  }

  /**
   * Enhanced request wrapper with rate limiting and retries
   */
  private async withEnhancedRequestHandling<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      entityType?: EntityType;
      endpoint?: string;
      params?: QueryParams;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? RETRY_CONFIG.rateLimited.maxAttempts;
    let lastError: unknown;

    // Main thread processing with rate limiting and retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Apply rate limiting before each attempt
        await this.applyRateLimit();

        const result = await operation();
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        return result;
      } catch (error) {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        lastError = error;

        // If this is not a retryable error or we've exhausted retries, throw
        if (!this.isRetryableError(error) || attempt === maxRetries) {
          break;
        }

        this.requestMetrics.retries++;

        // Calculate retry delay with exponential backoff for 429 errors
        if (this.hasStatusCode(error) && error.statusCode === 429) {
          const retryAfterMs = error instanceof OpenAlexRateLimitError ? error.retryAfter : undefined;
          const waitTime = calculateRetryDelay(attempt, RETRY_CONFIG.rateLimited, retryAfterMs);

          logger.debug("api", `Rate limited, waiting ${String(waitTime)}ms before retry (attempt ${String(attempt + 2)}/${String(maxRetries + 1)})`, {
            error: error instanceof Error ? error.message : "Unknown error",
            waitTime,
            retryAfter: retryAfterMs
          });

          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // Standard retry delay for other errors
          const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10s
          logger.debug("api", `Retrying operation (attempt ${String(attempt + 2)}/${String(maxRetries + 1)})`, {
            error: error instanceof Error ? error.message : "Unknown error",
            waitTime
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    // Retry 429 (rate limit), 502 (bad gateway), 503 (service unavailable), 504 (gateway timeout)
    if (this.hasStatusCode(error)) {
      return [429, 502, 503, 504].includes(error.statusCode);
    }

    // Retry network errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      return errorMessage.includes("network") ||
             errorMessage.includes("timeout") ||
             errorMessage.includes("connection");
    }

    return false;
  }

  /**
   * Type guard to check if an error has a status code
   */
  private hasStatusCode(error: unknown): error is { statusCode: number } {
    return typeof error === "object" &&
           error !== null &&
           "statusCode" in error &&
           typeof error.statusCode === "number";
  }

  /**
   * Enhanced API with static data fallback
   */
  private async getEntityWithFallback<T>(
    id: string,
    entityType: EntityType,
    params?: QueryParams,
    apiCall?: () => Promise<T>
  ): Promise<T> {
    // Try static data first for simple requests
    if (!params || Object.keys(params).length === 0) {
      const staticType = toStaticEntityType(entityType);
      if (staticType) {
        try {
          const staticEntity = await staticDataProvider.getEntity({
            entityType: staticType,
            entityId: cleanOpenAlexId(id)
          });
          if (staticEntity && typeof staticEntity === "object" && "id" in staticEntity) {
            logger.debug("static-data", "Served entity from static data", { id, entityType });
            return staticEntity as T;
          }
        } catch {
          logger.debug("static-data", "Static data not available, falling back to API", { id, entityType });
        }
      }
    }

    // Fallback to API with enhanced request handling
    if (apiCall) {
      return this.withEnhancedRequestHandling(apiCall, {
        entityType,
        endpoint: entityType,
        params
      });
    }

    throw new Error("No API call provided for fallback");
  }

  // ==================== ENHANCED METRICS ====================

  /**
   * Get comprehensive performance metrics
   */
  getEnhancedMetrics(): {
    totalRequests: number;
    cacheHitRate: number;
    surgicalRequestCount: number;
    bandwidthSaved: number;
    queuedRequests: number;
    retries: number;
    averageQueueTime: number;
    activeRequests: number;
    rateLimitEnabled: boolean;
  } {
    return {
      ...this.requestMetrics,
      surgicalRequestCount: this.requestMetrics.surgicalRequests,
      cacheHitRate: this.requestMetrics.totalRequests > 0
        ? this.requestMetrics.cacheHits / this.requestMetrics.totalRequests
        : 0,
      averageQueueTime: this.minInterval,
      activeRequests: this.activeRequests,
      rateLimitEnabled: this.rateLimitEnabled
    };
  }

  /**
   * Get rate limiter statistics
   */
  getRateLimiterStats(): {
    limit: number;
    window: number;
    windowType: string;
    queueLength: number;
    activeRequests: number;
    minInterval: number;
  } {
    return {
      limit: RATE_LIMIT_CONFIG.openAlex.limit,
      window: RATE_LIMIT_CONFIG.openAlex.window,
      windowType: RATE_LIMIT_CONFIG.openAlex.windowType,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      minInterval: this.minInterval
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear request queue
    this.requestQueue.length = 0;

    logger.debug("cache", "CachedOpenAlexClient destroyed");
  }
}

/**
 * Create default cached client instance with full feature set enabled
 */
export const cachedOpenAlex = new CachedOpenAlexClient({
  cacheEnabled: true,
  rateLimitEnabled: true,
  maxConcurrentRequests: 5,
  userEmail: typeof import.meta.env !== "undefined" &&
            import.meta.env.VITE_OPENALEX_EMAIL &&
            typeof import.meta.env.VITE_OPENALEX_EMAIL === "string" &&
            import.meta.env.VITE_OPENALEX_EMAIL.trim().length > 0
    ? import.meta.env.VITE_OPENALEX_EMAIL
    : undefined,
});

/**
 * Enhanced client factory for custom configurations
 */
export function createUnifiedOpenAlexClient(config: CachedOpenAlexClientConfig = {}): CachedOpenAlexClient {
  return new CachedOpenAlexClient({
    cacheEnabled: true,
    rateLimitEnabled: true,
    maxConcurrentRequests: 5,
    ...config
  });
}

/**
 * Update the email configuration for the global OpenAlex client
 */
export function updateOpenAlexEmail(email: string | undefined): void {
  cachedOpenAlex.updateConfig({
    userEmail: email && email.trim().length > 0 ? email.trim() : undefined,
  });
}