/**
 * Content-based hashing utilities for static data indexes
 * Ensures deterministic hashing based only on static content fields
 */

import { createHash } from "crypto";

/**
 * Static fields that should be included in content hash calculation
 * These are fields that represent the actual content, not metadata like timestamps
 */
const STATIC_CONTENT_FIELDS = {
  // For entity files
  entity: [
    "id",
    "display_name",
    "orcid",
    "works_count",
    "cited_by_count",
    "affiliations",
    "last_known_institution",
    "works_api_url",
    "updated_date" // This is the OpenAlex update date, not our file timestamp
  ] as const,

  // For query metadata
  query: [
    "queryHash",
    "url",
    "params",
    "resultCount"
  ] as const,

  // For index metadata
  index: [
    "entityType",
    "count",
    "entities",
    "queries",
    "metadata.totalSize"
  ] as const
} as const;

/**
 * Extract only static content fields from an object for consistent hashing
 */
function extractStaticFields(params: {
  obj: Record<string, unknown>;
  fieldPaths: readonly string[];
}): Record<string, unknown> {
  const { obj, fieldPaths } = params;
  const result: Record<string, unknown> = {};

  for (const path of fieldPaths) {
    const value = getNestedValue({ obj, path });
    if (value !== undefined) {
      result[path] = value;
    }
  }

  return result;
}

/**
 * Type guard to check if value is a record
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(params: { obj: Record<string, unknown>; path: string }): unknown {
  const { obj, path } = params;
  return path.split(".").reduce<unknown>((current: unknown, key: string): unknown => {
    if (isRecord(current) && key in current) {
      return current[key];
    }
    return undefined;
  }, obj);
}

/**
 * Create a stable content hash from static data index content
 * Only includes static fields that represent actual content, not timestamps
 */
export function createContentHash(indexContent: {
  entityType: string;
  count: number;
  entities: string[];
  queries?: Array<{
    queryHash: string;
    url: string;
    params: Record<string, unknown>;
    resultCount: number;
    size?: number;
    lastModified?: string;
  }>;
  metadata: {
    totalSize: number;
    files: Array<{
      id: string;
      size: number;
      lastModified?: string;
    }>;
  };
}): string {
  // Extract only static content fields, excluding timestamps and file modification times
  const staticContent = {
    entityType: indexContent.entityType,
    count: indexContent.count,
    entities: [...indexContent.entities].sort(), // Sort for deterministic ordering
    queries: indexContent.queries?.map(query =>
      extractStaticFields({ obj: query, fieldPaths: STATIC_CONTENT_FIELDS.query })
    ).sort((a, b) => String(a.queryHash).localeCompare(String(b.queryHash))), // Sort by queryHash
    metadata: {
      totalSize: indexContent.metadata.totalSize,
      filesContent: indexContent.metadata.files.map(file => ({
        id: file.id,
        size: file.size // Include size but not lastModified
      })).sort((a, b) => a.id.localeCompare(b.id)) // Sort by ID
    }
  };

  // Create deterministic JSON string with sorted keys
  const contentString = JSON.stringify(staticContent, (key, value: unknown) => {
    if (isRecord(value)) {
      // Sort object keys for consistent hashing
      const sortedObj: Record<string, unknown> = {};
      Object.keys(value).sort().forEach(sortedKey => {
        sortedObj[sortedKey] = value[sortedKey];
      });
      return sortedObj;
    }
    return value;
  }, 0);

  // Generate SHA-256 hash
  return createHash("sha256").update(contentString, "utf8").digest("hex");
}

/**
 * Create content hash for entity data
 */
export function createEntityContentHash({ entityData }: { entityData: Record<string, unknown> }): string {
  const staticContent = extractStaticFields({ obj: entityData, fieldPaths: STATIC_CONTENT_FIELDS.entity });
  const contentString = JSON.stringify(staticContent, (key, value: unknown) => {
    if (isRecord(value)) {
      // Sort object keys for consistent hashing
      const sortedObj: Record<string, unknown> = {};
      Object.keys(value).sort().forEach(sortedKey => {
        sortedObj[sortedKey] = value[sortedKey];
      });
      return sortedObj;
    }
    return value;
  }, 0);
  return createHash("sha256").update(contentString, "utf8").digest("hex");
}

/**
 * Create content hash for query metadata
 */
export function createQueryContentHash(queryData: {
  queryHash: string;
  url: string;
  params: Record<string, unknown>;
  resultCount: number;
}): string {
  const staticContent = extractStaticFields({ obj: queryData, fieldPaths: STATIC_CONTENT_FIELDS.query });
  const contentString = JSON.stringify(staticContent, (key, value: unknown) => {
    if (isRecord(value)) {
      // Sort object keys for consistent hashing
      const sortedObj: Record<string, unknown> = {};
      Object.keys(value).sort().forEach(sortedKey => {
        sortedObj[sortedKey] = value[sortedKey];
      });
      return sortedObj;
    }
    return value;
  }, 0);
  return createHash("sha256").update(contentString, "utf8").digest("hex");
}

/**
 * Compare two content hashes to determine if content has actually changed
 */
export function hasContentChanged(params: {
  currentHash: string | undefined;
  newHash: string;
}): boolean {
  const { currentHash, newHash } = params;
  return currentHash !== newHash;
}