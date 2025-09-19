/**
 * Generate a hash for a query URL to use as filename (browser-compatible version)
 * Excludes mailto field from URL to ensure consistent hashing regardless of email
 */
export function generateQueryHash(url: string): string {
  // Create a normalized URL without mailto parameter
  const normalizedUrl = normalizeUrlForHashing(url);

  // Browser-compatible simple hash algorithm
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedUrl);

  // Simple hash algorithm for browser compatibility
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and take first 16 characters
  return Math.abs(hash).toString(16).padStart(16, "0").substring(0, 16);
}

/**
 * Normalize URL for hashing by removing mailto and other volatile parameters
 */
function normalizeUrlForHashing(url: string): string {
  try {
    const urlObj = new URL(url);

    // Remove mailto parameter to ensure consistent hashing
    urlObj.searchParams.delete("mailto");

    // Sort parameters to ensure consistent order
    const sortedParams = new URLSearchParams();
    const paramEntries = Array.from(urlObj.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b));

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