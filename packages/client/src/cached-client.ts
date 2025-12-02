/**
 * Cached Client - Integrated static data caching with multi-tier fallback
 */

import type { QueryParams , OpenAlexEntity, OpenAlexResponse } from "@bibgraph/types";
import { isOpenAlexEntity } from "@bibgraph/types/entities";
import { logger } from "@bibgraph/utils";
import { z } from "zod";

import { OpenAlexBaseClient, type OpenAlexClientConfig } from "./client";
import { AuthorsApi } from "./entities/authors";
import { ConceptsApi } from "./entities/concepts";
import { FundersApi } from "./entities/funders";
import { InstitutionsApi } from "./entities/institutions";
import { KeywordsApi } from "./entities/keywords";
import { PublishersApi } from "./entities/publishers";
import { SourcesApi } from "./entities/sources";
import { TextAnalysisApi } from "./entities/text-analysis";
import { TopicsApi } from "./entities/topics";
import { WorksApi } from "./entities/works";
import {
  staticDataProvider,
  type CacheStatistics,
  type EnvironmentInfo,
  type CachedEntityEntry,
} from "./internal/static-data-provider";
import {
  cleanOpenAlexId,
  toStaticEntityType,
} from "./internal/static-data-utils";
import { validateStaticData } from "./internal/type-helpers";
import { AutocompleteApi } from "./utils/autocomplete";

export interface ClientApis {
  works: WorksApi;
  authors: AuthorsApi;
  sources: SourcesApi;
  institutions: InstitutionsApi;
  topics: TopicsApi;
  publishers: PublishersApi;
  funders: FundersApi;
  keywords: KeywordsApi;
  textAnalysis: TextAnalysisApi;
  concepts: ConceptsApi;
  autocomplete: AutocompleteApi;
  getEntity: (id: string) => Promise<OpenAlexEntity | null>;
}

export interface CachedClientConfig extends OpenAlexClientConfig {
  staticCacheEnabled?: boolean;
  staticCacheGitHubPagesUrl?: string;
  staticCacheLocalDir?: string;
}

export class CachedOpenAlexClient extends OpenAlexBaseClient {
  // Add client property that services expect
  client: ClientApis;
  private staticCacheEnabled: boolean;
  private requestStats = {
    totalRequests: 0,
    cacheHits: 0,
    apiFallbacks: 0,
    errors: 0,
  };

  constructor(config: CachedClientConfig = {}) {
    super(config);
    this.staticCacheEnabled = config.staticCacheEnabled ?? true;

    // Configure static cache URLs if provided
    if (config.staticCacheGitHubPagesUrl) {
      staticDataProvider.configure({
        gitHubPagesBaseUrl: config.staticCacheGitHubPagesUrl,
      });
      logger.debug("client", "Static cache GitHub Pages URL configured", {
        url: config.staticCacheGitHubPagesUrl,
      });
    }

    // Create API instances with enhanced caching
    this.client = {
      works: new WorksApi(this),
      authors: new AuthorsApi(this),
      sources: new SourcesApi(this),
      institutions: new InstitutionsApi(this),
      topics: new TopicsApi(this),
      publishers: new PublishersApi(this),
      funders: new FundersApi(this),
      keywords: new KeywordsApi(this),
      textAnalysis: new TextAnalysisApi(this),
      concepts: new ConceptsApi(this),
      autocomplete: new AutocompleteApi(this),
      getEntity: this.getEntityWithStaticCache.bind(this),
    };
  }

