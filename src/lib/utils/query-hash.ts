/**
 * Unified query hash generation - single source of truth
 * Works in both Node.js and browser environments using SHA-256
 * Excludes volatile parameters like mailto for consistent hashing
 */

import { z } from 'zod';

// Schema for query info objects
const QueryInfoSchema = z.object({
  baseUrl: z.string(),
  params: z.record(z.string(), z.string()),
  normalizedUrl: z.string(),
}).and(z.record(z.unknown()));

/**
 * Generate a hash for a query URL to use as filename
 * Uses SHA-256 for consistent hashing across environments
 */
export async function generateQueryHash(url: string): Promise<string> {
  // Create a normalized URL without volatile parameters
  const normalizedUrl = normalizeUrlForHashing(url);

  // Use Web Crypto API (available in both Node.js 16+ and browsers)
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedUrl);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 16);
}

/**
 * Normalize URL for hashing by removing volatile parameters and ensuring consistent order
 */
function normalizeUrlForHashing(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove volatile parameters that shouldn't affect caching
    urlObj.searchParams.delete("mailto");

    // Sort parameters to ensure consistent order
    const sortedParams = new URLSearchParams();
    const paramEntries = Array.from(urlObj.searchParams.entries()).sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]));

    for (const [key, value] of paramEntries) {
      sortedParams.append(key, value);
    }

    urlObj.search = sortedParams.toString();
    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original URL
    return url;
  }
}

/**
 * Parse query parameters from a URL
 */
