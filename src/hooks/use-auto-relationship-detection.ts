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

export function useAutoRelationshipDetection() {
  const queryClient = useQueryClient();
  const relationshipDetectionService = useMemo(() => getRelationshipDetectionService(queryClient), [queryClient]);
  const eventBus = useEventBus();

  useEffect(() => {
    const unsubscribe = eventBus.on(GraphEventType.BULK_NODES_ADDED, (event) => {
      if (!event.payload || typeof event.payload !== 'object') return;
      const payload = event.payload;
      if (!('nodes' in payload) || !Array.isArray(payload.nodes)) return;
      const { nodes } = payload;
    if (nodes.length === 0) {
      logger.debug("graph", "No nodes in bulk addition, skipping relationship detection");
      return;
    }

    logger.debug("graph", "Nodes added to graph, triggering relationship detection", {
      nodeCount: nodes.length,
      nodeTypes: [...new Set(nodes.map(node => node.type))],
      nodeIds: nodes.map(node => node.id)
    });

    // Get all current node IDs for relationship detection
    const store = useGraphStore.getState();
    const allNodeIds = Object.keys(store.nodes);

    // Trigger relationship detection asynchronously for all nodes
    relationshipDetectionService.detectRelationshipsForNodes(allNodeIds)
      .then((detectedEdges) => {
        if (detectedEdges && detectedEdges.length > 0) {
          logger.debug("graph", "Detected relationships between nodes", {
            edgeCount: detectedEdges.length,
            edgeTypes: [...new Set(detectedEdges.map(edge => edge.type))],
            edgeDetails: detectedEdges.map(edge => ({
              type: edge.type,
              source: edge.source,
              target: edge.target
            }))
          });

          store.addEdges(detectedEdges);

          logger.debug("graph", "Added relationship edges to graph store", {
            edgeCount: detectedEdges.length
          });
        } else {
          logger.debug("graph", "No relationships detected between nodes");
        }
      })
      .catch((error: unknown) => {
        logger.error("graph", "Failed to detect relationships between nodes", {
          error: error instanceof Error ? error.message : "Unknown error",
          nodeCount: nodes.length,
          nodeTypes: [...new Set(nodes.map(node => node.type))]
        });
      });
    });

    return unsubscribe;
  }, [eventBus, relationshipDetectionService]);

  // Return nothing - this is a side-effect only hook
  return undefined;
}