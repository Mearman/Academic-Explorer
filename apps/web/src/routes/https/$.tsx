import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/https/$")({
  component: HttpsRoute,
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

function HttpsRoute() {
  const { _splat } = Route.useParams();
  const navigate = useNavigate();

  logger.debug(`HttpsRoute: Called with _splat=${_splat}`);

  useEffect(() => {
    const resolveHttpsUrl = () => {
      try {
        // Check if splat parameter exists
        if (!_splat) {
          throw new Error("No URL path provided");
        }

        // Reconstruct the full URL from the splat parameter
        // _splat is URL-encoded, so decode it first
        const decodedSplat = decodeURIComponent(_splat);
        const fullUrl = `https://${decodedSplat}`;

        // First check if it's an OpenAlex query URL (with parameters)
        const queryUrlParse = parseOpenAlexQueryUrl(fullUrl);
        logger.debug(
          `HttpsRoute: queryUrlParse=${JSON.stringify(queryUrlParse)}`,
        );
        if (queryUrlParse && queryUrlParse.queryParams.toString()) {
          // This is an OpenAlex query URL, redirect to list route with query params
          const searchObj: Record<string, string> = {};
          queryUrlParse.queryParams.forEach((value, key) => {
            searchObj[key] = value;
          });

          const listRoute = `/${queryUrlParse.entityType}/`;
          void navigate({
            to: listRoute,
            search: searchObj,
            replace: true,
          });
          return;
        }

        // Detect entity type and ID from the URL
        const detection = EntityDetectionService.detectEntity(fullUrl);

        if (
          detection?.entityType &&
          detection.detectionMethod.includes("OpenAlex")
        ) {
          // This is an OpenAlex URL, redirect to direct entity route
          const entityRoute = `/${detection.entityType}/${detection.normalizedId}`;

          void navigate({
            to: entityRoute,
            replace: true,
          });
        } else {
          // Fallback to external ID route for further processing
          void navigate({
            to: `/${encodeURIComponent(fullUrl)}`,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to resolve HTTPS URL:",
          error,
          "HttpsRoute",
          "routing",
        );

        // Fallback to search
        void navigate({
          to: "/search",
          search: { q: _splat },
          replace: true,
        });
      }
    };

    resolveHttpsUrl();
  }, [_splat, navigate]);

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
        Resolving HTTPS URL...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        https://{decodeURIComponent(_splat ?? "")}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
}
