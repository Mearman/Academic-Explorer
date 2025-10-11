import { FieldSelector } from "@/components/FieldSelector";
import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useUserInteractions } from "@/hooks/use-user-interactions";
import { useGraphStore } from "@/stores/graph-store";
import { decodeUrlQueryParams } from "@/utils/url-helpers";
import { INSTITUTION_FIELDS, type InstitutionEntity } from "@academic-explorer/client";
import { EntityDetectionService } from "@academic-explorer/graph";
import { ViewToggle } from "@academic-explorer/ui/components/ViewToggle";
import { RichEntityView } from "@academic-explorer/ui/components/entity-views";
import { logError, logger } from "@academic-explorer/utils/logger";
import { IconBookmark, IconBookmarkOff } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const INSTITUTION_ROUTE_PATH = "/institutions/$institutionId";

function InstitutionRoute() {
  const { institutionId } = Route.useParams();
  const routeSearch = Route.useSearch();
  const navigate = useNavigate();

  const entityType = "institution" as const;
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
    if (!institutionId) return;

    const detection = EntityDetectionService.detectEntity(institutionId);

    // If ID was normalized and is different from input, redirect
    if (detection?.normalizedId && detection.normalizedId !== institutionId) {
      logger.debug(
        "routing",
        "Redirecting to normalized institution ID",
        {
          originalId: institutionId,
          normalizedId: detection.normalizedId,
        },
        "InstitutionRoute",
      );

      // Replace current URL with normalized version, preserving query params
      void navigate({
        to: INSTITUTION_ROUTE_PATH,
        params: { institutionId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
    }
  }, [institutionId, navigate]);

  // Check if ID contains a full URL and redirect to clean ID
  useEffect(() => {
    if (!institutionId) return;

    // Check if institutionId contains a full OpenAlex URL
    if (
      institutionId.includes("https://openalex.org/") ||
      institutionId.includes("http://openalex.org/")
    ) {
      try {
        const url = new URL(
          institutionId.startsWith("http")
            ? institutionId
            : `https://openalex.org/${institutionId}`,
        );
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length === 1) {
          const cleanId = pathParts[0];
          logger.debug(
            "routing",
            "Redirecting from malformed institution URL to clean ID",
            {
              originalId: institutionId,
              cleanId,
            },
            "InstitutionRoute",
          );
          void navigate({
            to: INSTITUTION_ROUTE_PATH,
            params: { institutionId: cleanId },
            replace: true,
          });
        }
      } catch (error) {
        logError(
          logger,
          "Failed to parse institution URL for redirect",
          error,
          "InstitutionRoute",
          "routing",
        );
      }
    }
  }, [institutionId, navigate]);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityId: institutionId,
    enabled: !!institutionId,
  });
  const institution = rawEntityData.data as InstitutionEntity | undefined;

  // Update document title with institution name
  useEntityDocumentTitle(institution);

  // Track user interactions (visits and bookmarks)
  const userInteractions = useUserInteractions({
    entityId: institutionId,
    entityType: "institution",
    autoTrackVisits: true,
  });

  useEffect(() => {
    const loadInstitution = async () => {
      try {
        // If graph already has nodes, use incremental loading to preserve existing entities
        // This prevents clearing the graph when clicking on nodes or navigating
        if (nodeCount > 0) {
          await loadEntityIntoGraph(institutionId);
        } else {
          // If graph is empty, use full loading (clears graph for initial load)
          await loadEntity(institutionId);
        }
      } catch (error) {
        logError(
          logger,
          "Failed to load institution",
          error,
          "InstitutionRoute",
          "routing",
        );
      }
    };

    void loadInstitution();
  }, [institutionId, loadEntity, loadEntityIntoGraph, nodeCount]);

  // Parse selected fields from URL
  const selectedFields =
    typeof routeSearch?.select === "string"
      ? routeSearch.select.split(",").map((f) => f.trim())
      : [];

  // Handler for field selection changes
  const handleFieldsChange = (fields: readonly string[]) => {
    void navigate({
      to: INSTITUTION_ROUTE_PATH,
      params: { institutionId },
      search: fields.length > 0 ? { select: fields.join(",") } : {},
      replace: true,
    });
  };

  // Show loading state
  if (rawEntityData.isLoading) {
    return (
      <div className="p-4 text-center">
        <h2>Loading Institution...</h2>
        <p>Institution ID: {institutionId}</p>
      </div>
    );
  }

  // Show error state
  if (rawEntityData.error) {
    return (
      <div className="p-4 text-center text-red-500">
        <h2>Error Loading Institution</h2>
        <p>Institution ID: {institutionId}</p>
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
        <h2>No Institution Data Available</h2>
        <p>Institution ID: {institutionId}</p>
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
              const title =
                institution?.display_name || `Institution ${institutionId}`;
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
              : "Bookmark this institution"
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
          availableFields={INSTITUTION_FIELDS}
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

export const Route = createFileRoute(INSTITUTION_ROUTE_PATH)({
  component: InstitutionRoute,
  validateSearch: z.object({
    select: z.string().optional(),
  }),
});

export default InstitutionRoute;
