/**
 * Shared Static Data Cache Utilities
 * Provides unified logic for content hashing, URL mapping, and index management
 * Used by service worker, build plugins, and development cache middleware
 */

import path from "node:path";
import { logger } from "../logger.js";

export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "publishers"
  | "funders"
  | "concepts"
  | "autocomplete";

export function isEntityType(value: string): value is EntityType {
  const validEntityTypes: readonly string[] = [
    "works",
    "authors",
    "sources",
    "institutions",
    "topics",
    "publishers",
    "funders",
    "concepts",
    "autocomplete",
  ];
  return validEntityTypes.includes(value);
}

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
 *
 * Supports both legacy single-URL format and enhanced multi-URL format for collision handling.
 * In the multi-URL format, multiple equivalent URLs (differing only in sensitive parameters
 * like api_key or mailto) map to the same cache file. This prevents data duplication while
 * preserving request history and enabling debugging of collision scenarios.
 *
 * Legacy entries (without equivalentUrls) are automatically migrated to the multi-URL format
 * when accessed by modern systems, ensuring backward compatibility without data loss.
 */
export interface FileEntry {
  /** Original API URL that generated this response (primary URL for this entry) */
  url: string;
  /** Reference to the actual data file */
  $ref: string;
  /** When the response was retrieved from the API (updated on content changes) */
  lastRetrieved: string;
  /** Content hash excluding volatile metadata fields (used for change detection) */
  contentHash: string;
  /**
   * Array of equivalent URLs that all map to this same cache file.
   * Includes the primary url as the first element. Equivalent URLs differ only in
   * sensitive parameters (api_key, mailto) or normalized parameters (cursor=*).
   * This field is optional for legacy compatibility; absent entries are treated as
   * single-URL entries with [url] as the only equivalent.
   */
  equivalentUrls?: string[];
  /**
   * Timestamps when each equivalent URL was first associated with this entry.
   * Keys are URLs from equivalentUrls, values are ISO timestamps.
   * Ensures audit trail for collision detection and migration history.
   * Optional for legacy compatibility.
   */
  urlTimestamps?: Record<string, string>;
  /**
   * Summary statistics about URL collisions and merges for this entry.
   * Tracks how many times this entry has been merged with colliding URLs,
   * providing insights into cache efficiency and potential data conflicts.
   * Optional for legacy compatibility; defaults to no collisions.
   */
  collisionInfo?: CollisionInfo;
}

/**
 * Information about URL collisions and merge history for a FileEntry.
 * Captures statistics for debugging cache behavior, migration analysis,
 * and understanding how multiple request variations map to the same data.
 *
 * Collision scenarios include:
 * - Different api_key parameters (stripped for caching but vary per request)
 * - Different mailto parameters (contact info, varies by user)
 * - Cursor pagination normalization (cursor=* for all paginated results)
 * - Parameter reordering (normalized alphabetically for consistency)
 *
 * This metadata has minimal performance impact as it's only stored in indexes,
 * not in the actual data files.
 */
export interface CollisionInfo {
  /** Number of times this entry has been merged with colliding URLs (increments on each new equivalent URL) */
  mergedCount: number;
  /** Timestamp when the first collision was detected and merged (ISO string) */
  firstCollision?: string;
  /** Timestamp of the most recent merge operation (ISO string) */
  lastMerge?: string;
  /** Total number of unique equivalent URLs tracked for this entry */
  totalUrls: number;
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
  /** Aggregated collision statistics from this directory and subdirectories */
  aggregatedCollisions?: {
    totalMerged: number;
    lastCollision?: string;
    totalWithCollisions: number;
  };
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

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const dataObj = data as Record<string, unknown>;
      cleanContent = { ...dataObj };

      // Remove the entire meta field as it contains API metadata, not entity content
      if ("meta" in dataObj) {
        delete (cleanContent as Record<string, unknown>).meta;
      }
    }

    // Generate stable hash
    const jsonString = JSON.stringify(
      cleanContent,
      Object.keys(cleanContent ?? {}).sort(),
    );

    // Use dynamic import for crypto to support both Node.js and browser environments
    if (globalThis.process?.versions?.node) {
      // Node.js environment
      const { createHash } = await import("crypto");
      return createHash("sha256").update(jsonString).digest("hex").slice(0, 16);
    } else {
      // Browser environment - use a simple hash fallback
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, "0");
    }
  } catch (error) {
    logger.warn("cache", "Failed to generate content hash", { error });
    return "hash-error";
  }
}

