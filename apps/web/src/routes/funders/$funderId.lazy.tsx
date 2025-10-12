import { FieldSelector } from "@/components/FieldSelector";
import { EntityMiniGraph } from "@/components/graph/EntityMiniGraph";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useEntityMiniGraphData } from "@/hooks/use-entity-mini-graph-data";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useGraphStore } from "@/stores/graph-store";
import { decodeUrlQueryParams } from "@/utils/url-helpers";
import { FUNDER_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import {
  useNavigate,
  useParams,
  useSearch,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const FUNDER_ROUTE_PATH = "/funders/$funderId";

function FunderRoute() {
  const { funderId } = useParams({ from: "/funders/$funderId" });
  const routeSearch = useSearch({ from: "/funders/$funderId" });
  const navigate = useNavigate();

  const entityType = "funder" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");
  const hasDecodedUrlRef = useRef(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  // Decode URL-encoded query parameters on mount
  useEffect(() => {
    if (hasDecodedUrlRef.current) return;
    hasDecodedUrlRef.current = true;
    decodeUrlQueryParams();
  }, []);

  // Handle "random" keyword - fetch a random funder and redirect
  useEffect(() => {
    if (funderId?.toLowerCase() !== "random" || isLoadingRandom) return;

    const loadRandomFunder = async () => {
      setIsLoadingRandom(true);
      try {
        logger.debug(
          "routing",
          "Fetching random funder",
          undefined,
          "FunderRoute",
        );

        const response = await cachedOpenAlex.client.funders.randomSample(1);

        if (response.results.length > 0) {
          const randomFunder = response.results[0];
          const cleanId = randomFunder.id.replace("https://openalex.org/", "");

          logger.debug(
            "routing",
            "Redirecting to random funder",
            {
              funderId: cleanId,
              name: randomFunder.display_name,
            },
            "FunderRoute",
          );

          void navigate({
            to: FUNDER_ROUTE_PATH,
            params: { funderId: cleanId },
            search: (prev) => prev,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to fetch random funder",
          error,
          "FunderRoute",
          "routing",
        );
        setIsLoadingRandom(false);
      }
    };

    void loadRandomFunder();
  }, [funderId, navigate, isLoadingRandom]);

  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Mini graph data for the top of the page
  const miniGraphData = useEntityMiniGraphData({
    entityId: funderId,
    entityType: "funders",
  });

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: funderId,
    enabled: !!funderId,
  });
  const funder = rawEntityData.data;

  // Update document title with funder name
  useEntityDocumentTitle(funder);

  // Check if ID needs normalization and redirect if necessary
  useEffect(() => {
    if (!funderId) return;

    const detection = EntityDetectionService.detectEntity(funderId);

    // If ID was normalized and is different from input, redirect
    if (detection?.normalizedId && detection.normalizedId !== funderId) {
      logger.debug(
        "routing",
        "Redirecting to normalized funder ID",
        {
          originalId: funderId,
          normalizedId: detection.normalizedId,
        },
        "FunderRoute",
      );

      // Replace current URL with normalized version, preserving query params
      void navigate({
        to: FUNDER_ROUTE_PATH,
        params: { funderId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
    }
  }, [funderId, navigate]);

  // Check if ID contains a full URL and redirect to clean ID
  useEffect(() => {
    if (!funderId) return;

    // Check if funderId contains a full OpenAlex URL
    if (
      funderId.includes("https://openalex.org/") ||
      funderId.includes("http://openalex.org/")
    ) {
      try {
        const url = new URL(
          funderId.startsWith("http")
            ? funderId
            : `https://openalex.org/${funderId}`,
        );
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length === 1) {
          const cleanId = pathParts[0];
          logger.debug(
            "routing",
            "Redirecting from malformed funder URL to clean ID",
            {
              originalId: funderId,
              cleanId,
            },
            "FunderRoute",
          );
          void navigate({
            to: FUNDER_ROUTE_PATH,
            params: { funderId: cleanId },
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to parse funder URL for redirect",
          error,
          "FunderRoute",
          "routing",
        );
      }
    }
  }, [funderId, navigate]);

  useEffect(() => {
    const loadFunder = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(funderId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
          await loadEntity(funderId);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to load funder",
          error,
          "FunderRoute",
          "routing",
        );
      }
    };

    // Don't try to load if we're resolving "random"
    if (funderId?.toLowerCase() !== "random") {
      void loadFunder();
    }
  }, [funderId, loadEntity, loadEntityIntoGraph, nodeCount]);

  // Parse selected fields from URL
  const selectedFields =
    typeof routeSearch?.select === "string"
      ? routeSearch.select.split(",").map((f) => f.trim())
      : [];

  // Handler for field selection changes
  const handleFieldsChange = (fields: readonly string[]) => {
    void navigate({
      to: FUNDER_ROUTE_PATH,
      params: { funderId },
      search: { select: fields.length > 0 ? fields.join(",") : undefined },
      replace: true,
    });
  };

  // Show loading state
  if (rawEntityData.isLoading || isLoadingRandom) {
    return (
      <div className="p-4 text-center">
        <h2>
          {isLoadingRandom ? "Finding Random Funder..." : "Loading Funder..."}
        </h2>
        <p>Funder ID: {funderId}</p>
      </div>
    );
  }

  // Show error state
  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Funder</h2>
        <p>Funder ID: {funderId}</p>
        <p>Error: {String(rawEntityData.error)}</p>
        <button
          onClick={() => rawEntityData.refetch?.()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show error if no data available
  if (!rawEntityData.data) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>No Funder Data Available</h2>
        <p>Funder ID: {funderId}</p>
        <button
          onClick={() => rawEntityData.refetch?.()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Show content based on view mode
  return (
    <div className="p-4 max-w-full overflow-auto">
      {/* Mini Graph View */}
      {miniGraphData.entity && (
        <div className="mb-6 flex justify-center">
          <EntityMiniGraph
            entity={miniGraphData.entity}
            relatedEntities={miniGraphData.relatedEntities}
          />
        </div>
      )}

      <ViewToggle
        viewMode={viewMode}
        onToggle={setViewMode}
        entityType={entityType}
      />

      {/* Field Selector */}
      <div className="mb-4 mt-4">
        <FieldSelector
          availableFields={FUNDER_FIELDS}
          selectedFields={selectedFields}
          onFieldsChange={handleFieldsChange}
        />
      </div>

      {viewMode === "raw" ? (
        <pre className="json-view p-4 bg-gray-100 overflow-auto mt-4">
          {JSON.stringify(rawEntityData.data, null, 2)}
        </pre>
      ) : (
        <RichEntityView
          entity={rawEntityData.data}
          entityType={entityType}
          onNavigate={(path: string) => {
            void navigate({ to: path });
          }}
        />
      )}
    </div>
  );
}

export const Route = createLazyFileRoute(FUNDER_ROUTE_PATH)({
  component: FunderRoute,
});
export default FunderRoute;
