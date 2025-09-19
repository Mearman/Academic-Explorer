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
import { z } from "zod";

// Zod schemas for runtime validation
const StaticDataIndexSchema = z.object({
  entityType: z.string(),
  count: z.number(),
  lastModified: z.string(),
  entities: z.array(z.string()),
  queries: z.array(z.object({
    queryHash: z.string(),
    url: z.string(),
    params: z.record(z.string(), z.unknown()),
    resultCount: z.number(),
    size: z.number(),
    lastModified: z.string(),
  })).optional(),
  metadata: z.object({
    totalSize: z.number(),
    files: z.array(z.object({
      id: z.string(),
      size: z.number(),
      lastModified: z.string(),
    })),
  }),
});

// Type derived from schema
type StaticDataIndex = z.infer<typeof StaticDataIndexSchema>;

// Type guards
function hasProperty<T extends string>(obj: object, prop: T): obj is Record<T, unknown> {
  return prop in obj;
}

function isStaticDataIndex(obj: unknown): obj is StaticDataIndex {
  if (typeof obj !== "object" || obj === null) return false;

  return hasProperty(obj, "entityType") && typeof obj.entityType === "string" &&
    hasProperty(obj, "count") && typeof obj.count === "number" &&
    hasProperty(obj, "lastModified") && typeof obj.lastModified === "string" &&
    hasProperty(obj, "entities") && Array.isArray(obj.entities);
}

function isOpenAlexEntity(obj: unknown): obj is z.infer<typeof OpenAlexEntitySchema> {
  if (typeof obj !== "object" || obj === null) return false;

  return hasProperty(obj, "id") && typeof obj.id === "string" &&
    hasProperty(obj, "display_name") && typeof obj.display_name === "string";
}

// OpenAlex entity validation (basic properties required for CLI)
const OpenAlexEntitySchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

// OpenAlex API response validation
const OpenAlexAPIResponseSchema = z.object({
  results: z.array(OpenAlexEntitySchema),
  meta: z.object({
    count: z.number(),
    page: z.number().optional(),
    per_page: z.number().optional(),
  }).optional(),
});

// Node.js error validation
const NodeErrorSchema = z.object({
  code: z.string(),
}).strict();


interface QueryOptions {
  search?: string;
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


// Configuration
const STATIC_DATA_PATH = "public/data/openalex";
const SUPPORTED_ENTITIES: readonly StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"] as const;

// Helper function to check if file contents are different
async function hasContentChanged(filePath: string, newContent: string): Promise<boolean> {
  try {
    const existingContent = await readFile(filePath, "utf-8");
    return existingContent !== newContent;
  } catch {
    // File doesn't exist, so content is "different"
    return true;
  }
}

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
  async getEntityWithCache(entityType: StaticEntityType, entityId: string, cacheOptions: CacheOptions): Promise<{ id: string; display_name: string; [key: string]: unknown } | null> {
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

        const validatedResult = OpenAlexAPIResponseSchema.safeParse(apiResult);
        if (validatedResult.success && validatedResult.data.results.length > 0) {
          const entity = validatedResult.data.results[0];

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
  async saveEntityToCache(entityType: StaticEntityType, entity: { id: string; display_name: string; [key: string]: unknown }): Promise<void> {
    try {
      const entityDir = join(this.dataPath, entityType);
      await mkdir(entityDir, { recursive: true });

      const entityId = entity.id.replace("https://openalex.org/", "");
      const entityPath = join(entityDir, `${entityId}.json`);
      const newContent = JSON.stringify(entity, null, 2);

      if (await hasContentChanged(entityPath, newContent)) {
        await writeFile(entityPath, newContent);
        console.error(`Saved ${entityType}/${entityId} to cache (content changed)`);
      } else {
        console.error(`Skipped ${entityType}/${entityId} - no content changes`);
      }
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
      const newContent = JSON.stringify(result, null, 2);

      if (await hasContentChanged(queryPath, newContent)) {
        await writeFile(queryPath, newContent);
        console.error(`Saved query ${cacheKey} to cache (content changed)`);
      } else {
        console.error(`Skipped query ${cacheKey} - no content changes`);
      }
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

    if (options.search) params.set("search", options.search);
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

      // Validate using type guard
      if (isStaticDataIndex(parsed)) {
        return parsed;
      }

      console.error(`Invalid index format for ${entityType}: missing required properties`);
      return null;
    } catch (error) {
      console.error(`Failed to load index for ${entityType}:`, error);
      return null;
    }
  }

  /**
   * Load entity by ID
   */
  async loadEntity(entityType: StaticEntityType, entityId: string): Promise<{ id: string; display_name: string; [key: string]: unknown } | null> {
    try {
      const entityPath = join(this.dataPath, entityType, `${entityId}.json`);
      const entityContent = await readFile(entityPath, "utf-8");
      const parsed = JSON.parse(entityContent);

      // Validate using Zod schema
      const validatedEntity = OpenAlexEntitySchema.safeParse(parsed);
      if (validatedEntity.success) {
        return validatedEntity.data;
      }

      console.error(`Invalid entity format for ${entityId}: missing required properties`);
      return null;
    } catch (error: unknown) {
      const nodeError = NodeErrorSchema.safeParse(error);
      if (nodeError.success && nodeError.data.code === "ENOENT") {
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
  async searchEntities(entityType: StaticEntityType, searchTerm: string): Promise<{ id: string; display_name: string; [key: string]: unknown }[]> {
    const entityIds = await this.listEntities(entityType);
    const results: { id: string; display_name: string; [key: string]: unknown }[] = [];

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
  async getStatistics(): Promise<Record<string, { count: number; totalSize: number; lastModified: string }>> {
    const stats: Record<string, { count: number; totalSize: number; lastModified: string }> = {};

    for (const entityType of SUPPORTED_ENTITIES) {
      if (await this.hasStaticData(entityType)) {
        const index = await this.loadIndex(entityType);
        if (index) {
          stats[entityType] = {
            count: index.count,
            totalSize: index.metadata.totalSize,
            lastModified: index.lastModified,
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