/**
 * Parse OpenAlex URL into structured information
 */
export function parseOpenAlexUrl(url: string): ParsedOpenAlexUrl | null {
  if (typeof url !== "string" || url.trim().length === 0) {
    logger.warn("cache", "Invalid URL input for parsing", { url: typeof url });
    return null;
  }

  // Basic validation: must start with http(s)://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    logger.warn("cache", "URL does not start with http(s)://", { url });
    return null;
  }

  try {
    const urlObj = new URL(url);

    // Only handle api.openalex.org URLs
    if (urlObj.hostname !== "api.openalex.org") {
      return null;
    }

    const pathSegments = urlObj.pathname.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      return null;
    }

    // Detect entity type from first path segment
    const potentialEntityType = pathSegments[0];

    const entityType = isEntityType(potentialEntityType)
      ? potentialEntityType
      : undefined;

    // Invalid entity types should return null
    if (!entityType) {
      return null;
    }

    // Extract entity ID for single entity URLs
    let entityId: string | undefined;
    if (pathSegments.length >= 2) {
      const entityIdCandidate = pathSegments[1];

      const decodeSegment = (segment: string): string => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      };

      const decodedCandidate = decodeSegment(entityIdCandidate);
      const isOpenAlexId =
        /^[A-Z]\d{1,}$/i.test(entityIdCandidate) ||
        /^[A-Z]\d{1,}$/i.test(decodedCandidate);
      const isOpenAlexUrl =
        /^https?:\/\/openalex\.org\/[A-Z]\d{1,}$/i.test(decodedCandidate) ||
        /^https%3A%2F%2Fopenalex\.org%2F[A-Z]\d{1,}$/i.test(entityIdCandidate);
      const isOrcidId =
        /^(\d{4}-){3}\d{3}[0-9X]$/i.test(decodedCandidate) ||
        /^https?:\/\/orcid\.org\/(\d{4}-){3}\d{3}[0-9X]$/i.test(
          decodedCandidate,
        ) ||
        /^orcid:(\d{4}-){3}\d{3}[0-9X]$/i.test(decodedCandidate) ||
        /^https%3A%2F%2Forcid\.org%2F(\d{4}-){3}\d{3}[0-9X]$/i.test(
          entityIdCandidate,
        );

      if (isOpenAlexId || isOpenAlexUrl || isOrcidId) {
        entityId = entityIdCandidate;
      }
    }

    return {
      pathSegments,
      isQuery: !!urlObj.search,
      queryString: urlObj.search,
      entityType,
      entityId,
    };
  } catch (error) {
    logger.warn("cache", "Failed to parse OpenAlex URL", { url, error });
    return null;
  }
}

/**
 * Remove sensitive parameters from URL query string for caching
 * Strips api_key and mailto parameters completely from the query
 * Handles both query-only strings (?param=value) and path+query strings (/path?param=value)
 */
export function sanitizeUrlForCaching(urlString: string): string {
  if (!urlString) return urlString;

  // Handle both full URLs with ? and query-only strings
  const hasPath = urlString.includes("?");
  let path = "";
  let query = "";

  if (hasPath) {
    [path, query] = urlString.split("?", 2);
  } else {
    query = urlString;
  }

  // Split by & and filter out sensitive parameters
  const paramPairs = query.split("&");
  const filteredParams: string[] = [];
  for (const param of paramPairs) {
    const key = param.split("=")[0];
    if (key !== "api_key" && key !== "mailto") {
      filteredParams.push(param);
    }
  }

  const sanitizedQuery = filteredParams.join("&");

  // Reconstruct the result
  if (hasPath) {
    return sanitizedQuery ? `${path}?${sanitizedQuery}` : path;
  } else {
    return sanitizedQuery;
  }
}

/**
 * Normalize query string for consistent filename generation
 * - Normalizes cursor values to "*" for pagination consistency
 * - Sorts parameters alphabetically for deterministic ordering
 * - URL encodes parameter values for filesystem safety
 */
