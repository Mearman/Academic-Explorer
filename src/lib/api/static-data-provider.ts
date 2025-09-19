import { logger } from "@/lib/logger";
// generateQueryHash removed - using URL encoding instead
import { jsonSchemaResolver, type ResolvedEntityIndex } from "@/lib/utils/json-schema-resolver";

/**
 * Configuration for static data provider
 */
export const STATIC_DATA_CONFIG = {
  enabled: true, // Always enabled in production builds
  basePath: "/data/openalex/",
  cacheTtl: 86400000, // 24 hours in milliseconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
} as const;

/**
 * Supported entity types for static data
 */
export type StaticEntityType = "authors" | "works" | "institutions" | "topics" | "publishers" | "funders";

/**
 * Query result with metadata
 */
export interface QueryResult {
  results: unknown[];
  meta: {
    count: number;
    page?: number;
    per_page?: number;
    originalUrl: string;
    cached: boolean;
  };
}

/**
 * Static data provider for serving preloaded OpenAlex entities
 * Now supports JSON Schema $ref resolution and allOf composition
 */
export class StaticDataProvider {
  private indexCache = new Map<StaticEntityType, ResolvedEntityIndex>();
  private entityCache = new Map<string, unknown>();
  private queryCache = new Map<string, unknown>();
  private availableEntityTypes: string[] = [];
  private readonly logger = logger;
  private readonly resolver = jsonSchemaResolver;

  /**
   * Get the index for a specific entity type
   */
  async getIndex(entityType: StaticEntityType): Promise<ResolvedEntityIndex | null> {
    try {
      // Check cache first
      const cached = this.indexCache.get(entityType);
      if (cached) {
        return cached;
      }

      // Use JSON Schema resolver to get entity index
      const index = await this.resolver.resolveEntityIndex(entityType);
      if (!index) {
        this.logger.debug("static-data", `No static data available for ${entityType}`);
        return null;
      }

      // Cache the resolved index
      this.indexCache.set(entityType, index);

      this.logger.debug("static-data", `Loaded index for ${entityType}`, {
        entryCount: Object.keys(index).length
      });

      return index;
    } catch (error) {
      this.logger.error("static-data", `Failed to get index for ${entityType}`, { error });
      return null;
    }
  }

  /**
   * Check if a specific entity is available in static data
   */
  async hasEntity({ entityType, entityId }: { entityType: StaticEntityType; entityId: string }): Promise<boolean> {
    const index = await this.getIndex(entityType);
    if (!index) return false;

    // Check if any key in the index contains this entity ID
    return Object.keys(index).some(key => this.resolver.extractEntityId(key) === entityId);
  }

  /**
   * Get a specific entity from static data
   */
  async getEntity({ entityType, entityId }: { entityType: StaticEntityType; entityId: string }): Promise<unknown> {
    try {
      const cacheKey = `${entityType}:${entityId}`;

      // Check entity cache first
      const cached = this.entityCache.get(cacheKey);
      if (cached !== undefined) {
        this.logger.debug("static-data", `Cache hit for ${cacheKey}`);
        return cached;
      }

      // Check if entity exists in index
      const hasEntity = await this.hasEntity({ entityType, entityId });
      if (!hasEntity) {
        this.logger.debug("static-data", `Entity ${entityId} not found in ${entityType} static data`);
        return null;
      }

      // Use JSON Schema resolver to get entity data
      const entity = await this.resolver.getEntityData(entityType, entityId);
      if (!entity) {
        this.logger.debug("static-data", `Failed to resolve entity data for ${entityId}`);
        return null;
      }

      // Cache the entity
      this.entityCache.set(cacheKey, entity);

      this.logger.debug("static-data", `Loaded static entity ${cacheKey}`);
      return entity;
    } catch (error) {
      this.logger.error("static-data", `Failed to get entity ${entityType}:${entityId}`, { error });
      return null;
    }
  }

  /**
   * List all available entities for a specific type
   */
  async listAvailableEntities(entityType: StaticEntityType): Promise<string[]> {
    const index = await this.getIndex(entityType);
    if (!index) return [];

    // Extract entity IDs from index keys
    const entityIds: string[] = [];
    for (const key of Object.keys(index)) {
      const entityId = this.resolver.extractEntityId(key);
      if (entityId) {
        entityIds.push(entityId);
      }
    }
    return entityIds;
  }

