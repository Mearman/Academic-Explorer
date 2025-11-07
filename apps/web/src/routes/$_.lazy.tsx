import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  useNavigate,
  useParams,
  useSearch,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";

function ExternalIdRoute() {
  const { _splat: splat } = useParams({ from: "/$_" });
  const externalId = splat || "";
  const routeSearch = useSearch({ from: "/$_" });
  const navigate = useNavigate();
  // Serialize routeSearch to avoid infinite loop from object reference changes
  const routeSearchKey = JSON.stringify(routeSearch);

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Handle double-encoded slashes first (%252F -> %2F)
        const processedId = externalId.replace(/%252F/gi, '%2F');
        // Decode the parameter
        let decodedId = decodeURIComponent(processedId);

        // Fix collapsed double slashes in protocol (https:/ -> https://)
        // This happens when URLs like https://api.openalex.org are used as route params
        // and the router normalizes consecutive slashes
        if (
          decodedId.match(/^https?:\//i) &&
          !decodedId.match(/^https?:\/\//i)
        ) {
          decodedId = decodedId.replace(/^(https?:\/?)/, "$1/");
          logger.debug(
            "routing",
            "Fixed collapsed protocol slashes in external ID",
            { original: externalId, fixed: decodedId },
            "ExternalIdRoute",
          );
        }

        // Check if this is a full OpenAlex API URL that should be redirected
        // e.g., https://api.openalex.org/autocomplete/works?filter=...
        const openAlexApiPattern = /^https?:\/\/api\.openalex\.org\/(.+)$/i;
        const apiMatch = decodedId.match(openAlexApiPattern);
        if (apiMatch) {
          const cleanPath = apiMatch[1];

          // Check if this path contains external IDs (like ror:, orcid:, etc.)
          // If so, let it fall through to entity detection logic instead of doing simple redirect
          const hasExternalId = /:/.test(cleanPath);

          if (!hasExternalId) {
            logger.debug(
              "routing",
              "Detected OpenAlex API URL in catch-all, redirecting",
              { original: decodedId, cleanPath },
              "ExternalIdRoute",
            );

            // Preserve query params from routeSearch
            const queryParams =
              routeSearch && typeof routeSearch === "object"
                ? Object.entries(routeSearch)
                    .map(([key, value]) => `${key}=${value}`)
                    .join("&")
                : "";

            // Properly concatenate query parameters
            const hasExistingParams = cleanPath.includes("?");
            const newUrl = queryParams
              ? hasExistingParams
                ? `/${cleanPath}&${queryParams}`
                : `/${cleanPath}?${queryParams}`
              : `/${cleanPath}`;
            window.location.replace(`#${newUrl}`);
            return;
          } else {
            // This URL contains external IDs (like ror:), let it fall through to entity detection
            logger.debug(
              "routing",
              "OpenAlex API URL contains external IDs, falling through to entity detection",
              { original: decodedId, cleanPath },
              "ExternalIdRoute",
            );
          }
        }

        // Skip known route prefixes that should be handled by other routes
        const knownRoutePrefixes = [
          "openalex-url",
          "api",
          "autocomplete",
          "authors",
          "works",
          "institutions",
          "sources",
          "funders",
          "publishers",
          "topics",
          "concepts",
          "about",
          "browse",
          "cache",
          "error-test",
          "evaluation",
          "explore",
          "search",
        ];
        // Handle case where decodedId contains path separators due to unencoded URLs
        // e.g., "works/https:/doi.org/..." should be treated as works route with ID "https://doi.org/..."
        const entityTypePrefixes = ["authors", "works", "institutions", "sources", "funders", "publishers", "topics", "concepts"];
        for (const entityType of entityTypePrefixes) {
          if (decodedId.startsWith(`${entityType}/`)) {
            // Extract the ID part after the entity type prefix
            let extractedId = decodedId.substring(entityType.length + 1);

            // Fix collapsed protocol slashes (https:/ -> https://)
            if (extractedId.match(/^https?:\//i) && !extractedId.match(/^https?:\/\//i)) {
              extractedId = extractedId.replace(/^(https?:\/?)/, "$1/");
            }
            if (extractedId.match(/^ror:\//i) && !extractedId.match(/^ror:\/\//i)) {
              extractedId = extractedId.replace(/^(ror:\/?)/, "$1/");
            }

            logger.debug(
              "routing",
              `Splat route: Detected unencoded URL with entity type prefix. Redirecting to ${entityType} route`,
              { decodedId, entityType, extractedId },
              "ExternalIdRoute",
            );

            // Navigate to the correct entity route with properly encoded ID
            // This prevents TanStack Router from treating slashes in the ID as path separators
            void navigate({
              to: `/${entityType}/${encodeURIComponent(extractedId)}`,
              replace: true,
            });
            return;
          }
        }

        // Also check if the decodedId exactly matches a known route prefix (without trailing path)
        if (knownRoutePrefixes.includes(decodedId)) {
          // This is a known route prefix, let other routes handle it
          return;
        }

        logger.debug(
          "routing",
          `ExternalIdRoute: Processing external ID: ${decodedId}`,
          { decodedId, routeSearch },
          "ExternalIdRoute",
        );

        // Split ID and query parameters - the externalId might contain query params
        let idForDetection = decodedId;
        let preservedSearchParams: Record<string, string> = {};

        // First, check if there are search params in the route itself (from TanStack Router)
        // This handles cases like /#/https://api.openalex.org/authors/A5023888391?select=id
        if (routeSearch && typeof routeSearch === "object") {
          preservedSearchParams = { ...routeSearch } as Record<string, string>;
        }

        // Check if the decodedId contains query parameters
        const queryIndex = decodedId.indexOf("?");
        if (queryIndex !== -1) {
          // Split the ID from query parameters
          idForDetection = decodedId.substring(0, queryIndex);
          const queryString = decodedId.substring(queryIndex + 1);

          // Parse query parameters and merge with route search params
          const params = new URLSearchParams(queryString);
          params.forEach((value, key) => {
            preservedSearchParams[key] = value;
          });
        }

        // Basic validation: reject obviously invalid IDs early
        if (!idForDetection || idForDetection.trim().length === 0) {
          logger.warn(
            "routing",
            "Empty or invalid ID provided, redirecting to search",
            { decodedId },
            "ExternalIdRoute",
          );

          void navigate({
            to: "/search",
            search: { q: "", filter: undefined, search: undefined },
            replace: true,
          });
          return;
        }

        // Reject obviously invalid patterns
        const invalidPatterns = [
          /^[^a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/, // Contains invalid URL characters
          /^\s+$/, // Only whitespace
          /^(data:|javascript:|vbscript:)/i, // Dangerous protocols
        ];

        if (invalidPatterns.some(pattern => pattern.test(idForDetection))) {
          logger.warn(
            "routing",
            "Invalid ID pattern detected, redirecting to search",
            { idForDetection },
            "ExternalIdRoute",
          );

          void navigate({
            to: "/search",
            search: { q: idForDetection, filter: undefined, search: undefined },
            replace: true,
          });
          return;
        }

        // Clean up OpenAlex API URLs to match detection patterns
        // Convert: https://api.openalex.org/authors/A5023888391 -> https://api.openalex.org/A5023888391
        // The API uses REST-style paths but the entity detection expects the ID directly after openalex.org
        const apiPathMatch = idForDetection.match(
          /^(https?:\/\/(?:api\.)?openalex\.org)\/(?:authors|works|institutions|sources|funders|publishers|topics|concepts)\/([WASIPCFKQT]\d+)$/i,
        );
        if (apiPathMatch) {
          idForDetection = `${apiPathMatch[1]}/${apiPathMatch[2]}`;
          logger.debug(
            "routing",
            "Cleaned OpenAlex API URL path",
            { original: decodedId, cleaned: idForDetection },
            "ExternalIdRoute",
          );
        }

        // Clean up OpenAlex API URLs with external IDs (ROR, ORCID, etc.)
        // Convert: https://api.openalex.org/institutions/ror:02y3ad647 -> ror:02y3ad647
        const externalIdApiPathMatch = idForDetection.match(
          /^https?:\/\/(?:api\.)?openalex\.org\/(?:authors|works|institutions|sources|funders|publishers|topics|concepts)\/(.+)$/i,
        );
        if (externalIdApiPathMatch) {
          idForDetection = externalIdApiPathMatch[1];
          logger.debug(
            "routing",
            "Cleaned OpenAlex API URL with external ID",
            { original: decodedId, cleaned: idForDetection },
            "ExternalIdRoute",
          );
        }

        // Detect entity type and ID type
        const detection = EntityDetectionService.detectEntity(idForDetection);

        if (
          detection?.entityType &&
          detection.detectionMethod !== "OpenAlex ID" &&
          detection.detectionMethod !== "OpenAlex URL"
        ) {
          // This is a recognized external ID, redirect to specific route
          let specificRoute: string;

          switch (detection.detectionMethod) {
            case "DOI":
              specificRoute = `/works/doi/${encodeURIComponent(detection.normalizedId)}`;
              break;
            case "ORCID":
              specificRoute = `/authors/orcid/${detection.normalizedId}`;
              break;
            case "ROR":
              // Extract raw ROR ID from normalized URL for the route
              // normalizedId is like "https://ror.org/02y3ad647" but route expects "02y3ad647"
              const rorIdMatch = detection.normalizedId.match(/ror\.org\/([a-z0-9]{9})$/i);
              const rorIdForRoute = rorIdMatch ? rorIdMatch[1] : detection.normalizedId;
              specificRoute = `/institutions/ror/${rorIdForRoute}`;
              break;
            case "ISSN":
              specificRoute = `/sources/issn/${detection.normalizedId}`;
              break;
            default:
              throw new Error(
                `Unsupported detection method: ${detection.detectionMethod}`,
              );
          }

          // Navigate to the route first
          void navigate({
            to: specificRoute,
            replace: true,
          }).then(() => {
            // After navigation completes, update the URL with unencoded query parameters
            if (Object.keys(preservedSearchParams).length > 0) {
              const queryString = Object.entries(preservedSearchParams)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");
              const fullUrl = `${window.location.pathname}${window.location.hash.split("?")[0]}?${queryString}`;
              window.history.replaceState(null, "", fullUrl);
            }
          });
        } else if (
          detection?.entityType &&
          (detection.detectionMethod === "OpenAlex ID" ||
            detection.detectionMethod === "OpenAlex URL")
        ) {
          // This is an OpenAlex ID, navigate to specific entity route
          const { entityType } = detection;
          const entityRoute = `/${entityType}/${detection.normalizedId}`;

          // Navigate to the route first
          void navigate({
            to: entityRoute,
            replace: true,
          }).then(() => {
            // After navigation completes, update the URL with unencoded query parameters
            if (Object.keys(preservedSearchParams).length > 0) {
              const queryString = Object.entries(preservedSearchParams)
                .map(([key, value]) => `${key}=${value}`)
                .join("&");
              const fullUrl = `${window.location.pathname}${window.location.hash.split("?")[0]}?${queryString}`;
              window.history.replaceState(null, "", fullUrl);
            }
          });
        } else {
          // Instead of throwing, immediately redirect to search
          logger.warn(
            "routing",
            "Unable to detect entity type, redirecting to search",
            { decodedId, idForDetection, detection },
            "ExternalIdRoute",
          );

          // Immediate fallback to search without throwing
          void navigate({
            to: "/search",
            search: { q: decodedId, filter: undefined, search: undefined },
            replace: true,
          });
          return;
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve external ID:",
          error,
          "ExternalIdRoute",
          "routing",
        );

        // Fallback to search
        void navigate({
          to: "/search",
          search: { q: externalId, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    void resolveExternalId();
  }, [externalId, routeSearchKey, navigate]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconSearch
          size={18}
          style={{ display: "inline", marginRight: "8px" }}
        />
        Resolving identifier...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(externalId)}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and loading data
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/$_")({
  component: ExternalIdRoute,
});

export default ExternalIdRoute;
