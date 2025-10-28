import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  useParams,
  useSearch,
  useNavigate,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Parse query parameters from a path string and merge with additional search params
 * @param pathWithQuery Path potentially containing query parameters (e.g., "/works?filter=...")
 * @param additionalSearch Additional search params to merge (from routeSearch)
 * @returns Object with path and search params
 */
function parsePathAndSearch(
  pathWithQuery: string,
  additionalSearch?: Record<string, unknown>,
): {
  path: string;
  search: Record<string, string | number>;
} {
  const [path, queryString] = pathWithQuery.split("?");
  const search: Record<string, string | number> = {};

  // Parse query string from path
  if (queryString) {
    const params = new URLSearchParams(queryString);
    const numericKeys = new Set(["per_page", "page", "sample", "seed"]);

    params.forEach((value, key) => {
      if (numericKeys.has(key)) {
        const num = Number(value);
        search[key] = isNaN(num) ? value : num;
      } else {
        search[key] = value;
      }
    });
  }

  // Merge additional search params (from routeSearch)
  if (additionalSearch) {
    for (const [key, value] of Object.entries(additionalSearch)) {
      // Only merge string and number values
      if (typeof value === "string" || typeof value === "number") {
        search[key] = value;
      }
    }
  }

  return { path, search };
}

function ApiOpenAlexRoute() {
  const { _splat: splat } = useParams({ from: "/api-openalex-org/$" });
  const externalId = splat || "";
  const routeSearch = useSearch({ from: "/api-openalex-org/$" });
  const navigate = useNavigate();

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Decode the parameter
        const decodedId = decodeURIComponent(externalId);

        logger.debug(
          "routing",
          "ApiOpenAlexRoute: Starting resolution",
          { externalId, decodedId, routeSearch },
          "ApiOpenAlexRoute",
        );

        // Check if this is a full OpenAlex API URL that should be redirected
        const openAlexApiPattern = /^https?:\/\/api\.openalex\.org\/(.+)$/i;
        const apiMatch = decodedId.match(openAlexApiPattern);
        if (apiMatch) {
          const cleanPath = apiMatch[1];
          logger.debug(
            "routing",
            "Detected OpenAlex API URL, redirecting",
            { original: decodedId, cleanPath },
            "ApiOpenAlexRoute",
          );

          // Check if cleanPath is just an entity ID (like W2741809807)
          const entityType = EntityDetectionService.detectEntityType(cleanPath);
          if (entityType) {
            // Navigate to the proper entity route
            const targetPath = `/${entityType}/${cleanPath}`;
            const { path, search } = parsePathAndSearch(targetPath);
            navigate({ to: path, search, replace: true });
          } else {
            // Navigate to the clean path (for queries, etc.)
            const { path, search } = parsePathAndSearch(`/${cleanPath}`);
            navigate({ to: path, search, replace: true });
          }
          return;
        }

        // Handle the case where the splat contains the path part of an OpenAlex URL
        // (when the test constructs /api-openalex-org/{path})
        const pathWithQuery = decodedId;

        // Check if this looks like an OpenAlex path (starts with entity type or known endpoint)
        const entityType = EntityDetectionService.detectEntityType(
          pathWithQuery.split("?")[0],
        );
        if (entityType) {
          // This is an entity path like "W2741809807"
          const targetPath = `/${entityType}/${pathWithQuery}`;
          const { path, search } = parsePathAndSearch(targetPath);
          navigate({ to: path, search, replace: true });
          return;
        }

        // Check if this is a list endpoint
        if (
          pathWithQuery.startsWith("works") ||
          pathWithQuery.startsWith("authors") ||
          pathWithQuery.startsWith("institutions") ||
          pathWithQuery.startsWith("concepts") ||
          pathWithQuery.startsWith("funders") ||
          pathWithQuery.startsWith("publishers") ||
          pathWithQuery.startsWith("sources")
        ) {
          // Preserve query parameters by using navigate with parsed search
          const targetPath = `/${pathWithQuery}`;
          const { path, search } = parsePathAndSearch(targetPath, routeSearch as Record<string, unknown>);
          logger.debug(
            "routing",
            `Navigating to list endpoint: ${path} with search:`,
            search,
            "ApiOpenAlexRoute",
          );
          navigate({ to: path, search, replace: true });
          return;
        }

        // Check if this is an autocomplete endpoint
        if (pathWithQuery.startsWith("autocomplete/")) {
          const targetPath = `/${pathWithQuery}`;
          const { path, search } = parsePathAndSearch(targetPath);
          navigate({ to: path, search, replace: true });
          return;
        }

        // If not an API URL, try to detect entity type
        const entityTypeFromId =
          EntityDetectionService.detectEntityType(decodedId);
        if (entityTypeFromId) {
          logger.debug(
            "routing",
            "Detected entity type from external ID",
            { externalId: decodedId, entityType: entityTypeFromId },
            "ApiOpenAlexRoute",
          );
          // Navigate to the entity route
          const targetPath = `/${entityTypeFromId}/${decodedId}`;
          const { path, search } = parsePathAndSearch(targetPath);
          navigate({ to: path, search, replace: true });
          return;
        }

        // If nothing worked, redirect to search with the full OpenAlex URL
        const fullUrl = `https://api.openalex.org/${decodedId}`;
        const searchPath = `/search?q=${encodeURIComponent(fullUrl)}`;
        const { path, search } = parsePathAndSearch(searchPath);
        navigate({ to: path, search, replace: true });
      } catch (error) {
        logError(
          logger,
          "Error resolving external ID",
          error,
          "ApiOpenAlexRoute",
          "routing",
        );
      }
    };

    if (externalId) {
      resolveExternalId();
    }
  }, [externalId, navigate]);

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
          style={{ marginRight: "8px", verticalAlign: "middle" }}
        />
        Processing OpenAlex API URL
      </div>
      <div style={{ marginBottom: "20px" }}>
        Redirecting {decodeURIComponent(externalId)}
        {Object.keys(routeSearch).length > 0
          ? `?${new URLSearchParams(routeSearch as Record<string, string>).toString()}`
          : ""}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Detecting entity type and redirecting
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/api-openalex-org/$")({
  component: ApiOpenAlexRoute,
});

export default ApiOpenAlexRoute;
