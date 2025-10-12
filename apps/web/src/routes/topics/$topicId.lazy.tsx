import { FieldSelector } from "@/components/FieldSelector";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { useGraphStore } from "@/stores/graph-store";
import { decodeUrlQueryParams } from "@/utils/url-helpers";
import { TOPIC_FIELDS } from "@academic-explorer/client";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconBookmark, IconBookmarkOff } from "@tabler/icons-react";
import { useNavigate, useParams, useSearch, createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

const TOPIC_ROUTE_PATH = "/topics/$topicId";

function TopicRoute() {
  const { topicId } = useParams({ from: "/topics/$topicId" });
  const routeSearch = useSearch({ from: "/topics/$topicId" });
  const navigate = useNavigate();

  const entityType = "topic" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");
  const hasDecodedUrlRef = useRef(false);

  // Decode URL-encoded query parameters on mount
  useEffect(() => {
    if (hasDecodedUrlRef.current) return;
    hasDecodedUrlRef.current = true;
    decodeUrlQueryParams();
  }, []);

  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: topicId,
    enabled: !!topicId,
  });
  const topic = rawEntityData.data;

  // Update document title with topic name
  useEntityDocumentTitle(topic);

  // Track user interactions (visits and bookmarks)
  const userInteractions = useUserInteractions({
    entityId: topicId,
    entityType: "topic",
    autoTrackVisits: true,
  });

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

  // Parse selected fields from URL
  const selectedFields =
    typeof routeSearch?.select === "string"
      ? routeSearch.select.split(",").map((f) => f.trim())
      : [];

  // Handler for field selection changes
  const handleFieldsChange = (fields: readonly string[]) => {
    void navigate({
      to: TOPIC_ROUTE_PATH,
      params: { topicId },
      search: { select: fields.length > 0 ? fields.join(",") : undefined },
      replace: true,
    });
  };

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

  // Show error if no data available
  if (!rawEntityData.data) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>No Topic Data Available</h2>
        <p>Topic ID: {topicId}</p>
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
      <div className="flex items-center justify-between mb-4">
        <ViewToggle
          viewMode={viewMode}
          onToggle={setViewMode}
          entityType={entityType}
        />

        <button
          onClick={async () => {
            if (userInteractions.isBookmarked) {
              await userInteractions.unbookmarkEntity();
            } else {
              const title = topic?.display_name || `Topic ${topicId}`;
              await userInteractions.bookmarkEntity(title);
            }
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            userInteractions.isBookmarked
              ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
          title={
            userInteractions.isBookmarked
              ? "Remove bookmark"
              : "Bookmark this topic"
          }
        >
          {userInteractions.isBookmarked ? (
            <IconBookmark size={16} fill="currentColor" />
          ) : (
            <IconBookmarkOff size={16} />
          )}
          {userInteractions.isBookmarked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>

      {/* Field Selector */}
      <div className="mb-4">
        <FieldSelector
          availableFields={TOPIC_FIELDS}
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

export const Route = createLazyFileRoute(TOPIC_ROUTE_PATH)({
  component: TopicRoute,
});

export default TopicRoute;
