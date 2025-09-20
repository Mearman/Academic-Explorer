/**
 * OpenAlex CLI Client Class
 * Separated for better testability
 */

import { readFile, access, writeFile, mkdir, readdir, stat } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { generateContentHash } from "../lib/utils/query-hash.js";
import type { OpenAlexEntity, EntityType, OpenAlexResponse } from "../lib/openalex/types.js";
import type { StaticEntityType } from "../lib/api/static-data-provider.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";
import { CachedOpenAlexClient } from "../lib/openalex/cached-client.js";
import type {
  FieldCoverageByTier,
  EntityFieldData,
  CollectionResultMapping
} from "../lib/cache/synthetic/types.js";

// Zod schemas for safe type validation
const EntityIndexEntrySchema = z.object({
  $ref: z.string(),
  lastModified: z.string(),
  contentHash: z.string(),
});

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

// Static entity type schema for safe validation (matching StaticEntityType exactly)
const StaticEntityTypeSchema = z.enum(["authors", "works", "institutions", "topics", "publishers", "funders"]);

// Type derived from schema
type IndexEntry = z.infer<typeof EntityIndexEntrySchema>;
type UnifiedIndex = z.infer<typeof UnifiedIndexSchema>;

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
const OpenAlexEntitySchema = z.object({
  id: z.string(),
  display_name: z.string(),
}).catchall(z.unknown());

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

// Schema for OpenAlex API response meta object
const MetaSchema = z.object({
  count: z.number().optional(),
  db_response_time_ms: z.number().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
}).strict(); // Strict validation for meta properties


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
const STATIC_DATA_PATH = "public/data/openalex";
const SUPPORTED_ENTITIES: readonly StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"] as const;

// Helper functions for canonical URL handling
function generateCanonicalEntityUrl(entityType: StaticEntityType, entityId: string): string {
  const cleanId = entityId.replace("https://openalex.org/", "");
  return `https://api.openalex.org/${entityType}/${cleanId}`;
}

function extractEntityIdFromCanonicalUrl(canonicalUrl: string): string | null {
  const match = canonicalUrl.match(/https:\/\/api\.openalex\.org\/[^/]+\/(.+)$/);
  return match ? match[1] : null;
}

