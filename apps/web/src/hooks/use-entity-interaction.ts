/**
 * Hook for shared entity interaction logic
 * Provides consistent behavior for both graph node clicks and sidebar entity clicks
 */

import { useCallback } from "react";
import { useLayoutStore } from "@/stores/layout-store";
import { graphStore, useGraphStore } from "@/stores/graph-store";
import { useGraphData } from "@/hooks/use-graph-data";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode } from "@academic-explorer/graph";
import type { ExpansionOptions } from "@/services/graph-data-service";
import type { GraphState } from "@/stores/graph-store";

export interface EntityInteractionOptions {
  /** Whether to center the viewport on the node (for graph nodes) */
  centerOnNode?: boolean;
  /** Whether to expand the node after selection */
  expandNode?: boolean;
  /** Whether to pin the node */
  pinNode?: boolean;
  /** Whether to update the sidebar preview */
  updatePreview?: boolean;
}
export const INTERACTION_PRESETS = {
  GRAPH_NODE_CLICK: {
    centerOnNode: false,
    expandNode: false,
    pinNode: false,
    updatePreview: true,
  } as EntityInteractionOptions,
  GRAPH_NODE_DOUBLE_CLICK: {
    centerOnNode: true,
    expandNode: true,
    pinNode: true,
    updatePreview: true,
  } as EntityInteractionOptions,
};

