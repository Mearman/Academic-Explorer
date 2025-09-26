/**
 * Hook for shared entity interaction logic
 * Provides consistent behavior for both graph node clicks and sidebar entity clicks
 */

import { useCallback } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useGraphData } from "@/hooks/use-graph-data";
import { logger } from "@academic-explorer/utils/logger";
import type { GraphNode } from "@academic-explorer/graph";

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

/**
 * Default options for different interaction contexts
 */
export const INTERACTION_PRESETS = {
	/** Entity interaction on single click: select, pin, center, update preview (no expansion) */
	GRAPH_NODE_CLICK: {
		centerOnNode: true,
		expandNode: false, // Single click should never expand
		pinNode: true,
		updatePreview: true,
	} satisfies EntityInteractionOptions,

	/** Entity interaction on double click: select, pin, center, update preview AND expand */
	GRAPH_NODE_DOUBLE_CLICK: {
		centerOnNode: true,
		expandNode: true, // Double click should expand
		pinNode: true,
		updatePreview: true,
	} satisfies EntityInteractionOptions,
} as const;

export function useEntityInteraction(centerOnNodeFn?: (nodeId: string, position?: { x: number; y: number }) => void) {
	const { loadEntityIntoGraph, expandNode } = useGraphData();
	const { setPreviewEntity, autoPinOnLayoutStabilization } = useLayoutStore();

	/**
   * Shared entity interaction logic that can be used by both graph nodes and sidebar entities
   */
	const interactWithEntity = useCallback(async (
		entityId: string,
		entityType: string,
		options: EntityInteractionOptions = INTERACTION_PRESETS.GRAPH_NODE_CLICK,
		existingNode?: GraphNode
	) => {
		try {
			const store = useGraphStore.getState();

			logger.debug("graph", "Entity interaction started", {
				...(entityId && { entityId }),
				entityType,
				options,
				hasExistingNode: !!existingNode
			});

			let targetNode = existingNode;

			// If no existing node provided, find or load entity into graph
			if (!targetNode) {
				// First check if a minimal node already exists
				targetNode = Object.values(store.nodes).find(
					(node: GraphNode) => node.entityId === entityId
				);

				if (targetNode) {
					// Node exists - use it as-is and hydrate on-demand if needed during use
					// No artificial pre-checks needed
				} else {
					// No existing node, load entity into graph
					await loadEntityIntoGraph(entityId);
					// Find the newly loaded node
					const updatedStore = useGraphStore.getState();
					targetNode = Object.values(updatedStore.nodes).find(
						(node: GraphNode) => node.entityId === entityId
					);
				}
			}

			if (!targetNode) {
				logger.warn("graph", "Entity interaction failed - no target node found", {
					...(entityId && { entityId }),
					entityType
				});
				return;
			}

			// Select the node
			store.selectNode(targetNode.id);

			// Update sidebar preview if requested
			if (options.updatePreview) {
				setPreviewEntity(entityId);
			}

			// Pin the node if requested
			if (options.pinNode) {
				// Only clear pinned nodes if auto-pin is disabled
				if (!autoPinOnLayoutStabilization) {
					store.clearAllPinnedNodes();
				}
				store.pinNode(targetNode.id);
			}

			// Center viewport on node if requested
			if (options.centerOnNode && centerOnNodeFn) {
				centerOnNodeFn(targetNode.id, { x: targetNode.x, y: targetNode.y });
			}

			// Expand the node if requested
			if (options.expandNode) {
				await expandNode(targetNode.id);
			}

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
				error
			});
		}
	}, [loadEntityIntoGraph, expandNode, setPreviewEntity, autoPinOnLayoutStabilization, centerOnNodeFn]);

	/**
   * Convenience method for graph node single clicks (selection only, no expansion)
   */
	const handleGraphNodeClick = useCallback((node: GraphNode) => {
		// Only proceed if node has a valid entityId
		if (!node.entityId) {
			logger.warn("graph", "Cannot interact with node - missing entityId", {
				nodeId: node.id,
				nodeType: node.entityType
			});
			return Promise.resolve();
		}

		return interactWithEntity(
			node.entityId,
			node.entityType,
			INTERACTION_PRESETS.GRAPH_NODE_CLICK,
			node
		);
	}, [interactWithEntity]);

	/**
   * Convenience method for graph node double clicks (selection + expansion)
   */
	const handleGraphNodeDoubleClick = useCallback((node: GraphNode) => {
		// Only proceed if node has a valid entityId
		if (!node.entityId) {
			logger.warn("graph", "Cannot interact with node - missing entityId", {
				nodeId: node.id,
				nodeType: node.entityType
			});
			return Promise.resolve();
		}

		return interactWithEntity(
			node.entityId,
			node.entityType,
			INTERACTION_PRESETS.GRAPH_NODE_DOUBLE_CLICK,
			node
		);
	}, [interactWithEntity]);

	/**
   * Convenience method for sidebar entity clicks (selection only)
   */
	const handleSidebarEntityClick = useCallback((entityId: string, entityType: string) => {
		return interactWithEntity(
			entityId,
			entityType,
			INTERACTION_PRESETS.GRAPH_NODE_CLICK
		);
	}, [interactWithEntity]);

	return {
		interactWithEntity,
		handleGraphNodeClick,
		handleGraphNodeDoubleClick,
		handleSidebarEntityClick,
		INTERACTION_PRESETS,
	};
}