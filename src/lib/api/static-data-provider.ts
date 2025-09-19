import { logger } from "@/lib/logger";
import { generateQueryHash } from "@/lib/utils/query-hash";
import type { StaticDataIndex, QueryMetadata } from "@/lib/utils/static-data-index-generator";

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
 */
export class StaticDataProvider {
  private indexCache = new Map<StaticEntityType, StaticDataIndex>();
  private entityCache = new Map<string, unknown>();
  private queryCache = new Map<string, unknown>();
  private readonly logger = logger;

  /**
   * Get the index for a specific entity type
   */
  async getIndex(entityType: StaticEntityType): Promise<StaticDataIndex | null> {
    try {
      // Check cache first
      const cached = this.indexCache.get(entityType);
      if (cached) {
        return cached;
      }

      // Fetch index from static files
      const indexUrl = `${STATIC_DATA_CONFIG.basePath}${entityType}/index.json`;
      const response = await this.fetchWithRetry({ url: indexUrl });

      if (!response.ok) {
        if (response.status === 404) {
          this.logger.debug("static-data", `No static data available for ${entityType}`);
          return null;
        }
        throw new Error(`Failed to fetch index: ${String(response.status)} ${response.statusText}`);
      }

      const indexData: unknown = await response.json();
      if (!this.isValidIndex(indexData)) {
        throw new Error(`Invalid index structure for ${entityType}`);
      }
      const index = indexData;

      // Cache the index
      this.indexCache.set(entityType, index);

      this.logger.debug("static-data", `Loaded index for ${entityType}`, {
        count: index.count,
        totalSize: index.metadata.totalSize
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
    return index?.entities.includes(entityId) ?? false;
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

      // Fetch entity from static files
      const entityUrl = `${STATIC_DATA_CONFIG.basePath}${entityType}/${entityId}.json`;
      const response = await this.fetchWithRetry({ url: entityUrl });

      if (!response.ok) {
        throw new Error(`Failed to fetch entity: ${String(response.status)} ${response.statusText}`);
      }

      const entity: unknown = await response.json();

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
    return index?.entities ?? [];
  }

  /**
   * Get statistics about static data
   */
  async getStatistics(): Promise<Record<StaticEntityType, { count: number; totalSize: number } | null>> {
    const entityTypes: StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"];
    const stats: Record<string, { count: number; totalSize: number } | null> = {};

    await Promise.all(
      entityTypes.map(async (entityType) => {
        const index = await this.getIndex(entityType);
        stats[entityType] = index ? {
          count: index.count,
          totalSize: index.metadata.totalSize
        } : null;
      })
    );

    return stats;
  }

  /**
   * Check if a query is available in static data
   */
  async hasQuery({ entityType, url }: { entityType: StaticEntityType; url: string }): Promise<boolean> {
    const index = await this.getIndex(entityType);
    if (!index?.queries) return false;

    const queryHash = await generateQueryHash(url);
    return index.queries.some(query => query.queryHash === queryHash);
  }

  /**
   * Get a cached query result from static data
   */
  async getQuery({ entityType, url }: { entityType: StaticEntityType; url: string }): Promise<QueryResult | null> {
    try {
      const queryHash = await generateQueryHash(url);
      const cacheKey = `${entityType}:query:${queryHash}`;

      // Check query cache first
      const cached = this.queryCache.get(cacheKey);
      if (cached && this.isValidQueryResult(cached)) {
        this.logger.debug("static-data", `Query cache hit for ${cacheKey}`);
        return cached;
      }

      // Check if query exists in index
      const hasQuery = await this.hasQuery({ entityType, url });
      if (!hasQuery) {
        this.logger.debug("static-data", `Query ${queryHash} not found in ${entityType} static data`);
        return null;
      }

      // Fetch query from static files
      const queryUrl = `${STATIC_DATA_CONFIG.basePath}${entityType}/${queryHash}.json`;
      const response = await this.fetchWithRetry({ url: queryUrl });

      if (!response.ok) {
        throw new Error(`Failed to fetch query: ${String(response.status)} ${response.statusText}`);
      }

      const queryResult: unknown = await response.json();

      // Validate and format the query result
      if (!this.isValidQueryResult(queryResult)) {
        throw new Error(`Invalid query result structure for ${queryHash}`);
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
   * List all available queries for a specific entity type
   */
  async listAvailableQueries(entityType: StaticEntityType): Promise<QueryMetadata[]> {
    const index = await this.getIndex(entityType);
    return index?.queries ?? [];
  }

  /**
   * Find queries matching specific parameters
   */
  async findQueriesByParams(
    entityType: StaticEntityType,
    searchParams: Record<string, unknown>
  ): Promise<QueryMetadata[]> {
    const queries = await this.listAvailableQueries(entityType);

    return queries.filter(query => {
      // Simple parameter matching - could be enhanced with fuzzy matching
      return Object.entries(searchParams).every(([key, value]) => {
        const queryValue = query.params[key];
        if (Array.isArray(queryValue) && Array.isArray(value)) {
          return JSON.stringify(queryValue.sort()) === JSON.stringify(value.sort());
        }
        return queryValue === value;
      });
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.indexCache.clear();
    this.entityCache.clear();
    this.queryCache.clear();
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
   * Validate index structure
   */
  private isValidIndex(index: unknown): index is StaticDataIndex {
    return (
      typeof index === "object" &&
      index !== null &&
      "entityType" in index &&
      "count" in index &&
      "entities" in index &&
      "metadata" in index &&
      Array.isArray(index.entities)
    );
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