import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/$_")({
  component: ExternalIdRoute,
});

function ExternalIdRoute() {
  const { _splat: splat } = Route.useParams();
  const externalId = splat || "";
  const routeSearch = Route.useSearch();
  const navigate = useNavigate();
  // Serialize routeSearch to avoid infinite loop from object reference changes
  const routeSearchKey = JSON.stringify(routeSearch);

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Decode the parameter
        let decodedId = decodeURIComponent(externalId);

        // Fix collapsed double slashes in protocol (https:/ -> https://)
        // This happens when URLs like https://api.openalex.org are used as route params
        // and the router normalizes consecutive slashes
        if (decodedId.match(/^https?:\//i) && !decodedId.match(/^https?:\/\//i)) {
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
          logger.debug(
            "routing",
            "Detected OpenAlex API URL in catch-all, redirecting",
            { original: decodedId, cleanPath },
            "ExternalIdRoute",
          );
          
          // Preserve query params from routeSearch
          const queryParams = routeSearch && typeof routeSearch === "object" 
            ? Object.entries(routeSearch)
                .map(([key, value]) => `${key}=${value}`)
                .join("&")
            : "";
          
          const newUrl = queryParams ? `/${cleanPath}?${queryParams}` : `/${cleanPath}`;
          window.location.replace(`#${newUrl}`);
          return;
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
        // Also check if the decodedId starts with any of these prefixes followed by a slash
        const isKnownRoute = knownRoutePrefixes.includes(decodedId) || 
          knownRoutePrefixes.some(prefix => decodedId.startsWith(`${prefix}/`));
        if (isKnownRoute) {
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

        // Clean up OpenAlex API URLs to match detection patterns
        // Convert: https://api.openalex.org/authors/A5023888391 -> https://api.openalex.org/A5023888391
        // The API uses REST-style paths but the entity detection expects the ID directly after openalex.org
        const apiPathMatch = idForDetection.match(/^(https?:\/\/(?:api\.)?openalex\.org)\/(?:authors|works|institutions|sources|funders|publishers|topics|concepts)\/([WASIPCFKQT]\d+)$/i);
        if (apiPathMatch) {
          idForDetection = `${apiPathMatch[1]}/${apiPathMatch[2]}`;
          logger.debug(
            "routing",
            "Cleaned OpenAlex API URL path",
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
              specificRoute = `/institutions/ror/${detection.normalizedId}`;
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
          throw new Error(`Unable to detect entity type for: ${decodedId}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
