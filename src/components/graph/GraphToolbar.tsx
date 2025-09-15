/**
 * Graph Toolbar component with graph utilities
 * Provides academic research focused actions for the entire graph
 */

import React, { useCallback } from "react";
import { IconScissors, IconTarget, IconGitBranch } from "@tabler/icons-react";
import { useReactFlow } from "@xyflow/react";

import { useGraphUtilities } from "@/hooks/use-graph-utilities";
import { useGraphData } from "@/hooks/use-graph-data";
import { logger } from "@/lib/logger";

interface GraphToolbarProps {
  className?: string;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
	className = ""
}) => {
	const { trimLeafNodes } = useGraphUtilities();
	const { expandNode } = useGraphData();
	const { getNodes, getEdges, setNodes } = useReactFlow();

	// Graph utility action
	const handleTrimLeaves = useCallback(() => {
		logger.info("graph", "Trim leaves action triggered from graph toolbar");
		try {
			const result = trimLeafNodes();
			logger.info("graph", "Trim leaves completed", {
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
		logger.info("graph", "1-degree selection action triggered from graph toolbar");

		const currentNodes = getNodes();
		const currentEdges = getEdges();

		// Find the currently selected node
		const selectedNode = currentNodes.find(node => node.selected);

		if (!selectedNode) {
			logger.warn("graph", "No node currently selected for 1-degree selection");
			return;
		}

		logger.info("graph", "Finding 1-degree neighbors", {
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

		logger.info("graph", "1-degree selection completed", {
			selectedNodeId: selectedNode.id,
			neighborCount: oneDegreeNodeIds.size - 1, // Subtract 1 for the original node
			totalSelected: oneDegreeNodeIds.size,
			selectedNodeIds: Array.from(oneDegreeNodeIds)
		});
	}, [getNodes, getEdges, setNodes]);

	// Expand selected nodes action
	const handleExpandSelected = useCallback(async () => {
		logger.info("graph", "Expand selected nodes action triggered from graph toolbar");

		const currentNodes = getNodes();

		// Find all currently selected nodes
		const selectedNodes = currentNodes.filter(node => node.selected);

		if (selectedNodes.length === 0) {
			logger.warn("graph", "No nodes currently selected for expansion");
			return;
		}

		logger.info("graph", "Expanding selected nodes", {
			selectedCount: selectedNodes.length,
			selectedNodeIds: selectedNodes.map(node => node.id)
		});

		// Expand each selected node
		const expansionPromises = selectedNodes.map(async (node) => {
			try {
				// Extract entity ID from node data for expansion
				const entityId = typeof node.data?.entityId === "string" ? node.data.entityId : node.id;

				logger.info("graph", "Expanding node", {
					nodeId: node.id,
					entityId: entityId,
					entityType: node.data?.entityType
				});

				await expandNode(entityId, {
					depth: 1, // Expand 1 level
					limit: 10, // Limit connections per node
					force: false // Don't force re-expansion if already expanded
				});

				return { nodeId: node.id, entityId, success: true };
			} catch (error) {
				const entityId = typeof node.data?.entityId === "string" ? node.data.entityId : node.id;
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

			logger.info("graph", "Expand selected nodes completed", {
				totalNodes: selectedNodes.length,
				successful,
				failed,
				results: results.map(result =>
					result.status === "fulfilled" ? result.value : { error: result.reason }
				)
			});

		} catch (error) {
			logger.error("graph", "Expand selected nodes failed", {
				selectedCount: selectedNodes.length,
				error: error instanceof Error ? error.message : "Unknown error"
			});
		}
	}, [getNodes, expandNode]);

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
				onClick={handleExpandSelected}
				className="flex items-center gap-2 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors"
				title="Expand Selected - Load connections for all selected nodes"
			>
				<IconGitBranch size={16} />
				<span>Expand Selected</span>
			</button>
		</div>
	);
};