export function normalizeQueryForFilename(queryString: string): string {
  if (!queryString || queryString === "?") {
    return "";
  }

  try {
    // Remove leading ? if present
    const cleanQuery = queryString.startsWith("?")
      ? queryString.slice(1)
      : queryString;

    if (!cleanQuery) {
      return "";
    }

    const params = new URLSearchParams(cleanQuery);

    // Normalize cursor values to "*" for consistency
    if (params.has("cursor")) {
      params.set("cursor", "*");
    }

    // Sort parameters alphabetically for consistent ordering
    const sortedParams = new URLSearchParams();
    const keys = Array.from(params.keys()).sort();
    for (const key of keys) {
      const value = params.get(key);
      if (value !== null) {
        sortedParams.set(key, value);
      }
    }

    const result = sortedParams.toString();
    return result ? `?${result}` : "";
  } catch (error) {
    logger.warn("cache", "Failed to normalize query for filename", {
      queryString,
      error,
    });
    return queryString; // Return original on error
  }
}

/**
 * Normalize URL query string for caching by removing sensitive parameters
 * and ensuring consistent filename generation
 *
 * @deprecated Use sanitizeUrlForCaching + normalizeQueryForFilename instead
 */
export function normalizeQueryForCaching(queryString: string): string {
  // Chain the separated concerns for backwards compatibility
  const sanitized = sanitizeUrlForCaching(queryString);
  return normalizeQueryForFilename(sanitized);
}

/**
 * Encode filename by replacing problematic characters with hex codes
 * Uses format __XX__ where XX is the hex code of the character
 *
 * This encoding:
 * 1. First decodes any URL encoding (%XX) to get original characters
 * 2. Then encodes filesystem-unsafe and URL-special characters to __XX__ format
 * 3. Provides unified encoding format across all special characters
 *
 * This is reversible and creates consistent filenames regardless of input format
 */
