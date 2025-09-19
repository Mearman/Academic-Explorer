/**
 * OpenAlex CLI Client Class
 * Separated for better testability
 */

import { readFile, access, writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { generateQueryHash } from "../lib/utils/query-hash.js";
import type { OpenAlexEntity, EntityType, OpenAlexResponse } from "../lib/openalex/types.js";
import type { StaticEntityType } from "../lib/api/static-data-provider.js";

// Types
interface StaticDataIndex {
  entityType: string;
  count: number;
  lastGenerated: string;
  entities: string[];
  queries?: Array<{
    queryHash: string;
    url: string;
    params: Record<string, unknown>;
    resultCount: number;
    size: number;
    lastModified: string;
  }>;
  metadata: {
    totalSize: number;
    files: Array<{
      id: string;
      size: number;
      lastModified: string;
    }>;
  };
}


interface QueryOptions {
  filter?: string;
  select?: string[];
  sort?: string;
  per_page?: number;
  page?: number;
}

interface CacheOptions {
  useCache: boolean;
  saveToCache: boolean;
  cacheOnly: boolean;
}

// Type guards
function isOpenAlexAPIResponse(value: unknown): value is OpenAlexResponse<OpenAlexEntity> {
  return (
    typeof value === "object" &&
    value !== null &&
    "results" in value &&
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type guard requires assertion for property access
    Array.isArray((value as { results: unknown }).results)
  );
}

function isNodeError(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Type guard requires assertion for property access
    typeof (error as { code: unknown }).code === "string"
  );
}

// Configuration
const STATIC_DATA_PATH = "public/data/openalex";
const SUPPORTED_ENTITIES: readonly StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"] as const;

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../..");

