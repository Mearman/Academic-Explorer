/**
 * Shared Static Data Cache Utilities
 * Provides unified logic for content hashing, URL mapping, and index management
 * Used by service worker, build plugins, and development cache middleware
 */

import { logger } from '../logger.js';

export type EntityType = 'works' | 'authors' | 'sources' | 'institutions' | 'topics' | 'publishers' | 'funders' | 'concepts' | 'autocomplete';

/**
 * Metadata structure for cached files
 */
export interface CacheEntryMetadata {
  /** Content hash excluding volatile fields */
  contentHash: string;
  /** When the file was last modified/cached */
  lastModified: string;
  /** Original URL that generated this cache entry */
  sourceUrl?: string;
  /** Content type of the cached data */
  contentType?: string;
}

/**
 * File entry structure for cached API responses
 */
export interface FileEntry {
  /** Original API URL that generated this response */
  url: string;
  /** Reference to the actual data file */
  $ref: string;
  /** When the response was retrieved from the API */
  lastRetrieved: string;
  /** Content hash excluding volatile metadata fields */
  contentHash: string;
}

/**
 * Directory entry structure for subdirectories
 */
export interface DirectoryEntry {
  /** Reference to the subdirectory */
  $ref: string;
  /** When the directory was last modified */
  lastModified: string;
}

/**
 * Directory index structure - used by all systems
 */
export interface DirectoryIndex {
  /** When this index was last updated */
  lastUpdated: string;
  /** Relative path from static data root (optional, used by root index) */
  path?: string;
  /** Cached API responses in this directory */
  files?: Record<string, FileEntry>;
  /** Subdirectories in this directory */
  directories?: Record<string, DirectoryEntry>;
}

/**
 * Parsed OpenAlex URL information
 */
export interface ParsedOpenAlexUrl {
  /** Path segments from URL */
  pathSegments: string[];
  /** Whether this is a query URL (has search params) */
  isQuery: boolean;
  /** Query string including leading ? */
  queryString: string;
  /** Detected entity type */
  entityType?: EntityType;
  /** Entity ID (for single entity URLs) */
  entityId?: string;
}

/**
 * Generate content hash excluding volatile metadata fields
 * Uses SHA256 for consistency and excludes fields that change without content changing
 */
export async function generateContentHash(data: unknown): Promise<string> {
  try {
    // Create a copy and remove volatile metadata fields
    let cleanContent: unknown = data;

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const dataObj = data as Record<string, unknown>;
      cleanContent = { ...dataObj };

      // Remove volatile OpenAlex metadata fields that change without content changing
      if ('meta' in dataObj && typeof dataObj.meta === 'object' && dataObj.meta) {
        const metaObj = dataObj.meta as Record<string, unknown>;
        const cleanMeta = { ...metaObj };

        // Remove timestamp-based fields that don't affect content
        delete cleanMeta.count;
        delete cleanMeta.db_response_time_ms;
        delete cleanMeta.page;
        delete cleanMeta.per_page;

        if (Object.keys(cleanMeta).length > 0) {
          (cleanContent as Record<string, unknown>).meta = cleanMeta;
        } else {
          delete (cleanContent as Record<string, unknown>).meta;
        }
      }
    }

    // Generate stable hash
    const jsonString = JSON.stringify(cleanContent, Object.keys(cleanContent as object || {}).sort());

    // Use dynamic import for crypto to support both Node.js and browser environments
    if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
      // Node.js environment
      const { createHash } = await import('crypto');
      return createHash('sha256').update(jsonString).digest('hex').slice(0, 16);
    } else {
      // Browser environment - use a simple hash fallback
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
  } catch (error) {
    logger.warn('cache', 'Failed to generate content hash', { error });
    return 'hash-error';
  }
}

/**
 * Parse OpenAlex URL into structured information
 */
export function parseOpenAlexUrl(url: string): ParsedOpenAlexUrl | null {
  try {
    const urlObj = new URL(url);

    // Only handle api.openalex.org URLs
    if (urlObj.hostname !== 'api.openalex.org') {
      return null;
    }

    const pathSegments = urlObj.pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0) {
      return null;
    }

    // Detect entity type from first path segment
    const entityType = pathSegments[0] as EntityType;
    const isValidEntityType = ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts', 'autocomplete'].includes(entityType);

    // Extract entity ID for single entity URLs
    let entityId: string | undefined;
    if (pathSegments.length === 2 && !urlObj.search) {
      entityId = pathSegments[1];
    }

    return {
      pathSegments,
      isQuery: !!urlObj.search,
      queryString: urlObj.search,
      entityType: isValidEntityType ? entityType : undefined,
      entityId,
    };
  } catch (error) {
    logger.warn('cache', 'Failed to parse OpenAlex URL', { url, error });
    return null;
  }
}

