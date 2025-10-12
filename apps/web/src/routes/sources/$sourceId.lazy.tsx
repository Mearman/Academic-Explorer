import { FieldSelector } from "@/components/FieldSelector";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useGraphStore } from "@/stores/graph-store";
import { decodeUrlQueryParams } from "@/utils/url-helpers";
import { SOURCE_FIELDS, cachedOpenAlex } from "@academic-explorer/client";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { useNavigate, useParams, useSearch, createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const SOURCE_ROUTE_PATH = "/sources/$sourceId";

function SourceRoute() {
  const { sourceId } = useParams({ from: "/sources/$sourceId" });
  const routeSearch = useSearch({ from: "/sources/$sourceId" });
  const navigate = useNavigate();

  const entityType = "source" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");
  const hasDecodedUrlRef = useRef(false);
  const [isLoadingRandom, setIsLoadingRandom] = useState(false);

  // Decode URL-encoded query parameters on mount
  useEffect(() => {
    if (hasDecodedUrlRef.current) return;
    hasDecodedUrlRef.current = true;
    decodeUrlQueryParams();
  }, []);

  // Handle "random" keyword - fetch a random source and redirect
  useEffect(() => {
    if (sourceId?.toLowerCase() !== "random" || isLoadingRandom) return;

    const loadRandomSource = async () => {
      setIsLoadingRandom(true);
      try {
        logger.debug("routing", "Fetching random source", undefined, "SourceRoute");

        const response = await cachedOpenAlex.client.sources.getRandomSources(1);

        if (response.results.length > 0) {
          const randomSource = response.results[0];
          const cleanId = randomSource.id.replace("https://openalex.org/", "");

          logger.debug("routing", "Redirecting to random source", {
            sourceId: cleanId,
            name: randomSource.display_name,
          }, "SourceRoute");

          void navigate({
            to: SOURCE_ROUTE_PATH,
            params: { sourceId: cleanId },
            search: (prev) => prev,
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to fetch random source",
          error,
          "SourceRoute",
          "routing",
        );
        setIsLoadingRandom(false);
      }
    };

    void loadRandomSource();
  }, [sourceId, navigate, isLoadingRandom]);

  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: sourceId,
    enabled: !!sourceId,
  });
  const source = rawEntityData.data;

  // Check if ID contains a full URL and redirect to clean ID
  useEffect(() => {
    if (!sourceId) return;

    // Check if sourceId contains a full OpenAlex URL
    if (
      sourceId.includes("https://openalex.org/") ||
      sourceId.includes("http://openalex.org/")
    ) {
      try {
        const url = new URL(
          sourceId.startsWith("http")
            ? sourceId
            : `https://openalex.org/${sourceId}`,
        );
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length === 1) {
          const cleanId = pathParts[0];
          logger.debug(
            "routing",
            "Redirecting from malformed source URL to clean ID",
            {
              originalId: sourceId,
              cleanId,
            },
            "SourceRoute",
          );
          void navigate({
            to: "/sources/$sourceId",
            params: { sourceId: cleanId },
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to parse source URL for redirect",
          error,
          "SourceRoute",
          "routing",
        );
      }
    }
  }, [sourceId, navigate]);

  // Update document title with source name
  useEntityDocumentTitle(source);

  useEffect(() => {
    const loadSource = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(sourceId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
          await loadEntity(sourceId);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to load source:",
          error,
          "SourceRoute",
          "routing",
        );
      }
    };

    // Don't try to load if we're resolving "random"
    if (sourceId?.toLowerCase() !== "random") {
      void loadSource();
    }
  }, [sourceId, loadEntity, loadEntityIntoGraph, nodeCount]);

  // Parse selected fields from URL
  const selectedFields =
    typeof routeSearch?.select === "string"
      ? routeSearch.select.split(",").map((f) => f.trim())
      : [];

  // Handler for field selection changes
  const handleFieldsChange = (fields: readonly string[]) => {
    void navigate({
      to: SOURCE_ROUTE_PATH,
      params: { sourceId },
      search: { select: fields.length > 0 ? fields.join(",") : undefined },
      replace: true,
    });
  };

  // Show loading state
  if (rawEntityData.isLoading || isLoadingRandom) {
    return (
      <div className="p-4 text-center">
        <h2>{isLoadingRandom ? "Finding Random Source..." : "Loading Source..."}</h2>
        <p>Source ID: {sourceId}</p>
      </div>
    );
  }

  // Show error state
  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Source</h2>
        <p>Source ID: {sourceId}</p>
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
        <h2>No Source Data Available</h2>
        <p>Source ID: {sourceId}</p>
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
      <ViewToggle
        viewMode={viewMode}
        onToggle={setViewMode}
        entityType={entityType}
      />

      {/* Field Selector */}
      <div className="mb-4 mt-4">
        <FieldSelector
          availableFields={SOURCE_FIELDS}
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

export const Route = createLazyFileRoute(SOURCE_ROUTE_PATH)({
  component: SourceRoute,
});

export default SourceRoute;
