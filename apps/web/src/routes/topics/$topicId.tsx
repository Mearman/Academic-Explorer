import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";

export const Route = createFileRoute("/topics/$topicId")({
  component: TopicRoute,
});

function TopicRoute() {
  const { topicId } = Route.useParams();

  const entityType = "topic" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityType,
    entityId: topicId,
    enabled: !!topicId,
  });
  const topic = rawEntityData.data;

  // Update document title with topic name
  useEntityDocumentTitle(topic);

  useEffect(() => {
    const loadTopic = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(topicId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
          await loadEntity(topicId);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to load topic:",
          error,
          "TopicRoute",
          "routing",
        );
      }
    };

    void loadTopic();
  }, [topicId, loadEntity, loadEntityIntoGraph, nodeCount]);

  // Show loading state
  if (rawEntityData.isLoading) {
    return (
      <div className="p-4 text-center">
        <h2>Loading Topic...</h2>
        <p>Topic ID: {topicId}</p>
      </div>
    );
  }

  // Show error state
  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Topic</h2>
        <p>Topic ID: {topicId}</p>
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
