import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useGraphStore } from "@/stores/graph-store";
import { EntityDetectionService } from "@academic-explorer/graph";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/works/$workId")({
  component: WorkRoute,
});

function WorkRoute() {
	const { workId } = Route.useParams()
	const navigate = useNavigate()

  const entityType = "work" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Check if ID needs normalization and redirect if necessary
  useEffect(() => {
    if (!workId) return;

    const detection = EntityDetectionService.detectEntity(workId);

    // If ID was normalized and is different from input, redirect
    if (detection?.normalizedId && detection.normalizedId !== workId) {
      logger.debug(
        "routing",
        "Redirecting to normalized work ID",
        {
          originalId: workId,
          normalizedId: detection.normalizedId,
        },
        "WorkRoute",
      );

      // Replace current URL with normalized version, preserving query params
      void navigate({
        to: "/works/$workId",
        params: { workId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
      return;
    }
  }, [workId, navigate]);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: workId,
    enabled: !!workId,
  });
  const work = rawEntityData.data;

  // Update document title with work name
  useEntityDocumentTitle(work);

  useEffect(() => {
    const loadWork = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(workId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
          await loadEntity(workId);
        }
      } catch (error) {
        logError(logger, "Failed to load work", error, "WorkRoute", "routing");
      }
    };

    void loadWork();
  }, [workId, loadEntity, loadEntityIntoGraph, nodeCount]);

  // Show loading state
  if (rawEntityData.isLoading) {
    return (
      <div className="p-4 text-center">
        <h2>Loading Work...</h2>
        <p>Work ID: {workId}</p>
      </div>
    );
  }

  // Show error state
  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Work</h2>
        <p>Work ID: {workId}</p>
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
        <h2>No Work Data Available</h2>
        <p>Work ID: {workId}</p>
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
        <RichEntityView
          entity={rawEntityData.data}
          entityType={entityType}
          onNavigate={(path: string) => void navigate({ to: path })}
        />
      )}
    </div>
  );
}
