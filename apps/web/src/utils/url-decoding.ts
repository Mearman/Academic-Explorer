/**
 * URL Decoding Utilities
 *
 * Utilities for handling URL-encoded entity IDs, especially external IDs
 * with special characters like slashes in protocols (https://, ror:, etc.)
 */

/**
 * Decode a URL-encoded entity ID and fix collapsed protocol slashes
 *
 * TanStack Router collapses consecutive slashes in URL paths, so
 * https://orcid.org becomes https:/orcid.org after routing.
 * This function decodes the parameter and fixes the collapsed slashes.
 *
 * @param encodedId - The URL-encoded entity ID from route params
 * @returns Decoded ID with fixed protocol slashes
 *
 * @example
 * ```typescript
 * // Input: "https%3A%2Forcid.org%2F0000-0002-1298-3089"
 * // Output: "https://orcid.org/0000-0002-1298-3089"
 * const id = decodeEntityId(rawId);
 * ```
 */
export function decodeEntityId(encodedId: string | undefined): string | undefined {
  if (!encodedId) {
    return encodedId;
  }

  // Handle double-encoded slashes first (%252F -> %2F)
  // This is needed because we double-encode slashes in the openalex-url route
  // to prevent TanStack Router from collapsing them
  let processedId = encodedId.replace(/%252F/gi, '%2F');

  // Decode URL encoding
  let decodedId = decodeURIComponent(processedId);

  // Fix collapsed protocol slashes (https:/ -> https://)
  // This happens when URLs are used as route parameters and the router
  // normalizes consecutive slashes during routing (fallback for legacy URLs)
  if (decodedId.match(/^https?:\//i) && !decodedId.match(/^https?:\/\//i)) {
    decodedId = decodedId.replace(/^(https?:\/?)/, "$1/");
  }

  // Also fix ror:/ -> ror:// (fallback for legacy URLs)
  if (decodedId.match(/^ror:\//i) && !decodedId.match(/^ror:\/\//i)) {
    decodedId = decodedId.replace(/^(ror:\/?)/, "$1/");
  }

  return decodedId;
}

/**
 * Decode and fix entity ID, ensuring it's never undefined
 *
 * @param encodedId - The URL-encoded entity ID from route params
 * @param fallback - Fallback value if ID is undefined (default: empty string)
 * @returns Decoded ID with fixed protocol slashes, never undefined
 */
export function decodeEntityIdOrDefault(
  encodedId: string | undefined,
  fallback: string = ""
): string {
  return decodeEntityId(encodedId) ?? fallback;
}
