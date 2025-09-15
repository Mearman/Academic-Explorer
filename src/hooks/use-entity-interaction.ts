/**
 * Hook for shared entity interaction logic
 * Provides consistent behavior for both graph node clicks and sidebar entity clicks
 */

import { useCallback } from "react";
import { useGraphStore } from "@/stores/graph-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useGraphData } from "@/hooks/use-graph-data";
import { logger } from "@/lib/logger";
import type { GraphNode } from "@/lib/graph/types";

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
	/** Full entity interaction: select, pin, center, expand, update preview */
	GRAPH_NODE_CLICK: {
		centerOnNode: true,
		expandNode: true,
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

			logger.info("graph", "Entity interaction started", {
				entityId,
				entityType,
				options,
				hasExistingNode: !!existingNode
			});

			let targetNode = existingNode;

			// If no existing node provided, load entity into graph
			if (!targetNode) {
				await loadEntityIntoGraph(entityId);

				// Find the newly loaded/selected node
				targetNode = Array.from(store.nodes.values()).find(
					node => node.entityId === entityId && !node.metadata?.isPlaceholder
				);
			}

			if (!targetNode) {
				logger.warn("graph", "Entity interaction failed - no target node found", {
					entityId,
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
				centerOnNodeFn(targetNode.id, targetNode.position);
			}

			// Expand the node if requested
			if (options.expandNode) {
				await expandNode(targetNode.id);
			}

			logger.info("graph", "Entity interaction completed", {
				entityId,
				entityType,
				nodeId: targetNode.id,
				options,
				selected: true,
				pinned: options.pinNode,
				expanded: options.expandNode,
			});

		} catch (error) {
			logger.error("graph", "Entity interaction failed", {
				entityId,
				entityType,
				options,
				error
			});
		}
	}, [loadEntityIntoGraph, expandNode, setPreviewEntity, autoPinOnLayoutStabilization, centerOnNodeFn]);

	/**
   * Convenience method for graph node clicks (full interaction)
   */
	const handleGraphNodeClick = useCallback((node: GraphNode) => {
		return interactWithEntity(
			node.entityId,
			node.type,
			INTERACTION_PRESETS.GRAPH_NODE_CLICK,
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
		handleSidebarEntityClick,
		INTERACTION_PRESETS,
	};
}