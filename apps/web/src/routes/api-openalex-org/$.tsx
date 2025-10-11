import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/api-openalex-org/$")({
  component: ApiOpenAlexRoute,
});

/**
 * Parse OpenAlex query URL and extract entity type and query parameters
 */
function parseOpenAlexQueryUrl(
  url: string,
): { entityType: string; queryParams: URLSearchParams } | null {
  try {
    const urlObj = new URL(url);

    // Check if it's an OpenAlex domain
    if (
      !urlObj.hostname.includes("openalex.org") &&
      !urlObj.hostname.includes("api.openalex.org")
    ) {
      return null;
    }

    // Extract path segments
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    // Must have at least one path segment (entity type)
    if (pathParts.length === 0) {
      return null;
    }

    // Handle autocomplete endpoints first
    if (pathParts.length >= 2 && pathParts[0] === "autocomplete") {
      const autocompleteType = pathParts[1].toLowerCase();
      if (autocompleteType === "authors") {
        return {
          entityType: `autocomplete/${autocompleteType}`,
          queryParams: urlObj.searchParams,
        };
      }
      return null; // Other autocomplete types not supported yet
    }

    const entityType = pathParts[0].toLowerCase();

    // Validate entity type
    const validEntityTypes = [
      "works",
      "authors",
      "institutions",
      "sources",
      "publishers",
      "funders",
      "topics",
      "concepts",
      "keywords",
    ];
    if (!validEntityTypes.includes(entityType)) {
      return null;
    }

    // For regular entity types, return with query params
    return {
      entityType,
      queryParams: urlObj.searchParams,
    };
  } catch {
    // Invalid URL format
    return null;
  }
}

function ApiOpenAlexRoute() {
  const { _splat } = Route.useParams();
  const search = useSearch({ from: "/api-openalex-org/$" });
  const navigate = useNavigate();

  logger.debug(
    "routing",
    `ApiOpenAlexRoute: Called with _splat=${_splat}, search=${JSON.stringify(search)}`,
    { _splat, search },
    "ApiOpenAlexRoute",
  );

  useEffect(() => {
    const resolveApiUrl = () => {
      try {
        if (!_splat) {
          throw new Error("No URL path provided");
        }

        // Reconstruct the full path with query string
        const searchParams = new URLSearchParams(
          search as Record<string, string>,
        ).toString();
        const fullPath = searchParams ? `${_splat}?${searchParams}` : _splat;
        const decodedSplat = decodeURIComponent(fullPath);
        const fullUrl = `https://api.openalex.org/${decodedSplat}`;

        logger.debug(
          "routing",
          `ApiOpenAlexRoute: fullUrl=${fullUrl}`,
          { fullUrl },
          "ApiOpenAlexRoute",
        );

        // First check if it's an OpenAlex query URL (list with parameters)
        const queryUrlParse = parseOpenAlexQueryUrl(fullUrl);
        logger.debug(
          "routing",
          `ApiOpenAlexRoute: queryUrlParse=${JSON.stringify(queryUrlParse)}`,
          { queryUrlParse },
          "ApiOpenAlexRoute",
        );
        if (queryUrlParse && queryUrlParse.queryParams.toString()) {
          // Check if this is actually a list query (single path segment) or entity with params
          const urlObj = new URL(fullUrl);
          const pathParts = urlObj.pathname.split("/").filter(Boolean);

          if (pathParts.length === 1) {
            // This is a list query like /authors?filter=...
            const searchObj: Record<string, string> = {};
            queryUrlParse.queryParams.forEach((value, key) => {
              searchObj[key] = value;
            });

            const listRoute = `/${queryUrlParse.entityType}/`;
            logger.debug(
              "routing",
              `ApiOpenAlexRoute: Navigating to ${listRoute} with search ${JSON.stringify(searchObj)}`,
              { listRoute, searchObj },
              "ApiOpenAlexRoute",
            );
            void navigate({
              to: listRoute,
              search: searchObj,
              replace: true,
            });
            return;
          }
          // If pathParts.length > 1, it's an entity URL with params, continue to entity detection
        }

        const detection = EntityDetectionService.detectEntity(fullUrl);

        if (
          detection?.entityType &&
          detection.detectionMethod.includes("OpenAlex")
        ) {
          const entityRoute = `/${detection.entityType}/${detection.normalizedId}`;

          // Check if the original URL had query parameters and preserve them
          const urlObj = new URL(fullUrl);
          const searchObj: Record<string, string> = {};
          urlObj.searchParams.forEach((value, key) => {
            searchObj[key] = value;
          });

          void navigate({
            to: entityRoute,
            search: Object.keys(searchObj).length > 0 ? searchObj : undefined,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve API URL:",
          error,
          "ApiOpenAlexRoute",
          "routing",
        );
        void navigate({
          to: "/search",
          search: { q: _splat },
          replace: true,
        });
      }
    };

    resolveApiUrl();
  }, [_splat, search, navigate]);

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
        Resolving API URL...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        api.openalex.org/{decodeURIComponent(_splat ?? "")}
        {Object.keys(search).length > 0
          ? `?${new URLSearchParams(search as Record<string, string>).toString()}`
          : ""}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
}