  /**
   * Enhanced entity getter with static cache integration
   */
  private async tryStaticCache({
    cleanId,
    entityType,
  }: {
    cleanId: string;
    entityType: string;
  }): Promise<OpenAlexEntity | null> {
    try {
      const staticEntityType = toStaticEntityType(entityType);
      const staticResult = await staticDataProvider.getStaticData(
        staticEntityType,
        cleanId,
      );

      if (
        staticResult.found &&
        staticResult.data &&
        isOpenAlexEntity(staticResult.data)
      ) {
        this.requestStats.cacheHits++;
        logger.debug("client", "Static cache hit for entity", {
          id: cleanId,
          entityType,
          tier: staticResult.tier,
          loadTime: staticResult.loadTime,
        });
        return staticResult.data;
      }
    } catch (staticError: unknown) {
      logger.debug("client", "Static cache error, handling gracefully", {
        id: cleanId,
        error: staticError,
      });
    }
    return null;
  }

  private async tryApiFallback({
    cleanId,
    entityType,
  }: {
    cleanId: string;
    entityType: string;
  }): Promise<unknown> {
    try {
      const result = await this.getById({
        endpoint: `${entityType}`,
        id: cleanId,
      });

      if (this.staticCacheEnabled && result && isOpenAlexEntity(result)) {
        await this.cacheEntityResult({
          entityType,
          id: cleanId,
          data: result,
        });
      }

      return result;
    } catch (apiError: unknown) {
      logger.warn(
        "client",
        "API request failed for entity - attempting static cache fallback",
        { id: cleanId, error: apiError },
      );
      this.requestStats.errors++;

      // Try static cache as last resort
      const staticResult = await this.tryStaticCache({ cleanId, entityType });
      if (staticResult) {
        return staticResult;
      }

      // If both API and static cache failed, throw the original error
      throw apiError;
    }
  }

  private async getEntityWithStaticCache(
    id: string,
  ): Promise<OpenAlexEntity | null> {
    const cleanId = cleanOpenAlexId(id);
    this.requestStats.totalRequests++;

    const entityType = this.detectEntityTypeFromId(cleanId);

    if (!entityType) {
      logger.warn("client", "Could not determine entity type for ID", {
        id: cleanId,
      });
      return null;
    }

    // Try static cache first if enabled
    if (this.staticCacheEnabled) {
      const staticResult = await this.tryStaticCache({ cleanId, entityType });
      if (staticResult) {
        return staticResult;
      }
    }

    // Fallback to API - let errors propagate
    this.requestStats.apiFallbacks++;
    logger.debug("client", "Falling back to API for entity", { id: cleanId });

    const apiResult = await this.tryApiFallback({
      cleanId,
      entityType,
    });
    return isOpenAlexEntity(apiResult) ? apiResult : null;
  }

  /**
   * Cache entity result in static data provider
   */
  private async cacheEntityResult({
    entityType,
    id,
    data,
  }: {
    entityType: string;
    id: string;
    data: OpenAlexEntity;
  }): Promise<void> {
    try {
      const staticEntityType = toStaticEntityType(entityType);
      await staticDataProvider.setStaticData(staticEntityType, id, data);
      logger.debug("client", "Cached entity result", { entityType, id });
    } catch (error: unknown) {
      logger.debug("client", "Failed to cache entity result", {
        entityType,
        id,
        error,
      });
    }
  }

  /**
   * Detect OpenAlex entity type from ID prefix
   */
  private detectEntityTypeFromId(id: string): string | null {
    if (!id) return null;
    if (id.startsWith("W")) return "works";
    if (id.startsWith("A")) return "authors";
    if (id.startsWith("S")) return "sources";
    if (id.startsWith("I")) return "institutions";
    if (id.startsWith("T")) return "topics";
    if (id.startsWith("P")) return "publishers";
    if (id.startsWith("F")) return "funders";
    return null;
  }

