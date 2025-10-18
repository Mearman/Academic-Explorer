/**
 * OpenAlex CLI Client Class
 * Separated for better testability
 */

/* eslint-disable prefer-destructured-params-plugin/prefer-destructured-params */

import { logError, logger } from "@academic-explorer/utils/logger";
import {
  getStaticDataCachePath,
  readIndexAsUnified,
  type UnifiedIndexEntry as UtilsUnifiedIndexEntry,
  type UnifiedIndex,
} from "@academic-explorer/utils/static-data/cache-utilities";
import { existsSync, readFileSync } from "fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
// TODO: Re-enable when openalex-client package build issues are resolved
// import {
//   CachedOpenAlexClient,
//   type EntityType,
//   type QueryParams
// } from "@academic-explorer/openalex-client";

// Temporary types until package is fixed - currently unused but kept for future compatibility
// type _EntityType = "works" | "authors" | "sources" | "institutions" | "topics" | "concepts" | "publishers" | "funders";
// type _QueryParams = Record<string, unknown>;
import type { StaticEntityType } from "./entity-detection.js";

// Simple hash function for content hashing
function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Zod schemas for safe type validation
const EntityIndexEntrySchema = z.object({
  $ref: z.string(),
  lastModified: z.string(),
  contentHash: z.string(),
});

// Type aliases to use the utilities package types
type UnifiedIndexEntry = UtilsUnifiedIndexEntry;

// Cache statistics type definition
interface CacheStats {
  enabled: boolean;
  performance?: {
    totalRequests: number;
    cacheHitRate: number;
    surgicalRequestCount: number;
    bandwidthSaved: number;
  };
  storage?: {
    memory?: {
      entities?: number;
      fields?: number;
      collections?: number;
      size?: number;
    };
  };
}

// Simplified field coverage type for CLI
interface FieldCoverageByTier {
  memory: string[];
  localStorage: string[];
  indexedDB: string[];
  static: string[];
  total: string[];
}

// Query definition for complex queries
const QueryDefinitionSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
  encoded: z.string().optional(),
  url: z.string().optional(),
});

const QueryIndexEntrySchema = z.object({
  query: QueryDefinitionSchema,
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
});

const QueryIndexSchema = z.object({
  entityType: z.string(),
  queries: z.array(QueryIndexEntrySchema),
});

const UnifiedIndexSchema = z.record(z.string(), EntityIndexEntrySchema);

// Static entity type schema for safe validation (matching StaticEntityType exactly) - currently unused
// const StaticEntityTypeSchema = z.enum(["authors", "works", "institutions", "topics", "publishers", "funders"]);

// Type derived from schema
type IndexEntry = z.infer<typeof EntityIndexEntrySchema>;

// Flexible query definition that can be partial and auto-populated
interface QueryDefinition {
  params?: Record<string, unknown>;
  encoded?: string;
  url?: string;
}

interface QueryIndexEntry {
  query: QueryDefinition;
  lastModified?: string;
  contentHash?: string;
}

// OpenAlex entity validation (basic properties required for CLI)
const OpenAlexEntitySchema = z
  .object({
    id: z.string(),
    display_name: z.string(),
  })
  .catchall(z.unknown());

// OpenAlex API response validation
const OpenAlexAPIResponseSchema = z.object({
  results: z.array(OpenAlexEntitySchema),
  meta: z
    .object({
      count: z.number(),
      page: z.number().optional(),
      per_page: z.number().optional(),
    })
    .optional(),
});

// Node.js error validation
const NodeErrorSchema = z
  .object({
    code: z.string(),
  })
  .strict();

// Schema for OpenAlex API response meta object (reserved for future use)
// const _MetaSchema = z.object({
//   count: z.number().optional(),
//   db_response_time_ms: z.number().optional(),
//   page: z.number().optional(),
//   per_page: z.number().optional(),
// }).strict(); // Strict validation for meta properties

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
  // filenameFormat removed - now using URL encoding only
}

// Configuration
const SUPPORTED_ENTITIES: readonly StaticEntityType[] = [
  "authors",
  "works",
  "institutions",
  "topics",
  "publishers",
  "funders",
] as const;

// Constants for repeated strings
const LOG_CONTEXT_GENERAL = "general";
const LOG_CONTEXT_STATIC_CACHE = "static-cache";
const INDEX_FILENAME = "index.json";
const OPENALEX_API_BASE_URL = "https://api.openalex.org/";
const API_REQUEST_FAILED = "API request failed";
const CACHE_HIT_MESSAGE = "Cache hit for";
const CACHE_ONLY_MODE_MESSAGE = "Cache-only mode: entity";
const CACHE_ONLY_QUERY_MESSAGE =
  "Cache-only mode: no matching query found in cache";
const NO_CACHED_QUERY_MESSAGE = "No cached query found matching parameters";
const QUERY_CACHE_HIT_MESSAGE = "Query cache hit for parameters";
const FAILED_TO_FETCH_MESSAGE = "Failed to fetch";
const FAILED_TO_SAVE_MESSAGE = "Failed to save entity to cache";
const FAILED_TO_SAVE_QUERY_MESSAGE = "Failed to save query to cache";
const FAILED_TO_LOAD_MESSAGE = "Failed to load entity";
const FAILED_TO_LOAD_QUERY_MESSAGE = "Failed to load query";
const INVALID_ENTITY_FORMAT_MESSAGE = "Invalid entity format for";
const MISSING_REQUIRED_PROPERTIES_MESSAGE = "missing required properties";
const QUERY_DIRECTORY_NOT_FOUND_MESSAGE = "Query directory not found";
const FAILED_TO_DECODE_FILENAME_MESSAGE = "Failed to decode filename";
const FAILED_TO_READ_CACHED_QUERY_MESSAGE = "Failed to read cached query";
const FAILED_TO_LOAD_INDEX_MESSAGE = "Failed to load query index for";
const INVALID_QUERY_INDEX_STRUCTURE_MESSAGE =
  "Invalid query index structure in";
const FAILED_TO_SAVE_INDEX_MESSAGE = "Failed to save query index for";
const UPDATED_INDEX_MESSAGE = "Updated unified index for";
const FAILED_TO_SAVE_UNIFIED_INDEX_MESSAGE = "Failed to save unified index for";
const FAILED_TO_LOAD_UNIFIED_INDEX_MESSAGE = "Failed to load unified index for";
const INVALID_INDEX_FORMAT_MESSAGE = "Invalid index format for";
const UPDATED_QUERY_INDEX_MESSAGE = "Updated query index for";
const SAVED_QUERY_MESSAGE = "Saved query";
const SKIPPED_QUERY_MESSAGE = "Skipped query";
const SAVED_ENTITY_MESSAGE = "Saved";
const SKIPPED_ENTITY_MESSAGE = "Skipped";
const CONTENT_CHANGED_MESSAGE = "to cache (content changed)";
const NO_CONTENT_CHANGES_MESSAGE = "- no content changes";
const QUERY_INDEX_UPDATE_NOT_IMPLEMENTED_MESSAGE =
  "Query index update not implemented for unified format yet";
const FAILED_TO_GET_CACHE_STATS_MESSAGE = "Failed to get cache stats";
const CACHE_STATS_NOT_AVAILABLE_MESSAGE =
  "Cache stats not available - client disabled";
const FIELD_COVERAGE_ANALYSIS_NOT_AVAILABLE_MESSAGE =
  "Field coverage analysis not available in CLI mode";
const WELL_POPULATED_ENTITIES_ANALYSIS_NOT_AVAILABLE_MESSAGE =
  "Well-populated entities analysis not available - synthetic cache disabled";
