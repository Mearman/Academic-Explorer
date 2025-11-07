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

    // Small delay to ensure router has finished processing
    const timeoutId = setTimeout(() => {
      // Get the actual current hash from the browser URL
      const currentHash = window.location.hash;

      // Extract just the path part (before any query params)
      const hashPath = currentHash.split("?")[0];

      // Check if the current URL needs updating by comparing with decoded version
      // We check both for encoded characters and if the hash doesn't contain the decoded ID
      const hasEncodedChars = hashPath.includes("%");
      const needsUpdate = hasEncodedChars && !hashPath.includes(decodedId);

      if (needsUpdate) {
        // Extract query parameters from the hash (after the ?)
        const hashQueryParams = currentHash.includes("?")
          ? "?" + currentHash.split("?").slice(1).join("?") // Handle multiple ? in URL
          : "";

        // Build the pretty (decoded) URL
        const prettyHash = `#/${entityType}/${decodedId}${hashQueryParams}`;

        // Preserve any search params that might be separate from hash
        // (TanStack Router might use either location.search or hash params)
        const searchString = window.location.search || "";
        const relativeUrl = `${window.location.pathname}${searchString}${prettyHash}`;

        // Replace the current URL with the pretty version without triggering navigation
        window.history.replaceState(
          null,
          "",
          relativeUrl,
        );
      }
    }, 100); // Small delay to let router finish

    return () => clearTimeout(timeoutId);
  }, [entityType, rawId, decodedId]);
}
