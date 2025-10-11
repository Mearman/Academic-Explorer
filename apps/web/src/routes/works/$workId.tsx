import { FieldSelector } from "@/components/FieldSelector";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { useGraphStore } from "@/stores/graph-store";
import { decodeUrlQueryParams } from "@/utils/url-helpers";
import { WORK_FIELDS, type Work } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconBookmark, IconBookmarkOff } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const WORK_ROUTE_PATH = "/works/$workId";

function WorkRoute() {
  const { workId } = Route.useParams();
  const routeSearch = Route.useSearch();
  const navigate = useNavigate();

  // Strip query parameters from workId if present (defensive programming)
  const cleanWorkId = workId.split("?")[0];

  const entityType = "work" as const;
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
    }
  }, [workId, navigate]);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: workId,
    enabled: !!workId,
  });
  const work = rawEntityData.data as Work | undefined;

  // Update document title with work name
  useEntityDocumentTitle(work);

  // Track user interactions (visits and bookmarks)
  const userInteractions = useUserInteractions({
    entityId: workId,
    entityType: "work",
    autoTrackVisits: true,
  });

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

  // Parse selected fields from URL
  const selectedFields =
    typeof routeSearch?.select === "string"
      ? routeSearch.select.split(",").map((f) => f.trim())
      : [];

  // Handler for field selection changes
  const handleFieldsChange = (fields: readonly string[]) => {
    void navigate({
      to: WORK_ROUTE_PATH,
      params: { workId: cleanWorkId },
      search: fields.length > 0 ? { select: fields.join(",") } : {},
      replace: true,
    });
  };

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
              const title = work?.title || `Work ${workId}`;
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
              : "Bookmark this work"
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
          availableFields={WORK_FIELDS}
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
            // Handle paths with query parameters for hash-based routing
            window.location.hash = path;
          }}
        />
      )}
    </div>
  );
}

export const Route = createFileRoute(WORK_ROUTE_PATH)({
  component: WorkRoute,
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});

export default WorkRoute;