/**
 * Sanitize filename by replacing problematic characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '_')      // Replace path separators
    .replace(/[<>"|*?]/g, '_')   // Replace Windows-forbidden characters
    .replace(/\s+/g, '_')        // Replace whitespace with underscores
    .replace(/_{2,}/g, '_')      // Collapse multiple underscores
    .trim();
}

/**
 * Generate cache file path from OpenAlex URL
 * This is the canonical mapping used by all systems
 */
export function getCacheFilePath(url: string, staticDataRoot: string): string | null {
  const parsed = parseOpenAlexUrl(url);
  if (!parsed) {
    return null;
  }

  const { pathSegments, isQuery, queryString } = parsed;

  try {
    if (isQuery) {
      // For queries: /authors?filter=... → authors/queries/filter=display_name.search:mearman.json
      const baseDir = pathSegments.join('/');
      const queryFilename = sanitizeFilename(queryString.slice(1)); // Remove leading '?'
      return `${staticDataRoot}/${baseDir}/queries/${queryFilename}.json`;
    } else if (pathSegments.length === 2) {
      // For single entities: /authors/A123 → authors/A123.json
      const [entityType, entityId] = pathSegments;
      return `${staticDataRoot}/${entityType}/${entityId}.json`;
    } else if (pathSegments.length > 2) {
      // For nested paths: /authors/A123/works → authors/A123/works.json
      const fileName = pathSegments[pathSegments.length - 1];
      const dirPath = pathSegments.slice(0, -1).join('/');
      return `${staticDataRoot}/${dirPath}/${fileName}.json`;
    } else if (pathSegments.length === 1) {
      // For root collections: /authors → authors/index.json
      return `${staticDataRoot}/${pathSegments[0]}/index.json`;
    }

    return null;
  } catch (error) {
    logger.warn('cache', 'Failed to generate cache file path', { url, error });
    return null;
  }
}

/**
 * Generate static file path for service worker
 * Maps OpenAlex URLs to static file paths for production serving
 */
export function getStaticFilePath(url: string): string {
  const parsed = parseOpenAlexUrl(url);
  if (!parsed) {
    return `/data/openalex${new URL(url).pathname}.json`;
  }

  // Use the same logic as cache file path but with /data/openalex prefix
  const cacheFilePath = getCacheFilePath(url, '');
  return `/data/openalex${cacheFilePath}`;
}

/**
 * Determine if cached content needs updating based on content hash
 */
export async function shouldUpdateCache(
  existingMetadata: CacheEntryMetadata | null,
  newData: unknown,
  maxAge?: number
): Promise<boolean> {
  if (!existingMetadata) {
    return true; // No existing cache
  }

  // Check content hash
  const newContentHash = await generateContentHash(newData);
  if (existingMetadata.contentHash !== newContentHash) {
    return true; // Content has changed
  }

  // Check age if specified
  if (maxAge) {
    const lastModified = new Date(existingMetadata.lastModified);
    const ageMs = Date.now() - lastModified.getTime();
    if (ageMs > maxAge) {
      return true; // Content is too old
    }
  }

  return false; // Cache is still valid
}

/**
 * Create cache entry metadata for new cached content
 */
export async function createCacheEntryMetadata(
  data: unknown,
  sourceUrl?: string,
  contentType?: string
): Promise<CacheEntryMetadata> {
  return {
    contentHash: await generateContentHash(data),
    lastModified: new Date().toISOString(),
    sourceUrl,
    contentType,
  };
}

/**
 * Validate that data appears to be a valid OpenAlex entity
 */
export function isValidOpenAlexEntity(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // OpenAlex entities should have id and display_name
  return typeof obj.id === 'string' && typeof obj.display_name === 'string';
}

/**
 * Validate that data appears to be a valid OpenAlex query result
 */
export function isValidOpenAlexQueryResult(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // OpenAlex query results should have results array and meta object
  return Array.isArray(obj.results) && typeof obj.meta === 'object';
}

/**
 * Extract entity type from file path or URL
 */
export function extractEntityType(pathOrUrl: string): EntityType | null {
  // Handle URLs
  if (pathOrUrl.startsWith('http')) {
    const parsed = parseOpenAlexUrl(pathOrUrl);
    return parsed?.entityType || null;
  }

  // Handle file paths
  const segments = pathOrUrl.split('/').filter(Boolean);
  for (const segment of segments) {
    if (['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts', 'autocomplete'].includes(segment)) {
      return segment as EntityType;
    }
  }

  return null;
}