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
 * @param rawId - The raw (potentially encoded) entity ID from route params
 * @param decodedId - The decoded entity ID
 */
export function usePrettyUrl(
  entityType: string,
  rawId: string | undefined,
  decodedId: string | undefined,
): void {
  useEffect(() => {
    if (!rawId || !decodedId) return;

    // Only update if the raw ID is different from the decoded ID (i.e., it was encoded)
    const isEncoded = rawId !== decodedId;
    if (isEncoded) {
      const currentHash = window.location.hash;
      const searchParams = currentHash.includes("?")
        ? currentHash.split("?")[1]
        : "";
      const prettyHash = `#/${entityType}/${decodedId}${searchParams ? "?" + searchParams : ""}`;

      // Replace the current URL with the pretty version without triggering navigation
      window.history.replaceState(
        null,
        "",
        window.location.pathname + prettyHash,
      );
    }
  }, [entityType, rawId, decodedId]);
}
