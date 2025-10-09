import { useEntityDocumentTitle } from "@/hooks/use-document-title";
import { useGraphData } from "@/hooks/use-graph-data";
import { useRawEntityData } from "@/hooks/use-raw-entity-data";
import { useGraphStore } from "@/stores/graph-store";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

function FunderRoute() {
  const { funderId } = Route.useParams();
  const navigate = useNavigate();

  const entityType = "funder" as const;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  const graphData = useGraphData();
  const { loadEntity } = graphData;
  const { loadEntityIntoGraph } = graphData;
  const nodeCount = useGraphStore((state) => state.totalNodeCount);

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
        to: "/funders/$funderId",
        params: { funderId: detection.normalizedId },
        search: (prev) => prev, // Preserve existing search params
        replace: true,
      });
      return;
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

    void loadFunder();
  }, [funderId, loadEntity, loadEntityIntoGraph, nodeCount]);

  // Show loading state
  if (rawEntityData.isLoading) {
    return (
      <div className="p-4 text-center">
        <h2>Loading Funder...</h2>
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

  return <div>Hello "/funders/$funderId"!</div>;
}

export const Route = createFileRoute("/funders/$funderId")({
  component: FunderRoute,
});
