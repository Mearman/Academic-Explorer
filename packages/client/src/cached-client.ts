/**
 * Cached Client - Integrated static data caching with multi-tier fallback
 */

import { logger } from "@academic-explorer/utils";
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
} from "./internal/static-data-provider";
import {
    cleanOpenAlexId,
    toStaticEntityType,
} from "./internal/static-data-utils";
import type { OpenAlexEntity } from "./types";
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
      // TODO: Configure GitHub Pages URL in static data provider
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
      getEntity: this.getEntityWithStaticCache.bind(this) as (
        id: string,
      ) => Promise<OpenAlexEntity | null>,
    };
  }

  /**
   * Enhanced entity getter with static cache integration
   */
  private async getEntityWithStaticCache(
    id: string,
  ): Promise<OpenAlexEntity | null> {
    const cleanId = cleanOpenAlexId(id);
    this.requestStats.totalRequests++;

    try {
      if (this.staticCacheEnabled) {
        // Detect entity type from ID
        const entityType = this.detectEntityTypeFromId(cleanId);

        if (entityType) {
          try {
            const staticEntityType = toStaticEntityType(entityType);
            const staticResult = await staticDataProvider.getStaticData(
              staticEntityType,
              cleanId,
            );

            if (staticResult.found && staticResult.data) {
              this.requestStats.cacheHits++;
              logger.debug("client", "Static cache hit for entity", {
                id: cleanId,
                entityType,
                tier: staticResult.tier,
                loadTime: staticResult.loadTime,
              });
              return staticResult.data as OpenAlexEntity;
            }
          } catch (staticError: unknown) {
            // Handle static cache errors gracefully - return null without API fallback
            logger.debug("client", "Static cache error, handling gracefully", {
              id: cleanId,
              error: staticError,
            });
            return null;
          }
        }
      }

      // Fallback to API
      this.requestStats.apiFallbacks++;
      logger.debug("client", "Falling back to API for entity", { id: cleanId });

      // Try to get from API using appropriate endpoint
      const entityType = this.detectEntityTypeFromId(cleanId);
      if (entityType) {
        try {
          const result = await this.getById<OpenAlexEntity>(
            `${entityType}`,
            cleanId,
          );

          // Cache the result for future use if static cache is enabled
          if (this.staticCacheEnabled && result) {
            await this.cacheEntityResult(entityType, cleanId, result);
          }

          return result;
        } catch (apiError: unknown) {
          // If the API call failed due to rate limiting or network/server issues, try static cache as a graceful fallback
          logger.warn(
            "client",
            "API request failed for entity - attempting static cache fallback",
            { id: cleanId, error: apiError },
          );
          this.requestStats.errors++;

          if (this.staticCacheEnabled) {
            try {
              const staticEntityType = toStaticEntityType(entityType);
              const staticResult = await staticDataProvider.getStaticData(
                staticEntityType,
                cleanId,
              );
              if (staticResult.found && staticResult.data) {
                this.requestStats.cacheHits++;
                logger.debug(
                  "client",
                  "Static cache fallback successful after API error",
                  { id: cleanId, tier: staticResult.tier },
                );
                return staticResult.data as OpenAlexEntity;
              }
            } catch (staticError: unknown) {
              logger.debug("client", "Static cache fallback failed", {
                id: cleanId,
                error: staticError,
              });
            }
          }

          return null;
        }
      }

      logger.warn("client", "Could not determine entity type for ID", {
        id: cleanId,
      });
      return null;
    } catch (error: unknown) {
      this.requestStats.errors++;
      logger.error("client", "Failed to get entity", { id: cleanId, error });
      return null;
    }
  }

  /**
   * Cache entity result in static data provider
   */
  private async cacheEntityResult(
    entityType: string,
    id: string,
    _data: OpenAlexEntity,
  ): Promise<void> {
    try {
      // Note: This would require extending the static data provider with a set method for caching API results
      // For now, we log the intent
      logger.debug("client", "Would cache entity result", { entityType, id });
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
   * Enhanced getById with static cache integration
   */
  async getById<T>(endpoint: string, id: string, params = {}): Promise<T> {
    const cleanId = cleanOpenAlexId(id);

    if (this.staticCacheEnabled && !params) {
      // Try static cache first for simple getById requests without parameters
      try {
        const entityType = this.detectEntityTypeFromId(cleanId);
        if (entityType === endpoint.replace(/s$/, "") + "s") {
          const staticEntityType = toStaticEntityType(entityType);
          const staticResult = await staticDataProvider.getStaticData(
            staticEntityType,
            cleanId,
          );

          if (staticResult.found && staticResult.data) {
            logger.debug("client", "Static cache hit for getById", {
              endpoint,
              id: cleanId,
              tier: staticResult.tier,
            });
            return staticResult.data as T;
          }
        }
      } catch (error: unknown) {
        logger.debug("client", "Static cache lookup failed for getById", {
          endpoint,
          id: cleanId,
          error,
        });
      }
    }

    // Fallback to parent implementation, but catch API errors and try static cache before giving up
    try {
      return await super.getById<T>(endpoint, cleanId, params);
    } catch (apiError: unknown) {
      logger.warn(
        "client",
        "API getById failed, attempting static cache fallback",
        { endpoint, id: cleanId, error: apiError },
      );

      // If static cache is enabled, attempt to return cached data
      if (this.staticCacheEnabled) {
        try {
          const entityType = this.detectEntityTypeFromId(cleanId);
          if (entityType) {
            const staticEntityType = toStaticEntityType(entityType);
            const staticResult = await staticDataProvider.getStaticData(
              staticEntityType,
              cleanId,
            );
            if (staticResult.found && staticResult.data) {
              this.requestStats.cacheHits++;
              logger.debug(
                "client",
                "Static cache hit during getById fallback",
                { endpoint, id: cleanId, tier: staticResult.tier },
              );
              return staticResult.data as T;
            }
          }
        } catch (staticError: unknown) {
          logger.debug(
            "client",
            "Static cache fallback failed during getById",
            { endpoint, id: cleanId, error: staticError },
          );
        }
      }

      // Re-throw the original API error if nothing else works
      throw apiError;
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
      logger.debug("client", "Static cache configuration updated", {
        url: config.staticCacheGitHubPagesUrl,
      });
    }
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
export function updateOpenAlexEmail(email: string) {
  cachedOpenAlex.updateConfig({ userEmail: email });
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
