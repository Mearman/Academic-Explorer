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
import type { GraphEdge } from "@/lib/graph/types";

// Interface for node structure
interface NodeLike {
  type: string;
  id: string;
}

// Note: EdgeLike interface removed - service returns proper GraphEdge objects

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

// Type guard for GraphEdge objects
function isValidGraphEdge(value: unknown): value is GraphEdge {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    "type" in value &&
    "source" in value &&
    "target" in value &&
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.target === "string" &&
    // type should be a valid RelationType, but string validation is sufficient for type guard
    typeof value.type === "string"
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
    console.log("DEBUG: useAutoRelationshipDetection hook initialized");

    const unsubscribe = eventBus.on(GraphEventType.BULK_NODES_ADDED, (event: unknown) => {
      console.log("DEBUG: BULK_NODES_ADDED event received", event);

      // Type guard for the event
      if (!isValidEvent(event)) {
        console.log("DEBUG: Event failed type guard");
        return;
      }

      if (!event.payload || typeof event.payload !== "object") {
        console.log("DEBUG: Event payload invalid");
        return;
      }
      const payload = event.payload;
      if (!("nodes" in payload) || !Array.isArray(payload.nodes)) {
        console.log("DEBUG: Event payload missing nodes array");
        return;
      }
      const validNodes = payload.nodes.filter(isValidNode);
      if (validNodes.length === 0) {
        console.log("DEBUG: No valid nodes in event");
        return;
      }
      const { nodes } = { nodes: validNodes };
    if (nodes.length === 0) {
      logger.debug("graph", "No nodes in bulk addition, skipping relationship detection");
      return;
    }

    console.log("DEBUG: About to trigger relationship detection for", nodes.length, "nodes");

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
      .then((detectedEdges: GraphEdge[]) => {
        // Service returns properly typed GraphEdge[], but validate for safety
        const validEdges = detectedEdges.filter(isValidGraphEdge);
        if (validEdges.length > 0) {
          logger.debug("graph", "Detected relationships between nodes", {
            edgeCount: validEdges.length,
            edgeTypes: [...new Set(validEdges.map((edge: GraphEdge) => edge.type))],
            edgeDetails: validEdges.map((edge: GraphEdge) => ({
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