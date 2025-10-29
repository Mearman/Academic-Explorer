import {
  useNavigate,
  useParams,
  createLazyFileRoute,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { IconUser } from "@tabler/icons-react";
import { EntityDetectionService } from "@academic-explorer/graph";
import { logError, logger } from "@academic-explorer/utils/logger";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";


function ORCIDAuthorRoute() {
  const { orcid } = useParams({ from: "/authors/orcid/$orcid" });
  const navigate = useNavigate();
  const graphData = useGraphData();
  const { loadEntity, loadEntityIntoGraph } = graphData;
  const graphStore = useGraphStore();
  const nodeCount = graphStore.totalNodeCount;

  useEffect(() => {
    const resolveORCID = async () => {
      try {
        // Decode the ORCID parameter
        const decodedORCID = decodeURIComponent(orcid);

        // Normalize the ORCID to full URL format
        // EntityDetectionService will validate and normalize the format
        const detection = EntityDetectionService.detectEntity(decodedORCID);

        if (!detection || detection.entityType !== "authors") {
          throw new Error(
            `Invalid ORCID format: ${decodedORCID}`,
          );
        }

        // Load the author entity directly using the normalized ORCID URL
        // The OpenAlex API accepts ORCID URLs as author IDs
        // If graph already has nodes, use incremental loading
        if (nodeCount > 0) {
          await loadEntityIntoGraph(detection.normalizedId);
        } else {
          await loadEntity(detection.normalizedId);
        }
        // No navigation needed - graph is always visible
      } catch (error) {
        logError(
          logger,
          "Failed to resolve ORCID:",
          error,
          "ORCIDAuthorRoute",
          "routing",
        );
        // Navigate to search with the ORCID as query
        void navigate({
          to: "/search",
          search: { q: orcid, filter: undefined, search: undefined },
          replace: true,
        });
      }
    };

    void resolveORCID();
  }, [orcid, navigate, loadEntity, loadEntityIntoGraph, nodeCount]);

  return (
    <div
      style={{
        padding: "40px 20px",
        textAlign: "center",
        fontSize: "16px",
      }}
    >
      <div style={{ marginBottom: "20px", fontSize: "18px" }}>
        <IconUser size={18} style={{ display: "inline", marginRight: "8px" }} />
        Resolving ORCID...
      </div>
      <div
        style={{
          fontFamily: "monospace",
          backgroundColor: "#f5f5f5",
          padding: "10px",
          borderRadius: "4px",
        }}
      >
        {decodeURIComponent(orcid)}
      </div>
      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        Loading author details and building citation graph
      </div>
    </div>
  );
}

export const Route = createLazyFileRoute("/authors/orcid/$orcid")({
  component: ORCIDAuthorRoute,
});

export default ORCIDAuthorRoute;
