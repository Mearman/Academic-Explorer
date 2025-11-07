import { useEffect } from "react";

// Track which entities we've attempted to decode to prevent retries
const attemptedDecodes = new Set<string>();

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

    const currentHash = window.location.hash;
    const hashPath = currentHash.split("?")[0];

    // Check if URL is currently encoded
    const isCurrentlyEncoded = hashPath.includes("%");

    const entityKey = `${entityType}:${decodedId}`;

    // Only skip if we've already attempted AND the URL is not currently encoded
    if (attemptedDecodes.has(entityKey) && !isCurrentlyEncoded) {
      return;
    }

    // Mark that we're attempting this decode
    attemptedDecodes.add(entityKey);

    // Wait for page to fully load and router to settle
    const timeoutId = setTimeout(() => {
      const currentHash = window.location.hash;
      const hashPath = currentHash.split("?")[0];

      // Only decode if currently encoded
      if (hashPath.includes("%") && !hashPath.includes(decodedId)) {
        const hashQueryParams = currentHash.includes("?")
          ? "?" + currentHash.split("?").slice(1).join("?")
          : "";

        const decodedHash = `#/${entityType}/${decodedId}${hashQueryParams}`;
        const newUrl = window.location.pathname + window.location.search + decodedHash;

        // Store original state to preserve router state
        const originalState = window.history.state;

        // Update URL without triggering router re-processing
        // We use a custom property to mark this as a "display-only" update
        const newState = {
          ...originalState,
          __prettyUrlUpdate: true,
        };

        window.history.replaceState(newState, "", newUrl);
      }
    }, 2000); // Wait 2 full seconds for everything to settle

    return () => clearTimeout(timeoutId);
  }, [entityType, rawId, decodedId]);
}
