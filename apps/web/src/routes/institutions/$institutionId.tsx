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

export const Route = createFileRoute("/institutions/$institutionId")({
  component: InstitutionRoute,
});

function InstitutionRoute() {
  const { institutionId } = Route.useParams();
  const navigate = useNavigate();

  const entityType = "institution" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

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
        to: "/institutions/$institutionId",
        params: { institutionId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
      return;
    }
  }, [institutionId, navigate]);

  // Fetch entity data for title
  const rawEntityData = useRawEntityData({
    entityType,
    entityId: institutionId,
    enabled: !!institutionId,
  });
  const institution = rawEntityData.data;

  // Update document title with institution name
  useEntityDocumentTitle(institution);

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