  /**
   * Try to get data from static cache for getById requests
   */
  private async tryStaticCacheForGetById<T>(
    endpoint: string,
    cleanId: string,
    isFallback: boolean = false,
  ): Promise<T | null> {
    if (!this.staticCacheEnabled) return null;

    try {
      const entityType = this.detectEntityTypeFromId(cleanId);
      if (!entityType) return null;

      const expectedEndpoint = entityType;
      if (
        !isFallback &&
        expectedEndpoint !== endpoint.replace(/s$/, "") + "s"
      ) {
        return null;
      }

      const staticEntityType = toStaticEntityType(entityType);
      const staticResult = await staticDataProvider.getStaticData(
        staticEntityType,
        cleanId,
      );

      if (staticResult.found && staticResult.data) {
        if (isFallback) {
          this.requestStats.cacheHits++;
        }
        logger.debug(
          "client",
          `Static cache ${isFallback ? "fallback" : "hit"} for getById`,
          {
            endpoint,
            id: cleanId,
            tier: staticResult.tier,
          },
        );
        return isFallback
          ? (staticResult.data as T)
          : (validateStaticData(staticResult.data) as T);
      }
    } catch (error: unknown) {
      logger.debug(
        "client",
        `Static cache ${isFallback ? "fallback" : "lookup"} failed for getById`,
        {
          endpoint,
          id: cleanId,
          error,
        },
      );
    }

    return null;
  }

  /**
   * Enhanced getById with static cache integration
   */
  async getById<T = unknown>(
    endpointOrParams: string | { endpoint: string; id: string; params?: QueryParams; schema?: z.ZodType<T> },
    id?: string,
    params?: QueryParams,
    schema?: z.ZodType<T>
  ): Promise<T> {
    // Handle legacy signature: getById(endpoint, id, params, schema)
    if (typeof endpointOrParams === 'string') {
      const endpoint = endpointOrParams;
      if (!id) {
        throw new Error('ID is required for legacy getById signature');
      }
      const cleanId = cleanOpenAlexId(id);

      // Try static cache first for simple requests without parameters
      if (!params) {
        const staticResult = await this.tryStaticCacheForGetById<T>(
          endpoint,
          cleanId,
        );
        if (staticResult !== null) {
          return staticResult;
        }
      }

      // Fallback to parent implementation
      try {
        return await super.getById(endpoint, cleanId, params, schema);
      } catch (apiError: unknown) {
        logger.warn(
          "client",
          "API getById failed, attempting static cache fallback",
          { endpoint, id: cleanId, error: apiError },
        );

        // Try static cache as fallback
        const fallbackResult = await this.tryStaticCacheForGetById<T>(
          endpoint,
          cleanId,
          true,
        );
        if (fallbackResult !== null) {
          return fallbackResult;
        }

        // Re-throw the original API error if nothing else works
        throw apiError;
      }
    }

    // Handle new signature: getById({ endpoint, id, params, schema })
    const { endpoint, id: entityId, params: newParams = {}, schema: newSchema } = endpointOrParams;
    const cleanId = cleanOpenAlexId(entityId);

    // Try static cache first for simple requests without parameters
    if (!newParams || Object.keys(newParams).length === 0) {
      const staticResult = await this.tryStaticCacheForGetById<T>(
        endpoint,
        cleanId,
      );
      if (staticResult !== null) {
        return staticResult;
      }
    }

    // Fallback to parent implementation
    try {
      return await super.getById({ endpoint, id: cleanId, params: newParams, schema: newSchema });
    } catch (apiError: unknown) {
      logger.warn(
        "client",
        "API getById failed, attempting static cache fallback",
        { endpoint, id: cleanId, error: apiError },
      );

      // Try static cache as fallback
      const fallbackResult = await this.tryStaticCacheForGetById<T>(
        endpoint,
        cleanId,
        true,
      );
      if (fallbackResult !== null) {
        return fallbackResult;
      }

      // Re-throw the original API error if nothing else works
      throw apiError;
    }
  }

