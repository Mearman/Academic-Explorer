import { logger } from "@/lib/logger";
import { z } from 'zod';

/**
 * JSON Schema with $ref support
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  allOf?: JsonSchemaRef[];
  [key: string]: unknown;
}

/**
 * JSON Schema reference object
 */
export interface JsonSchemaRef {
  $ref: string;
}

// Schema for validating cached JSON data
const JsonDataSchema = z.record(z.unknown());

// Generic cache type for better type safety
type CacheValue<T> = T | null;

/**
 * Resolved entity index structure (new format with $ref pointers)
 */
export interface ResolvedEntityIndex {
  entityType: string;
  count: number;
  lastModified: string;
  metadata: {
    totalSize: number;
    [key: string]: unknown;
  };
  entities: string[];
  queries?: Array<{
    queryHash: string;
    originalUrl: string;
    params: Record<string, unknown>;
    lastModified: string;
  }>;
}

/**
 * Raw entity index structure (what's stored in files)
 */
export interface RawEntityIndex {
  [key: string]: {
    $ref: string;
    lastModified: string;
    contentHash: string;
  };
}

/**
 * JSON Schema resolver for OpenAlex static data
 * Handles $ref resolution and allOf composition
 */
export class JsonSchemaResolver {
  private cache = new Map<string, unknown>();
  private readonly basePath: string;

  constructor(basePath: string = "/data/openalex/") {
    this.basePath = basePath;
  }

  /**
   * Resolve a JSON Schema with $ref and allOf support
   */
  async resolveSchema(schemaUrl: string): Promise<JsonSchema | null> {
    try {
      const schema = await this.fetchJson<JsonSchema>(schemaUrl);
      if (!schema) {
        return null;
      }

      // Handle allOf composition
      if (schema.allOf && Array.isArray(schema.allOf)) {
        const resolved = await this.resolveAllOf(schema.allOf, schemaUrl);
        return { ...schema, ...resolved };
      }

      return schema;
    } catch (error) {
      logger.error("static-data", `Failed to resolve schema ${schemaUrl}`, { error });
      return null;
    }
  }

  /**
   * Resolve allOf composition by merging referenced schemas
   */
  private async resolveAllOf(refs: JsonSchemaRef[], baseUrl: string): Promise<Record<string, unknown>> {
    const resolved: Record<string, unknown> = {};

    for (const ref of refs) {
      if (!ref.$ref) continue;

      try {
        const refUrl = this.resolveRefUrl(ref.$ref, baseUrl);
        const refSchema = await this.fetchJson<JsonSchema>(refUrl);

        if (refSchema) {
          // Merge the referenced schema properties
          Object.assign(resolved, refSchema);
        }
      } catch (error) {
        logger.warn("static-data", `Failed to resolve $ref: ${ref.$ref}`, { error });
      }
    }

    return resolved;
  }

  /**
   * Resolve entity index from new $ref-based format
   */
  async resolveEntityIndex(entityType: string): Promise<ResolvedEntityIndex | null> {
    try {
      const indexUrl = `${this.basePath}${entityType}/index.json`;
      const rawIndex = await this.fetchJson<RawEntityIndex>(indexUrl);

      if (!rawIndex) {
        logger.debug("static-data", `No index found for ${entityType}`);
        return null;
      }

      // Extract entities and metadata from $ref structure
      const entities: string[] = [];
      const queries: Array<{
        queryHash: string;
        originalUrl: string;
        params: Record<string, unknown>;
        lastModified: string;
      }> = [];

      let totalSize = 0;
      let lastModified = new Date(0).toISOString();

      for (const [key, refData] of Object.entries(rawIndex)) {
        // Skip if not a proper $ref entry
        if (!refData.$ref || !refData.lastModified) continue;

        // Update latest modification time
        if (refData.lastModified > lastModified) {
          lastModified = refData.lastModified;
        }

        // Detect if this is an entity ID or query URL
        if (this.isOpenAlexEntityId(key)) {
          // Extract clean entity ID from the key
          const entityId = this.extractEntityId(key);
          if (entityId) {
            entities.push(entityId);
          }
        } else if (this.isQueryUrl(key)) {
          // Parse query URL to extract parameters
          const queryInfo = this.parseQueryUrl(key);
          if (queryInfo) {
            queries.push({
              queryHash: this.generateQueryHash(key),
              originalUrl: key,
              params: queryInfo.params,
              lastModified: refData.lastModified,
            });
          }
        }

        // Estimate size (could be improved with actual file sizes)
        totalSize += 1000; // Rough estimate
      }

      const resolvedIndex: ResolvedEntityIndex = {
        entityType,
        count: entities.length,
        lastModified,
        metadata: {
          totalSize,
          queryCount: queries.length,
        },
        entities,
        queries,
      };

      logger.debug("static-data", `Resolved ${entityType} index`, {
        entityCount: entities.length,
        queryCount: queries.length,
      });

      return resolvedIndex;
    } catch (error) {
      logger.error("static-data", `Failed to resolve entity index for ${entityType}`, { error });
      return null;
    }
  }

