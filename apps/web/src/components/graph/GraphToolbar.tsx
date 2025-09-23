/**
 * Graph Toolbar component with graph utilities
 * Provides academic research focused actions for the entire graph
 */

import React, { useCallback } from "react";
import { IconScissors, IconTarget, IconGitBranch, IconPin, IconPinnedOff } from "@tabler/icons-react";
import { useReactFlow } from "@xyflow/react";

import { useGraphUtilities } from "@/hooks/use-graph-utilities";
import { useGraphData } from "@/hooks/use-graph-data";
import { useGraphStore } from "@/stores/graph-store";
import { logger } from "@academic-explorer/shared-utils/logger";

interface GraphToolbarProps {
  className?: string;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
	className = ""
}) => {
	const trimLeafNodes = useGraphUtilities().trimLeafNodes;
	const expandNode = useGraphData().expandNode;
	const reactFlow = useReactFlow();
	const getNodes = reactFlow.getNodes;
	const getEdges = reactFlow.getEdges;
	const setNodes = reactFlow.setNodes;
	const pinNode = useGraphStore((state) => state.pinNode);
	const clearAllPinnedNodes = useGraphStore((state) => state.clearAllPinnedNodes);
	// Use stable selectors to avoid getSnapshot infinite loops (React 19 + Zustand + Immer pattern)
	const pinnedNodes = useGraphStore((state) => state.pinnedNodes);
	const pinnedNodesCount = React.useMemo(() => Object.keys(pinnedNodes).length, [pinnedNodes]);
	const pinnedNodeIds = React.useMemo(() => Object.keys(pinnedNodes), [pinnedNodes]);

	// Graph utility action
	const handleTrimLeaves = useCallback(() => {
		logger.debug("graph", "Trim leaves action triggered from graph toolbar");
		try {
			const result = trimLeafNodes();
			logger.debug("graph", "Trim leaves completed", {
				removedCount: result.removedCount,
				remainingNodes: result.nodes.length
			});
		} catch (error) {
			logger.error("graph", "Trim leaves failed", {
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	}, [trimLeafNodes]);

	// 1-degree selection action
	const handleSelect1Degree = useCallback(() => {
		logger.debug("graph", "1-degree selection action triggered from graph toolbar");

		const currentNodes = getNodes();
		const currentEdges = getEdges();

		// Find the currently selected node
		const selectedNode = currentNodes.find(node => node.selected);

		if (!selectedNode) {
			logger.warn("graph", "No node currently selected for 1-degree selection");
			return;
		}

		logger.debug("graph", "Finding 1-degree neighbors", {
			selectedNodeId: selectedNode.id,
			totalNodes: currentNodes.length,
			totalEdges: currentEdges.length
		});

		// Find all nodes within 1 degree (directly connected) of the selected node
		const oneDegreeNodeIds = new Set<string>();
		oneDegreeNodeIds.add(selectedNode.id); // Include the selected node itself

		// Find all edges connected to the selected node
		currentEdges.forEach(edge => {
			if (edge.source === selectedNode.id) {
				oneDegreeNodeIds.add(edge.target);
			} else if (edge.target === selectedNode.id) {
				oneDegreeNodeIds.add(edge.source);
			}
		});

		// Update node selection state
		const updatedNodes = currentNodes.map(node => ({
			...node,
			selected: oneDegreeNodeIds.has(node.id)
		}));

		setNodes(updatedNodes);

		logger.debug("graph", "1-degree selection completed", {
			selectedNodeId: selectedNode.id,
			neighborCount: oneDegreeNodeIds.size - 1, // Subtract 1 for the original node
			totalSelected: oneDegreeNodeIds.size,
			selectedNodeIds: Array.from(oneDegreeNodeIds)
		});
	}, [getNodes, getEdges, setNodes]);

	// Expand selected nodes action
	const handleExpandSelected = useCallback(async () => {
		logger.debug("graph", "Expand selected nodes action triggered from graph toolbar");

		const currentNodes = getNodes();

		// Find all currently selected nodes
		const selectedNodes = currentNodes.filter(node => node.selected);

		if (selectedNodes.length === 0) {
			logger.warn("graph", "No nodes currently selected for expansion");
			return;
		}

		logger.debug("graph", "Expanding selected nodes", {
			selectedCount: selectedNodes.length,
			selectedNodeIds: selectedNodes.map(node => node.id)
		});

		// Expand each selected node
		const expansionPromises = selectedNodes.map(async (node) => {
			try {
				// Extract entity ID from node data for expansion
				const entityId: string = typeof node.data.entityId === "string" ? node.data.entityId : node.id;

				logger.debug("graph", "Expanding node", {
					nodeId: node.id,
					entityId: entityId,
					entityType: node.data.entityType
				});

				await expandNode(entityId, {
					depth: 1, // Expand 1 level
					limit: 10, // Limit connections per node
					force: true // Force fresh expansion with new citation fields
				});

				return { nodeId: node.id, entityId, success: true };
			} catch (error) {
				const entityId: string = typeof node.data.entityId === "string" ? node.data.entityId : node.id;
				logger.error("graph", "Failed to expand node", {
					nodeId: node.id,
					entityId: entityId,
					error: error instanceof Error ? error.message : "Unknown error"
				});
				return {
					nodeId: node.id,
					entityId: entityId,
					success: false,
					error: error instanceof Error ? error.message : "Unknown error"
				};
			}
		});

		try {
			const results = await Promise.allSettled(expansionPromises);
			const successful = results.filter(result => result.status === "fulfilled" && result.value.success).length;
			const failed = results.length - successful;

			logger.debug("graph", "Expand selected nodes completed", {
				totalNodes: selectedNodes.length,
				successful,
				failed,
				results: results.map(result =>
					result.status === "fulfilled" ? result.value : { error: result.reason instanceof Error ? result.reason.message : String(result.reason) }
				)
			});

		} catch (error) {
			logger.error("graph", "Expand selected nodes failed", {
				selectedCount: selectedNodes.length,
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	}, [getNodes, expandNode]);

	// Pin all nodes action
	const handlePinAll = useCallback(() => {
		logger.debug("graph", "Pin all nodes action triggered from graph toolbar");

		const currentNodes = getNodes();

		if (currentNodes.length === 0) {
			logger.warn("graph", "No nodes available to pin");
			return;
		}

		logger.debug("graph", "Pinning all nodes", {
			nodeCount: currentNodes.length,
			nodeIds: currentNodes.map(node => node.id)
		});

		// Pin each node using the store function
		currentNodes.forEach(node => {
			pinNode(node.id);
		});

		logger.debug("graph", "Pin all nodes completed", {
			totalNodes: currentNodes.length,
			pinnedCount: pinnedNodesCount
		});
	}, [getNodes, pinNode, pinnedNodesCount]);

	// Unpin all nodes action
	const handleUnpinAll = useCallback(() => {
		logger.debug("graph", "Unpin all nodes action triggered from graph toolbar");

		const currentPinnedCount = pinnedNodesCount;

		if (currentPinnedCount === 0) {
			logger.warn("graph", "No nodes currently pinned to unpin");
			return;
		}

		logger.debug("graph", "Unpinning all nodes", {
			pinnedCount: currentPinnedCount,
			pinnedNodeIds: pinnedNodeIds
		});

		// Clear all pinned nodes using the store function
		clearAllPinnedNodes();

		logger.debug("graph", "Unpin all nodes completed", {
			previouslyPinnedCount: currentPinnedCount,
			currentPinnedCount: 0
		});
	}, [pinnedNodesCount, pinnedNodeIds, clearAllPinnedNodes]);

	return (
		<div className={`flex gap-2 p-3 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg ${className}`}>
			<button
				onClick={handleTrimLeaves}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
				title="Trim Leaf Nodes - Remove papers with no citations"
			>
				<IconScissors size={16} />
				<span>Trim Leaves</span>
			</button>

			<button
				onClick={handleSelect1Degree}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
				title="Select 1-Degree - Select all nodes directly connected to the selected node"
			>
				<IconTarget size={16} />
				<span>Select 1-Degree</span>
			</button>

			<button
				onClick={() => {
					handleExpandSelected().catch((error: unknown) => {
						logger.error("graph", "Unhandled error in expand selected", {
							error: error instanceof Error ? error.message : String(error)
						});
					});
				}}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors"
				title="Expand Selected - Load connections for all selected nodes"
			>
				<IconGitBranch size={16} />
				<span>Expand Selected</span>
			</button>

			<button
				onClick={handlePinAll}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 text-purple-700 rounded transition-colors"
				title="Pin All - Pin all nodes to prevent them from moving during layout"
			>
				<IconPin size={16} />
				<span>Pin All</span>
			</button>

			<button
				onClick={handleUnpinAll}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition-colors"
				title="Unpin All - Unpin all nodes to allow them to move during layout"
			>
				<IconPinnedOff size={16} />
				<span>Unpin All</span>
			</button>
		</div>
	);
};