export const useEntityInteraction = (
  centerOnNodeFn?: (nodeId: string, position: { x: number; y: number }) => void,
) => {
  const { loadEntityIntoGraph, expandNode } = useGraphData();
  const { setPreviewEntity, autoPinOnLayoutStabilization } = useLayoutStore();
  const { selectNode, clearAllPinnedNodes, pinNode } = useGraphStore();

  // Helper functions to reduce cognitive complexity
  const findOrLoadTargetNode = async ({
    entityId,
    loadEntityIntoGraph,
    getNodes,
  }: {
    entityId: string;
    loadEntityIntoGraph: (entityId: string) => Promise<void>;
    getNodes: () => Record<string, GraphNode>;
  }): Promise<GraphNode | undefined> => {
    // First check if a minimal node already exists
    let targetNode = (Object.values(getNodes()) as GraphNode[]).find(
      (node) => node.entityId === entityId,
    );

    if (!targetNode) {
      // No existing node, load entity into graph
      await loadEntityIntoGraph(entityId);

      // Re-query the store to get the newly loaded node
      targetNode = (Object.values(getNodes()) as GraphNode[]).find(
        (node) => node.entityId === entityId,
      );
    }

    return targetNode;
  };

  const performNodeInteractions = async ({
    targetNode,
    entityId,
    options,
    selectNode,
    clearAllPinnedNodes,
    pinNode,
    setPreviewEntity,
    expandNode,
    autoPinOnLayoutStabilization,
    centerOnNodeFn,
  }: {
    targetNode: GraphNode;
    entityId: string;
    entityType: string;
    options: EntityInteractionOptions;
    selectNode: (nodeId: string | null) => void;
    clearAllPinnedNodes: () => void;
    pinNode: (nodeId: string) => void;
    setPreviewEntity: (entityId: string) => void;
    expandNode: (params: {
      nodeId: string;
      options?: Partial<ExpansionOptions>;
    }) => Promise<void>;
    autoPinOnLayoutStabilization: boolean;
    centerOnNodeFn?: (
      nodeId: string,
      position: { x: number; y: number },
    ) => void;
  }): Promise<void> => {
    // Select the node
    selectNode(targetNode.id);

    // Update sidebar preview if requested
    if (options.updatePreview) {
      setPreviewEntity(entityId);
    }

    // Pin the node if requested
    if (options.pinNode) {
      // Only clear pinned nodes if auto-pin is disabled
      if (!autoPinOnLayoutStabilization) {
        clearAllPinnedNodes();
      }
      pinNode(targetNode.id);
    }

    // Center viewport on node if requested
    if (options.centerOnNode && centerOnNodeFn) {
      centerOnNodeFn(targetNode.id, { x: targetNode.x, y: targetNode.y });
    }

    // Expand the node if requested
    if (options.expandNode) {
      await expandNode({ nodeId: targetNode.id });
    }
  };

  /**
   * Main entity interaction handler
   */
  const interactWithEntity = useCallback(
    async ({
      entityId,
      entityType,
      options = INTERACTION_PRESETS.GRAPH_NODE_CLICK,
      existingNode,
    }: {
      entityId: string;
      entityType: string;
      options?: EntityInteractionOptions;
      existingNode?: GraphNode;
    }) => {
      try {
        logger.debug("graph", "Entity interaction started", {
          ...(entityId && { entityId }),
          entityType,
          options,
          hasExistingNode: !!existingNode,
        });

        let targetNode = existingNode;

        // If no existing node provided, find or load entity into graph
        if (!targetNode) {
          targetNode = await findOrLoadTargetNode({
            entityId,
            loadEntityIntoGraph,
            getNodes: () => graphStore.getState().nodes,
          });
        }

        if (!targetNode) {
          logger.warn(
            "graph",
            "Entity interaction failed - no target node found",
            {
              ...(entityId && { entityId }),
              entityType,
            },
          );
          return;
        }

        await performNodeInteractions({
          targetNode,
          entityId,
          entityType,
          options,
          selectNode,
          clearAllPinnedNodes,
          pinNode,
          setPreviewEntity,
          expandNode,
          autoPinOnLayoutStabilization,
          centerOnNodeFn,
        });

        logger.debug("graph", "Entity interaction completed", {
          ...(entityId && { entityId }),
          entityType,
          nodeId: targetNode.id,
          options,
          selected: true,
          pinned: options.pinNode,
          expanded: options.expandNode,
        });
      } catch (error) {
        logger.error("graph", "Entity interaction failed", {
          ...(entityId && { entityId }),
          entityType,
          options,
          error,
        });
      }
    },
    [
      selectNode,
      clearAllPinnedNodes,
      pinNode,
      loadEntityIntoGraph,
      expandNode,
      setPreviewEntity,
      autoPinOnLayoutStabilization,
      centerOnNodeFn,
    ],
  );

  /**
   * Convenience method for graph node single clicks (selection only, no expansion)
   */
  const handleGraphNodeClick = useCallback(
    (node: GraphNode) => {
      // Only proceed if node has a valid entityId
      if (!node.entityId) {
        logger.warn("graph", "Cannot interact with node - missing entityId", {
          nodeId: node.id,
          nodeType: node.entityType,
        });
        return Promise.resolve();
      }

      return interactWithEntity({
        entityId: node.entityId,
        entityType: node.entityType,
        options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
        existingNode: node,
      });
    },
    [interactWithEntity],
  );

  /**
   * Convenience method for graph node double clicks (selection + expansion)
   */
  const handleGraphNodeDoubleClick = useCallback(
    (node: GraphNode) => {
      // Only proceed if node has a valid entityId
      if (!node.entityId) {
        logger.warn("graph", "Cannot interact with node - missing entityId", {
          nodeId: node.id,
          nodeType: node.entityType,
        });
        return Promise.resolve();
      }

      return interactWithEntity({
        entityId: node.entityId,
        entityType: node.entityType,
        options: INTERACTION_PRESETS.GRAPH_NODE_DOUBLE_CLICK,
        existingNode: node,
      });
    },
    [interactWithEntity],
  );

  /**
   * Convenience method for sidebar entity clicks (selection only)
   */
  const handleSidebarEntityClick = useCallback(
    ({ entityId, entityType }: { entityId: string; entityType: string }) => {
      return interactWithEntity({
        entityId,
        entityType,
        options: INTERACTION_PRESETS.GRAPH_NODE_CLICK,
      });
    },
    [interactWithEntity],
  );

  return {
    interactWithEntity,
    handleGraphNodeClick,
    handleGraphNodeDoubleClick,
    handleSidebarEntityClick,
    INTERACTION_PRESETS,
  };
};
