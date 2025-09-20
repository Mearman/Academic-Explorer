/**
 * Cached OpenAlex Client
 * Integrates the synthetic cache system with OpenAlex API requests
 * Provides surgical optimization and response synthesis
 */

import { logger, logError } from "@/lib/logger";
import { OpenAlexBaseClient, OpenAlexClientConfig } from "./client";
import { OpenAlexResponse, QueryParams } from "./types";
import {
  SyntheticCacheLayer,
  createSyntheticCacheLayer,
  EntityType,
  OptimizedRequestPlan,
  StorageTier,
  QueryParams as SyntheticQueryParams
} from "../cache/synthetic";

export interface CachedOpenAlexClientConfig extends OpenAlexClientConfig {
  cacheEnabled?: boolean;
  syntheticCache?: SyntheticCacheLayer;
}

export class CachedOpenAlexClient extends OpenAlexBaseClient {
  private cache: SyntheticCacheLayer;
  private cacheEnabled: boolean;
  private requestMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    surgicalRequests: 0,
    bandwidthSaved: 0
  };

  constructor(config: CachedOpenAlexClientConfig = {}) {
    super(config);
    this.cacheEnabled = config.cacheEnabled !== false; // Default to enabled
    this.cache = config.syntheticCache || createSyntheticCacheLayer();
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
        return cachedData;
      }

      // Determine missing fields for surgical request
      const missingFields = requestedFields.filter(field => !(field in cachedData));

      let apiData: T;
      if (missingFields.length > 0) {
        // Make surgical request for missing fields only
        const surgicalParams = { ...params, select: missingFields };
        apiData = await super.getById<T>(endpoint, id, surgicalParams);

        this.requestMetrics.surgicalRequests++;

        logger.debug("cache", "Made surgical request for missing fields", {
          entityType,
          entityId: id,
          missingFields,
          cachedFields: Object.keys(cachedData)
        });
      } else {
        // This shouldn't happen if cache check above was correct
        apiData = await super.getById<T>(endpoint, id, params);
      }

      // Store new data in cache
      await this.cache.putEntityFields<T>(entityType, id, apiData);

      // Combine cached and API data
      const combinedData = { ...cachedData, ...apiData };

      return combinedData;

    } catch (error) {
      logError("Cached getById failed, falling back to direct API", error, "CachedOpenAlexClient", "cache");
      return super.getById<T>(endpoint, id, params);
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
        bandwidthSaved: 0
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
          const data = await super.getById<T>(entityType, entityId, {
            select: firstRequest.fields
          });

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
          return super.getResponse<T>(entityType, batchParams);
        }
        break;

      case "full-collection":
        return super.getResponse<T>(entityType, originalParams);
    }

    // Fallback to full request
    return super.getResponse<T>(entityType, originalParams);
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
          await this.cache.putEntityFields(entityType, entityId, result);
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
}

// Create default cached client instance
export const cachedOpenAlex = new CachedOpenAlexClient();