export class OpenAlexCLI {
  private static instance: OpenAlexCLI;
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || join(projectRoot, STATIC_DATA_PATH);
  }

  /**
   * Make API call to OpenAlex
   */
  async fetchFromAPI(entityType: StaticEntityType, options: QueryOptions = {}): Promise<unknown> {
    const url = this.buildQueryUrl(entityType, options);

    try {
      console.error(`Fetching from API: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed:`, error);
      throw error;
    }
  }

  /**
   * Get entity by ID with cache control
   */
  async getEntityWithCache(entityType: StaticEntityType, entityId: string, cacheOptions: CacheOptions): Promise<OpenAlexEntity | null> {
    // Try cache first if enabled
    if (cacheOptions.useCache || cacheOptions.cacheOnly) {
      const cached = await this.loadEntity(entityType, entityId);
      if (cached) {
        console.error(`Cache hit for ${entityType}/${entityId}`);
        return cached;
      }

      if (cacheOptions.cacheOnly) {
        console.error(`Cache-only mode: entity ${entityId} not found in cache`);
        return null;
      }
    }

    // Fetch from API if cache miss and not cache-only
    if (!cacheOptions.cacheOnly) {
      try {
        const apiResult = await this.fetchFromAPI(entityType, {
          filter: `id:${entityId}`,
          per_page: 1
        });

        if (isOpenAlexAPIResponse(apiResult) && apiResult.results.length > 0) {
          const entity = apiResult.results[0];

          // Save to cache if enabled
          if (cacheOptions.saveToCache) {
            await this.saveEntityToCache(entityType, entity);
          }

          return entity;
        }
      } catch (error) {
        console.error(`Failed to fetch ${entityType}/${entityId} from API:`, error);
      }
    }

    return null;
  }

  /**
   * Save entity to static cache
   */
  async saveEntityToCache(entityType: StaticEntityType, entity: OpenAlexEntity): Promise<void> {
    try {
      const entityDir = join(this.dataPath, entityType);
      await mkdir(entityDir, { recursive: true });

      const entityId = entity.id.replace("https://openalex.org/", "");
      const entityPath = join(entityDir, `${entityId}.json`);

      await writeFile(entityPath, JSON.stringify(entity, null, 2));
      console.error(`Saved ${entityType}/${entityId} to cache`);
    } catch (error) {
      console.error(`Failed to save entity to cache:`, error);
    }
  }

  /**
   * Query with cache control
   */
  async queryWithCache(entityType: StaticEntityType, queryOptions: QueryOptions, cacheOptions: CacheOptions): Promise<unknown> {
    // Generate cache key from query options
    const url = this.buildQueryUrl(entityType, queryOptions);
    const cacheKey = await generateQueryHash(url);

    // Try cache first if enabled
    if (cacheOptions.useCache || cacheOptions.cacheOnly) {
      const cached = await this.loadQuery(entityType, cacheKey);
      if (cached) {
        console.error(`Query cache hit for ${cacheKey}`);
        return cached;
      }

      if (cacheOptions.cacheOnly) {
        console.error(`Cache-only mode: query ${cacheKey} not found in cache`);
        return null;
      }
    }

    // Fetch from API if cache miss and not cache-only
    if (!cacheOptions.cacheOnly) {
      try {
        const apiResult = await this.fetchFromAPI(entityType, queryOptions);

        // Save to cache if enabled
        if (cacheOptions.saveToCache) {
          await this.saveQueryToCache(entityType, cacheKey, queryOptions, apiResult);
        }

        return apiResult;
      } catch (error) {
        console.error(`Failed to execute query:`, error);
        throw error;
      }
    }

    return null;
  }

  /**
   * Save query result to cache
   */
  async saveQueryToCache(entityType: StaticEntityType, cacheKey: string, queryOptions: QueryOptions, result: unknown): Promise<void> {
    try {
      const queryDir = join(this.dataPath, entityType, "queries");
      await mkdir(queryDir, { recursive: true });

      const queryPath = join(queryDir, `${cacheKey}.json`);
      await writeFile(queryPath, JSON.stringify(result, null, 2));

      console.error(`Saved query ${cacheKey} to cache`);
    } catch (error) {
      console.error(`Failed to save query to cache:`, error);
    }
  }

  /**
   * Build query URL from options
   */
  buildQueryUrl(entityType: StaticEntityType, options: QueryOptions): string {
    const baseUrl = "https://api.openalex.org";
    const params = new URLSearchParams();

    if (options.filter) params.set("filter", options.filter);
    if (options.select) params.set("select", options.select.join(","));
    if (options.sort) params.set("sort", options.sort);
    if (options.per_page) params.set("per_page", options.per_page.toString());
    if (options.page) params.set("page", options.page.toString());

    return `${baseUrl}/${entityType}?${params.toString()}`;
  }

  static getInstance(): OpenAlexCLI {
    if (!OpenAlexCLI.instance) {
      OpenAlexCLI.instance = new OpenAlexCLI();
    }
    return OpenAlexCLI.instance;
  }

  /**
   * Check if static data exists for entity type
   */
  async hasStaticData(entityType: StaticEntityType): Promise<boolean> {
    try {
      const indexPath = join(this.dataPath, entityType, "index.json");
      await access(indexPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load index for entity type
   */
  async loadIndex(entityType: StaticEntityType): Promise<StaticDataIndex | null> {
    try {
      const indexPath = join(this.dataPath, entityType, "index.json");
      const indexContent = await readFile(indexPath, "utf-8");
      const parsed = JSON.parse(indexContent);

      // Basic validation that it's a StaticDataIndex
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "entityType" in parsed &&
        "count" in parsed &&
        "entities" in parsed &&
        Array.isArray(parsed.entities)
      ) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Validated JSON parsing requires type assertion
        return parsed as StaticDataIndex;
      }

      console.error(`Invalid index format for ${entityType}`);
      return null;
    } catch (error) {
      console.error(`Failed to load index for ${entityType}:`, error);
      return null;
    }
  }

  /**
   * Load entity by ID
   */
  async loadEntity(entityType: StaticEntityType, entityId: string): Promise<OpenAlexEntity | null> {
    try {
      const entityPath = join(this.dataPath, entityType, `${entityId}.json`);
      const entityContent = await readFile(entityPath, "utf-8");
      const parsed = JSON.parse(entityContent);

      // Basic validation that it's an OpenAlex entity
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "id" in parsed &&
        "display_name" in parsed &&
        typeof parsed.id === "string" &&
        typeof parsed.display_name === "string"
      ) {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Validated JSON parsing requires type assertion
        return parsed as OpenAlexEntity;
      }

      console.error(`Invalid entity format for ${entityId}`);
      return null;
    } catch (error: unknown) {
      if (isNodeError(error) && error.code === "ENOENT") {
        // File not found is expected, don't log as error
        return null;
      }
      console.error(`Failed to load entity ${entityId}:`, error);
      return null;
    }
  }

  /**
   * Load query result by hash
   */
  async loadQuery(entityType: StaticEntityType, queryHash: string): Promise<unknown | null> {
    try {
      const queryPath = join(this.dataPath, entityType, "queries", `${queryHash}.json`);
      const queryContent = await readFile(queryPath, "utf-8");
      return JSON.parse(queryContent);
    } catch (error) {
      console.error(`Failed to load query ${queryHash}:`, error);
      return null;
    }
  }

  /**
   * List all available entities of a type
   */
  async listEntities(entityType: StaticEntityType): Promise<string[]> {
    const index = await this.loadIndex(entityType);
    return index?.entities || [];
  }

  /**
   * Search entities by display name
   */
  async searchEntities(entityType: StaticEntityType, searchTerm: string): Promise<OpenAlexEntity[]> {
    const entityIds = await this.listEntities(entityType);
    const results: OpenAlexEntity[] = [];

    for (const entityId of entityIds) {
      const entity = await this.loadEntity(entityType, entityId);
      if (entity && entity.display_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push(entity);
      }
    }

    return results;
  }

  /**
   * Get statistics for all entity types
   */
  async getStatistics(): Promise<Record<string, { count: number; totalSize: number; lastGenerated: string }>> {
    const stats: Record<string, { count: number; totalSize: number; lastGenerated: string }> = {};

    for (const entityType of SUPPORTED_ENTITIES) {
      if (await this.hasStaticData(entityType)) {
        const index = await this.loadIndex(entityType);
        if (index) {
          stats[entityType] = {
            count: index.count,
            totalSize: index.metadata.totalSize,
            lastGenerated: index.lastGenerated,
          };
        }
      }
    }

    return stats;
  }
}

// Export types for testing
export type { StaticDataIndex, QueryOptions, CacheOptions };
export { SUPPORTED_ENTITIES };