const POPULAR_COLLECTIONS_ANALYSIS_NOT_AVAILABLE_MESSAGE =
  "Popular collections analysis not available - synthetic cache disabled";
const SYNTHETIC_CACHE_CLEAR_NOT_AVAILABLE_MESSAGE =
  "Synthetic cache clear not available - client disabled";
const FAILED_TO_GET_WELL_POPULATED_ENTITIES_MESSAGE =
  "Failed to get well-populated entities";
const FAILED_TO_GET_POPULAR_COLLECTIONS_MESSAGE =
  "Failed to get popular collections";
const FAILED_TO_ANALYZE_STATIC_DATA_USAGE_MESSAGE =
  "Failed to analyze static data usage";
const GENERATION_FAILED_MESSAGE = "Generation failed";
const FAILED_TO_PROCESS_ENTITY_TYPE_MESSAGE = "Failed to process entity type";
const FAILED_TO_PROCESS_ENTITY_MESSAGE = "Failed to process entity";
const FAILED_TO_PROCESS_COLLECTION_MESSAGE = "Failed to process collection";
const FAILED_TO_LIST_CACHED_QUERIES_MESSAGE = "Failed to list cached queries";
const FAILED_TO_CLEAR_SYNTHETIC_CACHE_MESSAGE =
  "Failed to clear synthetic cache";

// Helper functions for canonical URL handling
function generateCanonicalEntityUrl(
  entityType: StaticEntityType,
  entityId: string,
): string {
  const cleanId = entityId.replace("https://openalex.org/", "");
  return `${OPENALEX_API_BASE_URL}${entityType}/${cleanId}`;
}

// function _extractEntityIdFromCanonicalUrl(canonicalUrl: string): string | null {
//   const match = canonicalUrl.match(/https:\/\/api\.openalex\.org\/[^/]+\/(.+)$/);
//   return match?.[1] ?? null;
// }

// function _extractEntityTypeFromCanonicalUrl(canonicalUrl: string): StaticEntityType | null {
//   const match = canonicalUrl.match(/https:\/\/api\.openalex\.org\/([^/]+)\//);
//   const entityType = match ? match[1] : null;
//   const validationResult = StaticEntityTypeSchema.safeParse(entityType);
//   return validationResult.success ? validationResult.data : null;
// }

// Helper function to check if file contents are different (reserved for future use)
// async function _hasContentChanged(filePath: string, newContent: string): Promise<boolean> {
//   try {
//     const existingContent = await readFile(filePath, "utf-8");
//     return existingContent !== newContent;
//   } catch {
//     // File doesn't exist, so content is "different"
//     return true;
//   }
// }

// Get the project root directory (workspace root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../../..");

/**
 * Check if running in development mode within the repo
 */
function isDevelopmentMode(): boolean {
  // Check NODE_ENV first (most reliable)
  if (typeof process !== "undefined" && process.env.NODE_ENV) {
    const nodeEnv = process.env.NODE_ENV.toLowerCase();
    if (nodeEnv === "development" || nodeEnv === "dev") return true;
    if (nodeEnv === "production") return false;
  }

  // Check if we're running from within the Academic Explorer repo structure
  try {
    const currentPath = process.cwd();
    const expectedRepoName = "Academic Explorer";

    // Check if current working directory contains repo structure indicators
    if (
      currentPath.includes(expectedRepoName) ||
      currentPath.includes("academic-explorer")
    ) {
      return true;
    }

    // Check if we can find package.json with academic-explorer workspace name
    const packageJsonPath = resolve(projectRoot, "package.json");
    try {
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        if (packageJson.name === "academic-explorer") {
          return true;
        }
      }
    } catch {
      // Continue to other checks
    }
  } catch {
    // Ignore path resolution errors
  }

  // Default to false for production/distribution mode
  return false;
}

/**
 * Get the appropriate static data path based on environment
 */
function getStaticDataPath(): string {
  if (isDevelopmentMode()) {
    // In development, save to apps/web/public/data/openalex so the web app can read it
    return getStaticDataCachePath();
  } else {
    // In production/distribution, use the standard path
    return getStaticDataCachePath();
  }
}

export class OpenAlexCLI {
  private static instance: OpenAlexCLI | undefined;
  private dataPath: string;
  // TODO: Re-enable when openalex-client package is fixed
  // private cachedClient: CachedOpenAlexClient;
  // defaultFilenameFormat removed - now using URL encoding only

  constructor(dataPath?: string) {
    this.dataPath = dataPath ?? getStaticDataPath();
    // TODO: Re-enable when openalex-client package is fixed
    // this.cachedClient = new CachedOpenAlexClient();
  }

