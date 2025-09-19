/**
 * OpenAlex CLI Client Class
 * Separated for better testability
 */

import { readFile, access, writeFile, mkdir } from "fs/promises";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
  generateQueryFilename,
  decodeQueryFilenameUniversal,
  generateContentHash,
  parseQueryParams,
  type QueryFilenameFormat
} from "../lib/utils/query-hash.js";
import type { OpenAlexEntity, EntityType, OpenAlexResponse } from "../lib/openalex/types.js";
import type { StaticEntityType } from "../lib/api/static-data-provider.js";
import { z } from "zod";

// Unified index structure (key-value pairs with canonical URLs as keys)
const IndexEntrySchema = z.object({
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
  resultCount: z.number().optional(),
});

const UnifiedIndexSchema = z.record(z.string(), IndexEntrySchema);

// Type derived from schema
type IndexEntry = z.infer<typeof IndexEntrySchema>;
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
  resultCount?: number;
}

const QueryDefinitionSchema = z.object({
  params: z.record(z.string(), z.unknown()).optional(),
  encoded: z.string().optional(),
  url: z.string().optional(),
});

const QueryIndexEntrySchema = z.object({
  query: QueryDefinitionSchema,
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
  resultCount: z.number().optional(),
});

// Type guards
function hasProperty<T extends string>(obj: object, prop: T): obj is Record<T, unknown> {
  return prop in obj;
}

