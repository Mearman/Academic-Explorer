/**
 * Generic query key utilities for cache management
 * These utilities help create consistent cache keys across different data types
 */

/**
 * Generic query parameters interface
 */
export interface QueryParams {
  [key: string]: string | number | boolean | null | undefined | (string | number)[];
}

/**
 * Normalize a parameter value to a string for consistent cache keys
 */
function normalizeParamValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map(String).sort().join(",");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  // At this point, value is a primitive (string, number, boolean, symbol, undefined)
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value.toString();
  if (typeof value === "symbol") return value.toString();
  // undefined case
  return "";
}

/**
 * Create a deterministic cache key from query parameters
 */
export function createQueryKey(baseKey: string, params?: QueryParams): string {
  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }

  // Sort keys for deterministic ordering
  const sortedKeys = Object.keys(params).sort();
  const paramPairs = sortedKeys
    .map(key => {
      const value = params[key];
      const normalizedValue = normalizeParamValue(value);
      return normalizedValue ? `${key}:${normalizedValue}` : null;
    })
    .filter(Boolean);

  if (paramPairs.length === 0) {
    return baseKey;
  }

  return `${baseKey}?${paramPairs.join("&")}`;
}

/**
 * Create a cache key for a resource by ID
 */
export function createResourceKey(resourceType: string, id: string | number): string {
  return `${resourceType}:${id}`;
}

/**
 * Create a cache key for a collection query
 */
export function createCollectionKey(
  resourceType: string,
  params?: QueryParams
): string {
  return createQueryKey(`${resourceType}:collection`, params);
}

/**
 * Create a cache key for a search query
 */
export function createSearchKey(
  resourceType: string,
  query: string,
  params?: QueryParams
): string {
  const searchParams = { query, ...params };
  return createQueryKey(`${resourceType}:search`, searchParams);
}

/**
 * Extract resource type from a cache key
 */
export function extractResourceType(cacheKey: string): string | null {
  const colonIndex = cacheKey.indexOf(":");
  return colonIndex > 0 ? cacheKey.substring(0, colonIndex) : null;
}

/**
 * Extract ID from a resource cache key
 */
export function extractResourceId(cacheKey: string): string | null {
  const parts = cacheKey.split(":");
  if (parts.length >= 2 && parts[1] !== "collection" && parts[1] !== "search") {
    return parts[1] ?? null;
  }
  return null;
}

/**
 * Check if a cache key represents a collection query
 */
export function isCollectionKey(cacheKey: string): boolean {
  return cacheKey.includes(":collection");
}

/**
 * Check if a cache key represents a search query
 */
export function isSearchKey(cacheKey: string): boolean {
  return cacheKey.includes(":search");
}

/**
 * Check if a cache key represents a single resource
 */
export function isResourceKey(cacheKey: string): boolean {
  return !isCollectionKey(cacheKey) && !isSearchKey(cacheKey) && cacheKey.includes(":");
}

/**
 * Generate a wildcard pattern for invalidating related cache entries
 */
export function createInvalidationPattern(resourceType: string): string {
  return `${resourceType}:*`;
}

/**
 * Check if a cache key matches an invalidation pattern
 */
export function matchesPattern(cacheKey: string, pattern: string): boolean {
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return cacheKey.startsWith(prefix);
  }
  return cacheKey === pattern;
}

/**
 * Create a hash from query parameters for short cache keys
 */
export function hashParams(params: QueryParams): string {
  const str = JSON.stringify(params, Object.keys(params).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a short cache key using parameter hashing
 */
export function createShortQueryKey(baseKey: string, params?: QueryParams): string {
  if (!params || Object.keys(params).length === 0) {
    return baseKey;
  }

  const hash = hashParams(params);
  return `${baseKey}#${hash}`;
}

/**
 * Cache key builder class for fluent API
 */
export class CacheKeyBuilder {
  private parts: string[] = [];

  constructor(baseKey: string) {
    this.parts.push(baseKey);
  }

  static create(baseKey: string): CacheKeyBuilder {
    return new CacheKeyBuilder(baseKey);
  }

  resource(id: string | number): this {
    this.parts.push(String(id));
    return this;
  }

  collection(): this {
    this.parts.push("collection");
    return this;
  }

  search(): this {
    this.parts.push("search");
    return this;
  }

  custom(segment: string): this {
    this.parts.push(segment);
    return this;
  }

  params(params: QueryParams): this {
    if (Object.keys(params).length > 0) {
      const hash = hashParams(params);
      this.parts.push(`#${hash}`);
    }
    return this;
  }

  build(): string {
    return this.parts.join(":");
  }
}