  /**
   * Get entity data by following $ref pointer
   */
  async getEntityData(entityType: string, entityId: string): Promise<unknown> {
    try {
      const indexUrl = `${this.basePath}${entityType}/index.json`;
      const rawIndex = await this.fetchJson<RawEntityIndex>(indexUrl);

      if (!rawIndex) {
        return null;
      }

      // Find the entity by checking all keys (may be full URLs)
      let refData: { $ref: string; lastModified: string; contentHash: string } | null = null;

      // Try direct lookup first
      if (rawIndex[entityId]) {
        refData = rawIndex[entityId];
      } else {
        // Search for entity ID in full URLs
        for (const [key, data] of Object.entries(rawIndex)) {
          if (this.extractEntityId(key) === entityId) {
            refData = data;
            break;
          }
        }
      }

      if (!refData || !refData.$ref) {
        return null;
      }

      // Resolve the $ref to get actual entity data
      const entityUrl = this.resolveRefUrl(refData.$ref, indexUrl);
      return await this.fetchJson(entityUrl);
    } catch (error) {
      logger.error("static-data", `Failed to get entity data ${entityType}:${entityId}`, { error });
      return null;
    }
  }

  /**
   * Get query data by following $ref pointer
   */
  async getQueryData(entityType: string, queryUrl: string): Promise<unknown> {
    try {
      const indexUrl = `${this.basePath}${entityType}/index.json`;
      const rawIndex = await this.fetchJson<RawEntityIndex>(indexUrl);

      if (!rawIndex || !rawIndex[queryUrl]) {
        return null;
      }

      const refData = rawIndex[queryUrl];
      if (!refData.$ref) {
        return null;
      }

      // Resolve the $ref to get actual query results
      const dataUrl = this.resolveRefUrl(refData.$ref, indexUrl);
      return await this.fetchJson(dataUrl);
    } catch (error) {
      logger.error("static-data", `Failed to get query data ${entityType}:${queryUrl}`, { error });
      return null;
    }
  }

  /**
   * Discover available entity types from main index
   */
  async discoverEntityTypes(): Promise<string[]> {
    try {
      const mainIndexUrl = `${this.basePath}index.json`;
      const mainIndex = await this.fetchJson<JsonSchema>(mainIndexUrl);

      if (!mainIndex || !mainIndex.allOf) {
        logger.warn("static-data", "Main index not found or missing allOf structure");
        return [];
      }

      const entityTypes: string[] = [];

      for (const ref of mainIndex.allOf) {
        if (ref.$ref) {
          // Extract entity type from $ref path like "./authors/index.json"
          const match = ref.$ref.match(/^\.\/([^/]+)\/index\.json$/);
          if (match) {
            entityTypes.push(match[1]);
          }
        }
      }

      logger.debug("static-data", `Discovered entity types from main index`, { entityTypes });
      return entityTypes;
    } catch (error) {
      logger.error("static-data", "Failed to discover entity types", { error });
      return [];
    }
  }