function isUnifiedIndex(obj: unknown): obj is UnifiedIndex {
  if (typeof obj !== "object" || obj === null) return false;

  // Check if all values are IndexEntry-compatible objects
  for (const [key, value] of Object.entries(obj)) {
    if (typeof key !== "string") return false;
    if (typeof value !== "object" || value === null) return false;

    const entry = value as Record<string, unknown>;
    if (hasProperty(entry, "lastModified") && typeof entry.lastModified !== "string") return false;
    if (hasProperty(entry, "contentHash") && typeof entry.contentHash !== "string") return false;
    if (hasProperty(entry, "resultCount") && typeof entry.resultCount !== "number") return false;
  }

  return true;
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
  filenameFormat?: QueryFilenameFormat;
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
  return SUPPORTED_ENTITIES.includes(entityType as StaticEntityType) ? (entityType as StaticEntityType) : null;
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
  private defaultFilenameFormat: QueryFilenameFormat = 'encoded';

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
   * Save entity to static cache and update unified index
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

        // Update unified index
        const canonicalUrl = generateCanonicalEntityUrl(entityType, entityId);
        const { stat } = await import("fs/promises");
        const stats = await stat(entityPath);
        const contentHash = await generateContentHash(newContent);

        const indexEntry: IndexEntry = {
          lastModified: stats.mtime.toISOString(),
          contentHash,
        };

        await this.updateUnifiedIndex(entityType, canonicalUrl, indexEntry);
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

      // Generate filename based on configured format and cache options
      const filenameFormat = cacheOptions?.filenameFormat || this.defaultFilenameFormat;
      const filename = await generateQueryFilename(url, filenameFormat);
      const queryPath = join(queryDir, `${filename}.json`);

      const newContent = JSON.stringify(result, null, 2);

      if (await hasContentChanged(queryPath, newContent)) {
        await writeFile(queryPath, newContent);
        console.error(`Saved query ${filename} to cache (content changed)`);

        // Get file stats for index entry
        const { stat } = await import("fs/promises");
        const stats = await stat(queryPath);

        // Generate content hash
        const contentHash = await generateContentHash(newContent);

        // Extract result count if available
        let resultCount: number | undefined;
        if (typeof result === "object" && result !== null && "meta" in result) {
          const meta = (result as any).meta;
          if (typeof meta === "object" && meta !== null && "count" in meta) {
            resultCount = meta.count;
          }
        }

        // Parse query parameters for index
        const params = parseQueryParams(url);

        // Create query definition
        const queryDef: QueryDefinition = { params, url };

        // Update query index
        const indexEntry: QueryIndexEntry = {
          query: queryDef,
          resultCount,
          lastModified: stats.mtime.toISOString(),
          contentHash,
        };

        await this.updateQueryIndex(entityType, queryDef, {
          resultCount,
          lastModified: stats.mtime.toISOString(),
          contentHash,
        });
      } else {
        console.error(`Skipped query ${filename} - no content changes`);
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
   * Set the default filename format for cached queries
   */
  setFilenameFormat(format: QueryFilenameFormat): void {
    this.defaultFilenameFormat = format;
    console.error(`Filename format set to: ${format}`);
  }

  /**
   * Get the current filename format
   */
  getFilenameFormat(): QueryFilenameFormat {
    return this.defaultFilenameFormat;
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
   * Load unified index for entity type
   */
  async loadUnifiedIndex(entityType: StaticEntityType): Promise<UnifiedIndex | null> {
    try {
      const indexPath = join(this.dataPath, entityType, "index.json");
      const indexContent = await readFile(indexPath, "utf-8");
      const parsed = JSON.parse(indexContent);

      // Validate using type guard
      if (isUnifiedIndex(parsed)) {
        return parsed;
      }

      console.error(`Invalid unified index format for ${entityType}`);
      return null;
    } catch (error) {
      console.error(`Failed to load unified index for ${entityType}:`, error);
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
            const filename = await this.generateFilenameFromQuery(queryEntry.query);
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
        const queryFiles = files.filter(f => f.endsWith('.json') && f !== 'index.json');

        for (const filename of queryFiles) {
          const decoded = decodeQueryFilenameUniversal(filename);
          if (decoded && this.paramsMatch(targetParams, decoded)) {
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
        if (decoded) {
          return this.paramsMatch(targetParams, decoded);
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
  private decodeQueryString(encoded: string): Record<string, unknown> | null {
    try {
      // Remove .json extension if present
      const cleanEncoded = encoded.replace(/\.json$/, '');

      // Base64url decode
      const jsonString = Buffer.from(cleanEncoded, 'base64url').toString('utf-8');
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate filename from query definition, using encoded if available, otherwise params or URL
   */
  private async generateFilenameFromQuery(queryDef: QueryDefinition): Promise<string | null> {
    // If encoded is available, use it directly
    if (queryDef.encoded) {
      return queryDef.encoded.endsWith('.json') ? queryDef.encoded : `${queryDef.encoded}.json`;
    }

    // If params are available, generate encoded filename from params
    if (queryDef.params) {
      try {
        const encoded = Buffer.from(JSON.stringify(queryDef.params)).toString('base64url');
        return `${encoded}.json`;
      } catch (error) {
        return null;
      }
    }

    // If URL is available, extract params and generate encoded filename
    if (queryDef.url) {
      try {
        const params = this.normalizeQueryParams(queryDef.url);
        const encoded = Buffer.from(JSON.stringify(params)).toString('base64url');
        return `${encoded}.json`;
      } catch (error) {
        return null;
      }
    }

    return null;
  }

  /**
   * Load query index for an entity type (legacy format - to be deprecated)
   */
  async loadQueryIndex(entityType: StaticEntityType): Promise<{ entityType: string; queries: QueryIndexEntry[] } | null> {
    try {
      const queryIndexPath = join(this.dataPath, entityType, "queries", "index.json");
      const indexContent = await readFile(queryIndexPath, "utf-8");
      const parsed = JSON.parse(indexContent);
      // Basic validation without schema
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.queries)) {
        return parsed as { entityType: string; queries: QueryIndexEntry[] };
      }
      return null;
    } catch (error) {
      console.error(`Failed to load query index for ${entityType}:`, error);
      return null;
    }
  }

  /**
   * Save query index for an entity type (legacy format - to be deprecated)
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
  async updateQueryIndex(entityType: StaticEntityType, queryDef: QueryDefinition, metadata: { resultCount?: number; lastModified?: string; contentHash?: string }): Promise<void> {
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
      return decoded ? this.paramsMatch(def1.params, decoded) : false;
    }

    if (def1.encoded && def2.params) {
      const decoded = this.decodeQueryString(def1.encoded);
      return decoded ? this.paramsMatch(decoded, def2.params) : false;
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
        return await Promise.all(queryIndex.queries.map(async (entry: QueryIndexEntry) => {
          const filename = await this.generateFilenameFromQuery(entry.query);
          let decoded: Record<string, unknown> | null = null;

          // Extract parameters from query definition
          if (entry.query.params) {
            decoded = entry.query.params;
          } else if (entry.query.encoded) {
            decoded = this.decodeQueryString(entry.query.encoded);
          } else if (entry.query.url) {
            decoded = this.normalizeQueryParams(entry.query.url);
          }

          return {
            filename: filename || 'unknown',
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
          // Try to decode with universal decoder (supports both formats)
          const decoded = decodeQueryFilenameUniversal(file);
          if (decoded !== null) {
            results.push({
              filename: file,
              decoded,
              contentHash: undefined // No content hash without index
            });
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

    // Extract entity IDs from canonical URLs
    const entityIds: string[] = [];
    for (const canonicalUrl of Object.keys(index)) {
      const entityId = extractEntityIdFromCanonicalUrl(canonicalUrl);
      if (entityId) {
        entityIds.push(entityId);
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
  async getStatistics(): Promise<Record<string, { count: number; lastModified: string }>> {
    const stats: Record<string, { count: number; lastModified: string }> = {};

    for (const entityType of SUPPORTED_ENTITIES) {
      if (await this.hasStaticData(entityType)) {
        const index = await this.loadUnifiedIndex(entityType);
        if (index) {
          const entries = Object.values(index);
          const count = entries.length;
          const lastModified = entries.reduce((latest: string | null, entry: IndexEntry) => {
            const entryTime = entry.lastModified ? new Date(entry.lastModified).getTime() : 0;
            const latestTime = latest ? new Date(latest).getTime() : 0;
            return entryTime > latestTime ? (entry.lastModified || latest) : latest;
          }, null as string | null);

          stats[entityType] = {
            count,
            lastModified: lastModified || new Date().toISOString(),
          };
        }
      }
    }

    return stats;
  }
}

// Export types for testing
export type { UnifiedIndex, IndexEntry, QueryOptions, CacheOptions };
export { SUPPORTED_ENTITIES };