export function encodeFilename(filename: string): string {
  if (typeof filename !== "string") {
    logger.warn("cache", "Invalid filename input for encoding", {
      filename: typeof filename,
    });
    return "";
  }

  if (filename.length === 0) {
    return "";
  }

  try {
    // First decode any URL encoding to get original characters
    // This handles cases where input is already URL-encoded (e.g., "filter%3Ayear%3A2020")
    const decoded = decodeURIComponent(filename);

    // Then encode all special characters with hex format
    // Encodes: filesystem-unsafe (<>"|*?/\) + URL-special (:=%&+,)
    return decoded.replace(
      /[<>:"|*?/\\%=&+,]/g,
      (char) => `__${char.charCodeAt(0).toString(16).toUpperCase()}__`,
    );
  } catch (error) {
    // Fallback if decoding fails (e.g., malformed URL encoding)
    // Just encode filesystem-unsafe characters
    logger.warn(
      "cache",
      "Failed to decode URL encoding in filename, using fallback",
      { filename, error },
    );
    return filename.replace(
      /[<>"|*?/\\]/g,
      (char) => `__${char.charCodeAt(0).toString(16).toUpperCase()}__`,
    );
  }
}

/**
 * Decode filename by converting hex codes back to original characters
 * Reverses the encoding done by encodeFilename
 */
export function decodeFilename(filename: string): string {
  return filename.replace(/__([0-9A-F]+)__/g, (match, hex) => {
    const hexStr = String(hex);
    const codePoint = parseInt(hexStr, 16);
    return String.fromCharCode(codePoint);
  });
}

/**
 * Sanitize filename by replacing problematic characters
 * @deprecated Use encodeFilename instead for reversible encoding
 */
export function sanitizeFilename(filename: string): string {
  return encodeFilename(filename);
}

/**
 * Generate cache file path from OpenAlex URL
 * This is the canonical mapping used by all systems
 */
export function getCacheFilePath(
  url: string,
  staticDataRoot: string,
): string | null {
  const parsed = parseOpenAlexUrl(url);
  if (!parsed) {
    return null;
  }

  const { pathSegments, isQuery, queryString } = parsed;

  try {
    if (isQuery) {
      return generateQueryFilePath(
        pathSegments,
        queryString,
        staticDataRoot,
        url,
      );
    }
    return generateEntityFilePath(pathSegments, staticDataRoot);
  } catch (error) {
    logger.warn("cache", "Failed to generate cache file path", { url, error });
    return null;
  }
}

function generateQueryFilePath(
  pathSegments: string[],
  queryString: string,
  staticDataRoot: string,
  url: string,
): string | null {
  // Normalize query string to remove sensitive information before caching
  const normalizedQuery = normalizeQueryForCaching(queryString.slice(1)); // Remove leading '?'

  // If all query parameters were stripped, treat this as a base collection URL
  if (!normalizedQuery || normalizedQuery === "?") {
    return generateBaseCollectionPath(pathSegments, staticDataRoot);
  }

  // Handle actual query parameters - create query file
  const baseDir = pathSegments.join("/");
  const cleanQuery = normalizedQuery.startsWith("?")
    ? normalizedQuery.slice(1)
    : normalizedQuery;
  const queryFilename = sanitizeFilename(cleanQuery);

  // Ensure we have a valid filename for the query
  if (!queryFilename || queryFilename.trim() === "") {
    // This should not happen if normalization worked correctly
    logger.warn("cache", "Empty query filename after normalization", {
      url,
      normalizedQuery,
    });
    return generateBaseCollectionPath(pathSegments, staticDataRoot);
  }

  return `${staticDataRoot}/${baseDir}/queries/${queryFilename}.json`;
}

function generateEntityFilePath(
  pathSegments: string[],
  staticDataRoot: string,
): string | null {
  if (pathSegments.length === 1) {
    // For root collections: /authors → authors.json (at top level)
    return `${staticDataRoot}/${pathSegments[0]}.json`;
  }

  if (pathSegments.length === 2) {
    // For single entities: /authors/A123 → authors/A123.json
    const [entityType, entityId] = pathSegments;
    return `${staticDataRoot}/${entityType}/${entityId}.json`;
  }

  if (pathSegments.length > 2) {
    // For nested paths: /authors/A123/works → authors/A123/works.json
    const fileName = pathSegments[pathSegments.length - 1];
    const dirPath = pathSegments.slice(0, -1).join("/");
    return `${staticDataRoot}/${dirPath}/${fileName}.json`;
  }

  return null;
}

function generateBaseCollectionPath(
  pathSegments: string[],
  staticDataRoot: string,
): string {
  if (pathSegments.length === 1) {
    return `${staticDataRoot}/${pathSegments[0]}.json`;
  }

  // For nested paths without meaningful query params
  const fileName = pathSegments[pathSegments.length - 1];
  const dirPath = pathSegments.slice(0, -1).join("/");
  return `${staticDataRoot}/${dirPath}/${fileName}.json`;
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
  const cacheFilePath = getCacheFilePath(url, "");
  return `/data/openalex${cacheFilePath}`;
}

/**
 * Determine if cached content needs updating based on content hash
 */
export async function shouldUpdateCache(
  existingMetadata: CacheEntryMetadata | null,
  newData: unknown,
  maxAge?: number,
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
  contentType?: string,
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
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // OpenAlex entities should have id and display_name
  return typeof obj.id === "string" && typeof obj.display_name === "string";
}

/**
 * Validate that data appears to be a valid OpenAlex query result
 */
export function isValidOpenAlexQueryResult(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // OpenAlex query results should have results array and meta object
  return Array.isArray(obj.results) && typeof obj.meta === "object";
}

/**
 * Extract entity type from file path or URL
 */
export function extractEntityType(pathOrUrl: string): EntityType | null {
  // Handle URLs
  if (pathOrUrl.startsWith("http")) {
    const parsed = parseOpenAlexUrl(pathOrUrl);
    return parsed?.entityType ?? null;
  }

  // Handle file paths
  const segments = pathOrUrl.split("/").filter(Boolean);
  const validEntityTypes: readonly EntityType[] = [
    "works",
    "authors",
    "sources",
    "institutions",
    "topics",
    "publishers",
    "funders",
    "concepts",
  ];

  for (const segment of segments) {
    if (isEntityType(segment)) {
      return segment;
    }
  }

  return null;
}
/**
 * Convert query string to filesystem-safe filename
 * Combines normalization and encoding for cache file naming
 */
export function queryToFilename(queryString: string): string {
  if (!queryString) return "";

  // Remove leading ? if present
  const cleanQuery = queryString.startsWith("?")
    ? queryString.slice(1)
    : queryString;
  if (!cleanQuery) return "";

  // Normalize for consistent naming
  const normalized = normalizeQueryForFilename(`?${cleanQuery}`);
  const normalizedClean = normalized.startsWith("?")
    ? normalized.slice(1)
    : normalized;

  // Encode for filesystem safety
  return encodeFilename(normalizedClean);
}

/**
 * Convert filesystem filename back to query string
 * Reverses the queryToFilename transformation
 */
export function filenameToQuery(filename: string): string {
  if (!filename) return "";

  // Decode from filesystem-safe format
  const decoded = decodeFilename(filename);

  // Add leading ? if we have content
  return decoded ? `?${decoded}` : "";
}

/**
 * Check if two URLs are equivalent for caching purposes
 * Ignores parameter order and sensitive parameters (api_key, mailto)
 */
export function areUrlsEquivalentForCaching(
  url1: string,
  url2: string,
): boolean {
  if (!areValidUrlInputs(url1, url2)) {
    return false;
  }

  if (!areValidHttpUrls(url1, url2)) {
    return false;
  }

  try {
    return compareUrlComponents(url1, url2);
  } catch (error) {
    logger.warn("cache", "Failed to compare URLs for equivalence", {
      url1,
      url2,
      error,
    });
    return false;
  }
}

function areValidUrlInputs(url1: string, url2: string): boolean {
  if (
    typeof url1 !== "string" ||
    typeof url2 !== "string" ||
    url1.trim().length === 0 ||
    url2.trim().length === 0
  ) {
    logger.warn("cache", "Invalid URL inputs for equivalence comparison", {
      url1: typeof url1,
      url2: typeof url2,
    });
    return false;
  }
  return true;
}

function areValidHttpUrls(url1: string, url2: string): boolean {
  if (
    (!url1.startsWith("http://") && !url1.startsWith("https://")) ||
    (!url2.startsWith("http://") && !url2.startsWith("https://"))
  ) {
    logger.warn(
      "cache",
      "URLs do not start with http(s):// for equivalence comparison",
      { url1, url2 },
    );
    return false;
  }
  return true;
}

function compareUrlComponents(url1: string, url2: string): boolean {
  const urlObj1 = new URL(url1);
  const urlObj2 = new URL(url2);

  // Must have same hostname and pathname
  if (
    urlObj1.hostname !== urlObj2.hostname ||
    urlObj1.pathname !== urlObj2.pathname
  ) {
    return false;
  }

  // Normalize both query strings for comparison
  const normalized1 = normalizeQueryForCaching(urlObj1.search);
  const normalized2 = normalizeQueryForCaching(urlObj2.search);

  return normalized1 === normalized2;
}

/**
 * Check if a URL would collide with an existing FileEntry (map to the same cache path)
 * @param entry Existing file entry
 * @param url URL to check for collision
 * @param getCacheFilePathFn Function to get cache path (defaults to getCacheFilePath)
 * @returns true if the URL maps to the same cache path as the entry
 */
export function hasCollision(
  entry: FileEntry,
  url: string,
  getCacheFilePathFn = getCacheFilePath,
): boolean {
  if (!entry || !url) {
    return false;
  }

  const entryPath = getCacheFilePathFn(entry.url, "");
  const urlPath = getCacheFilePathFn(url, "");

  logger.debug(
    "cache",
    `hasCollision: entryPath="${entryPath}", urlPath="${urlPath}", equal=${entryPath === urlPath}`,
  );

  return entryPath !== null && urlPath !== null && entryPath === urlPath;
}

/**
 * Type guard to check if a FileEntry supports multiple URLs (has been enhanced)
 */
export function isMultiUrlFileEntry(entry: unknown): entry is FileEntry & {
  equivalentUrls: string[];
  urlTimestamps: Record<string, string>;
  collisionInfo: CollisionInfo;
} {
  // Accept entries that declare the multi-url fields even if arrays are empty;
  // validation will catch empty-equivalentUrls as invalid when appropriate.
  if (
    typeof entry !== "object" ||
    entry === null ||
    !("equivalentUrls" in entry) ||
    !("urlTimestamps" in entry) ||
    !("collisionInfo" in entry)
  ) {
    return false;
  }

  const candidate = entry as Record<string, unknown>;

  return (
    Array.isArray(candidate.equivalentUrls) &&
    typeof candidate.urlTimestamps === "object" &&
    candidate.urlTimestamps !== null &&
    typeof candidate.collisionInfo === "object" &&
    candidate.collisionInfo !== null
  );
}

/**
 * Add new URL to equivalent URLs if not already present
 */
function addNewUrlToEntry(
  entry: FileEntry,
  newUrl: string,
  currentTime: string,
): void {
  if (entry.equivalentUrls && !entry.equivalentUrls.includes(newUrl)) {
    entry.equivalentUrls.push(newUrl);
    if (entry.urlTimestamps) {
      entry.urlTimestamps[newUrl] = currentTime;
    }

    if (entry.collisionInfo) {
      entry.collisionInfo.mergedCount += 1;
      entry.collisionInfo.totalUrls = entry.equivalentUrls.length;
      entry.collisionInfo.lastMerge = currentTime;

      entry.collisionInfo.firstCollision ??= currentTime;
    }
  }
}

/**
 * Sort equivalent URLs by recency (most recent first)
 */
function sortUrlsByRecency(entry: FileEntry): void {
  try {
    if (entry.urlTimestamps && Array.isArray(entry.equivalentUrls)) {
      entry.equivalentUrls.sort((a, b) => {
        const taRaw = entry.urlTimestamps?.[a];
        const tbRaw = entry.urlTimestamps?.[b];
        const ta = taRaw ? Date.parse(taRaw) : NaN;
        const tb = tbRaw ? Date.parse(tbRaw) : NaN;

        // If both invalid or equal, keep original order
        if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
        if (ta === tb) return 0;

        // We want most recent first -> compare tb - ta
        if (Number.isNaN(ta)) return 1; // a is older
        if (Number.isNaN(tb)) return -1; // b is older
        return tb - ta;
      });
    }
  } catch {
    // Non-fatal: if sorting fails, keep existing order and log a warning.
    logger.warn("cache", "Failed to sort equivalentUrls by recency");
  }
}

/**
 * Normalize URL for collision detection
 */
function normalizeUrlForCollision(url: string): string {
  try {
    const u = new URL(url);
    const sanitized = sanitizeUrlForCaching(u.search);
    const normalizedQuery = normalizeQueryForFilename(sanitized);
    return `${u.pathname}${normalizedQuery}`;
  } catch {
    return url;
  }
}

/**
 * Group URLs by their normalized collision key
 */
function groupUrlsByCollisionKey(urls: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const url of urls) {
    const key = normalizeUrlForCollision(url);
    const arr = groups.get(key) ?? [];
    arr.push(url);
    groups.set(key, arr);
  }
  return groups;
}

/**
 * Select up to 2 non-primary URLs from a group, keeping recency order
 */
function selectNonPrimaryUrls(urls: string[], primary: string): string[] {
  const selected: string[] = [];
  let count = 0;
  for (const url of urls) {
    if (url === primary) continue;
    if (count < 2) {
      selected.push(url);
      count += 1;
    }
  }
  return selected;
}

/**
 * Deduplicate equivalent URLs, keeping at most two non-primary URLs
 */
function deduplicateUrls(entry: FileEntry): void {
  try {
    if (
      Array.isArray(entry.equivalentUrls) &&
      entry.equivalentUrls.length > 1
    ) {
      const primary = entry.url;
      const groups = groupUrlsByCollisionKey(entry.equivalentUrls);

      const rebuilt: string[] = [];
      // For determinism, iterate groups in insertion order of keys
      for (const urls of groups.values()) {
        // Collect up to two non-primary URLs from each group
        const nonPrimaryUrls = selectNonPrimaryUrls(urls, primary);
        rebuilt.push(...nonPrimaryUrls);
      }

      // Always append the primary url if present
      if (entry.equivalentUrls.includes(primary)) {
        rebuilt.push(primary);
      }

      entry.equivalentUrls = rebuilt;
    }
  } catch {
    // ignore dedupe errors
  }
}

/**
 * Merge a new colliding URL into an existing FileEntry
 * Updates equivalentUrls, timestamps, and collision statistics
 * @param currentTime Optional current timestamp; defaults to now
 */
export function mergeCollision(
  existingEntry: FileEntry,
  newUrl: string,
  currentTime: string = new Date().toISOString(),
): FileEntry {
  const entry = migrateToMultiUrl(existingEntry);

  addNewUrlToEntry(entry, newUrl, currentTime);
  sortUrlsByRecency(entry);
  deduplicateUrls(entry);

  return entry;
}

/**
 * Reconstruct possible original URLs that could collide to the same cache filename
 * Generates canonical URL and variations with sensitive parameters
 * Assumes filename is a query filename from the queries/ directory
 */
export function reconstructPossibleCollisions(
  queryFilename: string,
  entityType: EntityType,
): string[] {
  const base = `https://api.openalex.org/${entityType}`;
  const queryStr = filenameToQuery(decodeFilename(queryFilename));
  const canonical = `${base}${queryStr}`;

  const variations: string[] = [canonical];

  // Variation with api_key (which gets stripped)
  const apiKeyQuery = queryStr ? `${queryStr}&api_key=dummy` : "?api_key=dummy";
  variations.push(`${base}${apiKeyQuery}`);

  // Variation with mailto (which gets stripped)
  const mailtoQuery = queryStr
    ? `${queryStr}&mailto=test@example.com`
    : "?mailto=test@example.com";
  variations.push(`${base}${mailtoQuery}`);

  // If cursor=*, add variation with actual cursor value (which normalizes to *)
  if (queryStr.includes("cursor=*")) {
    // Simpler approach: remove the normalized cursor marker and append a concrete
    // cursor token at the end. Preserve raw characters so tests can match exact
    // literal strings (they expect unencoded ':' and '/'). This mirrors prior
    // implementation.
    let cursorLess = queryStr.replace(/[?&]cursor=\*/g, "");
    if (cursorLess.startsWith("&")) cursorLess = cursorLess.slice(1);
    if (cursorLess.endsWith("&")) cursorLess = cursorLess.slice(0, -1);
    const withCursor = cursorLess
      ? `?${cursorLess}&cursor=MTIzNDU2`
      : "?cursor=MTIzNDU2";
    variations.push(`${base}${withCursor}`);
  }

  return variations;
}

/**
 * Migrate a legacy single-URL FileEntry to the multi-URL format
 * Initializes the new fields with appropriate defaults
 */
export function migrateToMultiUrl(entry: FileEntry): FileEntry {
  if (isMultiUrlFileEntry(entry)) {
    return entry; // Already migrated
  }

  const migrated: FileEntry = {
    ...entry,
    equivalentUrls: [entry.url],
    urlTimestamps: {
      [entry.url]: entry.lastRetrieved,
    },
    collisionInfo: {
      mergedCount: 0,
      firstCollision: undefined,
      lastMerge: undefined,
      totalUrls: 1,
    },
  };

  return migrated;
}

/**
 * Validate a FileEntry for consistency and correctness
 * Checks equivalentUrls[0] === url and that all URLs map to the same cache path
 * Logs warnings for any issues found
 */
export function validateFileEntry(
  entry: FileEntry,
  getCacheFilePathFn = getCacheFilePath,
): boolean {
  if (!isMultiUrlFileEntry(entry)) {
    // Legacy entries are considered valid
    return true;
  }

  const errors: string[] = [];

  // Check equivalentUrls[0] === url consistency
  if (entry.equivalentUrls[0] !== entry.url) {
    errors.push(
      `equivalentUrls[0] ('${entry.equivalentUrls[0]}') does not match url ('${entry.url}')`,
    );
  }

  // Validate all equivalent URLs normalize to the same cache path
  const basePath = getCacheFilePathFn(entry.url, "");
  if (basePath) {
    for (const url of entry.equivalentUrls) {
      const urlPath = getCacheFilePathFn(url, "");
      if (urlPath !== basePath) {
        errors.push(
          `URL '${url}' maps to '${urlPath}' but expected '${basePath}'`,
        );
      }
    }
  } else {
    errors.push("Cannot compute base cache path from primary url");
  }

  // Validate timestamps coverage
  for (const url of entry.equivalentUrls) {
    if (!(url in entry.urlTimestamps)) {
      errors.push(`Missing timestamp for URL: ${url}`);
    }
  }

  // Validate collisionInfo consistency
  if (entry.collisionInfo.totalUrls !== entry.equivalentUrls.length) {
    errors.push(
      `collisionInfo.totalUrls (${entry.collisionInfo.totalUrls}) does not match equivalentUrls.length (${entry.equivalentUrls.length})`,
    );
  }

  if (errors.length > 0) {
    logger.warn("cache", "FileEntry validation failed", {
      errors,
      entryUrl: entry.url,
    });
    return false;
  }

  return true;
}

/**
 * Unified Index format for CLI compatibility
 * Flat map of canonical URLs to index entries
 */
export interface UnifiedIndexEntry {
  $ref: string;
  lastModified: string;
  contentHash: string;
}

export type UnifiedIndex = Record<string, UnifiedIndexEntry>;

/**
 * Convert DirectoryIndex to UnifiedIndex format
 * Flattens the hierarchical DirectoryIndex structure into a flat map
 * suitable for CLI consumption
 */
export function directoryIndexToUnifiedIndex(
  dirIndex: DirectoryIndex,
): UnifiedIndex {
  const unified: UnifiedIndex = {};

  // Process all files in the directory index
  if (dirIndex.files) {
    for (const fileEntry of Object.values(dirIndex.files)) {
      // Use the primary URL as the key in the unified index
      const { url } = fileEntry;
      if (url) {
        unified[url] = {
          $ref: fileEntry.$ref,
          lastModified: fileEntry.lastRetrieved,
          contentHash: fileEntry.contentHash,
        };
      }
    }
  }

  return unified;
}

/**
 * Convert UnifiedIndex to DirectoryIndex format
 * Creates a hierarchical DirectoryIndex from a flat UnifiedIndex map
 */
export function unifiedIndexToDirectoryIndex(
  unifiedIndex: UnifiedIndex,
): DirectoryIndex {
  const files: Record<string, FileEntry> = {};

  // Convert each unified entry to a FileEntry
  for (const [url, entry] of Object.entries(unifiedIndex)) {
    // Extract the key from the $ref (filename without ./ prefix and .json extension)
    const key = entry.$ref.replace(/^\.\//, "").replace(/\.json$/, "");

    const fileEntry: FileEntry = {
      url,
      $ref: entry.$ref,
      lastRetrieved: entry.lastModified,
      contentHash: entry.contentHash,
    };

    files[key] = fileEntry;
  }

  return {
    lastUpdated: new Date().toISOString(),
    files,
  };
}

/**
 * Check if an index is in UnifiedIndex format (flat structure)
 */
export function isUnifiedIndex(index: unknown): index is UnifiedIndex {
  if (!index || typeof index !== "object") {
    return false;
  }

  // Explicitly reject arrays; an empty array should not be considered a UnifiedIndex.
  if (Array.isArray(index)) return false;

  // UnifiedIndex is a flat object with string keys mapping to entries with $ref, lastModified, contentHash
  const obj = index as Record<string, unknown>;

  // Check if it has DirectoryIndex properties (lastUpdated, files, directories)
  if ("lastUpdated" in obj || "files" in obj || "directories" in obj) {
    return false; // This is a DirectoryIndex
  }

  // Check if all values are UnifiedIndexEntry-like
  for (const value of Object.values(obj)) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const entry = value as Record<string, unknown>;
    if (
      !("$ref" in entry) ||
      !("lastModified" in entry) ||
      !("contentHash" in entry)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Check if an index is in DirectoryIndex format (hierarchical structure)
 */
export function isDirectoryIndex(index: unknown): index is DirectoryIndex {
  if (!index || typeof index !== "object") {
    return false;
  }

  const obj = index as Record<string, unknown>;

  // DirectoryIndex must have lastUpdated
  if (!("lastUpdated" in obj) || typeof obj.lastUpdated !== "string") {
    return false;
  }

  // If it has files or directories, they should be objects
  if ("files" in obj && obj.files !== null && typeof obj.files !== "object") {
    return false;
  }
  if (
    "directories" in obj &&
    obj.directories !== null &&
    typeof obj.directories !== "object"
  ) {
    return false;
  }

  return true;
}

/**
 * Smart index reader that handles both formats
 * Automatically converts to the requested format
 */
export function readIndexAsUnified(index: unknown): UnifiedIndex | null {
  if (isUnifiedIndex(index)) {
    return index;
  }

  if (isDirectoryIndex(index)) {
    return directoryIndexToUnifiedIndex(index);
  }

  logger.warn("cache", "Unknown index format", { index });
  return null;
}

/**
 * Smart index reader that handles both formats
 * Automatically converts to the requested format
 */
export function readIndexAsDirectory(index: unknown): DirectoryIndex | null {
  if (isDirectoryIndex(index)) {
    return index;
  }

  if (isUnifiedIndex(index)) {
    return unifiedIndexToDirectoryIndex(index);
  }

  logger.warn("cache", "Unknown index format", { index });
  return null;
}

/**
 * Static data cache path (relative to workspace root)
 */
export const STATIC_DATA_CACHE_PATH = "apps/web/public/data/openalex";

/**
 * Get the absolute path to the static data cache directory
 * @param projectRoot - Optional project root override (defaults to current working directory)
 */
export function getStaticDataCachePath(projectRoot?: string): string {
  // In Node.js environments, we can try to detect the project root
  // For browser environments, this should be provided
  const root = projectRoot ?? process.cwd?.() ?? "";
  return path.join(root, STATIC_DATA_CACHE_PATH);
}
