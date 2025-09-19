/**
 * Unified query hash generation - single source of truth
 * Works in both Node.js and browser environments using SHA-256
 * Excludes volatile parameters like mailto for consistent hashing
 */

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