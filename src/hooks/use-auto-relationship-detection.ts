/**
 * Hook for automatic relationship detection when any nodes are added to the graph
 * Listens for BULK_NODES_ADDED events and triggers relationship detection for all entity types
 */

import { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEventBus, GraphEventType } from "@/lib/graph/events";
import { getRelationshipDetectionService } from "@/lib/services/service-provider";
import { useGraphStore } from "@/stores/graph-store";
import { logger } from "@/lib/logger";

// Interface for node structure
interface NodeLike {
  type: string;
  id: string;
}

// Interface for edge structure
interface EdgeLike {
  type: string;
  source: string;
  target: string;
}

// Interface for event structure
interface EventLike {
  payload?: unknown;
}

// Type guard for graph nodes - using property existence checks
function isValidNode(value: unknown): value is NodeLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  // Check properties exist and have correct types without type assertion
  return (
    "type" in value &&
    "id" in value &&
    typeof value.type === "string" &&
    typeof value.id === "string"
  );
}

// Type guard for graph edges
function isValidEdge(value: unknown): value is EdgeLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "type" in value &&
    "source" in value &&
    "target" in value &&
    typeof value.type === "string" &&
    typeof value.source === "string" &&
    typeof value.target === "string"
  );
}

// Type guard for event structure
function isValidEvent(value: unknown): value is EventLike {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return true; // Any object is a valid event, payload is optional
}

export function useAutoRelationshipDetection() {
  const queryClient = useQueryClient();
  const relationshipDetectionService = useMemo(() => getRelationshipDetectionService(queryClient), [queryClient]);
  const eventBus = useEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.on(GraphEventType.BULK_NODES_ADDED, (event: unknown) => {
      // Type guard for the event
      if (!isValidEvent(event)) return;

      if (!event.payload || typeof event.payload !== "object") return;
      const payload = event.payload;
      if (!("nodes" in payload) || !Array.isArray(payload.nodes)) return;
      const validNodes = payload.nodes.filter(isValidNode);
      if (validNodes.length === 0) return;
      const { nodes } = { nodes: validNodes };
    if (nodes.length === 0) {
      logger.debug("graph", "No nodes in bulk addition, skipping relationship detection");
      return;
    }

    logger.debug("graph", "Nodes added to graph, triggering relationship detection", {
      nodeCount: nodes.length,
      nodeTypes: [...new Set(nodes.map((node: NodeLike) => node.type))],
      nodeIds: nodes.map((node: NodeLike) => node.id)
    });

    // Get all current node IDs for relationship detection
    const store = useGraphStore.getState();
    const allNodeIds = Object.keys(store.nodes);

    // Trigger relationship detection asynchronously for all nodes
    relationshipDetectionService.detectRelationshipsForNodes(allNodeIds)
      .then((detectedEdges: unknown) => {
        // Type guard for edges array
        if (!Array.isArray(detectedEdges)) return;

        const validEdges = detectedEdges.filter(isValidEdge);
        if (validEdges.length > 0) {
          logger.debug("graph", "Detected relationships between nodes", {
            edgeCount: validEdges.length,
            edgeTypes: [...new Set(validEdges.map((edge: EdgeLike) => edge.type))],
            edgeDetails: validEdges.map((edge: EdgeLike) => ({
              type: edge.type,
              source: edge.source,
              target: edge.target
            }))
          });

          store.addEdges(validEdges);

          logger.debug("graph", "Added relationship edges to graph store", {
            edgeCount: validEdges.length
          });
        } else {
          logger.debug("graph", "No relationships detected between nodes");
        }
      })
      .catch((error: unknown) => {
        logger.error("graph", "Failed to detect relationships between nodes", {
          error: error instanceof Error ? error.message : "Unknown error",
          nodeCount: nodes.length,
          nodeTypes: [...new Set(nodes.map((node: NodeLike) => node.type))]
        });
      });
    });

    return unsubscribe;
  }, [eventBus, relationshipDetectionService]);

  // Return nothing - this is a side-effect only hook
  return undefined;
}