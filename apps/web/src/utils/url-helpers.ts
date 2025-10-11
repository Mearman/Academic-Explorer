/**
 * URL Helpers
 *
 * Utilities for working with URLs, particularly for decoding URL-encoded query parameters
 * in the browser's address bar for better readability.
 */

/**
 * Decodes URL-encoded query parameters in the browser's address bar.
 * If the current URL contains encoded query parameters (e.g., %2C instead of comma),
 * this function replaces the URL with a version that has decoded parameters.
 *
 * This improves readability without changing the actual parameter values.
 * Uses window.history.replaceState to avoid page reloads or adding history entries.
 */
export function decodeUrlQueryParams(): void {
  const { href, hash } = window.location;
  if (!href.includes("?")) return;

  // Get the hash portion (TanStack Router uses hash routing)
  if (!hash.includes("?")) return;

  const [hashPath, queryString] = hash.split("?");
  if (!queryString) return;

  // Check if query string contains encoded characters
  const hasEncodedChars = queryString.includes("%");
  if (!hasEncodedChars) return;

  // Decode the query string
  const decodedQueryString = decodeURIComponent(queryString);

  // Build new URL with decoded query params
  const newUrl = window.location.pathname + hashPath + "?" + decodedQueryString;
  window.history.replaceState(null, "", newUrl);
}