export function parseQueryParams(url: string): Record<string, unknown> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, unknown> = {};

    for (const [key, value] of urlObj.searchParams) {
      // Handle special parameter parsing
      if (key === "select" && typeof value === "string") {
        params[key] = value.split(",").map(v => v.trim());
      } else if (key === "per_page" || key === "page") {
        params[key] = parseInt(value, 10);
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
 * Generate an encoded filename for a query that can be decoded to infer the original query
 * Format: {base64url-encoded-query-params}.json
 */
export function generateEncodedQueryFilename(url: string): string {
  // Get the normalized URL and extract parameters
  const normalizedUrl = normalizeUrlForHashing(url);
  const urlObj = new URL(normalizedUrl);

  // Create a clean query object with key parameters
  const queryInfo = {
    search: urlObj.searchParams.get("search") || undefined,
    filter: urlObj.searchParams.get("filter") || undefined,
    select: urlObj.searchParams.get("select") || undefined,
    sort: urlObj.searchParams.get("sort") || undefined,
    per_page: urlObj.searchParams.get("per_page") || undefined,
    page: urlObj.searchParams.get("page") || undefined,
  };

  // Remove undefined values
  const cleanQueryInfo = Object.fromEntries(
    Object.entries(queryInfo).filter(([_, value]) => value !== undefined)
  );

  // Encode the query info as base64 (URL-safe)
  const queryInfoJson = JSON.stringify(cleanQueryInfo);
  const encoded = Buffer.from(queryInfoJson, 'utf-8').toString('base64url');

  return encoded;
}

/**
 * Decode a query filename to extract the original query parameters
 */
export function decodeQueryFilename(filename: string): z.infer<typeof QueryInfoSchema> | null {
  try {
    // Remove .json extension if present
    const cleanFilename = filename.replace(/\.json$/, '');

    // Decode the base64url encoded query directly
    const queryInfoJson = Buffer.from(cleanFilename, 'base64url').toString('utf-8');
    const parsedJson: unknown = JSON.parse(queryInfoJson);

    // Validate with Zod schema
    const queryInfo = QueryInfoSchema.parse(parsedJson);
    return queryInfo;
  } catch {
    return null;
  }
}

/**
 * Check if a filename is using the encoded format
 */
export function isEncodedQueryFilename(filename: string): boolean {
  const cleanFilename = filename.replace(/\.json$/, '');

  // Try to decode as base64url - if it works and produces valid JSON, it's encoded
  try {
    const queryInfoJson = Buffer.from(cleanFilename, 'base64url').toString('utf-8');
    JSON.parse(queryInfoJson);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a hash of content for tracking changes
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex.substring(0, 16);
}

/**
 * Generate a human-readable filename for a query
 * Format: search-{search}_filter-{filter}_select-{select}_pp{per_page}.json
 * Special characters are replaced with safe alternatives
 */
export function generateHumanReadableQueryFilename(url: string): string {
  // Get the normalized URL and extract parameters
  const normalizedUrl = normalizeUrlForHashing(url);
  const urlObj = new URL(normalizedUrl);

  const parts: string[] = [];

  // Add search term
  const search = urlObj.searchParams.get("search");
  if (search) {
    const cleanSearch = sanitizeForFilename(search);
    parts.push(`search-${cleanSearch}`);
  }

  // Add filter
  const filter = urlObj.searchParams.get("filter");
  if (filter) {
    const cleanFilter = sanitizeForFilename(filter);
    parts.push(`filter-${cleanFilter}`);
  }

  // Add select fields
  const select = urlObj.searchParams.get("select");
  if (select) {
    const cleanSelect = sanitizeForFilename(select);
    parts.push(`select-${cleanSelect}`);
  }

  // Add sort
  const sort = urlObj.searchParams.get("sort");
  if (sort) {
    const cleanSort = sanitizeForFilename(sort);
    parts.push(`sort-${cleanSort}`);
  }

  // Add per_page (abbreviated as pp)
  const perPage = urlObj.searchParams.get("per_page");
  if (perPage) {
    parts.push(`pp${perPage}`);
  }

  // Add page if not 1
  const page = urlObj.searchParams.get("page");
  if (page && page !== "1") {
    parts.push(`page${page}`);
  }

  // Join parts with underscores, or use "query" as fallback
  const filename = parts.length > 0 ? parts.join("_") : "query";

  // Ensure filename isn't too long (max 200 chars)
  return filename.length > 200 ? filename.substring(0, 200) : filename;
}

/**
 * Sanitize a string for safe use in filenames
 */
function sanitizeForFilename(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
}

/**
 * Filename format types
 */
export type QueryFilenameFormat = 'encoded' | 'readable';

/**
 * Generate query filename based on specified format
 */
export function generateQueryFilename(url: string, format: QueryFilenameFormat = 'encoded'): string {
  switch (format) {
    case 'encoded':
      return generateEncodedQueryFilename(url);
    case 'readable':
      return generateHumanReadableQueryFilename(url);
    default:
      return generateEncodedQueryFilename(url);
  }
}

/**
 * Check if a filename is human-readable format
 */
export function isHumanReadableQueryFilename(filename: string): boolean {
  const cleanFilename = filename.replace(/\.json$/, '');

  // Human-readable filenames contain underscores and common patterns
  const patterns = [
    /search-/,
    /filter-/,
    /select-/,
    /sort-/,
    /pp\d+/,
    /page\d+/
  ];

  return patterns.some(pattern => pattern.test(cleanFilename)) &&
         cleanFilename.includes('_') &&
         !isEncodedQueryFilename(filename);
}

/**
 * Detect the format of a query filename
 */
export function detectQueryFilenameFormat(filename: string): QueryFilenameFormat | null {
  if (isEncodedQueryFilename(filename)) {
    return 'encoded';
  }
  if (isHumanReadableQueryFilename(filename)) {
    return 'readable';
  }
  return null;
}

/**
 * Decode human-readable filename to extract query parameters
 * This is a best-effort reconstruction and may not be perfect
 */
export function decodeHumanReadableQueryFilename(filename: string): Record<string, unknown> | null {
  try {
    const cleanFilename = filename.replace(/\.json$/, '');
    const parts = cleanFilename.split('_');
    const params: Record<string, unknown> = {};

    for (const part of parts) {
      if (part.startsWith('search-')) {
        params.search = part.substring(7).replace(/-/g, ' ');
      } else if (part.startsWith('filter-')) {
        params.filter = part.substring(7).replace(/-/g, ':');
      } else if (part.startsWith('select-')) {
        params.select = part.substring(7).replace(/-/g, ',');
      } else if (part.startsWith('sort-')) {
        params.sort = part.substring(5).replace(/-/g, ':');
      } else if (part.startsWith('pp')) {
        params.per_page = part.substring(2);
      } else if (part.startsWith('page')) {
        params.page = part.substring(4);
      }
    }

    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

/**
 * Universal decode function that works with both formats
 */
export function decodeQueryFilenameUniversal(filename: string): Record<string, unknown> | null {
  // Try encoded format first
  const encodedResult = decodeQueryFilename(filename);
  if (encodedResult !== null) {
    return encodedResult;
  }

  // Try human-readable format
  const readableResult = decodeHumanReadableQueryFilename(filename);
  if (readableResult !== null) {
    return readableResult;
  }

  return null;
}