import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import {
  useNavigate,
  useParams,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";

function ExternalIdRoute() {
  const { externalId } = useParams({ from: "/$externalId" });
  const navigate = useNavigate();
  // EntityDetectionService uses static methods, no instance needed
  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const graphStore = useGraphStore();
  const nodeCount = graphStore.totalNodeCount;

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Handle double-encoded slashes first (%252F -> %2F)
        const processedId = externalId.replace(/%252F/gi, '%2F');
        // Decode the parameter
        const decodedId = decodeURIComponent(processedId);

        logger.debug(
          "routing",
          `ExternalIdRoute: Starting resolution`,
          { externalId, processedId, decodedId },
          "ExternalIdRoute",
        );

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
        if (knownRoutePrefixes.includes(decodedId)) {
          // This is a known route prefix, let other routes handle it
          return;
        }

        // Handle case where externalId contains path separators due to unencoded URLs
        // e.g., "works/https:/doi.org/..." should be treated as works route with ID "https://doi.org/..."
        const entityTypePrefixes = ["authors", "works", "institutions", "sources", "funders", "publishers", "topics", "concepts"];
        for (const entityType of entityTypePrefixes) {
          if (decodedId.startsWith(`${entityType}/`)) {
            // Extract the ID part after the entity type prefix
            let extractedId = decodedId.substring(entityType.length + 1);

            // Check if this is a properly formatted external canonical ID
            // If so, let the detection logic handle it instead of doing a simple redirect
            if (
              (extractedId.startsWith("https://doi.org/") ||
               extractedId.startsWith("http://doi.org/") ||
               extractedId.startsWith("https://orcid.org/") ||
               extractedId.startsWith("http://orcid.org/") ||
               extractedId.startsWith("https://ror.org/") ||
               extractedId.startsWith("http://ror.org/") ||
               extractedId.startsWith("issn:")) &&
              extractedId.match(/^https?:\/\//i) // Properly formatted with double slashes
            ) {
              // This is a properly formatted external canonical ID
              // Let the detection logic below handle it
              logger.debug(
                "routing",
                `ExternalIdRoute: Detected properly formatted external canonical ID, letting detection logic handle it`,
                { decodedId, entityType, extractedId },
                "ExternalIdRoute",
              );
              break; // Exit the for loop and let detection logic handle it
            }

            // Fix collapsed protocol slashes (https:/ -> https://)
            if (extractedId.match(/^https?:\//i) && !extractedId.match(/^https?:\/\//i)) {
              extractedId = extractedId.replace(/^(https?:\/?)/, "$1/");
            }
            if (extractedId.match(/^ror:\//i) && !extractedId.match(/^ror:\/\//i)) {
              extractedId = extractedId.replace(/^(ror:\/?)/, "$1/");
            }

            logger.debug(
              "routing",
              `ExternalIdRoute: Detected unencoded URL with entity type prefix. Redirecting to ${entityType} route`,
              { decodedId, entityType, extractedId },
              "ExternalIdRoute",
            );

            // Navigate to the correct entity route
            void navigate({
              to: `/${entityType}/${extractedId}`,
              replace: true,
            });
            return;
          }
        }

        logger.debug(
          "routing",
          `ExternalIdRoute: Processing external ID: ${decodedId}`,
          { decodedId },
          "ExternalIdRoute",
        );

        // Split ID and query parameters - the externalId might contain query params
        let idForDetection = decodedId;
        let preservedSearchParams: Record<string, string> = {};

        // Check if the decodedId contains query parameters
        const queryIndex = decodedId.indexOf("?");
        if (queryIndex !== -1) {
          // Split the ID from query parameters
          idForDetection = decodedId.substring(0, queryIndex);
          const queryString = decodedId.substring(queryIndex + 1);

          // Parse query parameters
          preservedSearchParams = {};
          const params = new URLSearchParams(queryString);
          params.forEach((value, key) => {
            preservedSearchParams[key] = value;
          });
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

          // Use the previously extracted query parameters
          const searchObj =
            Object.keys(preservedSearchParams).length > 0
              ? preservedSearchParams
              : undefined;

          void navigate({
            to: specificRoute,
            search: searchObj,
            replace: true,
          });
        } else if (
          detection?.entityType &&
          (detection.detectionMethod === "OpenAlex ID" ||
            detection.detectionMethod === "OpenAlex URL")
        ) {
          // This is an OpenAlex ID, navigate to specific entity route
          const { entityType } = detection;
          const entityRoute = `/${entityType}/${detection.normalizedId}`;

          // Use the previously extracted query parameters
          const searchObj =
            Object.keys(preservedSearchParams).length > 0
              ? preservedSearchParams
              : undefined;

          void navigate({
            to: entityRoute,
            search: searchObj,
            replace: true,
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
  }, [externalId, navigate, loadEntity, loadEntityIntoGraph, nodeCount]);

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

export const Route = createLazyFileRoute("/$externalId")({
  component: ExternalIdRoute,
});

export default ExternalIdRoute;