  /**
   * Make API call to OpenAlex
   */
  async fetchFromAPI(
    entityType: StaticEntityType,
    options: QueryOptions = {},
  ): Promise<unknown> {
    const url = this.buildQueryUrl(entityType, options);

    try {
      logger.debug(LOG_CONTEXT_GENERAL, `Fetching from API: ${url}`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `API request failed: ${response.status.toString()} ${response.statusText}`,
        );
      }

      return await response.json();
    } catch (error) {
      logError(logger, API_REQUEST_FAILED, error, LOG_CONTEXT_GENERAL);
      throw error;
    }
  }

  /**
   * Get entity by ID with cache control
   */
  async getEntityWithCache(
    entityType: StaticEntityType,
    entityId: string,
    cacheOptions: CacheOptions,
  ): Promise<{
    id: string;
    display_name: string;
    [key: string]: unknown;
  } | null> {
    // Try cache first if enabled
    if (cacheOptions.useCache || cacheOptions.cacheOnly) {
      const cached = await this.loadEntity(entityType, entityId);
      if (cached) {
        logger.debug(
          LOG_CONTEXT_GENERAL,
          `${CACHE_HIT_MESSAGE} ${entityType}/${entityId}`,
        );
        return cached;
      }

      if (cacheOptions.cacheOnly) {
        logger.warn(
          LOG_CONTEXT_GENERAL,
          `${CACHE_ONLY_MODE_MESSAGE} ${entityId} not found in cache`,
        );
        return null;
      }
    }

    // Fetch from API if cache miss and not cache-only
    try {
      const apiResult = await this.fetchFromAPI(entityType, {
        filter: `id:${entityId}`,
        per_page: 1,
      });

      const validatedResult = OpenAlexAPIResponseSchema.safeParse(apiResult);
      if (validatedResult.success && validatedResult.data.results.length > 0) {
        const entity = validatedResult.data.results[0] as {
          id: string;
          display_name: string;
          [key: string]: unknown;
        };

        // Type guard to ensure entity has required properties
        if (
          "id" in entity &&
          "display_name" in entity &&
          typeof entity.id === "string" &&
          typeof entity.display_name === "string"
        ) {
          // Save to cache if enabled
          if (cacheOptions.saveToCache) {
            await this.saveEntityToCache(entityType, entity);
          }

          return entity;
        }
      }
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_FETCH_MESSAGE} ${entityType}/${entityId} from API`,
        error,
        LOG_CONTEXT_GENERAL,
      );
    }

    return null;
  }

  /**
   * Save entity to static cache and update unified index
   */
  async saveEntityToCache(
    entityType: StaticEntityType,
    entity: { id: string; display_name: string; [key: string]: unknown },
  ): Promise<void> {
    try {
      const entityDir = join(this.dataPath, entityType);
      await mkdir(entityDir, { recursive: true });

      const canonicalUrl = generateCanonicalEntityUrl(entityType, entity.id);
      const filename = encodeURIComponent(canonicalUrl) + ".json";
      const entityPath = join(entityDir, filename);
      const newContent = JSON.stringify(entity, null, 2);

      const newContentHash = generateContentHash(newContent);

      // Check if content hash has changed by comparing with index
      let existingContentHash: string | null = null;
      let existingLastModified: string | null = null;

      try {
        const existingIndex = await this.loadUnifiedIndex(entityType);
        if (existingIndex?.[canonicalUrl]) {
          existingContentHash = existingIndex[canonicalUrl].contentHash;
          existingLastModified = existingIndex[canonicalUrl].lastModified;
        }
      } catch {
        // Index doesn't exist or can't be read - treat as new content
      }

      const contentChanged = existingContentHash !== newContentHash;

      if (contentChanged) {
        await writeFile(entityPath, newContent);
        logger.debug(
          LOG_CONTEXT_STATIC_CACHE,
          `${SAVED_ENTITY_MESSAGE} ${entityType}/${filename} ${CONTENT_CHANGED_MESSAGE}`,
        );

        // Update unified index with new lastModified timestamp
        const indexEntry: IndexEntry = {
          $ref: `./${filename}`,
          lastModified: new Date().toISOString(),
          contentHash: newContentHash,
        };

        await this.updateUnifiedIndex(entityType, canonicalUrl, indexEntry);
      } else {
        logger.debug(
          LOG_CONTEXT_STATIC_CACHE,
          `${SKIPPED_ENTITY_MESSAGE} ${entityType}/${filename} ${NO_CONTENT_CHANGES_MESSAGE}`,
        );

        // Content hasn't changed, but ensure index entry exists with preserved lastModified
        if (existingLastModified) {
          const indexEntry: IndexEntry = {
            $ref: `./${filename}`,
            lastModified: existingLastModified, // Preserve existing timestamp
            contentHash: newContentHash,
          };
          await this.updateUnifiedIndex(entityType, canonicalUrl, indexEntry);
        }
      }
    } catch (error) {
      logError(logger, FAILED_TO_SAVE_MESSAGE, error, LOG_CONTEXT_STATIC_CACHE);
    }
  }

  /**
   * Query with cache control
   */
  async queryWithCache(
    entityType: StaticEntityType,
    queryOptions: QueryOptions,
    cacheOptions: CacheOptions,
  ): Promise<unknown> {
    // Generate URL from query options
    const url = this.buildQueryUrl(entityType, queryOptions);

    // Try cache first if enabled
    if (cacheOptions.useCache || cacheOptions.cacheOnly) {
      const cached = await this.loadQuery(entityType, url);
      if (cached) {
        logger.debug(LOG_CONTEXT_GENERAL, QUERY_CACHE_HIT_MESSAGE);
        return cached;
      }

      if (cacheOptions.cacheOnly) {
        logger.warn(LOG_CONTEXT_GENERAL, CACHE_ONLY_QUERY_MESSAGE);
        return null;
      }
    }

    // Fetch from API if cache miss and not cache-only
    try {
      const apiResult = await this.fetchFromAPI(entityType, queryOptions);

      // Save to cache if enabled
      if (cacheOptions.saveToCache) {
        await this.saveQueryToCache(entityType, url, apiResult);
      }

      return apiResult;
    } catch (error) {
      logError(logger, "Failed to execute query", error, LOG_CONTEXT_GENERAL);
      throw error;
    }
  }

  /**
   * Save query result to cache
   */
  async saveQueryToCache(
    entityType: StaticEntityType,
    url: string,
    result: unknown,
  ): Promise<void> {
    try {
      const queryDir = join(this.dataPath, entityType, "queries");
      await mkdir(queryDir, { recursive: true });

      // Generate filename using URL encoding
      const filename = encodeURIComponent(url);
      const queryPath = join(queryDir, `${filename}.json`);

      const newContent = JSON.stringify(result, null, 2);
      const newContentHash = generateContentHash(newContent);

      // Check if content hash has changed by comparing with existing query index
      let existingContentHash: string | null = null;
      let existingLastModified: string | null = null;

      try {
        const queryIndexPath = join(queryDir, INDEX_FILENAME);
        const { readFile } = await import("fs/promises");
        const queryIndexContent = await readFile(queryIndexPath, "utf-8");
        const queryIndexRaw: unknown = JSON.parse(queryIndexContent);
        const queryIndexValidation = QueryIndexSchema.safeParse(queryIndexRaw);

        if (queryIndexValidation.success) {
          const queryIndex = queryIndexValidation.data;
          // Find existing entry for this URL
          const existingEntry = queryIndex.queries.find(
            (entry) => entry.query.url === url,
          );

          if (existingEntry) {
            existingContentHash = existingEntry.contentHash ?? null;
            existingLastModified = existingEntry.lastModified ?? null;
          }
        }
      } catch {
        // Query index doesn't exist or can't be read - treat as new content
      }

      const contentChanged = existingContentHash !== newContentHash;

      if (contentChanged) {
        await writeFile(queryPath, newContent);
        logger.debug(
          LOG_CONTEXT_GENERAL,
          `${SAVED_QUERY_MESSAGE} ${filename} ${CONTENT_CHANGED_MESSAGE}`,
        );

        // Create query definition with URL only (params parsing removed)
        const queryDef: QueryDefinition = { url };

        // Update query index with new lastModified timestamp
        this.updateQueryIndex(entityType, queryDef, {
          lastModified: new Date().toISOString(),
          contentHash: newContentHash,
        });
      } else {
        logger.debug(
          LOG_CONTEXT_GENERAL,
          `${SKIPPED_QUERY_MESSAGE} ${filename} ${NO_CONTENT_CHANGES_MESSAGE}`,
        );

        // Content hasn't changed, but ensure index entry exists with preserved lastModified
        if (existingLastModified) {
          const queryDef: QueryDefinition = { url };

          this.updateQueryIndex(entityType, queryDef, {
            lastModified: existingLastModified, // Preserve existing timestamp
            contentHash: newContentHash,
          });
        }
      }
    } catch (error) {
      logError(
        logger,
        FAILED_TO_SAVE_QUERY_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
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
    OpenAlexCLI.instance ??= new OpenAlexCLI();
    return OpenAlexCLI.instance;
  }

  // Filename format methods removed - now using URL encoding only

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
   * Load index for entity type (returns raw unified index)
   */
  async loadIndex(entityType: StaticEntityType): Promise<UnifiedIndex | null> {
    return this.loadUnifiedIndex(entityType);
  }

  /**
   * Get entity summary for integration tests
   */
  async getEntitySummary(
    entityType: StaticEntityType,
  ): Promise<{ entityType: string; count: number; entities: string[] } | null> {
    try {
      const unifiedIndex = await this.loadUnifiedIndex(entityType);
      if (!unifiedIndex) return null;

      // Transform unified index to summary format for integration tests
      const entities: string[] = [];

      for (const [key, _entry] of Object.entries(unifiedIndex)) {
        void _entry; // Acknowledge unused variable
        // Extract entity IDs from the unified index keys
        const match = key.match(/\/([AWISTPFC]\d+)(?:\?|$)/);
        if (match) {
          const entityId = match[1];
          if (entityId && !entities.includes(entityId)) {
            entities.push(entityId);
          }
        }
      }

      return {
        entityType,
        count: entities.length,
        entities: entities.sort(),
      };
    } catch (error) {
      logError(
        logger,
        `Failed to load entity summary for ${entityType}`,
        error,
        "general",
      );
      return null;
    }
  }

  /**
   * Load unified index for entity type
   * Automatically handles both DirectoryIndex and UnifiedIndex formats
   */
  async loadUnifiedIndex(
    entityType: StaticEntityType,
  ): Promise<UnifiedIndex | null> {
    try {
      const indexPath = join(this.dataPath, entityType, "index.json");
      const indexContent = await readFile(indexPath, "utf-8");
      const parsed: unknown = JSON.parse(indexContent);

      // Use the adapter function to handle both formats
      const unified = readIndexAsUnified(parsed);
      if (unified) {
        return unified;
      }

      // Fallback: try direct Zod validation for backwards compatibility
      const validationResult = UnifiedIndexSchema.safeParse(parsed);
      if (validationResult.success) {
        return validationResult.data;
      }

      logger.error(
        LOG_CONTEXT_GENERAL,
        `${INVALID_INDEX_FORMAT_MESSAGE} ${entityType}`,
        {
          error: validationResult.error.issues,
        },
      );
      return null;
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_LOAD_UNIFIED_INDEX_MESSAGE} ${entityType}`,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return null;
    }
  }

  /**
   * Save unified index for entity type
   */
  async saveUnifiedIndex(
    entityType: StaticEntityType,
    index: UnifiedIndex,
  ): Promise<void> {
    try {
      const entityDir = join(this.dataPath, entityType);
      await mkdir(entityDir, { recursive: true });
      const indexPath = join(entityDir, "index.json");
      const content = JSON.stringify(index, null, 2);
      await writeFile(indexPath, content);
      logger.debug(
        LOG_CONTEXT_STATIC_CACHE,
        `${UPDATED_INDEX_MESSAGE} ${entityType} with ${Object.keys(index).length.toString()} entries`,
      );
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_SAVE_UNIFIED_INDEX_MESSAGE} ${entityType}`,
        error,
        LOG_CONTEXT_STATIC_CACHE,
      );
    }
  }

  /**
   * Update unified index with new entry
   */
  async updateUnifiedIndex(
    entityType: StaticEntityType,
    canonicalUrl: string,
    entry: IndexEntry,
  ): Promise<void> {
    let index = await this.loadUnifiedIndex(entityType);
    index ??= {};

    index[canonicalUrl] = entry;
    await this.saveUnifiedIndex(entityType, index);
  }

  /**
   * Load entity by ID
   */
  async loadEntity(
    entityType: StaticEntityType,
    entityId: string,
  ): Promise<{
    id: string;
    display_name: string;
    [key: string]: unknown;
  } | null> {
    try {
      const unifiedIndex = await this.loadUnifiedIndexForEntity(
        entityType,
        entityId,
      );
      if (!unifiedIndex) {
        return null;
      }

      const entityEntry = this.findEntityEntry(
        unifiedIndex,
        entityType,
        entityId,
      );
      if (!entityEntry?.$ref) {
        return null;
      }

      return await this.loadEntityFromFile(entityType, entityEntry, entityId);
    } catch (error: unknown) {
      return this.handleEntityLoadError(error, entityId);
    }
  }

  /**
   * Load unified index for entity loading
   */
  private async loadUnifiedIndexForEntity(
    entityType: StaticEntityType,
    entityId: string,
  ): Promise<UnifiedIndex | null> {
    const indexPath = join(this.dataPath, entityType, "index.json");
    const indexContent = await readFile(indexPath, "utf-8");
    const parsedIndex: unknown = JSON.parse(indexContent);

    const unifiedIndex = readIndexAsUnified(parsedIndex);
    if (!unifiedIndex) {
      logger.error("general", `Failed to read index for ${entityType}`, {
        entityId,
      });
    }
    return unifiedIndex;
  }

  /**
   * Find entity entry in unified index
   */
  private findEntityEntry(
    unifiedIndex: UnifiedIndex,
    entityType: StaticEntityType,
    entityId: string,
  ): UnifiedIndexEntry | null | undefined {
    const canonicalUrl = generateCanonicalEntityUrl(entityType, entityId);

    // Check if the canonical URL exists directly in the index
    if (canonicalUrl in unifiedIndex) {
      const validationResult = EntityIndexEntrySchema.safeParse(
        unifiedIndex[canonicalUrl],
      );
      if (this.isValidEntityEntry(validationResult)) {
        return validationResult.data;
      }
    }

    // Search for entity ID in all keys (may be in different URL formats)
    return this.searchEntityById(unifiedIndex, entityId);
  }

  /**
   * Check if entity entry is valid
   */
  private isValidEntityEntry(
    validationResult: ReturnType<typeof EntityIndexEntrySchema.safeParse>,
  ): boolean {
    return Boolean(
      validationResult.success &&
        validationResult.data?.$ref &&
        validationResult.data?.lastModified &&
        validationResult.data?.contentHash,
    );
  }

  /**
   * Search for entity by ID in index keys
   */
  private searchEntityById(
    unifiedIndex: UnifiedIndex,
    entityId: string,
  ): UnifiedIndexEntry | null | undefined {
    for (const key in unifiedIndex) {
      if (Object.prototype.hasOwnProperty.call(unifiedIndex, key)) {
        const data = unifiedIndex[key];
        const match = key.match(/[WASITCPFKG]\d{8,10}/);
        if (match && match?.[0] === entityId) {
          const validationResult = EntityIndexEntrySchema.safeParse(data);
          if (this.isValidEntityEntry(validationResult)) {
            return validationResult.data;
          }
        }
      }
    }
    return null;
  }

  /**
   * Load entity data from file
   */
  private async loadEntityFromFile(
    entityType: StaticEntityType,
    entityEntry: UnifiedIndexEntry,
    entityId: string,
  ): Promise<{
    id: string;
    display_name: string;
    [key: string]: unknown;
  } | null> {
    const entityPath = join(
      this.dataPath,
      entityType,
      entityEntry.$ref.startsWith("./")
        ? entityEntry.$ref.substring(2)
        : entityEntry.$ref,
    );
    const entityContent = await readFile(entityPath, "utf-8");
    const parsed: unknown = JSON.parse(entityContent);

    const validatedEntity = OpenAlexEntitySchema.safeParse(parsed);
    if (
      validatedEntity.success &&
      validatedEntity.data.id &&
      validatedEntity.data.display_name
    ) {
      return validatedEntity.data as {
        id: string;
        display_name: string;
        [key: string]: unknown;
      };
    }

    logger.warn(
      LOG_CONTEXT_GENERAL,
      `${INVALID_ENTITY_FORMAT_MESSAGE} ${entityId}: ${MISSING_REQUIRED_PROPERTIES_MESSAGE}`,
    );
    return null;
  }

  /**
   * Handle entity load errors
   */
  private handleEntityLoadError(error: unknown, entityId: string): null {
    const nodeError = NodeErrorSchema.safeParse(error);
    if (nodeError.success && nodeError.data.code === "ENOENT") {
      // File not found is expected, don't log as error
      return null;
    }
    logError(
      logger,
      `${FAILED_TO_LOAD_MESSAGE} ${entityId}`,
      error,
      LOG_CONTEXT_GENERAL,
    );
    return null;
  }

  /**
   * Load query result by matching query parameters (transparently reads both formats)
   */
  async loadQuery(
    entityType: StaticEntityType,
    queryUrl: string,
  ): Promise<unknown> {
    try {
      const targetParams = this.normalizeQueryParams(queryUrl);

      // Try query index for faster lookup first
      const result = await this.tryLoadFromQueryIndex(entityType, queryUrl);
      if (result) return result;

      // Fallback: scan directory for matching files
      return await this.scanDirectoryForQuery(entityType, targetParams);
    } catch (error) {
      logError(
        logger,
        FAILED_TO_LOAD_QUERY_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return null;
    }
  }

  /**
   * Try to load query from index
   */
  private async tryLoadFromQueryIndex(
    entityType: StaticEntityType,
    queryUrl: string,
  ): Promise<unknown | null> {
    const queryIndex = await this.loadQueryIndex(entityType);
    if (!queryIndex) return null;

    for (const queryEntry of queryIndex.queries) {
      if (this.queryMatches(queryUrl, queryEntry.query)) {
        const filename = this.generateFilenameFromQuery(queryEntry.query);
        if (filename) {
          return await this.loadQueryFile(entityType, filename, "index");
        }
      }
    }
    return null;
  }

  /**
   * Scan directory for matching query files
   */
  private async scanDirectoryForQuery(
    entityType: StaticEntityType,
    targetParams: Record<string, unknown>,
  ): Promise<unknown | null> {
    const queryDir = join(this.dataPath, entityType, "queries");
    try {
      const { readdir } = await import("fs/promises");
      const files = await readdir(queryDir);
      const queryFiles = files.filter(
        (f) => f.endsWith(".json") && f !== "index.json",
      );

      for (const filename of queryFiles) {
        const result = await this.tryMatchQueryFile(
          queryDir,
          filename,
          targetParams,
        );
        if (result) return result;
      }
    } catch {
      logger.warn(
        LOG_CONTEXT_GENERAL,
        `${QUERY_DIRECTORY_NOT_FOUND_MESSAGE}: ${queryDir}`,
      );
    }

    logger.debug(LOG_CONTEXT_GENERAL, NO_CACHED_QUERY_MESSAGE);
    return null;
  }

  /**
   * Try to match and load a query file
   */
  private async tryMatchQueryFile(
    queryDir: string,
    filename: string,
    targetParams: Record<string, unknown>,
  ): Promise<unknown | null> {
    try {
      const filenameWithoutExt = filename.replace(/\.json$/, "");
      const decodedUrl = decodeURIComponent(filenameWithoutExt);
      const decodedParams = this.normalizeQueryParams(decodedUrl);

      if (this.paramsMatch(targetParams, decodedParams)) {
        return await this.loadQueryFileFromPath(
          join(queryDir, filename),
          filename,
          "scan",
        );
      }
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_DECODE_FILENAME_MESSAGE} ${filename}`,
        error,
        LOG_CONTEXT_GENERAL,
      );
    }
    return null;
  }

  /**
   * Load query file from path
   */
  private async loadQueryFile(
    entityType: StaticEntityType,
    filename: string,
    source: string,
  ): Promise<unknown | null> {
    const queryPath = join(this.dataPath, entityType, "queries", filename);
    return await this.loadQueryFileFromPath(queryPath, filename, source);
  }

  /**
   * Load query file from specific path
   */
  private async loadQueryFileFromPath(
    queryPath: string,
    filename: string,
    source: string,
  ): Promise<unknown | null> {
    try {
      const queryContent = await readFile(queryPath, "utf-8");
      logger.debug(
        LOG_CONTEXT_GENERAL,
        `Found query via ${source}: ${filename}`,
      );
      return JSON.parse(queryContent);
    } catch (error) {
      const errorMessage =
        source === "index"
          ? `Index pointed to missing file: ${filename}`
          : `${FAILED_TO_READ_CACHED_QUERY_MESSAGE} ${filename}`;
      logError(logger, errorMessage, error, LOG_CONTEXT_GENERAL);
    }
    return null;
  }

  /**
   * Normalize query parameters for comparison
   */
  private normalizeQueryParams(url: string): Record<string, unknown> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, unknown> = {};

      for (const [key, value] of Array.from(urlObj.searchParams.entries())) {
        // Normalize known parameters
        if (key === "select" && typeof value === "string") {
          params[key] = value
            .split(",")
            .map((v) => v.trim())
            .sort(); // Sort for consistent comparison
        } else if (key === "per_page" || key === "page") {
          params[key] = value; // Keep as string for comparison
        } else {
          params[key] = value;
        }
      }

      return params;
    } catch {
      return {};
    }
  }

  /**
   * Check if two parameter objects match (ignoring order differences)
   */
  private paramsMatch(
    target: Record<string, unknown>,
    candidate: Record<string, unknown>,
  ): boolean {
    const targetKeys = Object.keys(target).sort();
    const candidateKeys = Object.keys(candidate).sort();

    // Must have same keys
    if (
      targetKeys.length !== candidateKeys.length ||
      !targetKeys.every((key) => candidateKeys.includes(key))
    ) {
      return false;
    }

    // Check each value
    for (const key of targetKeys) {
      const targetVal = target[key];
      const candidateVal = candidate[key];

      // Handle arrays (like select fields)
      if (Array.isArray(targetVal) && Array.isArray(candidateVal)) {
        if (
          targetVal.length !== candidateVal.length ||
          !targetVal.every((v) => candidateVal.includes(v))
        ) {
          return false;
        }
      } else if (targetVal !== candidateVal) {
        return false;
      }
    }

    return true;
  }

  /**
   * Flexible query matching that handles params, encoded, or URL formats
   */
  private queryMatches(targetUrl: string, queryDef: QueryDefinition): boolean {
    const targetParams = this.normalizeQueryParams(targetUrl);

    // If query definition has params, use direct parameter matching
    if (queryDef.params) {
      return this.paramsMatch(targetParams, queryDef.params);
    }

    // If query definition has encoded string, decode and match params
    if (queryDef.encoded) {
      try {
        const decoded = this.decodeQueryString(queryDef.encoded);
        const validatedParams = this.validateQueryParams(decoded);
        if (validatedParams) {
          return this.paramsMatch(targetParams, validatedParams);
        }
      } catch {
        // Continue to next matching method
      }
    }

    // If query definition has URL, extract params and match
    if (queryDef.url) {
      try {
        const urlParams = this.normalizeQueryParams(queryDef.url);
        return this.paramsMatch(targetParams, urlParams);
      } catch {
        // Continue to next matching method
      }
    }

    return false;
  }

  /**
   * Decode base64url encoded query string back to parameters
   */
  private decodeQueryString(encoded: string): unknown | null {
    try {
      // Remove .json extension if present
      const cleanEncoded = encoded.replace(/\.json$/, "");

      // Base64url decode
      const jsonString = Buffer.from(cleanEncoded, "base64url").toString(
        "utf-8",
      );
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }

  /**
   * Validate and convert decoded result to Record<string, unknown>
   */
  private validateQueryParams(
    decoded: unknown,
  ): Record<string, unknown> | null {
    const QueryParamsSchema = z.record(z.string(), z.unknown());
    const result = QueryParamsSchema.safeParse(decoded);
    return result.success ? result.data : null;
  }

  /**
   * Generate filename from query definition, using encoded if available, otherwise params or URL
   */
  private generateFilenameFromQuery(queryDef: QueryDefinition): string | null {
    // If encoded is available, use it directly
    if (queryDef.encoded) {
      return queryDef.encoded.endsWith(".json")
        ? queryDef.encoded
        : `${queryDef.encoded}.json`;
    }

    // If params are available, generate encoded filename from params
    if (queryDef.params) {
      try {
        const encoded = Buffer.from(JSON.stringify(queryDef.params)).toString(
          "base64url",
        );
        return `${encoded}.json`;
      } catch {
        return null;
      }
    }

    // If URL is available, extract params and generate encoded filename
    if (queryDef.url) {
      try {
        const params = this.normalizeQueryParams(queryDef.url);
        const encoded = Buffer.from(JSON.stringify(params)).toString(
          "base64url",
        );
        return `${encoded}.json`;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Load query index for an entity type (legacy format)
   */
  async loadQueryIndex(
    entityType: StaticEntityType,
  ): Promise<{ entityType: string; queries: QueryIndexEntry[] } | null> {
    try {
      const queryIndexPath = join(
        this.dataPath,
        entityType,
        "queries",
        "index.json",
      );
      const indexContent = await readFile(queryIndexPath, "utf-8");
      const parsed: unknown = JSON.parse(indexContent);

      // Validate with Zod schema
      const validationResult = QueryIndexSchema.safeParse(parsed);
      if (validationResult.success) {
        // Construct object conditionally to avoid undefined assignment to optional properties
        const { data } = validationResult;
        return {
          entityType: data.entityType,
          queries: data.queries.map((entry) => ({
            query: {
              ...(entry.query.params !== undefined && {
                params: entry.query.params,
              }),
              ...(entry.query.encoded !== undefined && {
                encoded: entry.query.encoded,
              }),
              ...(entry.query.url !== undefined && { url: entry.query.url }),
            },
            ...(entry.lastModified !== undefined && {
              lastModified: entry.lastModified,
            }),
            ...(entry.contentHash !== undefined && {
              contentHash: entry.contentHash,
            }),
          })),
        };
      }

      logger.warn(
        LOG_CONTEXT_GENERAL,
        `${INVALID_QUERY_INDEX_STRUCTURE_MESSAGE} ${queryIndexPath}`,
      );
      return null;
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_LOAD_INDEX_MESSAGE} ${entityType}`,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return null;
    }
  }

  /**
   * Save query index for an entity type (legacy format)
   */
  async saveQueryIndex(
    entityType: StaticEntityType,
    queryIndex: { entityType: string; queries: QueryIndexEntry[] },
  ): Promise<void> {
    try {
      const queryDir = join(this.dataPath, entityType, "queries");
      await mkdir(queryDir, { recursive: true });
      const queryIndexPath = join(queryDir, "index.json");
      const content = JSON.stringify(queryIndex, null, 2);
      await writeFile(queryIndexPath, content);
      logger.debug(
        LOG_CONTEXT_GENERAL,
        `${UPDATED_QUERY_INDEX_MESSAGE} ${entityType} with ${queryIndex.queries.length.toString()} queries`,
      );
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_SAVE_INDEX_MESSAGE} ${entityType}`,
        error,
        LOG_CONTEXT_GENERAL,
      );
    }
  }

  /**
   * Update query index when adding a new cached query
   */
  updateQueryIndex(
    _entityType: StaticEntityType,
    _queryDef: QueryDefinition,
    _metadata: { lastModified?: string; contentHash?: string },
  ): void {
    void _entityType; // Acknowledge unused parameters
    void _queryDef;
    void _metadata;
    // Note: Query indexes are handled separately from unified indexes
    // This method maintains the existing query index format for backward compatibility
    // You may want to consider migrating query indexes to the unified format as well
    logger.warn(
      LOG_CONTEXT_GENERAL,
      QUERY_INDEX_UPDATE_NOT_IMPLEMENTED_MESSAGE,
    );
  }

  /**
   * Check if two query definitions match (for duplicate detection)
   */
  private queryDefinitionsMatch(
    def1: QueryDefinition,
    def2: QueryDefinition,
  ): boolean {
    // Direct format matching
    if (this.directFormatMatch(def1, def2)) {
      return true;
    }

    // Cross-format matching
    return this.crossFormatMatch(def1, def2);
  }

  /**
   * Check for direct format matches (same format type)
   */
  private directFormatMatch(
    def1: QueryDefinition,
    def2: QueryDefinition,
  ): boolean {
    if (def1.params && def2.params) {
      return this.paramsMatch(def1.params, def2.params);
    }

    if (def1.encoded && def2.encoded) {
      return def1.encoded === def2.encoded;
    }

    if (def1.url && def2.url) {
      return def1.url === def2.url;
    }

    return false;
  }

  /**
   * Check for cross-format matches (different format types)
   */
  private crossFormatMatch(
    def1: QueryDefinition,
    def2: QueryDefinition,
  ): boolean {
    if (def1.params && def2.encoded) {
      return this.matchParamsWithEncoded(def1.params, def2.encoded);
    }

    if (def1.encoded && def2.params) {
      return this.matchParamsWithEncoded(def2.params, def1.encoded);
    }

    if (def1.params && def2.url) {
      return this.matchParamsWithUrl(def1.params, def2.url);
    }

    if (def1.url && def2.params) {
      return this.matchParamsWithUrl(def2.params, def1.url);
    }

    return false;
  }

  /**
   * Match params with encoded string
   */
  private matchParamsWithEncoded(
    params: Record<string, unknown>,
    encoded: string,
  ): boolean {
    const decoded = this.decodeQueryString(encoded);
    const validatedParams = this.validateQueryParams(decoded);
    return validatedParams ? this.paramsMatch(params, validatedParams) : false;
  }

  /**
   * Match params with URL
   */
  private matchParamsWithUrl(
    params: Record<string, unknown>,
    url: string,
  ): boolean {
    const urlParams = this.normalizeQueryParams(url);
    return this.paramsMatch(params, urlParams);
  }

  /**
   * List all cached queries with decoded information
   */
  async listCachedQueries(entityType: StaticEntityType): Promise<
    Array<{
      filename: string;
      decoded: Record<string, unknown> | null;
      contentHash?: string;
    }>
  > {
    try {
      const queryIndex = await this.loadQueryIndex(entityType);
      if (queryIndex) {
        return this.processQueryIndexEntries(queryIndex.queries);
      }

      return await this.scanQueryFilesFromFilesystem(entityType);
    } catch (error) {
      logError(
        logger,
        FAILED_TO_LIST_CACHED_QUERIES_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return [];
    }
  }

  /**
   * Process query index entries
   */
  private processQueryIndexEntries(queries: QueryIndexEntry[]): Array<{
    filename: string;
    decoded: Record<string, unknown> | null;
    contentHash?: string;
  }> {
    return queries.map((entry) => {
      const filename = this.generateFilenameFromQuery(entry.query);
      const decoded = this.extractQueryParams(entry.query);

      return {
        filename: filename ?? "unknown",
        decoded,
        ...(entry.contentHash !== undefined && {
          contentHash: entry.contentHash,
        }),
      };
    });
  }

  /**
   * Extract query parameters from query definition
   */
  private extractQueryParams(
    queryDef: QueryDefinition,
  ): Record<string, unknown> | null {
    if (queryDef.params) {
      return queryDef.params;
    }
    if (queryDef.encoded) {
      const decodedResult = this.decodeQueryString(queryDef.encoded);
      return this.validateQueryParams(decodedResult);
    }
    if (queryDef.url) {
      return this.normalizeQueryParams(queryDef.url);
    }
    return null;
  }

  /**
   * Scan query files from filesystem
   */
  private async scanQueryFilesFromFilesystem(
    entityType: StaticEntityType,
  ): Promise<
    Array<{
      filename: string;
      decoded: Record<string, unknown> | null;
      contentHash?: string;
    }>
  > {
    const queryDir = join(this.dataPath, entityType, "queries");
    const { readdir } = await import("fs/promises");
    const files = await readdir(queryDir);

    const results: Array<{
      filename: string;
      decoded: Record<string, unknown> | null;
      contentHash?: string;
    }> = [];

    for (const file of files) {
      if (file.endsWith(".json") && file !== "index.json") {
        const result = await this.processQueryFile(queryDir, file);
        if (result) results.push(result);
      }
    }

    return results;
  }

  /**
   * Process individual query file
   */
  private async processQueryFile(
    queryDir: string,
    file: string,
  ): Promise<{
    filename: string;
    decoded: Record<string, unknown> | null;
    contentHash?: string;
  } | null> {
    try {
      const filenameWithoutExt = file.replace(/\.json$/, "");
      const decodedUrl = decodeURIComponent(filenameWithoutExt);
      const decodedParams = this.normalizeQueryParams(decodedUrl);

      return {
        filename: file,
        decoded: decodedParams,
      };
    } catch (error) {
      logError(
        logger,
        `${FAILED_TO_DECODE_FILENAME_MESSAGE} ${file}`,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return null;
    }
  }

  /**
   * List all available entities of a type
   */
  async listEntities(entityType: StaticEntityType): Promise<string[]> {
    const index = await this.loadUnifiedIndex(entityType);
    if (!index) return [];

    // Map entity types to their ID prefixes
    const entityPrefixes: Record<StaticEntityType, string> = {
      works: "W",
      authors: "A",
      institutions: "I",
      topics: "T",
      publishers: "P",
      funders: "F",
    };

    const prefix = entityPrefixes[entityType];
    if (!prefix) return [];

    // Extract entity IDs from index keys, filtering by entity type
    const entityIds: string[] = [];
    for (const key of Object.keys(index)) {
      // Extract entity ID that matches the specific entity type
      const regex = new RegExp(`${prefix}\\d{8,10}`, "g");
      const matches = key.match(regex);
      if (matches) {
        for (const entityId of matches) {
          // Only add unique entity IDs
          if (!entityIds.includes(entityId)) {
            entityIds.push(entityId);
          }
        }
      }
    }

    return entityIds.sort();
  }

  /**
   * Search entities by display name
   */
  async searchEntities(
    entityType: StaticEntityType,
    searchTerm: string,
  ): Promise<{ id: string; display_name: string; [key: string]: unknown }[]> {
    const entityIds = await this.listEntities(entityType);
    const results: {
      id: string;
      display_name: string;
      [key: string]: unknown;
    }[] = [];

    for (const entityId of entityIds) {
      const entity = await this.loadEntity(entityType, entityId);
      if (
        entity?.display_name?.toLowerCase().includes(searchTerm?.toLowerCase())
      ) {
        results.push(entity);
      }
    }

    return results;
  }

  /**
   * Get statistics for all entity types
   */
  async getStatistics(): Promise<
    Record<string, { count: number; totalSize: number; lastModified: string }>
  > {
    const stats: Record<
      string,
      { count: number; totalSize: number; lastModified: string }
    > = {};

    for (const entityType of SUPPORTED_ENTITIES) {
      if (await this.hasStaticData(entityType)) {
        const index = await this.loadUnifiedIndex(entityType);
        if (index) {
          const entries = Object.values(index);
          const count = entries.length;

          // Calculate total size by examining the entity directory
          let totalSize = 0;
          try {
            const entityDir = join(this.dataPath, entityType);
            const files = await readdir(entityDir);
            for (const file of files) {
              if (file.endsWith(".json")) {
                const filePath = join(entityDir, file);
                const fileStat = await stat(filePath);
                totalSize += fileStat.size;
              }
            }
          } catch {
            // If we can't calculate size, use a default
            totalSize = count * 1000; // Rough estimate
          }

          const lastModified = entries.reduce<string | null>(
            (latest: string | null, entry: IndexEntry) => {
              const entryTime = entry.lastModified
                ? new Date(entry.lastModified).getTime()
                : 0;
              const latestTime = latest ? new Date(latest).getTime() : 0;
              return entryTime > latestTime
                ? entry.lastModified || latest
                : latest;
            },
            null,
          );

          stats[entityType] = {
            count,
            totalSize,
            lastModified: lastModified ?? new Date().toISOString(),
          };
        }
      }
    }

    return stats;
  }

  /**
   * Get synthetic cache statistics
   */
  getCacheStats(): Promise<CacheStats> {
    try {
      // TODO: Re-enable when openalex-client package is fixed
      // const stats = await this.cachedClient.getCacheStats();

      logger.warn(LOG_CONTEXT_GENERAL, CACHE_STATS_NOT_AVAILABLE_MESSAGE);
      return Promise.resolve({ enabled: false });
    } catch (error) {
      logError(
        logger,
        FAILED_TO_GET_CACHE_STATS_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return Promise.resolve({ enabled: false });
    }
  }

  /**
   * Get field coverage for an entity across all cache tiers
   */
  getFieldCoverage(
    _entityType: StaticEntityType,
    _entityId: string,
  ): Promise<FieldCoverageByTier> {
    void _entityType; // Acknowledge unused parameters
    void _entityId;
    // Simplified implementation for CLI - just return basic structure
    logger.warn(
      LOG_CONTEXT_GENERAL,
      FIELD_COVERAGE_ANALYSIS_NOT_AVAILABLE_MESSAGE,
    );
    return Promise.resolve({
      memory: [],
      localStorage: [],
      indexedDB: [],
      static: [],
      total: [],
    });
  }

  /**
   * Get well-populated entities with extensive field coverage
   */
  getWellPopulatedEntities(
    _entityType: StaticEntityType,
    _limit: number,
  ): Promise<
    Array<{
      entityId: string;
      fieldCount: number;
      fields: string[];
    }>
  > {
    void _entityType; // Acknowledge unused parameters
    void _limit;
    try {
      // TODO: Re-enable when synthetic cache is available
      logger.warn(
        LOG_CONTEXT_GENERAL,
        WELL_POPULATED_ENTITIES_ANALYSIS_NOT_AVAILABLE_MESSAGE,
      );
      return Promise.resolve([]);
    } catch (error) {
      logError(
        logger,
        FAILED_TO_GET_WELL_POPULATED_ENTITIES_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return Promise.resolve([]);
    }
  }

  /**
   * Get popular cached collections with high entity counts
   */
  getPopularCollections(_limit: number): Promise<
    Array<{
      queryKey: string;
      entityCount: number;
      pageCount: number;
    }>
  > {
    void _limit; // Acknowledge unused parameter
    try {
      // TODO: Re-enable when synthetic cache is available
      logger.warn(
        LOG_CONTEXT_GENERAL,
        POPULAR_COLLECTIONS_ANALYSIS_NOT_AVAILABLE_MESSAGE,
      );
      return Promise.resolve([]);
    } catch (error) {
      logError(
        logger,
        FAILED_TO_GET_POPULAR_COLLECTIONS_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return Promise.resolve([]);
    }
  }

  /**
   * Clear synthetic cache data
   */
  clearSyntheticCache(): Promise<void> {
    try {
      // TODO: Re-enable when openalex-client package is fixed
      // await this.cachedClient.clearCache();
      logger.warn(
        LOG_CONTEXT_GENERAL,
        SYNTHETIC_CACHE_CLEAR_NOT_AVAILABLE_MESSAGE,
      );
      return Promise.resolve();
    } catch (error) {
      logError(
        logger,
        FAILED_TO_CLEAR_SYNTHETIC_CACHE_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * Analyze static data cache usage patterns
   */
  async analyzeStaticDataUsage(): Promise<{
    entityDistribution: Record<string, number>;
    totalEntities: number;
    cacheHitPotential: number;
    recommendedForGeneration: string[];
    gaps: string[];
  }> {
    try {
      const stats = await this.getStatistics();
      const entityDistribution: Record<string, number> = {};
      let totalEntities = 0;

      // Analyze entity distribution
      for (const [entityType, data] of Object.entries(stats)) {
        entityDistribution[entityType] = data.count;
        totalEntities += data.count;
      }

      // Calculate cache hit potential based on available static data
      const syntheticStats = await this.getCacheStats();
      const memoryEntities = syntheticStats.storage?.memory?.entities ?? 0;
      const cacheHitPotential =
        totalEntities > 0 ? memoryEntities / totalEntities : 0;

      // Identify gaps and recommendations
      const gaps: string[] = [];
      const recommendedForGeneration: string[] = [];

      for (const entityType of SUPPORTED_ENTITIES) {
        const count = entityDistribution[entityType] ?? 0;
        if (count === 0) {
          gaps.push(`No static data for ${entityType}`);
        } else if (count < 100) {
          gaps.push(
            `Low coverage for ${entityType} (${count.toString()} entities)`,
          );
          recommendedForGeneration.push(entityType);
        } else {
          recommendedForGeneration.push(entityType);
        }
      }

      return {
        entityDistribution,
        totalEntities,
        cacheHitPotential,
        recommendedForGeneration,
        gaps,
      };
    } catch (error) {
      logError(
        logger,
        FAILED_TO_ANALYZE_STATIC_DATA_USAGE_MESSAGE,
        error,
        LOG_CONTEXT_GENERAL,
      );
      return {
        entityDistribution: {},
        totalEntities: 0,
        cacheHitPotential: 0,
        recommendedForGeneration: [],
        gaps: ["Analysis failed"],
      };
    }
  }

  /**
   * Generate optimized static data cache from usage patterns
   */
  async generateStaticDataFromPatterns(
    entityType?: StaticEntityType,
    options: { dryRun?: boolean; force?: boolean } = {},
  ): Promise<{
    filesProcessed: number;
    entitiesCached: number;
    queriesCached: number;
    errors: string[];
  }> {
    const result = this.initializeGenerationResult();

    try {
      const entityTypes = entityType ? [entityType] : SUPPORTED_ENTITIES;

      for (const type of entityTypes) {
        await this.processEntityTypeForGeneration(type, options, result);
      }
    } catch (error) {
      result.errors.push(`${GENERATION_FAILED_MESSAGE}: ${String(error)}`);
    }

    return result;
  }

  /**
   * Initialize generation result object
   */
  private initializeGenerationResult(): {
    filesProcessed: number;
    entitiesCached: number;
    queriesCached: number;
    errors: string[];
  } {
    return {
      filesProcessed: 0,
      entitiesCached: 0,
      queriesCached: 0,
      errors: [],
    };
  }

  /**
   * Process entity type for generation
   */
  private async processEntityTypeForGeneration(
    type: StaticEntityType,
    options: { dryRun?: boolean; force?: boolean },
    result: {
      filesProcessed: number;
      entitiesCached: number;
      queriesCached: number;
      errors: string[];
    },
  ): Promise<void> {
    try {
      await this.processWellPopulatedEntities(type, options, result);
      await this.processPopularCollections(type, options, result);
    } catch (error) {
      result.errors.push(
        `${FAILED_TO_PROCESS_ENTITY_TYPE_MESSAGE} ${type}: ${String(error)}`,
      );
    }
  }

  /**
   * Process well-populated entities
   */
  private async processWellPopulatedEntities(
    type: StaticEntityType,
    options: { dryRun?: boolean; force?: boolean },
    result: {
      filesProcessed: number;
      entitiesCached: number;
      queriesCached: number;
      errors: string[];
    },
  ): Promise<void> {
    const wellPopulated = await this.getWellPopulatedEntities(type, 50);

    for (const entityData of wellPopulated) {
      try {
        await this.processEntityForCaching(type, entityData, options, result);
        result.filesProcessed++;
      } catch (error) {
        result.errors.push(
          `${FAILED_TO_PROCESS_ENTITY_MESSAGE} ${entityData.entityId}: ${String(error)}`,
        );
      }
    }
  }

  /**
   * Process entity for caching
   */
  private async processEntityForCaching(
    type: StaticEntityType,
    entityData: { entityId: string; fieldCount: number; fields: string[] },
    options: { dryRun?: boolean; force?: boolean },
    result: {
      filesProcessed: number;
      entitiesCached: number;
      queriesCached: number;
      errors: string[];
    },
  ): Promise<void> {
    if (options.dryRun) {
      result.entitiesCached++;
      return;
    }

    const existing = await this.loadEntity(type, entityData.entityId);
    if (existing && !options.force) {
      return; // Skip if exists and not forcing
    }

    const entity = await this.fetchEntityForCaching(type, entityData);
    if (entity) {
      await this.saveEntityToCache(type, entity);
      result.entitiesCached++;
    }
  }

  /**
   * Fetch entity for caching (placeholder until client is fixed)
   */
  private async fetchEntityForCaching(
    _type: StaticEntityType,
    _entityData: { entityId: string; fieldCount: number; fields: string[] },
  ): Promise<{
    id: string;
    display_name: string;
    [key: string]: unknown;
  } | null> {
    // TODO: Re-enable when openalex-client package is fixed
    const entity: unknown = null; // Placeholder until client is fixed

    if (this.isValidEntityForCaching(entity)) {
      return this.normalizeEntityForCaching(entity);
    }
    return null;
  }

  /**
   * Check if entity is valid for caching
   */
  private isValidEntityForCaching(entity: unknown): entity is {
    id: string;
    display_name: string;
    [key: string]: unknown;
  } {
    return Boolean(
      entity &&
        typeof entity === "object" &&
        "id" in entity &&
        "display_name" in entity &&
        typeof (entity as Record<string, unknown>)["id"] === "string" &&
        typeof (entity as Record<string, unknown>)["display_name"] === "string",
    );
  }

  /**
   * Normalize entity for caching
   */
  private normalizeEntityForCaching(entity: {
    id: string;
    display_name: string;
    [key: string]: unknown;
  }): {
    id: string;
    display_name: string;
    [key: string]: unknown;
  } {
    return {
      id: entity.id,
      display_name: entity.display_name,
      ...Object.fromEntries(
        Object.entries(entity).filter(
          ([key]) => key !== "id" && key !== "display_name",
        ),
      ),
    };
  }

  /**
   * Process popular collections
   */
  private async processPopularCollections(
    type: StaticEntityType,
    options: { dryRun?: boolean; force?: boolean },
    result: {
      filesProcessed: number;
      entitiesCached: number;
      queriesCached: number;
      errors: string[];
    },
  ): Promise<void> {
    const popularCollections = await this.getPopularCollections(10);

    for (const collection of popularCollections) {
      try {
        if (
          options.dryRun ||
          this.isCollectionForEntityType(collection, type)
        ) {
          result.queriesCached++;
        }
      } catch (error) {
        result.errors.push(
          `${FAILED_TO_PROCESS_COLLECTION_MESSAGE} ${collection.queryKey}: ${String(error)}`,
        );
      }
    }
  }

  /**
   * Check if collection is for the specified entity type
   */
  private isCollectionForEntityType(
    collection: { queryKey: string; entityCount: number; pageCount: number },
    type: StaticEntityType,
  ): boolean {
    const entityTypeMatch = collection.queryKey.match(/^(\w+)\|/);
    return entityTypeMatch ? entityTypeMatch[1] === type : false;
  }
}

// Export types for testing
export { SUPPORTED_ENTITIES };
export type { CacheOptions, IndexEntry, QueryOptions, UnifiedIndex };
