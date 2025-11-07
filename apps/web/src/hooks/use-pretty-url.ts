import { useEffect } from "react";

/**
 * Hook to update the browser URL to show a "pretty" (decoded) version
 * of entity IDs while maintaining functional routing with encoded IDs.
 *
 * For example:
 * - Encoded: /#/works/https%3A%2F%2Fdoi.org%2F10.7717%2Fpeerj.4375
 * - Pretty:  /#/works/https://doi.org/10.7717/peerj.4375
 *
 * @param entityType - The entity type (works, authors, institutions, etc.)
 * @param rawId - The raw (potentially encoded) entity ID from route params (Note: TanStack Router auto-decodes this)
 * @param decodedId - The decoded entity ID (after additional processing like fixing collapsed slashes)
 */
export function usePrettyUrl(
  entityType: string,
  rawId: string | undefined,
  decodedId: string | undefined,
): void {
  useEffect(() => {
    if (!rawId || !decodedId) return;

    // Get the actual current hash from the browser URL
    const currentHash = window.location.hash;

    // Extract just the path part (before any query params)
    const hashPath = currentHash.split("?")[0];

    // Check if the current URL path contains encoded characters
    const isEncoded = hashPath.includes("%");

    if (isEncoded) {
      // Extract query parameters - check both hash and search
      // TanStack Router may put query params in location.search for hash routing
      let searchParams = "";

      if (currentHash.includes("?")) {
        searchParams = "?" + currentHash.split("?")[1];
      } else if (window.location.search) {
        searchParams = window.location.search;
      }

      // Build the pretty (decoded) URL
      const prettyHash = `#/${entityType}/${decodedId}${searchParams}`;

      // Use pathname + hash as relative URL (more reliable than full URL)
      const relativeUrl = `${window.location.pathname}${prettyHash}`;

      // Replace the current URL with the pretty version without triggering navigation
      window.history.replaceState(
        null,
        "",
        relativeUrl,
      );
    }
  }, [entityType, rawId, decodedId]);
}
