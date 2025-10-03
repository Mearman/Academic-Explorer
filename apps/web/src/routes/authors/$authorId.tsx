import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { EntityDetectionService } from "@academic-explorer/graph";

export const Route = createFileRoute("/authors/$authorId")({
  component: AuthorRoute,
});

function AuthorRoute() {
  const { authorId } = Route.useParams();
  const navigate = useNavigate();

  const entityType = "author" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // DEBUGGING: Systematically re-enable hooks one by one
  // Step 1: ✅ useGraphStore works fine
  const { setProvider } = useGraphStore();
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Step 2: Re-enable useRawEntityData (entity data fetching)
  const rawEntityData = useRawEntityData({ entityId: authorId });

  // Step 3: Testing useEntityDocumentTitle hook
  useEntityDocumentTitle(rawEntityData.data);

  // Step 4: ✅ Testing refactored useGraphData (no worker dependency)
  const graphData = useGraphData();
  const { loadEntity, loadEntityIntoGraph } = graphData;

  // Normalization and redirect
  useEffect(() => {
    if (!authorId) return;

    const detection = EntityDetectionService.detectEntity(authorId);

    // If ID was normalized and is different from input, redirect
    if (detection?.normalizedId && detection.normalizedId !== authorId) {
      logger.debug(
        "routing",
        "Redirecting to normalized author ID",
        {
          originalId: authorId,
          normalizedId: detection.normalizedId,
        },
        "AuthorRoute",
      );

      // Replace current URL with normalized version, preserving query params
      void navigate({
        to: "/authors/$authorId",
        params: { authorId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
      return;
    }
  }, [authorId, navigate]);

  // Load graph data
  useEffect(() => {
    const loadAuthor = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(authorId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
          await loadEntity(authorId);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to load author",
          error,
          "AuthorRoute",
          "routing",
        );
      }
    };

    void loadAuthor();
  }, [authorId, loadEntity, loadEntityIntoGraph, nodeCount]);

  logger.debug("route", "Author route loading with raw data display", {
    authorId,
    hasEntityData: !!rawEntityData.data,
    isLoading: rawEntityData.isLoading,
    error: rawEntityData.error,
    hasSetProvider: !!setProvider,
    hasGraphData: !!graphData,
  });

  // Show loading state
  if (rawEntityData.isLoading) {
    return (
      <div className="p-4 text-center">
        <h2>Loading Author...</h2>
        <p>Author ID: {authorId}</p>
      </div>
    );
  }

  // Show error state
  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Author</h2>
        <p>Author ID: {authorId}</p>
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

  // Show content based on view mode
  return (
    <div className="p-4 max-w-full overflow-auto">
      <ViewToggle
        viewMode={viewMode}
        onToggle={setViewMode}
        entityType={entityType}
      />

      {viewMode === "raw" ? (
        <pre className="json-view p-4 bg-gray-100 overflow-auto mt-4">
          {JSON.stringify(rawEntityData.data, null, 2)}
        </pre>
      ) : (
        <RichEntityView entity={rawEntityData.data!} entityType={entityType} />
      )}
    </div>
  );
}