  /**
   * Clear resolver cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug("static-data", "Cleared JSON Schema resolver cache");
  }

  /**
   * Fetch JSON with caching
   */
  private async fetchJson<T = unknown>(url: string): Promise<T | null> {
    // Check cache first
    if (this.cache.has(url)) {
      const cachedValue = this.cache.get(url);
      return cachedValue !== undefined ? (cachedValue as T) : null;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${String(response.status)}: ${response.statusText}`);
      }

      const jsonResponse: unknown = await response.json();

      // Validate the JSON response structure and cache if valid
      try {
        JsonDataSchema.parse(jsonResponse);
        this.cache.set(url, jsonResponse);
        return jsonResponse as T;
      } catch {
        logger.warn("json-schema-resolver", `Invalid JSON structure from ${url}`);
        return null;
      }
    } catch (error) {
      logger.warn("static-data", `Failed to fetch JSON from ${url}`, { error });
      return null;
    }
  }

  /**
   * Resolve relative $ref URL against base URL
   */
  private resolveRefUrl(ref: string, baseUrl: string): string {
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      return ref;
    }

    if (ref.startsWith("./")) {
      // Relative to the base URL directory
      const basePath = baseUrl.substring(0, baseUrl.lastIndexOf("/"));
      return `${basePath}/${ref.substring(2)}`;
    }

    if (ref.startsWith("/")) {
      // Absolute path from origin
      const origin = new URL(baseUrl).origin;
      return `${origin}${ref}`;
    }

    // Relative to base URL directory
    const basePath = baseUrl.substring(0, baseUrl.lastIndexOf("/"));
    return `${basePath}/${ref}`;
  }

  /**
   * Check if a string is an OpenAlex entity ID
   */
  private isOpenAlexEntityId(str: string): boolean {
    // First try direct entity ID pattern
    if (/^[WASITCPFKG]\d{8,10}$/.test(str)) {
      return true;
    }

    // Try URL decoding for URL-encoded format
    try {
      const decoded = decodeURIComponent(str);
      const cleanId = decoded.replace(/^https?:\/\/(?:api\.)?openalex\.org\/(?:works\/|authors\/|sources\/|institutions\/|topics\/|publishers\/|funders\/)?/, "");
      if (/^[WASITCPFKG]\d{8,10}$/.test(cleanId)) {
        return true;
      }
    } catch {
      // Not URL encoded, not a valid entity ID
    }

    return false;
  }

  /**
   * Check if a string is a query URL
   */
  private isQueryUrl(str: string): boolean {
    // Try URL decoding first
    try {
      const decoded = decodeURIComponent(str);
      if (decoded.includes("?") && (decoded.includes("filter") || decoded.includes("search") || decoded.includes("group_by") || decoded.includes("select"))) {
        return true;
      }
    } catch {
      // Not URL encoded, not a valid query URL
    }

    return false;
  }

  /**
   * Parse query URL to extract parameters
   */
  private parseQueryUrl(queryUrl: string): { params: Record<string, unknown> } | null {
    try {
      // Try URL decoding first
      let urlToProcess = queryUrl;
      try {
        const decoded = decodeURIComponent(queryUrl);
        if (decoded.startsWith('http')) {
          urlToProcess = decoded;
        }
      } catch {
        // Use original if decoding fails
      }

      const url = new URL(urlToProcess.startsWith("http") ? urlToProcess : `https://api.openalex.org${urlToProcess}`);
      const params: Record<string, unknown> = {};

      for (const [key, value] of url.searchParams.entries()) {
        params[key] = value;
      }

      return { params };
    } catch (error) {
      logger.warn("static-data", `Failed to parse query URL: ${queryUrl}`, { error });
      return null;
    }
  }

  /**
   * Generate a simple hash for query URL
   */
  private generateQueryHash(url: string): string {
    // Simple hash implementation - could be improved
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Extract entity ID from various formats
   */
  private extractEntityId(str: string): string | null {
    // Handle plain entity IDs first
    if (/^[WASITCPFKG]\d{8,10}$/.test(str)) {
      return str;
    }

    // Try URL decoding for URL-encoded format
    try {
      const decoded = decodeURIComponent(str);

      // Handle full OpenAlex URLs like "https://api.openalex.org/works/W2241997964"
      const urlMatch = decoded.match(/https?:\/\/(?:api\.)?openalex\.org\/(?:works|authors|sources|institutions|topics|publishers|funders)\/([WASITCPFKG]\d{8,10})/);
      if (urlMatch) {
        return urlMatch[1];
      }

      // Handle direct OpenAlex URLs like "https://openalex.org/W2241997964"
      const directMatch = decoded.match(/https?:\/\/openalex\.org\/([WASITCPFKG]\d{8,10})/);
      if (directMatch) {
        return directMatch[1];
      }
    } catch {
      // Not URL encoded, not a valid entity URL
    }

    return null;
  }
}

/**
 * Default JSON Schema resolver instance
 */
export const jsonSchemaResolver = new JsonSchemaResolver();