  /**
   * Enhanced getResponse that caches individual entities from list results
   * This ensures entities fetched via list/search endpoints are available in the cache
   */
  public async getResponse<T>(
    endpoint: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<T>> {
    // Call parent implementation to get the response
    const response = await super.getResponse<T>(endpoint, params);

    // Cache individual entities from results if static cache is enabled
    if (this.staticCacheEnabled && response.results && Array.isArray(response.results)) {
      // Determine entity type from endpoint (e.g., "works", "authors")
      // Handle endpoints like "works", "authors/A123/works", etc.
      const endpointEntityType = this.detectEntityTypeFromEndpoint(endpoint);

      if (endpointEntityType) {
        // Cache each entity in the background (don't await to avoid blocking)
        void this.cacheEntitiesFromResults(response.results, endpointEntityType);
      }
    }

    return response;
  }

  /**
   * Detect entity type from endpoint path
   * Handles both direct endpoints ("works") and nested endpoints ("authors/A123/works")
   */
  private detectEntityTypeFromEndpoint(endpoint: string): string | null {
    // Get the last segment of the endpoint path
    const segments = endpoint.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    // For simple endpoints like "works", "authors"
    const lastSegment = segments[segments.length - 1];

    // Valid entity types
    const validTypes = ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts', 'keywords'];

    if (validTypes.includes(lastSegment)) {
      return lastSegment;
    }

    // For direct endpoints, check the first segment
    if (validTypes.includes(segments[0])) {
      return segments[0];
    }

    return null;
  }

  /**
   * Cache multiple entities from list results
   * Runs in background to avoid blocking the response
   */
  private async cacheEntitiesFromResults(
    results: unknown[],
    entityType: string,
  ): Promise<void> {
    let cachedCount = 0;

    for (const result of results) {
      // Check if result is an OpenAlex entity with an id
      if (isOpenAlexEntity(result)) {
        const id = result.id;
        if (typeof id === 'string') {
          const cleanId = cleanOpenAlexId(id);
          try {
            await this.cacheEntityResult({
              entityType,
              id: cleanId,
              data: result,
            });
            cachedCount++;
          } catch {
            // Silently ignore individual cache failures
          }
        }
      }
    }

    if (cachedCount > 0) {
      logger.debug("client", "Cached entities from list response", {
        entityType,
        count: cachedCount,
        total: results.length,
      });
    }
  }

  /**
   * Get static cache statistics
   */
  async getStaticCacheStats(): Promise<CacheStatistics> {
    return staticDataProvider.getCacheStatistics();
  }

  /**
   * Get client request statistics
   */
  getRequestStats(): typeof this.requestStats {
    return { ...this.requestStats };
  }

  /**
   * Check if entity exists in static cache
   */
  async hasStaticEntity(id: string): Promise<boolean> {
    if (!this.staticCacheEnabled) return false;

    try {
      const cleanId = cleanOpenAlexId(id);
      const entityType = this.detectEntityTypeFromId(cleanId);

      if (entityType) {
        const staticEntityType = toStaticEntityType(entityType);
        return staticDataProvider.hasStaticData(staticEntityType, cleanId);
      }
    } catch (error: unknown) {
      logger.debug("client", "Failed to check static entity existence", {
        id,
        error,
      });
    }

    return false;
  }

  /**
   * Clear static cache
   */
  async clearStaticCache(): Promise<void> {
    await staticDataProvider.clearCache();
    logger.debug("client", "Static cache cleared");
  }

  /**
   * Get static cache environment info
   */
  getStaticCacheEnvironment(): EnvironmentInfo {
    return staticDataProvider.getEnvironmentInfo();
  }

  /**
   * Get the current static cache enabled state
   */
  getStaticCacheEnabled(): boolean {
    return this.staticCacheEnabled;
  }

  /**
   * Enable or disable static caching
   */
  setStaticCacheEnabled(enabled: boolean): void {
    this.staticCacheEnabled = enabled;
    logger.debug("client", "Static cache enabled state changed", { enabled });
  }

  updateConfig(config: Partial<CachedClientConfig>): void {
    super.updateConfig(config);

    if (config.staticCacheEnabled !== undefined) {
      this.setStaticCacheEnabled(config.staticCacheEnabled);
    }

    if (config.staticCacheGitHubPagesUrl) {
      staticDataProvider.configure({
        gitHubPagesBaseUrl: config.staticCacheGitHubPagesUrl,
      });
      logger.debug("client", "Static cache configuration updated", {
        url: config.staticCacheGitHubPagesUrl,
      });
    }
  }

  /**
   * Enumerate entities in the memory cache
   * Memory cache is session-only and cleared on page refresh
   */
  enumerateMemoryCacheEntities(): CachedEntityEntry[] {
    return staticDataProvider.enumerateMemoryCacheEntities();
  }

  /**
   * Enumerate entities in the IndexedDB cache
   * IndexedDB cache is persistent across sessions
   */
  async enumerateIndexedDBEntities(): Promise<CachedEntityEntry[]> {
    return staticDataProvider.enumerateIndexedDBEntities();
  }

  /**
   * Get a summary of all cache tiers with entity counts
   */
  async getCacheTierSummary(): Promise<{
    memory: { count: number; entities: CachedEntityEntry[] };
    indexedDB: { count: number; entities: CachedEntityEntry[] };
  }> {
    return staticDataProvider.getCacheTierSummary();
  }

  /**
   * Get memory cache size (number of entities)
   */
  getMemoryCacheSize(): number {
    return staticDataProvider.getMemoryCacheSize();
  }

  /**
   * Get static cache tier configuration for display
   * Includes GitHub Pages URL and local static path info
   */
  getStaticCacheTierConfig(): {
    gitHubPages: {
      url: string;
      isConfigured: boolean;
      isProduction: boolean;
      isLocalhost: boolean;
    };
    localStatic: {
      path: string;
      isAvailable: boolean;
    };
  } {
    return staticDataProvider.getStaticCacheTierConfig();
  }

  /**
   * Enumerate entities available in the static cache (GitHub Pages or local)
   * Fetches index files to discover available pre-cached entities
   */
  async enumerateStaticCacheEntities(): Promise<CachedEntityEntry[]> {
    return staticDataProvider.enumerateStaticCacheEntities();
  }
}

/**
 * Default cached client instance with static caching enabled
 */
export const cachedOpenAlex: CachedOpenAlexClient = new CachedOpenAlexClient({
  staticCacheEnabled: true,
});

/**
 * Create a new cached client with custom configuration
 */
export function createCachedOpenAlexClient(
  config: CachedClientConfig = {},
): CachedOpenAlexClient {
  return new CachedOpenAlexClient(config);
}

/**
 * Update the email configuration for the global OpenAlex client
 */
export function updateOpenAlexEmail(email: string | undefined) {
  cachedOpenAlex.updateConfig({ userEmail: email });
}

/**
 * Update the API key configuration for the global OpenAlex client
 */
export function updateOpenAlexApiKey(apiKey: string | undefined) {
  cachedOpenAlex.updateConfig({ apiKey });
}

/**
 * Get comprehensive cache performance metrics
 */
export async function getCachePerformanceMetrics(): Promise<{
  staticCache: CacheStatistics;
  requestStats: {
    totalRequests: number;
    cacheHits: number;
    apiFallbacks: number;
    errors: number;
    cacheHitRate: number;
  };
  environment: EnvironmentInfo;
}> {
  const staticCache = await cachedOpenAlex.getStaticCacheStats();
  const requestStats = cachedOpenAlex.getRequestStats();
  const environment = cachedOpenAlex.getStaticCacheEnvironment();

  return {
    staticCache,
    requestStats: {
      ...requestStats,
      cacheHitRate:
        requestStats.totalRequests > 0
          ? requestStats.cacheHits / requestStats.totalRequests
          : 0,
    },
    environment,
  };
}

// Note: staticDataProvider can be imported via @bibgraph/client/internal/static-data-provider