function extractEntityTypeFromCanonicalUrl(canonicalUrl: string): StaticEntityType | null {
  const match = canonicalUrl.match(/https:\/\/api\.openalex\.org\/([^/]+)\//);
  const entityType = match ? match[1] : null;
  const validationResult = StaticEntityTypeSchema.safeParse(entityType);
  return validationResult.success ? validationResult.data : null;
}

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
  private cachedClient: CachedOpenAlexClient;
  // defaultFilenameFormat removed - now using URL encoding only

  constructor(dataPath?: string) {
    this.dataPath = dataPath || join(projectRoot, STATIC_DATA_PATH);
    this.cachedClient = new CachedOpenAlexClient();
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
   * Save entity to static cache and update unified index
   */
  async saveEntityToCache(entityType: StaticEntityType, entity: { id: string; display_name: string; [key: string]: unknown }): Promise<void> {
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
        if (existingIndex && existingIndex[canonicalUrl]) {
          existingContentHash = existingIndex[canonicalUrl].contentHash;
          existingLastModified = existingIndex[canonicalUrl].lastModified;
        }
      } catch {
        // Index doesn't exist or can't be read - treat as new content
      }

      const contentChanged = existingContentHash !== newContentHash;

      if (contentChanged) {
        await writeFile(entityPath, newContent);
        console.error(`Saved ${entityType}/${filename} to cache (content changed)`);

        // Update unified index with new lastModified timestamp
        const indexEntry: IndexEntry = {
          $ref: `./${filename}`,
          lastModified: new Date().toISOString(),
          contentHash: newContentHash,
        };

        await this.updateUnifiedIndex(entityType, canonicalUrl, indexEntry);
      } else {
        console.error(`Skipped ${entityType}/${filename} - no content changes`);

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
      console.error(`Failed to save entity to cache:`, error);
    }
  }

  /**
   * Query with cache control
   */
  async queryWithCache(entityType: StaticEntityType, queryOptions: QueryOptions, cacheOptions: CacheOptions): Promise<unknown> {
    // Generate URL from query options
    const url = this.buildQueryUrl(entityType, queryOptions);

    // Try cache first if enabled
    if (cacheOptions.useCache || cacheOptions.cacheOnly) {
      const cached = await this.loadQuery(entityType, url);
      if (cached) {
        console.error(`Query cache hit for parameters`);
        return cached;
      }

      if (cacheOptions.cacheOnly) {
        console.error(`Cache-only mode: no matching query found in cache`);
        return null;
      }
    }

    // Fetch from API if cache miss and not cache-only
    if (!cacheOptions.cacheOnly) {
      try {
        const apiResult = await this.fetchFromAPI(entityType, queryOptions);

        // Save to cache if enabled
        if (cacheOptions.saveToCache) {
          await this.saveQueryToCache(entityType, url, queryOptions, apiResult, cacheOptions);
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
  async saveQueryToCache(entityType: StaticEntityType, url: string, queryOptions: QueryOptions, result: unknown, cacheOptions?: CacheOptions): Promise<void> {
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
        const queryIndexPath = join(queryDir, "index.json");
        const { readFile } = await import("fs/promises");
        const queryIndexContent = await readFile(queryIndexPath, "utf-8");
        const queryIndex = JSON.parse(queryIndexContent);

        // Find existing entry for this URL
        const existingEntry = queryIndex.queries?.find((entry: QueryIndexEntry) =>
          entry.query && entry.query.url === url
        );

        if (existingEntry) {
          existingContentHash = existingEntry.contentHash;
          existingLastModified = existingEntry.lastModified;
        }
      } catch {
        // Query index doesn't exist or can't be read - treat as new content
      }

      const contentChanged = existingContentHash !== newContentHash;

      if (contentChanged) {
        await writeFile(queryPath, newContent);
        console.error(`Saved query ${filename} to cache (content changed)`);

        // Create query definition with URL only (params parsing removed)
        const queryDef: QueryDefinition = { url };

        // Update query index with new lastModified timestamp
        this.updateQueryIndex(entityType, queryDef, {
          lastModified: new Date().toISOString(),
          contentHash: newContentHash,
        });
      } else {
        console.error(`Skipped query ${filename} - no content changes`);

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
  async getEntitySummary(entityType: StaticEntityType): Promise<{ entityType: string; count: number; entities: string[] } | null> {
    try {
      const unifiedIndex = await this.loadUnifiedIndex(entityType);
      if (!unifiedIndex) return null;

      // Transform unified index to summary format for integration tests
      const entities: string[] = [];

      for (const [key, _entry] of Object.entries(unifiedIndex)) {
        // Extract entity IDs from the unified index keys
        const match = key.match(/\/([AWISTPFC]\d+)(?:\?|$)/);
        if (match) {
          const entityId = match[1];
          if (!entities.includes(entityId)) {
            entities.push(entityId);
          }
        }
      }

      return {
        entityType,
        count: entities.length,
        entities: entities.sort()
      };
    } catch (error) {
      logger.error("general", `Failed to load entity summary for ${entityType}`, { error });
      return null;
    }
  }

  /**
   * Load unified index for entity type
   */
  async loadUnifiedIndex(entityType: StaticEntityType): Promise<UnifiedIndex | null> {
    try {
      const indexPath = join(this.dataPath, entityType, "index.json");
      const indexContent = await readFile(indexPath, "utf-8");
      const parsed = JSON.parse(indexContent);

      // Validate using Zod schema
      const validationResult = UnifiedIndexSchema.safeParse(parsed);
      if (validationResult.success) {
        return validationResult.data;
      }

      logger.error("general", `Invalid unified index format for ${entityType}`, {
        error: validationResult.error.issues,
      });
      return null;
    } catch (error) {
      logger.error("general", `Failed to load unified index for ${entityType}`, { error });
      return null;
    }
  }

  /**
   * Save unified index for entity type
   */
  async saveUnifiedIndex(entityType: StaticEntityType, index: UnifiedIndex): Promise<void> {
    try {
      const entityDir = join(this.dataPath, entityType);
      await mkdir(entityDir, { recursive: true });
      const indexPath = join(entityDir, "index.json");
      const content = JSON.stringify(index, null, 2);
      await writeFile(indexPath, content);
      console.error(`Updated unified index for ${entityType} with ${Object.keys(index).length} entries`);
    } catch (error) {
      console.error(`Failed to save unified index for ${entityType}:`, error);
    }
  }

  /**
   * Update unified index with new entry
   */
  async updateUnifiedIndex(entityType: StaticEntityType, canonicalUrl: string, entry: IndexEntry): Promise<void> {
    let index = await this.loadUnifiedIndex(entityType);
    if (!index) {
      index = {};
    }

    index[canonicalUrl] = entry;
    await this.saveUnifiedIndex(entityType, index);
  }

  /**
   * Load entity by ID
   */
  async loadEntity(entityType: StaticEntityType, entityId: string): Promise<{ id: string; display_name: string; [key: string]: unknown } | null> {
    try {
      // Load index first to find the actual file path
      const indexPath = join(this.dataPath, entityType, "index.json");
      const indexContent = await readFile(indexPath, "utf-8");
      const index = JSON.parse(indexContent);

      // Find the entity entry in the index
      let entityEntry: { $ref: string; lastModified: string; contentHash: string } | null = null;
      const canonicalUrl = generateCanonicalEntityUrl(entityType, entityId);

      // Check if the canonical URL exists directly in the index
      if (index[canonicalUrl]) {
        const validationResult = EntityIndexEntrySchema.safeParse(index[canonicalUrl]);
        if (validationResult.success) {
          entityEntry = validationResult.data;
        }
      } else {
        // Search for entity ID in all keys (may be in different URL formats)
        if (typeof index === "object" && index !== null && !Array.isArray(index)) {
          // Type guard: check if object has string keys
          const hasStringKeys = Object.prototype.toString.call(index) === "[object Object]";
          if (hasStringKeys) {
            for (const key in index) {
              if (Object.prototype.hasOwnProperty.call(index, key)) {
                const data = index[key];
                // Extract entity ID from the key and compare
                const match = key.match(/[WASITCPFKG]\d{8,10}/);
                if (match && match[0] === entityId) {
                  // Validate data structure with Zod
                  const validationResult = EntityIndexEntrySchema.safeParse(data);
                  if (validationResult.success) {
                    entityEntry = validationResult.data;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if (!entityEntry || !entityEntry.$ref) {
        return null;
      }

      // Construct actual file path from $ref
      const entityPath = join(this.dataPath, entityType, entityEntry.$ref.startsWith("./") ? entityEntry.$ref.substring(2) : entityEntry.$ref);
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
   * Load query result by matching query parameters (transparently reads both formats)
   */
  async loadQuery(entityType: StaticEntityType, queryUrl: string): Promise<unknown | null> {
    try {
      // Extract target query parameters
      const targetParams = this.normalizeQueryParams(queryUrl);

      // Try query index for faster lookup first
      const queryIndex = await this.loadQueryIndex(entityType);
      if (queryIndex) {
        for (const queryEntry of queryIndex.queries) {
          if (this.queryMatches(queryUrl, queryEntry.query)) {
            // Generate filename from the query definition
            const filename = this.generateFilenameFromQuery(queryEntry.query);
            if (filename) {
              const queryPath = join(this.dataPath, entityType, "queries", filename);
              try {
                const queryContent = await readFile(queryPath, "utf-8");
                console.error(`Found query via index: ${filename}`);
                return JSON.parse(queryContent);
              } catch (error) {
                console.error(`Index pointed to missing file: ${filename}`, error);
                continue; // Try next match
              }
            }
          }
        }
      }

      // Fallback: scan directory for matching files (both formats)
      const queryDir = join(this.dataPath, entityType, "queries");
      try {
        const { readdir } = await import("fs/promises");
        const files = await readdir(queryDir);
        const queryFiles = files.filter(f => f.endsWith(".json") && f !== "index.json");

        for (const filename of queryFiles) {
          try {
            // Decode URL-encoded filename (remove .json extension first)
            const filenameWithoutExt = filename.replace(/\.json$/, "");
            const decodedUrl = decodeURIComponent(filenameWithoutExt);
            const decodedParams = this.normalizeQueryParams(decodedUrl);

            if (this.paramsMatch(targetParams, decodedParams)) {
              const queryPath = join(queryDir, filename);
              try {
                const queryContent = await readFile(queryPath, "utf-8");
                console.error(`Found query via filename scan: ${filename}`);
                return JSON.parse(queryContent);
              } catch (error) {
                console.error(`Failed to read cached query ${filename}:`, error);
                continue;
              }
            }
          } catch (error) {
            // Failed to decode filename, skip this file
            console.error(`Failed to decode filename ${filename}:`, error);
            continue;
          }
        }
      } catch (error) {
        // Query directory doesn't exist
        console.error(`Query directory not found: ${queryDir}`);
        return null;
      }

      console.error(`No cached query found matching parameters`);
      return null;
    } catch (error) {
      console.error(`Failed to load query:`, error);
      return null;
    }
  }

  /**
   * Normalize query parameters for comparison
   */
  private normalizeQueryParams(url: string): Record<string, unknown> {
    try {
      const urlObj = new URL(url);
      const params: Record<string, unknown> = {};

      for (const [key, value] of urlObj.searchParams) {
        // Normalize known parameters
        if (key === "select" && typeof value === "string") {
          params[key] = value.split(",").map(v => v.trim()).sort(); // Sort for consistent comparison
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
  private paramsMatch(target: Record<string, unknown>, candidate: Record<string, unknown>): boolean {
    const targetKeys = Object.keys(target).sort();
    const candidateKeys = Object.keys(candidate).sort();

    // Must have same keys
    if (targetKeys.length !== candidateKeys.length ||
        !targetKeys.every(key => candidateKeys.includes(key))) {
      return false;
    }

    // Check each value
    for (const key of targetKeys) {
      const targetVal = target[key];
      const candidateVal = candidate[key];

      // Handle arrays (like select fields)
      if (Array.isArray(targetVal) && Array.isArray(candidateVal)) {
        if (targetVal.length !== candidateVal.length ||
            !targetVal.every(v => candidateVal.includes(v))) {
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
      } catch (error) {
        // Continue to next matching method
      }
    }

    // If query definition has URL, extract params and match
    if (queryDef.url) {
      try {
        const urlParams = this.normalizeQueryParams(queryDef.url);
        return this.paramsMatch(targetParams, urlParams);
      } catch (error) {
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
      const jsonString = Buffer.from(cleanEncoded, "base64url").toString("utf-8");
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate and convert decoded result to Record<string, unknown>
   */
  private validateQueryParams(decoded: unknown): Record<string, unknown> | null {
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
      return queryDef.encoded.endsWith(".json") ? queryDef.encoded : `${queryDef.encoded}.json`;
    }

    // If params are available, generate encoded filename from params
    if (queryDef.params) {
      try {
        const encoded = Buffer.from(JSON.stringify(queryDef.params)).toString("base64url");
        return `${encoded}.json`;
      } catch (error) {
        return null;
      }
    }

    // If URL is available, extract params and generate encoded filename
    if (queryDef.url) {
      try {
        const params = this.normalizeQueryParams(queryDef.url);
        const encoded = Buffer.from(JSON.stringify(params)).toString("base64url");
        return `${encoded}.json`;
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Load query index for an entity type (legacy format)
   */
  async loadQueryIndex(entityType: StaticEntityType): Promise<{ entityType: string; queries: QueryIndexEntry[] } | null> {
    try {
      const queryIndexPath = join(this.dataPath, entityType, "queries", "index.json");
      const indexContent = await readFile(queryIndexPath, "utf-8");
      const parsed = JSON.parse(indexContent);

      // Validate with Zod schema
      const validationResult = QueryIndexSchema.safeParse(parsed);
      if (validationResult.success) {
        return validationResult.data;
      }

      console.warn(`Invalid query index structure in ${queryIndexPath}`);
      return null;
    } catch (error) {
      console.error(`Failed to load query index for ${entityType}:`, error);
      return null;
    }
  }

  /**
   * Save query index for an entity type (legacy format)
   */
  async saveQueryIndex(entityType: StaticEntityType, queryIndex: { entityType: string; queries: QueryIndexEntry[] }): Promise<void> {
    try {
      const queryDir = join(this.dataPath, entityType, "queries");
      await mkdir(queryDir, { recursive: true });
      const queryIndexPath = join(queryDir, "index.json");
      const content = JSON.stringify(queryIndex, null, 2);
      await writeFile(queryIndexPath, content);
      console.error(`Updated query index for ${entityType} with ${queryIndex.queries.length} queries`);
    } catch (error) {
      console.error(`Failed to save query index for ${entityType}:`, error);
    }
  }

  /**
   * Update query index when adding a new cached query
   */
  updateQueryIndex(entityType: StaticEntityType, queryDef: QueryDefinition, metadata: { lastModified?: string; contentHash?: string }): void {
    // Note: Query indexes are handled separately from unified indexes
    // This method maintains the existing query index format for backward compatibility
    // You may want to consider migrating query indexes to the unified format as well
    console.error(`Query index update not implemented for unified format yet`);
  }

  /**
   * Check if two query definitions match (for duplicate detection)
   */
  private queryDefinitionsMatch(def1: QueryDefinition, def2: QueryDefinition): boolean {
    // If both have params, compare params
    if (def1.params && def2.params) {
      return this.paramsMatch(def1.params, def2.params);
    }

    // If both have encoded, compare encoded
    if (def1.encoded && def2.encoded) {
      return def1.encoded === def2.encoded;
    }

    // If both have URL, compare URLs
    if (def1.url && def2.url) {
      return def1.url === def2.url;
    }

    // Try cross-format matching
    if (def1.params && def2.encoded) {
      const decoded = this.decodeQueryString(def2.encoded);
      const validatedParams = this.validateQueryParams(decoded);
      return validatedParams ? this.paramsMatch(def1.params, validatedParams) : false;
    }

    if (def1.encoded && def2.params) {
      const decoded = this.decodeQueryString(def1.encoded);
      const validatedParams = this.validateQueryParams(decoded);
      return validatedParams ? this.paramsMatch(validatedParams, def2.params) : false;
    }

    if (def1.params && def2.url) {
      const urlParams = this.normalizeQueryParams(def2.url);
      return this.paramsMatch(def1.params, urlParams);
    }

    if (def1.url && def2.params) {
      const urlParams = this.normalizeQueryParams(def1.url);
      return this.paramsMatch(urlParams, def2.params);
    }

    return false;
  }

  /**
   * List all cached queries with decoded information
   */
  async listCachedQueries(entityType: StaticEntityType): Promise<Array<{filename: string, decoded: Record<string, unknown> | null, contentHash?: string}>> {
    try {
      // Use query index for comprehensive information
      const queryIndex = await this.loadQueryIndex(entityType);
      if (queryIndex) {
        return await Promise.resolve(queryIndex.queries.map((entry: QueryIndexEntry) => {
          const filename = this.generateFilenameFromQuery(entry.query);
          let decoded: Record<string, unknown> | null = null;

          // Extract parameters from query definition
          if (entry.query.params) {
            decoded = entry.query.params;
          } else if (entry.query.encoded) {
            const decodedResult = this.decodeQueryString(entry.query.encoded);
            decoded = this.validateQueryParams(decodedResult);
          } else if (entry.query.url) {
            decoded = this.normalizeQueryParams(entry.query.url);
          }

          return {
            filename: filename || "unknown",
            decoded,
            contentHash: entry.contentHash
          };
        }));
      }

      // Fallback to file system scan if no index
      const queryDir = join(this.dataPath, entityType, "queries");
      const { readdir } = await import("fs/promises");
      const files = await readdir(queryDir);

      const results: Array<{filename: string, decoded: Record<string, unknown> | null, contentHash?: string}> = [];

      for (const file of files) {
        if (file.endsWith(".json") && file !== "index.json") {
          try {
            // Decode URL-encoded filename (remove .json extension first)
            const filenameWithoutExt = file.replace(/\.json$/, "");
            const decodedUrl = decodeURIComponent(filenameWithoutExt);
            const decodedParams = this.normalizeQueryParams(decodedUrl);

            results.push({
              filename: file,
              decoded: decodedParams,
              contentHash: undefined // No content hash without index
            });
          } catch (error) {
            // Failed to decode filename, skip this file
            console.error(`Failed to decode filename ${file}:`, error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error(`Failed to list cached queries:`, error);
      return [];
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
      funders: "F"
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

          const lastModified = entries.reduce<string | null>((latest: string | null, entry: IndexEntry) => {
            const entryTime = entry.lastModified ? new Date(entry.lastModified).getTime() : 0;
            const latestTime = latest ? new Date(latest).getTime() : 0;
            return entryTime > latestTime ? (entry.lastModified || latest) : latest;
          }, null);

          stats[entityType] = {
            count,
            totalSize,
            lastModified: lastModified || new Date().toISOString(),
          };
        }
      }
    }

    return stats;
  }

  /**
   * Get synthetic cache statistics
   */
  async getCacheStats(): Promise<unknown> {
    try {
      return await this.cachedClient.getCacheStats();
    } catch (error) {
      logger.error("general", "Failed to get cache stats", { error });
      return { enabled: false, error: "Cache stats unavailable" };
    }
  }

  /**
   * Get field coverage for an entity across all cache tiers
   */
  async getFieldCoverage(entityType: StaticEntityType, entityId: string): Promise<FieldCoverageByTier> {
    try {
      // Create a synthetic cache layer instance to access the method
      const { createSyntheticCacheLayer } = await import("../lib/cache/synthetic/index.js");
      const syntheticCache = createSyntheticCacheLayer();

      // Check if entity type is supported by synthetic cache
      const supportedTypes = ["works", "authors", "sources", "institutions", "topics", "publishers", "funders"];
      if (!supportedTypes.includes(entityType)) {
        logger.warn("general", `Entity type ${entityType} not supported by synthetic cache`);
        return {
          memory: [],
          localStorage: [],
          indexedDB: [],
          static: [],
          total: []
        };
      }

      return await syntheticCache.getFieldCoverage(entityType, entityId);
    } catch (error) {
      logger.error("general", "Failed to get field coverage", { error });
      return {
        memory: [],
        localStorage: [],
        indexedDB: [],
        static: [],
        total: []
      };
    }
  }

  /**
   * Get well-populated entities with extensive field coverage
   */
  async getWellPopulatedEntities(entityType: StaticEntityType, limit: number): Promise<Array<{
    entityId: string;
    fieldCount: number;
    fields: string[];
  }>> {
    try {
      // Create synthetic cache components to access the method
      const { EntityFieldAccumulator, createDefaultCachePolicy } = await import("../lib/cache/synthetic/index.js");
      const policy = createDefaultCachePolicy();
      const fieldAccumulator = new EntityFieldAccumulator(policy);

      // Check if entity type is supported by synthetic cache
      const supportedTypes = ["works", "authors", "sources", "institutions", "topics", "publishers", "funders"];
      if (!supportedTypes.includes(entityType)) {
        logger.warn("general", `Entity type ${entityType} not supported by synthetic cache`);
        return [];
      }

      return fieldAccumulator.getWellPopulatedEntities(entityType, limit);
    } catch (error) {
      logger.error("general", "Failed to get well-populated entities", { error });
      return [];
    }
  }

  /**
   * Get popular cached collections with high entity counts
   */
  async getPopularCollections(limit: number): Promise<Array<{
    queryKey: string;
    entityCount: number;
    pageCount: number;
  }>> {
    try {
      // Create synthetic cache components to access the method
      const { CollectionResultMapper, createDefaultCachePolicy } = await import("../lib/cache/synthetic/index.js");
      const policy = createDefaultCachePolicy();
      const collectionMapper = new CollectionResultMapper(policy);

      return collectionMapper.getPopularCollections(limit);
    } catch (error) {
      logger.error("general", "Failed to get popular collections", { error });
      return [];
    }
  }

  /**
   * Clear synthetic cache data
   */
  async clearSyntheticCache(): Promise<void> {
    try {
      await this.cachedClient.clearCache();
      logger.debug("general", "Synthetic cache cleared via CLI");
    } catch (error) {
      logger.error("general", "Failed to clear synthetic cache", { error });
      throw error;
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
      const memoryEntities = syntheticStats.storage?.memory?.entities || 0;
      const cacheHitPotential = totalEntities > 0 ? memoryEntities / totalEntities : 0;

      // Identify gaps and recommendations
      const gaps: string[] = [];
      const recommendedForGeneration: string[] = [];

      for (const entityType of SUPPORTED_ENTITIES) {
        const count = entityDistribution[entityType] || 0;
        if (count === 0) {
          gaps.push(`No static data for ${entityType}`);
        } else if (count < 100) {
          gaps.push(`Low coverage for ${entityType} (${count} entities)`);
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
        gaps
      };
    } catch (error) {
      logger.error("general", "Failed to analyze static data usage", { error });
      return {
        entityDistribution: {},
        totalEntities: 0,
        cacheHitPotential: 0,
        recommendedForGeneration: [],
        gaps: ["Analysis failed"]
      };
    }
  }

  /**
   * Generate optimized static data cache from usage patterns
   */
  async generateStaticDataFromPatterns(
    entityType?: StaticEntityType,
    options: { dryRun?: boolean; force?: boolean } = {}
  ): Promise<{
    filesProcessed: number;
    entitiesCached: number;
    queriesCached: number;
    errors: string[];
  }> {
    const result = {
      filesProcessed: 0,
      entitiesCached: 0,
      queriesCached: 0,
      errors: []
    };

    try {
      const entityTypes = entityType ? [entityType] : SUPPORTED_ENTITIES;

      for (const type of entityTypes) {
        try {
          // Get well-populated entities from synthetic cache
          const wellPopulated = await this.getWellPopulatedEntities(type, 50);

          for (const entityData of wellPopulated) {
            try {
              if (!options.dryRun) {
                // Check if entity exists in static cache already
                const existing = await this.loadEntity(type, entityData.entityId);
                if (existing && !options.force) {
                  continue; // Skip if exists and not forcing
                }

                // Fetch entity from cached client (will use synthetic cache)
                const entityTypeForClient = type;
                const entity = await this.cachedClient.getById(
                  type, // endpoint
                  entityData.entityId,
                  { select: entityData.fields } // only fetch fields we know about
                );

                if (entity && typeof entity === "object" && "id" in entity && "display_name" in entity) {
                  await this.saveEntityToCache(type, entity);
                  result.entitiesCached++;
                }
              } else {
                result.entitiesCached++; // Dry run counting
              }

              result.filesProcessed++;
            } catch (error) {
              result.errors.push(`Failed to process entity ${entityData.entityId}: ${String(error)}`);
            }
          }

          // Generate popular collections
          const popularCollections = await this.getPopularCollections(10);
          for (const collection of popularCollections) {
            try {
              if (!options.dryRun) {
                // Extract entity type and query params from collection query key
                const entityTypeMatch = collection.queryKey.match(/^(\w+)\|/);
                if (entityTypeMatch && entityTypeMatch[1] === type) {
                  // This is a collection for the current entity type
                  // We could regenerate the query, but for now just count it
                  result.queriesCached++;
                }
              } else {
                result.queriesCached++; // Dry run counting
              }
            } catch (error) {
              result.errors.push(`Failed to process collection ${collection.queryKey}: ${String(error)}`);
            }
          }
        } catch (error) {
          result.errors.push(`Failed to process entity type ${type}: ${String(error)}`);
        }
      }
    } catch (error) {
      result.errors.push(`Generation failed: ${String(error)}`);
    }

    return result;
  }
}

// Export types for testing
export type { UnifiedIndex, IndexEntry, QueryOptions, CacheOptions };
export { SUPPORTED_ENTITIES };