  /**
   * Get statistics about static data
   */
  async getStatistics(): Promise<Record<StaticEntityType, { count: number; totalSize: number } | null>> {
    // Discover available entity types dynamically
    if (this.availableEntityTypes.length === 0) {
      this.availableEntityTypes = await this.resolver.discoverEntityTypes();
    }

    const stats: Record<string, { count: number; totalSize: number } | null> = {};

    await Promise.all(
      this.availableEntityTypes.map(async (entityType) => {
        if (this.isValidEntityType(entityType)) {
          const index = await this.getIndex(entityType);
          stats[entityType] = index ? {
            count: Object.keys(index).length,
            totalSize: Object.keys(index).length * 1000 // Rough estimate
          } : null;
        }
      })
    );

    return stats;
  }

  /**
   * Check if a query is available in static data
   */
  async hasQuery({ entityType, url }: { entityType: StaticEntityType; url: string }): Promise<boolean> {
    const index = await this.getIndex(entityType);
    if (!index) return false;

    // Check if the URL exists as a key in the index
    return Object.keys(index).includes(url);
  }

  /**
   * Get a cached query result from static data
   */
  async getQuery({ entityType, url }: { entityType: StaticEntityType; url: string }): Promise<QueryResult | null> {
    try {
      const urlIdentifier = encodeURIComponent(url);
      const cacheKey = `${entityType}:query:${urlIdentifier}`;

      // Check query cache first
      const cached = this.queryCache.get(cacheKey);
      if (cached && this.isValidQueryResult(cached)) {
        this.logger.debug("static-data", `Query cache hit for ${cacheKey}`);
        return cached;
      }

      // Check if query exists in index
      const hasQuery = await this.hasQuery({ entityType, url });
      if (!hasQuery) {
        this.logger.debug("static-data", `Query ${url} not found in ${entityType} static data`);
        return null;
      }

      // Use JSON Schema resolver to get query data
      const queryResult = await this.resolver.getQueryData(entityType, url);
      if (!queryResult) {
        this.logger.debug("static-data", `Failed to resolve query data for ${url}`);
        return null;
      }

      // Validate and format the query result
      if (!this.isValidQueryResult(queryResult)) {
        throw new Error(`Invalid query result structure for ${url}`);
      }

      const formattedResult: QueryResult = {
        ...queryResult,
        meta: {
          ...queryResult.meta,
          cached: true
        }
      };

      // Cache the query result
      this.queryCache.set(cacheKey, formattedResult);

      this.logger.debug("static-data", `Loaded static query ${cacheKey}`);
      return formattedResult;
    } catch (error) {
      this.logger.error("static-data", `Failed to get query ${entityType}:${url}`, { error });
      return null;
    }
  }


  /**
   * Clear all caches
   */
  clearCache(): void {
    this.indexCache.clear();
    this.entityCache.clear();
    this.queryCache.clear();
    this.availableEntityTypes = [];
    this.resolver.clearCache();
    this.logger.debug("static-data", "Cleared all static data caches");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { indexCacheSize: number; entityCacheSize: number; queryCacheSize: number } {
    return {
      indexCacheSize: this.indexCache.size,
      entityCacheSize: this.entityCache.size,
      queryCacheSize: this.queryCache.size
    };
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry({ url, retries = STATIC_DATA_CONFIG.maxRetries }: { url: string; retries?: number }): Promise<Response> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url);
        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        this.logger.warn("static-data", `Fetch attempt ${String(attempt)} failed for ${url}, retrying...`, { error });
        await new Promise(resolve => setTimeout(resolve, STATIC_DATA_CONFIG.retryDelay * attempt));
      }
    }

    throw new Error("All retry attempts failed");
  }

  /**
   * Check if entity type is valid
   */
  private isValidEntityType(entityType: string): entityType is StaticEntityType {
    const validTypes: StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"];
    return validTypes.some(validType => validType === entityType);
  }

  /**
   * Get available entity types
   */
  async getAvailableEntityTypes(): Promise<string[]> {
    if (this.availableEntityTypes.length === 0) {
      this.availableEntityTypes = await this.resolver.discoverEntityTypes();
    }
    return this.availableEntityTypes;
  }

  /**
   * Validate query result structure
   */
  private isValidQueryResult(result: unknown): result is QueryResult {
    return (
      typeof result === "object" &&
      result !== null &&
      "results" in result &&
      "meta" in result &&
      Array.isArray(result.results) &&
      typeof result.meta === "object" &&
      result.meta !== null
    );
  }
}

/**
 * Default static data provider instance
 */
export const staticDataProvider = new StaticDataProvider();