/**
 * Hook for automatic relationship detection when any nodes are added to the graph
 * Listens for BULK_NODES_ADDED events and triggers relationship detection for all entity types
 */

import { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GraphEventType } from "@academic-explorer/graph";
import { useEventBus } from "./use-unified-event-system";
import { getRelationshipDetectionService } from "@academic-explorer/utils";
import { useGraphStore } from "@/stores/graph-store";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphEdge } from "@academic-explorer/graph";

// Interface for node structure
interface NodeLike {
  entityType: string;
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
    "entityType" in value &&
    "id" in value &&
    typeof value.entityType === "string" &&
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
  const _queryClient = useQueryClient();
  const relationshipDetectionService = useMemo(() => getRelationshipDetectionService(), []);
  const eventBus = useEventBus();

  useEffect(() => {
    logger.debug("relationship-detection", "useAutoRelationshipDetection hook initialized", {});

    const handler = (event: any) => {
      logger.debug("relationship-detection", "BULK_NODES_ADDED event received", { event });

      // Type guard for the event
      if (!isValidEvent(event)) {
        logger.debug("relationship-detection", "Event failed type guard", {});
        return;
      }

      if (!event.payload || typeof event.payload !== "object") {
        logger.debug("relationship-detection", "Event payload invalid", {});
        return;
      }
      const {payload} = event;
      if (!("nodes" in payload) || !Array.isArray(payload.nodes)) {
        logger.debug("relationship-detection", "Event payload missing nodes array", {});
        return;
      }
      const validNodes = payload.nodes.filter(isValidNode);
      if (validNodes.length === 0) {
        logger.debug("relationship-detection", "No valid nodes in event", {});
        return;
      }
      const { nodes } = { nodes: validNodes };
    if (nodes.length === 0) {
      logger.debug("graph", "No nodes in bulk addition, skipping relationship detection");
      return;
    }

    logger.debug("relationship-detection", "About to trigger relationship detection", { nodeCount: nodes.length });

    logger.debug("graph", "Nodes added to graph, triggering relationship detection", {
      nodeCount: nodes.length,
      nodeTypes: [...new Set(nodes.map((node: NodeLike) => node.entityType))],
      nodeIds: nodes.map((node: NodeLike) => node.id)
    });

    // Get all current node IDs for relationship detection
    const store = useGraphStore.getState();
    const allNodeIds = Object.keys(store.nodes);

    // Trigger relationship detection asynchronously for all nodes
    relationshipDetectionService.detectRelationships(allNodeIds)
      .then((detectedEdges: unknown) => {
        // Type guard to ensure we have GraphEdge array
        if (!Array.isArray(detectedEdges)) {
          logger.warn("graph", "Expected array of edges from relationship detection service", { detectedEdges });
          return;
        }
        const edgesArray = detectedEdges as GraphEdge[];
        // Service returns properly typed GraphEdge[], but validate for safety
        const validEdges = edgesArray.filter(isValidGraphEdge);
        if (validEdges.length > 0) {
          logger.debug("graph", "Detected relationships between nodes", {
            edgeCount: validEdges.length,
            edgeTypes: [...new Set(validEdges.map(edge => edge.type))],
            edgeDetails: validEdges.map(edge => ({
              entityType: edge.type,
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
          nodeTypes: [...new Set(nodes.map((node: NodeLike) => node.entityType))]
        });
      });
    };

    eventBus.on(GraphEventType.BULK_NODES_ADDED, handler);

    return () => {
      eventBus.off(GraphEventType.BULK_NODES_ADDED, handler);
    };
  }, [eventBus, relationshipDetectionService]);

  // Return nothing - this is a side-effect only hook
  return undefined;
}
