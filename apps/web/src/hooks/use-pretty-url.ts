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

    // Prevent duplicate processing
    const currentHash = window.location.hash;
    const hashPath = currentHash.split("?")[0];

    // Only decode if currently encoded and the decoded version is different
    if (hashPath.includes("%") && !hashPath.includes(decodedId)) {
      // Use a very short timeout to ensure the component has fully mounted
      const timeoutId = setTimeout(() => {
        const latestHash = window.location.hash;
        const latestHashPath = latestHash.split("?")[0];

        // Double-check conditions after timeout and ensure we're not duplicating
        if (latestHashPath.includes("%") && !latestHashPath.includes(decodedId)) {
          // Extract query parameters carefully to avoid duplication
          let queryParams = "";
          const queryIndex = latestHash.indexOf("?");
          if (queryIndex !== -1) {
            queryParams = latestHash.substring(queryIndex);
            // Check if query parameters are already duplicated and fix if needed
            if (queryParams.includes("?")) {
              const queryString = queryParams.substring(1); // Remove the ?
              const uniqueParams = new URLSearchParams(queryString).toString();
              queryParams = uniqueParams ? "?" + uniqueParams : "";
            }
          }

          const decodedHash = `#/${entityType}/${decodedId}${queryParams}`;
          const newUrl = window.location.pathname + window.location.search + decodedHash;

          // Only update if the URL would actually change
          if (newUrl !== window.location.href) {
            console.log("usePrettyUrl updating URL:", {
              entityType,
              rawId,
              decodedId,
              oldHash: latestHash,
              newHash: decodedHash
            });
            window.history.replaceState(window.history.state, "", newUrl);
          }
        }
      }, 100); // Very short timeout for better UX

      return () => clearTimeout(timeoutId);
    }
  }, [entityType, rawId, decodedId]);
}
