import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconSearch } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/$externalId")({
  component: ExternalIdRoute,
});

function ExternalIdRoute() {
  const { externalId } = Route.useParams();
  const navigate = useNavigate();
  // EntityDetectionService uses static methods, no instance needed
  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  useEffect(() => {
    const resolveExternalId = async () => {
      try {
        // Decode the parameter
        const decodedId = decodeURIComponent(externalId);

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
          search: { q: externalId },
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
